# Admin Pages Architecture

## Overview

Admin pages in Vitta are **development-only** tools for system maintenance and configuration. They are architected to be completely excluded from production builds for security and bundle size optimization.

## Architecture Principles

### 1. **Development-Only Access**
- Admin pages only exist in development (`NODE_ENV !== 'production'`)
- Server-side check in `getServerSideProps` returns 404 in production
- Webpack configuration excludes admin pages from production bundles

### 2. **Security Layers**

**Layer 1: Environment Check (Server-Side)**
```javascript
export async function getServerSideProps(context) {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
}
```

**Layer 2: Webpack Exclusion (Build-Time)**
```javascript
// next.config.js
webpack: (config, { isServer, dev }) => {
  if (!dev && !isServer) {
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^\.\/admin\/.*/,
        contextRegExp: /pages$/,
      })
    );
  }
  return config;
}
```

**Layer 3: Optional Token Authentication**
```javascript
// Uncomment in getServerSideProps for extra security
const adminToken = context.query.token;
const validToken = process.env.DEV_ADMIN_TOKEN;

if (!adminToken || adminToken !== validToken) {
  return { notFound: true };
}
```

### 3. **Browser-Based Execution**
- Admin pages run in the browser, not Node.js
- Can leverage Next.js API routes (via `fetch('/api/*')`)
- Access to React hooks and client-side functionality
- No Node.js environment limitations

## Available Admin Pages

### `/admin/embeddings` - Intent Embeddings Generator

**Purpose**: Generate and store OpenAI embeddings for intent detection

**Features**:
- Visual progress tracking
- Real-time status updates
- Automatic verification after generation
- Detailed error reporting with troubleshooting steps
- Intent breakdown display
- Estimated cost and time display

**Access**: http://localhost:3000/admin/embeddings (dev only)

**Process**:
1. Displays overview of all intents and examples
2. Generates embeddings via OpenAI API (browser → Next.js API → OpenAI)
3. Stores embeddings in Supabase `intent_embeddings` table
4. Verifies all embeddings were stored correctly
5. Shows completion status with detailed results

**UI States**:
- **Idle**: Ready to start, shows intent breakdown
- **Generating**: Progress animation, estimated time
- **Verifying**: Checking database storage
- **Complete**: Success message with statistics
- **Error**: Detailed error message with troubleshooting

## File Structure

```
vitta-document-chat/
├── pages/
│   └── admin/
│       └── embeddings.js          # Embedding generator admin page
├── next.config.js                 # Webpack exclusion config
└── docs/
    └── ADMIN_PAGES.md             # This file
```

## Production Build Behavior

### Development Build
```bash
npm run dev
```
- Admin pages accessible at `/admin/*`
- Full functionality available
- Hot module replacement works

### Production Build
```bash
npm run build
npm start
```
- Admin pages return 404
- No admin code in bundle
- Smaller bundle size
- No security risk

### Verification
```bash
# Build production bundle
npm run build

# Check bundle size (admin pages excluded)
ls -lh .next/static/chunks/pages/

# Should NOT see pages/admin/* in output

# Test production mode
npm start
# Visit http://localhost:3000/admin/embeddings
# Should return 404
```

## Adding New Admin Pages

### Step 1: Create Page in `/pages/admin/`

```javascript
// pages/admin/your-tool.js

export default function YourAdminTool() {
  return (
    <div>
      {/* Your admin UI */}
    </div>
  );
}

// REQUIRED: Security check
export async function getServerSideProps(context) {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }

  return { props: {} };
}
```

### Step 2: No Additional Configuration Needed

The webpack exclusion in `next.config.js` automatically handles all files in `/pages/admin/*`.

### Step 3: Document the Page

Add documentation to this file explaining:
- Purpose
- Access URL
- Features
- Security considerations

## Best Practices

### DO ✅

