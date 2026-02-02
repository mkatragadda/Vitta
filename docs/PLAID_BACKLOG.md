# Plaid Integration — Future Backlog

## Priority: High

### 1. Account Deletion with Safe Unlink

**Status:** Not Started
**Depends On:** Phase 3 complete
**Estimated Complexity:** Medium

#### Problem Statement

Users need ability to:
- Remove an account from their wallet (stop tracking in `user_credit_cards`)
- Completely unlink a bank (remove from `plaid_items` and associated data)
- See clear consequences before deletion

**Current State:**
- No delete functionality exists
- If user wants to stop tracking a card, no clean path
- Orphaned data could accumulate

#### Research Needed

**Fintech Solutions Analysis:**
- [ ] Investigate Mint/Mint.com approach
  - Do they soft-delete (mark as inactive) or hard-delete?
  - What happens to transaction history?
  - UI/UX for delete confirmation

- [ ] Investigate Personal Capital approach
  - How do they handle account unlink?
  - Do they archive transactions or delete?
  - Cascading deletions or orphaned data?

- [ ] Investigate YNAB (You Need A Budget)
  - Account removal workflow
  - Transaction retention strategy
  - Rate limiting or safeguards

- [ ] Investigate Rocket Money / Truebill
  - Delete vs disconnect distinction?
  - How do they prevent accidental deletion?

#### Design Considerations

**Option A: Soft Delete (Recommended)**
```sql
-- Mark account as inactive, keep all data
UPDATE user_credit_cards
SET is_active = FALSE, deleted_at = NOW()
WHERE id = 'card-123';

-- Keep plaid_items and transactions for historical analysis
-- User can "restore" later if needed
```

**Option B: Hard Delete (Aggressive)**
```sql
-- Complete removal
DELETE FROM user_credit_cards WHERE id = 'card-123';
DELETE FROM plaid_accounts WHERE vitta_card_id = 'card-123';
DELETE FROM transactions WHERE vitta_card_id = 'card-123';

-- Pros: Clean slate
-- Cons: No audit trail, user can't recover, GDPR complexity
```

**Option C: Hybrid (Archive)**
```sql
-- Move to archive table for compliance/audit
INSERT INTO deleted_credit_cards_archive
SELECT * FROM user_credit_cards WHERE id = 'card-123';

DELETE FROM user_credit_cards WHERE id = 'card-123';
```

#### UI/UX Requirements

- [ ] Delete button on each card in wallet
- [ ] Confirmation modal: "Are you sure? This will remove [Card Name]"
- [ ] Warning: "Your transaction history will [be kept/deleted]"
- [ ] Option to delete just from Vitta or completely unlink bank
- [ ] If unlink bank: "This will remove all [N] cards from this bank"
- [ ] Post-delete: "Card removed from your wallet. [Undo]" (if soft-delete)

#### API Design

**Endpoint:** `DELETE /api/plaid/accounts/{account-id}`
```javascript
/**
 * Delete Account From Wallet
 * DELETE /api/plaid/accounts/card-123
 *
 * Removes a credit card from user's wallet.
 * Can choose to: soft-delete (keep history) or hard-delete (remove all)
 */

Request:
  {
    "user_id": "user-123",
    "vitta_card_id": "card-123",
    "deleteType": "soft" | "hard"  // soft = keep transactions, hard = delete all
  }

Response (200):
  {
    "deleted_at": "2026-02-01T10:30:00Z",
    "type": "soft",
    "message": "Card removed from wallet. Transactions kept in archive.",
    "archived_transaction_count": 147
  }

Response (400):
  {
    "error": "Cannot delete",
    "reason": "Card has pending transactions or active subscriptions"
  }
```

#### Implementation Tasks

- [ ] Research fintech solutions (see Research Needed section)
- [ ] Decide soft vs hard delete strategy
- [ ] Design `deleted_credit_cards_archive` table (if needed)
- [ ] Create DELETE /api/plaid/accounts route
- [ ] Create test suite for delete logic
- [ ] Handle cascading: delete card → update vitta_card_id in plaid_accounts to NULL
- [ ] Add soft-delete flag to `user_credit_cards` table
- [ ] Update PlaidAccountSelector to show "inactive" cards separately
- [ ] Add "Restore" functionality (if soft-delete)
- [ ] Update CardBrowserScreen with delete button
- [ ] Write documentation on data retention policy

