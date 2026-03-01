# FX Rate Locking & Validation Strategy

**How to handle exchange rate changes between review and execution**

---

## 🚨 The Problem

### **Scenario: Rate Changes During Review**

```
User flow:
11:45 AM - User gets rate
  Exchange rate: 1 USD = ₹83.25
  Amount: $500 USD → ₹41,625 INR

11:45:30 - User reviews (sees locked rate)

11:46:00 - Market moves
  Exchange rate: 1 USD = ₹83.10 (rate dropped 0.18%)

11:46:30 - User confirms transfer
  API executes at NEW rate: $500 USD → ₹41,550 INR
  User gets ₹75 LESS than expected
  😞 User is upset
```

### **Why Rates Change**

```
FX rates fluctuate constantly:
- Market moves: ±0.05% every few seconds
- Time of day: Rates vary (London market open, etc.)
- Economic news: Can move 1-2% in minutes
- Chimoney's rate: Different from others
```

### **Real Numbers**

```
$500 USD transfer:
- At ₹83.25: Gets ₹41,625
- At ₹83.10: Gets ₹41,550 (₹75 less = $0.90 loss)

$5,000 USD transfer:
- At ₹83.25: Gets ₹416,250
- At ₹83.10: Gets ₹415,500 (₹750 less = $9 loss)

$50,000 USD transfer:
- At ₹83.25: Gets ₹4,162,500
- At ₹83.10: Gets ₹4,155,000 (₹7,500 less = $90 loss)
```

---

## ✅ How Real Fintech Apps Handle This

### **Wise.com Approach**

```
User gets rate → 10 minute lock
┌──────────────────────┐
│ Locked Rate: 1 USD = ₹83.25
│ Locked until: 11:56 AM (10 min)
│ Expires in: 9:45 remaining
└──────────────────────┘

If rate changes:
✅ User still gets locked rate
✅ Transparent about expiration
✅ User can re-quote if expired
```

### **Remitly Approach**

```
User gets rate → Re-check before execute
Show notification:
"Exchange rate has changed!
  Old: 1 USD = ₹83.25
  New: 1 USD = ₹83.10
Accept new rate? [Yes] [No]"
```

### **PayPal Approach**

```
User gets rate → Lock for 30 seconds
If user exceeds 30 sec:
  System auto re-quotes at new rate
  "Rate expired. Using current rate: ₹83.10"
```

---

## 🎯 Recommended Approach for Vitta

### **Option 1: Soft Lock** ✅ RECOMMENDED FOR MVP

```
User gets rate → Valid for 30 seconds
After 30 sec → Re-check before execute

Flow:
1. GET /api/transfers/exchange-rate
   Response: {
     exchange_rate: 83.25,
     expires_at: now + 30 seconds,  ← Add this
     is_locked: false
   }

2. User has 30 seconds to confirm
   (Time countdown on UI)

3. If user confirms within 30 sec:
   ✅ Use locked rate

4. If user confirms after 30 sec:
   POST /api/transfers/execute

   Backend re-checks rate:
   - If rate changed < 1%: Use new rate (auto accept)
   - If rate changed > 1%: Show user notification

```

**Implementation:**

```javascript
// Frontend: Track rate expiration
const [rateExpiration, setRateExpiration] = useState(null);
const [secondsRemaining, setSecondsRemaining] = useState(30);

useEffect(() => {
  if (!rateExpiration) return;

  const timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((rateExpiration - Date.now()) / 1000));
    setSecondsRemaining(remaining);

    if (remaining === 0) {
      showWarning('Rate has expired. Please review the new rate.');
    }
  }, 1000);

  return () => clearInterval(timer);
}, [rateExpiration]);

// Display to user
<div className="rate-card">
  <p>Exchange Rate: 1 USD = ₹{rate}</p>
  <p className="text-sm text-gray-500">
    {secondsRemaining > 0
      ? `Rate expires in ${secondsRemaining}s`
      : 'Rate expired - will re-quote on confirm'}
  </p>
</div>
```

---

### **Option 2: Hard Lock** (More Generous)

