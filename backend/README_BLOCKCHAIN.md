# Invoice2Credit AI - Backend Blockchain Integration Layer

This layer integrates the FastAPI backend service with the Ethereum-compatible smart contracts running on Polygon/Hardhat.

## Architecture

```
                       +-------------------+
                       |   FastAPI App     |
                       +---------+---------+
                                 |
           +---------------------+---------------------+
           |                     |                     |
+----------v----------+ +--------v--------+ +----------v----------+
|  Deployment Loader  | |   ABI Loader    | |  Web3 Provider     |
| (Loads amoy/local   | | (Loads cached   | | (RPC connections & |
|  manifests safely)  | |  contract ABIs) | |  network checks)   |
+----------+----------+ +--------+--------+ +----------+----------+
           |                     |                     |
           +---------------------+---------------------+
                                 |
                       +---------v---------+
                       | Contract Registry |
                       | (Instantiates contract references)
                       +---------+---------+
                                 |
                       +---------v---------+
                       | Blockchain Signer |
                       | (authorized backend verification actions)
                       +-------------------+
```

---

## Local Setup

### 1. Run the local Hardhat Node
Before running or testing the backend, ensure the local Hardhat node is running in the blockchain workspace:
```bash
cd blockchain
npx hardhat node
```
This starts the node at `http://127.0.0.1:8545` (Chain ID `31337`).

### 2. Deploy Local Contracts
If not already done, deploy the contracts locally:
```bash
npm run deploy:local
```
This generates the manifest file at `blockchain/deployments/local-contracts.json`.

### 3. Configure Backend Environment
Set the following variables inside your `backend/.env` file:
```bash
BLOCKCHAIN_NETWORK=local
LOCAL_BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_VERIFIER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
> [!WARNING]
> The private key provided above is the default Hardhat Account #0 mnemonic key. **Never use this key or commit private keys in production environment files.**

---

## Running Backend Integration Tests

Run the full suite of 23 on-chain integration tests:
```bash
cd backend
venv\Scripts\python -m pytest -v
```

---

## Exposed Endpoints

### 1. Health Status
- **Method**: `GET`
- **Path**: `/api/v1/blockchain/health`
- **Description**: Inspects provider connection, loaded manifests, active signer, and on-chain contract bytecode presence.

### 2. Document Fingerprinting
- **Method**: `POST`
- **Path**: `/api/v1/blockchain/invoice/hash`
- **Description**: Accepts a PDF file upload, hashes its content using SHA-256, and returns the hex digest and tokenization status.

### 3. Verifier Minting
- **Method**: `POST`
- **Path**: `/api/v1/blockchain/invoice/mint`
- **Description**: Authorized platform endpoint that mints a verified invoice NFT to the designated MSME recipient address.
