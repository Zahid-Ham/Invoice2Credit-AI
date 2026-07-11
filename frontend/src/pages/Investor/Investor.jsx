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
  const [watchlist, setWatchlist] = useState([
    { id: 'INV-2026-088', buyer: 'Wipro Enterprises', amount: '₹6,40,000', yield: '8.7% APY', risk: 'A' }
  ]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      marketplaceService.getMyInvestments(currentUser.uid)
        .then(data => {
          // Normalize to match local expectations if needed, else store raw
          setInvestments(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [currentUser]);

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
          { label: 'Portfolio Value', value: '₹48,50,000', text: '+12.4% ROI Year-to-Date', color: 'from-blue-500 to-indigo-500' },
          { label: 'Expected Monthly Yield', value: '₹38,400', text: 'APY average: 8.65%', color: 'from-violet-500 to-purple-500' },
          { label: 'Active Capital Funded', value: '₹34,50,000', text: 'Across 8 verified bills', color: 'from-emerald-500 to-teal-500' },
          { label: 'Today\'s Yield Gain', value: '+₹4,200', text: 'Accrued smart interest', color: 'from-pink-500 to-rose-500' },
          { label: 'Wallet balance', value: '₹14,00,000', text: 'Available to bid instantly', color: 'from-amber-500 to-orange-500' }
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
                <AreaChart data={PORTFOLIO_GROWTH}>
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
                    <button onClick={() => toast.success('Escrow tracked successfully')} className="flex-1 py-2 px-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold transition">
                      Track Escrow
                    </button>
                    <button onClick={() => toast.success('Transfer parameters loaded')} className="py-2 px-3 rounded-lg border border-gray-100 dark:border-slate-800 text-[10px] font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      Secondary Sell
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
                    data={SECTOR_ALLOCATION}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {SECTOR_ALLOCATION.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
              {SECTOR_ALLOCATION.map(item => (
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

    </ContentContainer>
  );
}
