# Invoice2Credit AI - Blockchain Workspace

This workspace houses the smart contracts, configurations, and test suites for the blockchain layer of **Invoice2Credit AI**, a Web3 + AI invoice financing platform for MSMEs.

## Purpose of the Blockchain Layer

The blockchain layer guarantees transparency, trust, ownership, and immutable execution of the invoice financing lifecycle. It enables:
1. **Invoice Tokenization**: Representing verified invoices as unique, tradeable financial assets (ERC-721 NFTs).
2. **Financing Auctions**: Providing a decentralized marketplace where investors bid on invoice financing terms.
3. **Escrow & Payouts**: Securing funds in a smart contract and enforcing automatic releases to MSMEs and payouts to investors on settlement.

## Why Polygon?

- **High Throughput & Low Fees**: Polygon enables rapid execution of bids, mints, and settlements at a fraction of Ethereum Mainnet gas costs.
- **EVM Compatibility**: Uses standard Solidity and Ethereum tooling (Hardhat, ethers.js).
- **Amoy Testnet**: We use the Polygon Amoy testnet for prototype verification and demonstrations without risking real capital.

## Architecture & Data Separation

To maintain enterprise-grade security and user privacy, the project strictly segregates data:

| Storage Type | Purpose | Content |
| :--- | :--- | :--- |
| **Firebase Storage** | Private Document Vault | Complete original invoice PDFs, corporate tax documents, and sensitive buyer records. Fully private and encrypted. |
| **Cloud Firestore** | Operational Database | User profiles, bidding history logs, real-time notifications, chat history, and platform metrics. |
| **IPFS** | Decentralized Public Metadata | Public metadata JSON files containing non-sensitive details and validation reports for the NFTs. |
| **Polygon Blockchain** | Immutable Trust Layer | SHA-256 invoice hashes (duplicate protection), NFT ownership mapping, escrow logic, and transaction history. |

### Privacy Model & On-Chain Data
**We do not store invoice PDFs or sensitive company details on-chain.** The blockchain only tracks a SHA-256 fingerprint (`invoiceHash`) of the invoice document. This fingerprint allows anyone to verify document integrity without exposing its private details.

---

## Technical Specifications & Formulas

### Financial Formula (Basis Points)
We use basis points for discount rates to ensure precise integer arithmetic in Solidity (since floating point numbers are not supported).
- `100` basis points = `1.00%`
- `500` basis points = `5.00%`
- `1000` basis points = `10.00%`

The financing terms are calculated as follows:
$$discountAmount = \frac{invoiceAmount \times discountRateBps}{10000}$$
$$fundingAmount = invoiceAmount - discountAmount$$
$$settlementAmount = invoiceAmount$$

#### Example Calculation (10 Units / 5% Discount)
- **Invoice Amount**: `10 ether`
- **Discount Rate**: `500 basis points` (5.00%)
- **Discount Amount**: `10 ether * 500 / 10000 = 0.5 ether`
- **Funding Amount (Investor pays)**: `10 ether - 0.5 ether = 9.5 ether`
- **Settlement Amount (Buyer pays)**: `10 ether`
- **Investor Yield**: `0.5 ether` (earned upon successful settlement)

---

## Lifecycle & Custody Flow

1. **Minting**:
   - The platform verifier mints an `InvoiceNFT` to the **MSME** wallet address. The token includes the corporate `buyer` wallet address.
2. **Auction Listing**:
   - The MSME lists the NFT in `InvoiceMarketplace`. The NFT is transferred to the marketplace contract custody.
3. **Bidding**:
   - Investors place bids with `fundingAmount` and `discountRate`.
4. **Winner Selection**:
   - Bids are ranked: **Lowest discount rate wins**. If there is a tie, the **earliest timestamp** wins. A later bid with the same rate cannot displace an earlier bid.
