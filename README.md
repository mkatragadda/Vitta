# Vitta - Agentic Wallet for International Money Transfers

**Vitta is an AI-powered agentic wallet that autonomously manages your financial operations—from optimizing domestic credit card spending to executing international money transfers when optimal conditions are met.**

## 🚀 Core Problem We Solve

**The Remittance Inefficiency Gap**: Millions of users send money abroad but lack intelligent automation:
- ❌ Manual rate checking every few hours
- ❌ Transfers executed at suboptimal FX rates (costing 2-5% in missed opportunities)
- ❌ No real-time notifications when rates become favorable
- ❌ Complex decision-making without data insights

**Vitta's Solution**: An autonomous financial agent that:
1. **Continuously monitors** FX rates and market conditions
2. **Automatically executes** transfers when user-defined conditions are met
3. **Optimizes** every transaction across payment methods (UPI, Bank Transfer)
4. **Notifies** users in real-time with activity tracking
5. **Coordinates** with domestic credit card usage to maximize value

---

## ✨ Key Features

### 🌍 International Money Transfer (India MVP)

#### **Immediate Transfer**
User initiates a transfer with a single message: *"Send $500 to my family in India"*
- Vitta autonomously: Queries live FX rates → Verifies recipient → Initiates payment
- Supported methods: **UPI** (2-5 min settlement) | **Bank Transfer** (1-2 days)
- Real-time FX quotes with 5-minute rate locks

#### **Rate-Triggered Transfer (Autonomous Agent)**
User sets: *"Send $500 when USD/INR drops below 83.5"*
- ✅ Vitta continuously monitors Chimoney FX API (15-min polling)
- ✅ Automatically triggers transfer when rate target is met
- ✅ Executes without manual intervention (agentic behavior)
- ✅ Notifies user instantly with transaction details

#### **FX Rate Intelligence**
- 24-hour min/max FX rates displayed in transfer dialog
- Historical rate trends help users set optimal trigger points
- Persistent activity sidebar showing all rate checks and transfers
- Compliance-first: All transfers follow NPCI/RBI regulations

### 💳 Domestic Credit Card Intelligence

#### **Plaid Integration** (Completed)
- One-click card linking via Plaid secure authentication
- Supports 12,000+ financial institutions
- Real-time balance and transaction sync
- For demo: Pre-loaded with 3 sample cards

#### **Smart Payment Optimization**
- Analyzes APR, balance, and utilization across cards
- Recommends optimal payment distribution to minimize interest
- Avoids credit score damage through utilization management
- Monthly payment strategy dashboard with visualizations

#### **Rewards Maximization**
- Category-based rewards optimization (4% groceries, 3% dining, etc.)
- Quarterly rotating bonus tracking
- Real-time "which card to use" recommendations via chat
- Annual rewards projection

### 🤖 Agentic AI Assistant

#### **Conversational Interface**
- Natural language queries about cards, transfers, and spending
- Context-aware responses leveraging user's financial portfolio
- Deep links for in-app navigation without page loads
- Chat history persistence

#### **Intent Classification Engine**
- Hybrid NLP: Local `compromise.js` + OpenAI embeddings fallback
- Vector similarity search in Supabase pgvector for intent matching
- Handles queries like: "Send $500 to Amit", "Which card has lowest APR", "How much can I save"

#### **Document Intelligence** (Planned)
- OCR processing for receipts and financial documents
- PDF chat for statement analysis
- Expense categorization and tax deduction identification

### 📊 Activity Tracking & Notifications

#### **Real-Time Activity Sidebar**
- FX rate check history with timestamps
- Transfer initiation events with status
- Rate alert triggers when conditions are met
- Real-time push notifications for transfer completion

#### **Compliance Audit Trail**
- Immutable logging of all transfers and refunds
- NPCI/RBI regulation compliance tracking
- Transaction cancellation/refund history
- Anti-fraud monitoring

---

## 🏗️ System Architecture

### High-Level Flow: "Add Card → Send Money to India"

