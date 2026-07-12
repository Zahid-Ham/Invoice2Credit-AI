import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { blockchainConfig } from '@/blockchain/config';

export default function BlockchainProofBadge({ txHash, label = 'Verified on Polygon' }) {
  if (!txHash) return null;

  const shortHash = `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}`;
  const explorerUrl = blockchainConfig.explorerUrl 
    ? `${blockchainConfig.explorerUrl}/tx/${txHash}` 
    : null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
      <span>{label}</span>
      <span className="text-emerald-300 dark:text-emerald-800">|</span>
      <span className="font-mono">{shortHash}</span>
      {explorerUrl && (
        <a 
          href={explorerUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-emerald-700 dark:hover:text-emerald-200 transition"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
