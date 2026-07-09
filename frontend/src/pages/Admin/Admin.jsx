import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, CheckCircle2, AlertTriangle, Calendar, FileText, 
  ArrowUpRight, Clock, Plus, RefreshCw, Layers, ShieldCheck, 
  HelpCircle, Activity, Play, Lock, Trash2, Cpu, Sparkles, Terminal
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

const SYSTEM_GROWTH = [
  { name: '00:00', users: 45, load: 24 },
  { name: '04:00', users: 30, load: 18 },
  { name: '08:00', users: 80, load: 40 },
  { name: '12:00', users: 150, load: 75 },
  { name: '16:00', users: 190, load: 88 }
];

export default function Admin() {
  const [logs, setLogs] = useState([
    { id: '1', time: '19:30:12', msg: 'Groq AI Service connection established.', type: 'info' },
    { id: '2', time: '19:31:05', msg: 'Polygon Contract block #41785700 parsed successfully.', type: 'success' },
    { id: '3', time: '19:32:18', msg: 'Duplicate check completed for TextilePro Industries.', type: 'success' }
  ]);

  const handleRestartAI = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Reinitializing Groq API links...',
        success: 'Groq AI models successfully reloaded!',
        error: 'Service reinitialization failed.'
      }
    );
  };

  return (
    <ContentContainer>
      
      {/* Page Header */}
      <PageHeader 
        title="Platform Control Center" 
        description="Monitor system health, check AI API traffic, and coordinate platform access."
      />

      {/* Operations Tickers */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'System Health', value: '99.9%', color: 'text-success-500', subtitle: 'All APIs Online' },
          { label: 'Users Online', value: '184 Active', color: 'text-primary-500', subtitle: '4 roles connected' },
          { label: 'Funding Today', value: '₹18,40,000', color: 'text-violet-500', subtitle: 'Escrows active' },
          { label: 'Active Auctions', value: '4 Live', color: 'text-amber-500', subtitle: 'Bidding pools open' },
          { label: 'Polygon POS Status', value: 'Connected', color: 'text-cyan-500', subtitle: 'Block: 41785700' },
          { label: 'Groq AI latency', value: '280ms', color: 'text-pink-500', subtitle: 'Llama-3 model' }
        ].map((ticker, idx) => (
          <div key={idx} className="rounded-2xl border border-gray-150 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-1">
            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{ticker.label}</span>
            <div className={`text-base font-display font-extrabold ${ticker.color}`}>{ticker.value}</div>
            <span className="text-[9px] text-gray-500 dark:text-gray-400 block">{ticker.subtitle}</span>
          </div>
        ))}
      </div>

      {/* Split Operations Layout */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        
        {/* Left Column: Metrics & Charts */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: System Activity */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold">System API Traffic &amp; Load</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SYSTEM_GROWTH}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="load" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.06} strokeWidth={2} />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 2: Active System Logs */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold">Live System Logs</h3>
              <button 
                onClick={() => setLogs([
                  { id: Date.now().toString(), time: new Date().toTimeString().split(' ')[0], msg: 'Admin cleared and requested fresh API diagnostics.', type: 'info' }
                ])}
                className="text-[9px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition uppercase tracking-wider"
              >
                Clear logs
              </button>
            </div>
            
            <div className="space-y-3.5 font-mono text-[11px] text-gray-600 dark:text-gray-400 max-h-48 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4">
                  <span className="text-gray-400 flex-shrink-0">{log.time}</span>
                  <span className={log.type === 'success' ? 'text-success-500' : 'text-gray-700 dark:text-gray-300'}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: AI Config, Support & Actions */}
        <div className="space-y-8">
          
          {/* Section 3: AI Configuration */}
          <div className="rounded-2xl border border-primary-100 dark:border-primary-950 bg-gradient-to-b from-primary-50/30 to-white dark:from-primary-950/20 dark:to-dark-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-display font-bold text-sm">AI Underwriting Config</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Target Model</span>
                <span className="font-bold">Llama-3 8B (Groq)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">JSON Mode</span>
                <span className="font-bold text-success-500">Enabled ✓</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Confidence Threshold</span>
                <span className="font-bold">92.0% Min</span>
              </div>
            </div>
            
            <div className="pt-2">
              <button 
                onClick={handleRestartAI}
                className="w-full py-2.5 px-4 rounded-xl border border-primary-200 dark:border-primary-950 text-primary-600 dark:text-primary-400 text-xs font-bold hover:bg-primary-50/50 dark:hover:bg-primary-950/10 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Restart AI Models</span>
              </button>
            </div>
          </div>

          {/* Section 4: Pending Verifications */}
          <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold border-b border-gray-50 dark:border-slate-800 pb-3">Pending User Verifications</h3>
            <div className="space-y-3.5 text-xs">
              {[
                { name: 'Apex Logistics Ltd', role: 'MSME Partner', date: 'Just now' },
                { name: 'AltFin Yield syndicate', role: 'Investor Pool', date: '10m ago' }
              ].map((user, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/30">
                  <div>
                    <span className="font-semibold block">{user.name}</span>
                    <span className="text-[10px] text-gray-400">{user.role}</span>
                  </div>
                  <button 
                    onClick={() => toast.success(`${user.name} verified successfully`)}
                    className="text-[10px] text-primary-500 font-bold hover:underline"
                  >
                    Verify
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
