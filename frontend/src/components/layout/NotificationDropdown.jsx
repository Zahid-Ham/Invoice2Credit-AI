import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShieldCheck, Cpu, Wallet, Inbox } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'AI Verification Completed',
    description: 'INV-2024-00847 risk analysis assigned A+ Grade.',
    time: '5m ago',
    icon: Cpu,
    color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30'
  },
  {
    id: 2,
    title: 'NFT Tokenized Successfully',
    description: 'Invoice uploaded is now minted on Polygon network.',
    time: '2h ago',
    icon: ShieldCheck,
    color: 'text-primary-500 bg-primary-50 dark:bg-primary-950/30'
  },
  {
    id: 3,
    title: 'New Bid Received',
    description: 'AltFin Capital placed a bid of ₹18,00,000.',
    time: '4h ago',
    icon: Wallet,
    color: 'text-success-500 bg-success-50 dark:bg-success-950/30'
  }
];

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 rounded-xl border border-gray-100 dark:border-dark-border text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition"
      >
        <Bell className="h-4.5 w-4.5" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center">
              <span className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Notifications</span>
              <button className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-widest">Mark all as read</button>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-dark-border max-h-72 overflow-y-auto">
              {MOCK_NOTIFICATIONS.map((n) => {
                const Icon = n.icon;
                return (
                  <div key={n.id} className="p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-gray-800 dark:text-white leading-snug">{n.title}</div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-normal">{n.description}</p>
                      <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-600 block">{n.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-dark-border text-center">
              <button className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 uppercase tracking-widest transition">
                <Inbox className="h-3.5 w-3.5" />
                <span>View all notifications</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
