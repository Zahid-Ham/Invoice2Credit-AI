const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting on-chain deployment status health check...");

  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`Connected chain ID: ${chainId}`);

  let manifestPath;
  if (chainId === 80002) {
    manifestPath = path.join(__dirname, "../deployments/amoy-contracts.json");
    console.log("Using Amoy Deployment Manifest");
  } else {
    manifestPath = path.join(__dirname, "../deployments/local-contracts.json");
    console.log("Using Local Deployment Manifest");
  }

  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: Deployment manifest not found at ${manifestPath}.`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let allPassed = true;
  const report = {};

  const check = (title, status, detail = "") => {
    report[title] = status ? "PASS" : "FAIL";
    if (!status) allPassed = false;
    console.log(`${title.padEnd(30)} .... ${status ? "PASS" : "FAIL"} ${detail}`);
  };

  try {
    check("Network Connection", true);
    check("Chain ID", chainId === 80002 || chainId === 31337, `(Connected: ${chainId})`);

    const hasNft = manifest.contracts && manifest.contracts.InvoiceNFT;
    const hasMkt = manifest.contracts && manifest.contracts.InvoiceMarketplace;
    const hasEsc = manifest.contracts && manifest.contracts.InvoiceEscrow;

    check("InvoiceNFT Configured", !!hasNft);
    check("Marketplace Configured", !!hasMkt);
    check("InvoiceEscrow Configured", !!hasEsc);

    if (hasNft) {
      const nftAddr = manifest.contracts.InvoiceNFT.address;
      const nftCode = await provider.getCode(nftAddr);
      check("InvoiceNFT Bytecode", nftCode !== "0x" && nftCode !== "0x0", `at ${nftAddr}`);
      
      const InvoiceNFT = await hre.ethers.getContractAt("InvoiceNFT", nftAddr);
      const nftName = await InvoiceNFT.name();
      check("InvoiceNFT Contract Read (name)", nftName === "Invoice2Credit NFT", `(Returned: "${nftName}")`);

      const deployer = manifest.deployer;
      const DEFAULT_ADMIN_ROLE = await InvoiceNFT.DEFAULT_ADMIN_ROLE();
      const VERIFIER_ROLE = await InvoiceNFT.VERIFIER_ROLE();
      const hasAdmin = await InvoiceNFT.hasRole(DEFAULT_ADMIN_ROLE, deployer);
      check("NFT Admin Role", hasAdmin, `for deployer ${deployer}`);

      const hasVerifier = await InvoiceNFT.hasRole(VERIFIER_ROLE, deployer);
      check("NFT Verifier Role", hasVerifier, `for deployer ${deployer}`);

      if (hasMkt) {
        const mktAddr = manifest.contracts.InvoiceMarketplace.address;
        const MARKETPLACE_ROLE = await InvoiceNFT.MARKETPLACE_ROLE();
        const hasMarketRole = await InvoiceNFT.hasRole(MARKETPLACE_ROLE, mktAddr);
        check("NFT Marketplace Role", hasMarketRole, `for marketplace ${mktAddr}`);
      }
    }

    if (hasMkt) {
      const mktAddr = manifest.contracts.InvoiceMarketplace.address;
      const mktCode = await provider.getCode(mktAddr);
      check("Marketplace Bytecode", mktCode !== "0x" && mktCode !== "0x0", `at ${mktAddr}`);

      const InvoiceMarketplace = await hre.ethers.getContractAt("InvoiceMarketplace", mktAddr);
      const mktNextAuctionId = await InvoiceMarketplace.nextAuctionId();
      check("Marketplace Contract Read (nextAuctionId)", mktNextAuctionId >= 1n, `(Returned: ${mktNextAuctionId.toString()})`);
    }

    if (hasEsc) {
      const escAddr = manifest.contracts.InvoiceEscrow.address;
      const escCode = await provider.getCode(escAddr);
      check("InvoiceEscrow Bytecode", escCode !== "0x" && escCode !== "0x0", `at ${escAddr}`);

      const InvoiceEscrow = await hre.ethers.getContractAt("InvoiceEscrow", escAddr);
      const escNextDealId = await InvoiceEscrow.nextDealId();
      check("Escrow Contract Read (nextDealId)", escNextDealId >= 1n, `(Returned: ${escNextDealId.toString()})`);
    }

    console.log("\n========================================");
    console.log(`INVOICE2CREDIT DEPLOYMENT HEALTH (${chainId === 80002 ? "AMOY" : "LOCAL"})`);
    console.log("========================================");
    for (const [title, status] of Object.entries(report)) {
      console.log(`${title.padEnd(25)} : ${status}`);
    }
    console.log("========================================");
    
    if (allPassed) {
      console.log("OVERALL STATUS: HEALTHY");
      process.exit(0);
    } else {
      console.error("OVERALL STATUS: UNHEALTHY");
      process.exit(1);
    }
  } catch (error) {
    console.error("Health check execution failed with error:", error.message);
    process.exit(1);
  }
}

main();
