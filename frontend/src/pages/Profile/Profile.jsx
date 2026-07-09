import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, Wallet, Bell, Settings2, Activity,
  Edit3, Download, Copy, ExternalLink, Eye, EyeOff,
  RefreshCw, Lock, Smartphone, Monitor, Key, Upload,
  FileText, LogOut, Trash2, Sun, Moon, Check, BadgeCheck,
  Building2, Landmark, CheckSquare, ShieldCheck, BarChart3,
  Mail, Cpu, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ContentContainer from '@/components/layout/ContentContainer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

/* ─── Role metadata ─────────────────────────────────────────────────────── */
const ROLE_META = {
  msme:     { label: 'MSME Owner',             color: 'blue',    icon: Building2   },
  investor: { label: 'Verified Investor',      color: 'violet',  icon: Landmark    },
  buyer:    { label: 'Corporate Buyer',        color: 'emerald', icon: CheckSquare },
  admin:    { label: 'Platform Administrator', color: 'rose',    icon: ShieldCheck },
};
const ROLE_COLORS = {
  blue:    { badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',       bar: 'bg-blue-500',    ring: 'ring-blue-500'    },
  violet:  { badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', bar: 'bg-violet-500',  ring: 'ring-violet-500'  },
  emerald: { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', ring: 'ring-emerald-500' },
  rose:    { badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',       bar: 'bg-rose-500',    ring: 'ring-rose-500'    },
};

/* ─── Role-specific stats ────────────────────────────────────────────────── */
const ROLE_STATS = {
  msme:     [{ l: 'Health Score', v: '94/100' }, { l: 'Invoices', v: '28' }, { l: 'Active Funding', v: '3' }, { l: 'AI Grade', v: 'A+' }],
  investor: [{ l: 'Portfolio Value', v: '₹48.5L' }, { l: 'Avg Yield', v: '8.65%' }, { l: 'Investments', v: '8' }, { l: 'ROI', v: '+12.4%' }],
  buyer:    [{ l: 'Credit Rating', v: 'AAA' }, { l: 'Pending', v: '2 Invoices' }, { l: 'Monthly Paid', v: '₹18.4L' }, { l: 'Trust Score', v: '98.2%' }],
  admin:    [{ l: 'System Health', v: '99.9%' }, { l: 'Users', v: '184' }, { l: 'Fraud Flagged', v: '0' }, { l: 'AI Calls', v: '1,248' }],
};

/* ─── Shared micro-components ────────────────────────────────────────────── */
function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-slate-800/60 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-semibold text-gray-800 dark:text-gray-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-700'}`}>
      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

/* ─── NAV TABS ───────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',       label: 'Overview',       icon: User       },
  { id: 'security',       label: 'Security',        icon: Shield     },
  { id: 'wallet',         label: 'Wallet',          icon: Wallet     },
  { id: 'notifications',  label: 'Notifications',   icon: Bell       },
  { id: 'preferences',    label: 'Preferences',     icon: Settings2  },
  { id: 'activity',       label: 'Activity',        icon: Activity   },
  { id: 'danger',         label: 'Danger Zone',     icon: AlertTriangle },
];

/* ─── PANEL COMPONENTS ───────────────────────────────────────────────────── */

function OverviewPanel({ role, name, email, memberSince, roleColor, roleMeta }) {
  const RoleIcon = roleMeta.icon;
  return (
    <div className="space-y-6">
      {/* Identity card */}
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden shadow-sm">
        <div className="h-20 bg-gradient-to-br from-primary-600 via-indigo-600 to-violet-600 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_white_1px,_transparent_1px)] bg-[length:24px_24px]" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className={`h-16 w-16 rounded-xl border-4 border-white dark:border-dark-card bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg ring-2 ${roleColor.ring}`}>
              <span className="text-xl font-display font-black text-white">{name.charAt(0).toUpperCase()}</span>
            </div>
            <button onClick={() => toast.success('Export triggered')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition">
              <Download className="h-3.5 w-3.5" /> Export Card
            </button>
          </div>
          <div className="space-y-1 mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-display font-black text-gray-900 dark:text-white">{name}</h2>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor.badge}`}>
                <RoleIcon className="h-3 w-3" /> {roleMeta.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                <BadgeCheck className="h-3 w-3" /> KYC Verified
              </span>
            </div>
            <p className="text-xs text-gray-400">{email}</p>
          </div>
          {/* Profile completion */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-semibold text-gray-400">
              <span>Profile Completion</span><span>92%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1.1, ease: 'easeOut' }}
                className={`h-full rounded-full ${roleColor.bar}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(ROLE_STATS[role] ?? ROLE_STATS.msme).map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-4 relative overflow-hidden shadow-sm">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{s.l}</span>
            <span className="text-base font-display font-extrabold text-gray-900 dark:text-white">{s.v}</span>
            <div className={`absolute bottom-0 inset-x-0 h-0.5 ${roleColor.bar}`} />
          </div>
        ))}
      </div>

      {/* Account details */}
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Account Details</h3>
        <div className="grid sm:grid-cols-2 gap-x-10">
          <div>
            <InfoRow label="Full Name" value={name} />
            <InfoRow label="Email" value={email} />
            <InfoRow label="Phone" value="+91 98765 43210" />
          </div>
          <div>
            <InfoRow label="GST Number" value="29ABCDE1234F1Z5" mono />
            <InfoRow label="PAN" value="ABCDE1234F" mono />
            <InfoRow label="Member Since" value={memberSince} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityPanel() {
  return (
    <div className="space-y-4">
      {/* Score banner */}
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
        <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">A+</div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">Security Score: 94 / 100</p>
          <p className="text-[10px] text-gray-400 mt-0.5">2FA enabled · Strong password · Trusted device login</p>
        </div>
      </div>

      {/* Security items */}
      {[
        { label: 'Password', value: '••••••••••••', action: 'Change', icon: Lock },
        { label: 'Two-Factor Authentication', value: 'Enabled (TOTP)', action: 'Manage', icon: Smartphone },
        { label: 'Active Sessions', value: '2 devices', action: 'View', icon: Monitor },
        { label: 'Biometric Login', value: 'Not configured', action: 'Set Up', icon: Key },
      ].map((item) => (
        <div key={item.label} className="flex justify-between items-center p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
              <item.icon className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{item.value}</p>
            </div>
          </div>
          <button onClick={() => toast.success(`${item.action} initiated`)} className="text-xs font-bold text-primary-500 hover:underline px-3 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/20 transition">
            {item.action}
          </button>
        </div>
      ))}

      {/* Recent logins */}
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Recent Login Activity</h3>
        {[
          { device: 'Chrome · Windows 11', location: 'Mumbai, IN', time: 'Today 7:38 PM' },
          { device: 'Safari · iPhone 16 Pro', location: 'Mumbai, IN', time: 'Yesterday 11:14 AM' },
        ].map((d, i) => (
          <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-50 dark:border-slate-800/60 last:border-0">
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{d.device}</p>
              <p className="text-[10px] text-gray-400">{d.location} · {d.time}</p>
            </div>
            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Trusted</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletPanel() {
  const [showKey, setShowKey] = useState(false);
  const copy = (v) => { navigator.clipboard.writeText(v); toast.success('Copied!'); };

  return (
    <div className="space-y-4">
      {/* MetaMask */}
      <div className="rounded-2xl border border-primary-200 dark:border-primary-900 bg-primary-50/20 dark:bg-primary-950/10 p-5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">MetaMask</p>
            <p className="text-[10px] text-gray-400">Polygon POS Mainnet</p>
          </div>
          <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">● Connected</span>
        </div>
        <div className="space-y-2 text-xs">
          <InfoRow label="Wallet Address" value={
            <button onClick={() => copy('0x4aB8...f91C')} className="flex items-center gap-1 font-mono hover:text-primary-500 transition">
              0x4aB8...f91C <Copy className="h-3 w-3" />
            </button>
          } />
          <InfoRow label="MATIC Balance" value="2.48 MATIC" />
          <InfoRow label="Invoice NFTs" value="3 NFTs minted" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => toast('Opening Polygonscan...', { icon: '🔗' })} className="flex-1 py-2 rounded-xl border border-gray-150 dark:border-slate-800 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-center gap-1.5 transition">
            <ExternalLink className="h-3.5 w-3.5" /> View Explorer
          </button>
          <button onClick={() => toast.error('Wallet disconnected')} className="flex-1 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition">
            Disconnect
          </button>
        </div>
      </div>

      {/* WalletConnect — not connected */}
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">WalletConnect</p>
            <p className="text-[10px] text-gray-400">Not connected</p>
          </div>
          <button onClick={() => toast.success('WalletConnect initiated')} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition">
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const [notifs, setNotifs] = useState({
    'Email Notifications': true,
    'Push Notifications': true,
    'Marketplace Updates': true,
    'Funding Alerts': true,
    'Security Alerts': true,
    'Blockchain Events': false,
    'AI Insights': false,
    'SMS Alerts': false,
  });
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-1">
      {Object.entries(notifs).map(([key, val]) => (
        <div key={key} className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-slate-800/60 last:border-0">
          <span className="text-sm text-gray-700 dark:text-gray-300">{key}</span>
          <Toggle checked={val} onChange={(v) => setNotifs(p => ({ ...p, [key]: v }))} />
        </div>
      ))}
    </div>
  );
}

function PreferencesPanel() {
  const [theme, setTheme] = useState('system');
  const [animations, setAnimations] = useState(true);
  const [compact, setCompact] = useState(false);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Theme</h3>
        <div className="flex gap-3">
          {[{ k: 'light', icon: Sun, l: 'Light' }, { k: 'dark', icon: Moon, l: 'Dark' }, { k: 'system', icon: Monitor, l: 'System' }].map(({ k, icon: Icon, l }) => (
            <button key={k} onClick={() => setTheme(k)} className={`flex-1 py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 border-2 transition ${theme === k ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 text-primary-600' : 'border-gray-100 dark:border-slate-800 text-gray-400 hover:border-gray-200'}`}>
              <Icon className="h-5 w-5" /> {l}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm space-y-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Interface</h3>
        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-slate-800/60">
          <span className="text-sm text-gray-700 dark:text-gray-300">Motion & Animations</span>
          <Toggle checked={animations} onChange={setAnimations} />
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">Compact Mode</span>
          <Toggle checked={compact} onChange={setCompact} />
        </div>
      </div>
      <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Locale</h3>
        <InfoRow label="Language" value="English (India)" />
        <InfoRow label="Currency" value="INR (₹)" />
        <InfoRow label="Timezone" value="IST (UTC +5:30)" />
      </div>
    </div>
  );
}

function ActivityPanel() {
  const events = [
    { icon: Lock,     label: 'Password changed',             time: '2 days ago',   color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/20'   },
    { icon: Wallet,   label: 'MetaMask wallet connected',    time: '5 days ago',   color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/20' },
    { icon: FileText, label: 'Invoice INV-2026-085 uploaded',time: '1 week ago',   color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/20'     },
    { icon: BadgeCheck,label: 'KYC verification completed',  time: '2 weeks ago',  color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20'},
    { icon: User,     label: 'Profile onboarding completed', time: '1 month ago',  color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-950/20'},
  ];
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card p-5 shadow-sm">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100 dark:bg-slate-800" />
        <div className="space-y-5">
          {events.map((e, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className={`relative z-10 h-8 w-8 rounded-full ${e.bg} border border-gray-100 dark:border-slate-800 flex items-center justify-center flex-shrink-0 ${e.color}`}>
                <e.icon className="h-4 w-4" />
              </div>
              <div className="pt-1">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{e.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{e.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DangerPanel() {
  return (
    <div className="rounded-2xl border border-rose-100 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/10 p-5 shadow-sm space-y-4">
      <p className="text-xs text-gray-400">These actions are permanent and cannot be undone.</p>
      <div className="space-y-3">
        {[
          { label: 'Log Out Everywhere',  icon: LogOut,   danger: false },
          { label: 'Export My Data',      icon: Download, danger: false },
          { label: 'Deactivate Account',  icon: Monitor,  danger: true  },
          { label: 'Delete Account',      icon: Trash2,   danger: true  },
        ].map((item) => (
          <button key={item.label} onClick={() => item.danger ? toast.error('Email verification required') : toast.success(`${item.label} initiated`)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold text-left transition ${
              item.danger
                ? 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30'
                : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" /> {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN ───────────────────────────────────────────────────────────────── */
export default function Profile() {
  const { currentUser } = useAuth();
  const role = currentUser?.role ?? 'msme';
  const roleMeta = ROLE_META[role] ?? ROLE_META.msme;
  const roleColor = ROLE_COLORS[roleMeta.color];

  const name = currentUser?.displayName || currentUser?.profile?.companyName || 'User';
  const email = currentUser?.email || 'user@invoice2credit.ai';
  const memberSince = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'July 2026';

  const [activeTab, setActiveTab] = useState('overview');

  const panels = {
    overview:      <OverviewPanel role={role} name={name} email={email} memberSince={memberSince} roleColor={roleColor} roleMeta={roleMeta} />,
    security:      <SecurityPanel />,
    wallet:        <WalletPanel />,
    notifications: <NotificationsPanel />,
    preferences:   <PreferencesPanel />,
    activity:      <ActivityPanel />,
    danger:        <DangerPanel />,
  };

  return (
    <ContentContainer>
      <PageHeader title="Profile & Settings" description="Manage your identity, security and account preferences." />

      <div className="flex gap-6">

        {/* ── Left Tab Nav ──────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col gap-1 w-44 flex-shrink-0 sticky top-6 self-start">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === id
                  ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                  : id === 'danger'
                    ? 'text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* ── Mobile Tab Bar ────────────────────────────────────────────── */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 mb-2 w-full flex-shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap flex-shrink-0 transition ${
                activeTab === id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border text-gray-500'
              }`}>
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        {/* ── Active Panel ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {panels[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </ContentContainer>
  );
}
