import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { blockchainService } from '@/services/blockchainService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Landmark, Key, Banknote, HelpCircle, 
  Cpu, Activity, CheckCircle2, ArrowRight, Layers, 
  Hexagon, Server, Search, FileDown, AlertTriangle, 
  Lock, RefreshCw, Zap, TrendingUp, Info, UserCheck
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

// Reusable CountUp hook
function useCountUp(target, duration = 1200) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

const TIMELINE_STAGES = [
  { id: 1, title: 'Invoice Uploaded', time: 'Jul 09, 10:00 AM', desc: 'Raw PDF receipt parsed and stored locally.', hash: '0x9fa8...b21c', status: 'Completed' },
  { id: 2, title: 'AI Invoice Analysis', time: 'Jul 09, 10:01 AM', desc: 'Confidence score (98.6%) parsed successfully.', hash: 'AI-OCR-849', status: 'Completed' },
  { id: 3, title: 'GST Verification', time: 'Jul 09, 10:02 AM', desc: 'Tax data verified against government database.', hash: 'GST-MATCH-12', status: 'Completed' },
  { id: 4, title: 'Invoice Hash Generated', time: 'Jul 09, 10:03 AM', desc: 'SHA-256 unique ID created for double-financing verification.', hash: '0x32cf...99ee', status: 'Completed' },
  { id: 5, title: 'Duplicate Registry Checked', time: 'Jul 09, 10:03 AM', desc: 'Audit verified unique invoice entry across Polygon ledger.', hash: '0x4ea8...cc21', status: 'Completed' },
  { id: 6, title: 'NFT Minted', time: 'Jul 09, 10:05 AM', desc: 'ERC-721 token representing debt created on Polygon.', hash: '0x8f4c...88ab', status: 'Completed' },
  { id: 7, title: 'Marketplace Listing Created', time: 'Jul 09, 10:06 AM', desc: 'Invoice token asset offered for auction bidding.', hash: '0x9d4e...77ef', status: 'Completed' },
  { id: 8, title: 'Investor Won Auction', time: 'Jul 09, 12:30 PM', desc: 'Bidding closed. AltFin Capital confirmed as high bidder.', hash: '0x7c9a...11dd', status: 'Completed' },
  { id: 9, title: 'Smart Contract Escrow Created', time: 'Jul 09, 12:31 PM', desc: 'Funds locked in Solidity secure escrow vault.', hash: '0x2b4c...33dd', status: 'Completed' },
  { id: 10, title: 'Funds Released to MSME', time: 'Jul 09, 12:35 PM', desc: 'Capital payout released directly to supplier bank wallet.', hash: '0x6a2c...44ee', status: 'Completed' },
  { id: 11, title: 'Buyer Repayment Received', time: 'Pending', desc: 'Corporate settlement scheduled at invoice maturity.', hash: '---', status: 'Scheduled' },
  { id: 12, title: 'Smart Contract Executed', time: 'Pending', desc: 'Escrow auto-settles following payment clearance.', hash: '---', status: 'Scheduled' },
  { id: 13, title: 'Investor Settlement Completed', time: 'Pending', desc: 'Principal and yield returns unlocked for investor.', hash: '---', status: 'Scheduled' }
];

const TRANSACTIONS = [
  { hash: '0x8f4c2e50cf60b948c3f91ad4ee23b218f4c2e88ab', block: '18492021', from: '0x32bF...94dE', to: '0x77fA...b31C', gas: '0.0024 MATIC', time: '5m ago', status: 'Success' },
  { hash: '0x9fa8d39ee22bf22b8f4c2e88ab2563eb6a2c9f44ee', block: '18492018', from: '0x2b4c...33dd', to: '0x6a2c...44ee', gas: '0.0035 MATIC', time: '15m ago', status: 'Success' },
  { hash: '0x32cf99ee2a88ab27c9a11dd5b3f1c11dd2563eb9a', block: '18492012', from: '0x8f4c...88ab', to: '0x9d4e...77ef', gas: '0.0018 MATIC', time: '45m ago', status: 'Success' }
];

const AUDIT_TRAIL = [
  { event: 'Invoice Metadata Hashed', actor: 'AI OCR Parser', time: 'Jul 09, 10:03 AM', hash: '0x32cf...99ee', sig: 'secp256k1(0x2f...)' },
  { event: 'Registry Duplicate Audit', actor: 'Registry Contract', time: 'Jul 09, 10:03 AM', hash: '0x4ea8...cc21', sig: 'secp256k1(0x4a...)' },
  { event: 'NFT Token Asset Created', actor: 'Invoice Token Contract', time: 'Jul 09, 10:05 AM', hash: '0x8f4c...88ab', sig: 'secp256k1(0x8c...)' }
];

