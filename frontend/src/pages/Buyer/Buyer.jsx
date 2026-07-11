import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, CheckCircle2, AlertTriangle, Calendar, FileText, 
  ArrowUpRight, Clock, Plus, RefreshCw, Layers, ShieldCheck, 
  HelpCircle, ChevronRight, Check, X, ShieldAlert, Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';
import { useEscrow } from '@/hooks/useEscrow';

const MONTHLY_PAYMENTS = [
  { name: 'Feb', amount: 1800000 },
  { name: 'Mar', amount: 2400000 },
  { name: 'Apr', amount: 3200000 },
  { name: 'May', amount: 2850000 }
];

const VENDOR_DISTRIBUTION = [
  { name: 'TextilePro', value: 50, color: '#3b82f6' },
  { name: 'Apex Logistics', value: 30, color: '#8b5cf6' },
  { name: 'Bytes Tech', value: 20, color: '#10b981' }
];

export default function Buyer() {
  const [pendingInvoices, setPendingInvoices] = useState([
    { id: 'INV-2026-085', supplier: 'TextilePro Industries Ltd', amount: '₹8,50,000', date: 'Jul 09', due: 'Sep 09', status: 'Pending Verification' },
    { id: 'INV-2026-087', supplier: 'Apex Logistics Ltd', amount: '₹6,40,000', date: 'Jul 07', due: 'Sep 07', status: 'Pending Verification' }
  ]);

  const { releasePayment, txStatus, reset: resetTx } = useEscrow();
  const [payingIdx, setPayingIdx] = useState(null);

  const handleAction = (id, type) => {
    setPendingInvoices(prev => prev.filter(inv => inv.id !== id));
    toast.success(`Invoice ${id} successfully ${type === 'approve' ? 'approved' : 'rejected'}.`);
  };

  const handleReleasePayment = async (idx) => {
    setPayingIdx(idx);
    
    // In a real app, this would be the actual deployed escrow contract address for the invoice.
    // For demo purposes if contracts aren't deployed, we show a success mock.
    const escrowAddress = import.meta.env.VITE_ESCROW_FACTORY_ADDRESS; 
    
    if (!escrowAddress || escrowAddress === '0x...') {
      // Demo mode fallback
      setTimeout(() => {
        toast.success('Funds released successfully! (Demo Mode)');
        setPayingIdx(null);
      }, 1500);
      return;
    }

    try {
      toast.loading('Please confirm the transaction in MetaMask...', { id: 'wallet' });
      // 0.001 MATIC in wei for demo payment
      const amountWei = BigInt('1000000000000000'); 
      
      const { txHash } = await releasePayment(escrowAddress, amountWei);
      toast.dismiss('wallet');
      toast.success(
        <span>
          Payment Released On-Chain! ⛓️ <br/>
          <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" className="underline font-bold mt-1 inline-block">View on Polygonscan</a>
        </span>, 
        { duration: 6000 }
      );
    } catch (err) {
      toast.dismiss('wallet');
      const msg = err?.reason || err?.message || 'Transaction failed.';
      if (msg.toLowerCase().includes('user rejected')) {
        toast.error('Transaction cancelled.');
      } else {
        toast.error(`Payment failed: ${msg}`);
      }
    } finally {
      setPayingIdx(null);
      resetTx();
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <ContentContainer>
      
      {/* Page Header */}
      <PageHeader 
        title="Corporate Buyer Portal" 
        description="Verify supplier deliveries, approve invoices, and release payments."
      />

      {/* Hero Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Outstanding Payments', value: '₹28,50,000', text: 'Due within next 60 days', color: 'from-blue-500 to-indigo-500' },
          { label: 'Pending Approvals', value: `${pendingInvoices.length} Invoices`, text: 'Awaiting delivery checks', color: 'from-amber-500 to-orange-500' },
          { label: 'Average Payment Delay', value: '1.2 Days', text: 'Top 5% Payment Reputation', color: 'from-emerald-500 to-teal-500' },
          { label: 'Monthly Repaid Volume', value: '₹18,40,000', text: 'Auto-settled through Escrows', color: 'from-violet-500 to-purple-500' }
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

      {/* Double Column Grid: Invoices & Analytics */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        
        {/* Left Column: Pending approvals list & Delivery verification */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Pending Invoice approvals */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending Invoice Approvals</h3>
            {pendingInvoices.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {pendingInvoices.map((inv) => (
                  <div key={inv.id} className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white">{inv.supplier}</h4>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{inv.id}</span>
                      </div>
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        {inv.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-gray-50 dark:border-slate-800/80">
                      <div>
                        <span className="text-gray-400 block">Amount</span>
                        <span className="font-bold text-gray-800 dark:text-white">{inv.amount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Maturity Date</span>
                        <span className="font-bold text-gray-800 dark:text-white">{inv.due}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleAction(inv.id, 'approve')}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Approve</span>
                      </button>
                      <button 
                        onClick={() => handleAction(inv.id, 'reject')}
                        className="flex-1 py-2 px-3 rounded-lg border border-gray-150 dark:border-slate-800 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/10 hover:text-red-500 text-[10px] font-bold transition flex items-center justify-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-gray-150 dark:border-slate-800 rounded-2xl text-gray-400 text-xs">
                All supplier invoices approved and verified.
              </div>
            )}
          </div>

          {/* Delivery Verification Checklist */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">Delivery Verification</h3>
            <div className="space-y-3">
              {[
                { po: 'PO-94821-TAT', client: 'TextilePro Industries', status: 'Goods Received Note Pending' },
                { po: 'PO-94822-TAT', client: 'Apex Logistics', status: 'Quality check verified ✓' }
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-gray-150 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/10 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300 block">{item.po}</span>
                    <span className="text-[10px] text-gray-400">{item.client}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${item.status.includes('✓') ? 'text-success-500' : 'text-amber-500'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: AI Fraud Alerts, Payment Outflow charts */}
        <div className="space-y-8">
          
          {/* AI Fraud Alerts */}
          <div className="rounded-2xl border border-rose-100 dark:border-rose-950 bg-gradient-to-b from-rose-50/30 to-white dark:from-rose-950/20 dark:to-dark-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-display font-bold text-sm">AI Duplicate &amp; Fraud checks</h3>
            </div>
            <div className="space-y-3.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
              <div className="p-3 rounded-xl border border-gray-150/50 dark:border-slate-800 bg-white/50 dark:bg-dark-card/50">
                OCR scanned 14 invoices today. Zero double-billing attempts or collisions detected.
              </div>
              <div className="p-3 rounded-xl border border-gray-150/50 dark:border-slate-800 bg-white/50 dark:bg-dark-card/50">
                Supplier **TextilePro Industries** has verified tax registry logs on GST portals.
              </div>
            </div>
          </div>

          {/* Monthly Payments Bar Chart */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Monthly Repaid Outflows</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_PAYMENTS}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Calendar Milestones */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Upcoming Due Payments</h3>
            <div className="space-y-3.5 text-xs">
              {[
                { title: 'TextilePro Settlement due', date: 'Jul 15', amount: '₹9,45,000' },
                { title: 'Apex Logistics Settlement due', date: 'Jul 22', amount: '₹6,40,000' }
              ].map((cal, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 rounded-xl border border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/30 gap-3">
                  <div>
                    <span className="font-semibold block">{cal.title}</span>
                    <span className="text-[10px] text-gray-400">{cal.date} • {cal.amount}</span>
                  </div>
                  <button 
                    onClick={() => handleReleasePayment(idx)}
                    disabled={payingIdx === idx}
                    className="py-1.5 px-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {payingIdx === idx ? 'Processing...' : 'Release Funds'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </ContentContainer>
  );
}
