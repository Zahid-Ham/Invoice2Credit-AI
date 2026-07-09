import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, CheckCircle2, AlertTriangle, Calendar, FileText, 
  ArrowUpRight, Clock, Plus, RefreshCw, Layers, ShieldCheck, 
  HelpCircle, Activity, Play, Lock, Trash2, Cpu, Sparkles, Terminal,
  Users, Landmark, CheckSquare, ShieldAlert, BarChart3, TrendingUp,
  Search, Filter, Send, Download, Ban, Eye, HardDrive, BellRing,
  Globe, Database, Server, UserCheck, Flame, PieChart as PieIcon,
  ChevronRight, AlertOctagon, HelpCircle as HelpIcon, ArrowDownRight,
  TrendingDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

/* ─── Mock Data for Enterprise Charts ─────────────────────────────────────── */
const FUNDING_TREND = [
  { name: 'Jan', amount: 12000000, invoices: 140 },
  { name: 'Feb', amount: 18500000, invoices: 190 },
  { name: 'Mar', amount: 24000000, invoices: 220 },
  { name: 'Apr', amount: 34500000, invoices: 310 },
  { name: 'May', amount: 48500000, invoices: 450 },
  { name: 'Jun', amount: 62000000, invoices: 580 }
];

const USER_GROWTH = [
  { name: 'Jan', msme: 45, investor: 12, buyer: 8 },
  { name: 'Feb', msme: 78, investor: 22, buyer: 14 },
  { name: 'Mar', msme: 112, investor: 38, buyer: 19 },
  { name: 'Apr', msme: 165, investor: 55, buyer: 27 },
  { name: 'May', msme: 230, investor: 79, buyer: 35 },
  { name: 'Jun', msme: 312, investor: 114, buyer: 42 }
];

const RISK_DISTRIBUTION = [
  { subject: 'Repayment Probability', A: 95, B: 80, fullMark: 100 },
  { subject: 'GST Verifiability', A: 99, B: 90, fullMark: 100 },
  { subject: 'Logistics GRN Match', A: 92, B: 75, fullMark: 100 },
  { subject: 'Historical Delay', A: 97, B: 85, fullMark: 100 },
  { subject: 'Industry Health', A: 88, B: 70, fullMark: 100 }
];

const AI_USAGE_STATS = [
  { name: '00:00', tokens: 12000, latency: 290 },
  { name: '04:00', tokens: 8000, latency: 260 },
  { name: '08:00', tokens: 28000, latency: 310 },
  { name: '12:00', tokens: 42000, latency: 340 },
  { name: '16:00', tokens: 39000, latency: 320 },
  { name: '20:00', tokens: 25000, latency: 295 }
];

const REVENUE_DATA = [
  { name: 'Q1', fees: 480000, premium: 120000, subs: 180000 },
  { name: 'Q2', fees: 720000, premium: 220000, subs: 340000 }
];

const HEALTH_SYSTEMS = [
  { id: 'fastapi', name: 'FastAPI Backend Core', status: 'online', uptime: '99.99%', latency: '24ms' },
  { id: 'firestore', name: 'Firestore Database', status: 'online', uptime: '100.00%', latency: '12ms' },
  { id: 'groq', name: 'Groq AI Inference API', status: 'online', uptime: '99.95%', latency: '280ms' },
  { id: 'polygon', name: 'Polygon POS RPC Node', status: 'online', uptime: '99.92%', latency: '75ms' },
  { id: 'firebase_auth', name: 'Firebase Auth Service', status: 'online', uptime: '100.00%', latency: '15ms' },
  { id: 'notifications', name: 'Transactional SMTP & Push', status: 'degraded', uptime: '98.84%', latency: '142ms' }
];

const INITIAL_USERS = [
  { uid: 'USR-082', name: 'Gulnar Hamdule', role: 'buyer', verified: true, wallet: '0x4aB8...f91C', status: 'Active', kyc: 'Approved', funding: '₹18,40,000' },
  { uid: 'USR-083', name: 'TextilePro Industries', role: 'msme', verified: true, wallet: '0x81C2...b23A', status: 'Active', kyc: 'Approved', funding: '₹34,50,000' },
  { uid: 'USR-084', name: 'AltFin Yield Fund', role: 'investor', verified: true, wallet: '0x32A4...e908', status: 'Active', kyc: 'Approved', funding: '₹48,50,000' },
  { uid: 'USR-085', name: 'RawCotton Supplier Ltd', role: 'msme', verified: false, wallet: 'Not Connected', status: 'Pending Verification', kyc: 'Pending Review', funding: '₹0' },
  { uid: 'USR-086', name: 'Apex Logistics Corp', role: 'buyer', verified: true, wallet: '0x992B...c148', status: 'Suspended', kyc: 'Flagged', funding: '₹6,40,000' }
];

