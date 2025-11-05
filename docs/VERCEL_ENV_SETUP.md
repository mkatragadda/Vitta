# Vercel Environment Variables Setup

## ⚠️ IMPORTANT: Update Your Vercel Environment Variables

After the OpenAI API key security fix, you need to update your Vercel environment variables.

### What Changed?

We moved the OpenAI API key from client-side to server-side for security:
- **OLD:** `NEXT_PUBLIC_OPENAI_API_KEY` (exposed in browser)
- **NEW:** `OPENAI_API_KEY` (server-side only)

### Steps to Update Vercel:

1. **Go to your Vercel project settings:**
   ```
   https://vercel.com/your-username/vitta-document-chat/settings/environment-variables
   ```

2. **Delete the old variable:**
   - Find `NEXT_PUBLIC_OPENAI_API_KEY`
   - Click "Delete"

3. **Add the new variable:**
   - Variable name: `OPENAI_API_KEY` (without NEXT_PUBLIC_ prefix)
   - Value: Your OpenAI API key
   - Environments: Production, Preview, Development (select all)
   - Click "Save"

4. **Redeploy your application:**
   ```bash
   # Option 1: Trigger a new deployment
   git commit --allow-empty -m "Update environment variables"
   git push

   # Option 2: Redeploy from Vercel dashboard
   # Go to Deployments → Click "..." → Redeploy
   ```

### Current Environment Variables (Vercel):

```bash
# Google OAuth (client-side - keep NEXT_PUBLIC_)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Supabase (client-side - keep NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (server-side only - NO NEXT_PUBLIC_ prefix)
OPENAI_API_KEY=your_openai_api_key
```

### Why This Change?

**Before:**
- OpenAI API key was exposed in browser JavaScript bundle
- Anyone could extract it and rack up charges

**After:**
- OpenAI API key is only accessible on the server
- Browser calls `/api/chat/completions` and `/api/embeddings`
- Server routes forward requests to OpenAI with the secure key

### Verify the Fix:

After deploying, verify the key is not exposed:

1. Open your production site in browser
2. Open DevTools → Sources
3. Search for "sk-proj" in the JavaScript files
4. **You should NOT find your API key** ✅

If you still find the key, the old `NEXT_PUBLIC_OPENAI_API_KEY` variable is still present in Vercel.

### Security Checklist:

- [ ] Deleted `NEXT_PUBLIC_OPENAI_API_KEY` from Vercel
- [ ] Added `OPENAI_API_KEY` (without NEXT_PUBLIC_) to Vercel
- [ ] Redeployed the application
- [ ] Verified key is not in browser bundle
- [ ] Tested chat functionality works
- [ ] Tested embedding/intent detection works

### Troubleshooting:

**Issue:** Chat responses not working after deployment
**Solution:** Make sure you saved the `OPENAI_API_KEY` variable (without NEXT_PUBLIC_ prefix) in Vercel and redeployed.

**Issue:** "OpenAI API key not configured" error
**Solution:** Check that the variable name is exactly `OPENAI_API_KEY` (no prefix) in Vercel environment variables.

**Issue:** Old key still showing in browser
**Solution:** Clear your browser cache or hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows).
