# Backend Architecture: Code Separation & API Design

## Overview

Vitta follows a **clear separation between frontend (client-side) and backend (server-side)** code:

- **Frontend**: React components in `/components/` and `/pages/`
- **Backend**: API routes in `/pages/api/` and server-side services
- **Shared Services**: `/services/` (can run on both client and server)

---

## Current Architecture

### Existing API Routes (in `/pages/api/`)

```
pages/api/
├── chat/
│   └── completions.js          ✅ OpenAI proxy (POST)
└── embeddings.js               ✅ OpenAI embeddings proxy (POST)
```

**Current APIs**:
1. **POST /api/chat/completions** - Chat completion proxy
2. **POST /api/embeddings** - Embedding generation proxy

Both are **proxies** - they forward requests to OpenAI while keeping the API key server-side.

---

## Enhanced Recommendation Engine: Backend Integration Points

### Phase 1: Foundation (COMPLETED)
No new APIs created yet. Phase 1 is purely **business logic**:
- categoryDefinitions.js - Pure data & helpers (no API)
- mccCodeMapper.js - Pure classification (no API)

These services are **isomorphic** - they can run on:
- ✅ Client-side (browser) - for immediate recommendations
- ✅ Server-side (Node.js) - for API endpoints
- ✅ Tests - for validation

### Phase 2: Integration (UPCOMING)
New services that could use APIs:
- merchantClassifier.js - Could use database lookup (needs API if not cached)
- merchantDatabase.js - Database operations (backend only)
- categoryMatcher.js - Pure logic (no API needed)
- enhancedRecommendationEngine.js - Orchestrator (no API needed)

### Phase 3: Deployment (UPCOMING)
Optional new APIs:
- **POST /api/recommend/classify** - Merchant classification endpoint
- **POST /api/recommend/suggest** - Get recommendations endpoint
- **POST /api/recommend/confidence** - Classification confidence details

---

## Code Separation: Frontend vs Backend

### Frontend Code (Client-Side Only)
```
components/
├── VittaApp.js                 # Main app component
├── VittaChatInterface.js       # Chat UI
├── CreditCardScreen.js         # Card UI
├── DashboardWithTabs.js        # Dashboard UI
└── ... (other React components)

pages/
├── _app.js                     # Next.js app wrapper
├── _document.js                # Custom HTML wrapper
└── index.js                    # Entry point
```

**Characteristics**:
- React hooks (useState, useRef, useEffect)
- Tailwind CSS styling
- Event handlers (onClick, onChange)
- State management (local state only)
- API calls (fetch to `/api/` routes)

### Backend Code (Server-Side Only)
```
pages/api/
├── chat/
│   └── completions.js          # OpenAI proxy
└── embeddings.js               # Embedding proxy
```

**Characteristics**:
- Next.js API route handlers (req, res)
- Environment variables (process.env)
- Server-side libraries (fetch, crypto)
- Database connections (future)
- No React dependencies

### Shared Services (Both Client & Server)
```
services/
├── categories/
│   └── categoryDefinitions.js   # 14 categories metadata
├── merchantClassification/
│   └── mccCodeMapper.js         # MCC code classification
├── recommendations/
│   ├── recommendationEngine.js  # Recommendation orchestrator
│   ├── recommendationStrategies.js  # Scoring logic
│   └── ... (other services)
├── chat/
│   ├── conversationEngine.js    # NLU processing
│   ├── intentClassifier.js      # Intent detection
│   └── ... (other services)
├── cardService.js              # Card data operations
├── userService.js              # User data operations
└── ... (other services)
```

**Characteristics**:
- Pure JavaScript (no React, no Next.js)
- No DOM access
- No browser APIs (window, localStorage, etc.)
- No server-specific APIs (process.env in main logic)
- Can import/use in both client and server code

---

## Enhanced Recommendation Engine: Code Placement

### Phase 1: All in Shared Services ✅
```
services/
├── categories/
│   └── categoryDefinitions.js    # SHARED - No API needed
└── merchantClassification/
    └── mccCodeMapper.js          # SHARED - No API needed
```

**Why Shared?**
- Pure classification logic
- No external dependencies
- Fast execution (<10ms)
- Can run anywhere (client or server)
- No sensitive data
- No database access

### Phase 2: Mix of Shared & Backend-Only
```
services/
├── categories/
│   └── categoryDefinitions.js    # SHARED
├── merchantClassification/
│   ├── mccCodeMapper.js          # SHARED
│   ├── merchantClassifier.js      # SHARED - Main classifier
│   ├── merchantDatabase.js        # BACKEND-ONLY (future DB access)
│   └── ... (other services)
└── recommendations/
    ├── categoryMatcher.js         # SHARED - Reward matching
    └── enhancedRecommendationEngine.js  # SHARED - Orchestrator
```

