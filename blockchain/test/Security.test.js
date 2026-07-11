const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Security Auditing & Adversarial Testing (Scenarios 54-60)", function () {
  let InvoiceNFT, invoiceNFT;
  let InvoiceMarketplace, invoiceMarketplace;
  let InvoiceEscrow, invoiceEscrow;
  let ReentrantReceiver, reentrantReceiver;
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

    ReentrantReceiver = await ethers.getContractFactory("ReentrantReceiver");
    reentrantReceiver = await ReentrantReceiver.deploy(await invoiceEscrow.getAddress());
    await reentrantReceiver.waitForDeployment();

    dueDate = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 5;

    // Mint NFT and approve marketplace for token ID 1
    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      ethers.solidityPackedKeccak256(["string"], ["Invoice_Security_Test"]),
      "INV-101",
      settlementAmount,
      dueDate,
      "ipfs://metadata"
    );
    await invoiceNFT.connect(msme).approve(await invoiceMarketplace.getAddress(), 1);
  });

  it("54. Reentrancy attempt - malicious receiver contract cannot drain escrow", async function () {
    const malAddress = await reentrantReceiver.getAddress();

    // Transfer token ID 1 to the malicious contract so it is the owner
    await invoiceNFT.connect(msme).transferFrom(msme.address, malAddress, 1);

    // Malicious contract approves marketplace
    await reentrantReceiver.approveNFT(await invoiceNFT.getAddress(), await invoiceMarketplace.getAddress(), 1);

    // Create auction from the malicious contract
    await reentrantReceiver.executeCreateAuction(await invoiceMarketplace.getAddress(), 1, fundingAmount, 3600);

    // Investor bids
    await invoiceMarketplace.connect(investor).placeBid(1, fundingAmount, 500);

    // Fast forward and Close
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await invoiceMarketplace.connect(owner).closeAuction(1);

    // Fund the deal (investor)
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });

    // Prepare reentrancy attack on ReentrantReceiver during releaseFundingToMSME
    await reentrantReceiver.prepareAttack(1, "release");

    // Try to trigger release funding. It must revert due to ReentrancyGuard/InvalidDealStatus.
    await expect(
      invoiceEscrow.releaseFundingToMSME(1)
    ).to.be.reverted;
  });

  it("55. Unauthorized mint - non-verifier minting must revert", async function () {
    await expect(
      invoiceNFT.connect(unauthorized).mintInvoice(
        msme.address,
        buyer.address,
        ethers.solidityPackedKeccak256(["string"], ["Invoice_Unauth_Mint_S"]),
        "INV-S1",
        settlementAmount,
        dueDate,
        "ipfs://metadata"
      )
    ).to.be.reverted;
  });

  it("56. Unauthorized deal creation - arbitrary wallet cannot call createDeal", async function () {
    await expect(
      invoiceEscrow.connect(unauthorized).createDeal(1, msme.address, investor.address, fundingAmount, settlementAmount, dueDate)
    ).to.be.revertedWithCustomError(invoiceEscrow, "OnlyMarketplace");
  });

  it("57. Invalid state transitions - direct transitions out of order must fail", async function () {
    await invoiceMarketplace.connect(msme).createAuction(1, fundingAmount, 3600);
    await invoiceMarketplace.connect(investor).placeBid(1, fundingAmount, 500);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await invoiceMarketplace.connect(msme).closeAuction(1);

    // CREATED -> MSME_RELEASED directly must fail
    await expect(
      invoiceEscrow.releaseFundingToMSME(1)
    ).to.be.revertedWithCustomError(invoiceEscrow, "InvalidDealStatus");

    // CREATED -> SETTLED directly must fail
    await expect(
      invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount })
    ).to.be.revertedWithCustomError(invoiceEscrow, "InvalidDealStatus");
  });

  it("58. Zero-address inputs - minting to or from zero addresses must revert", async function () {
    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        ethers.ZeroAddress,
        buyer.address,
        ethers.solidityPackedKeccak256(["string"], ["Zero_Addr_MSME"]),
        "INV-Z",
        settlementAmount,
        dueDate,
        "ipfs://metadata"
      )
    ).to.be.revertedWithCustomError(invoiceNFT, "ZeroAddress");

    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        msme.address,
        ethers.ZeroAddress,
        ethers.solidityPackedKeccak256(["string"], ["Zero_Addr_Buyer"]),
        "INV-Z",
        settlementAmount,
        dueDate,
        "ipfs://metadata"
      )
    ).to.be.revertedWithCustomError(invoiceNFT, "ZeroAddress");
  });

  it("59. Invalid financial values - creating auctions or deals with zero values must revert", async function () {
    await expect(
      invoiceMarketplace.connect(msme).createAuction(1, 0, 3600)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "InvalidFundingAmount");
  });

  it("60. Repeat lifecycle attack - attempting to refinance after successful settlement must revert", async function () {
    await invoiceMarketplace.connect(msme).createAuction(1, fundingAmount, 3600);
    await invoiceMarketplace.connect(investor).placeBid(1, fundingAmount, 500);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await invoiceMarketplace.connect(msme).closeAuction(1);

    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);
    await invoiceEscrow.connect(buyer).settleInvoice(1, { value: settlementAmount });

    // Try to list the settled token again
    await expect(
      invoiceMarketplace.connect(msme).createAuction(1, fundingAmount, 3600)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "TokenAlreadyFinanced");
  });
});
