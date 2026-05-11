# Waitlist Testing Guide

## Quick Start - How to Test

This guide provides step-by-step instructions for testing the waitlist functionality.

**Last Updated:** 2025-01-09

---

## Prerequisites

1. ✅ Database migration applied
2. ✅ Code changes deployed
3. ✅ Access to Supabase SQL Editor or database client
4. ✅ Test Google account(s) ready

---

## Step 1: Apply Database Migration

### Option A: Via Supabase Dashboard

1. Open Supabase Dashboard → SQL Editor
2. Copy the migration SQL from `supabase/migrations/20250109_add_waitlist_fields.sql`
3. Paste and run the query
4. Verify success: Check for "Success. No rows returned" message

### Option B: Via Command Line

```bash
# If using psql
psql -h your-db-host -U postgres -d vitta -f supabase/migrations/20250109_add_waitlist_fields.sql

# Or via Supabase CLI
supabase db push
```

### Verify Migration Success

Run this query to confirm new fields exist:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('is_approved', 'waitlist_joined_at', 'approved_at');
```

**Expected Result:**
```
column_name        | data_type                   | column_default
-------------------|-----------------------------|-----------------
is_approved        | boolean                     | false
waitlist_joined_at | timestamp with time zone    | NULL
approved_at        | timestamp with time zone    | NULL
```

---

## Step 2: Verify Existing Users Are Approved

This is critical! The migration should have auto-approved all existing users.

```sql
-- Check all users' approval status
SELECT
  email,
  is_approved,
  approved_at,
  created_at
FROM users
ORDER BY created_at DESC;
```

**Expected Result:**
- All existing users should have `is_approved = true`
- All existing users should have `approved_at` populated

**If any existing user has `is_approved = false`, manually approve them:**

```sql
UPDATE users
SET is_approved = true, approved_at = NOW()
WHERE is_approved = false
  AND created_at < '2025-01-09'; -- Date before migration
```

---

## Step 3: Test New User Signup (Waitlist Flow)

### Test Case 1: Brand New User Signs Up

**Steps:**
1. Use a Google account that has never signed in to Vitta
2. Go to login page
3. Click "Sign in with Google"
4. Complete Google OAuth
5. **EXPECTED:** Redirected to waitlist screen (NOT the app)

**Verify in UI:**
- ✅ See "You're on the Waitlist!" heading
- ✅ User's email displayed correctly
- ✅ Join date shown
- ✅ Status shows "Pending Approval"
- ✅ Can sign out

**Verify in Database:**

```sql
-- Replace with your test email
SELECT
  email,
  is_approved,
  waitlist_joined_at,
  created_at
FROM users
WHERE email = 'your-test-email@gmail.com';
```

**Expected Database Result:**
```
email                       | is_approved | waitlist_joined_at       | created_at
----------------------------|-------------|--------------------------|------------
your-test-email@gmail.com   | false       | 2025-01-09 10:30:00+00   | 2025-01-09 10:30:00+00
```

### Test Case 2: Waitlist User Tries to Login Again

**Steps:**
1. Sign out from waitlist screen
2. Click "Sign in with Google" again
3. Complete Google OAuth

**EXPECTED:**
- ✅ Still see waitlist screen (not logged in)
- ✅ Same join date displayed
- ✅ No error messages

**Verify Console Logs:**
```
[Vitta] User saved to database: ...
[Vitta] User approval status: false
[Vitta] User not approved - showing waitlist screen
```

---

## Step 4: Test User Approval

### Approve the Test User

```sql
-- Replace with your test email
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE email = 'your-test-email@gmail.com';
```

**Verify approval:**

```sql
SELECT email, is_approved, approved_at
FROM users
WHERE email = 'your-test-email@gmail.com';
```

**Expected Result:**
```
email                       | is_approved | approved_at
----------------------------|-------------|-------------------------
your-test-email@gmail.com   | true        | 2025-01-09 10:35:00+00
```

---

## Step 5: Test Approved User Login

### Test Case 3: Newly Approved User Logs In

**Steps:**
1. Sign out (if still on waitlist screen)
2. Click "Sign in with Google"
3. Complete Google OAuth

**EXPECTED:**
- ✅ User is logged in successfully
- ✅ Redirected to Travel Pay screen (main app)
- ✅ Can access all features
- ✅ No waitlist screen shown

**Verify Console Logs:**
```
[Vitta] User saved to database: ...
[Vitta] User approval status: true
[Vitta] User approved - proceeding with login
```

---

## Step 6: Test Existing Users (No Regression)

This ensures existing functionality still works!

### Test Case 4: Existing Approved User

**Steps:**
1. Use an email that existed before the migration
2. Sign in with Google
3. Complete OAuth

**EXPECTED:**
- ✅ User logs in immediately (no waitlist)
- ✅ Goes directly to app
- ✅ All features work normally

**Verify in Database:**

```sql
-- Check existing user's status
SELECT
  email,
  is_approved,
  approved_at,
  created_at
