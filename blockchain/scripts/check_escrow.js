const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
  const deployment = JSON.parse(fs.readFileSync('../frontend/src/blockchain/deployments/local-deployment.json', 'utf8'));
  
  const escrow = await ethers.getContractAt('InvoiceEscrow', deployment.contracts.InvoiceEscrow);
  const mkt = await ethers.getContractAt('InvoiceMarketplace', deployment.contracts.InvoiceMarketplace);
  const nft = await ethers.getContractAt('InvoiceNFT', deployment.contracts.InvoiceNFT);

  console.log('\n=== AUCTION STATE ===');
  const auction = await mkt.auctions(1);
  console.log('Auction 1:', {
    tokenId: auction.tokenId.toString(),
    active: auction.active,
    settled: auction.settled,
    seller: auction.seller
  });

  console.log('\n=== ESCROW STATE ===');
  const nextDealId = await escrow.nextDealId();
  console.log('Next Deal ID:', nextDealId.toString());
  
  if (Number(nextDealId) > 1) {
    const d = await escrow.deals(1);
    const statusNames = ['CREATED','FUNDED','MSME_RELEASED','SETTLED'];
    console.log('Deal 1:', {
      invoiceTokenId: d.invoiceTokenId.toString(),
      msme: d.msme,
      investor: d.investor,
      buyer: d.buyer,
      fundingAmount: ethers.formatEther(d.fundingAmount) + ' ETH',
      settlementAmount: ethers.formatEther(d.settlementAmount) + ' ETH',
      status: statusNames[Number(d.status)]
    });
  } else {
    console.log('⚠️  NO ESCROW DEALS EXIST ON CHAIN');
    console.log('The closeAuction() was called but it appears the Escrow Deal was NOT created.');
  }

  console.log('\n=== NFT STATE ===');
  try {
    const owner = await nft.ownerOf(2);
    console.log('NFT Token #2 owner:', owner);
  } catch (e) {
    console.log('NFT Token #2 does not exist or was burned');
  }

  console.log('\n=== ACCOUNT BALANCES ===');
  const [acc0, acc1, acc2] = await ethers.getSigners();
  console.log('Account #0 (MSME/ACME):', ethers.formatEther(await ethers.provider.getBalance(acc0.address)), 'ETH');
  console.log('Account #1 (Investor):', ethers.formatEther(await ethers.provider.getBalance(acc1.address)), 'ETH');
  console.log('Account #2 (Wipro Buyer):', ethers.formatEther(await ethers.provider.getBalance(acc2.address)), 'ETH');
}

main().catch(console.error);
