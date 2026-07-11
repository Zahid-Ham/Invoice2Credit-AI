const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("Starting environment validation checks...");

  const envPath = path.join(__dirname, "../.env");
  const envExists = fs.existsSync(envPath);
  console.log(`.env Exists: ${envExists}`);

  if (!envExists) {
    console.error("Error: .env file not found.");
    process.exit(1);
  }

  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL;
  const pkey = process.env.DEPLOYER_PRIVATE_KEY;

  const rpcConfigured = !!rpcUrl;
  const pkeyConfigured = !!pkey;

  console.log(`RPC configured: ${rpcConfigured}`);
  console.log(`Private key configured: ${pkeyConfigured}`);

  let pkeyValid = false;
  let derivedAddress = "";

  if (pkeyConfigured) {
    const formattedKey = pkey.trim();
    const hexRegex = /^(0x)?[0-9a-fA-F]{64}$/;
    pkeyValid = hexRegex.test(formattedKey);
    if (pkeyValid) {
      try {
        const wallet = new ethers.Wallet(formattedKey.startsWith("0x") ? formattedKey : "0x" + formattedKey);
        derivedAddress = wallet.address;
      } catch (err) {
        pkeyValid = false;
      }
    }
  }

  console.log(`Private key format valid: ${pkeyValid}`);
  console.log(`Derived Deployer Address: ${derivedAddress}`);

  let rpcStatus = "FAILED";
  let connectedChainId = 0n;
  let balanceEth = "0.0";

  if (rpcConfigured && pkeyValid) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      connectedChainId = network.chainId;
      rpcStatus = "SUCCESS";

      const balance = await provider.getBalance(derivedAddress);
      balanceEth = ethers.formatEther(balance);
    } catch (err) {
      console.error("RPC Connection Error:", err.message);
    }
  }

  console.log(`RPC Connection Status: ${rpcStatus}`);
  console.log(`Connected Chain ID: ${connectedChainId.toString()}`);
  console.log(`Deployer balance: ${balanceEth} POL`);

  // Check hardhat.config.js maps polygonAmoy to chain ID 80002
  const hardhatConfigPath = path.join(__dirname, "../hardhat.config.js");
  const hardhatConfig = fs.readFileSync(hardhatConfigPath, "utf8");
  const mapsAmoy = hardhatConfig.includes("polygonAmoy");
  const sourcesPkey = hardhatConfig.includes("DEPLOYER_PRIVATE_KEY");
  console.log(`Hardhat config maps amoy: ${mapsAmoy}`);
  console.log(`Hardhat config sources private key: ${sourcesPkey}`);

  // Git .env protection check
  const gitignorePath = path.join(__dirname, "../.gitignore");
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  const gitIgnoresEnv = gitignore.includes(".env");
  console.log(`Git ignores .env: ${gitIgnoresEnv}`);

  // Scan workspace for hardcoded secrets
  console.log("Scanning workspace for hardcoded secrets...");
  const filesToScan = [
    "hardhat.config.js",
    "contracts/InvoiceNFT.sol",
    "contracts/InvoiceMarketplace.sol",
    "contracts/InvoiceEscrow.sol",
    "scripts/deploy.js",
    "scripts/check_deployment.js",
    "scripts/export_deployment.js",
  ];

  let hardcodedSecretsFound = false;
  // Match 64-char hex strings (except in .env.example) and standard private keys or seed patterns
  const pkeyPattern = /0x[0-9a-fA-F]{64}\b|[0-9a-fA-F]{64}\b/;
  const alchemyPattern = /alchemy\.com\/v2\/[a-zA-Z0-9_-]{32}/;

  for (const file of filesToScan) {
    const filePath = path.join(__dirname, "..", file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      
      // Skip checking example file values if matched
      if (pkeyPattern.test(content)) {
        // Exclude hardcoded dummy zero keys or standard constants
        const matches = content.match(pkeyPattern) || [];
        const realMatches = matches.filter(m => !m.includes("0000000000000000") && !m.toLowerCase().includes("keccak"));
        if (realMatches.length > 0) {
          console.warn(`POTENTIAL SECRET FOUND in ${file}`);
          hardcodedSecretsFound = true;
        }
      }
      if (alchemyPattern.test(content)) {
        console.warn(`POTENTIAL ALCHEMY URL FOUND in ${file}`);
        hardcodedSecretsFound = true;
      }
    }
  }

  console.log(`Hardcoded secrets found: ${hardcodedSecretsFound}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