1. **Always include `getServerSideProps` check**
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     return { notFound: true };
   }
   ```

2. **Use descriptive URLs**
   - `/admin/embeddings` ✅
   - `/admin/tools` ❌ (too vague)

3. **Provide clear UI feedback**
   - Show loading states
   - Display error messages with troubleshooting
   - Confirm successful operations

4. **Add safety warnings**
   - Warn about destructive operations
   - Show estimated API costs
   - Display "DEV ONLY" badges

5. **Document everything**
   - Update this file when adding pages
   - Include inline comments
   - Explain security measures

### DON'T ❌

1. **Don't expose sensitive operations without warnings**
   - Bad: Silent database wipes
   - Good: Confirmation dialogs with warnings

2. **Don't skip environment checks**
   - Every admin page MUST have `getServerSideProps` check

3. **Don't hardcode secrets**
   - Use environment variables
   - Never commit API keys

4. **Don't rely solely on UI hiding**
   - Must have server-side + build-time security
   - UI hiding is NOT security

5. **Don't create admin API routes**
   - Admin pages should use existing API routes
   - Don't create `/api/admin/*` endpoints (security risk)

## Security Considerations

### Why Multiple Layers?

1. **Server-Side Check**: Prevents access even if someone has the URL
2. **Webpack Exclusion**: Removes code from bundle entirely
3. **Optional Token**: Extra layer for sensitive operations

### Threat Model

**Threat**: Someone discovers admin URL in production
- **Defense**: Server returns 404 (no page exists)

**Threat**: Someone inspects production bundle for admin code
- **Defense**: Webpack excluded it from bundle

**Threat**: Developer accidentally deploys with NODE_ENV=development
- **Defense**: Server-side check still prevents access

**Threat**: Malicious admin page in dev environment
- **Defense**: Code review, no sensitive operations without confirmation

## Environment Variables

### Required for Admin Pages

```bash
# .env.local

# Required for embeddings generation
OPENAI_API_KEY=sk-...

# Required for database operations
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional: Extra security for admin pages
# DEV_ADMIN_TOKEN=your-secret-token
```

### Usage in Admin Pages

```javascript
// Access via query param (if enabled)
// http://localhost:3000/admin/embeddings?token=your-secret-token

export async function getServerSideProps(context) {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }

  // Optional token check
  if (process.env.DEV_ADMIN_TOKEN) {
    const token = context.query.token;
    if (token !== process.env.DEV_ADMIN_TOKEN) {
      return { notFound: true };
    }
  }

  return { props: {} };
}
```

## Testing Admin Pages

### Manual Testing

```bash
# 1. Start dev server
npm run dev

# 2. Visit admin page
open http://localhost:3000/admin/embeddings

# 3. Test functionality
# - Click through all states
# - Trigger errors intentionally
# - Verify success cases

# 4. Test production build
npm run build
npm start
open http://localhost:3000/admin/embeddings
# Should show 404
```

### Verification Checklist

- [ ] Admin page works in development
- [ ] Admin page returns 404 in production
- [ ] No admin code in production bundle
- [ ] Error states handled gracefully
- [ ] Success states show useful information
- [ ] Documentation updated

## Maintenance

### When to Update

1. **Adding new admin pages**: Update this documentation
2. **Changing security model**: Update all admin pages
3. **Updating Next.js**: Verify webpack exclusion still works
4. **Adding new environment checks**: Update all pages consistently

### Regular Checks

- Quarterly: Verify production builds exclude admin pages
- After Next.js updates: Test admin page access control
- Before major releases: Review all admin page security

## Troubleshooting

### Admin Page Not Accessible in Dev

**Symptom**: 404 error in development mode

**Solutions**:
1. Check `NODE_ENV`: Should be undefined or 'development'
   ```bash
   echo $NODE_ENV
   ```
2. Restart dev server
   ```bash
   npm run dev
   ```
3. Clear Next.js cache
   ```bash
   rm -rf .next
   npm run dev
   ```

### Admin Page Accessible in Production

**Symptom**: Admin page works after `npm run build && npm start`

**Solutions**:
1. Verify `NODE_ENV=production` is set
2. Check `getServerSideProps` implementation
3. Rebuild from scratch
   ```bash
   rm -rf .next
   npm run build
   npm start
   ```

### Webpack Exclusion Not Working

**Symptom**: Admin page code in production bundle

**Solutions**:
1. Check `next.config.js` syntax
2. Verify webpack version compatibility
3. Test with clean build
   ```bash
   rm -rf .next
   npm run build
   npx next-bundle-analyzer
   ```

## Future Enhancements

### Potential Admin Pages

1. **Database Inspector** (`/admin/database`)
   - View table schemas
   - Run test queries
   - Monitor connection health

2. **Intent Tester** (`/admin/intent-tester`)
   - Test intent detection
   - Compare embeddings vs GPT
   - Analyze confidence scores

3. **Cache Manager** (`/admin/cache`)
   - View cached embeddings
   - Clear cache
   - Monitor cache hit rates

4. **API Monitor** (`/admin/api-monitor`)
   - View API usage
   - Track costs
   - Monitor rate limits

5. **User Simulator** (`/admin/user-simulator`)
   - Test with mock user data
   - Simulate edge cases
   - Stress test features

---

**Last Updated**: 2025-11-05
**Maintainer**: Vitta Development Team
**Status**: Active - Production-Ready Architecture
