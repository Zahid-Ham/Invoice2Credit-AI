/**
 * investorService.js
 * ──────────────────
 * API Service for Investor Dashboard & Portfolio metrics.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export const investorService = {
  async getDashboard(investorId) {
    try {
      const res = await fetch(`${API_BASE}/v1/investor/dashboard?investorId=${investorId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[investorService] getDashboard failed, returning fallback:', err.message);
      return null;
    }
  },

  async getPortfolio(investorId) {
    try {
      const res = await fetch(`${API_BASE}/v1/investor/portfolio?investorId=${investorId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[investorService] getPortfolio failed, returning fallback:', err.message);
      return null;
    }
  },

  async getTransactions(investorId) {
    try {
      const res = await fetch(`${API_BASE}/v1/investor/transactions?investorId=${investorId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[investorService] getTransactions failed, returning empty:', err.message);
      return [];
    }
  },

  async getPerformance(investorId) {
    try {
      const res = await fetch(`${API_BASE}/v1/investor/performance?investorId=${investorId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[investorService] getPerformance failed, returning fallback:', err.message);
      return null;
    }
  }
};