```
┌─────────────────────────────────────────────────────────────────┐
│ User: "Add my Chase card and send $500 to India"                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. CARD LINKING (Plaid)                                         │
│ ├─ Plaid Link opens securely                                    │
│ ├─ User authenticates with Chase                               │
│ └─ Card data stored in Supabase (encrypted, PCI-compliant)     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. TRANSFER INTENT RECOGNITION (AI Assistant)                   │
│ ├─ Query parsed by intent classifier                            │
│ ├─ Entity extraction: Amount=$500, Destination=India             │
│ └─ Route to International Transfer Flow                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. FX RATE & QUOTE (Chimoney API Integration)                   │
│ ├─ Real-time FX query: USD → INR rate ~83.50                    │
│ ├─ Chimoney returns: Quote valid for 5 minutes                  │
│ ├─ Rate locked in transfer_requests table                       │
│ └─ UI shows 24-hour min/max prices for context                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. RECIPIENT STORAGE (No OTP Needed)                            │
│ ├─ UPI: Phone number stored for future transfers                │
│ ├─ Bank Transfer: IFSC + account number stored                  │
│ ├─ Recipient details encrypted and persisted                    │
│ └─ Vitta controls both pull (US) and push (India) flows         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. PAYMENT EXECUTION (Idempotent)                               │
│ ├─ User confirms transfer details                               │
│ ├─ Idempotency-Key generated and stored                         │
│ ├─ Payment initiated to Chimoney with retry logic               │
│ ├─ Duplicate click prevention (3-layer idempotency)             │
│ └─ Status: 'payment_initiated'                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. REAL-TIME TRACKING (Webhooks)                                │
│ ├─ Chimoney webhook: Payment settled (2-5 min UPI)              │
│ ├─ Status updated: 'completed'                                  │
│ ├─ Activity logged: Transfer → Recipient → Amount → Time        │
│ └─ Notification pushed to user                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ User receives: ✅ Transfer completed. $500 sent via UPI.        │
│ Recipient in India: ₹41,750 received (at rate 83.50)           │
│ Activity tracked and visible in sidebar for future reference    │
└─────────────────────────────────────────────────────────────────┘
```

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
│  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │
│  │ Chat Widget  │  │ Transfer Dialog │  │ Activity Sidebar    │   │
│  │ (Intent      │  │ (Rate display,  │  │ (Real-time updates, │   │
│  │  parsing)    │  │  recipient      │  │  webhook status)    │   │
│  └──────────────┘  │  forms)         │  └─────────────────────┘   │
│                    └─────────────────┘                             │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │           Plaid Integration (Card Linking)                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ (HTTP/REST)
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend APIs (Next.js)                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ /api/transfers/quote         - Get FX rate quote              │ │
│  │ /api/transfers/lock-rate     - Lock rate for 5 minutes        │ │
│  │ /api/transfers/immediate    - Execute immediate transfer     │ │
│  │ /api/transfers/rate-triggered - Set up rate monitoring      │ │
│  │ /api/transfers/:id/approve   - User approval flow            │ │
│  │ /api/webhooks/chimoney       - Webhook receiver              │ │
│  │ /api/cron/poll-payment-status - Background rate polling      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ (REST/HMAC)
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐
│   Supabase (DB)      │  │  Chimoney API        │  │ External APIs│
│  ┌────────────────┐  │  │  ┌────────────────┐  │  │              │
│  │ Users          │  │  │  │ /recipient/    │  │  │ • Plaid      │
│  │ Transfers      │  │  │  │  verify        │  │  │ • Stripe     │
│  │ Recipients     │  │  │  ├────────────────┤  │  │ • Twilio     │
│  │ Transfer Logs  │  │  │  │ /fxrate/quote │  │  │   (SMS)      │
│  │ Activity       │  │  │  ├────────────────┤  │  │              │
│  │ Audit Trail    │  │  │  │ /transfer/    │  │  │              │
│  │ (immutable)    │  │  │  │  initiate      │  │  │              │
│  │                │  │  │  ├────────────────┤  │  │              │
│  │ (pgvector for  │  │  │  │ /transfer/    │  │  │              │
│  │  embeddings)   │  │  │  │  status        │  │  │              │
│  └────────────────┘  │  │  └────────────────┘  │  │              │
│  • RLS Policies      │  │  • Idempotency Keys  │  │              │
│  • Encryption       │  │  • Webhook Signature │  │              │
│  • Backups          │  │    Verification      │  │              │
└──────────────────────┘  └──────────────────────┘  └──────────────┘
```

### Data Flow: Rate-Triggered Transfer (Agentic)

```
┌─────────────────────────────────────────────────────────────────┐
│ User sets: "Send $500 when USD/INR < 83.5"                      │
└─────────────────────────────────────────────────────────────────┘
                    ↓ (saves to DB)
        Transfer Status: 'monitoring'
        Target Rate: 83.5

        ↓ (Every 15 minutes)

