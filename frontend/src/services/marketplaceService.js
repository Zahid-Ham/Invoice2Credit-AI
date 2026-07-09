import { db, isMock } from '../firebase/config';
import { collection, doc, getDocs, addDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';

const INITIAL_MARKETPLACE = [
  {
    id: 'INV-2026-001',
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

export const marketplaceService = {
  getMockMarketplace() {
    const saved = localStorage.getItem('mock_marketplace');
    if (!saved) {
      localStorage.setItem('mock_marketplace', JSON.stringify(INITIAL_MARKETPLACE));
      return INITIAL_MARKETPLACE;
    }
    return JSON.parse(saved);
  },

  async getListings() {
    if (isMock) {
      return this.getMockMarketplace();
    }
    try {
      const qSnapshot = await getDocs(collection(db, 'marketplace'));
      const res = [];
      qSnapshot.forEach(doc => {
        res.push({ docId: doc.id, ...doc.data() });
      });
      return res.length > 0 ? res : this.getMockMarketplace();
    } catch (e) {
      console.error("Firestore getListings failed:", e);
      return this.getMockMarketplace();
    }
  },

  async placeBid(docId, bidData) {
    if (isMock) {
      const list = this.getMockMarketplace();
      const updated = list.map(inv => {
        if (inv.id === docId) {
          const newBids = [bidData, ...inv.bids];
          const newProgress = Math.min(100, Math.floor(inv.progress + (bidData.bid / inv.amount) * 100));
          return {
            ...inv,
            bids: newBids,
            highestBid: Math.max(inv.highestBid, bidData.bid),
            progress: newProgress,
            status: newProgress === 100 ? 'Funded' : inv.status
          };
        }
        return inv;
      });
      localStorage.setItem('mock_marketplace', JSON.stringify(updated));
      return;
    }
    try {
      const docRef = doc(db, 'marketplace', docId);
      await updateDoc(docRef, bidData);
    } catch (e) {
      console.error("Firestore placeBid failed:", e);
      throw e;
    }
  },

  subscribeListings(callback) {
    if (isMock) {
      const interval = setInterval(() => {
        callback(this.getMockMarketplace());
      }, 3000);
      return () => clearInterval(interval);
    }
    return onSnapshot(collection(db, 'marketplace'), (snapshot) => {
      const res = [];
      snapshot.forEach(doc => {
        res.push({ docId: doc.id, ...doc.data() });
      });
      callback(res.length > 0 ? res : this.getMockMarketplace());
    });
  }
};
