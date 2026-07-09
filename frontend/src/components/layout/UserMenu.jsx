import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, ShieldAlert, LogOut, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function UserMenu() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const name = currentUser?.displayName || currentUser?.email || 'User';
  const roleName = currentUser?.role ? currentUser.role.toUpperCase() : 'NO ROLE';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2.5 text-left focus:outline-none"
      >
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-md ${
          !currentUser?.photoURL ? 'bg-gradient-to-br from-primary-500 to-indigo-600' : 'bg-transparent'
        }`}>
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt={name} className="h-full w-full rounded-xl object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="hidden sm:flex flex-col justify-center">
          <div className="text-xs font-bold text-gray-800 dark:text-white leading-normal">{name}</div>
          <div className="mt-0.5">
            <span className="inline-block px-1.5 py-0.5 rounded border border-primary-100 dark:border-primary-900/30 bg-primary-50 dark:bg-primary-950/20 text-[9px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest leading-none">
              {roleName}
            </span>
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl z-50 overflow-hidden"
          >
            {/* Header info */}
            <div className="p-4 border-b border-gray-100 dark:border-dark-border">
              <div className="text-xs font-semibold text-gray-400">Signed in as</div>
              <div className="text-xs font-bold text-gray-800 dark:text-white truncate">{currentUser?.email}</div>
            </div>

            <div className="p-1.5 space-y-0.5">
              <Link
                to="/app/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition"
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>

              <Link
                to="/onboarding"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Switch Portal Role</span>
              </Link>
            </div>

            <div className="p-1.5 border-t border-gray-100 dark:border-dark-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
