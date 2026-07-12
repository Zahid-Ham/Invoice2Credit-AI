const fs = require("fs");
const path = require("path");

const isLocal = process.argv.includes("local");

const MANIFEST_PATH = isLocal
  ? path.join(__dirname, "../deployments/local-contracts.json")
  : path.join(__dirname, "../deployments/amoy-contracts.json");

const TARGET_EXPORT_PATH = isLocal
  ? path.join(__dirname, "../exports/local-deployment.json")
  : path.join(__dirname, "../exports/amoy-deployment.json");

const filename = isLocal ? "local-deployment.json" : "amoy-deployment.json";

function main() {
  console.log(`Starting deployment export for ${isLocal ? "local" : "amoy"} integration...`);

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Error: Deployment manifest not found at ${MANIFEST_PATH}.`);
    process.exit(1);
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    
    const exportData = {
      chainId: manifest.network.chainId,
      networkName: manifest.network.name,
      contracts: {}
    };

    if (manifest.contracts && manifest.contracts.InvoiceNFT) {
      exportData.contracts.InvoiceNFT = manifest.contracts.InvoiceNFT.address;
    }
    if (manifest.contracts && manifest.contracts.InvoiceMarketplace) {
      exportData.contracts.InvoiceMarketplace = manifest.contracts.InvoiceMarketplace.address;
    }
    if (manifest.contracts && manifest.contracts.InvoiceEscrow) {
      exportData.contracts.InvoiceEscrow = manifest.contracts.InvoiceEscrow.address;
    }

    const exportDir = path.dirname(TARGET_EXPORT_PATH);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    fs.writeFileSync(TARGET_EXPORT_PATH, JSON.stringify(exportData, null, 2), "utf8");
    console.log(`Successfully wrote exported deployment configuration to ${TARGET_EXPORT_PATH}`);

    // Also copy to frontend directory to make integration seamless
    const frontendTargetDir = path.join(__dirname, "../../frontend/src/blockchain/deployments");
    const frontendTargetPath = path.join(frontendTargetDir, filename);
    if (fs.existsSync(path.join(__dirname, "../../frontend"))) {
      if (!fs.existsSync(frontendTargetDir)) {
        fs.mkdirSync(frontendTargetDir, { recursive: true });
      }
      fs.writeFileSync(frontendTargetPath, JSON.stringify(exportData, null, 2), "utf8");
      console.log(`Successfully copied deployment configuration to frontend: ${frontendTargetPath}`);
    }
  } catch (error) {
    console.error("Export failed:", error.message);
    process.exit(1);
  }
}

main();
