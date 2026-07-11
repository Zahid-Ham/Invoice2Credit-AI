const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.join(__dirname, "../artifacts/contracts");
const EXPORTS_DIR = path.join(__dirname, "../exports");

const CONTRACT_FILES = [
  { file: "InvoiceNFT.sol/InvoiceNFT.json", name: "InvoiceNFT" },
  { file: "InvoiceMarketplace.sol/InvoiceMarketplace.json", name: "InvoiceMarketplace" },
  { file: "InvoiceEscrow.sol/InvoiceEscrow.json", name: "InvoiceEscrow" },
];

function exportABIs() {
  console.log("Starting ABI export...");

  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    console.log(`Created exports directory: ${EXPORTS_DIR}`);
  }

  let successCount = 0;

  for (const { file, name } of CONTRACT_FILES) {
    const artifactPath = path.join(ARTIFACTS_DIR, file);

    if (!fs.existsSync(artifactPath)) {
      console.warn(`Artifact not found at ${artifactPath}. Have you compiled?`);
      continue;
    }

    try {
      const artifactContent = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      
      const exportedData = {
        contractName: artifactContent.contractName,
        abi: artifactContent.abi,
      };

      const exportPath = path.join(EXPORTS_DIR, `${name}.json`);
      fs.writeFileSync(exportPath, JSON.stringify(exportedData, null, 2), "utf8");
      console.log(`Successfully exported ABI for ${name} to ${exportPath}`);
      successCount++;
    } catch (error) {
      console.error(`Failed to export ABI for ${name}:`, error);
    }
  }

  console.log(`ABI export completed. Exported ${successCount}/${CONTRACT_FILES.length} files.`);
}

exportABIs();
