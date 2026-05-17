# SMS Integration - README

**Vitta x AgentPhone - SMS-Based Money Transfers**

**Version:** 2.0 Final
**Date:** 2026-05-17
**Status:** Production-Ready

---

## 📖 Complete Documentation

**👉 [SMS_INTEGRATION_COMPLETE.md](./SMS_INTEGRATION_COMPLETE.md)** - **Single Source of Truth**

This is the consolidated design document containing everything you need:
- Executive Summary
- Quick Start Guide (5 minutes)
- Complete System Architecture
- User Experience Flows
- Database Schema (6 new tables)
- API Specifications (6 endpoints)
- Component Implementation (7 services)
- Security Model
- WISE Integration (zero changes required)
- Implementation Plan (5 phases, 8-10 hours)
- Testing Strategy
- Hackathon Demo Script
- Environment Setup

---

## 🚀 Quick Start (30 seconds)

### What We're Building

SMS-to-web money transfer system: User texts "Send $500 to mom" → Receives secure link → Confirms on web → Money transferred via WISE

### Key Points

- ✅ **Zero changes** to existing WISE integration
- ✅ Uses `wise_recipients` table (not `beneficiaries`)
- ✅ SMS → Web handoff for security
- ✅ 15-minute token expiry
- ✅ Natural language parsing
- ✅ Ready in ~10 hours

---

## 📋 Implementation Checklist

### Phase 1: Foundation (2-3 hours)
- [ ] Run database migration
- [ ] Create AgentPhone client
- [ ] Implement webhook handler
- [ ] Test webhook receiving

### Phase 2: Intent Parsing (1-2 hours)
- [ ] Build SMS intent parser
- [ ] Implement entity extraction
- [ ] Create recipient matcher
- [ ] Add conversation manager

### Phase 3: Pending Transfers (1.5 hours)
- [ ] Implement pending transfer service
- [ ] Build token generation
- [ ] Integrate with wiseQuoteService
- [ ] Create message templates

### Phase 4: Web Confirmation (2 hours)
- [ ] Create `/transfer/confirm/[token]` page
- [ ] Build confirmation UI
- [ ] Implement execute API
- [ ] Add error handling

### Phase 5: Testing (1.5 hours)
- [ ] Connect all components
- [ ] Test end-to-end
- [ ] Add comprehensive logging

**Total: 8-10 hours**

---

## 🗄️ Database Schema

**New Tables:**
1. `user_phone_numbers` - Link phones to accounts
2. `sms_conversations` - Track conversations
3. `pending_sms_transfers` - Store pending transfers (uses `wise_recipient_id`)
4. `sms_transfer_tokens` - Secure tokens
5. `wise_recipient_nicknames` - SMS shortcuts for wise_recipients
6. `sms_messages_log` - Audit trail

**Existing Tables (Reused):**
- `wise_recipients` ✅
- `wise_quotes` ✅
- `wise_transfers` ✅
- `wise_payments` ✅

**Migration:** See complete SQL in main document

---

## 🔐 Environment Variables

```bash
# .env.local

# AgentPhone
AGENTPHONE_API_KEY=your_api_key
AGENTPHONE_WEBHOOK_SECRET=your_webhook_secret
AGENTPHONE_AGENT_ID=your_agent_id

# Token Security
TRANSFER_TOKEN_SECRET=random_32_char_string

# App URL
NEXT_PUBLIC_APP_URL=https://vitta.app

# Existing (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
WISE_API_KEY=...
```

---

## 📱 User Flow

```
USER:   "Send $500 to mom"

VITTA:  "💰 Transfer Ready
        $500 → Mom (Maria Garcia)
        👉 vitta.app/confirm/xYz9K"

[User taps → Web confirmation → Confirms]

VITTA:  "✅ Transfer Complete!"
```

---

## 🎯 Why This Design?

### Uses wise_recipients (Not beneficiaries)

