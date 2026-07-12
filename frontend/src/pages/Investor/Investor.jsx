import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Landmark, TrendingUp, Sparkles, ShieldCheck, Cpu, 
  ArrowUpRight, Clock, Star, Landmark as Bank, 
  Coins, CheckCircle2, ChevronRight, Activity, Award
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { marketplaceService } from '@/services/marketplaceService';
import { investorService } from '@/services/investorService';
import { useBlockchainTransaction } from '@/hooks/useBlockchainTransaction';
import { blockchainService } from '@/services/blockchainService';
import TransactionProgress from '@/components/ui/TransactionProgress';
import BlockchainProofBadge from '@/components/ui/BlockchainProofBadge';

const PORTFOLIO_GROWTH = [
  { name: 'Feb', value: 1200000 },
  { name: 'Mar', value: 1850000 },
  { name: 'Apr', value: 2400000 },
  { name: 'May', value: 3450000 },
  { name: 'Jun', value: 4850000 }
];

const SECTOR_ALLOCATION = [
  { name: 'Manufacturing', value: 40, color: '#3b82f6' },
  { name: 'Logistics', value: 25, color: '#8b5cf6' },
  { name: 'IT Services', value: 20, color: '#10b981' },
  { name: 'Retail', value: 15, color: '#f59e0b' }
];

