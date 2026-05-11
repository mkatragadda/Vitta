# Waitlist Design Documentation

## Overview

This document describes the waitlist system for Vitta that restricts access to approved users only. The design follows a simple, minimal approach using existing Google OAuth authentication with approval gates.

**Last Updated:** 2025-01-09

---

## Design Principles

1. **Simplicity First** - Minimal database changes, reuse existing auth flow
2. **No User Friction** - Users sign in normally, discover waitlist after OAuth
3. **Easy Management** - SQL commands for approval (admin UI planned for future)
4. **Secure** - Leverages existing Google OAuth, no new auth mechanisms

---

## Database Schema

### Modified Table: `users`

Three new fields added to existing `users` table:

```sql
-- Fields added to users table
is_approved BOOLEAN DEFAULT false,           -- Approval gate
waitlist_joined_at TIMESTAMP WITH TIME ZONE, -- When user joined waitlist
approved_at TIMESTAMP WITH TIME ZONE         -- When admin approved user
```

**Index for performance:**
```sql
CREATE INDEX idx_users_is_approved ON users(is_approved);
```

### Field Descriptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `is_approved` | BOOLEAN | `false` | Controls access to app. `true` = can login, `false` = waitlist |
| `waitlist_joined_at` | TIMESTAMP | `NULL` | Set when new user signs up via Google OAuth |
| `approved_at` | TIMESTAMP | `NULL` | Set when admin approves user (for analytics) |

**Migration file location:** `supabase/migrations/add_waitlist_fields.sql`

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│  User clicks "Sign in with Google"                  │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  Google OAuth Success                               │
│  (email, name, picture, sub received)               │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  Check: Does user exist in database?                │
│  SELECT * FROM users WHERE email = ?                │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
      YES  │                      │  NO
           │                      │
           ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────┐
│  Existing User       │  │  New User                │
│                      │  │                          │
│  Check is_approved   │  │  INSERT INTO users       │
│                      │  │  is_approved = false     │
│                      │  │  waitlist_joined_at=NOW  │
└──────┬───────────────┘  └──────┬───────────────────┘
       │                         │
       ▼                         ▼
┌──────────────────────────────────────────────────────┐
│  is_approved = true?                                 │
└──────┬───────────────────────────┬───────────────────┘
       │                           │
  YES  │                           │  NO
       │                           │
       ▼                           ▼
┌────────────────────┐   ┌─────────────────────────────┐
│  ✅ Allow Login    │   │  🚫 Show Waitlist Screen    │
│                    │   │                             │
│  setIsAuthenticated│   │  setIsAuthenticated(false)  │
│  (true)            │   │  setCurrentScreen('waitlist'│
│                    │   │  )                          │
│  Navigate to app   │   │                             │
└────────────────────┘   └─────────────────────────────┘
```

---

## User Experience

### 1. First-Time User Journey

1. User visits Vitta
2. Clicks "Sign in with Google"
3. Completes Google OAuth
4. **Redirected to Waitlist Screen** (not app)
5. Sees friendly message about pending approval
6. Can sign out

### 2. Approved User Journey

1. User visits Vitta
2. Clicks "Sign in with Google"
3. Completes Google OAuth
4. **Immediately enters app** (Travel Pay screen)
5. Normal app experience

### 3. Waitlist Screen UI

**Key Elements:**
- ✅ Friendly, welcoming tone (not rejection)
- ✅ Shows user's email for confirmation
- ✅ Shows join date for transparency
- ✅ Clear status: "Pending Approval"
- ✅ Sign out option
- ✅ Contact email for questions

**Design Mockup:**
```
┌────────────────────────────────────────┐
│                                        │
│          [Vitta Logo]                  │
│                                        │
│    🎉 You're on the Waitlist!         │
│                                        │
│    Thanks for signing up with          │
│    user@example.com                    │
│                                        │
│    We're gradually onboarding users.   │
│    You'll receive an email when your   │
│    access is approved.                 │
│                                        │
│    ────────────────────                │
│                                        │
│    Joined: Jan 9, 2025                 │
│    Status: Pending Approval            │
│                                        │
│    [Sign Out]                          │
│                                        │
│    Questions? Email support@getvitta.com │
│                                        │
└────────────────────────────────────────┘
```

**Component File:** `components/WaitlistScreen.js`

---

## Code Changes

### Files Modified

1. **`supabase/schema.sql`** - Add new fields to users table
2. **`services/userService.js`** - Handle waitlist fields on user creation
3. **`components/VittaApp.js`** - Check approval status, route to waitlist
4. **`components/WaitlistScreen.js`** (NEW) - Waitlist UI component

### Key Code Snippets

#### userService.js - Create user with waitlist status

```javascript
// New user - create with waitlist status
const { data: newUser, error: insertError } = await supabase
  .from('users')
  .insert({
    email,
    name,
    picture_url: picture,
    provider: 'google',
    is_approved: false,              // ⭐ Waitlist by default
    waitlist_joined_at: new Date()   // ⭐ Track join time
  })
  .select()
  .single();
