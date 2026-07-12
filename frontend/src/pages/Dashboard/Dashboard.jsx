import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, UploadCloud, Brain, ShieldCheck, 
  Hexagon, Landmark, Key, Banknote, HelpCircle, 
  Cpu, Activity, ArrowRight, ArrowUpRight, 
  FileUp, Sparkles, MessageSquare, Plus, ChevronRight, CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

import { invoiceService } from '@/services/invoiceService';

import { 
  KPIS, LIQUIDITY_FLOW, 
  RISK_DISTRIBUTION, ACTIVITIES, UPCOMING_TASKS, INSIGHTS 
} from './dashboardData';

function useCountUp(target, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoicesList, setInvoicesList] = useState([]);

  // Form State
  const [formData, setFormData] = useState({ buyer: '', amount: '' });

  useEffect(() => {
    if (!currentUser) return;
    const unsub = invoiceService.subscribeInvoices(currentUser.uid || currentUser.email, (data) => {
      setInvoicesList(data);
    });
    return () => unsub();
  }, [currentUser]);

  const activeUser = currentUser?.displayName || currentUser?.email || 'Valued Partner';

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleUploadInvoice = async (e) => {
    e.preventDefault();
    if (!formData.buyer || !formData.amount) {
      return toast.error("Please enter a buyer and amount.");
    }
    const newInv = {
      invoiceId: `INV-${Date.now()}`,
      ownerId: currentUser.uid || currentUser.email,
      invoiceNumber: `INV-2026-0${invoicesList.length + 84}`,
      buyerName: formData.buyer,
      supplierName: currentUser.displayName || 'Supplier Partner',
      invoiceAmount: Number(formData.amount),
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
      gstNumber: '27AAAAA0000A1Z5',
      status: 'Pending',
      riskGrade: 'A',
      confidence: 98.4,
      aiSummary: 'Invoice uploaded from dashboard.',
      recommendedFunding: Number(formData.amount) * 0.8,
      nftStatus: 'Pending',
      marketplaceStatus: 'Pending',
      transactionHash: '---',
      createdAt: new Date().toISOString()
    };
    try {
      await invoiceService.addInvoice(newInv);
      setFormData({ buyer: '', amount: '' });
      setInvoiceModalOpen(false);
      toast.success("Invoice uploaded to AI Audit flow.");
    } catch (err) {
      toast.error("Failed to upload invoice.");
    }
  };

  return (
    <ContentContainer>
      {/* 1. Personalized Greeting */}
      <PageHeader 
        title={`Good Morning, ${activeUser.split(' ')[0]} 👋`} 
        description="Your business is one verified invoice away from instant liquidity."
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary-100 dark:border-primary-950 bg-primary-50/50 dark:bg-primary-950/20 text-xs font-semibold text-primary-600 dark:text-primary-400">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>AI Assistant Online</span>
        </div>
      </PageHeader>

      {/* Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* 2. Hero Liquidity Card */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-200/10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-8 text-slate-900 dark:text-white shadow-xl dark:shadow-2xl">
            {/* Ambient Background Mesh */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.05),transparent_40%)] dark:bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_40%)] pointer-events-none" />
            <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/20 dark:to-purple-500/10 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[80px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-8">
              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Available Working Capital</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                    ₹24,80,000
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Real-time withdrawable liquidity backing your supply chain</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 max-w-sm pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider">Potential Financing</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">₹41,50,000</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider">AI Credit Grade</div>
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      A+ (Low Risk)
                    </div>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={() => navigate('/app/msme', { state: { openWizard: true } })}
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                className="relative group overflow-hidden inline-flex items-center gap-2.5 self-start md:self-center px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs shadow-[0_8px_30px_rgb(99,102,241,0.2)] hover:shadow-[0_8px_35px_rgb(99,102,241,0.35)] transition-all duration-300"
              >
                <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
                <span>Upload New Invoice</span>
              </motion.button>
            </div>
          </div>

          {/* 3. Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quick actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { title: 'Upload Invoice', desc: 'Auto-scan PDF billing', icon: FileUp, action: () => navigate('/app/msme', { state: { openWizard: true } }), color: 'from-blue-500 to-indigo-600' },
                { title: 'Verify GST', desc: 'Direct government match', icon: ShieldCheck, action: () => toast.success('GST sync active'), color: 'from-emerald-500 to-teal-600' },
                { title: 'Marketplace', desc: 'Track investor auctions', icon: Landmark, action: () => toast('Opening bids portal...'), color: 'from-violet-500 to-purple-600' }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.title}
                    onClick={item.action}
                    whileHover={{ y: -3 }}
                    className="group rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 text-left shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                  >
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4 shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-display font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{item.title}</h4>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-normal">{item.desc}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 4. KPI Cards */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Performance KPIs</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {KPIS.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold text-success-500">{kpi.change}</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{kpi.label}</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{kpi.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 9. Monthly Liquidity Area Chart */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
            <h3 className="text-sm font-bold mb-4">Monthly Liquidity Flow</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={LIQUIDITY_FLOW}>
                  <defs>
                    <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="available" stroke="#2563eb" fillOpacity={1} fill="url(#colorFlow)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Recent Invoices Card-Rows */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Invoices</h3>
            <div className="space-y-3">
              {invoicesList.map((inv) => (
                <div 
                  key={inv.docId || inv.invoiceId || inv.id}
                  onClick={() => navigate(`/app/invoice/${inv.docId || inv.invoiceId || inv.id}`)}
                  className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-primary-500 font-bold text-xs border border-gray-100 dark:border-slate-700">
                      INV
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition">{inv.invoiceNumber || inv.id}</div>
                      <div className="text-[10px] text-gray-400">{inv.buyerName || inv.buyer}</div>
                    </div>
                  </div>

                  <div className="flex gap-8 items-center justify-between sm:justify-end">
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {typeof inv.invoiceAmount === 'number' ? formatCurrency(inv.invoiceAmount) : inv.amount}
                      </div>
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
                        inv.status === 'Funded' 
                          ? 'bg-success-500/10 text-success-500' 
                          : inv.status === 'Auction Live' 
                          ? 'bg-primary-500/10 text-primary-500' 
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {inv.status}
                      </span>
                    </div>

                    <div className="w-20 hidden md:block">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Financing</div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${inv.progress || (inv.status === 'Funded' ? 100 : 10)}%` }} />
                      </div>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/invoice/${inv.docId || inv.invoiceId || inv.id}`);
                      }}
                      className="p-1.5 rounded-lg border border-gray-100 dark:border-dark-border text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
                    >
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-8">
          
          {/* 5. AI Insights Panel */}
          <div className="rounded-2xl border border-primary-100 dark:border-primary-950 bg-gradient-to-b from-primary-50/50 to-white dark:from-primary-950/20 dark:to-dark-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-display font-bold text-sm">AI Business Insights</h3>
            </div>
            <div className="space-y-3">
              {INSIGHTS.map((insight) => (
                <div key={insight.id} className="p-3 rounded-xl border border-gray-100/50 dark:border-slate-800/80 bg-white/50 dark:bg-dark-card/50 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                  {insight.text}
                </div>
              ))}
            </div>
          </div>

          {/* 8. AI Risk Distribution Doughnut Chart */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
            <h3 className="text-sm font-bold mb-4">Risk Distribution</h3>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={RISK_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {RISK_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest pt-2">
              {RISK_DISTRIBUTION.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Funding Timeline */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Funding Timeline</h3>
            <div className="space-y-5 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-gray-100 dark:before:bg-slate-800">
              {[
                { label: 'Invoice Uploaded', done: true },
                { label: 'GST Data Matched', done: true },
                { label: 'AI Risk Audit Assessed', done: true },
                { label: 'Escrow Locked', active: true },
                { label: 'Payout Released', pending: true }
              ].map((step, idx) => (
                <div key={idx} className="relative flex items-center text-xs">
                  <div className={`absolute -left-[23px] h-3.5 w-3.5 rounded-full border-2 bg-white dark:bg-dark-card flex items-center justify-center ${
                    step.done 
                      ? 'border-success-500 text-success-500' 
                      : step.active 
                      ? 'border-primary-500 text-primary-500' 
                      : 'border-gray-200 dark:border-slate-800'
                  }`}>
                    {step.done && <CheckCircle2 className="h-2 w-2 text-success-500 fill-success-500" />}
                  </div>
                  <span className={`font-semibold ${
                    step.done ? 'text-gray-500 dark:text-gray-400' : step.active ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 10. Live Activity Feed */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Live Activity</h3>
            <div className="space-y-4">
              {ACTIVITIES.map((activity) => (
                <div key={activity.id} className="text-[11px] leading-relaxed border-b border-gray-50 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{activity.text}</p>
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-600 block mt-1 uppercase tracking-wider">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 11. Upcoming Actions */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">Upcoming Actions</h3>
            <div className="space-y-3">
              {UPCOMING_TASKS.map((task) => (
                <div key={task.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 flex justify-between items-center gap-3">
                  <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 leading-normal">{task.text}</p>
                  <button 
                    onClick={() => toast(`Triggering action: ${task.action}`)}
                    className="text-[9px] font-bold bg-primary-600 hover:bg-primary-700 text-white px-2.5 py-1.5 rounded-lg flex-shrink-0 transition uppercase tracking-wider"
                  >
                    {task.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 12. Floating AI Assistant & Side Panel */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={() => setAssistantOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xl hover:shadow-glow-purple border border-violet-500/30"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
        </motion.button>

        <AnimatePresence>
          {assistantOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-80 sm:w-96 bg-white dark:bg-dark-card border-l border-gray-150 dark:border-dark-border shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50/50 dark:bg-dark-card/50">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-display font-extrabold text-sm uppercase tracking-wider">AI Assistant</span>
                </div>
                <button 
                  onClick={() => setAssistantOpen(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  Close
                </button>
              </div>

              {/* Chat Body */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs leading-relaxed">
                <div className="p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
                  Hello! I am your Invoice2Credit AI agent. I analyze risk profiles, monitor Polygon mints, and score matching invoices.
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-150 dark:border-slate-800 text-gray-600 dark:text-gray-400">
                  Based on current market factors, investor bids on Tata Motors invoice are higher than average. It is optimal to accept bids today.
                </div>
              </div>

              {/* Input Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-dark-border">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask AI anything..." 
                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                  />
                  <button 
                    onClick={() => toast.success('Query sent to AI Risk model.')}
                    className="p-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition flex items-center justify-center"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Invoice Dialog Modal */}
      <AnimatePresence>
        {invoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">Upload New Invoice</h3>
                <button 
                  onClick={() => setInvoiceModalOpen(false)}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleUploadInvoice} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Buyer Name</label>
                  <input
                    type="text"
                    placeholder="Tata Motors Ltd"
                    value={formData.buyer}
                    onChange={(e) => setFormData(prev => ({ ...prev, buyer: e.target.value }))}
                    className="block w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount (INR)</label>
                  <input
                    type="number"
                    placeholder="1200000"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="block w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 text-gray-900 dark:text-white p-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2"
                >
                  <span>Submit Invoice</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </ContentContainer>
  );
}
