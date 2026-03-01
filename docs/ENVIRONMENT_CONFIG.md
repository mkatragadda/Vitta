# Environment Configuration Guide

## Chimoney API Keys (Sandbox vs Production)

The application now supports environment-specific Chimoney API keys to distinguish between sandbox (testing) and production (live transfers).

### Configuration Files

- **Config**: `config/chimoney.js` - Loads appropriate API key based on `NODE_ENV`
- **Env File**: `.env.local` - Contains sandbox and production API keys

### Environment Variables

Set these in `.env.local`:

```bash
# Current environment (development, staging, production)
NODE_ENV=development

# Chimoney Sandbox Key (for development/testing)
CHIMONEY_API_KEY_SANDBOX=your_sandbox_key_here

# Chimoney Production Key (for live transfers)
CHIMONEY_API_KEY_PRODUCTION=your_production_key_here
```

### How It Works

1. **Development/Testing** (`NODE_ENV=development` or `staging`):
   - Uses `CHIMONEY_API_KEY_SANDBOX`
   - Safe for testing transfers
   - No real money involved

2. **Production** (`NODE_ENV=production`):
   - Uses `CHIMONEY_API_KEY_PRODUCTION`
   - Live transfers with real money
   - Must have valid production API key

### API Endpoints Using This Config

These endpoints load the environment-appropriate API key automatically:

- `GET /api/transfers/exchange-rate` - Fetches rates from Chimoney
- `POST /api/transfers/execute` - Executes transfers with Chimoney payout

### Setup Steps

#### Local Development

1. Add to `.env.local`:
   ```bash
   NODE_ENV=development
   CHIMONEY_API_KEY_SANDBOX=your_sandbox_key_from_chimoney
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

3. Test endpoints - they will automatically use sandbox API key

#### Production Deployment

1. Set environment variables in your deployment platform:
   - **Vercel**: Go to Project Settings → Environment Variables
   - **Netlify**: Go to Site settings → Build & deploy → Environment
   - **Other**: Set `NODE_ENV=production` and `CHIMONEY_API_KEY_PRODUCTION`

2. Example for Vercel:
   ```
   NODE_ENV = production
   CHIMONEY_API_KEY_PRODUCTION = your_production_key_here
   ```

3. Redeploy application

### Error Messages

If API key is missing:

```
CHIMONEY_API_KEY_SANDBOX not found in environment variables.
Add it to .env.local for development/testing.
```

Or:

```
CHIMONEY_API_KEY_PRODUCTION not found in environment variables.
This is required for production deployments.
```

### Testing the Configuration

1. Check which environment is active:
   ```bash
   echo $NODE_ENV
   ```

2. Test exchange rate endpoint:
   ```bash
   curl "http://localhost:3000/api/transfers/exchange-rate?amount=500"
   ```

3. Check logs for which API key is being used:
   - Look for `[exchange-rate]` or `[execute]` logs
   - Should show success/failure from Chimoney API

### Security Notes

⚠️ **Important**:
- Never commit `.env.local` to git (already in `.gitignore`)
- Production API key should only be set in secure environment (Vercel, AWS Secrets, etc.)
- Rotate API keys regularly
- Use separate sandbox and production Chimoney accounts

### Troubleshooting

**Q: Getting "Failed to fetch exchange rate"**
- Check if `CHIMONEY_API_KEY_SANDBOX` is set in `.env.local`
- Verify API key is correct from Chimoney dashboard
- Ensure `NODE_ENV=development` for local testing

**Q: Production transfers failing**
- Verify `NODE_ENV=production` is set in deployment platform
- Check if `CHIMONEY_API_KEY_PRODUCTION` is set and correct
- Ensure production key has proper permissions in Chimoney

**Q: How do I get API keys?**
- Go to https://chimoney.io/
- Create sandbox account (for testing)
- Create production account (for live transfers)
- Each account has its own API key