FROM users
WHERE email = 'existing-user@gmail.com';
```

**Expected:**
```
email                    | is_approved | approved_at              | created_at
-------------------------|-------------|--------------------------|------------------------
existing-user@gmail.com  | true        | 2025-01-09 09:00:00+00   | 2024-12-01 08:00:00+00
```

---

## Step 7: Test Edge Cases

### Test Case 5: Demo Mode (Supabase Not Configured)

**Setup:** Temporarily remove Supabase env vars

**EXPECTED:**
- ✅ User can still log in (demo mode)
- ✅ No waitlist screen shown
- ✅ Demo users auto-approved (`is_approved: true`)

### Test Case 6: Database Error Fallback

**Setup:** Temporarily break database connection

**EXPECTED:**
- ✅ User falls back to demo mode
- ✅ Error logged to console
- ✅ User can still use app (limited)

### Test Case 7: Sign Out from Waitlist Screen

**Steps:**
1. Log in as waitlist user
2. Click "Sign Out" button on waitlist screen

**EXPECTED:**
- ✅ Redirected to landing page
- ✅ Can sign in again
- ✅ No errors

---

## Admin SQL Commands Reference

### View All Waitlist Users

```sql
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

### Approve Specific User

```sql
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE email = 'user@example.com';
```

### Approve Multiple Users (Batch)

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

### Revoke Approval (Testing)

```sql
-- Put user back on waitlist
UPDATE users
SET
  is_approved = false,
  approved_at = NULL
WHERE email = 'user@example.com';
```

### Analytics Queries

```sql
-- Count waitlist vs approved users
SELECT
  is_approved,
  COUNT(*) as count
FROM users
GROUP BY is_approved;

-- Waitlist join rate by day
SELECT
  DATE(waitlist_joined_at) as join_date,
  COUNT(*) as new_waitlist_users
FROM users
WHERE waitlist_joined_at IS NOT NULL
GROUP BY DATE(waitlist_joined_at)
ORDER BY join_date DESC;

-- Approval rate by day
SELECT
  DATE(approved_at) as approval_date,
  COUNT(*) as approvals
FROM users
WHERE approved_at IS NOT NULL
GROUP BY DATE(approved_at)
ORDER BY approval_date DESC;
```

---

## Testing Checklist

Use this checklist to ensure comprehensive testing:

### Database Migration
- [ ] Migration SQL runs without errors
- [ ] New columns exist in users table
- [ ] Index created on is_approved
- [ ] All existing users have is_approved = true
- [ ] All existing users have approved_at populated

### New User Waitlist Flow
- [ ] New user signup shows waitlist screen
- [ ] User email displayed correctly on waitlist screen
- [ ] Join date shown on waitlist screen
- [ ] Database has is_approved = false
- [ ] Database has waitlist_joined_at populated
- [ ] User can sign out from waitlist
- [ ] Re-login still shows waitlist

### Approval Flow
- [ ] SQL approval command works
- [ ] Database updated correctly (is_approved = true)
- [ ] approved_at timestamp set
- [ ] Approved user can log in
- [ ] Approved user accesses full app

### Existing User Flow (No Regression)
- [ ] Existing users auto-approved by migration
- [ ] Existing users log in normally
- [ ] No waitlist screen for existing users
- [ ] All existing features work
- [ ] Cards, payments, travel pay accessible

