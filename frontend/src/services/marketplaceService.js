/**
 * marketplaceService.js
 * ─────────────────────
 * Data access layer for Marketplace listings.
 *
 * Priority:
 *   1. Backend API  (GET /api/v1/marketplace/listings)  — real Firestore data
 *   2. Firestore onSnapshot subscription               — live bid updates
 *   3. Local mock fallback                             — offline / dev mode
 */

import { db, isMock } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// ─── Mock fallback ───────────────────────────────────────────────────────────

const INITIAL_MARKETPLACE = [
  {
    id: 'INV-2026-001',
    docId: 'INV-2026-001',
    buyer: 'Tata Motors Group',
    industry: 'Manufacturing',
    amount: 1240000,
    required: 1240000,
    progress: 75,
    grade: 'A+',
    yieldRate: 8.4,
    dueDate: '2026-09-12',
    age: 18,
    confidence: 99.4,
    status: 'Live Auction',
    owner: 'TextilePro Industries',
    tokenUrl: '0x8f4c2e...88ab',
    minBid: 950000,
    highestBid: 930000,
    timeRemaining: '14h 22m',
    bids: [
      { investor: 'AltFin Capital', bid: 930000, yield: 8.2, date: '2h ago' },
      { investor: 'Rahul Sharma', bid: 900000, yield: 8.4, date: '4h ago' }
    ]
  },
  {
    id: 'INV-2026-002',
    docId: 'INV-2026-002',
    buyer: 'Reliance Retail Ltd',
    industry: 'Retail',
    amount: 850000,
    required: 850000,
    progress: 40,
    grade: 'A',
    yieldRate: 8.9,
    dueDate: '2026-10-05',
    age: 22,
    confidence: 98.2,
    status: 'Live Auction',
    owner: 'Apex Logistics Ltd',
    tokenUrl: '0x7f3c1b...99cd',
    minBid: 360000,
    highestBid: 340000,
    timeRemaining: '1d 08h',
    bids: [
      { investor: 'Karan Mehra', bid: 340000, yield: 8.8, date: '1h ago' }
    ]
  },
  {
    id: 'INV-2026-003',
    docId: 'INV-2026-003',
    buyer: 'Infosys Tech Corp',
    industry: 'IT Services',
    amount: 1420000,
    required: 1420000,
    progress: 90,
    grade: 'A+',
    yieldRate: 7.9,
    dueDate: '2026-08-30',
    age: 12,
    confidence: 99.8,
    status: 'Ending Soon',
    owner: 'Bytes & Code Partners',
    tokenUrl: '0x9d4e2a...77ef',
    minBid: 1300000,
    highestBid: 1278000,
    timeRemaining: '2h 15m',
    bids: [
      { investor: 'Pranav Shah', bid: 1278000, yield: 7.8, date: '30m ago' },
      { investor: 'Alpha Trust Yield', bid: 1200000, yield: 7.9, date: '1h ago' }
    ]
  }
];

function getMockMarketplace() {
  const saved = localStorage.getItem('mock_marketplace');
  if (!saved) {
    localStorage.setItem('mock_marketplace', JSON.stringify(INITIAL_MARKETPLACE));
    return INITIAL_MARKETPLACE;
  }
  return JSON.parse(saved);
}

// ─── Normalise a backend listing document to the UI field shape ──────────────
function normaliseDoc(raw) {
  return {
    docId:         raw.docId         || raw.invoiceId || raw.id,
    id:            raw.id            || raw.invoiceId,
    invoiceId:     raw.invoiceId     || raw.id,
    buyer:         raw.buyer         || raw.buyerName  || 'Unknown Buyer',
    owner:         raw.owner         || raw.sellerName || 'Unknown Seller',
    industry:      raw.industry      || 'General',
    amount:        Number(raw.amount || 0),
    required:      Number(raw.required || raw.amount || 0),
    progress:      Number(raw.progress || 0),
    grade:         raw.grade         || 'B',
    yieldRate:     Number(raw.yieldRate || raw.expectedInvestorYield || 12),
    dueDate:       raw.dueDate       || '',
    age:           raw.age           || 0,
    confidence:    Number(raw.confidence || 85),
    status:        raw.status        || 'Live Auction',
    tokenUrl:      raw.tokenUrl      || raw.invoiceHash || '0x...',
    minBid:        Number(raw.minBid  || 0),
    highestBid:    Number(raw.highestBid || 0),
    timeRemaining: raw.timeRemaining || '3d 12h',
    bids:          Array.isArray(raw.bids) ? raw.bids : [],
    listingId:     raw.listingId     || '',
    createdAt:     raw.createdAt     || '',
    investorVisibility: raw.investorVisibility !== false
  };
}