#### Data Retention Implications

**Questions to answer:**
- How long should deleted card's transactions be retained?
- GDPR: User requests all their data → include deleted accounts?
- Can deleted account be re-added later? (Link same bank again)
- Should deleted transactions still count toward spending analytics?

---

### 2. Rate Limiting for Manual Refresh

**Status:** Not Started
**Depends On:** Phase 3 complete + Phase 6 (refresh UI)
**Estimated Complexity:** Medium

#### Problem Statement

**The Issue:**
```
Route F (/api/plaid/refresh) calls Plaid's /transactions/sync endpoint
Each call to Plaid = API cost to Vitta
User can spam [Refresh] button → excessive Plaid calls → unexpected costs

Example:
  User clicks refresh 10 times in 30 seconds
  → 10 Plaid API calls
  → Each call costs money
  → Vitta's bill increases unexpectedly
```

**Current State:**
- No rate limiting on Route F
- User can refresh unlimited times
- No cost controls
- No user feedback on refresh status

#### Design Considerations

**Option A: Cooldown Timer (Simple)**
```javascript
// User can only refresh once per 60 seconds
const REFRESH_COOLDOWN_SECONDS = 60;

async function canRefresh(userId) {
  const lastRefresh = await redis.get(`refresh:${userId}`);

  if (lastRefresh) {
    const secondsUntilNext = 60 - (now - lastRefresh);
    return {
      allowed: false,
      message: `Please wait ${secondsUntilNext}s before refreshing again`,
      retryAfter: secondsUntilNext
    };
  }

  // Set cooldown
  await redis.setex(`refresh:${userId}`, 60, Date.now());
  return { allowed: true };
}
```

**Pros:**
- Simple to implement
- User can't abuse the button
- Clear feedback: "Try again in 45 seconds"

**Cons:**
- User might legitimately want to refresh multiple times
- Doesn't account for multiple users on same account
- Cooldown feels restrictive

**Option B: Rate Limit with Sliding Window (Better)**
```javascript
// User can refresh max 3 times per hour
const MAX_REFRESHES_PER_HOUR = 3;

async function canRefresh(userId) {
  const key = `refresh:${userId}`;
  const currentWindow = Math.floor(Date.now() / 3600000); // Hour-based window

  const refreshCount = await redis.incr(`${key}:${currentWindow}`);
  await redis.expire(`${key}:${currentWindow}`, 3600);

  if (refreshCount > MAX_REFRESHES_PER_HOUR) {
    return {
      allowed: false,
      message: `You've refreshed 3 times this hour. Try again later.`,
      remaining: MAX_REFRESHES_PER_HOUR - (refreshCount - 1),
      resetAt: (currentWindow + 1) * 3600000
    };
  }

  return { allowed: true, remaining: MAX_REFRESHES_PER_HOUR - refreshCount };
}
```

**Pros:**
- Allows multiple refreshes within limit
- Fair distribution over time
- User has clarity on quota

**Cons:**
- Still might feel restrictive for power users
- Requires Redis/cache backend

**Option C: Cost-Based Throttling (Advanced)**
```javascript
// Track actual Plaid API costs, limit user based on cost budget
const USER_REFRESH_BUDGET = 100; // Cost units per month

async function canRefresh(userId) {
  const monthKey = `refresh-cost:${userId}:${getMonth()}`;
  const currentCost = await redis.get(monthKey) || 0;

  if (currentCost >= USER_REFRESH_BUDGET) {
    return {
      allowed: false,
      message: "You've reached your monthly refresh limit",
      resetAt: getNextMonthStart()
    };
  }

  return { allowed: true, remaining: USER_REFRESH_BUDGET - currentCost };
}

// After refresh completes, log actual cost
await logRefreshCost(userId, actualPlaidCost);
```

**Pros:**
- Maps directly to real costs
- Transparent to user
- Fair across different user profiles

**Cons:**
- Complex to implement
- Requires cost tracking from Plaid
- User might not understand "cost units"

**Option D: Hybrid (Recommended)**
```javascript
// Combine cooldown + hourly limit

const COOLDOWN_SECONDS = 30;        // Can't refresh more than every 30s
const MAX_PER_HOUR = 5;             // Max 5 refreshes per hour
const MAX_PER_DAY = 20;             // Max 20 refreshes per day

