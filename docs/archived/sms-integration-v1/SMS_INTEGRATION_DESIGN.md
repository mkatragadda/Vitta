# SMS Integration Design Document
**Vitta x AgentPhone - SMS-Based Money Transfers**

**Version:** 1.0
**Date:** 2026-05-16
**Status:** Design Phase
**Target:** Hackathon Demo

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [User Flow & Experience](#user-flow--experience)
4. [Component Specifications](#component-specifications)
5. [Database Schema](#database-schema)
6. [API Specifications](#api-specifications)
7. [Security Model](#security-model)
8. [Message Templates](#message-templates)
9. [Implementation Plan](#implementation-plan)
10. [Testing Strategy](#testing-strategy)
11. [Hackathon Demo Plan](#hackathon-demo-plan)
12. [Appendix](#appendix)

---

## Executive Summary

### Overview

This document outlines the design for integrating SMS-based money transfers into Vitta using AgentPhone's messaging platform. Users can initiate international money transfers via simple text messages, with final confirmation completed securely through a web interface.

### Key Features

- **SMS Intent Capture**: Natural language money transfer requests via SMS
- **Intelligent Parsing**: Extract amount, recipient, and intent from conversational text
- **Secure Web Handoff**: Token-based authentication for final transfer approval
- **Real-time Processing**: Webhook-driven architecture for instant responses
- **Beneficiary Matching**: Smart nickname resolution (e.g., "mom" → saved contact)
- **WISE Integration**: Reuse existing proven transfer infrastructure

### Value Proposition

**For Hackathon:**
- Novel interaction model (SMS → Web)
- No app download required
- Live money transfer demo
- Accessible on any phone

**For Users:**
- Ultra-fast transfer initiation
- Secure confirmation process
- Works anywhere with cell signal
- Familiar SMS interface

### Success Metrics

- **Response Time**: < 3 seconds SMS response
- **Security**: 100% webhook signature validation
- **UX**: Single confirmation step
- **Demo**: 3+ successful live transfers

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ECOSYSTEM                          │
│  Phone (SMS) ←→ Vitta Web App ←→ Existing Vitta Account        │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                       AGENTPHONE PLATFORM                        │
│  • SMS Gateway (10DLC)                                          │
│  • Message Routing                                              │
│  • Webhook Delivery                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                      VITTA BACKEND (New)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Webhook    │  │   Intent     │  │   Transfer   │         │
│  │   Handler    │→→│   Parser     │→→│   Manager    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         ↓                                     ↓                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Signature   │  │ Beneficiary  │  │    Token     │         │
│  │  Verifier    │  │  Matcher     │  │  Generator   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                   EXISTING VITTA INFRASTRUCTURE                  │
│  • WISE Transfer Service (wiseTransferService.js)               │
│  • Quote Service (wiseQuoteService.js)                          │
│  • Recipient Service (wiseRecipientService.js)                  │
│  • Beneficiary Service (beneficiary-service.js)                 │
│  • Supabase Database                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌──────────┐
│   USER   │ "Send $500 to mom"
│  (Phone) │
└─────┬────┘
      │ SMS
      ↓
┌────────────────┐
│  AgentPhone    │
│  SMS Gateway   │
└───────┬────────┘
        │ HTTPS POST (webhook)
        ↓
┌─────────────────────────────────────────────────────────────┐
│  /api/sms/webhook                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Verify HMAC-SHA256 Signature                      │  │
│  │ 2. Validate Timestamp (< 5 min old)                  │  │
│  │ 3. Extract: phone, message, conversationId           │  │
│  │ 4. Return 200 OK immediately                         │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │ Async Processing
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  SMS Conversation Manager                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Load conversation state from DB                    │  │
│  │ • Determine context (new vs continuation)            │  │
│  │ • Route to appropriate handler                       │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  SMS Intent Parser                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Detect intent: transfer_money, disambiguation,     │  │
│  │   confirmation, cancel                                │  │
│  │ • Extract entities: amount, recipient, keywords      │  │
│  │ • Return structured intent object                    │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        │                               │
        ↓                               ↓
┌──────────────────┐          ┌──────────────────┐
│ New Transfer     │          │ Disambiguation/  │
│ Request          │          │ Confirmation     │
└────────┬─────────┘          └────────┬─────────┘
         │                              │
         ↓                              ↓
┌──────────────────────────────────────────────────────────────┐
│  Beneficiary Matcher Service                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ • Query user's beneficiaries                          │  │
│  │ • Fuzzy match on name/nickname                        │  │
│  │ • Handle multiple matches → disambiguation            │  │
│  │ • Return matched beneficiary or error                 │  │
│  └─────────────────────────┬─────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Pending Transfer Service                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Get WISE quote (wiseQuoteService)                 │  │
│  │ 2. Calculate fees & exchange rate                    │  │
│  │ 3. Create pending_sms_transfer record (DB)           │  │
│  │ 4. Set expiration (15 minutes)                       │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Transfer Token Service                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Generate JWT with transfer metadata               │  │
│  │ 2. Create short token (8 chars, URL-safe)            │  │
│  │ 3. Store token hash in DB                            │  │
│  │ 4. Build confirmation URL                            │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Message Template Builder                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Format transfer details                            │  │
│  │ • Include short URL                                  │  │
│  │ • Add expiration notice                              │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  AgentPhone Client (Send SMS)                               │
│  POST /v1/messages                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
              ┌──────────┐
              │   USER   │ Receives SMS with link
              │  (Phone) │
              └─────┬────┘
                    │ Taps link
                    ↓
┌─────────────────────────────────────────────────────────────┐
│  Web: /transfer/confirm/[token]                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Validate token (not expired, not used)            │  │
│  │ 2. Load pending transfer details                     │  │
│  │ 3. Display full transfer review screen               │  │
│  │ 4. User clicks "Confirm Transfer"                    │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  /api/sms/transfer/execute                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Re-validate token                                 │  │
│  │ 2. Check quote freshness (refresh if needed)         │  │
│  │ 3. Call wiseOrchestrator.executeTransfer()           │  │
│  │ 4. Mark token as used                                │  │
│  │ 5. Update pending transfer status                    │  │
│  │ 6. Send confirmation SMS                             │  │
│  └────────────────────┬─────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        ↓
              ┌──────────────────┐
              │ WISE API         │
              │ Transfer Execute │
              └──────────────────┘
```

---

## User Flow & Experience

### Primary Flow: Successful Transfer

```
STEP 1: Initiate via SMS
─────────────────────────
User → "Send $500 to mom"

System Processing:
• Parse intent: transfer_money
• Extract: amount=$500, recipient="mom"
• Match "mom" to saved beneficiary
• Create WISE quote
• Generate secure token
• Build confirmation message

Response Time: 2-3 seconds

STEP 2: Review Prompt (SMS)
─────────────────────────
Vitta → "💰 Transfer Ready

        Amount: $500.00 USD
        To: Mom (Maria Garcia)
        Account: UPI ****1234
        Fee: $0.01

        Tap to review & confirm:
        👉 vitta.app/confirm/xYz9K

        Link expires in 15 minutes"

STEP 3: Web Confirmation
─────────────────────────
User taps link → Opens Vitta web app

Screen shows:
• Large amount display
• Recipient details with avatar
• Account info (last 4 digits)
• Exchange rate breakdown
• Fee itemization
• Total cost
• Delivery time estimate
• [Confirm Transfer] button (prominent)
• [Cancel] button (secondary)

Security indicators:
• HTTPS lock icon
• "Powered by WISE" badge
• Expiration countdown

STEP 4: Execute Transfer
─────────────────────────
User clicks "Confirm Transfer"

System Processing:
• Validate token (again)
• Execute WISE transfer
• Mark token as used
• Update database
• Send SMS confirmation

Processing Time: 2-3 seconds

STEP 5: Confirmation
─────────────────────────
Web → Success screen with:
• Checkmark animation
• Transfer details
• Reference number
• [View Receipt] button
• [Send Another] button

SMS → "✅ Transfer Complete!

       $500.00 sent to Maria Garcia
       Reference: WTF123456789
       Time: 2:34 PM EST

       View receipt: vitta.app/receipt/abc"
```

### Alternative Flow: Disambiguation Required

```
STEP 1: Ambiguous Request
─────────────────────────
User → "Send $200 to John"

System Processing:
• Parse intent: transfer_money
• Extract: amount=$200, recipient="John"
• Query beneficiaries: Found 2 matches
• Save conversation state
• Build disambiguation message

STEP 2: Request Clarification
─────────────────────────
Vitta → "I found 2 contacts named John:

        1️⃣ John Smith (UPI India)
        2️⃣ John Doe (UK Bank)

        Reply with the number (1 or 2)"

STEP 3: User Selects
─────────────────────────
User → "1"

System Processing:
• Load conversation state
• Parse disambiguation response
• Resolve to John Smith
• Continue with normal flow...

STEP 4: Confirmation Link
─────────────────────────
Vitta → "💰 Transfer Ready

        Amount: $200.00 USD
        To: John Smith
        ..."

[Continue with primary flow...]
```

### Error Flow: Beneficiary Not Found

```
STEP 1: Unknown Recipient
─────────────────────────
User → "Send $100 to Sarah"

System Processing:
• Parse intent: transfer_money
• Extract: amount=$100, recipient="Sarah"
• Query beneficiaries: No matches
• Build error message

STEP 2: Helpful Error
─────────────────────────
Vitta → "❌ I couldn't find 'Sarah' in your contacts.

        Add Sarah in the Vitta app first:
        👉 vitta.app/beneficiaries/add

        Or try texting the full name."
```

### Timeout Flow: Expired Link

```
STEP 1: Link Expired
─────────────────────────
User taps link after 20 minutes

Web → Error Screen:
• "⏰ This transfer link has expired"
• "Transfer links are valid for 15 minutes"
• "Text 'Send $X to [name]' to create a new transfer"
• [Open Vitta App] button
```

---

## Component Specifications

### 1. SMS Webhook Handler

**File:** `pages/api/sms/webhook.js`

**Purpose:** Receive and validate AgentPhone webhook events

**Input:**
```json
{
  "event": "agent.message",
  "channel": "sms",
  "timestamp": "2025-01-15T12:00:00Z",
  "agentId": "agt_abc123",
  "data": {
    "messageId": "msg_xyz789",
    "body": "Send $500 to mom",
    "from": "+12345678901",
    "to": "+15551234567",
    "direction": "inbound"
  },
  "conversationState": {},
  "recentHistory": []
}
```

**Headers:**
```
X-Webhook-Signature: sha256=<hmac_hex>
X-Webhook-Timestamp: 1705320000
X-Webhook-ID: whk_unique123
```

**Processing Steps:**
1. Verify HMAC-SHA256 signature
2. Check timestamp (reject if > 5 minutes old)
3. Extract phone number and message body
4. Load/create conversation state
5. Return 200 OK immediately
6. Async: Route to SMS conversation manager

**Output:** HTTP 200 (empty body)

**Error Handling:**
- 401: Invalid signature
- 400: Timestamp too old
- 500: Processing error (still return 200 to AgentPhone)

---

### 2. SMS Intent Parser

**File:** `services/sms/smsIntentParser.js`

**Purpose:** Classify intent and extract entities from SMS messages

**Supported Intents:**

| Intent | Pattern Examples | Extracted Entities |
|--------|------------------|-------------------|
| `transfer_money` | "send $X to Y"<br>"pay Y $X"<br>"transfer X dollars to Y" | amount, recipient |
| `disambiguation_response` | "1"<br>"2"<br>"option 1" | selection_number |
| `confirmation` | "yes"<br>"confirm"<br>"ok"<br>"proceed" | - |
| `cancellation` | "no"<br>"cancel"<br>"stop"<br>"nevermind" | - |
| `help` | "help"<br>"what can you do"<br>"commands" | - |

**Function Signature:**
```javascript
async function parseIntent(message, conversationState) {
  return {
    intent: 'transfer_money',
    confidence: 0.95,
    entities: {
      amount: {
        value: 500,
        currency: 'USD',
        raw: '$500'
      },
      recipient: {
        value: 'mom',
        raw: 'mom'
      }
    },
    requiresDisambiguation: false
  };
}
```

**Regex Patterns:**
```javascript
const PATTERNS = {
  transfer_money: [
    /send\s+\$?(\d+(?:\.\d{2})?)\s+to\s+(.+)/i,
    /pay\s+(.+?)\s+\$?(\d+(?:\.\d{2})?)/i,
    /transfer\s+\$?(\d+(?:\.\d{2})?)\s+(?:to\s+)?(.+)/i,
    /give\s+(.+?)\s+\$?(\d+(?:\.\d{2})?)/i
  ],
  amount_only: /\$?(\d+(?:\.\d{2})?)\s*(?:dollars?|usd)?/i,
  number_selection: /^([1-9])\s*$/,
  confirmation: /^(yes|yeah|yep|ok|confirm|proceed|continue|sure)$/i,
  cancellation: /^(no|nope|cancel|stop|abort|nevermind|nvm)$/i
};
```

---

### 3. Beneficiary Matcher Service

**File:** `services/sms/beneficiaryMatcher.js`

**Purpose:** Match recipient strings to saved beneficiaries

**Matching Strategy:**
1. Exact nickname match (case-insensitive)
2. Exact full name match
3. Fuzzy name match (Levenshtein distance < 3)
4. Partial name match (contains)

**Function Signature:**
```javascript
async function matchBeneficiary(recipientStr, userId) {
  return {
    status: 'matched' | 'multiple' | 'not_found',
    matches: [
      {
        id: 'ben_123',
        name: 'Maria Garcia',
        nickname: 'mom',
        account_type: 'UPI',
        last4: '1234',
        confidence: 1.0
      }
    ]
  };
}
```

**Database Queries:**
```sql
-- 1. Exact nickname match
SELECT b.*, n.nickname
FROM beneficiaries b
JOIN beneficiary_nicknames n ON b.id = n.beneficiary_id
WHERE n.user_id = $1 AND LOWER(n.nickname) = LOWER($2);

-- 2. Exact name match
SELECT * FROM beneficiaries
WHERE user_id = $1 AND LOWER(name) = LOWER($2);

-- 3. Fuzzy match (similarity)
SELECT *, similarity(name, $2) as score
FROM beneficiaries
WHERE user_id = $1 AND similarity(name, $2) > 0.6
ORDER BY score DESC
LIMIT 5;
```

---

### 4. Pending Transfer Service

**File:** `services/sms/pendingTransferService.js`

**Purpose:** Create and manage pending transfers before confirmation

**Key Functions:**

```javascript
class PendingTransferService {
  /**
   * Create a new pending transfer
   */
  async createPendingTransfer({
    userId,
    phoneNumber,
    beneficiaryId,
    sourceAmount,
    rawMessage,
    conversationId
  }) {
    // 1. Get beneficiary details
    const beneficiary = await this.getBeneficiary(beneficiaryId);

    // 2. Create WISE quote
    const quote = await wiseQuoteService.createQuote({
      userId,
      sourceAmount,
      sourceCurrency: 'USD',
      targetCurrency: beneficiary.currency,
      recipientId: beneficiary.wise_recipient_id
    });

    // 3. Save pending transfer
    const pendingTransfer = await supabase
      .from('pending_sms_transfers')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        conversation_id: conversationId,
        beneficiary_id: beneficiaryId,
        source_amount: sourceAmount,
        source_currency: 'USD',
        target_amount: quote.target_amount,
        target_currency: quote.target_currency,
        exchange_rate: quote.rate,
        wise_quote_id: quote.id,
        quote_expires_at: quote.expiresAt,
        raw_message: rawMessage,
        status: 'pending',
        expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 min
      })
      .select()
      .single();

    return pendingTransfer;
  }

  /**
   * Refresh quote if expired
   */
  async refreshQuoteIfNeeded(pendingTransferId) {
    const transfer = await this.getPendingTransfer(pendingTransferId);

    if (new Date() > new Date(transfer.quote_expires_at)) {
      // Quote expired - create new one
      const newQuote = await wiseQuoteService.createQuote({
        userId: transfer.user_id,
        sourceAmount: transfer.source_amount,
        sourceCurrency: transfer.source_currency,
        targetCurrency: transfer.target_currency,
        recipientId: transfer.beneficiary.wise_recipient_id
      });

      // Update transfer with new quote
      await supabase
        .from('pending_sms_transfers')
        .update({
          wise_quote_id: newQuote.id,
          exchange_rate: newQuote.rate,
          target_amount: newQuote.target_amount,
          quote_expires_at: newQuote.expiresAt
        })
        .eq('id', pendingTransferId);

      return newQuote;
    }

    return null; // Quote still valid
  }

  /**
   * Execute confirmed transfer
   */
  async executeTransfer(pendingTransferId, tokenData) {
    const transfer = await this.getPendingTransfer(pendingTransferId);

    // Refresh quote if needed
    await this.refreshQuoteIfNeeded(pendingTransferId);

    // Execute via existing WISE orchestrator
    const wiseTransfer = await wiseOrchestrator.executeTransfer({
      userId: transfer.user_id,
      quoteId: transfer.wise_quote_id,
      recipientId: transfer.beneficiary.wise_recipient_id,
      reference: `SMS Transfer ${new Date().toISOString()}`,
      upiScanId: null // Not applicable for SMS
    });

    // Update pending transfer
    await supabase
      .from('pending_sms_transfers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date(),
        completed_transfer_id: wiseTransfer.id
      })
      .eq('id', pendingTransferId);

    return wiseTransfer;
  }
}
```

---

### 5. Transfer Token Service

**File:** `services/sms/transferTokenService.js`

**Purpose:** Generate and validate secure transfer confirmation tokens

**Security Requirements:**
- JWT-based with signature verification
- 15-minute expiration
- One-time use enforcement
- Short URL-safe representation

**Implementation:**

```javascript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const TOKEN_SECRET = process.env.TRANSFER_TOKEN_SECRET;
const TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

class TransferTokenService {
  /**
   * Generate secure token for pending transfer
   */
  generateToken(pendingTransfer) {
    // JWT payload
    const payload = {
      transferId: pendingTransfer.id,
      userId: pendingTransfer.user_id,
      amount: pendingTransfer.source_amount,
      beneficiaryId: pendingTransfer.beneficiary_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + TOKEN_EXPIRY) / 1000)
    };

    // Sign token
    const token = jwt.sign(payload, TOKEN_SECRET, {
      algorithm: 'HS256'
    });

    // Create short URL-safe version
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const shortToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('base64url')
      .substring(0, 8);

    return {
      fullToken: token,
      shortToken,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY)
    };
  }

  /**
   * Store token in database
   */
  async storeToken(tokenData, pendingTransferId, phoneNumber, userId) {
    await supabase
      .from('sms_transfer_tokens')
      .insert({
        user_id: userId,
        pending_transfer_id: pendingTransferId,
        token_hash: tokenData.tokenHash,
        short_token: tokenData.shortToken,
        phone_number: phoneNumber,
        expires_at: tokenData.expiresAt,
        is_used: false
      });

    return tokenData.shortToken;
  }

  /**
   * Validate token
   */
  async validateToken(shortToken) {
    try {
      // Lookup token in database
      const { data: tokenRecord, error } = await supabase
        .from('sms_transfer_tokens')
        .select('*')
        .eq('short_token', shortToken)
        .single();

      if (error || !tokenRecord) {
        return { valid: false, error: 'Token not found' };
      }

      // Check if already used
      if (tokenRecord.is_used) {
        return { valid: false, error: 'Token already used' };
      }

      // Check expiration
      if (new Date() > new Date(tokenRecord.expires_at)) {
        return { valid: false, error: 'Token expired' };
      }

      // Get pending transfer
      const { data: transfer } = await supabase
        .from('pending_sms_transfers')
        .select('*, beneficiary:beneficiaries(*)')
        .eq('id', tokenRecord.pending_transfer_id)
        .single();

      return {
        valid: true,
        tokenRecord,
        transfer
      };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Mark token as used
   */
  async markTokenUsed(shortToken, ipAddress, userAgent) {
    await supabase
      .from('sms_transfer_tokens')
      .update({
        is_used: true,
        used_at: new Date(),
        used_ip: ipAddress,
        used_user_agent: userAgent
      })
      .eq('short_token', shortToken);
  }

  /**
   * Build confirmation URL
   */
  buildConfirmationURL(shortToken) {
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'https://vitta.app';
    return `${baseURL}/transfer/confirm/${shortToken}`;
  }
}
```

---

### 6. AgentPhone Client

**File:** `services/agentphone/agentphoneClient.js`

**Purpose:** Send SMS messages via AgentPhone API

**Configuration:**
```javascript
const AGENTPHONE_CONFIG = {
  apiKey: process.env.AGENTPHONE_API_KEY,
  baseURL: 'https://api.agentphone.ai',
  agentId: process.env.AGENTPHONE_AGENT_ID,
  timeout: 30000 // 30 seconds
};
```

**Implementation:**

```javascript
class AgentPhoneClient {
  constructor() {
    this.apiKey = process.env.AGENTPHONE_API_KEY;
    this.agentId = process.env.AGENTPHONE_AGENT_ID;
    this.baseURL = 'https://api.agentphone.ai';
  }

  /**
   * Send SMS message
   */
  async sendSMS({ to, body, conversationId = null }) {
    try {
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: this.agentId,
          to: to,
          body: body,
          channel: 'sms',
          conversationId: conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`AgentPhone API error: ${response.status}`);
      }

      const data = await response.json();

      // Log message
      await this.logOutboundMessage({
        phoneNumber: to,
        body,
        messageId: data.messageId,
        conversationId: data.conversationId
      });

      return data;

    } catch (error) {
      console.error('[AgentPhoneClient] Send SMS failed:', error);
      throw error;
    }
  }

  /**
   * Log outbound message to database
   */
  async logOutboundMessage({ phoneNumber, body, messageId, conversationId }) {
    await supabase
      .from('sms_messages_log')
      .insert({
        direction: 'outbound',
        phone_number: phoneNumber,
        message_body: body,
        agentphone_message_id: messageId,
        agentphone_conversation_id: conversationId,
        channel: 'sms',
        status: 'sent'
      });
  }
}
```

---

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create comprehensive SMS integration design document", "activeForm": "Creating comprehensive SMS integration design document", "status": "in_progress"}, {"content": "Document system architecture and component diagrams", "activeForm": "Documenting system architecture and component diagrams", "status": "completed"}, {"content": "Document database schema and migrations", "activeForm": "Documenting database schema and migrations", "status": "in_progress"}, {"content": "Document API specifications and security model", "activeForm": "Documenting API specifications and security model", "status": "pending"}]