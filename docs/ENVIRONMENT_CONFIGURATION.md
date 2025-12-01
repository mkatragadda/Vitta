# Environment Configuration Guide

## Overview

This guide covers all environment variables needed for Vitta PWA across different deployment environments (development, staging, production).

## Environment Files

### `.env.local` (Development - Local Machine)
Local development configuration. Not committed to git.

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# OpenAI Configuration (Server-side only)
OPENAI_API_KEY=sk-...

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### `.env.staging`
Staging environment configuration.

```bash
# Supabase Staging
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-key...

# OpenAI (use staging key if available)
OPENAI_API_KEY=sk-staging-...

# Google OAuth Staging
NEXT_PUBLIC_GOOGLE_CLIENT_ID=staging-client-id.apps.googleusercontent.com
```

### `.env.production`
Production environment configuration. Should only exist in deployment platform.

```bash
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-key...

# OpenAI Production
OPENAI_API_KEY=sk-prod-...

# Google OAuth Production
NEXT_PUBLIC_GOOGLE_CLIENT_ID=prod-client-id.apps.googleusercontent.com
```

## Environment Variables Reference

### Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
**Type:** Public (visible in client)
**Required:** Yes
**Description:** Supabase project URL
**Format:** `https://your-project.supabase.co`
**Where to find:**
1. Go to [supabase.com](https://supabase.com)
2. Select your project
3. Click "Connect" → "Javascript"
4. Copy the URL from `SUPABASE_URL` variable

**Verification:**
```bash
curl https://your-project.supabase.co/rest/v1/
# Should return API info, not 404
```

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Type:** Public (visible in client, limited permissions)
**Required:** Yes
**Description:** Supabase anonymous key for client-side queries
**Where to find:**
1. Supabase Dashboard → Settings → API
2. Look for "anon public" key
3. Copy the key

**Important Security Notes:**
- This key is for authenticated users only
- Row-Level Security (RLS) policies control actual access
- Never use the "service_role" key client-side
- Rotate key every 90 days in production

**Verification:**
```bash
# Test in browser console
supabase.auth.getSession()
# Should show current session if logged in
```

### OpenAI Configuration

#### `OPENAI_API_KEY`
**Type:** Secret (server-side only)
**Required:** Yes for chat features
**Description:** OpenAI API key for GPT and embeddings
**Format:** `sk-...` (starts with "sk-")
**Where to find:**
1. Go to [platform.openai.com](https://platform.openai.com/account/api-keys)
2. Login with OpenAI account
3. Click "Create new secret key"
4. Copy immediately (cannot retrieve later)

**IMPORTANT Security:**
- **MUST NOT have `NEXT_PUBLIC_` prefix**
- **Server-side only** - use API proxy routes
- All API calls go through `/pages/api/chat/completions`
- Key is never exposed to client
- Rotate every 30 days in production

**Verification:**
```bash
# On server side only
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
# Should return list of models
```

**Pricing:**
- Track usage in OpenAI dashboard
- Set usage limits and alerts
- Monitor billing regularly

### Google OAuth Configuration

#### `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
**Type:** Public (visible in client)
**Required:** Only if using Google Sign-In
**Description:** Google OAuth 2.0 Client ID
**Format:** `123456789.apps.googleusercontent.com`
**Where to find:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select project (create if needed)
3. Enable Google+ API
4. Go to Credentials → OAuth Consent Screen
5. Create OAuth 2.0 Client ID (Web Application)
6. Copy Client ID

**Configuration:**
1. Add authorized origins:
   - Development: `http://localhost:3000`
   - Staging: `https://staging.yourdomain.com`
   - Production: `https://yourdomain.com`

2. Add authorized redirect URIs:
   - Same as origins

**Verification:**
```bash
# Check if Google API loads
window.google
# Should be defined in browser
```

## Deployment Platform Setup

### Vercel Environment Variables

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add variables for each environment:
   - Preview (staging)
   - Production

**Setting Variables:**
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project.supabase.co
Environment: Preview, Production
```

**Encryption:**
- Vercel encrypts all values at rest
- Variables available during build
- Accessible in API routes and client

**Accessing Variables:**
```javascript
// In API routes (server-side)
process.env.OPENAI_API_KEY

// In client code (public vars only)
process.env.NEXT_PUBLIC_SUPABASE_URL
```

### Netlify Environment Variables

**In Netlify Dashboard:**
1. Go to Site Settings → Build & Deploy → Environment
2. Add variables

**Setting Variables:**
```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project.supabase.co
```

**Build-Time vs Runtime:**
- All variables available during build
- Access in functions and pages

**Accessing Variables:**
```javascript
// In API functions
process.env.OPENAI_API_KEY

// In client code
process.env.NEXT_PUBLIC_SUPABASE_URL
```

### AWS Amplify Environment Variables

**In AWS Amplify Console:**
1. App Settings → Environment Variables
2. Add for each environment branch

**Setting Variables:**
```
Variable: NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project.supabase.co
```

### Self-Hosted (Docker)

**In `.env` file:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
```

**In Docker:**
```dockerfile
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
```

**Run with variables:**
```bash
docker run \
  -e NEXT_PUBLIC_SUPABASE_URL="https://..." \
  -e OPENAI_API_KEY="sk-..." \
  vitta-app:latest
```

## Development Setup

### First Time Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/marxkatragadda/Vitta.git
   cd Vitta
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local`:**
   ```bash
   cp .env.example .env.local
   ```

4. **Fill in values:**
   ```bash
   # Edit .env.local with your actual values
   nano .env.local
   ```

5. **Verify setup:**
   ```bash
   npm run build
   npm test
   ```

6. **Start development:**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

### Environment-Specific Development

**Work with staging database:**
```bash
# .env.local for staging
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-key...
```

**Work with production database:**
```bash
# .env.local for production
# ⚠️ Use read-only keys when possible!
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-read-only-key...
```

## Staging Environment Setup

### Create Staging Supabase Project

1. Go to supabase.com
2. Create new project (staging)
3. Wait for provisioning
4. Copy URL and anon key

### Staging Variables

```bash
# Staging .env configuration
NEXT_PUBLIC_SUPABASE_URL=https://staging-xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-key-xxx
OPENAI_API_KEY=sk-staging-... # Optional: staging OpenAI key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=staging-client-id
```

### Deploy to Staging

**Vercel:**
1. Connect `develop` branch to Vercel
2. Set environment to "Preview"
3. Deploy automatically on push

**Netlify:**
1. Set branch to `develop`
2. Add environment variables
3. Deploy automatically on push

## Production Environment Setup

### Pre-Production Checklist

- [ ] Production Supabase project created
- [ ] Production OpenAI key created
- [ ] Production Google OAuth credentials
- [ ] SSL certificates ready
- [ ] Domain configured
- [ ] CDN configured
- [ ] Backups tested
- [ ] Monitoring configured

### Production Variables

```bash
# Production configuration
NEXT_PUBLIC_SUPABASE_URL=https://prod-xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-key-xxx
OPENAI_API_KEY=sk-prod-... # Production key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=prod-client-id
```

### Configure in Platform

**Vercel:**
1. Go to Production deployment settings
2. Add environment variables
3. Set to "Production" environment only
4. Deploy main branch

**Netlify:**
1. Add variables to Production context
2. Don't set to Preview
3. Deploy main branch

### Verify Production

```bash
# Visit production URL
# Check that variables loaded
curl https://yourdomain.com/api/health
# Should return 200 OK

# Check Supabase connection
# Verify chat works
# Test offline functionality
```

## Environment Variable Validation

### Pre-Deployment Checks

```bash
# Check all required variables present
node -e "
const vars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY'
];
vars.forEach(v => {
  if (!process.env[v]) console.error('Missing:', v);
  else console.log('✓', v);
});
"
```

### Environment Variable Testing

```bash
# Create test file
cat > test-env.js << 'EOF'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓' : '✗');
console.log('Supabase Key:', supabaseKey ? '✓' : '✗');
console.log('OpenAI Key:', openaiKey ? '✓' : '✗');
EOF

# Test
node test-env.js
```

## Secrets Management

### Best Practices

1. **Never commit secrets** to git
   - `.gitignore` includes `.env.local`
   - Use platform secrets management
   - Rotate keys regularly

2. **Use secret managers**
   - Vercel Secrets
   - Netlify Environment Variables
   - AWS Secrets Manager
   - HashiCorp Vault

3. **Limit access**
   - Only necessary team members
   - Different keys for different environments
   - Read-only where possible

4. **Rotate keys regularly**
   - Every 30 days for OpenAI
   - Every 90 days for Supabase
   - Immediately if compromised

### Key Rotation Procedure

**OpenAI Key Rotation:**
1. Create new key in OpenAI dashboard
2. Copy new key
3. Update in deployment platform
4. Redeploy application
5. Verify working
6. Delete old key in OpenAI dashboard

**Supabase Key Rotation:**
1. Go to Supabase Settings → API
2. Click "Rotate Key"
3. Confirm rotation
4. Update in deployment platform
5. Redeploy application
6. Verify working

## Troubleshooting

### Variables Not Loading

**Symptom:** Application error, variables undefined

**Solution:**
```bash
# Verify variables in build output
npm run build

# Check if variables are in deployment platform
# Verify spelling exactly matches

# Redeploy after changing variables
# Clear cache: npm run build --reset
```

### OpenAI API Errors

**Symptom:** "API error: 401" or "Invalid API key"

**Solution:**
1. Verify key starts with `sk-`
2. Verify key has `NEXT_PUBLIC_` prefix removed
3. Check key not in client-side code
4. Verify key in deployment platform
5. Check OpenAI API status page
6. Verify API key has correct permissions

### Supabase Connection Errors

**Symptom:** "Cannot connect to Supabase" or "Network error"

**Solution:**
1. Verify URL format: `https://xxx.supabase.co`
2. Check URL in deployment platform
3. Verify anon key correct
4. Check Supabase project online
5. Verify RLS policies allow access
6. Test with curl:
   ```bash
   curl -H "apikey: $KEY" https://your-url/rest/v1/
   ```

### Google OAuth Not Working

**Symptom:** "Popup closed" or "Authentication failed"

**Solution:**
1. Verify Client ID format
2. Check authorized origins in Google Console
3. Verify domain matches configuration
4. Check HTTPS enabled
5. Test with console: `window.google`
6. Check browser console for errors

## Reference

- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Deployment](https://vercel.com/docs)
- [Netlify Deployment](https://docs.netlify.com)
