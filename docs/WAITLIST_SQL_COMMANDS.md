# Waitlist SQL Commands - Quick Reference

Quick copy-paste SQL commands for managing the waitlist.

---

## View Waitlist

```sql
-- All users waiting for approval (sorted by join date)
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

---

## Approve Users

### Single User

```sql
-- Approve specific user by email
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE email = 'user@example.com';
```

### Multiple Users (Batch)

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

-- Approve specific list of emails
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE email IN (
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
);
```

---

## Analytics

```sql
-- Count waitlist vs approved users
SELECT
  is_approved,
  COUNT(*) as count
FROM users
GROUP BY is_approved;

-- Waitlist users by day
SELECT
  DATE(waitlist_joined_at) as join_date,
  COUNT(*) as new_waitlist_users
FROM users
WHERE waitlist_joined_at IS NOT NULL
GROUP BY DATE(waitlist_joined_at)
ORDER BY join_date DESC
LIMIT 30;

-- Recent approvals
SELECT
  email,
  name,
  approved_at
FROM users
WHERE approved_at IS NOT NULL
ORDER BY approved_at DESC
LIMIT 20;
```

---

## Revoke Access (Testing)

```sql
-- Put user back on waitlist
UPDATE users
SET
  is_approved = false,
  approved_at = NULL
WHERE email = 'user@example.com';
```

---

## Check Specific User

```sql
-- View user's approval status
SELECT
  email,
  name,
  is_approved,
  waitlist_joined_at,
  approved_at,
  created_at
FROM users
WHERE email = 'user@example.com';
```

---

## Bulk Operations

```sql
-- Approve all users who joined before specific date
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE is_approved = false
  AND waitlist_joined_at < '2025-01-15';

-- Approve all users (emergency - disable waitlist)
UPDATE users
SET
  is_approved = true,
  approved_at = NOW()
WHERE is_approved = false;
```