async function canRefresh(userId) {
  // Check cooldown (prevents button spam)
  const lastRefresh = await redis.get(`refresh-cooldown:${userId}`);
  if (lastRefresh) {
    const wait = 30 - (now - lastRefresh);
    return {
      allowed: false,
      reason: 'cooldown',
      message: `Please wait ${wait}s`,
      retryAfter: wait
    };
  }

  // Check hourly limit
  const hourKey = `refresh-hourly:${userId}:${getCurrentHour()}`;
  const hourCount = await redis.incr(hourKey);
  await redis.expire(hourKey, 3600);

  if (hourCount > MAX_PER_HOUR) {
    return {
      allowed: false,
      reason: 'hourly-limit',
      message: 'Max 5 refreshes per hour',
      remaining: MAX_PER_HOUR
    };
  }

  // Check daily limit
  const dayKey = `refresh-daily:${userId}:${getCurrentDay()}`;
  const dayCount = await redis.incr(dayKey);
  await redis.expire(dayKey, 86400);

  if (dayCount > MAX_PER_DAY) {
    return {
      allowed: false,
      reason: 'daily-limit',
      message: 'Max 20 refreshes per day',
      remaining: MAX_PER_DAY
    };
  }

  // Set cooldown
  await redis.setex(`refresh-cooldown:${userId}`, COOLDOWN_SECONDS, now);

  return {
    allowed: true,
    remaining: { hourly: MAX_PER_HOUR - hourCount, daily: MAX_PER_DAY - dayCount }
  };
}
```

#### Implementation Plan

**Backend (Route F Enhancement):**
```javascript
// pages/api/plaid/refresh.js

export default async function handler(req, res) {
  const { user_id } = req.body;

  // 1. Check rate limit
  const rateLimitCheck = await checkRefreshRateLimit(user_id);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      error: 'Too many refresh requests',
      reason: rateLimitCheck.reason,
      message: rateLimitCheck.message,
      retryAfter: rateLimitCheck.retryAfter || rateLimitCheck.resetAt
    });
  }

  // 2. Proceed with refresh (existing logic)
  const { data: items } = await supabase
    .from('plaid_items')
    .select('*')
    .eq('user_id', user_id)
    .eq('status', 'active');

  res.status(200).json({
    refreshing: true,
    item_count: items.length,
    refreshQuota: {
      remaining: {
        hourly: rateLimitCheck.remaining.hourly,
        daily: rateLimitCheck.remaining.daily
      }
    }
  });

  // 3. Async refresh (fire and forget)
  setImmediate(async () => {
    // ... existing sync logic
  });
}
```

**Frontend (UI Feedback):**
```javascript
// components/RefreshButton.js

export default function RefreshButton({ user }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshQuota, setRefreshQuota] = useState(null);
  const [error, setError] = useState(null);

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/plaid/refresh', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.user_id })
      });

      if (response.status === 429) {
        // Rate limited
        const data = await response.json();
        setError({
          title: data.message,
          detail: `Try again in ${data.retryAfter}s`
        });
        setIsRefreshing(false);
        return;
      }

      const { refreshing, item_count, refreshQuota: quota } = await response.json();

      if (quota) {
        setRefreshQuota(quota);
      }

      // Show spinner
      setTimeout(() => {
        setIsRefreshing(false);
        // Refetch transactions
      }, 3000);

    } catch (err) {
      setError({ title: 'Refresh failed', detail: err.message });
      setIsRefreshing(false);
    }
  }

  return (
    <div className="refresh-section">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="refresh-button"
      >
        {isRefreshing ? '🔄 Syncing...' : '🔄 Refresh Now'}
      </button>

      {error && (
        <div className="error-message">
          <strong>{error.title}</strong>
          <p>{error.detail}</p>
        </div>
      )}

      {refreshQuota && (
        <div className="quota-info">
          <p className="text-xs text-gray-600">
            Refreshes today: {20 - refreshQuota.remaining.daily} / 20
            <br />
            Refreshes this hour: {5 - refreshQuota.remaining.hourly} / 5
          </p>
        </div>
      )}
    </div>
  );
}
```

**Redis Cache Setup:**
```javascript
// services/redis.js (or cache service)

const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

async function checkRefreshRateLimit(userId) {
  // Implement the hybrid rate limiting logic above
  // Use Redis for fast, distributed rate limiting
}

