require("@nomicfoundation/hardhat-toolbox");

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.CONTRACT_OWNER_PRIVATE_KEY ? [process.env.CONTRACT_OWNER_PRIVATE_KEY] : [],
    }
  }
};
