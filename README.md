# Invoice2Credit AI

<div align="center">

![Invoice2Credit AI](https://img.shields.io/badge/Invoice2Credit-AI%20Powered-6366f1?style=for-the-badge&logo=lightning&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Polygon](https://img.shields.io/badge/Polygon-POS%20Mainnet-8247E5?style=for-the-badge&logo=polygon&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama--3-F55036?style=for-the-badge&logo=groq&logoColor=white)

### 🏦 AI Invoice Financing • ⛓️ Blockchain-Secured NFTs • 📊 Real-Time Marketplace • 🤖 Groq-Powered Intelligence

**Empowering MSMEs with instant invoice financing through AI underwriting, smart contract escrows and a live investor marketplace.**

</div>

---

## 🚀 Overview

**Invoice2Credit AI** is a full-stack Web3 fintech platform purpose-built for **Micro, Small & Medium Enterprises (MSMEs)** in India. It bridges the working capital gap by converting verified invoices into NFT-backed digital assets, enabling real-time funding from verified investors through a live auction marketplace.

### Why Invoice2Credit AI?

- **⚡ Instant Liquidity**: MSMEs upload invoices and receive funding within hours, not weeks
- **🤖 AI Underwriting**: Groq-powered Llama-3 model performs OCR analysis, risk scoring, and fraud detection
- **⛓️ Blockchain Trust**: Every invoice is tokenized as an NFT on Polygon POS with smart contract escrow settlement
- **📊 Live Investor Marketplace**: Real-time bidding auctions with countdown timers and AI-recommended rates
- **🏢 Corporate Buyer Portal**: Delivery verification, invoice approval, and payment calendar for large buyers
- **🛡️ Role-Based Platform**: Four distinct roles — MSME, Investor, Buyer, Admin — each with their own workspace

---

## ✨ Features

### 🤖 AI Invoice Intelligence (Groq + PyMuPDF)

| Capability | Description |
|-----------|-------------|
| **OCR Extraction** | PyMuPDF scans uploaded PDF invoices and extracts all fields automatically |
| **AI Risk Scoring** | Groq Llama-3 8B assigns risk grades (A+ to D) based on buyer history and amount |
| **Fraud Detection** | Duplicate hash matching and GST registry verification |
| **Structured Output** | JSON mode returns `invoiceNumber`, `buyerName`, `amount`, `dueDate`, `riskGrade` |
| **Confidence Score** | Every extraction includes a confidence percentage |

### 🏦 Four Role Workspaces

| Role | Portal | Capabilities |
|------|--------|-------------|
| **MSME Owner** | MSME Portal + Dashboard | Upload invoices, track funding, AI insights, blockchain status |
| **Investor** | Investor Portal + Marketplace | Browse auctions, place bids, track portfolio, yield analytics |
| **Corporate Buyer** | Buyer Portal | Approve/reject invoices, verify deliveries, payment calendar |
| **Platform Admin** | Admin Control Center | System health, user management, fraud monitoring, AI config |

### ⛓️ Blockchain Infrastructure (Polygon POS)

- **Invoice NFT**: Every approved invoice is minted as an ERC-721 NFT on Polygon Amoy
- **Escrow Smart Contract**: Funds are held in escrow until delivery confirmation
- **Blockchain Explorer**: Real-time transaction tracking, gas monitoring, NFT gallery
- **Wallet Integration**: MetaMask and WalletConnect support

### 📊 Live Investor Marketplace

- Real-time auction bidding with countdown timers
- AI-recommended bid prices based on risk grade
- Funding progress bars with investor participation tracking
- Auction auto-closure after expiry

### 📈 Business Intelligence Analytics

- Cash flow forecasting with Recharts area charts
- Sector allocation pie charts and risk distribution heatmaps
- AI-generated financial health scores
- Monthly growth analytics and yield history

### 🤖 AI Financial Copilot

- Natural language financial Q&A for MSMEs
- Invoice-specific context awareness
- Diversification recommendations for investors
- Risk analysis and market trend summaries

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVOICE2CREDIT AI PLATFORM                   │
│                                                                 │
│  ┌─────────────────────┐     ┌──────────────────────────────┐  │
│  │   React Frontend    │────▶│     FastAPI Backend          │  │
│  │   (Vite + React 18) │     │     (Python 3.11+)           │  │
│  │                     │     │                              │  │
│  │  • Landing Page     │     │  • /api/ai  (OCR + Groq)     │  │
│  │  • Auth (Firebase)  │     │  • /api/business (Queries)   │  │
│  │  • Onboarding Flow  │     │  • /api/marketplace          │  │
│  │  • MSME Portal      │     │  • /api/invoices             │  │
│  │  • Investor Portal  │     │  • /api/blockchain           │  │
│  │  • Buyer Portal     │     │  • /api/notifications        │  │
│  │  • Admin Console    │     │                              │  │
│  │  • Marketplace      │     │  Firebase Admin SDK          │  │
│  │  • Analytics        │     │  Firestore Collections       │  │
│  │  • AI Copilot       │     │  Groq AI Client              │  │
│  │  • Blockchain Expl. │     │  Web3.py (Polygon POS)       │  │
│  └─────────────────────┘     └──────────────────────────────┘  │
│           │                              │                       │
│           ▼                              ▼                       │
│  ┌─────────────────┐      ┌─────────────────────────────────┐  │
│  │ Firebase Auth   │      │      Polygon POS Mainnet        │  │
│  │ + Firestore DB  │      │                                 │  │
│  │                 │      │  ┌─────────────┐ ┌───────────┐  │  │
│  │ Collections:    │      │  │ Invoice NFT │ │  Escrow   │  │  │
│  │ • users         │      │  │ ERC-721     │ │ Contract  │  │  │
│  │ • invoices      │      │  └─────────────┘ └───────────┘  │  │
│  │ • marketplace   │      │                                 │  │
│  │ • bids          │      └─────────────────────────────────┘  │
│  │ • transactions  │                                           │
│  │ • notifications │      ┌─────────────────────────────────┐  │
│  │ • activities    │      │     Groq AI (Llama-3 8B)        │  │
│  │ • analytics     │      │  • Invoice OCR & Extraction     │  │
│  └─────────────────┘      │  • Risk Scoring & Grading       │  │
│                            │  • Fraud Pattern Detection      │  │
│                            │  • Financial Q&A (Copilot)     │  │
│                            └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS + Custom Design System |
| Animations | Framer Motion + Lenis Smooth Scroll |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Auth State | Firebase Auth SDK |

**Backend:**
| Layer | Technology |
|-------|-----------|
| API Framework | FastAPI 0.111+ |
| Runtime | Python 3.11+ |
| AI Model | Groq API (Llama-3 8B) |
| PDF Processing | PyMuPDF |
| Blockchain | Web3.py + Polygon POS |
| Database | Firebase Admin SDK + Firestore |
| Environment | python-dotenv |

**Blockchain:**
| Layer | Technology |
|-------|-----------|
| Network | Polygon POS (Amoy Testnet / Mainnet) |
| Smart Contracts | Solidity (via Hardhat) |
| Contract Types | ERC-721 NFT + Custom Escrow |
| Wallet | MetaMask + WalletConnect |

---

## 📁 Project Structure

```
Invoice2Credit/
├── frontend/                    # React + Vite frontend application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing/         # Public landing page
│   │   │   ├── Authentication/  # Login, Signup, ForgotPassword
│   │   │   ├── Onboarding/      # Multi-step role-based onboarding
│   │   │   ├── Dashboard/       # MSME main dashboard
│   │   │   ├── MSME/            # MSME Portal workspace
│   │   │   ├── Investor/        # Investor portfolio workspace
│   │   │   ├── Buyer/           # Corporate buyer workspace
│   │   │   ├── Admin/           # Platform admin control center
│   │   │   ├── Marketplace/     # Live invoice auction marketplace
│   │   │   ├── Analytics/       # BI analytics dashboard
│   │   │   ├── Copilot/         # AI financial copilot
│   │   │   ├── Blockchain/      # Blockchain explorer
│   │   │   ├── InvoiceDetails/  # Invoice command center
│   │   │   └── Profile/         # Profile & settings center
│   │   ├── components/
│   │   │   ├── layout/          # AppLayout, Sidebar, Navbar, PageHeader
│   │   │   ├── common/          # ProtectedRoute, RoleHome, RootWrapper
│   │   │   └── ui/              # Reusable UI components
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx  # Firebase auth + user state
│   │   │   └── LenisContext.jsx # Smooth scroll context
│   │   ├── services/            # Firestore service layers
│   │   ├── firebase/            # Firebase config
│   │   └── router/              # React Router configuration
│   └── package.json
│
├── backend/                     # FastAPI Python backend
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── api/routes/          # API route handlers
│   │   ├── services/            # Business logic services
│   │   ├── models/              # Pydantic data models
│   │   ├── schemas/             # Request/response schemas
│   │   ├── config/              # Firebase service account config
│   │   ├── middleware/          # CORS and auth middleware
│   │   └── utils/               # Utility helpers
│   ├── requirements.txt
│   └── .env.example
│
└── smart-contracts/             # Hardhat Solidity project
    ├── contracts/
    │   ├── NFT/                 # ERC-721 Invoice NFT contract
    │   └── Escrow/              # Payment escrow smart contract
    ├── scripts/                 # Deployment scripts
    ├── test/                    # Contract test suites
    └── hardhat.config.js
```

---

## 🛠️ Quick Start

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org)
- **Python 3.11+** — [Download](https://python.org)
- **Git** — [Download](https://git-scm.com)
- **Firebase Project** — [Console](https://console.firebase.google.com) (Firestore + Auth enabled)
- **Groq API Key** — [Get free key](https://console.groq.com)
- **MetaMask** — [Browser extension](https://metamask.io) (optional, for blockchain features)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Zahid-Ham/Invoice2Credit-AI.git
cd Invoice2Credit-AI
```

---

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# Edit .env with your credentials (see Environment Variables section below)
```

**Start the backend server:**
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **API Base**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

### 3. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

---

### 4. Smart Contracts Setup (Hardhat) — Optional

```bash
cd smart-contracts

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Polygon Amoy Testnet
npx hardhat run scripts/deploy.js --network amoy
```

---

## 🔑 Environment Variables

### Backend — `backend/.env`

Create `backend/.env` from `backend/.env.example`:

```env
# Server Configuration
PORT=8000
HOST=0.0.0.0
DEBUG=True

# Firebase (download from Firebase Console → Project Settings → Service Accounts)
FIREBASE_CREDENTIALS_PATH=app/config/firebase-service-account.json

# AI Configuration — get from https://console.groq.com
GROQ_API_KEY=gsk_your_groq_api_key_here

# Blockchain (Polygon POS)
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
CONTRACT_OWNER_PRIVATE_KEY=0x_your_wallet_private_key
ESCROW_CONTRACT_ADDRESS=0x_deployed_escrow_address
NFT_CONTRACT_ADDRESS=0x_deployed_nft_address
```

> ⚠️ **Never commit `.env` or `firebase-service-account.json` to version control.**

### Frontend — Firebase Config

Update `frontend/src/firebase/config.js` with your Firebase web app credentials from the Firebase Console:

```js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

---

## 📡 API Endpoints

### AI Invoice Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/analyze` | Upload PDF invoice for OCR + AI risk scoring |

### Business & Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/business/invoices` | Fetch user invoices from Firestore |
| `GET`  | `/api/business/dashboard` | Dashboard KPIs and analytics |
| `GET`  | `/api/business/notifications` | User notifications |

### Marketplace
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/marketplace` | List all active marketplace listings |
| `GET`  | `/api/marketplace/{id}` | Get single listing details |
| `POST` | `/api/marketplace/{id}/bid` | Place a bid on a listing |
| `GET`  | `/api/marketplace/{id}/bids` | Get bid history for a listing |

### Blockchain
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/blockchain/status` | Network status and block info |
| `POST` | `/api/blockchain/mint` | Mint invoice as NFT |

---

## 🎭 Demo Roles & Accounts

During onboarding, select any of the four roles:

| Role | What You'll See |
|------|----------------|
| **MSME Owner** | Dashboard, MSME Portal, Analytics, AI Copilot |
| **Investor** | Investor Portfolio, Marketplace, Blockchain Explorer |
| **Corporate Buyer** | Buyer Portal (invoice approvals, payment calendar) |
| **Platform Admin** | Admin Control Center (system health, user management) |

> 💡 The onboarding flow is **role-gated** — role selection is mandatory before accessing the platform.

---

## 🗺️ Roadmap

### ✅ Completed
- [x] Role-based authentication with Firebase
- [x] 4-step personalized onboarding flow
- [x] AI invoice OCR extraction (PyMuPDF + Groq)
- [x] MSME Dashboard with KPIs and portfolio charts
- [x] MSME Portal — invoice management workspace
- [x] Live Investor Marketplace with bidding
- [x] Investor Portfolio workspace
- [x] Corporate Buyer Portal — approvals and GRN verification
- [x] Platform Admin Control Center
- [x] Blockchain Explorer (Polygon POS)
- [x] AI Financial Copilot
- [x] Business Intelligence Analytics Dashboard
- [x] Invoice Details Command Center (`/app/invoice/:id`)
- [x] Smart contract Escrow + Invoice NFT (Hardhat)
- [x] Firestore-backed service layers
- [x] Role-based page access guards
- [x] Profile & Settings Center (tab-based)
- [x] Universal back navigation
- [x] Dark Mode / Light Mode

### 🚧 In Progress
- [ ] Marketplace backend (FastAPI + Firestore real-time bids)
- [ ] Smart contract auto-deployment on invoice approval
- [ ] Live WebSocket auction updates

### 📋 Planned
- [ ] UPI & Razorpay payment gateway integration
- [ ] WhatsApp invoice submission flow
- [ ] Credit score API integration (CIBIL/Experian)
- [ ] Mobile app (React Native)
- [ ] Multi-language support (Hindi, Tamil, Telugu)
- [ ] Scheduled auction auto-close cron jobs

---

## 🔒 Security

- **No secrets in code** — all credentials via `.env` files (excluded from git)
- **Firebase Auth** enforces session management
- **Role-based access control** — users cannot access pages outside their role
- **ProtectedRoute guard** enforces authentication on all `/app/*` routes
- **Smart contract escrow** — funds are custodied on-chain, not in application DB

> ⚠️ Before deploying to production, replace all mock/demo Firebase configs with real project credentials, enable Firebase Security Rules, and audit smart contracts.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- **[Groq](https://groq.com)** — blazing-fast Llama-3 inference for AI underwriting
- **[Firebase](https://firebase.google.com)** — auth and real-time database
- **[Polygon](https://polygon.technology)** — low-cost blockchain for NFT minting
- **[Framer Motion](https://www.framer.com/motion/)** — premium UI animations
- **[Recharts](https://recharts.org)** — beautiful financial charts
- **[Hardhat](https://hardhat.org)** — Solidity development environment

---

<div align="center">
  <strong>Built with ❤️ for India's 63 Million MSMEs</strong>
  <br><br>
  <sub>Invoice2Credit AI © 2026 • AI-Powered Invoice Financing • Polygon POS • Groq Intelligence</sub>
</div>
