import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { blockchainConfig } from '../blockchain/config';
import { walletService } from '../blockchain/walletService';
import { blockchainService } from '../services/blockchainService';
import { WalletAccountMismatchError } from '../blockchain/errors';

export function useBlockchainTransaction() {
  const { account } = useWallet();
  const [status, setStatus] = useState('IDLE'); // IDLE, PREPARING, AWAITING_SIGNATURE, SUBMITTED, CONFIRMING, CONFIRMED, FAILED
  const [transactionHash, setTransactionHash] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  const reset = () => {
    setStatus('IDLE');
    setTransactionHash(null);
    setEvents([]);
    setError(null);
  };

  const execute = useCallback(async (prepareFn, prepareParams) => {
    if (status === 'PREPARING' || status === 'AWAITING_SIGNATURE' || status === 'CONFIRMING') {
      console.warn('Transaction execution already in progress.');
      return;
    }
    
    setStatus('PREPARING');
    setError(null);
    setTransactionHash(null);
    setEvents([]);

    try {
      if (!walletService.isMetaMaskAvailable()) {
        throw new Error('MetaMask is not available. Please install MetaMask extension.');
      }
      if (!account) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      await walletService.ensureCorrectNetwork();

      // Fetch active account again before submitting to prevent change mismatch
      const activeAccount = await walletService.getActiveAccount();
      if (activeAccount.toLowerCase() !== account.toLowerCase()) {
        throw new WalletAccountMismatchError();
      }

      // 1. Call preparation service function
      const res = await prepareFn(...prepareParams, activeAccount);
      
      // 2. Validate payload
      const tx = res.transaction;
      if (!tx || !tx.to || !tx.data) {
        throw new Error('Invalid transaction payload returned from the backend preparation endpoint.');
      }

      if (tx.from.toLowerCase() !== activeAccount.toLowerCase()) {
        throw new WalletAccountMismatchError();
      }

      if (res.chainId !== blockchainConfig.chainId) {
        throw new Error(`Chain ID mismatch. Expected ${blockchainConfig.chainId}, got ${res.chainId}`);
      }

      // 3. Request signature from MetaMask
      setStatus('AWAITING_SIGNATURE');
      const hash = await walletService.submitTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        gas: tx.gas
      });

      setTransactionHash(hash);
      setStatus('SUBMITTED');
      
      // Save pending state to localStorage for reload resilience
      const pendingTx = {
        transactionHash: hash,
        contract: res.contract,
        action: res.action,
        chainId: res.chainId,
        submittedAt: Date.now()
      };
      localStorage.setItem(`pending_tx_${hash}`, JSON.stringify(pendingTx));

      setStatus('CONFIRMING');

      const pollInterval = 3000;
      const timeout = 120000; // 2 minutes
      const start = Date.now();

      while (true) {
        if (Date.now() - start > timeout) {
          setStatus('FAILED');
          setError('Transaction confirmation is taking longer than expected. You can continue tracking using the transaction hash.');
          break;
        }

        await new Promise((r) => setTimeout(r, pollInterval));

        try {
          const statusRes = await blockchainService.getTransactionStatus(hash);
          if (statusRes.status === 'CONFIRMED') {
            try {
              const decodeRes = await blockchainService.decodeTransactionEvents(hash);
              setEvents(decodeRes.events || []);
            } catch (decErr) {
              console.warn('Failed to decode events:', decErr);
            }
            try {
              await blockchainService.syncTransaction(hash);
            } catch (syncErr) {
              console.error('Application synchronization failed:', syncErr);
              localStorage.setItem(`failed_sync_${hash}`, JSON.stringify({
                hash,
                timestamp: Date.now(),
                attempts: 1
              }));
            }
            setStatus('CONFIRMED');
            localStorage.removeItem(`pending_tx_${hash}`);
            break;
          } else if (statusRes.status === 'REVERTED') {
            setStatus('FAILED');
            setError('Transaction execution reverted on-chain.');
            localStorage.removeItem(`pending_tx_${hash}`);
            break;
          }
        } catch (pollErr) {
          console.warn('Error polling transaction status:', pollErr);
        }
      }
    } catch (err) {
      setStatus('FAILED');
      setError(err.message || 'Transaction preparation/execution failed.');
    }
  }, [account, status]);

  // Restore pending tx on mount/load
  useEffect(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pending_tx_')) {
        try {
          const tx = JSON.parse(localStorage.getItem(key));
          if (Date.now() - tx.submittedAt < 600000) { // 10 minutes max window
            setTransactionHash(tx.transactionHash);
            setStatus('CONFIRMING');

            (async () => {
              const hash = tx.transactionHash;
              const pollInterval = 3000;
              const timeout = 120000;
              const start = Date.now();
              while (true) {
                if (Date.now() - start > timeout) {
                  setStatus('FAILED');
                  setError('Confirmation timed out.');
                  break;
                }
                await new Promise((r) => setTimeout(r, pollInterval));
                try {
                  const statusRes = await blockchainService.getTransactionStatus(hash);
                  if (statusRes.status === 'CONFIRMED') {
                    try {
                      const decodeRes = await blockchainService.decodeTransactionEvents(hash);
                      setEvents(decodeRes.events || []);
                    } catch (e) {
                      // ignore
                    }
                    try {
                      await blockchainService.syncTransaction(hash);
                    } catch (syncErr) {
                      console.error('Application synchronization failed on restore:', syncErr);
                      localStorage.setItem(`failed_sync_${hash}`, JSON.stringify({
                        hash,
                        timestamp: Date.now(),
                        attempts: 1
                      }));
                    }
                    setStatus('CONFIRMED');
                    localStorage.removeItem(key);
                    break;
                  } else if (statusRes.status === 'REVERTED') {
                    setStatus('FAILED');
                    setError('Transaction execution reverted on-chain.');
                    localStorage.removeItem(key);
                    break;
                  }
                } catch (e) {
                  // ignore
                }
              }
            })();
          } else {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  // Retry failed syncs on mount/periodically
  useEffect(() => {
    const retrySyncs = async () => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('failed_sync_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item.attempts < 5) {
              await blockchainService.syncTransaction(item.hash);
              localStorage.removeItem(key);
              console.log(`Successfully retried sync for tx: ${item.hash}`);
            } else {
              localStorage.removeItem(key);
            }
          } catch (e) {
            try {
              const item = JSON.parse(localStorage.getItem(key));
              item.attempts += 1;
              localStorage.setItem(key, JSON.stringify(item));
            } catch (err) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    };
    retrySyncs();
  }, []);

  return {
    status,
    isPreparing: status === 'PREPARING',
    isAwaitingSignature: status === 'AWAITING_SIGNATURE',
    isSubmitted: status === 'SUBMITTED',
    isConfirming: status === 'CONFIRMING',
    isConfirmed: status === 'CONFIRMED',
    isFailed: status === 'FAILED',
    transactionHash,
    events,
    error,
    execute,
    reset
  };
}
