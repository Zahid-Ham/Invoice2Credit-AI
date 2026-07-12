# Backend Application & Blockchain Synchronization Architecture

This document describes the design, entity relationships, and status propagation flows for the end-to-end synchronization layer connecting Firestore application documents with Polygon Amoy on-chain event logs.

## 1. Lifecycle Sequence Flow
```
FIRESTORE INVOICE (status: PENDING)
        ↓
AI ANALYSIS & COMPLIANCE VERIFICATION
        ↓ (status: VERIFIED)
PLATFORM MINT TRANSACTION (InvoiceNFT)
        ↓
InvoiceMinted EVENT DECODED
        ↓ (status: TOKENIZED)
TOKEN ID SYNCED TO FIRESTORE
        ↓
AuctionCreated EVENT DECODED (InvoiceMarketplace)
        ↓ (status: FINANCING_OPEN)
AUCTION ID SYNCED TO FIRESTORE
        ↓
BidPlaced EVENTS DECODED
        ↓
AuctionClosed & DealCreated DECODED
        ↓ (status: FINANCING_PARTNER_SELECTED / AWAITING_INVESTOR_FUNDING)
DEAL ID SYNCED TO FIRESTORE
        ↓
DealFunded EVENT DECODED (InvoiceEscrow)
        ↓ (status: FUNDED)
ESCROW FUNDED STATE SYNCED TO FIRESTORE
        ↓
FundingReleased EVENT DECODED
        ↓ (status: FINANCING_DISBURSED)
DISBURSED STATE SYNCED TO FIRESTORE
        ↓
InvoiceSettled EVENT DECODED
        ↓ (status: SETTLED)
SETTLED STATE SYNCED TO FIRESTORE
```

## 2. Structural Authority Division
- **Blockchain**: The absolute single source of truth for financial balances, ownership status, bidder interest, and escrow lockups.
- **Firestore**: Represents the high-performance application cache and projection layer, joining rich unstructured data (AI audit flags, invoices PDFs, buyer descriptions) with the on-chain reference pointers (`tokenId`, `auctionId`, `dealId`).
- **React Presentation Layer**: Orchestrates client-signed transactions using MetaMask and pulls combined views from Firestore and read RPC queries.

## 3. Confirmed Event Synchronization
- The sync handler `/api/v1/blockchain/transactions/{tx_hash}/sync` processes transactions only after confirming `receipt.status == 1`.
- Any reverted or pending transactions are rejected automatically.

## 4. Idempotency and Deduplication
- All synchronization operations use the unique transaction hash as the database key in the `blockchainTransactions` collection.
- Re-running the sync endpoint on an already processed transaction returns the cached result instantly without modifying states or incrementing logs.

## 5. Bounded Retry Behavior
- Client transaction failures in synchronization register a pending retry log inside `failed_sync_{hash}` within `localStorage`.
- Upon application load, background threads retry the sync endpoints up to 5 times. No duplicate blockchain transaction submissions are triggered by sync failures.

## 6. Live vs Mock Data Mode
- Defined by the `VITE_DATA_MODE` variable.
- In `live` mode, local fallbacks are disabled. RPC connection failures result in connection-loss errors instead of showing fake mock lists.

## 7. Data Join Layer
- The frontend dynamically joins Firestore invoice properties (e.g. `buyerName`, `creditGrade`) with live contract values from `deals()` or `auctions()` using the synchronized index fields, keeping private business details off the public ledger.

## 8. Why this is not a full blockchain indexer
- This synchronization layer works on-demand based on application-initiated events and transaction receipts.
- It does not crawl block ranges continuously, minimizing network load and RPC traffic.