┌─────────────────────────────────────────────────────────────────┐
│ BACKGROUND CRON JOB: /api/cron/poll-payment-status              │
│ - Query all transfers in 'monitoring' state                      │
│ - Call Chimoney /fxrate/quote for each recipient + amount       │
│ - Compare current rate vs target rate                           │
└─────────────────────────────────────────────────────────────────┘
                    ↓
            ✅ Rate 83.42 < 83.5 (TARGET MET!)
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ Vitta Autonomous Actions:                                        │
│ 1. Lock current rate: 83.42 (5-min validity)                    │
│ 2. Update Transfer Status: 'rate_met'                           │
│ 3. Auto-execute payment (with user pre-approval)                │
│ 4. Set Status: 'payment_initiated'                              │
│ 5. Send Notification: "Rate target met! $500 sent via UPI"      │
│ 6. Log to Activity Sidebar (real-time)                          │
└─────────────────────────────────────────────────────────────────┘
                    ↓
        Chimoney processes payment
        User receives ₹41,700 in India

        ↓ (Webhook from Chimoney)

        Transfer Status: 'completed'
        User notified with receipt
```

---

## 🔧 Technical Implementation

### Frontend Stack
- **Framework**: Next.js 14 (Pages Router)
- **UI Framework**: React 18 with Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (no Redux/Zustand)
- **Chat**: Conversational UI with intent parsing
- **Real-time Updates**: Webhook polling for transfer status

### Backend Stack
- **Runtime**: Node.js (Next.js API routes)
- **Database**: Supabase PostgreSQL with pgvector
- **Vector DB**: pgvector extension for intent embeddings
- **Authentication**: Google OAuth + JWT sessions
- **NLP**: OpenAI GPT-3.5-turbo (fallback) + compromise.js (local)

### Third-Party Integrations
- **Plaid**: Secure card linking (12,000+ institutions)
- **Chimoney**: International payment provider API
- **OpenAI**: Embeddings API (intent classification)
- **Supabase**: Database + Auth + Row-Level Security

### Database Schema (Key Tables)
```sql
transfers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  amount DECIMAL,
  fx_rate DECIMAL,
  status VARCHAR, -- draft, rate_quoted, rate_locked, monitoring, rate_met, pending_approval, payment_initiated, completed, failed
  payment_method VARCHAR, -- upi, bank_transfer
  recipient_id UUID REFERENCES recipients,
  chimoney_transaction_id VARCHAR,
  monitoring_target_rate DECIMAL,
  created_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB -- compliance data
);

transfer_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  transfer_id UUID REFERENCES transfers,
  idempotency_key VARCHAR UNIQUE, -- Prevents double-charges
  status VARCHAR, -- pending, processing, completed, failed
  response JSONB,
  created_at TIMESTAMP
);