```

#### VittaApp.js - Check approval before login

```javascript
const processGoogleProfile = useCallback(async ({ email, name, picture, sub }) => {
  const savedUser = await saveGoogleUser({ email, name, picture, sub });

  // ✨ Check if user is approved
  if (!savedUser.is_approved) {
    setUser({ ...userData, isApproved: false });
    setIsAuthenticated(false);
    setCurrentScreen('waitlist');
    return;
  }

  // ✅ Approved user - normal login
  setIsAuthenticated(true);
  setCurrentScreen('travelpay');
}, []);
```

---

## Admin Management

### Approval Workflow (SQL Commands)

Run these commands in Supabase SQL Editor or your database client.

#### 1. View Waitlist (sorted by join date)

```sql
-- See all users waiting for approval
SELECT
  email,
  name,
  waitlist_joined_at,
  created_at
FROM users
WHERE is_approved = false
  AND waitlist_joined_at IS NOT NULL
ORDER BY waitlist_joined_at ASC;
```

#### 2. Approve Specific User

```sql
-- Approve by email
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE email = 'user@example.com';
```

#### 3. Approve Multiple Users (Batch)

```sql
-- Approve first 10 waitlist users
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE is_approved = false
  AND waitlist_joined_at IS NOT NULL
ORDER BY waitlist_joined_at ASC
LIMIT 10;
```

#### 4. Revoke Access (if needed)

```sql
-- Remove approval from user
UPDATE users
SET is_approved = false
WHERE email = 'user@example.com';
```

#### 5. Analytics Queries

```sql
-- Count waitlist users
SELECT COUNT(*) as waitlist_count
FROM users
WHERE is_approved = false;

-- Count approved users
SELECT COUNT(*) as approved_count
FROM users
WHERE is_approved = true;

-- Approval rate by date
SELECT
  DATE(approved_at) as approval_date,
  COUNT(*) as approvals