### Edge Cases
- [ ] Demo mode works (no Supabase)
- [ ] Database errors fall back gracefully
- [ ] Sign out works from waitlist
- [ ] Multiple login attempts handle correctly

### Admin Operations
- [ ] Can view waitlist users via SQL
- [ ] Can approve users via SQL
- [ ] Batch approval works
- [ ] Analytics queries return correct data

---

## Troubleshooting

### Issue: New user doesn't see waitlist screen

**Possible Causes:**
1. Migration not applied
2. User created before migration (check created_at)
3. User manually approved in database

**Debug Steps:**
```sql
-- Check user's approval status
SELECT * FROM users WHERE email = 'problem-user@example.com';
```

**Fix:**
```sql
-- Put user on waitlist
UPDATE users
SET is_approved = false, waitlist_joined_at = NOW()
WHERE email = 'problem-user@example.com';
```

### Issue: Existing user sees waitlist screen

**Cause:** User not auto-approved by migration

**Fix:**
```sql
-- Approve the user
UPDATE users
SET is_approved = true, approved_at = NOW()
WHERE email = 'existing-user@example.com';
```

### Issue: Approved user still sees waitlist

**Cause:** User needs to sign out and sign in again

**Fix:**
1. Click "Sign Out"
2. Click "Sign in with Google"
3. Complete OAuth
4. Should now enter app

### Issue: Migration fails

**Cause:** Table doesn't exist or wrong database

**Fix:**
```sql
-- Verify you're connected to correct database
SELECT current_database();

-- Verify users table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'users';
```

---

## Console Log Reference

### Expected Logs for Waitlist User

```
[Vitta] Google OAuth Success!
[Vitta] Decoded payload: {email: "...", name: "..."}
[Vitta] User saved to database: {id: "...", is_approved: false}
[Vitta] User approval status: false
[Vitta] User not approved - showing waitlist screen
```

### Expected Logs for Approved User

```
[Vitta] Google OAuth Success!
[Vitta] Decoded payload: {email: "...", name: "..."}
[Vitta] User saved to database: {id: "...", is_approved: true}
[Vitta] User approval status: true
[Vitta] User approved - proceeding with login
```

### Expected Logs for New User Creation

```
[userService] New user created successfully: user@example.com
[userService] User added to waitlist - approval required
```

### Expected Logs for Existing User Update

```
[userService] User updated successfully: user@example.com
[userService] User approval status: approved
```

---

## Performance Testing

### Check Query Performance

```sql
-- Verify index is being used
EXPLAIN ANALYZE
SELECT * FROM users WHERE is_approved = true;

-- Should show "Index Scan using idx_users_is_approved"
```

### Expected Query Times
- User approval check: < 10ms
- Waitlist query (100 users): < 50ms
- Batch approval (10 users): < 100ms

---

## Rollback Testing

### Test Rollback Scenario

If you need to undo the migration:

```sql
-- WARNING: This removes waitlist functionality
DROP INDEX IF EXISTS idx_users_is_approved;
ALTER TABLE users DROP COLUMN IF EXISTS is_approved;
ALTER TABLE users DROP COLUMN IF EXISTS waitlist_joined_at;
ALTER TABLE users DROP COLUMN IF EXISTS approved_at;
```

**After rollback:**
- [ ] App still works
- [ ] Users can log in
- [ ] No console errors
- [ ] Code gracefully handles missing fields

---

## Success Criteria

All tests pass when:

✅ New users see waitlist screen
✅ Waitlist users cannot access app
✅ Approved users access app normally
✅ Existing users unaffected (no regression)
✅ Admin can approve users via SQL
✅ Database migration successful
✅ No console errors
✅ Sign out/in works correctly
✅ Demo mode still functional

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Document any issues found
2. ✅ Update WAITLIST_DESIGN.md if needed
3. ✅ Plan email notification system
4. ✅ Plan admin dashboard UI
5. ✅ Monitor waitlist growth
6. ✅ Set approval cadence (daily/weekly)

---

## Contact

For issues or questions during testing:
- Review: `docs/WAITLIST_DESIGN.md`
- Check: Console logs for errors
- Verify: Database schema matches migration
