# PWA Deployment Guide - Phase 6

## Overview

This guide covers deploying Vitta PWA to production, including offline functionality, service workers, sync mechanisms, and monitoring. The application is built with Next.js 14 and includes offline-first capabilities with background sync.

## Pre-Deployment Checklist

### Code Quality
- [ ] Run full test suite: `npm test` (all tests passing)
- [ ] Run E2E tests: `npm test -- __tests__/e2e/` (all workflows validated)
- [ ] Build project: `npm run build` (no errors or warnings)
- [ ] Lint code: `npm run lint` (no critical issues)
- [ ] Check bundle size: Analyze with `npm run build` output
- [ ] Verify no console errors in production build

### Security
- [ ] All API keys in `.env.local` (not `NEXT_PUBLIC_` for sensitive data)
- [ ] `OPENAI_API_KEY` server-side only
- [ ] No hardcoded credentials in codebase
- [ ] OAuth credentials configured correctly
- [ ] Supabase Row-Level Security (RLS) policies enabled
- [ ] Content Security Policy headers configured
- [ ] CORS properly configured for API routes

### PWA Specific
- [ ] Service worker registered and tested
- [ ] Web manifest (`public/manifest.json`) configured
- [ ] Icon files present in correct sizes (192x192, 512x512)
- [ ] Favicon configured
- [ ] HTTPS enabled on deployment
- [ ] Offline functionality tested thoroughly
- [ ] Sync queue persistence working
- [ ] IndexedDB quota appropriate for expected data

### Functionality Testing
- [ ] Login flow works (demo + Google OAuth)
- [ ] Chat interface functional
- [ ] Card management works
- [ ] Payment optimizer calculates correctly
- [ ] Offline message queueing works
- [ ] Online sync completes successfully
- [ ] Network transitions handled smoothly
- [ ] No data loss during sync
- [ ] App installable on mobile and desktop

### Performance
- [ ] Lighthouse score > 85 (Performance)
- [ ] First Contentful Paint < 2.5s
- [ ] Largest Contentful Paint < 4s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 5s
- [ ] Service worker caching efficient
- [ ] API responses optimized

### Browser Compatibility
- [ ] Chrome/Chromium latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] PWA installable on all platforms
- [ ] Offline functionality works across browsers
- [ ] Service worker registered successfully

## Deployment Environments

### Development (`npm run dev`)
```bash
npm run dev
# Runs on http://localhost:3000
# Hot reload enabled
# All logging enabled
# Mock mode available for testing
```

### Staging
```bash
npm run build
npm start
# Production build, local server
# Full testing before production
# Real API endpoints
# Monitoring enabled
```

### Production
```bash
npm run build
npm start
# OR deploy to Vercel/Netlify
# All security checks enabled
# Performance optimizations active
# Full monitoring and analytics
```

## Vercel Deployment

### Setup Steps

1. **Connect Repository**
   ```bash
   vercel
   # Login and authorize
   # Select project directory
   ```

2. **Configure Environment Variables**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   OPENAI_API_KEY=sk-... (Production only)
   ```

3. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
   - Node.js Version: 18.x or higher

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Vercel-Specific Configuration

**vercel.json** (if needed for custom config):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_key"
  },
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## Netlify Deployment

### Setup Steps

1. **Connect Repository**
   - Go to Netlify dashboard
   - Click "New site from Git"
   - Select repository
   - Authorize Netlify

2. **Configure Build Settings**
   - Build Command: `npm run build`
   - Publish Directory: `.next`
   - Base Directory: (leave empty)

3. **Add Environment Variables**
   - Go to Site Settings → Build & Deploy → Environment
   - Add variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     NEXT_PUBLIC_GOOGLE_CLIENT_ID
     OPENAI_API_KEY
     ```

4. **Deploy**
   - Push to main branch
   - Netlify auto-deploys

### Netlify.toml Configuration

```toml
[build]
  command = "npm run build"
  publish = ".next"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/service-worker.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
```

## Docker Deployment

### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose (for local testing)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    volumes:
      - .:/app
      - /app/node_modules
