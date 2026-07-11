/**
 * useEscrow.js
 * -----------
 * React hook for interacting with InvoiceEscrow smart contracts from the browser
 * via MetaMask (window.ethereum / ethers.js BrowserProvider).
 *
 * Usage:
 *   const { fundInvoice, txStatus } = useEscrow();
 *   await fundInvoice(escrowAddress, amountInWei);
 *
 * txStatus transitions: idle → awaiting_wallet → pending → confirmed | failed
 */
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

// Minimal ABI — only what the Investor UI needs
const INVOICE_ESCROW_ABI = [
  {
    "inputs": [],
    "name": "fundInvoice",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "invoiceAmount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getState",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "investor",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "investor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount",   "type": "uint256" }
    ],
    "name": "Funded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "releasePayment",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

const INVOICE_REGISTRY_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "msme", "type": "address" }],
    "name": "getReputationScore",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Polygon Amoy testnet chain ID
const AMOY_CHAIN_ID = 80002;

export function useEscrow() {
  const [txStatus, setTxStatus] = useState('idle');       // idle | awaiting_wallet | pending | confirmed | failed
  const [txHash,   setTxHash]   = useState(null);
  const [txError,  setTxError]  = useState(null);

  /**
   * Fund an InvoiceEscrow contract directly from the investor's MetaMask wallet.
   * @param {string} escrowAddress - The deployed InvoiceEscrow contract address
   * @param {string|bigint} amountWei - Amount in wei (must match invoiceAmount exactly)
   * @returns {{ txHash, receipt }} on success; throws on failure
   */
  const fundInvoice = useCallback(async (escrowAddress, amountWei) => {
    setTxStatus('idle');
    setTxHash(null);
    setTxError(null);

    if (!window.ethereum) {
      const err = 'MetaMask is not installed. Please install it to fund invoices.';
      setTxError(err);
      setTxStatus('failed');
      throw new Error(err);
    }

    try {
      // ── 1. Request wallet connection ────────────────────────────────────
      setTxStatus('awaiting_wallet');
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      // ── 2. Check correct network ────────────────────────────────────────
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== AMOY_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${AMOY_CHAIN_ID.toString(16)}` }]
          });
        } catch (switchErr) {
          // Chain not added — prompt user to add Amoy
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${AMOY_CHAIN_ID.toString(16)}`,
                chainName: 'Polygon Amoy Testnet',
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                rpcUrls: ['https://rpc-amoy.polygon.technology'],
                blockExplorerUrls: ['https://amoy.polygonscan.com']
              }]
            });
          } else {
            throw switchErr;
          }
        }
      }

      // ── 3. Build contract and send tx ───────────────────────────────────
      const escrow = new ethers.Contract(escrowAddress, INVOICE_ESCROW_ABI, signer);
      const tx = await escrow.fundInvoice({ value: BigInt(amountWei) });

      setTxHash(tx.hash);
      setTxStatus('pending');

      // ── 4. Wait for on-chain confirmation ───────────────────────────────
      const receipt = await tx.wait(1); // 1 confirmation
      setTxStatus('confirmed');
      return { txHash: tx.hash, receipt };

    } catch (err) {
      const message = err?.reason || err?.message || 'Transaction failed.';
      setTxError(message);
      setTxStatus('failed');
      throw err;
    }
  }, []);

  /**
   * Buyer releases payment to the investor via MetaMask.
   * @param {string} escrowAddress - The deployed InvoiceEscrow contract address
   * @param {string|bigint} amountWei - Amount in wei (must match invoiceAmount exactly)
   * @returns {{ txHash, receipt }} on success; throws on failure
   */
  const releasePayment = useCallback(async (escrowAddress, amountWei) => {
    setTxStatus('idle');
    setTxHash(null);
    setTxError(null);

    if (!window.ethereum) {
      const err = 'MetaMask is not installed. Please install it to release payments.';
      setTxError(err);
      setTxStatus('failed');
      throw new Error(err);
    }

    try {
      setTxStatus('awaiting_wallet');
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== AMOY_CHAIN_ID) {
        throw new Error('Please switch MetaMask to Polygon Amoy Testnet.');
      }

      const escrow = new ethers.Contract(escrowAddress, INVOICE_ESCROW_ABI, signer);
      const tx = await escrow.releasePayment({ value: BigInt(amountWei) });

      setTxHash(tx.hash);
      setTxStatus('pending');

      const receipt = await tx.wait(1);
      setTxStatus('confirmed');
      return { txHash: tx.hash, receipt };

    } catch (err) {
      const message = err?.reason || err?.message || 'Transaction failed.';
      setTxError(message);
      setTxStatus('failed');
      throw err;
    }
  }, []);

  /**
   * Read current escrow state from chain (no wallet needed).
   * Returns: 0=OPEN, 1=FUNDED, 2=REPAID, 3=DEFAULTED
   */
  const readEscrowState = useCallback(async (escrowAddress) => {
    if (!escrowAddress || !window.ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const escrow = new ethers.Contract(escrowAddress, INVOICE_ESCROW_ABI, provider);
      return Number(await escrow.getState());
    } catch {
      return null;
    }
  }, []);

  /**
   * Read MSME reputation score from registry
   */
  const getReputationScore = useCallback(async (registryAddress, msmeAddress) => {
    if (!registryAddress || !msmeAddress || registryAddress === '0x...' || !window.ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const registry = new ethers.Contract(registryAddress, INVOICE_REGISTRY_ABI, provider);
      return Number(await registry.getReputationScore(msmeAddress));
    } catch {
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setTxStatus('idle');
    setTxHash(null);
    setTxError(null);
  }, []);

  return { fundInvoice, releasePayment, readEscrowState, getReputationScore, txStatus, txHash, txError, reset };
}

