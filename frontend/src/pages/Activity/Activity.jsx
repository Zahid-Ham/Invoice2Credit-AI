import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileUp, Edit, Cpu, ShieldCheck, Landmark, Eye, 
  Coins, CheckCircle2, Award, ShieldAlert, Sparkles, 
  Search, Filter, Calendar, AlertTriangle, ArrowRight, 
  ExternalLink, User, Plus, Wallet, Layers, BellRing, Clock
} from 'lucide-react';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

/* ─── Mock Timeline Data ─────────────────────────────────────────────────── */
const MOCK_EVENTS = [
  // TODAY
  {
    id: 'evt-1',
    type: 'Settlement Completed',
    title: 'Smart Escrow Settlement Completed',
    desc: 'Escrow contract closed. Funds of ₹8,50,000 released to MSME wallet.',
    time: '2h ago',
    group: 'Today',
    user: 'Polygon Protocol',
    status: 'Completed',
    priority: 'High',
    invoice: 'INV-2026-085',
    icon: Coins,
    color: 'text-emerald-500 bg-emerald-500/10'
  },
  {
    id: 'evt-2',
    type: 'Buyer Payment Received',
    title: 'Buyer Payment Deposited',
    desc: 'Wipro Enterprises deposited settlement amount to escrow pool.',
    time: '4h ago',
    group: 'Today',
    user: 'Wipro Buyer Node',
    status: 'Completed',
    priority: 'High',
    invoice: 'INV-2026-085',
    icon: CheckCircle2,
    color: 'text-success-500 bg-success-500/10'
  },
  {
    id: 'evt-3',
    type: 'Highest Bid Updated',
    title: 'Highest Bid Overruled',
    desc: 'AltFin Yield Fund placed new highest bid of ₹8,20,000 (8.4% APY).',
    time: '6h ago',
    group: 'Today',
    user: 'AltFin Capital',
    status: 'Active',
    priority: 'Medium',
    invoice: 'INV-2026-085',
    icon: Landmark,
    color: 'text-violet-500 bg-violet-500/10'
  },
  // YESTERDAY
  {
    id: 'evt-4',
    type: 'NFT Minted',
    title: 'ERC-721 Invoice NFT Minted',
    desc: 'Invoice tokenized as NFT #41890 on Polygon POS mainnet.',
    time: 'Yesterday, 4:12 PM',
    group: 'Yesterday',
    user: 'System Admin Node',
    status: 'Completed',
    priority: 'Medium',
    invoice: 'INV-2026-085',
    icon: Layers,
    color: 'text-cyan-500 bg-cyan-500/10'
  },
  {
    id: 'evt-5',
    type: 'Admin Approval',
    title: 'Platform Underwriting Approved',
    desc: 'Admin validated tax credentials and registered Raymond Ltd PO match.',
    time: 'Yesterday, 2:30 PM',
    group: 'Yesterday',
    user: 'Platform Admin',
    status: 'Approved',
    priority: 'High',
    icon: ShieldCheck,
    color: 'text-indigo-500 bg-indigo-500/10'
  },
  {
    id: 'evt-6',
    type: 'Fraud Alert',
    title: 'GST Validation Passed',
    desc: 'GSTIN tax history matches verified government registry checks.',
    time: 'Yesterday, 11:15 AM',
    group: 'Yesterday',
    user: 'Groq AI Agent',
    status: 'Completed',
    priority: 'Low',
    invoice: 'INV-2026-085',
    icon: Sparkles,
    color: 'text-blue-500 bg-blue-500/10'
  },
  // THIS WEEK
  {
    id: 'evt-7',
    type: 'AI Analysis Completed',
    title: 'Groq Underwriting Completed',
    desc: 'OCR analysis completed. Score: 94/100, Assigned Risk Grade: A+.',
    time: '3 days ago',
    group: 'This Week',
    user: 'Groq Llama-3 8B',
    status: 'Completed',
    priority: 'High',
    invoice: 'INV-2026-085',
    icon: Cpu,
    color: 'text-pink-500 bg-pink-500/10'
  },
  {
    id: 'evt-8',
    type: 'Invoice Uploaded',
    title: 'New PDF Invoice Uploaded',
    desc: 'Raymond Ltd billing record scanned and submitted by TextilePro.',
    time: '3 days ago',
    group: 'This Week',
    user: 'TextilePro MSME',
    status: 'Pending',
    priority: 'High',
    invoice: 'INV-2026-085',
    icon: FileUp,
    color: 'text-primary-500 bg-primary-500/10'
  }
];