**Explanation**:
- **merchantClassifier.js** - Will be SHARED (pure logic, can add caching)
- **merchantDatabase.js** - Will be BACKEND-ONLY (direct database access)
- **categoryMatcher.js** - Will be SHARED (pure lookup logic)
- **enhancedRecommendationEngine.js** - Will be SHARED (orchestrates other services)

### Phase 3: Optional APIs for Performance
```
pages/api/
├── chat/
│   └── completions.js           # Existing
├── embeddings.js                # Existing
└── recommend/                   # NEW (optional for Phase 3)
    ├── classify.js              # POST - Merchant classification
    ├── suggest.js               # POST - Get recommendations
    └── confidence.js            # POST - Classification details
```

**When to Use APIs**:
- ✅ If merchant database is large (need caching)
- ✅ If classification is slow (need server-side optimization)
- ✅ If we want to track recommendations server-side
- ✅ For analytics and monitoring
- ✅ For data that shouldn't expose to client

**NOT Needed Yet**:
- ❌ Phase 1 services are fast enough for client-side
- ❌ Phase 2 services have no database dependency yet
- ❌ No sensitive data in merchant classification
- ❌ Pure logic should stay in services, not APIs

---

## Execution Flow: Where Code Runs

### Current Recommendation Flow (5 Categories)
```
┌─────────────────────────────┐
│  User asks in Chat (Client)  │
│  "Best card for Netflix?"    │
└──────────────┬──────────────┘
               │
         CLIENT-SIDE
               ▼
┌─────────────────────────────┐
│  VittaChatInterface.js      │
│  - Captures user message    │
│  - Sends to OpenAI          │
└──────────────┬──────────────┘
               │
         SERVER-SIDE (Optional)
               ▼
┌─────────────────────────────┐
│  /api/chat/completions.js   │
│  - Proxies to OpenAI        │
│  - Keeps API key secure     │
└──────────────┬──────────────┘
               │
         CLIENT-SIDE
               ▼
┌─────────────────────────────┐
│  conversationEngine.js      │
│  - Extracts intent          │
│  - Parses entities          │
└──────────────┬──────────────┘
               │
         CLIENT-SIDE
               ▼
┌─────────────────────────────┐
│  recommendationEngine.js    │
│  - Scores cards             │
│  - Ranks recommendations    │
└──────────────┬──────────────┘
               │
         CLIENT-SIDE
               ▼
┌─────────────────────────────┐
│  Display recommendations    │
│  (in VittaChatInterface)    │
└─────────────────────────────┘
```

### Enhanced Recommendation Flow (14 Categories) - Phase 2+
```
┌──────────────────────────────┐
│  User asks in Chat (Client)  │
│  "Best card for Whole Foods?"│
└──────────────┬───────────────┘
               │
         CLIENT-SIDE
               ▼
┌──────────────────────────────┐
│  categoryDefinitions.js      │  ← PHASE 1
│  - All 14 categories defined │
└──────────────┬───────────────┘
               │
         CLIENT-SIDE
               ▼
┌──────────────────────────────┐
│  mccCodeMapper.js            │  ← PHASE 1
│  - MCC code → category       │
└──────────────┬───────────────┘
               │
         CLIENT-SIDE (or API)
               ▼
┌──────────────────────────────┐
│  merchantClassifier.js       │  ← PHASE 2
│  - Classify "Whole Foods"    │
│  - Multi-source verification │
└──────────────┬───────────────┘
               │
    OPTIONAL: API Gateway
               ▼
     /api/recommend/classify    (if needed for caching)
               │
         CLIENT-SIDE
               ▼
┌──────────────────────────────┐
│  categoryMatcher.js          │  ← PHASE 2
│  - Match to card rewards     │
└──────────────┬───────────────┘
               │
         CLIENT-SIDE
               ▼
┌──────────────────────────────┐
│  recommendationEngine.js     │
│  - Score with new categories │
│  - Rank recommendations      │
└──────────────┬───────────────┘
               │
         CLIENT-SIDE
               ▼
┌──────────────────────────────┐
│  Display recommendations     │
│  + Category explanation      │
└──────────────────────────────┘
```

---

## Design Decision: Client-Side vs Server-Side

### Current Decision: Client-Side Heavy (Recommended)

**Why run recommendation logic on client?**

✅ **Performance**
- No network latency
- Instant recommendations
- User feedback feels snappy

✅ **Scalability**
- Reduces server load
- Each client computes independently
- No bottleneck at server

✅ **Reliability**
- Works offline (recommendations still work)
- Doesn't depend on server availability
- Graceful degradation

