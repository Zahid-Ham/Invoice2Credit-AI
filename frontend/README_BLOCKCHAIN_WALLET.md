# Invoice2Credit AI - Frontend MetaMask Wallet Integration Foundation

This directory houses the reusable blockchain connection, network configuration, and transaction execution components.

## Architecture

```
User Action (Click list/bid/settle)
               │
               ▼
[ Blockchain Write Readiness Guard ]
  (Checks: Firebase User Auth AND MetaMask Installed AND Wallet Connected AND Correct Network)
               │
               ▼
  [ API Transaction Preparation ] 
  (Requests unsigned transaction payload from FastAPI backend)
               │
               ▼
   [ Payload Validation Layer ] 
  (Validates to, data, chainId; asserts active account matches transaction.from)
               │
               ▼
     [ MetaMask Submission ] 
  (Triggers MetaMask window.ethereum signature popup)
               │
               ▼
[ Transaction Hash Receipt Polling ]
  (Polls /v1/blockchain/transactions/{hash} status dynamically)
               │
               ▼
   [ Confirmed / Reverted Events ]
  (Decodes Solidity log events and updates the client UI state)
```

---

## Technical Details

### 1. Network Switch & Addition Fallback
Metamask network checks are strictly numeric (decimal `80002` / hex `0x13882` for Polygon Amoy). If a network mismatch is detected:
- The wallet switches automatically using `wallet_switchEthereumChain`.
- If the network is missing from the MetaMask extension (EIP-1193 error `4902`), it automatically adds Polygon Amoy using `wallet_addEthereumChain`.

### 2. Double Submission & Mismatch Protection
- **Account Mismatch Check**: Before sending the transaction payload to MetaMask, the provider fetches the *active* wallet account. If it differs from the backend-prepared `from` parameter, the transaction is rejected immediately without launching a signature prompt.
- **In-flight Guard**: When a transaction is in state `PREPARING`, `AWAITING_SIGNATURE`, or `CONFIRMING`, duplicate triggers are disabled at the hook execution level.

### 3. State Management Hooks
The `useBlockchainTransaction` React Hook manages the transaction state lifecycle (`IDLE` -> `PREPARING` -> `AWAITING_SIGNATURE` -> `SUBMITTED` -> `CONFIRMING` -> `CONFIRMED`/`FAILED`) and polls the backend receipt tracker every 3 seconds.

### 4. Persistence
Submitted transactions are persisted in `localStorage` by their transaction hash. If the user refreshes the page, the application automatically restores the status checker and resumes polling.

---

## Development Integration Panel

In development mode (`import.meta.env.DEV`), the **Blockchain Explorer** page (`/app/blockchain`) renders a control panel to inspect connection state, active wallets, network compliance, balance, and backend connectivity without performing write transactions.
