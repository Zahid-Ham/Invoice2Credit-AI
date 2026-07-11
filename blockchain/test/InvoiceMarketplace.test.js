const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvoiceMarketplace Contracts Validation (Scenarios 13-29)", function () {
  let InvoiceNFT, invoiceNFT;
  let InvoiceMarketplace, invoiceMarketplace;
  let InvoiceEscrow, invoiceEscrow;
  let owner, verifier, msme, buyer, investor1, investor2, unauthorized;
  let VERIFIER_ROLE, MARKETPLACE_ROLE;

  beforeEach(async function () {
    [owner, verifier, msme, buyer, investor1, investor2, unauthorized] = await ethers.getSigners();

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

  async function mintTestToken(tokenId = 1) {
    const invoiceHash = ethers.solidityPackedKeccak256(["uint256"], [tokenId]);
    const amount = ethers.parseEther("10.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 5;
    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      `INV-${tokenId}`,
      amount,
      dueDate,
      "ipfs://metadata"
    );
    await invoiceNFT.connect(msme).approve(await invoiceMarketplace.getAddress(), tokenId);
  }

  it("13. Auction creation - listings move token to marketplace contract", async function () {
    await mintTestToken(1);
    await expect(invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("9.0"), 3600))
      .to.emit(invoiceMarketplace, "AuctionCreated");

    expect(await invoiceNFT.ownerOf(1)).to.equal(await invoiceMarketplace.getAddress());
  });

  it("14. Non-owner auction creation rejection - non-owner of NFT cannot list it", async function () {
    await mintTestToken(1);
    await expect(
      invoiceMarketplace.connect(unauthorized).createAuction(1, ethers.parseEther("9.0"), 3600)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "NotSeller");
  });

  it("15. Duplicate active auction rejection - listing a token twice simultaneously must revert", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("9.0"), 3600);

    // Try to list same token again
    await expect(
      invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("9.0"), 3600)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "AuctionAlreadyExistsForToken");
  });

  it("16. Invalid auction duration - zero duration must revert", async function () {
    await mintTestToken(1);
    await expect(
      invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("9.0"), 0)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "InvalidDuration");
  });

  it("17. Invalid funding requirement - zero minimum funding must revert", async function () {
    await mintTestToken(1);
    await expect(
      invoiceMarketplace.connect(msme).createAuction(1, 0, 3600)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "InvalidFundingAmount");
  });

  it("18. Valid bid - investor places bid successfully", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    await expect(
      invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("9.0"), 500)
    ).to.emit(invoiceMarketplace, "BidPlaced");
  });

  it("19. Seller self-bid rejection - seller cannot place a bid on their own auction", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    await expect(
      invoiceMarketplace.connect(msme).placeBid(1, ethers.parseEther("9.0"), 500)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "SellerCannotBid");
  });

  it("20. Funding amount below requirement rejection - bidding below min funding must revert", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    await expect(
      invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("7.9"), 500)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "BidAmountBelowMinimum");
  });

  it("21. Excessive discount rate rejection - bid with discount rate over limit must revert", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    await expect(
      invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("9.0"), 3500)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "InvalidDiscountRate");
  });

  it("22. Bid after expiry rejection - bidding after endTime must revert", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await expect(
      invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("9.0"), 500)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "AuctionHasEnded");
  });

  it("23. Lowest discount wins - closeAuction selects lowest discount rate bid", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    // Investor 1: 500 bps (5%)
    await invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("9.0"), 500);
    // Investor 2: 400 bps (4%) - lower, better for MSME
    await invoiceMarketplace.connect(investor2).placeBid(1, ethers.parseEther("9.5"), 400);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await expect(invoiceMarketplace.connect(msme).closeAuction(1))
      .to.emit(invoiceMarketplace, "AuctionClosed")
      .withArgs(1, investor2.address, ethers.parseEther("9.5"), 400, 1);
  });

  it("24. Equal discount earlier bid wins - tie-breaker prefers the earlier timestamp", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    // Investor 1 bids 400 bps
    await invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("9.0"), 400);
    
    // Fast forward slightly
    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine");

    // Investor 2 bids 400 bps (later)
    await invoiceMarketplace.connect(investor2).placeBid(1, ethers.parseEther("9.0"), 400);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await expect(invoiceMarketplace.connect(msme).closeAuction(1))
      .to.emit(invoiceMarketplace, "AuctionClosed")
      .withArgs(1, investor1.address, ethers.parseEther("9.0"), 400, 1); // Investor 1 wins (earlier)
  });

  it("25. Early close rejection - closing before end time must revert", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    await expect(
      invoiceMarketplace.connect(msme).closeAuction(1)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "AuctionNotEnded");
  });

  it("26. Valid auction close - closes and maps active status properly", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);
    await invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("9.0"), 500);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await invoiceMarketplace.connect(msme).closeAuction(1);
    const auction = await invoiceMarketplace.auctions(1);
    expect(auction.active).to.be.false;
    expect(auction.settled).to.be.true;
  });

  it("27. Double close rejection - closing a settled auction must revert", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);
    await invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("9.0"), 500);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await invoiceMarketplace.connect(msme).closeAuction(1);

    await expect(
      invoiceMarketplace.connect(msme).closeAuction(1)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "AuctionNotActive");
  });

  it("28. Auction without bids behavior - cancels and returns NFT to MSME", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await expect(invoiceMarketplace.connect(msme).closeAuction(1))
      .to.emit(invoiceMarketplace, "AuctionCancelled")
      .withArgs(1, 1);

    expect(await invoiceNFT.ownerOf(1)).to.equal(msme.address);
  });

  it("29. Permanent financed-token protection - token cannot be auctioned again once marked financed", async function () {
    await mintTestToken(1);
    await invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600);
    await invoiceMarketplace.connect(investor1).placeBid(1, ethers.parseEther("9.0"), 500);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await invoiceMarketplace.connect(msme).closeAuction(1);

    // Verify NFT is marked financed
    expect(await invoiceNFT.financedTokens(1)).to.be.true;

    // Approve marketplace again (even though it's owned by Escrow now, try to list it)
    // Transfer NFT back to MSME manually to simulate mock attempt to list it again
    // In our actual system, MSME doesn't have it, but even if they did, the marketplace must revert:
    await expect(
      invoiceMarketplace.connect(msme).createAuction(1, ethers.parseEther("8.0"), 3600)
    ).to.be.revertedWithCustomError(invoiceMarketplace, "TokenAlreadyFinanced");
  });
});
