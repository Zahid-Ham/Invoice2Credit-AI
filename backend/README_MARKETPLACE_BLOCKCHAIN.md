# Invoice2Credit AI - Marketplace and Escrow Integration Layer

This layer integrates the FastAPI backend service with the `InvoiceMarketplace` and `InvoiceEscrow` smart contracts.

## Architecture

```
User (Supplier / Investor / Buyer)
               │
               ▼
     [ Firebase Authentication ]
               │
               ▼
[ FastAPI Routing & Input Validation ]
               │
               ▼
 [ Transaction Builder Infrastructure ] 
               │
               ▼
  [ Unsigned Transaction Payload ] (JSON response)
               │
               ▼
      [ React / MetaMask ] (Client-side)
               │
               ▼
      [ User Signs & Sends ] ───► [ Polygon Amoy / Hardhat ]
                                          │
                                          ▼
 [ FastAPI Transaction Receipt Tracking ] ◄── [ Transaction Hash ]
               │
               ▼
  [ Log Event Decoders & State Update ]
```

---

## Transaction Authority Boundaries

To maintain decentralized principles and protect user custody:
1. **PLATFORM_SIGNED**: Used only for trusted background processes such as verified invoice NFT minting (`mintInvoice` on `InvoiceNFT`), signed by the backend platform signer.
2. **USER_WALLET_SIGNED**: Used for all client operations. The backend does **not** sign or broadcast these transactions. Instead, it constructs the unsigned transaction payload containing the `to` address, `data` (encoded calldata), and `value` (in wei), leaving the signature and gas execution to MetaMask.
3. **READ_ONLY**: Basic public view calls executed synchronously against the on-chain provider without transaction fees.

---

## Endpoint Matrix

### Marketplace Operations (`/api/v1/marketplace`)
- `GET /auctions/{auctionId}`: Fetch auction details (token ID, minimum funding, start/end time, active, settled).
- `GET /auctions/{auctionId}/bids`: Fetch list of bids placed on an auction.
- `POST /auctions/prepare-create`: Dry-run and build unsigned `createAuction` payload for suppliers.
- `POST /auctions/prepare-bid`: Dry-run and build unsigned `placeBid` payload for investors.
- `POST /auctions/prepare-close`: Dry-run and build unsigned `closeAuction` payload (mines escrow deal).

### Escrow & Repayment Operations (`/api/v1/escrow`)
- `GET /deals/{dealId}`: Fetch escrow status and details.
- `POST /deals/prepare-fund`: Build unsigned `fundDeal` payload for investors (attaches required `value` in wei).
- `POST /deals/prepare-release`: Build unsigned `releaseFundingToMSME` payload.
- `POST /deals/prepare-settle`: Build unsigned `settleInvoice` payload for buyers (attaches settlement amount).

### Receipt Status & Event Decoding (`/api/v1/blockchain`)
- `GET /transactions/{tx_hash}`: Returns transaction state (`PENDING`, `CONFIRMED`, `REVERTED`, `NOT_FOUND`).
- `GET /transactions/{tx_hash}/events`: Extracts and decodes log events (`AuctionCreated`, `BidPlaced`, `AuctionClosed`, `DealCreated`, `DealFunded`, `FundingReleased`, `InvoiceSettled`).

---

## Local Integration Testing

To run the suite of 26 on-chain integration tests:
1. Start the Hardhat local node:
   ```bash
   cd blockchain
   npx hardhat node
   ```
2. Deploy the local mock environment:
   ```bash
   npm run deploy:local
   npm run export:local
   ```
3. Run pytest:
   ```bash
   cd backend
   venv\Scripts\python -m pytest -v
   ```