| Aspect | wise_recipients ✅ | beneficiaries ❌ |
|--------|-------------------|------------------|
| WISE Compatible | Yes | No (Chimoney-specific) |
| QR Integration | Shared recipients | Separate system |
| Code Changes | Zero | Multiple services |
| Data Consistency | Single source | Duplicated data |

### SMS → Web Handoff (Not SMS-only)

| Benefit | Reason |
|---------|--------|
| Security | Web auth layer required |
| Compliance | Explicit confirmation audit trail |
| UX | Users see full details |
| Debugging | Web sessions easier to log |

---

## ✅ Zero Changes to WISE

All existing WISE services work as-is:
- `wiseQuoteService.js` ✅
- `wiseRecipientService.js` ✅
- `wiseTransferService.js` ✅
- `wiseOrchestrator.js` ✅

SMS integration simply calls these existing services.

---

## 📂 File Structure

```
pages/api/sms/
  ├── webhook.js           # AgentPhone webhook
  ├── transfer/
  │   ├── verify.js        # Validate token
  │   └── execute.js       # Execute transfer

pages/transfer/confirm/
  └── [token].js           # Web confirmation screen

services/sms/
  ├── smsIntentParser.js
  ├── recipientMatcher.js
  ├── pendingTransferService.js
  ├── transferTokenService.js
  └── messageTemplates.js

services/agentphone/
  ├── agentphoneClient.js
  └── webhookVerifier.js

supabase/migrations/
  └── 003_sms_integration.sql
```

---

## 🧪 Testing

```bash
# Unit tests
npm test -- services/sms/

# Integration test
npm test -- __tests__/sms/e2e-flow.test.js

# Manual test
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "X-Webhook-Signature: sha256=..." \
  -d '{"data":{"body":"Send $100 to mom"}}'
```

---

## 🎬 Hackathon Demo

### Setup (15 min)
- Vitta running on localhost:3000
- AgentPhone webhook configured (ngrok)
- Test data in database
- Phone projected on screen

### Demo (5 min)
1. Problem statement (30s)
2. Live SMS transfer (2 min)
3. Behind-the-scenes tech (1 min)
4. Architecture highlights (1 min)
5. Closing (30s)

---

## 🐛 Troubleshooting

**Webhook not receiving:**
- Check ngrok tunnel active
- Verify webhook URL in AgentPhone
- Check signature secret matches

**Intent parsing fails:**
- Check regex patterns
- View logs in sms_messages_log
- Test patterns in unit tests

**Token expired:**
- Tokens valid 15 minutes
- Check system clock sync
- Verify expires_at in DB

**Transfer fails:**
- Check WISE API credentials
- Verify WISE balance
- Review wise_transfers logs

---

## ❓ FAQ

**Q: Do I need to change any existing WISE code?**
A: No! Zero changes required.

**Q: Will QR code transfers still work?**
A: Yes, no impact whatsoever.

**Q: Can recipients from QR be used in SMS?**
A: Yes, just add a nickname.

**Q: What about the beneficiaries table?**
A: That's for Chimoney. SMS uses wise_recipients for WISE.

**Q: How long to implement?**
A: ~10 hours total (perfect for hackathon).

---

## 📚 Additional Resources

- **AgentPhone Docs:** https://docs.agentphone.ai
- **WISE API Docs:** https://docs.wise.com
- **Vitta Architecture:** See main CLAUDE.md

---

## 🎓 Success Criteria

**Technical:**
- [ ] < 3 sec SMS response
- [ ] 100% signature validation
- [ ] Zero plaintext tokens
- [ ] All transfers logged

**Demo:**
- [ ] 3+ live transfers
- [ ] No manual intervention
- [ ] Audience wow factor

---

## 📞 Support

For implementation questions, refer to:
1. **SMS_INTEGRATION_COMPLETE.md** (main document)
2. Section-specific details in main doc
3. Code examples throughout

---

**Ready to build?**

Start with the [Complete Documentation](./SMS_INTEGRATION_COMPLETE.md) →

---

**Version:** 2.0 Final
**Status:** Production-Ready ✅
**Implementation Time:** ~10 hours
**WISE Changes:** Zero ✅