const ANALYTICS_DATA = [
  { name: '07/03', txns: 120, gas: 32 },
  { name: '07/04', txns: 150, gas: 28 },
  { name: '07/05', txns: 130, gas: 35 },
  { name: '07/06', txns: 180, gas: 38 },
  { name: '07/07', txns: 210, gas: 42 },
  { name: '07/08', txns: 195, gas: 39 },
  { name: '07/09', txns: 240, gas: 35 }
];

const isDev = import.meta.env.DEV;

function BlockchainDevPanel() {
  const {
    isMetaMaskAvailable,
    isConnecting,
    isConnected,
    account,
    chainId,
    isCorrectNetwork,
    balance,
    connect,
    switchNetwork
  } = useWallet();

  const [backendHealth, setBackendHealth] = useState('Checking...');
  
  useEffect(() => {
    blockchainService.getHealth()
      .then(res => setBackendHealth(res.status || 'Healthy'))
      .catch(err => setBackendHealth(`Unreachable: ${err.message}`));
  }, [isConnected]);

  if (!isDev) return null;

  return (
    <div className="mb-8 p-6 rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">
          Developer Blockchain Integration Panel
        </h3>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
          Dev Only
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 space-y-1">
          <span className="text-gray-400">MetaMask Detected</span>
          <p className="font-bold">{isMetaMaskAvailable ? '✅ YES' : '❌ NO'}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 space-y-1">
          <span className="text-gray-400">Wallet Connected</span>
          <p className="font-bold">{isConnected ? '✅ YES' : '❌ NO'}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 space-y-1">
          <span className="text-gray-400">Correct Network</span>
          <p className="font-bold">{isCorrectNetwork ? '✅ YES' : '❌ NO (Amoy 80002)'}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 space-y-1">
          <span className="text-gray-400">Backend Health</span>
          <p className="font-bold">{backendHealth}</p>
        </div>
      </div>

      {isConnected && (
        <div className="text-xs font-mono bg-gray-50 dark:bg-white/5 p-3 rounded-xl space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Connected Account:</span>
            <span className="text-gray-800 dark:text-gray-200">{account}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Chain ID:</span>
            <span className="text-gray-800 dark:text-gray-200">{chainId || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">POL Balance:</span>
            <span className="text-gray-800 dark:text-gray-200">{balance} POL</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!isConnected && (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
        {isConnected && !isCorrectNetwork && (
          <button
            onClick={switchNetwork}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition"
          >
            Switch to Polygon Amoy
          </button>
        )}
      </div>
    </div>
  );
}

export default function Blockchain() {
  const [activeStage, setActiveStage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nodeActive, setNodeActive] = useState(null);

  const blockCount = useCountUp(18492021);

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copied hash to clipboard.");
  };

  return (
    <ContentContainer>
      <BlockchainDevPanel />
      {/* Page Header with live Polygon Network values */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-gray-100 dark:border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight text-gray-900 dark:text-white">
            Blockchain Explorer
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track every blockchain event from invoice upload to final settlement.
          </p>
        </div>

        {/* Live status indicators */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-success-100 dark:border-success-950 bg-success-50 dark:bg-success-950/20 text-success-600 dark:text-success-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-success-500 animate-ping" />
            <span>Polygon Mainnet Status: Live</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full border border-gray-150 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 font-semibold">
            Gas Fee: <span className="text-primary-500">35 Gwei</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full border border-gray-150 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-gray-400 font-semibold">
            Block: <span className="text-indigo-500">#{blockCount}</span>
          </div>
        </div>
      </div>

      {/* Main Timeline, NFT, and Escrow Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Journey Timeline & Wallet Flow */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* SECTION 1: Invoice Journey Timeline */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary-500" />
              <h3 className="font-display font-bold text-sm">Invoice Journey Timeline</h3>
            </div>

            <div className="space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gray-100 dark:before:bg-slate-800">
              {TIMELINE_STAGES.map((stage) => {
                const completed = stage.status === 'Completed';
                const active = activeStage === stage.id;

                return (
                  <div key={stage.id} className="relative group cursor-pointer" onClick={() => setActiveStage(active ? null : stage.id)}>
                    {/* Circle Indicator */}
                    <div className={`absolute -left-[23px] h-3.5 w-3.5 rounded-full border-2 bg-white dark:bg-dark-card flex items-center justify-center ${
                      completed 
                        ? 'border-success-500 text-success-500' 
                        : 'border-gray-200 dark:border-slate-800'
                    }`}>
                      {completed && <div className="h-1.5 w-1.5 rounded-full bg-success-500" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-bold ${completed ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
                          {stage.title}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold">{stage.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-normal">{stage.desc}</p>
                    </div>

                    {/* Expanding Metadata */}
                    <AnimatePresence>
                      {active && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 text-[10px] font-mono space-y-2 select-none overflow-hidden"
                        >
                          <div className="flex justify-between">
                            <span className="text-gray-400">Transaction Hash:</span>
                            <span className="text-primary-500 font-bold hover:underline cursor-pointer" onClick={() => handleCopy(stage.hash)}>
                              {stage.hash}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Verification Status:</span>
                            <span className="text-success-500 font-bold">Audit Verified ✓</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 5: Wallet Flow Visual */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold">Solidity Escrow Capital Flow</h3>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 relative">
              {[
                { label: 'Investor Wallet', text: 'Principal Lock' },
                { label: 'Escrow Vault', text: 'Escrow Lock' },
                { label: 'MSME Wallet', text: 'Payout Cash' },
                { label: 'Buyer Repay', text: 'Settlement' }
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/10 w-full sm:w-28 relative">
                  <div className="h-10 w-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 mb-2">
                    <Hexagon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold">{step.label}</span>
                  <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 7: Immutable Audit Trail Table */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Immutable Ledger Audit Trail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 pb-3 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5">Event</th>
                    <th>Actor</th>
                    <th>Timestamp</th>
                    <th>Tx Hash</th>
                    <th>Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800/80">
                  {AUDIT_TRAIL.map((item, idx) => (
                    <tr key={idx} className="text-gray-700 dark:text-gray-300">
                      <td className="py-3 font-semibold">{item.event}</td>
                      <td>{item.actor}</td>
                      <td>{item.time}</td>
                      <td className="text-primary-500 font-mono font-bold hover:underline cursor-pointer" onClick={() => handleCopy(item.hash)}>
                        {item.hash}
                      </td>
                      <td className="font-mono text-[10px] text-gray-400">{item.sig}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Sidebar: NFT Token Certificate, Escrow visualization, Live txns */}
        <div className="space-y-8">
          
          {/* SECTION 3: NFT Certificate Card */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-6 relative overflow-hidden group">
            {/* Holographic Sheen Layer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

            <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">NFT Invoice Certificate</h3>
            
            <div className="relative mx-auto h-40 w-40 rounded-2xl bg-gradient-to-br from-primary-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/20 mb-6">
              <Hexagon className="h-16 w-16 animate-pulse" />
              <div className="absolute bottom-3 text-[9px] font-mono tracking-widest text-primary-200">#ERC721-0089</div>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { label: 'Asset Token ID', value: 'ERC721-INV-0089' },
                { label: 'Blockchain Network', value: 'Polygon Amoy' },
                { label: 'Contract Standard', value: 'ERC-721 Immutable' },
                { label: 'Token Owner', value: '0x32bF...94dE' },
                { label: 'Verification Hash', value: '0x8f4c...88ab', click: true }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-400 dark:text-gray-500">{item.label}</span>
                  <span 
                    className={`font-bold ${item.click ? 'text-primary-500 cursor-pointer font-mono hover:underline' : 'text-gray-800 dark:text-white'}`}
                    onClick={item.click ? () => handleCopy(item.value) : undefined}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: Escrow Contract Visual */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Solidity Escrow Status</h3>
            <div className="p-4 rounded-xl border border-primary-100 dark:border-primary-950 bg-primary-50/20 dark:bg-primary-950/20 space-y-3.5 text-xs">
              {[
                { label: 'Contract Address', value: '0x2b4c...33dd', click: true },
                { label: 'Escrow Amount Locked', value: '₹9,45,000' },
                { label: 'Contract Status', value: 'Funds Locked / Settlement Pending' },
                { label: 'Settlement Clearance', value: 'Scheduled on Maturity' }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{item.label}</span>
                  <span 
                    className={`font-bold ${item.click ? 'font-mono text-primary-500 cursor-pointer hover:underline' : 'text-primary-800 dark:text-white'}`}
                    onClick={item.click ? () => handleCopy('0x2b4c8a24ee23b218f4c2e88ab2563eb6a2c9f44ee') : undefined}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: Live Blockchain Transactions */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Latest Live Transactions</h3>
            <div className="space-y-4">
              {TRANSACTIONS.map((tx) => (
                <div key={tx.hash} className="text-xs space-y-2 border-b border-gray-50 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary-500 font-mono cursor-pointer hover:underline" onClick={() => handleCopy(tx.hash)}>
                      {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                    </span>
                    <span className="text-[10px] font-bold text-success-500 bg-success-500/10 px-2 py-0.5 rounded">
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
                    <span>Block #{tx.block} • Gas: {tx.gas}</span>
                    <span>{tx.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 10: Recharts Gas & Volume Chart */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
            <h3 className="text-sm font-bold mb-4">Gas Fee Levels (Gwei)</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ANALYTICS_DATA}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="gas" stroke="#6366f1" fill="#6366f1" fillOpacity={0.05} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

    </ContentContainer>
  );
}
