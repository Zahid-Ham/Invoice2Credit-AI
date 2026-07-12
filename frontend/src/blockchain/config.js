import amoyDeployment from './deployments/amoy-deployment.json';
import localDeployment from './deployments/local-deployment.json';

const activeNetwork = import.meta.env.VITE_BLOCKCHAIN_NETWORK || 'local';

export const blockchainConfig = activeNetwork === 'amoy' ? {
  chainId: 80002,
  chainIdHex: '0x13882',
  name: 'Polygon Amoy',
  rpcUrl: import.meta.env.VITE_POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
  symbol: 'POL',
  decimals: 18,
  explorerUrl: 'https://amoy.polygonscan.com',
  contracts: amoyDeployment.contracts
} : {
  chainId: 31337,
  chainIdHex: '0x7a69',
  name: 'Hardhat Local',
  rpcUrl: 'http://127.0.0.1:8545',
  symbol: 'ETH',
  decimals: 18,
  explorerUrl: '',
  contracts: localDeployment.contracts
};
