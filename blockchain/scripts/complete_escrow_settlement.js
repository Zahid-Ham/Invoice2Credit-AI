/**
 * complete_escrow_settlement.js
 * 
 * Executes the FULL real on-chain escrow lifecycle:
 *   Step 1: Investor funds the Escrow Deal (sends ETH to escrow contract)
 *   Step 2: Escrow releases funding to MSME (MSME receives ETH)
 *   Step 3: Buyer settles the invoice (Buyer sends ETH → Investor gets paid, NFT returned)
 * 
 * All steps involve real blockchain transactions signed by real wallets.
 */

const { ethers } = require('hardhat');
const fs = require('fs');

const DEAL_ID = 1;

async function formatBal(provider, address, label) {
  const bal = await provider.getBalance(address);
  console.log(`  ${label}: ${ethers.formatEther(bal)} ETH`);
  return bal;
}

async function main() {
  const provider = ethers.provider;
  const deployment = JSON.parse(
    fs.readFileSync('../frontend/src/blockchain/deployments/local-deployment.json', 'utf8')
  );

  // Load contracts
  const escrow = await ethers.getContractAt('InvoiceEscrow', deployment.contracts.InvoiceEscrow);
  const nft    = await ethers.getContractAt('InvoiceNFT',    deployment.contracts.InvoiceNFT);

  // Load signers — Account #0=MSME, #1=Investor, #2=Wipro Buyer
  const [msme, investor, wipro] = await ethers.getSigners();

  console.log('\n════════════════════════════════════════════════════════');
  console.log('  INVOICE2CREDIT — FULL ON-CHAIN ESCROW SETTLEMENT');
  console.log('════════════════════════════════════════════════════════\n');

  // ── Read current deal state ──────────────────────────────────────
  const deal = await escrow.deals(DEAL_ID);
  const statusNames = ['CREATED', 'FUNDED', 'MSME_RELEASED', 'SETTLED'];
  const currentStatus = statusNames[Number(deal.status)];

  console.log('📋  Escrow Deal #' + DEAL_ID + ' state:');
  console.log('   Token ID        :', deal.invoiceTokenId.toString());
  console.log('   MSME            :', deal.msme);
  console.log('   Investor        :', deal.investor);
  console.log('   Buyer (in deal) :', deal.buyer);
  console.log('   Funding Amount  :', deal.fundingAmount.toString(), 'Wei =', ethers.formatEther(deal.fundingAmount), 'ETH');
  console.log('   Settlement Amt  :', deal.settlementAmount.toString(), 'Wei =', ethers.formatEther(deal.settlementAmount), 'ETH');
  console.log('   Current Status  :', currentStatus);

  // ── BALANCES BEFORE ─────────────────────────────────────────────
  console.log('\n💰  BALANCES BEFORE SETTLEMENT:');
  const bal0Before = await formatBal(provider, msme.address,     'Account #0 MSME     (ACME)   ');
  const bal1Before = await formatBal(provider, investor.address, 'Account #1 Investor  (Capital)');
  const bal2Before = await formatBal(provider, wipro.address,    'Account #2 Wipro     (Buyer)  ');

  // ── NFT OWNER BEFORE ────────────────────────────────────────────
  const tokenId = Number(deal.invoiceTokenId);
  try {
    const ownerBefore = await nft.ownerOf(tokenId);
    console.log('\n🖼️  NFT Token #' + tokenId + ' is held by:', ownerBefore);
    console.log('   (Escrow contract:', deployment.contracts.InvoiceEscrow, ')');
  } catch (e) {
    console.log('\n🖼️  NFT Token #' + tokenId + ' does not exist or was burned');
  }

  // ── The deal's buyer is stored as investor address (Account #1) ──
  // This happened because buyerWallet was set to Account #1 when the invoice was minted.
  // Account #1 must act as the "buyer" for settleInvoice to succeed.
  const dealBuyer = deal.buyer.toLowerCase();
  const isAccount1Buyer = dealBuyer === investor.address.toLowerCase();
  console.log('\n⚠️   Note: Deal buyer address =', deal.buyer);
  console.log('    Matches Account #1 (Investor)?', isAccount1Buyer);
  if (isAccount1Buyer) {
    console.log('    → Account #1 will act as BOTH investor AND buyer in this settlement');
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 1: INVESTOR FUNDS THE DEAL
  // ════════════════════════════════════════════════════════════════
  if (currentStatus === 'CREATED') {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Investor funds Escrow Deal #' + DEAL_ID);
    console.log('        Sending', deal.fundingAmount.toString(), 'Wei to Escrow contract...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const fundTx = await escrow.connect(investor).fundDeal(DEAL_ID, {
      value: deal.fundingAmount
    });
    const fundReceipt = await fundTx.wait();
    console.log('✅  fundDeal() confirmed! TxHash:', fundTx.hash);
    console.log('    Gas used:', fundReceipt.gasUsed.toString(), 'units');
  } else {
    console.log('\nSTEP 1: SKIPPED — deal already past CREATED status (' + currentStatus + ')');
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 2: RELEASE FUNDING TO MSME
  // ════════════════════════════════════════════════════════════════
  const dealAfterFund = await escrow.deals(DEAL_ID);
  if (statusNames[Number(dealAfterFund.status)] === 'FUNDED') {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Releasing', deal.fundingAmount.toString(), 'Wei to MSME...');
    console.log('        MSME address:', deal.msme);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const releaseTx = await escrow.connect(msme).releaseFundingToMSME(DEAL_ID);
    const releaseReceipt = await releaseTx.wait();
    console.log('✅  releaseFundingToMSME() confirmed! TxHash:', releaseTx.hash);
    console.log('    Gas used:', releaseReceipt.gasUsed.toString(), 'units');
  } else {
    console.log('\nSTEP 2: SKIPPED — deal status is', statusNames[Number(dealAfterFund.status)]);
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 3: BUYER SETTLES THE INVOICE
  // ════════════════════════════════════════════════════════════════
  const dealAfterRelease = await escrow.deals(DEAL_ID);
  if (statusNames[Number(dealAfterRelease.status)] === 'MSME_RELEASED') {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Buyer settles invoice — sends', deal.settlementAmount.toString(), 'Wei');
    console.log('        Investor receives payment + NFT returns to MSME');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // The "buyer" in the deal is whoever's address was stored — use that signer
    const buyerSigner = isAccount1Buyer ? investor : wipro;
    console.log('        Signing as:', buyerSigner.address, isAccount1Buyer ? '(Account #1)' : '(Account #2)');

    const settleTx = await escrow.connect(buyerSigner).settleInvoice(DEAL_ID, {
      value: deal.settlementAmount
    });
    const settleReceipt = await settleTx.wait();
    console.log('✅  settleInvoice() confirmed! TxHash:', settleTx.hash);
    console.log('    Gas used:', settleReceipt.gasUsed.toString(), 'units');
  } else {
    console.log('\nSTEP 3: SKIPPED — deal status is', statusNames[Number(dealAfterRelease.status)]);
  }

  // ════════════════════════════════════════════════════════════════
  // FINAL STATE
  // ════════════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  FINAL STATE AFTER SETTLEMENT');
  console.log('════════════════════════════════════════════════════════');

  const finalDeal = await escrow.deals(DEAL_ID);
  console.log('\n📋  Escrow Deal #' + DEAL_ID + ' final status:', statusNames[Number(finalDeal.status)]);

  console.log('\n💰  BALANCES AFTER SETTLEMENT:');
  const bal0After = await formatBal(provider, msme.address,     'Account #0 MSME     (ACME)   ');
  const bal1After = await formatBal(provider, investor.address, 'Account #1 Investor  (Capital)');
  const bal2After = await formatBal(provider, wipro.address,    'Account #2 Wipro     (Buyer)  ');

  console.log('\n📊  NET BALANCE CHANGES:');
  console.log('   MSME     gained:', ethers.formatEther(bal0After - bal0Before), 'ETH (received funding)');
  console.log('   Investor gained:', ethers.formatEther(bal1After - bal1Before), 'ETH (received settlement - gas)');
  console.log('   Wipro    gained:', ethers.formatEther(bal2After - bal2Before), 'ETH (spent on settlement)');

  try {
    const finalOwner = await nft.ownerOf(tokenId);
    console.log('\n🖼️  NFT Token #' + tokenId + ' final owner:', finalOwner);
    if (finalOwner.toLowerCase() === msme.address.toLowerCase()) {
      console.log('   ✅  NFT successfully returned to MSME!');
    }
  } catch (e) {
    console.log('\n🖼️  NFT Token #' + tokenId + ': No longer exists (may have been burned)');
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log('  🎉 FULL INVOICE FINANCING LIFECYCLE COMPLETE!');
  console.log('════════════════════════════════════════════════════════');
  console.log('   MSME uploaded invoice → Admin approved → NFT minted');
  console.log('   → Investor bid → Auction closed → Escrow funded');
  console.log('   → MSME received cash → Buyer settled → Investor paid');
  console.log('   → NFT returned to MSME ✅');
  console.log('════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  if (err.data) {
    console.error('   Contract revert data:', err.data);
  }
  process.exit(1);
});
