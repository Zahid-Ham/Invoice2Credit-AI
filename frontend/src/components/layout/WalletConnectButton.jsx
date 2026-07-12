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
        className="flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-semibold bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700/50 hover:border-indigo-500/40 dark:hover:border-indigo-400/40 hover:shadow-[0_4px_20px_rgba(99,102,241,0.08)] dark:hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)] text-slate-800 dark:text-slate-200 transition-all duration-300 active:scale-98"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-mono text-[11px] tracking-tight">{shortAddr}</span>
        <span className="text-slate-300 dark:text-slate-700/60 font-normal">|</span>
        <span className="font-bold text-slate-900 dark:text-slate-100">{parseFloat(balance).toFixed(3)} POL</span>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2.5 w-64 bg-white/95 dark:bg-slate-950/95 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-3.5 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Connected Wallet</span>
            <div className="flex flex-col gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/40">
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all leading-relaxed select-all">{account}</span>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-850/60 w-full" />

          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all text-left"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
              <span>Copy Address</span>
            </button>

            <button
              onClick={() => {
                disconnect();
                setDropdownOpen(false);
                toast.success('Wallet disconnected');
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