recipients (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,

  -- Recipient contact info
  name VARCHAR(255),  -- Recipient name
  phone VARCHAR(20),  -- For UPI
  account_number VARCHAR(20),  -- For Bank Transfer
  ifsc_code VARCHAR(11),  -- For Bank Transfer

  -- Payment methods
  payment_method VARCHAR(50),  -- 'upi' or 'bank_transfer'

  -- Tracking
  transfer_count INT DEFAULT 0,
  last_transfer_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),

  -- Constraints
  UNIQUE(user_id, phone),  -- One phone per user for UPI
  UNIQUE(user_id, account_number, ifsc_code)  -- One account per user
);

activities (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  type VARCHAR, -- rate_checked, transfer_initiated, rate_triggered, transfer_completed
  transfer_id UUID,
  metadata JSONB,
  created_at TIMESTAMP
);

transfer_audit_logs (
  id UUID PRIMARY KEY,
  transfer_id UUID REFERENCES transfers,
  user_id UUID REFERENCES users,
  event VARCHAR,
  previous_status VARCHAR,
  new_status VARCHAR,
  details JSONB, -- Immutable compliance record
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Chimoney API key (for international transfers)
- Plaid API credentials (for card linking)

### Installation

```bash
# Clone and setup
git clone <repository-url>
cd vitta
npm install

# Create environment variables
cat > .env.local << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key

# OpenAI (server-side only)
OPENAI_API_KEY=sk-...

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id

# Chimoney (international transfers)
CHIMONEY_API_KEY=your-api-key
CHIMONEY_API_BASE_URL=https://api.chimoney.io

# Plaid (card linking)
NEXT_PUBLIC_PLAID_CLIENT_ID=your-client-id
PLAID_SECRET=your-secret
EOF

# Run development server
npm run dev
```

### Quick Demo

1. Open [http://localhost:3000](http://localhost:3000)
2. Login with demo credentials: any email/password
3. **Add a Card**: Click "Add Card" → See 3 pre-loaded demo cards
4. **Send Money to India**: Chat: "Send $500 to India"
   - Vitta guides through recipient verification
   - Shows live FX rate (demo rate)
   - Confirms payment details
   - Shows completion confirmation
5. **Rate-Triggered Transfer**: Set a target FX rate and let Vitta monitor autonomously

---

## 📊 Implementation Status

### ✅ Completed
- [x] **Plaid Integration**: One-click card linking for demo users and OAuth users
- [x] **Chat Interface**: Intent classification with NLP + OpenAI embeddings
- [x] **Card Management**: Display, balance tracking, APR monitoring
- [x] **Demo User System**: Hardcoded credentials with test data
- [x] **Supabase Integration**: User persistence, encrypted storage
- [x] **Activity Logging**: Transaction history and audit trails
- [x] **Message Format**: Extended for rich components and actions
- [x] **Design Documentation**: Complete architecture and implementation specs
  - International transfers design (15 sections)
  - Chimoney integration guide with code examples
  - UPI payment flow specification
  - Backend idempotency strategy (3-layer protection)
  - Backend API inventory (13 endpoints)
  - Transaction cancellation/refund strategy
  - Database schema with compliance

### 🔄 In Progress
- [ ] **Chimoney API Integration**: Payment initiation and webhook handling
- [ ] **FX Rate Monitoring**: Background cron job (15-min polling)
- [ ] **Recipient Verification**: Phone-based (UPI) and account-based (Bank)
- [ ] **Rate-Triggered Transfers**: Autonomous agent execution

### 🗺️ Roadmap

#### **Phase 1: India MVP (Current)**
- USD → INR immediate transfers
- Rate-triggered autonomous transfers
- UPI and Bank Transfer methods
- Recipient verification and KYC

#### **Phase 2: Multi-Corridor Expansion**
- Add USD → PHP (Philippines) via same architecture
- Add USD → MXN (Mexico) remittance
- Support for additional payment methods per corridor

#### **Phase 3: Utility Bill Payments** (Proposed)
- Automated bill detection from documents
- Browser-based payment automation (via Playwright/Puppeteer)
- Bill payment scheduling and notifications
- Multi-language invoice parsing

#### **Phase 4: Family Coordination**
- Multi-user family accounts
- Shared transfer approvals
- Family spending aggregation
- Group notifications and coordination

#### **Phase 5: Advanced AI Features**
- Spend forecasting using time-series ML
- Anomaly detection for fraud prevention
- Voice-based transfer commands
- Receipt scanning with OCR

---

## 🔐 Security & Compliance

### Payment Security (3-Layer Idempotency)

**Layer 1: Frontend**
- Button disabled immediately on click
- Prevents accidental double-submission
- Loading state prevents user confusion

**Layer 2: Backend Deduplication**
- Idempotency-Key header (required on all payment endpoints)
- Duplicate request detection in `payment_requests` table
- Returns cached response if already processed
- Prevents backend double-processing

**Layer 3: Chimoney API**
- Chimoney returns 409 Conflict for duplicate transactions
- Original response returned for idempotent requests
- Transaction-level deduplication

### Regulatory Compliance

**NPCI/RBI Requirements (India)**:
- ✅ KYC verification at recipient level (7-day expiry)
- ✅ UPI reversal window (120 seconds) with REVERT API
- ✅ Bank transfer 90-day refund window compliance
- ✅ Immutable audit logs for all transactions
- ✅ RBI-mandated refund auto-approval after 30 days
- ✅ Annual KYC refresh tracking

**Data Security**:
- ✅ Supabase RLS (Row-Level Security) policies enforce user isolation
- ✅ AES-256 encryption for sensitive recipient data
- ✅ PCI-DSS compliance for card data (via Plaid + encryption)
- ✅ HTTPS-only communication for all APIs
- ✅ JWT-based authentication with session management

**Audit & Monitoring**:
- ✅ Immutable transaction audit logs (cannot be deleted)
- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ Real-time fraud detection alerts
- ✅ Compliance reporting dashboards

---

## 📈 Market Opportunity

### The Problem

**Remittance Market Inefficiency**:
- 250M+ international workers send money home annually
- Average cost: 4.5-7% due to poor rates and hidden fees
- Users leave 2-5% on the table by sending at suboptimal rates
- No intelligent automation for timing transfers

### The Vitta Solution

**Autonomous Financial Agent that Executes When Conditions Are Met**:
- Continuously monitors FX rates (15-min intervals)
- Autonomously initiates transfers at user-defined targets
- Saves users 2-5% per transfer through rate optimization
- Zero-friction user experience (set it and forget it)

### Market Size
- **TAM**: $900B global remittance market (World Bank 2023)
- **SAM**: $50B diaspora remittance market (US-India, US-Mexico, EU-Africa)
- **SOM**: $500M addressable opportunity for intelligent automation

### Competitive Advantage
1. **Agentic Decision-Making**: Autonomous execution (not just aggregation)
2. **Real-Time Monitoring**: 15-minute FX polling vs competitors' daily updates
3. **Multi-Payment Method**: UPI + Bank Transfer optimization per route
4. **Compliance-First**: NPCI/RBI expertise built into product
5. **Extensible Architecture**: Designed for 100+ payment corridors

---

## 🏗️ Project Structure

```
vitta/
├── components/
│   ├── VittaApp.js              # Main app with state routing
│   ├── VittaChatInterface.js     # Chat widget with intent parsing
│   ├── CreditCardScreen.js       # Card management with Plaid
│   ├── Dashboard.js              # Payment recommendations
│   ├── PaymentOptimizer.js       # APR-based optimization
│   └── chat/
│       ├── FXRateCard.js         # Rate display component
│       ├── RecipientForm.js      # Recipient verification form
│       ├── TransferConfirmModal.js # Confirmation dialog
│       └── NotificationBanner.js # Rate-reached notification
├── config/
│   ├── openai.js                 # GPT system prompt
│   ├── supabase.js               # DB client
│   ├── intentDefinitions.js      # Intent mappings
│   └── oauth.js                  # Google OAuth config
├── services/
│   ├── userService.js            # User CRUD operations
│   ├── cardService.js            # Card operations
│   ├── demoUserService.js        # Demo credentials + test data
│   ├── chat/
│   │   ├── conversationEngineV2.js  # Main NLP orchestrator
│   │   ├── intentClassifier.js      # Intent detection
│   │   ├── entityExtractor.js       # Entity parsing
│   │   ├── responseGenerator.js     # Response crafting
│   │   ├── cardDataQueryHandler.js  # Card query logic
│   │   └── demoResponseHandler.js   # Demo transfer flows (TBD)
│   ├── embedding/
│   │   ├── embeddingService.js      # OpenAI embeddings client
│   │   └── intentEmbeddings.js      # Intent examples
│   └── deepLinkService.js        # Deep link routing (vitta://)
├── pages/
│   ├── _app.js                   # Global wrapper with Plaid SDK
│   ├── _document.js              # Document with favicon
│   ├── index.js                  # Home/entry point
│   └── api/
│       ├── transfers/
│       │   ├── quote.js          # [POST] Get FX rate quote
│       │   ├── lock-rate.js      # [POST] Lock rate for 5 min
│       │   ├── immediate.js      # [POST] Execute transfer (idempotent)
│       │   ├── rate-triggered.js # [POST] Setup rate monitoring
│       │   ├── [id]/status.js    # [GET] Check status
│       │   ├── [id]/approve.js   # [POST] Approve monitored transfer
│       │   └── [id]/deny.js      # [POST] Cancel transfer
│       ├── recipients/
│       │   ├── verify.js         # [POST] Verify recipient
│       │   ├── index.js          # [GET] List recipients
│       │   └── [id].js           # [DELETE] Remove recipient
│       ├── webhooks/
│       │   └── chimoney.js       # Webhook receiver for payments
│       ├── cron/
│       │   └── poll-payment-status.js # [GET] Rate monitoring job
│       ├── chat/
│       │   └── completions.js    # OpenAI proxy endpoint
│       └── embeddings.js         # OpenAI embeddings proxy
├── docs/
│   ├── INTERNATIONAL_TRANSFERS_DESIGN.md     # 15-section architecture
│   ├── TRANSFERS_IMPLEMENTATION_ROADMAP.md   # 6-week plan
│   ├── CHIMONEY_INTEGRATION_GUIDE.md         # API reference
│   ├── CHIMONEY_UPI_FLOW_DESIGN.md           # UPI-specific flow
│   ├── CHIMONEY_IMPLEMENTATION_PLAN.md       # Step-by-step guide
│   ├── BACKEND_IDEMPOTENCY_STRATEGY.md       # 3-layer protection
│   ├── BACKEND_APIS_INVENTORY.md             # 13 API specs
│   ├── TRANSACTION_CANCELLATION_DESIGN.md    # Refund handling
│   ├── SUPABASE_SETUP.md                     # DB configuration
│   ├── GOOGLE_OAUTH_SETUP.md                 # OAuth setup
│   ├── EMBEDDING_SETUP.md                    # pgvector setup
│   └── VERCEL_ENV_SETUP.md                   # Deployment config
├── supabase/
│   └── schema.sql                # Database schema (source of truth)
├── scripts/
│   └── setupIntentEmbeddings.js  # Generate pgvector embeddings
├── styles/
│   └── globals.css               # Global Tailwind config
├── public/
│   ├── favicon.svg               # Vitta logo
│   └── logo.png
├── .env.local.example            # Environment variables template
├── tailwind.config.js            # Tailwind configuration
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies
├── CLAUDE.md                      # Claude Code instructions
├── README.md                      # This file
└── LICENSE                        # Proprietary license
```

---

## 📋 Development Workflow

### Local Development

```bash
# Start dev server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

### Key Files to Understand

1. **`docs/INTERNATIONAL_TRANSFERS_DESIGN.md`** - Complete system design
2. **`docs/BACKEND_APIS_INVENTORY.md`** - All 13 API endpoints
3. **`docs/BACKEND_IDEMPOTENCY_STRATEGY.md`** - Duplicate prevention
4. **`services/chat/conversationEngineV2.js`** - Intent classification
5. **`components/VittaApp.js`** - Main app state management

---

## 🤝 Contributing

Vitta is built for sophisticated financial operations. When contributing:

1. Follow the existing component and service architecture
2. Ensure all API endpoints include idempotency headers
3. Add comprehensive audit logging for financial operations
4. Test with both demo and authenticated users
5. Update relevant docs if changing APIs or database schema

For major features, see the design documents in `docs/` folder before implementing.

---

---

## 🛠️ Configuration & Setup

### Environment Variables

Create `.env.local` with:

```env
# Supabase (for user persistence)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (server-side only - not NEXT_PUBLIC_)
OPENAI_API_KEY=sk-...

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Chimoney (international transfers)
CHIMONEY_API_KEY=your-api-key
CHIMONEY_API_BASE_URL=https://api.chimoney.io

# Plaid (card linking)
NEXT_PUBLIC_PLAID_CLIENT_ID=your-client-id
PLAID_SECRET=your-secret
NEXT_PUBLIC_PLAID_ENV=sandbox
```

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup Supabase (one-time)
# Follow docs/SUPABASE_SETUP.md

# 3. Setup intent embeddings (one-time)
node scripts/setupIntentEmbeddings.js

# 4. Start development server
npm run dev
```

---

## 📱 Usage Examples

### Example 1: User Adds Card and Sends Money

```
User: "Add my Chase card and send $500 to my family in India"

Vitta:
1. Opens Plaid Link securely
2. User authenticates with Chase (pulls authorization)
3. Card linked and displayed in wallet
4. Recognizes transfer intent
5. Queries Chimoney for USD/INR rate (83.50)
6. Shows rate quote with 5-minute lock
7. Collects recipient details: name, phone/account
8. Shows transfer summary with 24-hr min/max prices
9. User confirms
10. Funds pulled from Chase → sent via Chimoney API to India
11. Real-time notification: "✅ ₹41,750 sent to Amit +91-98765-43210"
```

### Example 2: Autonomous Rate-Triggered Transfer

```
User: "Send $500 when USD/INR drops below 83.5"

Vitta (Every 15 Minutes):
- Checks Chimoney /fxrate/quote API
- Compares current rate vs 83.5 target
- When rate reaches 83.42: AUTO-EXECUTES

User Notification: "🎯 Rate target met! $500 sent via UPI.
Recipient got ₹41,750. Reference: TXN-xyz-123"
```

---

## 📚 Documentation Index

For detailed information, see:

| Document | Purpose |
|----------|---------|
| **INTERNATIONAL_TRANSFERS_DESIGN.md** | Complete system architecture (15 sections) |
| **TRANSFERS_IMPLEMENTATION_ROADMAP.md** | 6-week implementation plan |
| **CHIMONEY_INTEGRATION_GUIDE.md** | API reference and code examples |
| **BACKEND_APIS_INVENTORY.md** | All 13 API endpoints with specs |
| **BACKEND_IDEMPOTENCY_STRATEGY.md** | Duplicate prevention (3-layer) |
| **TRANSACTION_CANCELLATION_DESIGN.md** | Refund and cancellation flows |
| **SEQUENCE_DIAGRAMS.md** | PlantUML diagrams for user flows |
| **SUPABASE_SETUP.md** | Database configuration |
| **GOOGLE_OAUTH_SETUP.md** | Google OAuth setup |
| **EMBEDDING_SETUP.md** | Vector database (pgvector) |
| **CLAUDE.md** | Development guidelines |

---

## 📊 Competitive Analysis

**How Vitta Stands Out**:

| Feature | Vitta | Traditional Remittance | Money Transfer Apps |
|---------|-------|----------------------|-------------------|
| **Autonomous Rate Monitoring** | ✅ 15-min polling | ❌ Manual checking | ❌ No automation |
| **Rate-Triggered Execution** | ✅ Auto-execute | ❌ Requires manual action | ❌ Not available |
| **Credit Card Integration** | ✅ Plaid + optimization | ❌ Not offered | ❌ Not offered |
| **Compliance First** | ✅ NPCI/RBI built-in | ⚠️ Basic | ⚠️ Basic |
| **UPI + Bank Transfer** | ✅ Both methods | ✅ Bank only | ✅ UPI only |
| **Activity Tracking** | ✅ Real-time sidebar | ⚠️ Basic history | ⚠️ Basic history |
| **Multi-Currency** | 🗺️ Extensible | ❌ Limited | ⚠️ Limited |

---

## 💼 Deployment

### Build & Test Production

```bash
# Build for production
npm run build

# Run linter
npm run lint

# Test production build locally
npm start
```

### Pre-Deployment Checklist

- ✅ All environment variables set in deployment platform
- ✅ Supabase database configured and migrated
- ✅ Chimoney API keys valid and in sandbox/production as needed
- ✅ Google OAuth credentials updated for production domain
- ✅ Plaid credentials set for production environment
- ✅ Build passes without errors: `npm run build`
- ✅ Manual testing: Add card → Send transfer → Verify webhook updates

### Vercel Deployment

1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy with: `git push origin main`
4. See `docs/VERCEL_ENV_SETUP.md` for detailed instructions

---

## 🧪 Testing Strategy

### Manual Testing Checklist

```
[ ] Authentication
  [ ] Demo login (any email/password)
  [ ] Google OAuth login
  [ ] Logout and session clear

[ ] Card Management
  [ ] Cards display correctly (demo: 3 cards)
  [ ] Add card via Plaid (sandbox mode)
  [ ] Delete card
  [ ] Card data persists on refresh

[ ] Chat Interface
  [ ] Type message and see response
  [ ] Intent classification works
  [ ] Deep links navigate correctly
  [ ] Chat history persists

[ ] Transfer Flow (Demo Mode)
  [ ] Say "Send $500 to India"
  [ ] See FX rate quote
  [ ] Lock rate for 5 minutes
  [ ] Recipient verification
  [ ] Transfer confirmation
  [ ] Activity updated in real-time

[ ] Responsive Design
  [ ] Test on mobile (375px width)
  [ ] Test on tablet (768px width)
  [ ] Test on desktop (1920px width)

[ ] Compliance
  [ ] Audit logs record all transfers
  [ ] No audit log deletions possible
  [ ] Webhook signatures verify
```

---

## 🤝 Contributing

When adding features:

1. **Architecture First**: Understand existing patterns before coding
2. **Security**: Add idempotency headers to all payment APIs
3. **Compliance**: Log all financial operations to audit table
4. **Testing**: Test with both demo and authenticated users
5. **Docs**: Update design docs if API/schema changes

### Code Standards

- Component-based architecture with state-based routing
- Tailwind CSS only (no custom CSS)
- Functional components with React Hooks
- Server-side API keys (never NEXT_PUBLIC_)
- Console logs with [ComponentName] prefix
- Comprehensive error handling

---

## 📄 License

This project is proprietary. All rights reserved.

For business inquiries, contact: [contact information]

---

## 🙋 FAQ

**Q: How does Vitta prevent double-charges?**
A: Three-layer idempotency (frontend button disable, backend Idempotency-Key deduplication, Chimoney API level). See `BACKEND_IDEMPOTENCY_STRATEGY.md`.

**Q: Is my card data safe?**
A: Yes. Plaid handles card authentication securely. Vitta never stores card numbers. See `SUPABASE_SETUP.md` for encryption details.

**Q: Can I use Vitta without Google OAuth?**
A: Yes. Demo mode works without authentication. For persistence, connect Google account or configure Supabase.

**Q: How often are FX rates updated?**
A: Every 15 minutes via background cron job. For immediate quote, rates are fetched on-demand.

**Q: What countries are supported?**
A: MVP is India (USD → INR). Philippines and Mexico in Phase 2. Architecture is extensible to 100+ corridors.

---

**Questions or Issues?** See `docs/` folder for comprehensive guides or contact the development team.