const INITIAL_INVOICES = [
  { id: 'INV-2026-085', supplier: 'TextilePro Industries', buyer: 'Wipro Enterprises', amount: '₹8,50,000', status: 'Pending Verification', risk: 'A+' },
  { id: 'INV-2026-086', supplier: 'RawCotton Supplier Ltd', buyer: 'Raymond Ltd', amount: '₹12,40,000', status: 'Approved', risk: 'A' },
  { id: 'INV-2026-087', supplier: 'Apex Logistics Ltd', buyer: 'Tata Motors Group', amount: '₹6,40,000', status: 'Marketplace', risk: 'B+' },
  { id: 'INV-2026-088', supplier: 'TextilePro Industries', buyer: 'Wipro Enterprises', amount: '₹14,20,000', status: 'NFT Minted', risk: 'A+' },
  { id: 'INV-2026-089', supplier: 'TextilePro Industries', buyer: 'Raymond Ltd', amount: '₹15,00,000', status: 'Completed', risk: 'A' }
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState(INITIAL_USERS);
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Live Activity Feed State
  const [activities, setActivities] = useState([
    { time: '19:30:12', msg: 'System user Gulnar Hamdule completed buyer onboarding.', type: 'signup' },
    { time: '19:31:05', msg: 'Invoice INV-2026-089 tokenized & NFT minted on Polygon POS.', type: 'nft' },
    { time: '19:32:18', msg: 'Groq AI Underwriter completed scan for Raymond Ltd bill.', type: 'ai' },
    { time: '19:33:04', msg: 'Bid of ₹14,20,000 submitted by AltFin Yield on marketplace.', type: 'bid' },
    { time: '19:34:50', msg: 'Smart Contract Escrow settlement finalized for Tata Motors PO.', type: 'settlement' }
  ]);

  // Push new activity logs periodically to simulate live data
  useEffect(() => {
    const interval = setInterval(() => {
      const msgs = [
        { time: new Date().toTimeString().split(' ')[0], msg: 'FastAPI health check resolved (latency: 24ms).', type: 'system' },
        { time: new Date().toTimeString().split(' ')[0], msg: 'User login signature authenticated via WalletConnect.', type: 'wallet' },
        { time: new Date().toTimeString().split(' ')[0], msg: 'AI fraud scan completed: 0 duplicate submissions detected.', type: 'ai' },
        { time: new Date().toTimeString().split(' ')[0], msg: 'Polygon network gas fees calibrated at 32 Gwei.', type: 'blockchain' }
      ];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      setActivities(prev => [randomMsg, ...prev.slice(0, 8)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Quick Action Handlers
  const handleRestartAI = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Reloading Groq prompt matrices...',
        success: 'Groq LLM endpoint rebooted. Latency stabilized!',
        error: 'AI reboot failed.'
      }
    );
  };

  const handleVerifyBusiness = (uid) => {
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, verified: true, kyc: 'Approved', status: 'Active' } : u));
    toast.success('Business credentials officially verified.');
  };

  const handleSuspendUser = (uid) => {
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: 'Suspended' } : u));
    toast.error('User credentials suspended.');
  };

  const handleApproveInvoice = (id) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'Approved' } : inv));
    toast.success(`Invoice ${id} approved for Marketplace listing.`);
  };

  return (
    <ContentContainer>
      <PageHeader 
        title="Platform Operations Center" 
        description="Core command center for monitoring platform status, system health, and invoice financing activities."
      />

      {/* ─── Animated Top Health Status Bar ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-8 gap-4 mb-8">
        {[
          { label: 'Platform Health', value: '99.98%', status: 'online', uptime: 'All APIs green' },
          { label: 'System Status', value: 'Online', status: 'online', uptime: 'Safe and active' },
          { label: 'Today\'s Funding', value: '₹1.84 Cr', status: 'online', uptime: '+12% from yesterday' },
          { label: 'Invoices Processed', value: '148 bills', status: 'online', uptime: 'Groq scanning active' },
          { label: 'Active Users', value: '1,240 online', status: 'online', uptime: '4 roles connected' },
          { label: 'Marketplace Liquidity', value: '₹4.85 Cr', status: 'online', uptime: 'Investor pools stable' },
          { label: 'Polygon Network', value: '32 Gwei', status: 'online', uptime: 'POS Mainnet' },
          { label: 'AI Service (Groq)', value: 'Operational', status: 'online', uptime: 'Llama-3 model active' }
        ].map((node, i) => (
          <div key={i} className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">{node.label}</span>
              <div className="text-sm font-display font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {node.value}
              </div>
            </div>
            <span className="text-[9px] text-gray-400 mt-2 block">{node.uptime}</span>
          </div>
        ))}
      </div>

      {/* Tab Navigation Menu */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-gray-100 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview & KPIs' },
          { id: 'health', label: 'Platform Health' },
          { id: 'users', label: 'User & Invoices' },
          { id: 'fraud', label: 'Fraud & AI Analytics' },
          { id: 'blockchain', label: 'Blockchain & Revenue' },
          { id: 'support', label: 'Support & Logs' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT PANELS ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {/* 1. OVERVIEW & Executive KPIs */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Executive KPIs Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Registered MSMEs', value: '312 owners', sub: '+18 this month', icon: Building2, color: 'text-blue-500' },
                  { label: 'Registered Investors', value: '114 funds', sub: '₹85L average bid', icon: Landmark, color: 'text-violet-500' },
                  { label: 'Corporate Buyers', value: '42 entities', sub: 'AAA average rating', icon: CheckSquare, color: 'text-emerald-500' },
                  { label: 'Settlement Success Rate', value: '99.98%', sub: 'Zero default occurrences', icon: ShieldCheck, color: 'text-indigo-500' },
                  { label: 'Total Invoices Uploaded', value: '1,420 bills', sub: '₹14.8 Cr face value', icon: FileText, color: 'text-cyan-500' },
                  { label: 'Invoices Financed', value: '894 deals', sub: '₹9.4 Cr disbursed', icon: UserCheck, color: 'text-amber-500' },
                  { label: 'Average Funding Speed', value: '4.2 hours', sub: 'Fastest OCR turnaround', icon: Clock, color: 'text-pink-500' },
                  { label: 'Fraud Attempts Blocked', value: '12 instances', sub: 'Fake GST registration blocks', icon: ShieldAlert, color: 'text-rose-500' }
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={idx} className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{kpi.label}</span>
                        <div className="text-xl font-display font-black text-gray-900 dark:text-white">{kpi.value}</div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block">{kpi.sub}</span>
                      </div>
                      <div className={`h-10 w-10 rounded-xl bg-gray-50 dark:bg-slate-900 flex items-center justify-center ${kpi.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Funding trend line chart & risk radar */}
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Total Funding & Invoice Volume Trend</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={FUNDING_TREND}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="amount" stroke="#6366f1" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Risk Underwriting Model spreads</h3>
                  <div className="h-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RISK_DISTRIBUTION}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" fontSize={9} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={8} />
                        <Radar name="Class A Rating" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="Class B Rating" dataKey="B" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PLATFORM HEALTH */}
          {activeTab === 'health' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {HEALTH_SYSTEMS.map(sys => (
                <div key={sys.id} className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{sys.name}</h4>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        sys.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sys.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {sys.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Uptime</span>
                        <span className="text-xs font-black">{sys.uptime}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Latency</span>
                        <span className="text-xs font-black text-primary-500">{sys.latency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. USER & INVOICES */}
          {activeTab === 'users' && (
            <div className="space-y-8">
              {/* User management table */}
              <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-gray-50 dark:border-slate-800 pb-4">
                  <h3 className="text-sm font-bold">User Management Ledger</h3>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search name, wallet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-xl border border-gray-150 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-xs w-64 focus:outline-none"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-150 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-xs focus:outline-none"
                    >
                      <option value="all">All Roles</option>
                      <option value="msme">MSMEs</option>
                      <option value="investor">Investors</option>
                      <option value="buyer">Buyers</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400">
                    <thead>
                      <tr className="border-b border-gray-50 dark:border-slate-800 pb-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        <th className="pb-3">User ID</th>
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Role</th>
                        <th className="pb-3">KYC Status</th>
                        <th className="pb-3">Active Pipeline</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => roleFilter === 'all' || u.role === roleFilter)
                        .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.wallet.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(user => (
                          <tr key={user.uid} className="border-b border-gray-50 dark:border-slate-800/80 last:border-0">
                            <td className="py-4 font-mono font-bold text-gray-800 dark:text-white">{user.uid}</td>
                            <td className="py-4 font-semibold">{user.name}</td>
                            <td className="py-4 capitalize font-bold text-primary-500">{user.role}</td>
                            <td className="py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                user.kyc === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                              }`}>{user.kyc}</span>
                            </td>
                            <td className="py-4 font-mono font-bold">{user.funding}</td>
                            <td className="py-4 text-right flex justify-end gap-2">
                              {!user.verified && (
                                <button 
                                  onClick={() => handleVerifyBusiness(user.uid)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                >
                                  Verify
                                </button>
                              )}
                              {user.status !== 'Suspended' ? (
                                <button 
                                  onClick={() => handleSuspendUser(user.uid)}
                                  className="px-2 py-1 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded text-[10px] font-bold"
                                >
                                  Suspend
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-bold">Suspended</span>
                              )}
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Lifecycle Grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Platform Invoices &amp; Lifecycle Checks</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {invoices.map(inv => (
                    <div key={inv.id} className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] text-gray-400 block mb-0.5">{inv.id}</span>
                          <h4 className="font-bold text-xs text-gray-900 dark:text-white">{inv.supplier}</h4>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold ${
                          inv.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                          inv.status === 'NFT Minted' ? 'bg-violet-500/10 text-violet-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>{inv.status}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] pt-3 border-t border-gray-50 dark:border-slate-800">
                        <div>
                          <span className="text-gray-400 block">Buyer</span>
                          <span className="font-bold">{inv.buyer}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Amount</span>
                          <span className="font-bold text-primary-500">{inv.amount}</span>
                        </div>
                      </div>
                      {inv.status === 'Pending Verification' && (
                        <button 
                          onClick={() => handleApproveInvoice(inv.id)}
                          className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-[10px] font-bold transition"
                        >
                          Approve Invoice
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. FRAUD & AI ANALYTICS */}
          {activeTab === 'fraud' && (
            <div className="space-y-8">
              {/* Fraud Intelligence Dashboard */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-rose-100 dark:border-rose-950 bg-gradient-to-b from-rose-50/30 to-white dark:from-rose-950/20 dark:to-dark-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-rose-600">
                    <ShieldAlert className="h-5 w-5" />
                    <h3 className="font-display font-bold text-sm">AI Threat Intelligence</h3>
                  </div>
                  <div className="space-y-3.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    <div className="p-3.5 rounded-xl border border-gray-150 dark:border-slate-800 bg-white/50 dark:bg-dark-card/50">
                      **Fraud Alerts**: 0 Duplicate invoice submissions identified from scanned databases today.
                    </div>
                    <div className="p-3.5 rounded-xl border border-gray-150 dark:border-slate-800 bg-white/50 dark:bg-dark-card/50">
                      **GST Validation Check**: Raymond Ltd registered tax logs synced securely.
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Groq AI Request Traffic &amp; Tokens (24h)</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={AI_USAGE_STATS}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="tokens" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.06} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* AI metrics indicators */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Groq Tokens Used', value: '1.4M', sub: '92% completion efficiency' },
                  { label: 'Avg AI Latency', value: '294ms', sub: 'Underwriting scan runtime' },
                  { label: 'Model Cost Estimate', value: '$2.84', sub: 'Groq server allocation' },
                  { label: 'Structured Success Rate', value: '100.00%', sub: 'JSON parser health check' }
                ].map((stat, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{stat.label}</span>
                    <div className="text-base font-display font-black text-gray-900 dark:text-white">{stat.value}</div>
                    <span className="text-[9px] text-gray-400 block mt-0.5">{stat.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. BLOCKCHAIN & REVENUE */}
          {activeTab === 'blockchain' && (
            <div className="space-y-8">
              {/* Web3 status overview */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">Polygon Node Status</h3>
                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">POS Block Height</span>
                      <span className="font-mono font-bold">#41785714</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Gas Price</span>
                      <span className="font-mono font-bold">32 Gwei</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total NFTs Minted</span>
                      <span className="font-bold">148 tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Escrow Contracts</span>
                      <span className="font-bold">8 contracts</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Platform Revenue Generation</h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={REVENUE_DATA}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="fees" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="premium" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. SUPPORT & LOGS */}
          {activeTab === 'support' && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Activity & Logs */}
              <div className="lg:col-span-2 rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Audit Logs Timeline</h3>
                  <button 
                    onClick={() => toast.success('Platform audit report generated.')}
                    className="text-[9px] font-bold text-primary-500 uppercase tracking-wider hover:underline"
                  >
                    Export audit logs
                  </button>
                </div>
                <div className="space-y-4 font-mono text-[10px] text-gray-600 dark:text-gray-400 max-h-80 overflow-y-auto">
                  {activities.map((act, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <span className="text-gray-400 flex-shrink-0">{act.time}</span>
                      <span className="text-gray-800 dark:text-gray-200">{act.msg}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Administrative Actions & Settings */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">Platform Operations</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={handleRestartAI}
                      className="w-full py-2.5 px-4 rounded-xl border border-primary-200 dark:border-primary-950 text-primary-600 dark:text-primary-400 text-xs font-bold hover:bg-primary-50/50 dark:hover:bg-primary-950/10 transition flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4 animate-spin-slow" />
                      <span>Restart AI Services</span>
                    </button>
                    <button 
                      onClick={() => toast.success('Global broadcast notification dispatched.')}
                      className="w-full py-2.5 px-4 rounded-xl border border-gray-150 dark:border-slate-800 text-xs font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Broadcast Platform Alert</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </ContentContainer>
  );
}
