const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function validateEnvironment(networkName) {
  console.log("Checking environment configuration...");
  if (networkName === "polygonAmoy" || networkName === "amoy") {
    const missing = [];
    if (!process.env.POLYGON_AMOY_RPC_URL) missing.push("POLYGON_AMOY_RPC_URL");
    if (!process.env.DEPLOYER_PRIVATE_KEY) missing.push("DEPLOYER_PRIVATE_KEY");
    
    if (missing.length > 0) {
      throw new Error(`DEPLOYMENT STATUS: BLOCKED — MISSING ENVIRONMENT CONFIGURATION. Missing variables: ${missing.join(", ")}`);
    }

    const pkey = process.env.DEPLOYER_PRIVATE_KEY.trim();
    const hexRegex = /^(0x)?[0-9a-fA-F]{64}$/;
    if (!hexRegex.test(pkey)) {
      throw new Error("DEPLOYMENT STATUS: BLOCKED — INVALID DEPLOYER_PRIVATE_KEY hex format.");
    }
  }
}

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  const networkName = hre.network.name;

  console.log(`Connected to network: ${networkName} (Chain ID: ${chainId})`);

  await validateEnvironment(networkName);

  if (networkName === "polygonAmoy" || networkName === "amoy") {
    if (chainId !== 80002n && chainId !== 80002) {
      console.error(`Expected Chain ID: 80002\nConnected Chain ID: ${chainId}`);
      throw new Error("ABORTING: Network guard triggered. Connected Chain ID is not Polygon Amoy (80002).");
    }
  }

  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  const balanceEth = hre.ethers.formatEther(balance);

  console.log("========================================");
  console.log("INVOICE2CREDIT DEPLOYMENT PRE-FLIGHT");
  console.log("========================================");
  console.log(`Network:      ${networkName}`);
  console.log(`Chain ID:     ${chainId}`);
  console.log(`Deployer:     ${deployerAddress}`);
  console.log(`Balance:      ${balanceEth} POL/native`);
  console.log("========================================");

  if (balance === 0n) {
    throw new Error(`ABORTING: Deployer wallet (${deployerAddress}) has 0 native token balance. Please fund it with POL.`);
  }

  // Load manifest to check for existing deployments
  const manifestPath = path.join(__dirname, "../deployments/amoy-contracts.json");
  let existingNftAddress = "";
  let existingNftTxHash = "";
  let existingNftBlock = 0;

  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (data.contracts && data.contracts.InvoiceNFT && data.contracts.InvoiceNFT.address) {
        existingNftAddress = data.contracts.InvoiceNFT.address;
        existingNftTxHash = data.contracts.InvoiceNFT.deploymentTxHash;
        existingNftBlock = data.contracts.InvoiceNFT.deploymentBlock;
        console.log(`Found existing InvoiceNFT deployment at: ${existingNftAddress}`);
      }
    } catch (e) {
      // ignore
    }
  }

  // 1. Deploy/Reuse InvoiceNFT
  let nftAddress;
  let nftTxHash;
  let nftBlock;

  if (existingNftAddress) {
    nftAddress = existingNftAddress;
    nftTxHash = existingNftTxHash;
    nftBlock = existingNftBlock;
    console.log(`Reusing existing InvoiceNFT at ${nftAddress}`);
  } else {
    console.log("\n[1/3] Deploying InvoiceNFT...");
    const InvoiceNFT = await hre.ethers.getContractFactory("InvoiceNFT");
    const invoiceNFT = await InvoiceNFT.deploy();
    await invoiceNFT.waitForDeployment();
    nftAddress = await invoiceNFT.getAddress();
    const nftTx = invoiceNFT.deploymentTransaction();
    const nftReceipt = await nftTx.wait();
    nftTxHash = nftTx.hash;
    nftBlock = Number(nftReceipt.blockNumber);
    console.log(`InvoiceNFT deployed successfully.\nAddress: ${nftAddress}\nTransaction: ${nftTxHash}`);
  }

  // 2. Deploy InvoiceMarketplace
  console.log("\n[2/3] Deploying InvoiceMarketplace...");
  const InvoiceMarketplace = await hre.ethers.getContractFactory("InvoiceMarketplace");
  const invoiceMarketplace = await InvoiceMarketplace.deploy(nftAddress);
  await invoiceMarketplace.waitForDeployment();
  const marketplaceAddress = await invoiceMarketplace.getAddress();
  const mktTx = invoiceMarketplace.deploymentTransaction();
  const mktReceipt = await mktTx.wait();
  console.log(`InvoiceMarketplace deployed successfully.\nAddress: ${marketplaceAddress}\nTransaction: ${mktTx.hash}`);

  // 3. Deploy InvoiceEscrow
  console.log("\n[3/3] Deploying InvoiceEscrow...");
  const InvoiceEscrow = await hre.ethers.getContractFactory("InvoiceEscrow");
  const invoiceEscrow = await InvoiceEscrow.deploy(nftAddress, marketplaceAddress);
  await invoiceEscrow.waitForDeployment();
  const escrowAddress = await invoiceEscrow.getAddress();
  const escTx = invoiceEscrow.deploymentTransaction();
  const escReceipt = await escTx.wait();
  console.log(`InvoiceEscrow deployed successfully.\nAddress: ${escAddress}\nTransaction: ${escTx.hash}`);

  // 4. Configure wiring
  console.log("\nConfiguring cross-contract authorizations...");
  // Connect to InvoiceNFT contract instance
  const invoiceNFT = await hre.ethers.getContractAt("InvoiceNFT", nftAddress);
  const MARKETPLACE_ROLE = await invoiceNFT.MARKETPLACE_ROLE();
  console.log(`Granting MARKETPLACE_ROLE to Marketplace at ${marketplaceAddress}...`);
  const grantTx = await invoiceNFT.grantRole(MARKETPLACE_ROLE, marketplaceAddress);
  const grantReceipt = await grantTx.wait();
  console.log(`Role granted in transaction: ${grantReceipt.hash}`);

  console.log(`Setting Escrow contract to ${escrowAddress} on Marketplace...`);
  const setEscrowTx = await invoiceMarketplace.setEscrowContract(escrowAddress);
  const setEscrowReceipt = await setEscrowTx.wait();
  console.log(`Escrow set in transaction: ${setEscrowReceipt.hash}`);

  // 5. Save Manifest
  const manifestDir = path.dirname(manifestPath);
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  const manifest = {
    project: "Invoice2Credit AI",
    network: {
      name: networkName,
      chainId: Number(chainId)
    },
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    contracts: {
      InvoiceNFT: {
        address: nftAddress,
        deploymentTxHash: nftTxHash,
        deploymentBlock: nftBlock
      },
      InvoiceMarketplace: {
        address: marketplaceAddress,
        deploymentTxHash: mktTx.hash,
        deploymentBlock: Number(mktReceipt.blockNumber)
      },
      InvoiceEscrow: {
        address: escrowAddress,
        deploymentTxHash: escTx.hash,
        deploymentBlock: Number(escReceipt.blockNumber)
      }
    },
    configurationTransactions: {
      marketplaceRoleGrant: grantReceipt.hash,
      escrowConfiguration: setEscrowReceipt.hash
    }
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nDeployment manifest saved to ${manifestPath}`);

  // Source code verification
  if (process.env.POLYGONSCAN_API_KEY && networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\nStarting contract source verification on Polygonscan...");
    const verifyContract = async (address, args = []) => {
      try {
        await hre.run("verify:verify", {
          address: address,
          constructorArguments: args,
        });
        console.log(`Successfully verified contract at ${address}`);
      } catch (err) {
        console.error(`Verification failed for contract at ${address}:`, err.message);
      }
    };
    console.log("Verifying InvoiceNFT...");
    await verifyContract(nftAddress, []);
    console.log("Verifying InvoiceMarketplace...");
    await verifyContract(marketplaceAddress, [nftAddress]);
    console.log("Verifying InvoiceEscrow...");
    await verifyContract(escrowAddress, [nftAddress, marketplaceAddress]);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
