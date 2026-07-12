import { auth, isMock } from '../firebase/config';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (!isMock && auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Local / offline demo mode bypass using user uid
    const mockUser = localStorage.getItem('mock_current_user');
    if (mockUser) {
      const user = JSON.parse(mockUser);
      headers['Authorization'] = `Bearer ${user.uid}`;
    }
  }
  return headers;
}

export const blockchainService = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/v1/blockchain/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch health`);
    return await res.json();
  },
  // Marketplace Actions
  async prepareCreateAuction(tokenId, minimumFundingAmount, duration, sellerAddress) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/auctions/prepare-create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tokenId, minimumFundingAmount, duration, sellerAddress })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}: Failed to prepare auction listing`);
    }
    return await res.json();
  },

  async preparePlaceBid(auctionId, fundingAmount, discountRate, bidderAddress) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/auctions/prepare-bid`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ auctionId, fundingAmount, discountRate, bidderAddress })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}: Failed to prepare place bid`);
    }
    return await res.json();
  },

  async prepareCloseAuction(auctionId, callerAddress) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/auctions/prepare-close`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ auctionId, callerAddress })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}: Failed to prepare close auction`);
    }
    return await res.json();
  },

  // Escrow Actions
  async prepareFundDeal(dealId, callerAddress) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/escrow/deals/prepare-fund`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ dealId, callerAddress })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}: Failed to prepare funding`);
    }
    return await res.json();
  },

  async prepareReleaseFunding(dealId, callerAddress) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/escrow/deals/prepare-release`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ dealId, callerAddress })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}: Failed to prepare release funding`);
    }
    return await res.json();
  },

  async prepareSettleInvoice(dealId, callerAddress) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/escrow/deals/prepare-settle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ dealId, callerAddress })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}: Failed to prepare invoice settlement`);
    }
    return await res.json();
  },

  // Read Queries
  async getAuctionDetails(auctionId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/auctions/${auctionId}`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to get auction details`);
    return await res.json();
  },

  async getAuctionBids(auctionId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/auctions/${auctionId}/bids`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to get auction bids`);
    return await res.json();
  },

  async getDealDetails(dealId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/escrow/deals/${dealId}`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to get escrow deal details`);
    return await res.json();
  },

  async getNextAuctionId() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/next-id`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to get next auction ID`);
    return await res.json();
  },

  async getNextDealId() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/escrow/next-id`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to get next deal ID`);
    return await res.json();
  },

  async getTokenIdByHash(invoiceHash) {
    const res = await fetch(`${API_BASE}/v1/blockchain/token-id/${invoiceHash}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to get token ID for hash`);
    return await res.json();
  },

  async getActiveAuctionForToken(tokenId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/active-auction/${tokenId}`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to get active auction for token`);
    return await res.json();
  },

  // Transaction Queries
  async getTransactionStatus(txHash) {
    const res = await fetch(`${API_BASE}/v1/blockchain/transactions/${txHash}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to query transaction status`);
    return await res.json();
  },

  async decodeTransactionEvents(txHash) {
    const res = await fetch(`${API_BASE}/v1/blockchain/transactions/${txHash}/events`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to decode transaction events`);
    return await res.json();
  },

  async syncTransaction(txHash) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/blockchain/transactions/${txHash}/sync`, {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}: Failed to synchronize transaction`);
    }
    return await res.json();
  },

  async mintApprovedInvoice(invoiceId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/blockchain/invoices/${invoiceId}/mint`, {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.message || `HTTP ${res.status}: Minting failed`);
    }
    return await res.json();
  },

  async prepareApproveMarketplace(tokenId, ownerAddress) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/auctions/prepare-approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tokenId, ownerAddress })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.message || `HTTP ${res.status}: Failed to prepare approval`);
    }
    return await res.json();
  },

  async checkTokenApproved(tokenId) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/v1/marketplace/tokens/${tokenId}/approved`, {
      method: 'GET',
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to check token approval`);
    return await res.json();
  }
};
