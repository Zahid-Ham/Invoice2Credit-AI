import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Landmark, ShieldAlert, Cpu, CheckCircle2, Check, X,
  Calendar, Info, AlertTriangle, ArrowRight, TrendingUp
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { buyerService } from '@/services/buyerService';

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
  const { currentUser } = useAuth();
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const buyerName = currentUser?.displayName || currentUser?.email || 'Tata Motors Group';

  const loadData = () => {
    setLoading(true);
    Promise.all([
      buyerService.getDashboard(buyerName),
      buyerService.getInvoices(buyerName)
    ]).then(([dash, invs]) => {
      if (dash) setDashboard(dash);
      if (invs) {
        setInvoices(invs);
        setPendingInvoices(invs.filter(inv => 
          inv.status === 'Pending Approval' || 
          inv.status === 'Pending Verification' || 
          inv.status === 'Verification'
        ));
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleAction = async (id, type) => {
    try {
      if (type === 'approve') {
        await buyerService.approveInvoice(id);
      } else {
        await buyerService.rejectInvoice(id);
      }
      toast.success(`Invoice ${id} successfully ${type === 'approve' ? 'approved' : 'rejected'}.`);
      loadData();
    } catch (err) {
      toast.error(err.message || "Action execution failed.");
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
          { label: 'Outstanding Payments', value: formatCurrency(dashboard?.totalApproved ?? 2850000), text: 'Due within next 60 days', color: 'from-blue-500 to-indigo-500' },
          { label: 'Pending Approvals', value: `${pendingInvoices.length} Invoices`, text: 'Awaiting delivery checks', color: 'from-amber-500 to-orange-500' },
          { label: 'Average Payment Delay', value: '1.2 Days', text: 'Top 5% Payment Reputation', color: 'from-emerald-500 to-teal-500' },
          { label: 'Monthly Repaid Volume', value: formatCurrency(dashboard?.totalRepaid ?? 1840000), text: 'Auto-settled through Escrows', color: 'from-violet-500 to-purple-500' }
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
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white">{inv.sellerName || inv.supplier || 'Supplier'}</h4>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{inv.id}</span>
                      </div>
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        {inv.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-gray-50 dark:border-slate-800/80">
                      <div>
                        <span className="text-gray-400 block">Amount</span>
                        <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(inv.amount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Maturity Date</span>
                        <span className="font-bold text-gray-800 dark:text-white">{inv.dueDate || inv.due}</span>
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

          {/* Settle Repayments list */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">Release Repayment Escrow</h3>
            {invoices.filter(i => i.status === 'Funded').length > 0 ? (
              <div className="space-y-4">
                {invoices.filter(i => i.status === 'Funded').map((inv) => (
                  <div key={inv.id} className="p-4 rounded-xl border border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/10 flex flex-col justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-gray-800 dark:text-white block">{inv.sellerName}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">ID: {inv.id} • Due: {inv.dueDate}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 border-t border-gray-50 dark:border-slate-800/80 pt-2">
                      <span className="font-bold text-xs text-primary-500">{formatCurrency(inv.amount)}</span>
                      <button 
                        onClick={async () => {
                          try {
                            await buyerService.settlePayment(inv.id);
                            toast.success(`Payment settled successfully for invoice ${inv.id}.`);
                            loadData();
                          } catch (err) {
                            toast.error(err.message || 'Payment settlement failed.');
                          }
                        }}
                        className="py-1.5 px-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-bold transition"
                      >
                        Settle Payout
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-150 dark:border-slate-800 rounded-xl">No outstanding funded invoices require settlement.</p>
            )}
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
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/30">
                  <div>
                    <span className="font-semibold block">{cal.title}</span>
                    <span className="text-[10px] text-gray-400">{cal.date}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-800 dark:text-white">
                    {cal.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </ContentContainer>
  );
}
