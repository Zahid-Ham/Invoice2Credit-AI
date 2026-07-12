const { ethers } = require("hardhat");
const manifest = require("../exports/local-deployment.json");

async function main() {
  const mktAddress = manifest.contracts.InvoiceMarketplace;
  const mkt = await ethers.getContractAt("InvoiceMarketplace", mktAddress);
  
  console.log(`InvoiceMarketplace Address: ${mktAddress}`);
  
  // 1. Fast-forward Hardhat EVM time by 25 hours (90000 seconds) to ensure auction is ended
  console.log("Fast-forwarding blockchain time by 25 hours...");
  await ethers.provider.send("evm_increaseTime", [90000]);
  await ethers.provider.send("evm_mine");
  
  // We want to close Auction ID 1
  const targetAuctionId = 1;
  console.log(`Closing Auction ID ${targetAuctionId}...`);
  
  const [seller] = await ethers.getSigners();
  console.log(`Signer address (MSME Owner): ${seller.address}`);
  
  const tx = await mkt.connect(seller).closeAuction(targetAuctionId);
  const receipt = await tx.wait();
  console.log(`Success! Transaction Hash: ${receipt.hash}`);
  
  // Print active balance of seller after drawdown
  const balance = await ethers.provider.getBalance(seller.address);
  console.log(`MSME Owner Balance: ${ethers.formatEther(balance)} ETH/POL`);
}

main().catch(console.error);
