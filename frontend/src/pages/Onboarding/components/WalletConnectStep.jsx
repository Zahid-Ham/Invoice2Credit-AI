import React from 'react';
import { Wallet, ShieldCheck, ArrowRight, Loader2, CheckCircle2, Mail, Chrome } from 'lucide-react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';

export default function WalletConnectStep({ onNext, profileData, setProfileData }) {
  const { login, isLoading, isConnected, walletAddress, hasClientId } = useWeb3Auth();

  const handleConnect = async () => {
    try {
      const addr = await login();
      if (addr) {
        setProfileData({ ...profileData, walletAddress: addr });
      }
    } catch (err) {
      console.error('[WalletConnectStep] Login failed:', err);
    }
  };

  // Sync walletAddress from context into profileData if already connected
  const displayAddress = profileData.walletAddress || walletAddress;
  const connected = isConnected || !!displayAddress;

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-violet-200 dark:border-violet-800">
          <Wallet className="h-8 w-8 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-3">
          Set Up Your Wallet
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
          {hasClientId
            ? 'Sign in with Google or Email — we create a secure blockchain wallet for you automatically. No crypto knowledge needed!'
            : 'Connect your MetaMask wallet to interact with smart contracts and receive on-chain settlements.'}
        </p>
      </div>

      <div className="space-y-4">
        {connected ? (
          /* ── Connected State ─────────────────────────────────────────── */
          <div className="p-6 rounded-2xl border border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 flex flex-col items-center text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Wallet Ready!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your wallet address:</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg break-all">
              {displayAddress}
            </p>
          </div>
        ) : hasClientId ? (
          /* ── Web3Auth Social Login Buttons ──────────────────────────── */
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-dark-card">
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-4 font-semibold uppercase tracking-wider">
              Choose your login method
            </p>
            <div className="space-y-3">
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white font-semibold text-sm flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Chrome className="h-5 w-5 text-blue-500" />
                )}
                Continue with Google
              </button>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white font-semibold text-sm flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
              >
                <Mail className="h-5 w-5 text-violet-500" />
                Continue with Email OTP
              </button>
            </div>
            <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-4">
              A secure Polygon wallet is generated automatically — no seed phrases required.
            </p>
          </div>
        ) : (
          /* ── MetaMask Fallback (no Web3Auth Client ID) ───────────────── */
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-dark-card flex flex-col items-center text-center">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
              alt="MetaMask"
              className="h-14 w-14 mx-auto mb-4 drop-shadow-md"
            />
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100 transition shadow-lg disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Connect MetaMask'}
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 text-xs text-violet-800 dark:text-violet-300">
          <ShieldCheck className="h-6 w-6 flex-shrink-0 text-violet-600 dark:text-violet-400" />
          <p>Your wallet is used only for on-chain settlements on Polygon Amoy. We never store your private key.</p>
        </div>
      </div>

      <div className="mt-10 flex justify-between">
        <button
          onClick={onNext}
          className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-sm font-semibold transition px-4 py-2"
        >
          Skip for now
        </button>
        <button
          onClick={onNext}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg ${
            connected
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-gray-600'
          }`}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