5. **Auction Closing**:
   - If no bids are submitted, the NFT is returned to the MSME.
   - If bids are present, the winning bidder is locked. The NFT is marked as **financed** permanently in `InvoiceNFT` to prevent refinancing. The NFT is moved from the marketplace to `InvoiceEscrow` custody.
6. **Funding**:
   - The investor deposits the exact `fundingAmount` to `InvoiceEscrow`. The deal status moves to `FUNDED`.
7. **Release**:
   - The funded amount is released to the MSME's wallet. The deal status moves to `MSME_RELEASED`.
8. **Settlement**:
   - The assigned corporate buyer pays the exact `settlementAmount` to `InvoiceEscrow`.
   - The escrow transfers the `settlementAmount` to the investor.
   - The escrow returns the NFT to the **MSME** (completing the ownership claim). The deal status moves to `SETTLED`.

---

## Security Model

- **Duplicate Invoice Prevention (Level 1)**: SHA-256 fingerprint check prevents double-minting the same invoice document.
- **Duplicate Financing Prevention (Level 2)**: The NFT `financedTokens` status prevents a single minted invoice NFT from being listed for financing multiple times.
- **Access Control**: Roles (`VERIFIER_ROLE`, `MARKETPLACE_ROLE`) are restricted via OpenZeppelin's `AccessControl` library.
- **Exact-Value Escrow Validation**: All funding and settlements enforce exact amount matches (`msg.value == amount`) to prevent overpayments or underpayments.
- **Checks-Effects-Interactions & ReentrancyGuard**: Applied to all state-changing financial flow methods to block malicious reentrancy attacks.
- **Strict State transitions**: Escrow deals adhere to a rigid state machine (`CREATED` -> `FUNDED` -> `MSME_RELEASED` -> `SETTLED`).

---

## Polygon Amoy Deployment

The Polygon Amoy testnet is our target demonstration and prototype network. 
- **Chain ID**: `80002`
- **Native Gas Token**: `POL` (Amoy testnet tokens have **no real-world monetary value**).

### 1. Configure Environment Variables
Create a `.env` file in this directory based on the `.env.example` file:
```bash
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
DEPLOYER_PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```
> [!CAUTION]
> **Never commit your `.env` file or leak your `DEPLOYER_PRIVATE_KEY` / wallet seed phrase.** The `.gitignore` file is configured to exclude these.

### 2. Compilation
Compile all contracts:
```bash
npm run compile
```

### 3. Running Regression Tests
Run the automated test suite locally:
```bash
npm run test
```

### 4. Deploying to Polygon Amoy
Run the deployment script on the Amoy network:
```bash
npm run deploy:amoy
```
The script performs safety pre-flight checks (verifies Amoy chain ID, validates environment formatting, checks deployer wallet POL balance) and deploys:
1. `InvoiceNFT`
2. `InvoiceMarketplace` (linked to `InvoiceNFT`)
3. `InvoiceEscrow` (linked to `InvoiceNFT` and `InvoiceMarketplace`)

It then executes the **cross-contract authorization wiring**:
- Grants `MARKETPLACE_ROLE` on `InvoiceNFT` to the marketplace address.
- Sets the `escrowContract` on the marketplace to the escrow address.

Finally, it outputs the deployment receipt to `deployments/amoy.json`.

### 5. Exporting Deployment Configurations
Export deployment contract configurations and ABIs for application integration (FastAPI and React):
```bash
npm run export:amoy
```
This reads the manifest and compiles it to `exports/amoy-contracts.json`.

### 6. Checking Deployment Health
Verify that the deployed contracts are correctly wired and active on Polygon Amoy:
```bash
npm run check:amoy
```
This reads bytecode and calls contract roles/addresses on-chain to verify wiring integrity.

### 7. Blockchain Explorer & Verification
Deployed contracts and transactions can be viewed using the [Polygon Amoy Cardona Explorer](https://amoy.polygonscan.com/).
If `POLYGONSCAN_API_KEY` is present during deployment, source code verification is automatically run.
