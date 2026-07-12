import React from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { blockchainConfig } from '@/blockchain/config';

export default function TransactionProgress({ txState, onClose }) {
  const { status, transactionHash, error } = txState;
  
  if (status === 'IDLE') return null;

  const getStatusText = () => {
    switch (status) {
      case 'PREPARING': return 'Preparing transaction payload...';
      case 'AWAITING_SIGNATURE': return 'Awaiting approval in MetaMask...';
      case 'SUBMITTED': return 'Transaction submitted to network...';
      case 'CONFIRMING': return 'Confirming transaction on Polygon...';
      case 'CONFIRMED': return 'Transaction confirmed successfully!';
      case 'FAILED': return 'Transaction failed';
      default: return 'Processing...';
    }
  };

  const isPending = ['PREPARING', 'AWAITING_SIGNATURE', 'SUBMITTED', 'CONFIRMING'].includes(status);
  const isSuccess = status === 'CONFIRMED';
  const isFailed = status === 'FAILED';

  const explorerUrl = transactionHash && blockchainConfig.explorerUrl
    ? `${blockchainConfig.explorerUrl}/tx/${transactionHash}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          {isPending && (
            <RefreshCw className="h-10 w-10 text-primary-500 animate-spin" />
          )}
          {isSuccess && (
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          )}
          {isFailed && (
            <XCircle className="h-10 w-10 text-red-500" />
          )}

          <h4 className="font-display font-bold text-sm text-gray-900 dark:text-white">
            {getStatusText()}
          </h4>

          {transactionHash && (
            <div className="text-xs font-mono bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-xl space-y-1 w-full text-left">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Tx Hash</span>
              <span className="text-gray-800 dark:text-gray-200 break-all">{transactionHash}</span>
              {explorerUrl && (
                <a 
                  href={explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:underline block text-[10px] mt-1"
                >
                  View on Block Explorer
                </a>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-left w-full leading-normal break-words">
              {error}
            </p>
          )}
        </div>

        {!isPending && (
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white transition"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