FROM users
WHERE approved_at IS NOT NULL
GROUP BY DATE(approved_at)
ORDER BY approval_date DESC;
```

---

## Testing Plan

### Manual Testing Checklist

#### Test Case 1: New User Signup
- [ ] Sign in with new Google account
- [ ] Verify redirected to waitlist screen
- [ ] Check user record: `is_approved = false`, `waitlist_joined_at` populated
- [ ] Verify can sign out from waitlist screen
- [ ] Re-sign in, still see waitlist (not logged in)

#### Test Case 2: Approve User
- [ ] Run approval SQL command
- [ ] Verify `is_approved = true`, `approved_at` populated
- [ ] Sign in with same account
- [ ] Verify enters app normally (no waitlist screen)
- [ ] Verify can access all features

#### Test Case 3: Existing Approved User
- [ ] Sign in with already-approved account
- [ ] Verify immediate app access
- [ ] No waitlist screen shown

#### Test Case 4: Edge Cases
- [ ] Sign in, hit waitlist, sign out, sign in again → still waitlist
- [ ] Approve user while they're signed in → need to refresh/re-login
- [ ] Check database constraints work correctly

---

## Future Enhancements

### Phase 2 (High Priority)

1. **Email Notifications**
   - Send welcome email when user joins waitlist
   - Send approval email with login link
   - Service: SendGrid, Resend, or AWS SES

2. **Admin Dashboard**
   - Web UI for viewing waitlist
   - One-click approve/reject buttons
   - Search and filter users
   - Batch approval interface
   - Analytics: waitlist growth, approval rate
   - **TODO: Create admin panel UI** (tracked in backlog)

### Phase 3 (Nice-to-Have)

3. **Waitlist Position** (optional)
   - Show user their position in line (e.g., "You're #47")
   - Calculate dynamically: `COUNT(*) WHERE waitlist_joined_at < user.waitlist_joined_at`

4. **Auto-Approval Rules** (optional)
   - Auto-approve specific email domains (e.g., `@company.com`)
   - Auto-approve after X days
   - Referral-based auto-approval

5. **Waitlist Analytics**
   - Dashboard showing waitlist growth
   - Average time to approval
   - Conversion rate (approved → active users)

---

## Security Considerations

1. **No Bypass Routes**
   - All authenticated routes check `is_approved` status
   - API endpoints validate user approval before operations

2. **Database Row-Level Security (RLS)**
   - Consider Supabase RLS policies to enforce approval at DB level
   - Example policy: `SELECT only if is_approved = true`

3. **Session Management**
   - Waitlist users don't get full authentication session
   - Limited session for waitlist screen only

---

## Migration Guide

### Step 1: Database Migration

```bash
# Run SQL migration
psql -U postgres -d vitta -f supabase/migrations/add_waitlist_fields.sql
```

Or in Supabase Dashboard:
1. Go to SQL Editor
2. Paste migration SQL
3. Run query

### Step 2: Deploy Code Changes

```bash
# Install dependencies (if any new ones)
npm install

# Build and deploy
npm run build
npm run deploy
```

### Step 3: Verify Deployment

1. Test new user signup → waitlist screen
2. Approve test user via SQL
3. Test approved user login → app access
4. Monitor logs for errors

### Step 4: Approve Initial Users (if any)

```sql
-- Approve all existing users (one-time migration)
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE is_approved = false
  AND created_at < '2025-01-09';  -- Users before waitlist launch
```

---

## Rollback Plan

If issues arise, rollback steps:

### 1. Disable Waitlist (Emergency)

```sql
-- Approve all users temporarily
UPDATE users SET is_approved = true;
```

### 2. Code Rollback

```bash
# Revert to previous deployment
git revert HEAD
npm run build
npm run deploy
```

### 3. Database Rollback

```sql
-- Remove waitlist fields (if needed)
ALTER TABLE users
  DROP COLUMN is_approved,
  DROP COLUMN waitlist_joined_at,
  DROP COLUMN approved_at;

DROP INDEX idx_users_is_approved;
```

---

## FAQ

### Q: What happens if I approve a user while they're viewing the waitlist screen?

**A:** They need to refresh the page or sign out and sign in again. The approval status is checked during authentication, not on every page load.

**Future Enhancement:** Add real-time status checking via Supabase subscriptions.

---

### Q: Can I bulk-import approved users?

**A:** Yes, via SQL:

```sql
INSERT INTO users (email, name, provider, is_approved, approved_at)
VALUES
  ('user1@example.com', 'User One', 'google', true, NOW()),
  ('user2@example.com', 'User Two', 'google', true, NOW())
ON CONFLICT (email) DO UPDATE
SET is_approved = true, approved_at = NOW();
```

---

### Q: How do I reset the waitlist (delete all pending users)?

**A:** **Caution:** This is destructive!

```sql
-- Delete unapproved users (careful!)
DELETE FROM users
WHERE is_approved = false
  AND waitlist_joined_at IS NOT NULL;
```

---

## Support

For questions or issues with the waitlist system:

- **Developer:** Check CLAUDE.md and PROJECT_STRUCTURE.md
- **Database Issues:** Review supabase/schema.sql
- **Code Issues:** See components/VittaApp.js and services/userService.js

---

## Changelog

### Version 1.0 (2025-01-09)
- Initial waitlist design
- Database schema changes
- Waitlist screen UI
- SQL-based admin approval
- Documentation created

### Future Versions
- [ ] Admin dashboard UI
- [ ] Email notifications
- [ ] Waitlist position display
- [ ] Auto-approval rules