```
User gets rate → Lock for 10 minutes (like Wise)

Flow:
1. GET /api/transfers/exchange-rate
   Response: {
     exchange_rate: 83.25,
     expires_at: now + 10 minutes,  ← 600 seconds
     is_locked: true
   }

2. User has 10 minutes
   (Show countdown timer)

3. If user confirms within 10 min:
   ✅ Use SAME locked rate (guaranteed)
   ✅ No re-check needed

4. If user confirms after 10 min:
   "Rate lock expired. Need new quote."
   Redirect to re-quote

Pros:
✅ Great user experience
✅ No surprises
✅ User feels confident

Cons:
❌ You absorb rate risk
❌ If rate moves 1% in 10 min, you lose money
❌ Chimoney may not support this
```

---

### **Option 3: Always Re-check** (Most Cautious)

```
User gets rate → NO lock, always re-check

Flow:
1. GET /api/transfers/exchange-rate
   Response: {
     exchange_rate: 83.25,
     expires_at: null,
     is_locked: false
   }

2. User confirms transfer

3. POST /api/transfers/execute
   Backend re-checks CURRENT rate from Chimoney
   - If rate different: Show notification
   - "Rate changed from ₹83.25 → ₹83.10"
   - "Proceed with new rate? [Yes] [Cancel]"

Pros:
✅ You never lose money on rate changes
✅ Always using current market rate

Cons:
❌ Poor user experience
❌ Unpredictable amounts
❌ Users might cancel transfers
```

---

## 🏆 Best Practice: Option 1 (Soft Lock)

### **Why This is Best**

```
✅ Balances user experience + compliance
✅ 30 seconds is enough for user action
✅ Auto re-checks if user takes longer
✅ Transparent about expiration
✅ Matches Remitly/PayPal approach
✅ Lower cost (no rate risk)
```

### **Implementation in Code**

#### **1. GET /api/transfers/exchange-rate** (Add expiration)

```javascript
export default async function handler(req, res) {
  const { amount, source = 'USD', target = 'INR' } = req.query;

  try {
    // Get current rate from Chimoney
    const chimoney_response = await chimoney.rates.get({
      countryTo: 'IN'
    });

    const exchange_rate = chimoney_response.data.INR.rates.USD.rate;

    // Calculate expiration (30 seconds from now)
    const expires_at = new Date(Date.now() + 30 * 1000);

    // Return rate with expiration
    return res.json({
      success: true,
      exchange_rate,
      source_currency: source,
      target_currency: target,
      expires_at,
      is_locked: false,
      seconds_remaining: 30,

      // ... other fields
      target_amount: amount * exchange_rate,
      fee_amount: amount * 0.005,
      total_to_pay: amount + (amount * 0.005)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

#### **2. POST /api/transfers/execute** (Check rate before executing)

```javascript
export default async function handler(req, res) {
  const { transfer_id, accept_rate_change = false } = req.body;
  const user_id = req.headers['x-user-id'];

  try {
    // Step 1: Get transfer from DB
    const transfer = await db.transfers.findOne({
      where: { id: transfer_id, user_id }
    });

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    // Step 2: Get CURRENT rate from Chimoney
    const current_rate_response = await chimoney.rates.get();
    const current_rate = current_rate_response.data.INR.rates.USD.rate;

    // Step 3: Compare with rate user accepted
    const rate_difference_percent = Math.abs(
      (current_rate - transfer.exchange_rate) / transfer.exchange_rate * 100
    );

    // Step 4: Handle rate change
    if (rate_difference_percent > 1.0) {  // Rate changed more than 1%
      // Rate changed significantly
      if (!accept_rate_change) {
        // First time user sees change - ask for confirmation
        return res.status(400).json({
          success: false,
          error_code: 'RATE_CHANGED',
          error_message: 'Exchange rate has changed',
          old_rate: transfer.exchange_rate,
          new_rate: current_rate,
          difference_percent: rate_difference_percent.toFixed(2),
          old_amount: transfer.target_amount,
          new_amount: transfer.source_amount * current_rate,
          suggestion: 'Please confirm to proceed with the new rate',
          requires_confirmation: true
        });
      }
      // User accepted the change - update transfer
      transfer.exchange_rate = current_rate;
      transfer.target_amount = transfer.source_amount * current_rate;
    }

    if (rate_difference_percent <= 1.0) {
      // Rate changed < 1% - auto accept silently
      transfer.exchange_rate = current_rate;
      transfer.target_amount = transfer.source_amount * current_rate;
    }

    // Step 5: Continue with transfer execution
    // ... rest of execute logic

    return res.json({
      success: true,
      transfer_id,
      status: 'processing',
      final_exchange_rate: transfer.exchange_rate,
      final_target_amount: transfer.target_amount
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error_code: 'EXECUTE_FAILED',
      error_message: error.message
    });
  }
}
```

#### **3. Frontend: Handle Rate Change Notification**

```javascript
// TransferReview.js

