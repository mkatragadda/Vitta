# Vitta Travel Pay - Implementation Plan

**Version:** 1.0
**Date:** April 9, 2026
**Implementation Approach:** Path 3 (Hybrid)
**Estimated Time:** 2.5 hours for Phase 1 Demo

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Setup & Infrastructure](#phase-1-setup--infrastructure)
4. [Phase 2: Database Schema Migration](#phase-2-database-schema-migration)
5. [Phase 3: Wise Service Layer](#phase-3-wise-service-layer)
6. [Phase 4: API Routes](#phase-4-api-routes)
7. [Phase 5: QR Scanner Component](#phase-5-qr-scanner-component)
8. [Phase 6: Dashboard Integration](#phase-6-dashboard-integration)
9. [Testing & Validation](#testing--validation)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### Implementation Strategy: Path 3 (Hybrid Approach)

**Philosophy:** Build new features alongside existing code with minimal disruption

**Key Principles:**
- ✅ Keep existing features intact (Plaid, Google Auth, Supabase)
- ✅ Add feature flags for easy toggling
- ✅ Use additive database migrations (no breaking changes)
- ✅ Isolate new code in separate directories
- ✅ Manual demo flow first, automation later

### Timeline

| **Phase** | **Duration** | **Deliverable** |
|-----------|--------------|-----------------|
| Phase 1 | 30 minutes | Dependencies, config files |
| Phase 2 | 15 minutes | Database tables created |
| Phase 3 | 45 minutes | Wise service layer complete |
| Phase 4 | 30 minutes | 3 API endpoints working |
| Phase 5 | 30 minutes | QR scanner functional |
| Phase 6 | 15 minutes | UI integration complete |
| **Total** | **2.5 hours** | **Working demo** |

---

## Prerequisites

### Required Accounts & Credentials

#### 1. Wise Sandbox Account

**Setup Steps:**
1. Go to https://sandbox.transferwise.tech/
2. Sign up for developer account
3. Generate personal access token
4. Note your profile ID

**What You'll Need:**
```bash
WISE_API_TOKEN_SANDBOX=your-sandbox-token-here
WISE_PROFILE_ID_SANDBOX=your-profile-id-here
```

#### 2. Supabase Access

**Verify You Have:**
- Supabase project URL
- Anon key
- Database access (SQL Editor)

#### 3. Development Environment

**Required:**
- Node.js 18+ installed
- npm or yarn
- Code editor (VS Code recommended)
- Chrome/Firefox (for camera access)

**Verify Setup:**
```bash
node --version  # Should be 18+
npm --version   # Should be 9+
```

---

## Phase 1: Setup & Infrastructure

**Duration:** 30 minutes

### Step 1.1: Install Dependencies

```bash
# Navigate to project directory
cd /Users/marxkatragadda/Documents/VittaChat/Vitta

# Install QR scanner library
npm install html5-qrcode

# Optional: Install axios for better HTTP handling
npm install axios

# Verify installation
npm list html5-qrcode
```

**Expected Output:**
```
vitta@0.1.0
└── html5-qrcode@2.3.8
```

---

### Step 1.2: Add Environment Variables

**File:** `.env.local`

Add the following to your existing `.env.local`:

```bash
# ============================================================================
# VITTA TRAVEL PAY - WISE API CONFIGURATION
# ============================================================================

# Wise Sandbox (for testing)
WISE_API_TOKEN_SANDBOX=your-sandbox-token-here
WISE_PROFILE_ID_SANDBOX=your-profile-id-here

# Wise Production (add later)
WISE_API_TOKEN_LIVE=
WISE_PROFILE_ID_LIVE=

# Feature Flags
NEXT_PUBLIC_TRAVEL_PAY_ENABLED=true
NEXT_PUBLIC_LEGACY_FEATURES_ENABLED=false
```

**⚠️ Important:** Never commit `.env.local` to git!

**Verify:**
```bash
# Check file exists and is in .gitignore
cat .gitignore | grep ".env.local"
```

---

### Step 1.3: Create Feature Flag Config

**File:** `config/features.js`

```javascript
/**
 * Feature Flags Configuration
 * Controls which features are enabled/disabled
 */

export const FEATURE_FLAGS = {
  // Travel Pay Features
  TRAVEL_PAY_ENABLED: process.env.NEXT_PUBLIC_TRAVEL_PAY_ENABLED === 'true',
  QR_SCANNER_ENABLED: true,
  WISE_ENABLED: true,

  // Legacy Features (Credit Card Optimizer)
  LEGACY_CREDIT_CARDS: process.env.NEXT_PUBLIC_LEGACY_FEATURES_ENABLED === 'true',
  LEGACY_OPTIMIZER: false,
  LEGACY_EXPENSE_FEED: false,

  // Third-party Integrations
  CHIMONEY_ENABLED: false, // Disabled in favor of Wise
  PLAID_ENABLED: true,     // Keep for bank linking
  GOOGLE_AUTH_ENABLED: true, // Keep for authentication
};

export default FEATURE_FLAGS;
```

**Usage Example:**
```javascript
import { FEATURE_FLAGS } from '../config/features';

if (FEATURE_FLAGS.TRAVEL_PAY_ENABLED) {
  // Show Travel Pay UI
}
```

---

### Step 1.4: Create Wise Configuration

**File:** `config/wise.js`

```javascript
/**
 * Wise API Configuration
 * Loads appropriate credentials based on environment
 */

const getWiseConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  // Sandbox configuration (development/staging)
  if (env === 'development' || env === 'staging') {
    const apiToken = process.env.WISE_API_TOKEN_SANDBOX;
    const profileId = process.env.WISE_PROFILE_ID_SANDBOX;

    if (!apiToken || !profileId) {
      throw new Error(
        'Wise sandbox credentials not configured. ' +
        'Add WISE_API_TOKEN_SANDBOX and WISE_PROFILE_ID_SANDBOX to .env.local'
      );
    }

    return {
      apiKey: apiToken,
      profileId: profileId,
      environment: 'sandbox',
      baseURL: 'https://api.sandbox.transferwise.tech',
      isSandbox: true,
    };
  }

  // Production configuration
  if (env === 'production') {
    const apiToken = process.env.WISE_API_TOKEN_LIVE;
    const profileId = process.env.WISE_PROFILE_ID_LIVE;

    if (!apiToken || !profileId) {
      throw new Error(
        'Wise production credentials not configured. ' +
        'Add WISE_API_TOKEN_LIVE and WISE_PROFILE_ID_LIVE'
      );
    }

    return {
      apiKey: apiToken,
      profileId: profileId,
      environment: 'live',
      baseURL: 'https://api.wise.com',
      isSandbox: false,
    };
  }

  throw new Error(`Unknown NODE_ENV: ${env}`);
};

export default getWiseConfig;
```

**Test:**
```javascript
// In Node.js console or test file
import getWiseConfig from './config/wise';
const config = getWiseConfig();
console.log(config); // Should show sandbox config
```

---

### Step 1.5: Restart Development Server

```bash
# Stop current server (Ctrl+C if running)
# Then restart
npm run dev
```

**Verify:**
- Server starts without errors
- Visit http://localhost:3000
- App loads normally

---

## Phase 2: Database Schema Migration

**Duration:** 15 minutes

### Step 2.1: Create Migration File

**File:** `supabase/migrations/001-travel-pay.sql`

```sql
-- ============================================================================
-- VITTA TRAVEL PAY - DATABASE MIGRATION
-- Version: 1.0
-- Date: 2026-04-09
-- Description: Adds tables for Travel Pay feature (UPI, Wise integration)
-- ============================================================================

-- Safety: Use CREATE TABLE IF NOT EXISTS for idempotency
-- This allows running the migration multiple times safely

-- ============================================================================
-- 1. UPI_SCANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS upi_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- QR Code Data
  raw_qr_data TEXT NOT NULL,
  upi_id VARCHAR(255),
  payee_name VARCHAR(255),
  amount NUMERIC(12,2),
  transaction_note TEXT,
  merchant_code VARCHAR(100),

  -- Scan Metadata
  scan_location JSONB,
  device_info JSONB,
  scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Processing Status
  status VARCHAR(50) DEFAULT 'scanned',
  transfer_id UUID REFERENCES transfers(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_scan_status CHECK (status IN ('scanned', 'quoted', 'paid', 'failed', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_upi_scans_user_id ON upi_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_upi_scans_status ON upi_scans(status);
CREATE INDEX IF NOT EXISTS idx_upi_scans_created_at ON upi_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upi_scans_transfer_id ON upi_scans(transfer_id);

-- ============================================================================
-- 2. WISE_QUOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wise_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upi_scan_id UUID REFERENCES upi_scans(id),

  -- Wise API Data
  wise_quote_id VARCHAR(255) UNIQUE NOT NULL,
  source_amount NUMERIC(10,2) NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  exchange_rate NUMERIC(10,4) NOT NULL,
  fee_amount NUMERIC(10,2) DEFAULT 0,
  total_debit NUMERIC(10,2) NOT NULL,

  -- Quote Validity
  rate_type VARCHAR(50) DEFAULT 'FIXED',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'active',
  used_for_transfer_id UUID REFERENCES transfers(id),

  -- Metadata
  wise_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT check_quote_status CHECK (status IN ('active', 'used', 'expired', 'cancelled'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wise_quotes_user_id ON wise_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_wise_quotes_wise_id ON wise_quotes(wise_quote_id);
CREATE INDEX IF NOT EXISTS idx_wise_quotes_expires_at ON wise_quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_wise_quotes_status ON wise_quotes(status);

-- ============================================================================
-- 3. WISE_TRANSFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wise_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Wise Identifiers
  wise_transfer_id VARCHAR(255) UNIQUE NOT NULL,
  wise_quote_id VARCHAR(255) NOT NULL,

  -- Transfer Details
  source_amount NUMERIC(10,2) NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  exchange_rate NUMERIC(10,4) NOT NULL,

  -- Recipient (UPI)
  recipient_type VARCHAR(50) DEFAULT 'upi',
  recipient_upi_id VARCHAR(255),
  recipient_name VARCHAR(255),

  -- Status Tracking
  wise_status VARCHAR(100),
  status_updates JSONB[] DEFAULT ARRAY[]::JSONB[],

  -- Settlement
  expected_delivery_date DATE,
  actual_delivery_date DATE,

  -- Wise API Response
  wise_response JSONB,
  wise_error JSONB,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wise_transfers_transfer_id ON wise_transfers(transfer_id);
CREATE INDEX IF NOT EXISTS idx_wise_transfers_user_id ON wise_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_wise_transfers_wise_id ON wise_transfers(wise_transfer_id);
CREATE INDEX IF NOT EXISTS idx_wise_transfers_wise_status ON wise_transfers(wise_status);

-- ============================================================================
-- 4. TRAVEL_PAY_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS travel_pay_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Notification Preferences
  notify_on_scan BOOLEAN DEFAULT true,
  notify_on_quote_expiry BOOLEAN DEFAULT true,
  notify_on_transfer_complete BOOLEAN DEFAULT true,

  -- Auto-behavior
  auto_approve_under_amount NUMERIC(10,2),
  require_biometric BOOLEAN DEFAULT true,

  -- Default Source
  default_plaid_account_id VARCHAR(255),

  -- Limits
  daily_limit_usd NUMERIC(10,2) DEFAULT 1000,
  per_transaction_limit_usd NUMERIC(10,2) DEFAULT 500,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. EXTEND EXISTING TRANSFERS TABLE
-- ============================================================================
-- Add Wise-specific columns to existing transfers table
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'chimoney';
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS provider_transfer_id VARCHAR(255);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'bank_transfer';

-- Add constraints
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS check_payment_provider;
ALTER TABLE transfers ADD CONSTRAINT check_payment_provider
  CHECK (payment_provider IN ('chimoney', 'wise'));

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS check_payment_method;
ALTER TABLE transfers ADD CONSTRAINT check_payment_method
  CHECK (payment_method IN ('bank_transfer', 'upi', 'card'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_transfers_provider ON transfers(payment_provider);
CREATE INDEX IF NOT EXISTS idx_transfers_provider_id ON transfers(provider_transfer_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
```

---

### Step 2.2: Run Migration in Supabase

**Steps:**

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your Vitta project

2. **Navigate to SQL Editor**
   - Left sidebar → SQL Editor
   - Click "New query"

3. **Paste Migration SQL**
   - Copy entire contents of `001-travel-pay.sql`
   - Paste into SQL editor

4. **Execute Migration**
   - Click "Run" button
   - Wait for success message

5. **Verify Tables Created**
   ```sql
   -- Run this query to verify
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('upi_scans', 'wise_quotes', 'wise_transfers', 'travel_pay_settings')
   ORDER BY table_name;
   ```

**Expected Output:**
```
table_name
------------------
travel_pay_settings
upi_scans
wise_quotes
wise_transfers
```

---

### Step 2.3: Verify Schema

**Test Queries:**

```sql
-- 1. Check upi_scans structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'upi_scans'
ORDER BY ordinal_position;

-- 2. Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('upi_scans', 'wise_quotes', 'wise_transfers')
ORDER BY tablename, indexname;

-- 3. Verify foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('upi_scans', 'wise_quotes', 'wise_transfers');
```

---

## Phase 3: Wise Service Layer

**Duration:** 45 minutes

### Step 3.1: Create Wise Client (HTTP Layer)

**File:** `services/wise/wiseClient.js`

```javascript
/**
 * Wise API HTTP Client
 * Low-level HTTP communication with retry logic
 */

class WiseClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.profileId = config.profileId;
    this.baseURL = config.baseURL;
    this.environment = config.environment;

    console.log('[WiseClient] Initialized:', {
      environment: this.environment,
      baseURL: this.baseURL,
      profileId: this.profileId,
    });
  }

  /**
   * GET request with retry logic
   */
  async get(path, params = {}) {
    const url = new URL(path, this.baseURL);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    return this._fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: this._getHeaders(),
    });
  }

  /**
   * POST request with retry logic
   */
  async post(path, data = {}) {
    const url = `${this.baseURL}${path}`;

    return this._fetchWithRetry(url, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify(data),
    });
  }

  /**
   * Private: Build headers
   */
  _getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Private: Fetch with exponential backoff retry
   */
  async _fetchWithRetry(url, options, attempt = 1, maxAttempts = 3) {
    try {
      console.log(`[WiseClient] Request [${attempt}/${maxAttempts}]:`, {
        method: options.method,
        url,
      });

      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        throw this._mapError(response.status, data);
      }

      console.log('[WiseClient] Success:', {
        status: response.status,
        data: JSON.stringify(data).substring(0, 200) + '...',
      });

      return data;

    } catch (error) {
      console.error(`[WiseClient] Error [${attempt}/${maxAttempts}]:`, error.message);

      // Retry on network errors or 5xx (but not 4xx)
      const isRetryable = error.name === 'AbortError' ||
                          error.code?.startsWith('5') ||
                          error.message?.includes('fetch');

      if (isRetryable && attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[WiseClient] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._fetchWithRetry(url, options, attempt + 1, maxAttempts);
      }

      throw error;
    }
  }

  /**
   * Private: Map Wise API errors to friendly messages
   */
  _mapError(status, data) {
    const errorCode = data.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = data.error?.message || data.message || 'Unknown error';

    const errorMap = {
      'INSUFFICIENT_FUNDS': 'Your Wise balance is too low',
      'INVALID_QUOTE': 'Quote has expired, please refresh',
      'DUPLICATE_TRANSFER': 'This transfer was already processed',
      'RECIPIENT_NOT_FOUND': 'Recipient not configured',
      'RATE_LIMIT_EXCEEDED': 'Too many requests, please wait',
    };

    const friendlyMessage = errorMap[errorCode] || errorMessage;

    const error = new Error(friendlyMessage);
    error.code = errorCode;
    error.status = status;
    error.details = data;

    return error;
  }
}

export default WiseClient;
```

**Test:**
```javascript
// Test file: services/wise/__tests__/wiseClient.test.js
import getWiseConfig from '../../config/wise';
import WiseClient from '../wiseClient';

const config = getWiseConfig();
const client = new WiseClient(config);

// Test GET request
const rateData = await client.get('/v1/rates', { source: 'USD', target: 'INR' });
console.log('Rate:', rateData);
```

---

### Step 3.2: Create Rate Service

**File:** `services/wise/wiseRateService.js`

```javascript
/**
 * Wise Rate Service
 * Manages exchange rate fetching with caching
 */

import WiseClient from './wiseClient.js';

class WiseRateService {
  constructor(wiseClient) {
    this.client = wiseClient;
    this.cache = new Map();
    this.cacheTTL = 60 * 1000; // 60 seconds
  }

  /**
   * Get current exchange rate with caching
   */
  async getRate(source = 'USD', target = 'INR') {
    const cacheKey = `${source}:${target}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !this._isStale(cached)) {
      console.log('[WiseRateService] Using cached rate:', cached.rate);
      return cached;
    }

    console.log('[WiseRateService] Fetching fresh rate from Wise...');

    try {
      // Fetch from Wise API
      const rateData = await this._fetchRateFromWise(source, target);

      // Cache the result
      this.cache.set(cacheKey, {
        ...rateData,
        cachedAt: Date.now(),
      });

      return rateData;

    } catch (error) {
      console.error('[WiseRateService] Failed to fetch rate:', error);

      // Fallback to stale cache if available
      if (cached) {
        console.warn('[WiseRateService] Using stale cache as fallback');
        return { ...cached, isStale: true };
      }

      throw new Error(`Failed to get exchange rate: ${error.message}`);
    }
  }

  /**
   * Private: Fetch rate from Wise API
   */
  async _fetchRateFromWise(source, target) {
    const response = await this.client.get('/v1/rates', { source, target });

    return {
      rate: response.rate,
      source: response.source,
      target: response.target,
      rateType: response.rateType || 'LIVE',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Private: Check if cached rate is stale
   */
  _isStale(cached) {
    const age = Date.now() - cached.cachedAt;
    return age > this.cacheTTL;
  }

  /**
   * Clear cache (for testing)
   */
  clearCache() {
    this.cache.clear();
  }
}

export default WiseRateService;
```

---

### Step 3.3: Create Quote Service

**File:** `services/wise/wiseQuoteService.js`

```javascript
/**
 * Wise Quote Service
 * Creates and manages transfer quotes
 */

class WiseQuoteService {
  constructor(wiseClient, supabase) {
    this.client = wiseClient;
    this.db = supabase;
  }

  /**
   * Create a new transfer quote
   */
  async createQuote({ userId, sourceAmount, sourceCurrency, targetCurrency, upiScanId }) {
    console.log('[WiseQuoteService] Creating quote:', {
      userId,
      sourceAmount,
      sourceCurrency,
      targetCurrency,
    });

    // Validate amount
    if (sourceAmount < 1) {
      throw new Error('Minimum transfer amount is $1');
    }

    if (sourceAmount > 10000) {
      throw new Error('Maximum transfer amount is $10,000');
    }

    try {
      // Call Wise API to create quote
      const wiseQuote = await this.client.post('/v3/quotes', {
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        paymentType: 'BALANCE', // For demo with personal token
      });

      console.log('[WiseQuoteService] Wise quote created:', wiseQuote.id);

      // Build quote object for database
      const quote = {
        wise_quote_id: wiseQuote.id,
        user_id: userId,
        upi_scan_id: upiScanId || null,
        source_amount: sourceAmount,
        target_amount: wiseQuote.targetAmount,
        exchange_rate: wiseQuote.rate,
        fee_amount: wiseQuote.fee?.total || 0,
        total_debit: sourceAmount + (wiseQuote.fee?.total || 0),
        rate_type: wiseQuote.rateType || 'FIXED',
        expires_at: wiseQuote.expirationTime,
        status: 'active',
        wise_response: wiseQuote,
      };

      // Save to database
      const { data, error } = await this.db
        .from('wise_quotes')
        .insert(quote)
        .select()
        .single();

      if (error) {
        console.error('[WiseQuoteService] Database error:', error);
        throw error;
      }

      console.log('[WiseQuoteService] Quote saved to DB:', data.id);

      return data;

    } catch (error) {
      console.error('[WiseQuoteService] Failed to create quote:', error);
      throw new Error(`Quote creation failed: ${error.message}`);
    }
  }

  /**
   * Get quote by ID and validate it's still valid
   */
  async getQuote(quoteId) {
    const { data: quote, error } = await this.db
      .from('wise_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error || !quote) {
      throw new Error('Quote not found');
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(quote.expires_at);

    if (now > expiresAt) {
      // Mark as expired
      await this.db
        .from('wise_quotes')
        .update({ status: 'expired' })
        .eq('id', quoteId);

      throw new Error('Quote has expired. Please create a new quote.');
    }

    if (quote.status !== 'active') {
      throw new Error(`Quote is ${quote.status}`);
    }

    return quote;
  }

  /**
   * Mark quote as used after transfer
   */
  async markQuoteUsed(quoteId, transferId) {
    const { error } = await this.db
      .from('wise_quotes')
      .update({
        status: 'used',
        used_for_transfer_id: transferId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (error) {
      console.error('[WiseQuoteService] Failed to mark quote as used:', error);
    }
  }
}

export default WiseQuoteService;
```

---

### Step 3.4: Create UPI Parser Utility

**File:** `utils/upiParser.js`

```javascript
/**
 * UPI QR Code Parser
 * Parses UPI payment strings and extracts data
 */

/**
 * Parse UPI QR code string
 * @param {string} qrText - Raw QR code data
 * @returns {object|null} Parsed UPI data or null if invalid
 */
export function parseUPIQR(qrText) {
  try {
    // UPI format: upi://pay?pa=merchant@bank&pn=Name&am=500&cu=INR
    const url = new URL(qrText);

    if (url.protocol !== 'upi:') {
      console.warn('[parseUPIQR] Invalid protocol:', url.protocol);
      return null;
    }

    const params = new URLSearchParams(url.search);

    const parsed = {
      upiId: params.get('pa'),                              // Payee Address
      payeeName: decodeURIComponent(params.get('pn') || ''), // Payee Name
      amount: parseFloat(params.get('am') || 0),            // Amount
      currency: params.get('cu') || 'INR',                  // Currency
      note: params.get('tn') || '',                         // Transaction Note
      merchantCode: params.get('mc') || '',                 // Merchant Code
    };

    // Validate required fields
    if (!parsed.upiId) {
      console.warn('[parseUPIQR] Missing UPI ID (pa parameter)');
      return null;
    }

    // Validate UPI ID format: something@bank
    const upiRegex = /^[\w.-]+@[\w]+$/;
    if (!upiRegex.test(parsed.upiId)) {
      console.warn('[parseUPIQR] Invalid UPI ID format:', parsed.upiId);
      return null;
    }

    console.log('[parseUPIQR] Parsed successfully:', parsed);
    return parsed;

  } catch (error) {
    console.error('[parseUPIQR] Parse error:', error);
    return null;
  }
}

/**
 * Validate UPI ID format
 */
export function isValidUPI(upiId) {
  const upiRegex = /^[\w.-]+@[\w]+$/;
  return upiRegex.test(upiId);
}

export default {
  parseUPIQR,
  isValidUPI,
};
```

**Test:**
```javascript
import { parseUPIQR } from './utils/upiParser';

const testQR = 'upi://pay?pa=merchant@paytm&pn=Taj+Hotel&am=500&cu=INR';
const result = parseUPIQR(testQR);
console.log(result);
// Expected: { upiId: 'merchant@paytm', payeeName: 'Taj Hotel', amount: 500, ... }
```

---

## Phase 4: API Routes

**Duration:** 30 minutes

### Step 4.1: Create Wise Rate API

**File:** `pages/api/wise/rates.js`

```javascript
/**
 * GET /api/wise/rates
 * Fetch current USD → INR exchange rate
 */

import getWiseConfig from '../../../config/wise';
import WiseClient from '../../../services/wise/wiseClient';
import WiseRateService from '../../../services/wise/wiseRateService';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from = 'USD', to = 'INR' } = req.query;

    console.log('[API/wise/rates] Request:', { from, to });

    // Initialize Wise client
    const config = getWiseConfig();
    const client = new WiseClient(config);
    const rateService = new WiseRateService(client);

    // Get rate (uses cache if available)
    const rateData = await rateService.getRate(from, to);

    console.log('[API/wise/rates] Success:', rateData);

    res.status(200).json({
      success: true,
      data: rateData,
    });

  } catch (error) {
    console.error('[API/wise/rates] Error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

**Test:**
```bash
# In browser or curl
curl http://localhost:3000/api/wise/rates

# Expected response:
# {
#   "success": true,
#   "data": {
#     "rate": 83.45,
#     "source": "USD",
#     "target": "INR",
#     ...
#   }
# }
```

---

### Step 4.2: Create Quote API

**File:** `pages/api/wise/quote.js`

```javascript
/**
 * POST /api/wise/quote
 * Create a transfer quote (locks exchange rate)
 */

import { supabase } from '../../../config/supabase';
import getWiseConfig from '../../../config/wise';
import WiseClient from '../../../services/wise/wiseClient';
import WiseQuoteService from '../../../services/wise/wiseQuoteService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from header
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sourceAmount, sourceCurrency, targetCurrency, upiScanId } = req.body;

    console.log('[API/wise/quote] Request:', {
      userId,
      sourceAmount,
      sourceCurrency,
      targetCurrency,
    });

    // Validate inputs
    if (!sourceAmount || sourceAmount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Initialize services
    const config = getWiseConfig();
    const client = new WiseClient(config);
    const quoteService = new WiseQuoteService(client, supabase);

    // Create quote
    const quote = await quoteService.createQuote({
      userId,
      sourceAmount,
      sourceCurrency: sourceCurrency || 'USD',
      targetCurrency: targetCurrency || 'INR',
      upiScanId: upiScanId || null,
    });

    console.log('[API/wise/quote] Quote created:', quote.id);

    // Calculate time until expiry
    const expiresAt = new Date(quote.expires_at);
    const now = new Date();
    const expiresIn = Math.max(0, Math.floor((expiresAt - now) / 1000));

    res.status(200).json({
      success: true,
      data: {
        quoteId: quote.id,
        sourceAmount: quote.source_amount,
        targetAmount: quote.target_amount,
        rate: quote.exchange_rate,
        fee: quote.fee_amount,
        totalDebit: quote.total_debit,
        expiresAt: quote.expires_at,
        expiresIn,
      },
    });

  } catch (error) {
    console.error('[API/wise/quote] Error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

**Test:**
```bash
# Using curl
curl -X POST http://localhost:3000/api/wise/quote \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id-here" \
  -d '{
    "sourceAmount": 10,
    "sourceCurrency": "USD",
    "targetCurrency": "INR"
  }'
```

---

### Step 4.3: Create UPI Parse API

**File:** `pages/api/upi/parse-qr.js`

```javascript
/**
 * POST /api/upi/parse-qr
 * Parse UPI QR code and save scan record
 */

import { supabase } from '../../../config/supabase';
import { parseUPIQR } from '../../../utils/upiParser';
import WiseClient from '../../../services/wise/wiseClient';
import WiseRateService from '../../../services/wise/wiseRateService';
import getWiseConfig from '../../../config/wise';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { qrData } = req.body;

    console.log('[API/upi/parse-qr] Request:', { userId, qrData: qrData?.substring(0, 50) });

    // Parse UPI QR code
    const parsed = parseUPIQR(qrData);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid UPI QR code' });
    }

    // Get current USD/INR rate
    const config = getWiseConfig();
    const client = new WiseClient(config);
    const rateService = new WiseRateService(client);
    const { rate } = await rateService.getRate('USD', 'INR');

    // Calculate USD equivalent
    const usdEquivalent = parsed.amount > 0 ? parsed.amount / rate : 0;

    // Save scan to database
    const { data: scan, error } = await supabase
      .from('upi_scans')
      .insert({
        user_id: userId,
        raw_qr_data: qrData,
        upi_id: parsed.upiId,
        payee_name: parsed.payeeName,
        amount: parsed.amount,
        transaction_note: parsed.note,
        merchant_code: parsed.merchantCode,
        status: 'scanned',
        scan_timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[API/upi/parse-qr] Database error:', error);
      throw error;
    }

    console.log('[API/upi/parse-qr] Scan saved:', scan.id);

    res.status(200).json({
      success: true,
      data: {
        ...parsed,
        scanId: scan.id,
        usdEquivalent: parseFloat(usdEquivalent.toFixed(2)),
        rate,
      },
    });

  } catch (error) {
    console.error('[API/upi/parse-qr] Error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
```

**Test:**
```bash
curl -X POST http://localhost:3000/api/upi/parse-qr \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "qrData": "upi://pay?pa=merchant@paytm&pn=Taj+Hotel&am=500&cu=INR"
  }'
```

---

## Phase 5: QR Scanner Component

**Duration:** 30 minutes

### Step 5.1: Create QR Scanner Component

**File:** `components/travelpay/QRScanner.js`

```javascript
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle } from 'lucide-react';

export default function QRScanner({ onScanSuccess, onClose }) {
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: "environment" }, // Back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        handleScanError
      );

      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error('[QRScanner] Failed to start:', err);
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch (err) {
        console.error('[QRScanner] Stop error:', err);
      }
    }
  };

  const handleScanSuccess = async (decodedText) => {
    console.log('[QRScanner] Scanned:', decodedText);

    // Stop scanner before processing
    await stopScanner();

    // Pass raw QR data to parent
    onScanSuccess({ raw: decodedText });
  };

  const handleScanError = (errorMessage) => {
    // Suppress "No QR code found" errors (normal during scanning)
    if (!errorMessage.includes('No QR code found')) {
      console.warn('[QRScanner]:', errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex items-center justify-between text-white">
          <h2 className="text-lg font-semibold">Scan UPI QR Code</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Scanner Area */}
      <div id="qr-reader" className="w-full h-full flex items-center justify-center"></div>

      {/* Instructions/Error */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 z-10">
        <div className="text-center text-white">
          {!error && isScanning && (
            <>
              <Camera className="w-12 h-12 mx-auto mb-4 opacity-60" />
              <p className="text-sm opacity-80">
                Position the QR code within the frame
              </p>
            </>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Step 5.2: Create Scan to Pay Screen

**File:** `components/travelpay/ScanToPayScreen.js`

```javascript
import React, { useState } from 'react';
import QRScanner from './QRScanner';
import { Camera, ArrowLeft, CheckCircle, Clock } from 'lucide-react';

export default function ScanToPayScreen({ onBack, userData }) {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async (qrResult) => {
    setShowScanner(false);
    setLoading(true);
    setError(null);

    try {
      console.log('[ScanToPayScreen] Processing scan:', qrResult);

      // Step 1: Parse QR code
      const parseResponse = await fetch('/api/upi/parse-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({ qrData: qrResult.raw }),
      });

      const parseResult = await parseResponse.json();

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse QR code');
      }

      setScannedData(parseResult.data);

      // Step 2: Create quote automatically
      if (parseResult.data.usdEquivalent > 0) {
        await createQuote(parseResult.data);
      }

    } catch (err) {
      console.error('[ScanToPayScreen] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createQuote = async (scanData) => {
    try {
      const quoteResponse = await fetch('/api/wise/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          sourceAmount: scanData.usdEquivalent,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiScanId: scanData.scanId,
        }),
      });

      const quoteResult = await quoteResponse.json();

      if (quoteResult.success) {
        setQuote(quoteResult.data);
      }
    } catch (err) {
      console.error('[ScanToPayScreen] Quote error:', err);
    }
  };

  const handleConfirmPayment = () => {
    // For demo: Just show success
    alert(`Payment initiated!\n\nRecipient: ${scannedData.payeeName}\nAmount: ₹${scannedData.amount}\nYou paid: $${quote.totalDebit.toFixed(2)}`);

    // Reset for next scan
    setScannedData(null);
    setQuote(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Scan to Pay</h1>
      </div>

      {/* Scan Button */}
      {!scannedData && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-indigo-600 text-white p-8 rounded-full shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105"
          >
            <Camera className="w-16 h-16" />
          </button>
          <p className="mt-6 text-gray-600 text-center text-lg">
            Tap to scan UPI QR code
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Processing...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setScannedData(null);
            }}
            className="mt-2 text-red-600 underline text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Payment Details */}
      {scannedData && !loading && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Merchant</span>
              <span className="font-semibold text-gray-900">{scannedData.payeeName || scannedData.upiId}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Amount (INR)</span>
              <span className="font-semibold text-gray-900">₹{scannedData.amount.toFixed(2)}</span>
            </div>

            {quote && (
              <>
                <div className="bg-indigo-50 rounded-lg p-4 my-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-gray-700 text-lg">You pay</span>
                    <span className="text-3xl font-bold text-indigo-600">
                      ${quote.totalDebit.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm mt-3 pt-3 border-t border-indigo-200">
                    <span className="text-gray-600">Exchange rate</span>
                    <span className="text-gray-900">1 USD = ₹{quote.rate.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Fee</span>
                    <span className="text-gray-900">${quote.fee.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center text-xs text-gray-500 mt-3">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>Rate locked for {Math.floor(quote.expiresIn / 60)} minutes</span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition shadow-md"
                >
                  Confirm & Pay ${quote.totalDebit.toFixed(2)}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScanSuccess={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
```

---

## Phase 6: Dashboard Integration

**Duration:** 15 minutes

### Step 6.1: Update VittaApp.js

**File:** `components/VittaApp.js`

Add the new screen and navigation:

```javascript
// At the top, add import
import ScanToPayScreen from './travelpay/ScanToPayScreen';
import { FEATURE_FLAGS } from '../config/features';

// In component, add to screen state
const [currentScreen, setCurrentScreen] = useState('main');
// 'main', 'cards', 'optimizer', 'dashboard', 'scanToPay', etc.

// Add navigation handler
const handleNavigateToScanToPay = () => {
  setCurrentScreen('scanToPay');
};

// In render, add conditional screen
{currentScreen === 'scanToPay' && (
  <ScanToPayScreen
    onBack={() => setCurrentScreen('main')}
    userData={userData}
  />
)}

// In main dashboard, add button
{FEATURE_FLAGS.TRAVEL_PAY_ENABLED && (
  <button
    onClick={handleNavigateToScanToPay}
    className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
  >
    <Camera className="w-6 h-6" />
    Scan to Pay
  </button>
)}
```

---

## Testing & Validation

### Manual Testing Checklist

#### Test 1: Wise API Connection

```bash
# Test rate API
curl http://localhost:3000/api/wise/rates

# Expected: { "success": true, "data": { "rate": 83.xx, ... } }
```

✅ Rate returned successfully
✅ Response time < 500ms
✅ Rate is reasonable (80-85 range)

---

#### Test 2: QR Scanner

**Steps:**
1. Open app → Navigate to "Scan to Pay"
2. Allow camera access when prompted
3. Generate test QR code:
   - Go to https://upi-qr-generator.web.app/
   - Enter: `merchant@paytm`, `Test Merchant`, `100`
   - Scan generated QR
4. Verify parsed data displays correctly

✅ Camera opens
✅ QR code scanned successfully
✅ Merchant name displayed
✅ Amount shown in INR and USD

---

#### Test 3: Quote Creation

**After scanning:**

✅ Quote created automatically
✅ Exchange rate displayed
✅ Fee shown
✅ Total USD amount calculated
✅ Expiry countdown visible

---

#### Test 4: Database Verification

**In Supabase:**

```sql
-- Check scans
SELECT * FROM upi_scans ORDER BY created_at DESC LIMIT 5;

-- Check quotes
SELECT * FROM wise_quotes ORDER BY created_at DESC LIMIT 5;

-- Verify relationships
SELECT
  s.upi_id,
  s.amount,
  q.exchange_rate,
  q.source_amount,
  q.status
FROM upi_scans s
LEFT JOIN wise_quotes q ON q.upi_scan_id = s.id
ORDER BY s.created_at DESC
LIMIT 5;
```

✅ Scans saved to database
✅ Quotes linked to scans
✅ Status fields correct
✅ Timestamps accurate

---

## Deployment

### Environment Setup

**Vercel/Netlify:**

1. Add environment variables in dashboard
2. Deploy from main branch
3. Test production endpoints

**Variables to set:**
```
WISE_API_TOKEN_SANDBOX=xxx
WISE_PROFILE_ID_SANDBOX=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_TRAVEL_PAY_ENABLED=true
```

---

## Troubleshooting

### Common Issues

#### Issue: "Camera access denied"

**Solution:**
- Check browser permissions
- Try HTTPS instead of HTTP
- Enable camera in system settings

---

#### Issue: "Wise API 401 Unauthorized"

**Solution:**
```bash
# Verify token is correct
echo $WISE_API_TOKEN_SANDBOX

# Check config
node -e "const config = require('./config/wise').default(); console.log(config)"
```

---

#### Issue: "Quote expires too quickly"

**Cause:** Wise sandbox quotes expire in 5 minutes

**Solution:**
- Normal behavior for sandbox
- Production quotes last longer
- Refresh quote if needed

---

#### Issue: "Database connection failed"

**Solution:**
```bash
# Check Supabase URL
echo $NEXT_PUBLIC_SUPABASE_URL

# Test connection
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

---

## Next Steps

### After Demo Success

1. **Implement Transfer Execution**
   - Create `/api/wise/transfer` endpoint
   - Add Wise recipient management
   - Fund transfers from user balance

2. **Add Plaid Verification**
   - Check balance before transfer
   - Display linked accounts
   - Handle insufficient funds

3. **Improve UX**
   - Add loading animations
   - Better error messages
   - Transaction history screen

4. **Production Readiness**
   - Add rate limiting
   - Implement logging
   - Set up monitoring
   - Add KYC verification

---

**Document Version:** 1.0
**Last Updated:** April 9, 2026
**Status:** Ready for Implementation
**Estimated Completion:** 2.5 hours
