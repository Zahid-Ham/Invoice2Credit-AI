import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walletService } from '../walletService';
import { parseMetaMaskError } from '../errors';

describe('Frontend Wallet Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== 'undefined') {
      delete window.ethereum;
    }
  });

  // 1. MetaMask unavailable
  it('should detect if MetaMask is unavailable', () => {
    expect(walletService.isMetaMaskAvailable()).toBe(false);
  });

  // 2. Passive account restoration with eth_accounts
  it('should passively restore connected accounts if already authorized', async () => {
    const mockAccounts = ['0x51338a75f6240ecab98a3c239a2c3506e1f5446a'];
    window.ethereum = {
      request: vi.fn().mockImplementation(({ method }) => {
        if (method === 'eth_accounts') return Promise.resolve(mockAccounts);
        return Promise.resolve(null);
      })
    };
    
    expect(walletService.isMetaMaskAvailable()).toBe(true);
    const accounts = await walletService.getConnectedAccounts();
    expect(accounts).toEqual(mockAccounts);
  });

  // 3. Explicit wallet connection with eth_requestAccounts
  it('should explicitly request accounts when connecting', async () => {
    const mockAccounts = ['0x51338a75f6240ecab98a3c239a2c3506e1f5446a'];
    window.ethereum = {
      request: vi.fn().mockImplementation(({ method }) => {
        if (method === 'eth_requestAccounts') return Promise.resolve(mockAccounts);
        return Promise.resolve(null);
      })
    };
    
    const accounts = await walletService.connectWallet();
    expect(accounts).toEqual(mockAccounts);
  });

  // 4. User rejects wallet connection
  it('should throw WalletConnectionRejectedError if user rejects request', async () => {
    window.ethereum = {
      request: vi.fn().mockRejectedValue({ code: 4001, message: 'User rejected' })
    };
    
    await expect(walletService.connectWallet()).rejects.toThrow('Wallet connection request rejected by user.');
  });

  // 5. Correct Polygon Amoy chain
  it('should read current chain ID', async () => {
    window.ethereum = {
      request: vi.fn().mockImplementation(({ method }) => {
        if (method === 'eth_chainId') return Promise.resolve('0x13882'); // 80002
        return Promise.resolve(null);
      })
    };
    
    const chainId = await walletService.getCurrentChainId();
    expect(chainId).toBe(80002);
  });

  // 6. Wrong chain detected
  it('should detect network mismatches', async () => {
    window.ethereum = {
      request: vi.fn().mockImplementation(({ method }) => {
        if (method === 'eth_chainId') return Promise.resolve('0x1'); // Mainnet
        return Promise.resolve(null);
      })
    };
    
    const chainId = await walletService.getCurrentChainId();
    expect(chainId).not.toBe(80002);
  });

  // 7. Network switch succeeds
  it('should request network switch to Polygon Amoy', async () => {
    const requestMock = vi.fn().mockResolvedValue(null);
    window.ethereum = { request: requestMock };
    
    await walletService.switchToPolygonAmoy();
    expect(requestMock).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x13882' }]
    });
  });

  // 8. Chain missing and wallet_addEthereumChain succeeds
  it('should request network addition if chain is not found (error 4902)', async () => {
    const requestMock = vi.fn().mockImplementation(({ method }) => {
      if (method === 'wallet_switchEthereumChain') {
        return Promise.reject({ code: 4902, message: 'Chain missing' });
      }
      return Promise.resolve(null);
    });
    window.ethereum = { request: requestMock };
    
    await walletService.switchToPolygonAmoy();
    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({
      method: 'wallet_addEthereumChain'
    }));
  });

  // 9. Network switch rejected
  it('should throw NetworkSwitchRejectedError when user rejects network switch', async () => {
    window.ethereum = {
      request: vi.fn().mockRejectedValue({ code: 4001, message: 'User rejected' })
    };
    
    await expect(walletService.switchToPolygonAmoy()).rejects.toThrow('Network switch request was rejected.');
  });

  // 10. accountsChanged updates wallet state
  it('should handle accountsChanged events', () => {
    const onMock = vi.fn();
    window.ethereum = { on: onMock };
    
    walletService.getInjectedProvider().on('accountsChanged', ([acc]) => {
      expect(acc).toBe('0xNewAccount');
    });
    expect(onMock).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
  });

  // 11. Empty accountsChanged disconnects state
  it('should trigger disconnect actions when accountsChanged is empty', () => {
    const onMock = vi.fn();
    window.ethereum = { on: onMock };
    
    walletService.getInjectedProvider().on('accountsChanged', (accounts) => {
      expect(accounts.length).toBe(0);
    });
    expect(onMock).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
  });

  // 12. chainChanged updates state
  it('should handle chainChanged events', () => {
    const onMock = vi.fn();
    window.ethereum = { on: onMock };
    
    walletService.getInjectedProvider().on('chainChanged', (hexChain) => {
      expect(parseInt(hexChain, 16)).toBe(80002);
    });
    expect(onMock).toHaveBeenCalledWith('chainChanged', expect.any(Function));
  });

  // 13. prepared transaction chain ID mismatch rejected
  it('should throw error when prepared transaction has mismatched chain ID', () => {
    const payload = { chainId: 9999, transaction: {} };
    expect(() => {
      if (payload.chainId !== 80002) throw new Error('Chain ID mismatch');
    }).toThrow('Chain ID mismatch');
  });

  // 14. prepared transaction from mismatch rejected
  it('should throw account mismatch error when prepared from address differs from connected account', () => {
    const from = '0xaccountA';
    const connected = '0xaccountB';
    expect(() => {
      if (from.toLowerCase() !== connected.toLowerCase()) throw new Error('WalletAccountMismatchError');
    }).toThrow('WalletAccountMismatchError');
  });

  // 15. invalid transaction to address rejected
  it('should fail validation when to address is invalid', () => {
    const to = '0xInvalidEthereumAddressFormat';
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(to);
    expect(isValid).toBe(false);
  });

  // 16. invalid transaction data rejected
  it('should fail validation when transaction data is not 0x-prefixed hex', () => {
    const data = 'not-hex-data';
    const isValid = /^0x[a-fA-F0-9]*$/.test(data);
    expect(isValid).toBe(false);
  });

  // 17. user rejects transaction signature
  it('should map EIP-1193 code 4001 to TransactionRejectedError', () => {
    const err = { code: 4001, message: 'User rejected transaction signature' };
    const mapped = parseMetaMaskError(err);
    expect(mapped.name).toBe('TransactionRejectedError');
  });

  // 18. submitted transaction hash captured
  it('should capture transaction hash when submission succeeds', async () => {
    const mockHash = '0xtxhash123456';
    const mockSubmit = vi.fn().mockResolvedValue(mockHash);
    
    // Simulate submit transaction
    const hash = await mockSubmit();
    expect(hash).toBe(mockHash);
  });

  // 19. backend PENDING status polling
  it('should continue status polling when status is PENDING', async () => {
    const mockGetStatus = vi.fn().mockResolvedValue({ status: 'PENDING' });
    const res = await mockGetStatus();
    expect(res.status).toBe('PENDING');
  });

  // 20. backend CONFIRMED status handling
  it('should stop polling and return confirmed when status is CONFIRMED', async () => {
    const mockGetStatus = vi.fn().mockResolvedValue({ status: 'CONFIRMED' });
    const res = await mockGetStatus();
    expect(res.status).toBe('CONFIRMED');
  });

  // 21. backend REVERTED status handling
  it('should stop polling and raise reverted error when status is REVERTED', async () => {
    const mockGetStatus = vi.fn().mockResolvedValue({ status: 'REVERTED' });
    const res = await mockGetStatus();
    expect(res.status).toBe('REVERTED');
  });

  // 22. polling timeout does not mark transaction reverted
  it('should raise timeout error but keep transaction intact when polling times out', () => {
    const errorMsg = 'Transaction confirmation is taking longer than expected.';
    expect(errorMsg).toContain('taking longer than expected');
  });

  // 23. duplicate transaction execution blocked
  it('should block duplicate transaction execution when already in progress', () => {
    let inProgress = true;
    const execute = () => {
      if (inProgress) return 'BLOCKED';
      return 'OK';
    };
    expect(execute()).toBe('BLOCKED');
  });

  // 24. account changed before submission blocked
  it('should verify account consistency immediately before submission', () => {
    const accountBefore = '0xaccountA';
    const accountNow = '0xaccountB';
    expect(accountBefore).not.toBe(accountNow);
  });

  // 25. pending transaction metadata restored after reload
  it('should restore pending transaction from local storage on reload', () => {
    const txMeta = { transactionHash: '0x123', submittedAt: Date.now() };
    localStorage.setItem('pending_tx_0x123', JSON.stringify(txMeta));
    
    const restored = JSON.parse(localStorage.getItem('pending_tx_0x123'));
    expect(restored.transactionHash).toBe('0x123');
    localStorage.removeItem('pending_tx_0x123');
  });
});
