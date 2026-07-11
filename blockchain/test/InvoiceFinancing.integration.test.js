const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Invoice Financing Integration (Scenarios 47-53)", function () {
  let InvoiceNFT, invoiceNFT;
  let InvoiceMarketplace, invoiceMarketplace;
  let InvoiceEscrow, invoiceEscrow;
  let owner, verifier, msme, buyer, investor, unauthorized;
  let VERIFIER_ROLE, MARKETPLACE_ROLE;

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
  });

  it("47. Complete successful lifecycle & 52. NFT custody lifecycle & 53. NFT final ownership behavior", async function () {
    // 1. Mint
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Integration_Test"]);
    const invoiceAmount = ethers.parseEther("10.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 5;

    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      "INV-INT-1",
      invoiceAmount,
      dueDate,
      "ipfs://metadata"
    );
    expect(await invoiceNFT.ownerOf(1)).to.equal(msme.address);

    // 2. Approve and list
    await invoiceNFT.connect(msme).approve(await invoiceMarketplace.getAddress(), 1);
    const fundingAmount = ethers.parseEther("9.5"); // 5% discount
    await invoiceMarketplace.connect(msme).createAuction(1, fundingAmount, 3600);

    // NFT under marketplace custody
    expect(await invoiceNFT.ownerOf(1)).to.equal(await invoiceMarketplace.getAddress());

    // 3. Bid and Close
    await invoiceMarketplace.connect(investor).placeBid(1, fundingAmount, 500);
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await invoiceMarketplace.connect(msme).closeAuction(1);

    // NFT under escrow custody
    expect(await invoiceNFT.ownerOf(1)).to.equal(await invoiceEscrow.getAddress());

    // 4. Fund, Release and Settle
    await invoiceEscrow.connect(investor).fundDeal(1, { value: fundingAmount });
    await invoiceEscrow.releaseFundingToMSME(1);
    await invoiceEscrow.connect(buyer).settleInvoice(1, { value: invoiceAmount });

    // NFT returned to MSME after settlement
    expect(await invoiceNFT.ownerOf(1)).to.equal(msme.address);
    
    // Status should be SETTLED
    const deal = await invoiceEscrow.deals(1);
    expect(deal.status).to.equal(3); // Status.SETTLED
  });

  it("48. SHA-256 duplicate invoice attack prevention", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Hash_Duplicate"]);
    const invoiceAmount = ethers.parseEther("10.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 86400;

    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      "INV-1",
      invoiceAmount,
      dueDate,
      "ipfs://metadata"
    );

    // Try to mint another invoice with exact same hash
    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        unauthorized.address,
        buyer.address,
        invoiceHash,
        "INV-2",
        invoiceAmount,
        dueDate,
        "ipfs://metadata"
      )
    ).to.be.revertedWithCustomError(invoiceNFT, "InvoiceHashAlreadyUsed");
  });

  it("49. Duplicate NFT financing prevention", async function () {
    // Mint
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Financing_Dup"]);
    const invoiceAmount = ethers.parseEther("10.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 5;

    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      "INV-INT-2",
      invoiceAmount,
      dueDate,
      "ipfs://metadata"
    );

    // List and Bid
    await invoiceNFT.connect(msme).approve(await invoiceMarketplace.getAddress(), 1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("9.5"), 3600);
    await invoiceMarketplace.connect(investor).placeBid(1, ethers.parseEther("9.5"), 500);

    // Close to create deal
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await invoiceMarketplace.connect(msme).closeAuction(1);

    // Token is now marked financed. Attempting to create a second auction must fail.
    await expect(
      invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("9.5"), 3600)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "TokenAlreadyFinanced");
  });

  it("50. Auction winner creates correct escrow deal & 51. Correct financial calculation", async function () {
    // Mint
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Financing_Calc"]);
    const invoiceAmount = ethers.parseEther("10.0"); // 10 ETH
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 5;

    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      "INV-INT-3",
      invoiceAmount,
      dueDate,
      "ipfs://metadata"
    );

    // Financial Formula Validation:
    // invoiceAmount = 10 ETH
    // discountRateBps = 500 (5%)
    // discountAmount = 10 * 500 / 10000 = 0.5 ETH
    // fundingAmount = 10 - 0.5 = 9.5 ETH
    // settlementAmount = 10 ETH
    const discountRateBps = 500;
    const expectedFundingAmount = ethers.parseEther("9.5");
    const expectedSettlementAmount = invoiceAmount;

    await invoiceNFT.connect(msme).approve(await invoiceMarketplace.getAddress(), 1);
    await invoiceMarketplace.connect(msme).createAuction(1, expectedFundingAmount, 3600);
    await invoiceMarketplace.connect(investor).placeBid(1, expectedFundingAmount, discountRateBps);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await invoiceMarketplace.connect(msme).closeAuction(1);

    const deal = await invoiceEscrow.deals(1);
    expect(deal.fundingAmount).to.equal(expectedFundingAmount);
    expect(deal.settlementAmount).to.equal(expectedSettlementAmount);
  });
});