module.exports = { checkRefreshRateLimit };
```

#### Testing Strategy

```javascript
// __tests__/unit/plaid/refreshRateLimit.test.js

describe('Refresh Rate Limiting', () => {
  test('allows first refresh', async () => {
    const result = await checkRefreshRateLimit('user-123');
    expect(result.allowed).toBe(true);
  });

  test('blocks second refresh within cooldown', async () => {
    await checkRefreshRateLimit('user-123'); // First
    const result = await checkRefreshRateLimit('user-123'); // Second (too soon)
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cooldown');
  });

  test('allows refresh after cooldown expires', async () => {
    await checkRefreshRateLimit('user-123');
    await sleep(31000); // Wait for 30s cooldown + 1s buffer
    const result = await checkRefreshRateLimit('user-123');
    expect(result.allowed).toBe(true);
  });

  test('blocks after hourly limit exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      await sleep(31000); // Wait for cooldown
      await checkRefreshRateLimit('user-123');
    }
    // 6th attempt should fail
    const result = await checkRefreshRateLimit('user-123');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('hourly-limit');
  });

  test('resets hourly limit at hour boundary', async () => {
    // Test 11:59:59 → 12:00:00 transition
  });
});
```

#### Cost Savings Estimate

**Without Rate Limiting:**
- Power user refreshes 50 times/day = 50 API calls
- Across 1000 users = 50,000 calls/day
- At $0.01 per call = $500/day = $15,000/month

**With Hybrid Rate Limiting (20 per day max):**
- Max 20 refreshes/day per user = 20,000 calls/day
- At $0.01 per call = $200/day = $6,000/month
- **Savings: $9,000/month** ✓

#### Configuration

```javascript
// config/plaidRefreshLimits.js

export const REFRESH_LIMITS = {
  COOLDOWN_SECONDS: 30,           // Minimum time between refreshes
  MAX_PER_HOUR: 5,                // Per-hour limit
  MAX_PER_DAY: 20,                // Per-day limit

  // Can be overridden by user tier
  PREMIUM_MAX_PER_HOUR: 15,
  PREMIUM_MAX_PER_DAY: 60,

  // Error messages
  MESSAGES: {
    cooldown: 'Please wait before refreshing again',
    hourly: 'You\'ve reached your hourly refresh limit',
    daily: 'You\'ve reached your daily refresh limit'
  }
};
```

---

## Priority: Medium

### 3. Webhook Reliability Monitoring

**Status:** Not Started
**Depends On:** Phase 4 (Webhooks)

- Monitor webhook success/failure rate
- Alert on failed webhook processing
- Retry mechanism for failed webhooks
- Dashboard showing webhook health

---

### 4. Transaction Categorization Improvements

**Status:** Not Started
**Depends On:** Phase 5 (Category Mapper)

- ML-based category prediction
- User can train model with corrections
- Handle edge cases: "Chase Bank FEE" vs "Chase Purchase"
- Bulk recategorization tool

---

## Priority: Low

### 5. Multi-User Household Support

**Status:** Not Started
**Depends On:** Family Management feature

- Multiple users linking same bank
- Shared accounts vs personal accounts
- Permission model (who can see what)

---

### 6. Plaid Item Health Monitoring

**Status:** Not Started

- Detect when item needs re-authentication
- Pro-active notifications to user
- Handle "item_updated_webhook_update_required"

---

## Completed ✓

- [x] Phase 3: Core Plaid integration (6 API routes)
- [x] Phase 3.5: Duplicate detection, add more accounts, transaction filtering plan
- [ ] Phase 4: Webhook handler
- [ ] Phase 5: Transaction categorization
- [ ] Phase 6: Frontend wiring
- [ ] Phase 8: Chat integration

---

## Backlog Summary

| Item | Priority | Est. Complexity | Dependencies |
|------|----------|-----------------|---|
| Account Deletion | High | Medium | Phase 3 |
| Refresh Rate Limiting | High | Medium | Phase 3, Phase 6 |
| Webhook Monitoring | Medium | Low | Phase 4 |
| Category Improvements | Medium | High | Phase 5 |
| Multi-User Support | Low | High | Family Mgmt |
| Item Health Monitoring | Low | Medium | Phase 4 |

**Next Steps:** Research fintech solutions for #1 and #2, then prioritize implementation timeline.
