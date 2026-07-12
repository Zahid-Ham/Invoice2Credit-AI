import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, LogOut, Copy, Check, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WalletConnectButton() {
  const {
    isMetaMaskAvailable,
    isConnecting,
    isConnected,
    account,
    isCorrectNetwork,
    balance,
    connect,
    disconnect,
    switchNetwork
  } = useWallet();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    toast.success('Address copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isMetaMaskAvailable) {
    return (
      <a
        href="https://metamask.io"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-all"
      >
        <Wallet className="h-4 w-4 text-gray-400" />
        Install MetaMask
      </a>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-600/10 hover:shadow-primary-600/20 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 active:scale-95 transition-all"
      >
        <ShieldAlert className="h-4 w-4 text-amber-500" />
        Switch Network
      </button>
    );
  }

  const shortAddr = account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : '';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20 text-gray-700 dark:text-gray-200 transition-all"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-mono text-[11px]">{shortAddr}</span>
        <span className="text-gray-300 dark:text-white/10 font-normal">|</span>
        <span className="text-gray-600 dark:text-gray-400">{parseFloat(balance).toFixed(3)} POL</span>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-bg/95 border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-black/45 p-3 flex flex-col gap-2 z-50 backdrop-blur-md">
          <div className="px-2 py-1 flex flex-col">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Account</span>
            <span className="font-mono text-xs text-gray-800 dark:text-gray-100 mt-0.5 break-all leading-normal">{account}</span>
          </div>

          <div className="h-px bg-gray-100 dark:bg-white/10 w-full" />

          <button
            onClick={handleCopy}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left"
          >
            <span className="flex items-center gap-2">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              Copy Address
            </span>
          </button>

          <button
            onClick={() => {
              disconnect();
              setDropdownOpen(false);
              toast.success('Wallet disconnected');
            }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all text-left"
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Disconnect
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
