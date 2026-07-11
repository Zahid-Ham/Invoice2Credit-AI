const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvoiceNFT Contracts Validation (Scenarios 1-12)", function () {
  let InvoiceNFT, invoiceNFT;
  let owner, verifier, msme, buyer, unauthorized;
  let VERIFIER_ROLE, DEFAULT_ADMIN_ROLE;

  beforeEach(async function () {
    [owner, verifier, msme, buyer, unauthorized] = await ethers.getSigners();
    InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
    invoiceNFT = await InvoiceNFT.deploy();
    await invoiceNFT.waitForDeployment();

    VERIFIER_ROLE = await invoiceNFT.VERIFIER_ROLE();
    DEFAULT_ADMIN_ROLE = await invoiceNFT.DEFAULT_ADMIN_ROLE();
    await invoiceNFT.grantRole(VERIFIER_ROLE, verifier.address);
  });

  it("1. Deployment - should set name and symbol correctly", async function () {
    expect(await invoiceNFT.name()).to.equal("Invoice2Credit NFT");
    expect(await invoiceNFT.symbol()).to.equal("I2CNFT");
  });

  it("2. Correct roles - deployer has admin and verifier roles", async function () {
    expect(await invoiceNFT.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    expect(await invoiceNFT.hasRole(VERIFIER_ROLE, owner.address)).to.be.true;
    expect(await invoiceNFT.hasRole(VERIFIER_ROLE, verifier.address)).to.be.true;
    expect(await invoiceNFT.hasRole(VERIFIER_ROLE, unauthorized.address)).to.be.false;
  });

  it("3. Authorized mint - verifier should successfully mint invoice NFT", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Auth_Mint"]);
    const amount = ethers.parseEther("1.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        msme.address,
        buyer.address,
        invoiceHash,
        "INV-AUTH",
        amount,
        dueDate,
        "ipfs://metadata-auth"
      )
    ).to.not.be.reverted;
  });

  it("4. Unauthorized mint - non-verifier minting attempt must revert", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Unauth_Mint"]);
    const amount = ethers.parseEther("1.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    await expect(
      invoiceNFT.connect(unauthorized).mintInvoice(
        msme.address,
        buyer.address,
        invoiceHash,
        "INV-UNAUTH",
        amount,
        dueDate,
        "ipfs://metadata"
      )
    ).to.be.reverted;
  });

  it("5. Zero hash rejection - minting with empty bytes32 hash must revert", async function () {
    const zeroHash = ethers.ZeroHash;
    const amount = ethers.parseEther("1.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        msme.address,
        buyer.address,
        zeroHash,
        "INV-ZERO-HASH",
        amount,
        dueDate,
        "ipfs://metadata"
      )
    ).to.be.revertedWithCustomError(invoiceNFT, "InvalidInvoiceHash");
  });

  it("6. Duplicate hash rejection - double-tokenizing the same document hash must revert", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Duplicate_Hash"]);
    const amount = ethers.parseEther("1.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      "INV-DUP-1",
      amount,
      dueDate,
      "ipfs://metadata"
    );

    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        msme.address,
        buyer.address,
        invoiceHash,
        "INV-DUP-2",
        amount,
        dueDate,
        "ipfs://metadata"
      )
    ).to.be.revertedWithCustomError(invoiceNFT, "InvoiceHashAlreadyUsed");
  });

  it("7. Zero amount rejection - minting with zero invoice amount must revert", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Zero_Amt"]);
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        msme.address,
        buyer.address,
        invoiceHash,
        "INV-ZERO-AMT",
        0,
        dueDate,
        "ipfs://metadata"
      )
    ).to.be.revertedWithCustomError(invoiceNFT, "InvalidAmount");
  });

  it("8. Invalid due date rejection - due date in the past or present must revert", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Past_Due"]);
    const amount = ethers.parseEther("1.0");
    const pastDueDate = (await ethers.provider.getBlock("latest")).timestamp - 10;

    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        msme.address,
        buyer.address,
        invoiceHash,
        "INV-PAST",
        amount,
        pastDueDate,
        "ipfs://metadata"
      )
    ).to.be.revertedWithCustomError(invoiceNFT, "InvalidDueDate");
  });

  it("9. Correct NFT owner - MSME is the initial NFT owner", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Owner_Check"]);
    const amount = ethers.parseEther("1.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    const tx = await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      "INV-OWN",
      amount,
      dueDate,
      "ipfs://metadata"
    );
    await tx.wait();

    expect(await invoiceNFT.ownerOf(1)).to.equal(msme.address);
  });

  it("10. Correct invoice record - parameters are accurately stored on-chain", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Record_Check"]);
    const amount = ethers.parseEther("1.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      "INV-REC",
      amount,
      dueDate,
      "ipfs://metadata"
    );

    const record = await invoiceNFT.invoiceRecords(1);
    expect(record.tokenId).to.equal(1);
    expect(record.invoiceHash).to.equal(invoiceHash);
    expect(record.invoiceReference).to.equal("INV-REC");
    expect(record.invoiceAmount).to.equal(amount);
    expect(record.dueDate).to.equal(dueDate);
    expect(record.msme).to.equal(msme.address);
    expect(record.buyer).to.equal(buyer.address);
    expect(record.verified).to.be.true;
  });

  it("11. Correct token URI - returns correct metadata reference", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_URI_Check"]);
    const amount = ethers.parseEther("1.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    await invoiceNFT.connect(verifier).mintInvoice(
      msme.address,
      buyer.address,
      invoiceHash,
      "INV-URI",
      amount,
      dueDate,
      "ipfs://metadata-uri-123"
    );

    expect(await invoiceNFT.tokenURI(1)).to.equal("ipfs://metadata-uri-123");
  });

  it("12. InvoiceMinted event - correctly emits event with arguments", async function () {
    const invoiceHash = ethers.solidityPackedKeccak256(["string"], ["Invoice_Event_Check"]);
    const amount = ethers.parseEther("1.0");
    const dueDate = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    await expect(
      invoiceNFT.connect(verifier).mintInvoice(
        msme.address,
        buyer.address,
        invoiceHash,
        "INV-EVT",
        amount,
        dueDate,
        "ipfs://metadata"
      )
    )
      .to.emit(invoiceNFT, "InvoiceMinted")
      .withArgs(1, invoiceHash, msme.address, buyer.address, "INV-EVT", amount, dueDate, anyValue => true);
  });
});
