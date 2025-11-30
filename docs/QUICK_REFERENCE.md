# Quick Reference Card - Vitta PWA Deployment

## Essential Commands

```bash
# Development
npm run dev                 # Start dev server (http://localhost:3000)
npm test                    # Run all tests
npm test -- __tests__/e2e/  # Run E2E tests only
npm run lint                # Check code quality

# Production Build
npm run build               # Build for production
npm start                   # Start production server
npm run build --analyze     # Analyze bundle size

# Deployment
vercel --prod              # Deploy to Vercel production
git push main              # Deploy to Netlify (auto)
docker build -t vitta .    # Build Docker image
```

## Environment Variables Checklist

### Required Variables (All Environments)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional Variables
```bash
OPENAI_API_KEY=sk-...                              # For chat features
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com  # For Google OAuth
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX                    # For Google Analytics
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o12345.ingest.sentry.io/67890  # For error tracking
```

## Pre-Deployment Checklist (Quick)

### Code Quality (5 min)
```bash
✓ npm test                    # All tests passing?
✓ npm test -- __tests__/e2e/  # All E2E tests passing?
✓ npm run build               # Builds without errors?
✓ npm run lint                # No critical issues?
```

### Security (5 min)
```bash
✓ Check .env.local not in git
✓ Verify OPENAI_API_KEY has no NEXT_PUBLIC_ prefix
✓ Verify environment variables in deployment platform
✓ Check all API keys present and valid
```

### PWA Features (5 min)
```bash
✓ public/sw.js exists
✓ public/manifest.json valid
✓ public/icons/ has 192x192 and 512x512
✓ Test offline: DevTools → Application → Offline
```

### Performance (5 min)
```bash
✓ npm run build output shows optimizations
✓ Bundle size acceptable (< 500KB gzipped)
✓ First Contentful Paint target: < 2.5s
✓ Check Lighthouse score > 85 (Performance)
```

## Deployment Paths

### Option 1: Vercel (Recommended)
```bash
# 1. Connect repository to Vercel
vercel

# 2. Add environment variables in Vercel Dashboard
# Settings → Environment Variables

# 3. Deploy
vercel --prod

# 4. Verify at https://your-domain.vercel.app
```

### Option 2: Netlify
```bash
# 1. Connect repository to Netlify Dashboard

# 2. Add environment variables in Site Settings

# 3. Deploy (automatic on push to main)
git push main

# 4. Verify at https://your-domain.netlify.app
```

### Option 3: Docker
```bash
# 1. Build image
docker build -t vitta:latest .

# 2. Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://..." \
  -e OPENAI_API_KEY="sk-..." \
  vitta:latest

# 3. Access at http://localhost:3000
```

## Post-Deployment Verification

### Immediate (First 5 minutes)
```bash
✓ Application loads without errors
✓ No 5xx errors in logs
✓ Service worker registered (DevTools → Application → Service Workers)
✓ Chat interface functional
✓ Cards loading
```

### First Hour
```bash
✓ Complete login/signup flow
✓ Test chat messaging
✓ Add/edit cards
✓ Go offline and test queueing
✓ Come back online and verify sync
```

### Monitoring
```bash
✓ Check error rate in Sentry (< 1% target)
✓ Monitor API response times (< 500ms target)
✓ Verify Google Analytics shows traffic
✓ No critical alerts firing
✓ Sync operations > 99% success rate
```

## Common Issues Quick Fix

| Issue | Solution |
|-------|----------|
| Service worker not registering | Check HTTPS enabled, clear cache, verify `public/sw.js` exists |
| Offline sync not working | Check IndexedDB in DevTools, verify syncManager initialized |
| High latency | Check API response times, review database queries, analyze bundle |
| High error rate | Check Sentry dashboard, review recent changes, check API status |
| Authentication failing | Verify OAuth credentials, check environment variables, test login flow |
| Variables not loading | Verify in deployment platform, check spelling exactly, redeploy |

## Rollback Command

```bash
# If critical issues found:
git revert <commit-hash>
git push
# Redeploy previous stable version
```

## Monitoring URLs

```bash
Sentry Errors:        https://sentry.io/organizations/your-org/issues/
Google Analytics:     https://analytics.google.com/analytics/web/#/report/dashboard
Vercel Dashboard:     https://vercel.com/dashboard
Netlify Dashboard:    https://app.netlify.com
Status Page:          https://yourdomain.com/status
```

## Contact & Escalation

```
On-Call Engineer:     [name] - [phone/slack]
Team Lead:            [name] - [email]
Support Email:        support@vitta.com
Status Page:          status.vitta.com
GitHub Issues:        github.com/username/vitta/issues
```

## Key Thresholds (Abort if...)

```
Error Rate:           > 5% (abort and rollback)
API Latency P95:      > 3 seconds (investigate)
Service Worker:       Fails to register (block deployment)
Sync Failure Rate:    > 20% (investigate immediately)
Data Loss:            Any detected (rollback immediately)
```

## 30-Second Deployment Verification

1. **Load application** - Should load < 2.5s
2. **Check console** - No critical errors
3. **Send message** - Should appear immediately
4. **Go offline** - Message should queue
5. **Go online** - Message should sync
6. **Check Sentry** - No new errors
7. **Check Analytics** - Showing traffic

## Team Access Required

```bash
# Deployment
✓ Vercel account with project access
✓ Netlify account with site access
✓ GitHub write access to main branch

# Monitoring
✓ Sentry account access
✓ Google Analytics view
✓ Server logs access

# Infrastructure
✓ Supabase project admin
✓ OpenAI API account
✓ Google OAuth app access
```

## Useful Development URLs

```
Local dev:              http://localhost:3000
Test offline:           DevTools → Application → Offline
Check service worker:   DevTools → Application → Service Workers
Inspect IndexedDB:      DevTools → Application → IndexedDB
View cache:             DevTools → Application → Cache Storage
Console logs:           DevTools → Console
Network tab:            DevTools → Network
Performance:            DevTools → Performance (record)
Lighthouse:             DevTools → Lighthouse
```

## Performance Targets

```
Lighthouse Score:       > 85 (Performance)
First Contentful Paint: < 2.5 seconds
Largest Contentful Paint: < 4 seconds
Cumulative Layout Shift: < 0.1
Time to Interactive:    < 5 seconds
API Response Time:      < 500ms (p95)
Service Worker Cache Hit: > 80%
Sync Success Rate:      > 99%
```

## Critical Files

```
public/sw.js                    - Service worker
public/manifest.json           - PWA manifest
services/sync/syncManager.js   - Queue management
services/offline/offlineDetector.js - Connectivity detection
pages/api/chat/completions.js  - OpenAI proxy
.env.local                      - Environment variables (DO NOT COMMIT)
```

---

**Print this card and keep it handy during deployment!**

Last Updated: 2025-11-30
