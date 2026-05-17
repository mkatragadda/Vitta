# SMS Integration - Testing Guide

Quick guide for testing the SMS webhook integration locally and with AgentPhone.

---

## Prerequisites

1. **Environment Variables Set**
   ```bash
   # Check .env.local has these set:
   AGENTPHONE_API_KEY=your_api_key
   AGENTPHONE_AGENT_ID=your_agent_id
   AGENTPHONE_WEBHOOK_SECRET=your_webhook_secret
   ```

2. **Database Migration Complete**
   - All SMS tables created in Supabase
   - Run `003_sms_integration.sql` if not done

3. **Dev Server Running**
   ```bash
   npm run dev
   ```

---

## Testing Methods

### Method 1: Unit Tests (Fastest)

Run all SMS integration tests:

```bash
# All SMS tests
npm test -- __tests__/unit/services/agentphone/
npm test -- __tests__/api/sms/

# Specific test file
npm test -- __tests__/unit/services/agentphone/agentphoneClient.test.js
```

**Expected Results:**
- AgentPhone Client: 21/21 passing ✅
- Webhook Verifier: 20/20 passing ✅
- Webhook API: 12/12 passing ✅

---

### Method 2: Local Webhook Simulation

Test the webhook endpoint locally with curl:

```bash
# Step 1: Set your webhook secret
export WEBHOOK_SECRET="your_webhook_secret_here"

# Step 2: Create test payload
export PAYLOAD='{"event":"message.received","data":{"id":"msg_123","conversation_id":"conv_456","from":"+1234567890","to":"+0987654321","body":"Send $500 to mom","channel":"sms","created_at":"2026-05-17T12:00:00Z"}}'

# Step 3: Generate valid HMAC-SHA256 signature
export SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

# Step 4: Send webhook request
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -H "X-Webhook-Timestamp: $(date +%s)" \
  -d "$PAYLOAD"
```

**Expected Response:**
```json
{"success": true}
```

**Check Database:**
```sql
-- See logged webhook
SELECT * FROM sms_messages_log
ORDER BY created_at DESC
LIMIT 5;
```

---

### Method 3: AgentPhone Live Testing (ngrok)

For testing with real SMS messages from AgentPhone:

#### Step 1: Expose Local Server

```bash
# Install ngrok (if not installed)
brew install ngrok  # macOS
# or download from: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 3000
```

**Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

#### Step 2: Configure AgentPhone Webhook

1. Go to [AgentPhone Dashboard](https://dashboard.agentphone.ai)
2. Navigate to your agent settings
3. Set webhook URL: `https://abc123.ngrok.io/api/sms/webhook`
4. Set webhook secret (same as `AGENTPHONE_WEBHOOK_SECRET`)

#### Step 3: Add Test User Phone Number

Add a test phone number to `user_phone_numbers` table:

```sql
-- Add test user with phone number
INSERT INTO user_phone_numbers (
  user_id,
  phone_number,
  is_verified,
  verified_at,
  is_active
) VALUES (
  'your_test_user_id_here',
  '+1234567890',  -- Your test phone number
  true,
  NOW(),
  true
);
```

#### Step 4: Send Test SMS

Send SMS to your AgentPhone number:
```
Send $500 to mom
```

#### Step 5: Verify Webhook Received

Check terminal logs:
```
[SMS Webhook] Received webhook request
[SMS Webhook] Signature verified
[SMS Webhook] Processing message from +1234567890
[SMS Webhook] Message: Send $500 to mom
```

Check database:
```sql
SELECT * FROM sms_messages_log
WHERE phone_number = '+1234567890'
ORDER BY created_at DESC;
```

---

## Common Testing Scenarios

### Test 1: Valid Webhook
**Input:** Valid signature + valid payload
**Expected:** 200 response, message logged, echo sent back

### Test 2: Invalid Signature
**Input:** Wrong signature
**Expected:** 401 Unauthorized, no processing

### Test 3: Unknown Phone Number
**Input:** Phone number not in `user_phone_numbers`
**Expected:** Welcome message sent

### Test 4: Unverified Phone Number
**Input:** Phone in DB but `is_verified = false`
**Expected:** Verification reminder sent

### Test 5: Verified User Message
**Input:** Verified user sends message
**Expected:** Echo response (Phase 1), will parse intent in Phase 2

---

## Debugging Tips

### Check Logs

```bash
# Tail dev server logs
npm run dev | grep '\[SMS'

# Check specific components
# [SMS Webhook] - Webhook handler
# [AgentPhoneClient] - Outbound messages
# [WebhookVerifier] - Signature verification
```

### Verify Signature Manually

```javascript
// Run in Node.js
const crypto = require('crypto');
const payload = '{"event":"message.received","data":{...}}';
const secret = 'your_webhook_secret';

const hmac = crypto.createHmac('sha256', secret);
hmac.update(payload);
const signature = hmac.digest('hex');

console.log('Expected signature:', `sha256=${signature}`);
```

### Check Database Tables

```sql
-- Check phone numbers
SELECT * FROM user_phone_numbers;

-- Check conversations
SELECT * FROM sms_conversations;

-- Check message log
SELECT
  created_at,
  direction,
  phone_number,
  message_body,
  status
FROM sms_messages_log
ORDER BY created_at DESC
LIMIT 10;
```

---

## Environment Setup Script

Quick script to verify environment is ready:

```bash
#!/bin/bash
# test-sms-env.sh

echo "🔍 Checking SMS Integration Environment..."
echo ""

# Check environment variables
echo "✓ Checking environment variables..."
if [ -z "$AGENTPHONE_API_KEY" ]; then
  echo "  ❌ AGENTPHONE_API_KEY not set"
else
  echo "  ✅ AGENTPHONE_API_KEY: ${AGENTPHONE_API_KEY:0:10}..."
fi

if [ -z "$AGENTPHONE_AGENT_ID" ]; then
  echo "  ❌ AGENTPHONE_AGENT_ID not set"
else
  echo "  ✅ AGENTPHONE_AGENT_ID: $AGENTPHONE_AGENT_ID"
fi

if [ -z "$AGENTPHONE_WEBHOOK_SECRET" ]; then
  echo "  ❌ AGENTPHONE_WEBHOOK_SECRET not set"
else
  echo "  ✅ AGENTPHONE_WEBHOOK_SECRET: ${AGENTPHONE_WEBHOOK_SECRET:0:10}..."
fi

echo ""
echo "✓ Checking database tables..."
# Add database checks here if needed

echo ""
echo "✓ Running tests..."
npm test -- __tests__/unit/services/agentphone/ --silent

echo ""
echo "✅ Environment check complete!"
```

---

## Next Steps After Testing

Once Phase 1 is verified working:

1. **Add real phone number** to `user_phone_numbers` table
2. **Configure AgentPhone webhook** to production URL
3. **Start Phase 2:** Intent parsing implementation
4. **Test end-to-end flow** with real money transfer

---

## Support

**Documentation:**
- Phase 1 Complete: `SMS_INTEGRATION_PHASE1_COMPLETE.md`
- Full Design: `SMS_INTEGRATION_COMPLETE.md`

**Issues:**
Check logs first, then verify:
1. Environment variables set correctly
2. Database tables exist
3. Signature secret matches AgentPhone
4. Phone number in E.164 format
5. User exists in database

---

**Last Updated:** 2026-05-17
**Version:** Phase 1
**Status:** Ready for Testing ✅
