/**
 * adminService.js
 * ────────────────
 * API Service for Platform Administrator operations.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export const adminService = {
  async getDashboard() {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/dashboard`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[adminService] getDashboard failed, returning fallback:', err.message);
      return null;
    }
  },

  async getUsers() {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/users`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[adminService] getUsers failed, returning empty:', err.message);
      return [];
    }
  },

  async getInvoices() {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/invoices`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[adminService] getInvoices failed, returning empty:', err.message);
      return [];
    }
  },

  async getMarketplace() {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/marketplace`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[adminService] getMarketplace failed, returning empty:', err.message);
      return [];
    }
  },

  async getAnalytics() {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/analytics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[adminService] getAnalytics failed, returning fallback:', err.message);
      return null;
    }
  },

  async verifyBusiness(userId, verified = True) {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/verify-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, verified })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[adminService] verifyBusiness failed:', err.message);
      throw err;
    }
  },

  async suspendUser(userId, suspend = True) {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/suspend-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, suspend })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[adminService] suspendUser failed:', err.message);
      throw err;
    }
  },

  async approveListing(listingId, approve = true) {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/approve-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, approve })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[adminService] approveListing failed:', err.message);
      throw err;
    }
  },

  /**
   * POST /v1/admin/invoices/{invoiceId}/decision
   * Records a verifier decision (APPROVED / REJECTED / REQUEST_REVIEW).
   */
  async recordVerifierDecision(invoiceId, decision, reason = '') {
    try {
      const res = await fetch(`${API_BASE}/v1/admin/invoices/${invoiceId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[adminService] recordVerifierDecision failed:', err.message);
      throw err;
    }
  },

  /**
   * GET /v1/invoices/{invoiceId}/analysis
   * Returns AI + deterministic risk analysis for a single invoice.
   */
  async getInvoiceAnalysis(invoiceId) {
    try {
      const res = await fetch(`${API_BASE}/v1/invoices/${invoiceId}/analysis`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[adminService] getInvoiceAnalysis failed:', err.message);
      return null;
    }
  }
};

