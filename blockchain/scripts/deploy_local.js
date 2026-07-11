const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;

  console.log(`Connected to local network: ${networkName} (Chain ID: ${chainId})`);

  // Safety Guard: Abort if not running on localhost or hardhat local networks
  if (networkName !== "localhost" && networkName !== "hardhat") {
    console.error(`Safety Guard Triggered: Expected network 'localhost' or 'hardhat', but got '${networkName}'.`);
    console.error("Local deployment cannot write to Amoy files or run on Amoy networks.");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Balance:  ${hre.ethers.formatEther(balance)} ETH`);

  // 1. Deploy InvoiceNFT
  console.log("\n[1/3] Deploying InvoiceNFT...");
  const InvoiceNFT = await hre.ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.waitForDeployment();
  const nftAddress = await invoiceNFT.getAddress();
  const nftTx = invoiceNFT.deploymentTransaction();
  const nftReceipt = await nftTx.wait();
  console.log(`InvoiceNFT deployed successfully.\nAddress: ${nftAddress}\nTransaction: ${nftTx.hash}`);

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
  console.log(`InvoiceEscrow deployed successfully.\nAddress: ${escrowAddress}\nTransaction: ${escTx.hash}`);

  // 4. Configure wiring
  console.log("\nConfiguring cross-contract authorizations...");
  const MARKETPLACE_ROLE = await invoiceNFT.MARKETPLACE_ROLE();
  console.log(`Granting MARKETPLACE_ROLE to Marketplace at ${marketplaceAddress}...`);
  const grantTx = await invoiceNFT.grantRole(MARKETPLACE_ROLE, marketplaceAddress);
  const grantReceipt = await grantTx.wait();
  console.log(`Role granted in transaction: ${grantReceipt.hash}`);

  console.log(`Setting Escrow contract to ${escrowAddress} on Marketplace...`);
  const setEscrowTx = await invoiceMarketplace.setEscrowContract(escrowAddress);
  const setEscrowReceipt = await setEscrowTx.wait();
  console.log(`Escrow set in transaction: ${setEscrowReceipt.hash}`);

  // 5. Save local manifest
  const manifestPath = path.join(__dirname, "../deployments/local-contracts.json");
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
        deploymentTxHash: nftTx.hash,
        deploymentBlock: Number(nftReceipt.blockNumber)
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
  console.log(`\nLocal deployment manifest saved to ${manifestPath}`);
  console.log("\nLOCAL DEPLOYMENT COMPLETED SUCCESSFULLY.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
