# Supabase Setup Guide for Vitta

This guide will help you configure Supabase to persist user data from Google OAuth login.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Supabase project created

## Step 1: Create the Users Table in Supabase

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Create a new query and run this SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  provider TEXT DEFAULT 'google',
  google_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can make this more restrictive later)
CREATE POLICY "Enable all operations for authenticated users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## Step 2: Get Your Supabase Credentials

1. Go to **Settings** → **API** in your Supabase project dashboard
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Configure Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**Important:** Never commit your actual `.env.local` file to Git. It should be in your `.gitignore`.

## Step 4: Restart the Development Server

After updating `.env.local`, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 5: Test the Integration

1. Navigate to http://localhost:3000
2. Click **Sign in with Google**
3. Complete the Google OAuth flow
4. Check the browser console for success messages:
   ```
   [Vitta] User saved to database: { id: '...', email: '...', ... }
   ```
5. Verify the user was saved in Supabase:
   - Go to **Table Editor** → **users** in your Supabase dashboard
   - You should see the new user record

## How It Works

### Demo Mode vs Production Mode

The app supports two login flows:

1. **Demo Login** (Email/Password)
   - Uses mock authentication
   - No database persistence
   - Great for testing UI/UX

2. **Google OAuth Login**
   - Authenticates with Google
   - Saves user to Supabase database
   - Falls back to demo mode if Supabase is not configured

### User Service Architecture

The `services/userService.js` file handles all database operations:

- `saveGoogleUser(userData)` - Create or update user after Google login
- `getUserByEmail(email)` - Fetch user by email
- `getUserById(userId)` - Fetch user by ID
- `deleteUser(userId)` - Delete user

### Supabase Integration

Files involved:
- `config/supabase.js` - Supabase client configuration
- `services/userService.js` - User database operations
- `components/VittaApp.js` - Updated Google login handler

## Database Schema

### users table

| Column      | Type      | Description                    |
|-------------|-----------|--------------------------------|
| id          | UUID      | Primary key (auto-generated)   |
| email       | TEXT      | User email (unique)            |
| name        | TEXT      | User's full name               |
| picture     | TEXT      | Profile picture URL            |
| provider    | TEXT      | Auth provider (e.g., 'google') |
| google_id   | TEXT      | Google user ID (unique)        |
| created_at  | TIMESTAMP | Account creation timestamp     |
| updated_at  | TIMESTAMP | Last update timestamp          |

## Troubleshooting

### Issue: "Supabase not configured - running in demo mode"

**Solution:** Make sure you've:
1. Added valid Supabase URL and anon key to `.env.local`
2. Restarted the development server
3. The values are not the placeholder text

### Issue: "Error creating user" in console

**Solution:** Check:
1. The users table exists in Supabase
2. Row Level Security policies allow insertions
3. Your anon key has the correct permissions

### Issue: User not appearing in Supabase table

**Solution:**
1. Check browser console for errors
2. Verify RLS policies are correctly configured
3. Try the SQL Editor to manually insert a test record

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Use Row Level Security (RLS)** in Supabase to protect user data
3. **Rotate API keys** if they're ever exposed
4. **Use environment-specific keys** for development vs production

## Next Steps

Once user persistence is working, you can:

1. Add credit card data persistence (linked to user ID)
2. Store payment optimization preferences
3. Save AI chat history per user
4. Implement user settings and preferences

## Support

For Supabase-specific issues, check:
- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com

For Vitta-specific issues, refer to the main README.md.