```

## Post-Deployment Verification

### Immediate Checks (First 5 minutes)
- [ ] Application loads without errors
- [ ] No 4xx or 5xx errors in logs
- [ ] Service worker registered successfully
- [ ] Web manifest accessible
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Authentication flow working

### Functional Checks (First hour)
- [ ] Chat interface operational
- [ ] Card management working
- [ ] Offline message queueing
- [ ] Sync on reconnection
- [ ] Payment calculations accurate
- [ ] UI responsive on mobile
- [ ] Icons loading correctly
- [ ] No console errors

### Performance Checks (Day 1)
- [ ] Lighthouse scores acceptable
- [ ] Load times within SLA
- [ ] Service worker caching effective
- [ ] No memory leaks
- [ ] IndexedDB working properly
- [ ] CSS/JS bundles optimized
- [ ] Images optimized

### Monitoring (Ongoing)
- [ ] Error rate < 0.1%
- [ ] Average response time < 500ms
- [ ] Availability > 99.5%
- [ ] No critical alerts
- [ ] User sessions stable
- [ ] Sync success rate > 99%

## Rollback Procedure

If critical issues discovered post-deployment:

1. **Vercel Rollback**
   - Go to Deployments tab
   - Select previous stable deployment
   - Click "Promote to Production"

2. **Netlify Rollback**
   - Go to Deploys tab
   - Select previous stable deploy
   - Click "Publish deploy"

3. **Manual Rollback**
   ```bash
   git revert HEAD
   git push
   # Redeploy latest stable version
   ```

## Security Hardening

### HTTPS
- Enforce HTTPS on all deployments
- Use automatic certificates (Vercel/Netlify provide)
- Test with `https://` URLs only

### Headers
Configure security headers (implemented in platform config):
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

### API Security
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Supabase handles)
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented

### Data Security
- [ ] Supabase Row-Level Security enabled
- [ ] Encryption at rest enabled
- [ ] Encryption in transit (HTTPS)
- [ ] Regular backups configured
- [ ] Data retention policies set
- [ ] User data properly isolated

## Monitoring Setup

### Error Tracking
- Sentry integration (recommended)
- Error logs to dashboard
- Alert on critical errors
- Session replay for debugging

### Analytics
- Google Analytics integration
- User behavior tracking
- Feature usage metrics
- Performance monitoring

### Logging
- Access logs review
- Error log monitoring
- Performance metrics
- Sync success/failure rates

### Alerts
- High error rate (> 5%)
- High latency (> 2s avg)
- Service worker failures
- Sync failures (> 10%)
- Disk space issues
- API quota warnings

## Maintenance

### Weekly
- Review error logs
- Check performance metrics
- Monitor sync success rates
- Verify backups completed

### Monthly
- Security patches/updates
- Dependencies update check
- Performance optimization review
- User feedback analysis

### Quarterly
- Full security audit
- Load testing
- Disaster recovery drill
- Architecture review

## Scaling Considerations

### Database Scaling
- Monitor Supabase usage
- Increase connection pool if needed
- Optimize slow queries
- Archive old data

### API Scaling
- Monitor OpenAI API usage
- Consider caching responses
- Implement rate limiting
- Load balance if self-hosted

### Storage Scaling
- Monitor storage usage
- Archive old conversations
- Implement data cleanup
- Monitor IndexedDB limits

## Version Management

### Semantic Versioning
```
MAJOR.MINOR.PATCH
1.0.0 = First production release
```

### Release Process
1. Update version in `package.json`
2. Update CHANGELOG.md
3. Tag release: `git tag v1.0.0`
4. Deploy to staging
5. Verify all checks
6. Deploy to production
7. Monitor for 24 hours

## Troubleshooting

### Common Issues

**Service Worker not registering**
- Check HTTPS enabled
- Verify `public/sw.js` exists
- Check browser console for errors
- Clear browser cache and reload

**Offline sync not working**
- Check IndexedDB in DevTools
- Verify sync manager initialized
- Check network tab for failed requests
- Review console for sync errors

**High latency**
- Check network tab performance
- Review API response times
- Check Supabase query performance
- Analyze bundle size

**High error rate**
- Check error logs in Sentry/dashboard
- Review recent code changes
- Check API quota usage
- Verify database connectivity

## Support and Contact

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues repository
- **Email**: support@vitta.com
- **Status Page**: status.vitta.com

## Next Steps

After successful deployment:
1. Set up monitoring and analytics
2. Configure backup and disaster recovery
3. Document any custom configurations
4. Train team on deployment procedures
5. Schedule regular maintenance