✅ **Privacy**
- User data stays on client
- No server-side tracking of queries
- Card analysis doesn't leave device

✅ **Simplicity**
- No database needed (for Phase 1-2)
- No session management
- No caching complexity

### When to Move to Server-Side (Phase 3)

❌ **Don't move to server unless:**
- Merchant database gets large (>10,000 entries)
- Classification needs ML model
- Want to track recommendation analytics
- Need A/B testing on recommendations
- Want to share recommendations across devices

---

## API Design: When Needed

### Future API: Merchant Classification (Phase 3 - Optional)

**Endpoint**: `POST /api/recommend/classify`

```javascript
// Request
{
  "merchant_name": "Whole Foods Market",
  "mcc_code": "5411",  // optional
  "amount": 100,       // optional
  "context": "grocery shopping"  // optional
}

// Response
{
  "category_id": "groceries",
  "category_name": "Groceries & Supermarkets",
  "confidence": 0.95,
  "source": "keyword_match",
  "explanation": "Classified as Groceries based on keyword 'whole foods' in database",
  "alternatives": [
    { "category": "warehouse", "confidence": 0.15 }
  ],
  "processing_time_ms": 5
}
```

### Future API: Recommendation Request (Phase 3 - Optional)

**Endpoint**: `POST /api/recommend/suggest`

```javascript
// Request
{
  "user_id": "user-123",  // optional
  "merchant": "Netflix",
  "amount": 15.99,
  "strategy": "rewards",  // or "apr" or "grace_period"
  "num_suggestions": 3
}

// Response
{
  "strategy": "rewards",
  "merchant_category": "streaming",
  "recommendations": [
    {
      "card_id": "card-123",
      "card_name": "Chase Sapphire Preferred",
      "multiplier": 2,
      "value": 0.32,
      "explanation": "Best cashback on streaming services"
    }
  ],
  "confidence": 0.95,
  "processing_time_ms": 12
}
```

---

## Summary: Phase 1 Backend Impact

### What Changed in Phase 1?
✅ **Created**: categoryDefinitions.js (shared service)
✅ **Created**: mccCodeMapper.js (shared service)
✅ **Created**: 147 tests (no API tests needed)
✅ **Modified**: None (backward compatible)

### Did We Create Any APIs?
❌ **No APIs created in Phase 1**

**Why?**
- Phase 1 is pure business logic
- No database access needed
- No server-side dependencies
- Fast enough for client-side execution
- Keep it simple - YAGNI principle

### Backend Code Separation
```
CLEAR SEPARATION:

Frontend                          Backend
═══════════════════════════════════════════════════════════
✓ React components               ✓ /pages/api/
✓ State management               ✓ API route handlers
✓ UI/UX logic                    ✓ Environment variables
✓ Event handlers                 ✓ Server secrets
                                 ✓ Database connections
                                 ✓ External API proxies

Both Can Use
════════════════════════════════════════════════════════════
✓ /services/* modules
✓ Business logic services
✓ Data transformations
✓ Calculations & scoring
```

---

## For Phase 2-3: How to Add Backend Support

When you need server-side features:

### Step 1: Create Backend-Only Service
```javascript
// services/merchantClassification/merchantDatabase.js
// This runs only on server (checks DB connection)

import { getSupabaseClient } from '../config/supabase'; // Server-only

export async function lookupMerchantInDB(merchantName) {
  const supabase = getSupabaseClient();
  // Only runs server-side!
}
```

### Step 2: Create API Wrapper (If Needed)
```javascript
// pages/api/recommend/classify.js
// This wraps the backend service for client requests

import { classifyMerchant } from '../../services/merchantClassification/merchantClassifier';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { merchant, mccCode } = req.body;

  try {
    // Can now use server-only features
    const result = await classifyMerchant(merchant, mccCode);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

### Step 3: Update Client to Use API (If Needed)
```javascript
// In React component or shared service
async function classifyMerchantWithServer(merchant, mccCode) {
  // Only call API if needed (for caching, analytics, etc.)
  const response = await fetch('/api/recommend/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchant, mccCode })
  });

  return response.json();
}
```

---

## Conclusion

**Phase 1 maintains clean separation:**
- ✅ No new APIs (not needed)
- ✅ Pure shared services (reusable)
- ✅ No breaking changes to existing APIs
- ✅ Ready for client-side use
- ✅ Ready for server-side use (if needed later)

**The enhanced recommendation engine is built as reusable services** that can run anywhere, with API support to be added only when needed in Phase 3.

This follows the **YAGNI principle**: "You Aren't Gonna Need It" - don't create infrastructure (APIs) until you actually need them.
