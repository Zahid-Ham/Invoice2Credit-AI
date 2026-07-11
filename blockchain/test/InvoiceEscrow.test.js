const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvoiceEscrow Contracts Validation (Scenarios 30-46)", function () {
  let InvoiceNFT, invoiceNFT;
  let InvoiceMarketplace, invoiceMarketplace;
  let InvoiceEscrow, invoiceEscrow;
  let owner, verifier, msme, buyer, investor, unauthorized;
  let VERIFIER_ROLE, MARKETPLACE_ROLE;

  const fundingAmount = ethers.parseEther("9.5");
  const settlementAmount = ethers.parseEther("10.0");
  let dueDate;

  beforeEach(async function () {
    [owner, verifier, msme, buyer, investor, unauthorized] = await ethers.getSigners();

    InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
    invoiceNFT = await InvoiceNFT.deploy();
    await invoiceNFT.waitForDeployment();

    InvoiceMarketplace = await ethers.getContractFactory("InvoiceMarketplace");
    invoiceMarketplace = await InvoiceMarketplace.deploy(await invoiceNFT.getAddress());
    await invoiceMarketplace.waitForDeployment();

    InvoiceEscrow = await ethers.getContractFactory("InvoiceEscrow");
    invoiceEscrow = await InvoiceEscrow.deploy(await invoiceNFT.getAddress(), await invoiceMarketplace.getAddress());
    await invoiceEscrow.waitForDeployment();

    await invoiceMarketplace.setEscrowContract(await invoiceEscrow.getAddress());

    VERIFIER_ROLE = await invoiceNFT.VERIFIER_ROLE();
    MARKETPLACE_ROLE = await invoiceNFT.MARKETPLACE_ROLE();
    await invoiceNFT.grantRole(VERIFIER_ROLE, verifier.address);
    await invoiceNFT.grantRole(MARKETPLACE_ROLE, await invoiceMarketplace.getAddress());

    dueDate = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 5;

    // Mint NFT and approve marketplace
    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      ethers.solidityPackedKeccak256(["string"], ["Invoice_Escrow_Test"]),
      "INV-101",
      settlementAmount,
      dueDate,
      "ipfs://metadata"
    );
    await invoiceNFT.connect(msme).approve(await invoiceMarketplace.getAddress(), 1);
  });

  async function setupActiveDeal() {
    await invoiceMarketplace.connect(msme).createAuction(1, fundingAmount, 3600);
    await invoiceMarketplace.connect(investor).placeBid(1, fundingAmount, 500); // 5% discount

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await invoiceMarketplace.connect(msme).closeAuction(1);
  }

  it("30. Authorized deal creation - only marketplace can trigger createDeal", async function () {
    // Escrow the NFT in owner's wallet first, then approve escrow
    await invoiceNFT.connect(msme).approve(await invoiceEscrow.getAddress(), 1);
    
    // We attempt to call createDeal from the marketplace signer (which is owner)
    // Wait, the marketplace contract address was set in the constructor as marketplaceAddress.
    // So only calls originating from that address should be accepted.
    // Calling from owner (default deployer) must fail.
    await expect(
      invoiceEscrow.connect(owner).createDeal(1, msme.address, investor.address, fundingAmount, settlementAmount, dueDate)
    ).to.be.revertedWithCustomError(invoiceEscrow, "OnlyMarketplace");
  });

  it("31. Unauthorized deal creation - arbitrary wallet cannot call createDeal", async function () {
    await expect(
      invoiceEscrow.connect(unauthorized).createDeal(1, msme.address, investor.address, fundingAmount, settlementAmount, dueDate)
    ).to.be.revertedWithCustomError(invoiceEscrow, "OnlyMarketplace");
  });

  it("32. Correct initial state - deal starts in CREATED state with correct fields", async function () {
    await setupActiveDeal();
    const deal = await invoiceEscrow.deals(1);
    expect(deal.dealId).to.equal(1);
    expect(deal.invoiceTokenId).to.equal(1);
    expect(deal.msme).to.equal(msme.address);
    expect(deal.investor).to.equal(investor.address);
    expect(deal.buyer).to.equal(buyer.address);
    expect(deal.fundingAmount).to.equal(fundingAmount);
    expect(deal.settlementAmount).to.equal(settlementAmount);
    expect(deal.status).to.equal(0); // Status.CREATED
  });

  it("33. Wrong investor funding rejection - unauthorized address attempting to fund must revert", async function () {
    await setupActiveDeal();
    await expect(
      invoiceEscrow.connect(unauthorized).fundDeal(1, { value: fundingAmount })
    ).to.be.revertedWithCustomError(invoiceEscrow, "NotInvestor");
  });

  it("34. Underfunding rejection - sending less than the required fundingAmount must revert", async function () {
    await setupActiveDeal();
    await expect(
      invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount - 1n })
    ).to.be.revertedWithCustomError(invoiceEscrow, "IncorrectFundingAmount");
  });

  it("35. Overfunding rejection - sending more than the required fundingAmount must revert", async function () {
    await setupActiveDeal();
    await expect(
      invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount + 1n })
    ).to.be.revertedWithCustomError(invoiceEscrow, "IncorrectFundingAmount");
  });

  it("36. Exact funding - sending exact amount updates state to FUNDED", async function () {
    await setupActiveDeal();
    await expect(invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount }))
      .to.emit(invoiceEscrow, "DealFunded");

    const deal = await invoiceEscrow.deals(1);
    expect(deal.status).to.equal(1); // Status.FUNDED
  });

  it("37. Double funding rejection - funding a deal that is already FUNDED must revert", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });

    await expect(
      invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount })
    ).to.be.revertedWithCustomError(invoiceEscrow, "InvalidDealStatus");
  });

  it("38. Correct MSME release - releases funding amount to MSME and transitions to MSME_RELEASED", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });

    const initialMsmeBal = await ethers.provider.getBalance(msme.address);

    await expect(invoiceEscrow.connect(unauthorized).releaseFundingToMSME(1))
      .to.emit(invoiceEscrow, "FundingReleased")
      .withArgs(1, msme.address, fundingAmount);

    const finalMsmeBal = await ethers.provider.getBalance(msme.address);
    expect(finalMsmeBal).to.equal(initialMsmeBal + fundingAmount);

    const deal = await invoiceEscrow.deals(1);
    expect(deal.status).to.equal(2); // Status.MSME_RELEASED
  });

  it("39. Double release rejection - releasing funds a second time must revert", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);

    await expect(
      invoiceEscrow.releaseFundingToMSME(1)
    ).to.be.revertedWithCustomError(invoiceEscrow, "InvalidDealStatus");
  });

  it("40. Wrong buyer settlement rejection - non-assigned buyer attempting to settle must revert", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);

    await expect(
      invoiceEscrow.connect(unauthorized).settleInvoice(1, { value: settlementAmount })
    ).to.be.revertedWithCustomError(invoiceEscrow, "NotBuyer");
  });

  it("41. Under-settlement rejection - paying less than the settlementAmount must revert", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);

    await expect(
      invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount - 1n })
    ).to.be.revertedWithCustomError(invoiceEscrow, "IncorrectSettlementAmount");
  });

  it("42. Over-settlement rejection - paying more than the settlementAmount must revert", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);

    await expect(
      invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount + 1n })
    ).to.be.revertedWithCustomError(invoiceEscrow, "IncorrectSettlementAmount");
  });

  it("43. Exact settlement - paying exact amount completes the lifecycle", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);

    const initialInvestorBal = await ethers.provider.getBalance(investor.address);

    await expect(invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount }))
      .to.emit(invoiceEscrow, "InvoiceSettled");

    const finalInvestorBal = await ethers.provider.getBalance(investor.address);
    expect(finalInvestorBal).to.equal(initialInvestorBal + settlementAmount);
  });

  it("44. Double settlement rejection - settling an already settled deal must revert", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);
    await invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount });

    await expect(
      invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount })
    ).to.be.revertedWithCustomError(invoiceEscrow, "InvalidDealStatus");
  });

  it("45. Final SETTLED state - state transitions correctly to SETTLED", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);
    await invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount });

    const deal = await invoiceEscrow.deals(1);
    expect(deal.status).to.equal(3); // Status.SETTLED
  });

  it("46. No unexplained escrow balance after settlement - contract balance is zero", async function () {
    await setupActiveDeal();
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);
    await invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount });

    const balance = await ethers.provider.getBalance(await invoiceEscrow.getAddress());
    expect(balance).to.equal(0n);
  });
});
