import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { walletService } from '../blockchain/walletService';
import { blockchainConfig } from '../blockchain/config';
import { parseMetaMaskError } from '../blockchain/errors';

const WalletContext = createContext(null);

export const useWallet = () => useContext(WalletContext);

export function WalletProvider({ children }) {
  const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [balance, setBalance] = useState('0.0');
  const [walletError, setWalletError] = useState(null);

  const refreshWalletState = useCallback(async () => {
    if (!walletService.isMetaMaskAvailable()) {
      setIsMetaMaskAvailable(false);
      return;
    }
    setIsMetaMaskAvailable(true);

    try {
      const accounts = await walletService.getConnectedAccounts();
      const currentChain = await walletService.getCurrentChainId();
      
      setChainId(currentChain);
      const correctNet = currentChain === blockchainConfig.chainId;
      setIsCorrectNetwork(correctNet);

      if (accounts.length > 0) {
        const activeAcc = accounts[0];
        setAccount(activeAcc);
        setIsConnected(true);
        const bal = await walletService.getWalletBalance(activeAcc);
        setBalance(bal);
      } else {
        setAccount(null);
        setIsConnected(false);
        setBalance('0.0');
      }
    } catch (err) {
      console.error('Failed to refresh wallet state:', err);
    }
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      await walletService.connectWallet();
      await refreshWalletState();
    } catch (err) {
      setWalletError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setBalance('0.0');
    setWalletError(null);
    localStorage.removeItem('remember_wallet_connection');
  };

  const switchNetwork = async () => {
    setWalletError(null);
    try {
      await walletService.switchToPolygonAmoy();
      await refreshWalletState();
    } catch (err) {
      setWalletError(err.message);
      throw err;
    }
  };

  const clearWalletError = () => setWalletError(null);

  // Setup injected event listeners
  useEffect(() => {
    const isAvail = walletService.isMetaMaskAvailable();
    setIsMetaMaskAvailable(isAvail);
    if (!isAvail) return;

    // Passive restore if connection is remembered or accounts already authorized
    walletService.getConnectedAccounts().then((accounts) => {
      if (accounts.length > 0) {
        refreshWalletState();
      }
    });

    const provider = walletService.getInjectedProvider();

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        const activeAcc = accounts[0];
        setAccount(activeAcc);
        setIsConnected(true);
        const bal = await walletService.getWalletBalance(activeAcc);
        setBalance(bal);
      }
    };

    const handleChainChanged = (_chainIdHex) => {
      const newChainId = parseInt(_chainIdHex, 16);
      setChainId(newChainId);
      setIsCorrectNetwork(newChainId === blockchainConfig.chainId);
      // Refresh balance
      if (account) {
        walletService.getWalletBalance(account).then(setBalance);
      }
    };

    const handleDisconnect = () => {
      disconnect();
    };

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    provider.on('disconnect', handleDisconnect);

    return () => {
      if (provider.removeListener) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
        provider.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [account, refreshWalletState]);

  return (
    <WalletContext.Provider
      value={{
        isMetaMaskAvailable,
        isConnecting,
        isConnected,
        account,
        chainId,
        isCorrectNetwork,
        balance,
        walletError,
        connect,
        disconnect,
        refreshWalletState,
        switchNetwork,
        clearWalletError
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