export default function Investor() {
  const { currentUser } = useAuth();
  const txState = useBlockchainTransaction();
  const [watchlist, setWatchlist] = useState([
    { id: 'INV-2026-088', buyer: 'Wipro Enterprises', amount: '₹6,40,000', yield: '8.7% APY', risk: 'A' }
  ]);
  const [investments, setInvestments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      const uid = currentUser.uid;
      Promise.all([
        marketplaceService.getMyInvestments(uid),
        investorService.getDashboard(uid),
        investorService.getPortfolio(uid),
        investorService.getPerformance(uid),
        investorService.getTransactions(uid)
      ]).then(([invs, dash, port, perf, txs]) => {
        if (invs) setInvestments(invs);
        if (dash) setDashboard(dash);
        if (port) setPortfolioData(port);
        if (perf) setPerformance(perf);
        if (txs) setTransactions(txs);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load investor workspace statistics:", err);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleFundEscrow = async (inv) => {
    try {
      toast.loading('Locating on-chain Escrow Deal...', { id: 'escrow' });
      const tokenId = await blockchainService.getTokenIdByHash(inv.invoiceHash || inv.tokenUrl || '0x...');
      if (!tokenId || tokenId === 0) {
        toast.dismiss('escrow');
        toast.error('Could not find corresponding on-chain Token ID.');
        return;
      }

      const nextDealId = await blockchainService.getNextDealId();
      let matchedDealId = 0;
      for (let i = 1; i < nextDealId; i++) {
        const deal = await blockchainService.getDealDetails(i);
        if (Number(deal.invoiceTokenId) === Number(tokenId)) {
          matchedDealId = i;
          break;
        }
      }
      toast.dismiss('escrow');

      if (matchedDealId === 0) {
        toast.error('No pending Escrow Deal found on-chain for this invoice.');
        return;
      }

      await txState.execute(
        blockchainService.prepareFundDeal,
        [matchedDealId]
      );
    } catch (err) {
      toast.dismiss('escrow');
      toast.error(err.message || 'Failed to fund escrow.');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <ContentContainer>
      
      {/* Page Header */}
      <PageHeader 
        title="Investor Portfolio" 
        description="Monitor active invoice investments, bidding history, and yield curves."
      />

      {/* Hero Stats Section */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Portfolio Value', value: formatCurrency(dashboard?.portfolioValue ?? 4850000), text: '+12.4% ROI Year-to-Date', color: 'from-blue-500 to-indigo-500' },
          { label: 'Expected Monthly Yield', value: formatCurrency(dashboard?.expectedReturns ?? 38400), text: `APY average: ${dashboard?.avgYield ?? 8.65}%`, color: 'from-violet-500 to-purple-500' },
          { label: 'Active Capital Funded', value: formatCurrency(dashboard?.totalInvested ?? 3450000), text: `Across ${dashboard?.activeCount ?? 8} verified bills`, color: 'from-emerald-500 to-teal-500' },
          { label: 'Today\'s Yield Gain', value: `+${formatCurrency(Math.round((dashboard?.expectedReturns ?? 38400) / 30))}`, text: 'Accrued smart interest', color: 'from-pink-500 to-rose-500' },
          { label: 'Wallet balance', value: formatCurrency(dashboard?.walletBalance ?? 1400000), text: 'Available to bid instantly', color: 'from-amber-500 to-orange-500' }
        ].map((kpi, idx) => (
          <div 
            key={idx} 
            className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm relative overflow-hidden"
          >
            <div className="relative z-10 space-y-1.5">
              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{kpi.label}</span>
              <div className="text-xl font-display font-extrabold text-gray-900 dark:text-white">{kpi.value}</div>
              <p className="text-[9px] text-gray-500 dark:text-gray-400">{kpi.text}</p>
            </div>
            <div className={`absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r ${kpi.color}`} />
          </div>
        ))}
      </div>

      {/* Double Column Grid: Portfolio Charts & Live auctions */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        
        {/* Left Columns: Growth area chart & allocation */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Portfolio growth */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Portfolio Value Growth</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance?.roiHistory ?? PORTFOLIO_GROWTH}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.06} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 3: Active Investments Grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Financed Invoices</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {(investments.length > 0 ? investments : [
                { id: 'INV-2026-084', buyerName: 'Tata Motors Group', amount: 1240000, yieldRate: 8.4, status: 'Active', due: 'Aug 12' },
                { id: 'INV-2026-086', buyerName: 'Infosys Tech Corp', amount: 1420000, yieldRate: 7.9, status: 'Active', due: 'Sep 05' }
              ]).map((inv) => (
                <div key={inv.id || inv.listingId} className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 dark:text-white">{inv.buyerName || 'Verified Buyer'}</h4>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{inv.id || inv.listingId}</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {inv.status || 'Active'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-gray-50 dark:border-slate-800/80">
                    <div>
                      <span className="text-gray-400 block">Invested amount</span>
                      <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(inv.amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Expected APY</span>
                      <span className="font-bold text-primary-500">{inv.yieldRate || inv.yield}%</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => handleFundEscrow(inv)}
                      className="flex-1 py-2 px-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold transition"
                    >
                      Fund Escrow
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          toast.loading('Locating on-chain Escrow Deal...', { id: 'escrow' });
                          const tokenId = await blockchainService.getTokenIdByHash(inv.invoiceHash || inv.tokenUrl || '0x...');
                          const nextDealId = await blockchainService.getNextDealId();
                          let matchedDealId = 0;
                          for (let i = 1; i < nextDealId; i++) {
                            const deal = await blockchainService.getDealDetails(i);
                            if (Number(deal.invoiceTokenId) === Number(tokenId)) {
                              matchedDealId = i;
                              break;
                            }
                          }
                          toast.dismiss('escrow');
                          if (matchedDealId === 0) return toast.error('Deal not found');
                          await txState.execute(blockchainService.prepareReleaseFunding, [matchedDealId]);
                        } catch(e) {
                          toast.dismiss('escrow');
                          toast.error(e.message);
                        }
                      }}
                      className="py-2 px-3 rounded-lg border border-gray-150 dark:border-slate-800 text-[10px] font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition"
                    >
                      Release to MSME
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar: Sector Allocation, Advisor, Watchlist */}
        <div className="space-y-8">
          
          {/* Section 2: Sector allocation */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Sector Allocation</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={portfolioData?.sectorAllocation ?? SECTOR_ALLOCATION}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(portfolioData?.sectorAllocation ?? SECTOR_ALLOCATION).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
              {(portfolioData?.sectorAllocation ?? SECTOR_ALLOCATION).map(item => (
                <div key={item.name} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: AI Advisor */}
          <div className="rounded-2xl border border-primary-100 dark:border-primary-950 bg-gradient-to-b from-primary-50/30 to-white dark:from-primary-950/20 dark:to-dark-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-display font-bold text-sm">AI Portfolio Advisor</h3>
            </div>
            <div className="space-y-3.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
              <div className="p-3.5 rounded-xl border border-gray-150/50 dark:border-slate-800 bg-white/50 dark:bg-dark-card/50">
                Diversify your capital by allocating to the **Logistics** sector. Retail holds 40% concentration today.
              </div>
              <div className="p-3.5 rounded-xl border border-gray-150/50 dark:border-slate-800 bg-white/50 dark:bg-dark-card/50">
                **Tata Motors** invoices offer the highest yield-to-risk index among active auctions.
              </div>
            </div>
          </div>

          {/* Section 9: Settlement Schedule */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary-500">
              <Clock className="h-5 w-5" />
              <h3 className="text-sm font-bold">Settlement Schedule</h3>
            </div>
            {dashboard?.settlementSchedule && dashboard.settlementSchedule.length > 0 ? (
              <div className="space-y-3.5">
                {dashboard.settlementSchedule.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-slate-800/80 pb-2 last:border-0 last:pb-0">
                    <div>
                      <span className="font-bold text-gray-800 dark:text-white block">{s.buyerName}</span>
                      <span className="text-[10px] text-gray-400">{s.dueDate}</span>
                    </div>
                    <span className="font-bold text-emerald-500">{formatCurrency(s.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 py-1">No upcoming settlements scheduled.</p>
            )}
          </div>

          {/* Section 10: Gamified investor badges */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary-500">
              <Award className="h-5 w-5" />
              <h3 className="text-sm font-bold">Investor Trust Metrics</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Investor Tier</span>
                <span className="font-bold text-indigo-500">Premium Yield Class</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Repayment Trust Score</span>
                <span className="font-bold text-emerald-500">99.8% Perfect</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Section 6: Transaction Ledger */}
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4 mb-8">
        <h3 className="text-sm font-bold">Transaction History Ledger</h3>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-900/10 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[10px] text-gray-500">{tx.id}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.type === 'Deposit' || tx.type === 'Repayment Payout' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-primary-500/10 text-primary-500'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold">{formatCurrency(tx.amount)}</td>
                    <td className="py-3.5 px-4 text-gray-400 text-[10px]">
                      {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Just now'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No transaction logs available.</p>
        )}
      </div>

      {/* Section 5: Watchlist */}
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4 mb-8">
        <h3 className="text-sm font-bold">My Investment Watchlist</h3>
        {watchlist.length > 0 ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {watchlist.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 flex justify-between items-center gap-3">
                <div>
                  <h4 className="font-bold text-xs text-gray-900 dark:text-white">{item.buyer}</h4>
                  <span className="text-[10px] text-gray-400 block mt-0.5">{item.amount} • {item.yield}</span>
                </div>
                <button 
                  onClick={() => toast.success('Auction bid sequence loaded')}
                  className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold transition"
                >
                  Bid Now
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Your watchlist is currently empty.</p>
        )}
      </div>
      <TransactionProgress txState={txState} onClose={txState.reset} />
    </ContentContainer>
  );
}
