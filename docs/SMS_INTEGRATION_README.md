# SMS Integration - Quick Start Guide

**Complete Design Document Index**

This integration enables SMS-based money transfers using AgentPhone + Vitta's existing WISE infrastructure.

---

## 📚 Documentation Files

1. **[SMS_INTEGRATION_DESIGN.md](./SMS_INTEGRATION_DESIGN.md)** - Part 1
   - Executive Summary
   - System Architecture
   - User Flows
   - Component Specifications (1-6)

2. **[SMS_INTEGRATION_DESIGN_PART2.md](./SMS_INTEGRATION_DESIGN_PART2.md)** - Part 2
   - Database Schema
   - API Specifications
   - Security Model
   - Message Templates
   - Implementation Plan
   - Testing Strategy
   - Hackathon Demo Plan

---

## 🚀 Quick Summary

### What We're Building

**User sends SMS** → **AI parses intent** → **Creates pending transfer** → **Sends secure link** → **User confirms on web** → **Transfer executes**

### Key Features

- ✅ Natural language SMS ("Send $500 to mom")
- ✅ Secure web confirmation (JWT tokens, 15-min expiry)
- ✅ Nickname support (mom, dad, brother, etc.)
- ✅ Real-time WISE transfers
- ✅ No app download required

### Tech Stack

- **SMS Platform**: AgentPhone
- **Backend**: Next.js API routes
- **Database**: Supabase (6 new tables)
- **Transfer API**: WISE (existing integration)
- **Security**: HMAC webhooks + JWT tokens

---

## 📋 Implementation Checklist

### Phase 1: Foundation (2-3 hours)
- [ ] Run database migration (`003_sms_integration.sql`)
- [ ] Create AgentPhone client service
- [ ] Implement webhook handler with signature verification
- [ ] Test webhook receiving

### Phase 2: Intent Parsing (1-2 hours)
- [ ] Build SMS intent parser
- [ ] Implement entity extraction (amount, recipient)
- [ ] Create beneficiary matcher
- [ ] Add conversation state manager

### Phase 3: Pending Transfers (1.5 hours)
- [ ] Implement pending transfer service
- [ ] Build token generation & validation
- [ ] Integrate with WISE quotes
- [ ] Create message templates

### Phase 4: Web Confirmation (2 hours)
- [ ] Create `/transfer/confirm/[token]` page
- [ ] Build beautiful confirmation UI
- [ ] Implement `/api/sms/transfer/execute` endpoint
- [ ] Add error handling

### Phase 5: Integration & Testing (1.5 hours)
- [ ] Connect all components end-to-end
- [ ] Test complete flow
- [ ] Add comprehensive logging
- [ ] Test with AgentPhone sandbox

**Total Estimate: 8-10 hours**

---

## 🔐 Environment Variables Required

```bash
# AgentPhone
AGENTPHONE_API_KEY=your_api_key
AGENTPHONE_WEBHOOK_SECRET=your_webhook_secret
AGENTPHONE_AGENT_ID=your_agent_id

# Token Security
TRANSFER_TOKEN_SECRET=min_32_char_random_string

# App URL
NEXT_PUBLIC_APP_URL=https://vitta.app
```

---

## 🗄️ Database Schema Overview

**New Tables:**
1. `user_phone_numbers` - Link phones to accounts
2. `sms_conversations` - Track multi-turn conversations
3. `pending_sms_transfers` - Store pre-confirmation transfers
4. `sms_transfer_tokens` - Secure confirmation tokens
5. `beneficiary_nicknames` - SMS shortcuts (mom, dad, etc.)
6. `sms_messages_log` - Audit trail

**Migration File:** `supabase/migrations/003_sms_integration.sql`

---

## 📱 User Flow Example

```
USER:    "Send $500 to mom"

VITTA:   "💰 Transfer Ready
         $500 → Mom (Maria Garcia)
         👉 vitta.app/confirm/xYz9K
         Link expires in 15 min"

[User taps link → Beautiful web confirmation screen]
[User clicks "Confirm Transfer"]

VITTA:   "✅ Transfer Complete!
         $500 sent to Maria Garcia
         Reference: WTF123456789"
```

---

## 🛡️ Security Model

1. **Webhook Authentication**: HMAC-SHA256 signature verification
2. **User Authentication**: Phone number linked to verified account
3. **Transfer Tokens**: JWT-based, 15-min expiry, one-time use
4. **WISE API**: Existing secure integration (no changes)