const handleConfirm = async () => {
  try {
    const response = await fetch('/api/transfers/execute', {
      method: 'POST',
      body: JSON.stringify({
        transfer_id,
        accept_rate_change: false  // First attempt
      })
    });

    const result = await response.json();

    // Rate changed significantly
    if (result.error_code === 'RATE_CHANGED') {
      setShowRateChangeModal(true);
      setRateChangeData(result);
      return;
    }

    // Success
    setTransferComplete(true);

  } catch (error) {
    setError(error.message);
  }
};

// Modal component
const RateChangeModal = ({ data, onConfirm, onCancel }) => {
  return (
    <div className="modal">
      <div className="modal-header">
        <AlertTriangle size={24} className="text-orange-500" />
        <h2>Exchange Rate Changed</h2>
      </div>

      <div className="modal-body">
        <p>The exchange rate has changed since you started the transfer.</p>

        <div className="comparison">
          <div className="old-rate">
            <p className="label">Your Rate</p>
            <p className="value">1 USD = ₹{data.old_rate}</p>
            <p className="amount">You get: ₹{data.old_amount.toLocaleString()}</p>
          </div>

          <div className="arrow">→</div>

          <div className="new-rate">
            <p className="label">Current Rate</p>
            <p className="value">1 USD = ₹{data.new_rate}</p>
            <p className="amount">You get: ₹{data.new_amount.toLocaleString()}</p>
            <p className="difference text-red-500">
              ({data.difference_percent}% change)
            </p>
          </div>
        </div>

        <p className="warning">
          ⚠️ We recommend proceeding with the current rate.
          Would you like to continue?
        </p>
      </div>

      <div className="modal-footer">
        <button onClick={onCancel}>Go Back</button>
        <button onClick={() => onConfirm(true)} className="primary">
          Accept New Rate & Continue
        </button>
      </div>
    </div>
  );
};
```

---

## 📊 Database: Track Rate Locks

```sql
-- Add to transfers table
ALTER TABLE transfers ADD COLUMN (
  rate_locked_at TIMESTAMP,          -- When rate was locked
  rate_locked_expires_at TIMESTAMP,   -- When lock expires
  rate_used_on_execute TIMESTAMP,     -- When rate was actually used
  final_exchange_rate DECIMAL(10,4)   -- Rate used for execution
);

-- Add to transfer_status_log
INSERT INTO transfer_status_log
  When rate changes before execute:
  {
    transfer_id,
    old_status,
    new_status: 'rate_change_detected',
    reason: 'Exchange rate changed from 83.25 to 83.10',
    metadata: {
      old_rate: 83.25,
      new_rate: 83.10,
      user_accepted: true
    }
  }
```

---

## 🎯 Final Recommendation

### **For MVP: Soft Lock (30 seconds)**

```javascript
// GET /api/transfers/exchange-rate
Response: {
  exchange_rate: 83.25,
  expires_at: now + 30 seconds,
  is_locked: false,
  // ...
}

// POST /api/transfers/execute
Backend checks current rate:
- If changed < 1%: Auto-accept
- If changed > 1%: Ask user
- User can accept or cancel
```

**Benefits:**
- ✅ Simple to implement (1-2 hours)
- ✅ Good user experience
- ✅ No rate risk to you
- ✅ Matches industry standard
- ✅ Transparent

**Implementation:**
- Add `expires_at` to rate response
- Re-check rate on execute
- Show modal if > 1% change
- Database tracking

---

## ✅ Checklist

- [ ] Add rate expiration (30 seconds) to GET /exchange-rate
- [ ] Re-check rate in POST /execute
- [ ] Show modal if rate changes > 1%
- [ ] Add rate columns to transfers table
- [ ] Add rate change to transfer_status_log
- [ ] Test with manual rate changes
- [ ] Show countdown timer on frontend

Should I implement this rate locking approach?

