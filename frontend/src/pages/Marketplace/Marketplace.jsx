import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hexagon, ShieldCheck, Landmark, Key, Banknote, 
  HelpCircle, Cpu, Search, Sparkles, Filter, CheckCircle2, 
  ArrowRight, X, Clock, HelpCircle as HelpIcon, PieChart as ChartIcon, Plus, ArrowUpRight
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

import { marketplaceService } from '@/services/marketplaceService';
import { useEffect } from 'react';

import { PORTFOLIO_STATS } from './marketplaceData';


export default function Marketplace() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  
  // Drawer & Bid State
  const [drawerInvoice, setDrawerInvoice] = useState(null);
  const [bidInvoice, setBidInvoice] = useState(null);
  const [bidSuccess, setBidSuccess] = useState(false);

  // Form State
  const [bidAmount, setBidAmount] = useState('');
  const [expectedYield, setExpectedYield] = useState('');

  useEffect(() => {
    const unsub = marketplaceService.subscribeListings((data) => {
      setInvoices(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Filter logic
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.buyer.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
    const matchesIndustry = selectedIndustry === 'All' || inv.industry === selectedIndustry;
    const matchesGrade = selectedGrade === 'All' || inv.grade === selectedGrade;
    return matchesSearch && matchesIndustry && matchesGrade;
  });

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!bidAmount || !expectedYield) {
      return toast.error("Please fill in the bid amount and yield APY.");
    }
    if (Number(bidAmount) > PORTFOLIO_STATS.balance) {
      return toast.error("Insufficient investor wallet balance.");
    }

    try {
      const newBid = {
        investor: 'Capital Trust (You)',
        bid: Number(bidAmount),
        yield: Number(expectedYield),
        date: 'Just now'
      };
      await marketplaceService.placeBid(bidInvoice.docId || bidInvoice.id, newBid);
      setBidSuccess(true);
    } catch (err) {
      toast.error("Failed to place bid.");
    }
  };

  const handleCloseBidFlow = () => {
    setBidSuccess(false);
    setBidInvoice(null);
    setBidAmount('');
    setExpectedYield('');
    setDrawerInvoice(null);
  };

  // Portfolio Allocation Data
  const ALLOCATION_DATA = [
    { name: 'Tata Motors', value: 930000, color: '#2563eb' },
    { name: 'Reliance Retail', value: 340000, color: '#10b981' },
    { name: 'Infosys Tech', value: 1278000, color: '#8b5cf6' }
  ];

  return (
    <ContentContainer>
      {/* Top Hero */}
      <PageHeader 
        title="Invoice Marketplace" 
        description="Browse, audit, and fund verified invoice token assets on the Polygon testnet."
      />

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Invoices', value: filteredInvoices.length, color: 'text-primary-500 bg-primary-50 dark:bg-primary-950/20' },
          { label: 'Marketplace Value', value: formatCurrency(filteredInvoices.reduce((a, b) => a + b.amount, 0)), color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'Average Yield Rate', value: '8.6% APY', color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/20' },
          { label: 'Active Auctions', value: filteredInvoices.filter(i => i.status === 'Live Auction').length, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' }
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{stat.label}</div>
            <div className="text-xl font-display font-extrabold text-gray-900 dark:text-white mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="relative w-full max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search buyers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-xl border border-gray-150 dark:border-dark-border pl-10 pr-4 py-2.5 text-xs bg-gray-50 dark:bg-dark-card/50 text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {['All', 'Manufacturing', 'Retail', 'IT Services', 'Healthcare', 'Logistics'].map(ind => (
            <button 
              key={ind}
              onClick={() => setSelectedIndustry(ind)}
              className={`px-3 py-1.5 rounded-full border transition ${
                selectedIndustry === ind 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400' 
                  : 'border-gray-150 dark:border-slate-800 bg-white dark:bg-dark-card hover:bg-gray-50'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Listings, Right Sidebar Portfolio */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Investment Cards List */}
        <div className="lg:col-span-2 space-y-6">
          {isLoading ? (
            /* Skeleton loader while fetching */
            <div className="grid sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm animate-pulse space-y-4">
                  <div className="flex justify-between">
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-32" />
                      <div className="h-2.5 bg-gray-100 dark:bg-slate-800 rounded w-24" />
                    </div>
                    <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-14" />
                  </div>
                  <div className="h-px bg-gray-100 dark:bg-slate-800" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-16" /><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" /></div>
                    <div className="space-y-1.5"><div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-16" /><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-16" /></div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-9 bg-gray-200 dark:bg-slate-700 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {filteredInvoices.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-gray-400 text-xs">
                No marketplace listings found. List a verified invoice to get started.
              </div>
            ) : filteredInvoices.map((inv) => (
              <div 
                key={inv.id}
                className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-display font-bold text-sm text-gray-900 dark:text-white">{inv.buyer}</h4>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{inv.id} • {inv.industry}</span>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded border border-success-100 dark:border-success-950 bg-success-50 dark:bg-success-950/30 text-[9px] font-bold text-success-500 uppercase tracking-widest">
                    Grade {inv.grade}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 border-y border-gray-100 dark:border-slate-800/80 py-4 mb-4">
                  <div>
                    <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Invoice Value</div>
                    <div className="text-sm font-bold mt-0.5">{formatCurrency(inv.amount)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Yield Rate</div>
                    <div className="text-sm font-bold text-violet-500 mt-0.5">{inv.yieldRate}% APY</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-1.5 mb-6">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-gray-400">Funding Progress</span>
                    <span className="text-primary-500">{inv.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${inv.progress}%` }} />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setDrawerInvoice(inv)}
                    className="flex-1 py-2 px-4 rounded-xl border border-gray-100 dark:border-slate-800 text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => setBidInvoice(inv)}
                    disabled={inv.status === 'Funded'}
                    className="flex-1 py-2 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Place Bid
                  </button>
                </div>
              </div>
            ))}</div>
          )}
        </div>

        {/* Right Sidebar: Investor Portfolio Summary */}
        <div className="space-y-8">
          
          {/* Portfolio Summary Card */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Portfolio Summary</h3>
            
            <div className="space-y-4">
              {[
                { label: 'Wallet Balance', value: formatCurrency(PORTFOLIO_STATS.balance) },
                { label: 'Active Assets Financed', value: formatCurrency(PORTFOLIO_STATS.activeInvestments) },
                { label: 'Avg Portfolio Returns', value: `${PORTFOLIO_STATS.avgReturn}% APY` },
                { label: 'Pending Settlement bills', value: formatCurrency(PORTFOLIO_STATS.pendingSettlements) }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-400 dark:text-gray-500">{item.label}</span>
                  <span className="font-bold text-gray-800 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Recharts allocation diagram */}
            <div className="pt-4 border-t border-gray-50 dark:border-slate-800">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Investment Allocation</div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ALLOCATION_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {ALLOCATION_DATA.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-[9px] font-bold text-gray-500 uppercase tracking-wider pt-2">
                {ALLOCATION_DATA.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Invoice Detail Side Drawer */}
      <AnimatePresence>
        {drawerInvoice && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm p-4">
            
            {/* Backdrop close */}
            <div className="absolute inset-0" onClick={() => setDrawerInvoice(null)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative z-10 w-full max-w-lg bg-white dark:bg-dark-card border-l border-gray-150 dark:border-dark-border shadow-2xl h-full flex flex-col justify-between p-6 sm:p-8 overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">{drawerInvoice.buyer}</h3>
                    <span className="text-[10px] text-gray-400 font-semibold">{drawerInvoice.id}</span>
                  </div>
                  <button 
                    onClick={() => setDrawerInvoice(null)}
                    className="p-1.5 rounded-lg border border-gray-100 dark:border-slate-800 text-gray-400 hover:text-gray-600 transition"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Summary Parameters */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Amount', value: formatCurrency(drawerInvoice.amount) },
                    { label: 'Yield Expectation', value: `${drawerInvoice.yieldRate}% APY`, color: 'text-violet-500' },
                    { label: 'Due Date', value: drawerInvoice.dueDate },
                    { label: 'AI Risk Grade', value: drawerInvoice.grade, color: 'text-success-500' },
                    { label: 'Blockchain hash', value: drawerInvoice.tokenUrl },
                    { label: 'Auction status', value: drawerInvoice.status }
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-xl border border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/30 text-xs">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{item.label}</div>
                      <div className={`font-bold ${item.color || 'text-gray-800 dark:text-white'}`}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Bid History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Bids History</h4>
                  {drawerInvoice.bids.length > 0 ? (
                    <div className="space-y-2">
                      {drawerInvoice.bids.map((b, i) => (
                        <div key={i} className="p-3 rounded-xl border border-gray-100 dark:border-slate-800/50 bg-white dark:bg-dark-card flex justify-between items-center text-xs">
                          <div>
                            <div className="font-bold text-gray-800 dark:text-white">{b.investor}</div>
                            <span className="text-[10px] text-gray-400">{b.date}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(b.bid)}</div>
                            <span className="text-[10px] font-bold text-violet-500">{b.yield}% APY</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">No active bids yet. Be the first to place a bid!</div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="border-t border-gray-100 dark:border-slate-800 pt-6 mt-6 flex gap-4">
                <button 
                  onClick={() => setBidInvoice(drawerInvoice)}
                  disabled={drawerInvoice.status === 'Funded'}
                  className="flex-1 py-3 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-lg shadow-primary-500/10 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Place Bid
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bid Modal Dialog */}
      <AnimatePresence>
        {bidInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-2xl space-y-6"
            >
              {bidSuccess ? (
                /* Celebration ready completion */
                <div className="text-center space-y-6 py-4">
                  <div className="relative mx-auto h-16 w-16 rounded-full bg-success-500 flex items-center justify-center text-white shadow-lg shadow-success-500/25">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-extrabold text-xl">Bid Successfully Placed</h3>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">Your investment offer hash has been securely recorded on Polygon.</p>
                  </div>

                  <button 
                    onClick={handleCloseBidFlow}
                    className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition"
                  >
                    Back to Marketplace
                  </button>
                </div>
              ) : (
                /* Place bid form details */
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">Place Financing Bid</h3>
                      <span className="text-[10px] text-gray-400 font-semibold">{bidInvoice.buyer} • {bidInvoice.id}</span>
                    </div>
                    <button 
                      onClick={() => setBidInvoice(null)}
                      className="text-xs font-bold text-gray-400 hover:text-gray-600 transition"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handlePlaceBid} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Bid Amount (INR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 500000"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 p-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Expected Yield APY (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 8.2"
                        value={expectedYield}
                        onChange={(e) => setExpectedYield(e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 p-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2"
                    >
                      <span>Sign &amp; Place Bid</span>
                    </button>
                  </form>
                </>
              )}
            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </ContentContainer>
  );
}