---

## 🧪 Testing Strategy

### Unit Tests
```bash
npm test -- services/sms/smsIntentParser.test.js
npm test -- services/sms/beneficiaryMatcher.test.js
npm test -- services/sms/transferTokenService.test.js
```

### Integration Test
```bash
npm test -- __tests__/integration/sms-transfer-flow.test.js
```

### Manual Testing
1. Send SMS to AgentPhone number
2. Verify webhook received
3. Check SMS response with link
4. Tap link and confirm on web
5. Verify transfer completed

---

## 🎯 Hackathon Demo Plan

### Setup (15 min before)
- [ ] Vitta app running (`npm run dev`)
- [ ] AgentPhone webhook configured (ngrok tunnel)
- [ ] Test data in database (demo user + beneficiary)
- [ ] Phone connected to projector

### Demo Script (5 min)
1. **Problem** (30s): Current transfer UX is complex
2. **Solution** (30s): "What if you could just text?"
3. **Live Demo** (2 min): Send SMS, tap link, confirm, success
4. **Behind the Scenes** (1 min): Show webhook logs, DB, WISE API
5. **Technical Highlights** (1 min): Architecture overview
6. **Closing** (30s): "Built in 10 hours for this hackathon"

---

## 📂 File Structure

```
Vitta/
├── pages/api/sms/
│   ├── webhook.js              # AgentPhone webhook
│   ├── send.js                 # Send SMS
│   └── transfer/
│       ├── verify.js           # Verify token
│       └── execute.js          # Execute transfer
│
├── pages/transfer/confirm/
│   └── [token].js              # Web confirmation screen
│
├── services/sms/
│   ├── smsIntentParser.js
│   ├── pendingTransferService.js
│   ├── transferTokenService.js
│   ├── beneficiaryMatcher.js
│   └── messageTemplates.js
│
├── services/agentphone/
│   ├── agentphoneClient.js
│   └── webhookVerifier.js
│
└── supabase/migrations/
    └── 003_sms_integration.sql
```

---

## 🐛 Debugging Tips

**Webhook not receiving:**
- Check ngrok tunnel is active
- Verify webhook URL in AgentPhone dashboard
- Check webhook signature secret matches

**Intent parsing fails:**
- Check regex patterns in `smsIntentParser.js`
- View logs in `sms_messages_log` table
- Test patterns in isolation with unit tests

**Token expired:**
- Tokens valid for 15 minutes only
- Check system clock sync
- Verify `expires_at` timestamp in DB

**Transfer fails:**
- Check WISE API credentials
- Verify WISE balance sufficient
- Review logs in `wise_transfers` table

---

## 📞 Support Resources

- **AgentPhone Docs**: https://docs.agentphone.ai
- **WISE API Docs**: https://docs.wise.com
- **Vitta Architecture**: See `CLAUDE.md`
- **Transfer Flow**: See `docs/VITTA_TRAVEL_PAY_IMPLEMENTATION.md`

---

## 🎓 Key Learnings for Hackathon Presentation

1. **Novel UX**: SMS → Web handoff (no competitor does this)
2. **Security**: Proper token-based auth, not SMS-only
3. **Real Integration**: Actual WISE transfers, not mocked
4. **Speed**: 3-second response time, 10-hour build time
5. **Accessibility**: Works on ANY phone with SMS

---

## ✅ Success Criteria

**Technical:**
- [ ] < 3 sec SMS response
- [ ] 100% webhook signature validation
- [ ] Zero plaintext tokens in DB
- [ ] All transfers logged

**Demo:**
- [ ] 3+ live transfers
- [ ] No manual intervention
- [ ] Audience understands value

---

## 🚧 Future Enhancements

Post-Hackathon:
- Multi-currency SMS ("Send 100 EUR to John")
- Recurring transfers ("Send $500 monthly")
- Voice commands (AgentPhone voice API)
- Transaction history via SMS
- 2FA for high-value transfers

---

## 📄 Full Documentation

For complete technical specifications, see:
- [Part 1: Architecture & Components](./SMS_INTEGRATION_DESIGN.md)
- [Part 2: Database & Implementation](./SMS_INTEGRATION_DESIGN_PART2.md)

---

**Questions? Start with the Implementation Checklist above.**

**Ready to code? Begin with Phase 1 (Foundation).**

**Need help? Check the Debugging Tips section.**
