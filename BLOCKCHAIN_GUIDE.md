# ⛓️ Blockchain Setup & Developer Guide

This guide walks you through setting up the local blockchain network, importing the correct test accounts into MetaMask, configuring your browser, and explaining the mechanics of Web3 invoice financing.

---

## 🛠️ Step 1: Launch the Local Blockchain Node

We have provided a one-click startup script that handles Solidity compilation, spins up a local simulated blockchain node, deploys all smart contracts, and automatically links the addresses to both the frontend and backend.

Simply run the following script from the project root folder:
```bash
./run-local-blockchain.bat
```

> **Note:** This will open a new terminal window titled **"Hardhat Local Node"** running on `http://127.0.0.1:8545`. Keep this running in the background. If you restart it, all transaction history and balances will reset.

---

## 🦊 Step 2: Configure MetaMask Wallet

MetaMask must be configured to connect to your local Hardhat node.

1. Open your browser and click on the **MetaMask extension**.
2. Click the network selector dropdown (top-left) and choose **"Add Network"** -> **"Add a network manually"**.
3. Fill in the following network details:
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH` or `POL`
4. Click **Save** and switch to your new network.

---

## 🔑 Step 3: Import Dev Accounts into MetaMask

Hardhat pre-funds 20 test accounts with **10,000 ETH** each at startup. To run the full lifecycle demo, import the following three roles using their private keys:

To import an account:
1. Open MetaMask -> Click your account avatar circle (top-right).
2. Click **Add account or hardware wallet** -> **Import account**.
3. Paste the Private Key and click **Import**. Rename the account for easy identification.

### 🎭 Dev Roles Mapping

| Role | Wallet Address | Private Key (Import into MetaMask) | Description |
|------|----------------|-------------------------------------|-------------|
| **MSME Owner (ACME)** | `0xf39Fd6e51aad88f6f4ce6ab8827279cfffb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | Mints invoices as NFTs and creates marketplace auctions. |
| **Investor (Capital Trust)** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Bids on marketplace auctions to finance invoices and funds escrow. |
| **Corporate Buyer (Wipro)** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | Settles invoice repayments directly into the Escrow contract on maturity. |

---

## 🔄 Step 4: Run the Lifecycle Walkthrough

To see the blockchain mechanics, follow this step-by-step walkthrough:

### 1. MSME Mints & Lists
1. Log in to the application as **MSME Owner** (make sure your MetaMask is set to **MSME Owner** account).
2. Upload a new PDF invoice. Wait for the AI risk scoring report to finish.
3. Click **Mint Invoice** -> MetaMask will pop up for you to confirm the transaction.
4. Go to **MSME Portal** -> Click **List to Marketplace** -> Choose minimum funding amount and duration. Confirm the transaction to create the auction.

### 2. Investor Bids
1. Open an incognito browser window or log out and log in as an **Investor**.
2. Switch MetaMask to the **Investor** account.
3. Go to the **Marketplace** page, find the listed invoice, and input your financing bid (e.g. ₹50,00,000 at a 10% discount rate). Click **Place Bid** and confirm the transaction on MetaMask.

### 3. Close the Auction
1. The auction must close once the duration ends. For testing, you can fast-forward the blockchain time and close it automatically by running this script in the `blockchain/` folder:
   ```bash
   npx hardhat run scripts/fast_forward_and_close.js --network localhost
   ```
2. The NFT is now locked in the **Escrow contract**.

### 4. Buyer Repays & Settles
1. Log in as the **Corporate Buyer** (e.g., display name must match the buyer party like *Wipro Enterprises Ltd* or *Tata Motors*).
2. Switch MetaMask to the **Corporate Buyer** account.
3. Go to the **Buyer Portal** page. You will see the invoice listed under **Release Repayment Escrow**.
4. Click **Settle Repayment** and confirm the MetaMask transaction. 
5. The Escrow contract automatically releases the funds to the Investor, and returns the NFT ownership back to the MSME.

---

## 🔧 Troubleshooting

### MetaMask Transaction Nonce Issues
If you restart the local Hardhat node (`run-local-blockchain.bat`), MetaMask will get confused because the blockchain history starts from 0 but MetaMask remembers your previous nonces.
**To Fix:**
1. Open MetaMask -> Click settings (gear icon) -> **Advanced**.
2. Scroll down and click **"Clear activity tab data"** (or **"Reset Account"**).
3. This resets MetaMask's nonce counter for the localhost network without deleting your imported accounts.
