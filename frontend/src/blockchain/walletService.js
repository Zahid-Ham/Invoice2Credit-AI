import { BrowserProvider, formatEther } from 'ethers';
import { blockchainConfig } from './config';
import {
  MetaMaskNotInstalledError,
  WalletConnectionRejectedError,
  NetworkSwitchRejectedError,
  parseMetaMaskError
} from './errors';

export const walletService = {
  isMetaMaskAvailable() {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  },

  getInjectedProvider() {
    if (!this.isMetaMaskAvailable()) return null;
    return window.ethereum;
  },

  async connectWallet() {
    if (!this.isMetaMaskAvailable()) throw new MetaMaskNotInstalledError();
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return accounts;
    } catch (err) {
      if (err.code === 4001) throw new WalletConnectionRejectedError();
      throw parseMetaMaskError(err);
    }
  },

  async getConnectedAccounts() {
    if (!this.isMetaMaskAvailable()) return [];
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts;
    } catch (err) {
      return [];
    }
  },

  async getActiveAccount() {
    const accts = await this.getConnectedAccounts();
    return accts.length > 0 ? accts[0] : null;
  },

  async getCurrentChainId() {
    if (!this.isMetaMaskAvailable()) return null;
    try {
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainIdHex, 16);
    } catch (err) {
      return null;
    }
  },

  getBrowserProvider() {
    if (!this.isMetaMaskAvailable()) return null;
    return new BrowserProvider(window.ethereum);
  },

  async getSigner() {
    const provider = this.getBrowserProvider();
    if (!provider) return null;
    return await provider.getSigner();
  },

  async getWalletBalance(address) {
    const provider = this.getBrowserProvider();
    if (!provider || !address) return '0.0';
    try {
      const bal = await provider.getBalance(address);
      return formatEther(bal);
    } catch (err) {
      return '0.0';
    }
  },

  async switchToPolygonAmoy() {
    if (!this.isMetaMaskAvailable()) throw new MetaMaskNotInstalledError();
    const config = blockchainConfig;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainIdHex }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await this.addPolygonAmoyNetwork();
      } else if (err.code === 4001) {
        throw new NetworkSwitchRejectedError();
      } else {
        throw parseMetaMaskError(err);
      }
    }
  },

  async addPolygonAmoyNetwork() {
    if (!this.isMetaMaskAvailable()) throw new MetaMaskNotInstalledError();
    const config = blockchainConfig;
    const params = [{
      chainId: config.chainIdHex,
      chainName: config.name,
      nativeCurrency: {
        name: config.symbol,
        symbol: config.symbol,
        decimals: config.decimals
      },
      rpcUrls: [config.rpcUrl],
      blockExplorerUrls: config.explorerUrl ? [config.explorerUrl] : []
    }];
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params,
      });
    } catch (err) {
      throw parseMetaMaskError(err);
    }
  },

  async ensureCorrectNetwork() {
    const currentChain = await this.getCurrentChainId();
    if (currentChain !== blockchainConfig.chainId) {
      await this.switchToPolygonAmoy();
    }
  },

  async submitTransaction(payload) {
    if (!this.isMetaMaskAvailable()) throw new MetaMaskNotInstalledError();
    
    await this.ensureCorrectNetwork();

    const signer = await this.getSigner();
    if (!signer) throw new Error('Failed to get wallet signer.');

    try {
      const txResponse = await signer.sendTransaction({
        to: payload.to,
        data: payload.data,
        value: payload.value,
        gasLimit: payload.gas
      });
      return txResponse.hash;
    } catch (err) {
      throw parseMetaMaskError(err);
    }
  }
};