// ─── Public service object ───────────────────────────────────────────────────
export const marketplaceService = {

  /**
   * One-time fetch of all listings from the backend API.
   * Falls back to Firestore direct query or local mock on error.
   */
  async getListings() {
    try {
      const res = await fetch(`${API_BASE}/v1/marketplace/listings`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const backendListings = (json.listings || []).map(normaliseDoc);
      // If backend returned real data, persist to localStorage as cache
      if (backendListings.length > 0) {
        localStorage.setItem('mock_marketplace', JSON.stringify(backendListings));
        return backendListings;
      }
      // Backend empty — fall through to mock
    } catch (err) {
      console.warn('[marketplaceService] Backend fetch failed, trying Firestore:', err.message);
    }

    // Fallback: Firestore direct
    if (!isMock && db) {
      try {
        const { getDocs, collection: col } = await import('firebase/firestore');
        const snap = await getDocs(col(db, 'marketplace'));
        const docs = [];
        snap.forEach(d => docs.push(normaliseDoc({ docId: d.id, ...d.data() })));
        if (docs.length > 0) return docs;
      } catch (fsErr) {
        console.warn('[marketplaceService] Firestore fallback failed:', fsErr.message);
      }
    }

    return getMockMarketplace();
  },

  /**
   * Real-time Firestore subscription — used by Marketplace.jsx.
   * If Firestore not available falls back to a polled mock interval.
   */
  subscribeListings(callback) {
    // First load data via API immediately
    this.getListings().then(data => callback(data));

    // Then subscribe to Firestore for live bid updates
    if (!isMock && db) {
      try {
        const unsub = onSnapshot(collection(db, 'marketplace'), (snapshot) => {
          const docs = [];
          snapshot.forEach(d => docs.push(normaliseDoc({ docId: d.id, ...d.data() })));
          if (docs.length > 0) callback(docs);
        });
        return unsub;
      } catch (err) {
        console.warn('[marketplaceService] onSnapshot failed, using poll mode:', err.message);
      }
    }

    // Mock polling fallback (no Firestore)
    const interval = setInterval(() => {
      callback(getMockMarketplace());
    }, 5000);
    return () => clearInterval(interval);
  },

  /**
   * Place a bid via the backend API with Firestore fallback.
   */
  async placeBid(docId, bidData) {
    // Try backend API first
    try {
      const res = await fetch(`${API_BASE}/v1/marketplace/${docId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investorId: bidData.investorId,
          bidAmount: bidData.bidAmount,
          expectedYield: bidData.expectedYield
        })
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const errMsg = errorJson.detail || `Server returned status ${res.status}`;
        throw new Error(errMsg);
      }
      return await res.json();
    } catch (err) {
      // If the error message came from backend response, throw it immediately to show user
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      console.warn('[marketplaceService] Bid via API failed, using local mock:', err.message);
    }

    // Local mock fallback
    const list = getMockMarketplace();
    const updated = list.map(inv => {
      if (inv.id === docId || inv.docId === docId) {
        const newBids = [bidData, ...(inv.bids || [])];
        const newProgress = Math.min(100, Math.floor((inv.progress || 0) + (bidData.bid / inv.amount) * 100));
        return {
          ...inv,
          bids: newBids,
          highestBid: Math.max(inv.highestBid || 0, bidData.bid),
          progress: newProgress,
          status: newProgress >= 100 ? 'Funded' : inv.status
        };
      }
      return inv;
    });
    localStorage.setItem('mock_marketplace', JSON.stringify(updated));
  }
};