export default function Activity() {
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                          e.desc.toLowerCase().includes(search.toLowerCase()) ||
                          (e.invoice && e.invoice.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || e.type.toLowerCase().includes(typeFilter.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || e.priority === priorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  });

  const handleAction = (event) => {
    toast(`Viewing context for ${event.invoice || 'event'}`, {
      icon: '🔍',
      style: {
        borderRadius: '12px',
        background: '#333',
        color: '#fff'
      }
    });
  };

  return (
    <ContentContainer>
      <PageHeader 
        title="Workflow Timeline" 
        description="Track and audit every event happening across your invoice financing lifecycle."
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Events Today', value: '18 updates', text: '5 blockchain logs' },
          { label: 'Processing Speed', value: '4.2 hours', text: 'Upload to AI grade average' },
          { label: 'Avg Funding Duration', value: '2.4 days', text: 'Auctions average clearance' },
          { label: 'Completed Workflows', value: '124 deals', text: 'Escrow settlements finalized' }
        ].map((stat, idx) => (
          <div key={idx} className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">{stat.label}</span>
            <div className="text-xl font-display font-extrabold text-gray-900 dark:text-white">{stat.value}</div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">{stat.text}</span>
          </div>
        ))}
      </div>

      {/* Double Column Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Side: Timeline and filters */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Advanced Filter panel */}
          <div className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search events, invoice codes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-150 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-xs focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-150 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-xs focus:outline-none"
                >
                  <option value="all">All Events</option>
                  <option value="upload">Uploads</option>
                  <option value="bid">Bids</option>
                  <option value="nft">NFT Minting</option>
                  <option value="settlement">Settlement</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-150 dark:border-dark-border bg-gray-50/50 dark:bg-slate-900/30 text-xs focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grouped Timeline */}
          <div className="space-y-8 relative pl-6 sm:pl-8">
            {/* Timeline center line */}
            <div className="absolute left-[37px] top-4 bottom-4 w-px bg-gray-100 dark:bg-slate-800" />

            {['Today', 'Yesterday', 'This Week'].map(group => {
              const groupEvents = filteredEvents.filter(e => e.group === group);
              if (groupEvents.length === 0) return null;

              return (
                <div key={group} className="space-y-4">
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">{group}</h3>
                  {groupEvents.map(e => {
                    const Icon = e.icon;
                    return (
                      <motion.div 
                        key={e.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm flex gap-4 hover:shadow-md transition-shadow relative"
                      >
                        {/* Event icon overlay on timeline line */}
                        <div className={`absolute left-[-26px] sm:left-[-32px] top-6 h-8 w-8 rounded-full border border-white dark:border-dark-card flex items-center justify-center ${e.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug">{e.title}</h4>
                              <span className="text-[9px] text-gray-400 block mt-0.5">{e.time} · by {e.user}</span>
                            </div>
                            <div className="flex gap-1.5">
                              {e.invoice && (
                                <span className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/20 text-primary-600 text-[9px] font-bold">
                                  {e.invoice}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                e.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                                e.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-500/10 text-gray-500'
                              }`}>{e.priority}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-gray-500 leading-normal">{e.desc}</p>
                          
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={() => handleAction(e)}
                              className="py-1.5 px-3 rounded-lg border border-gray-100 dark:border-slate-800 text-[10px] font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-center gap-1"
                            >
                              <span>View Context</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Side: Sidebar Actions */}
        <div className="space-y-8">
          
          {/* Upcoming Actions */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800 pb-3">Upcoming Actions</h3>
            <div className="space-y-3.5">
              {[
                { name: 'Raymond Ltd verification', action: 'GST Check pending', class: 'text-amber-500' },
                { name: 'AltFin Yield Escrow release', action: 'Settlement ready', class: 'text-emerald-500' },
                { name: 'Raymond Ltd repayment due', action: 'Aug 12 repayment', class: 'text-primary-500' }
              ].map((action, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-gray-150 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/10 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold block">{action.name}</span>
                    <span className={`text-[10px] font-bold ${action.class}`}>{action.action}</span>
                  </div>
                  <button onClick={() => toast.success('Action queue loaded')} className="text-[10px] font-bold text-gray-400 hover:text-primary-500 transition">
                    Audit
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-primary-100 dark:border-primary-950 bg-gradient-to-b from-primary-50/20 to-white dark:from-primary-950/10 dark:to-dark-card p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm">Financing Quick Actions</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Upload Invoice', icon: FileUp },
                { label: 'Connect Wallet', icon: Wallet },
                { label: 'Open Marketplace', icon: Landmark }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => toast.success(`${item.label} opened.`)}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-gray-150/50 dark:border-slate-800 bg-white/50 dark:bg-dark-card/50 hover:bg-white transition text-left font-semibold text-gray-700 dark:text-gray-300"
                >
                  <item.icon className="h-4 w-4 text-primary-500" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </ContentContainer>
  );
}
