/**
 * buyerService.js
 * ────────────────
 * API Service for Corporate Buyer confirmations & repayments.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export const buyerService = {
  async getDashboard(buyerName) {
    try {
      const res = await fetch(`${API_BASE}/v1/buyer/dashboard?buyerName=${encodeURIComponent(buyerName)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[buyerService] getDashboard failed, returning default:', err.message);
      return null;
    }
  },

  async getInvoices(buyerName) {
    try {
      const res = await fetch(`${API_BASE}/v1/buyer/invoices?buyerName=${encodeURIComponent(buyerName)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[buyerService] getInvoices failed, returning empty:', err.message);
      return [];
    }
  },

  async approveInvoice(invoiceId) {
    try {
      const res = await fetch(`${API_BASE}/v1/buyer/approve/${invoiceId}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.detail || `Server error approving invoice`);
      }
      return await res.json();
    } catch (err) {
      console.error('[buyerService] approveInvoice failed:', err.message);
      throw err;
    }
  },

  async rejectInvoice(invoiceId) {
    try {
      const res = await fetch(`${API_BASE}/v1/buyer/reject/${invoiceId}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.detail || `Server error rejecting invoice`);
      }
      return await res.json();
    } catch (err) {
      console.error('[buyerService] rejectInvoice failed:', err.message);
      throw err;
    }
  },

  async settlePayment(invoiceId) {
    try {
      const res = await fetch(`${API_BASE}/v1/buyer/payment/${invoiceId}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.detail || `Server error settling payment`);
      }
      return await res.json();
    } catch (err) {
      console.error('[buyerService] settlePayment failed:', err.message);
      throw err;
    }
  }
};
