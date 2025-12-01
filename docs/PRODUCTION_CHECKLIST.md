# Production Deployment Checklist

Use this checklist before deploying to production. All items must be verified and checked off.

## 1. Code Quality & Testing (CRITICAL)

### Unit & Integration Tests
- [ ] `npm test` - All tests passing
- [ ] Test coverage > 80% for critical paths
- [ ] No console warnings in test output
- [ ] All mocks properly cleaned up

### E2E Tests
- [ ] `npm test -- __tests__/e2e/` - All E2E tests passing
- [ ] Offline/Online workflows validated
- [ ] Message sync flows working
- [ ] Card operation flows working
- [ ] Retry logic functioning correctly
- [ ] Data consistency verified

### Build Verification
- [ ] `npm run build` - Completes without errors
- [ ] Build output shows optimizations applied
- [ ] No critical webpack warnings
- [ ] .next folder generated successfully
- [ ] Bundle size acceptable (< 500KB gzipped)

### Code Quality
- [ ] `npm run lint` - No critical violations
- [ ] No hardcoded secrets in code
- [ ] All TODOs/FIXMEs addressed
- [ ] Dead code removed
- [ ] Console.logs limited to critical paths only

## 2. Security (CRITICAL)

### Environment Variables
- [ ] `.env.local` configured with all required vars
- [ ] `OPENAI_API_KEY` is server-side only (no NEXT_PUBLIC_ prefix)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set correctly
- [ ] No API keys/secrets in code repository
- [ ] All sensitive values in secure storage (not git)

### Security Headers
- [ ] Content-Security-Policy configured
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: SAMEORIGIN
- [ ] Strict-Transport-Security enabled
- [ ] HTTPS enforced on all URLs
- [ ] SameSite cookie settings correct

### API Security
- [ ] Rate limiting implemented
- [ ] CORS whitelist configured properly
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified (Supabase)
- [ ] XSS protection enabled
- [ ] CSRF tokens if needed

### Database Security
- [ ] Supabase Row-Level Security (RLS) enabled
- [ ] User isolation policies configured
- [ ] Encryption at rest enabled
- [ ] Backups scheduled and tested
- [ ] Data retention policies documented
- [ ] Sensitive data masked in logs

## 3. PWA Features (CRITICAL)

### Service Worker
- [ ] Service worker registered successfully
- [ ] `public/sw.js` exists and valid
- [ ] Service worker cached and updated properly
- [ ] Offline functionality tested manually
- [ ] Cache strategies appropriate
- [ ] Update mechanism working

### Web Manifest
- [ ] `public/manifest.json` created and valid
- [ ] Icons present (192x192, 512x512 minimum)
- [ ] App name and description set
- [ ] Theme color configured
- [ ] Display mode set to 'standalone'
- [ ] Start URL correct
- [ ] Screenshots provided (optional but recommended)

### Offline Functionality
- [ ] Offline detection working
- [ ] IndexedDB persistence tested
- [ ] Sync queue maintained offline
- [ ] UI properly indicates offline state
- [ ] Offline mode clearly communicated to user
- [ ] Data loss prevented during transitions

### Sync & Persistence
- [ ] SyncManager initialized at app start
- [ ] Queue persists across page reloads
- [ ] Exponential backoff retry working
- [ ] FIFO ordering maintained
- [ ] Event emissions triggering UI updates
- [ ] Failed operations handled gracefully

## 4. Features & Functionality

### Authentication
- [ ] Demo mode login working
- [ ] Google OAuth login working
- [ ] User session persisting
- [ ] Logout clearing data properly
- [ ] Profile information displaying correctly
- [ ] Token refresh mechanism working

### Chat Interface
- [ ] Chat interface loading
- [ ] Message sending working
- [ ] Message history displaying
- [ ] Offline messages queueing
- [ ] Online sync completing
- [ ] Deep links navigating correctly
- [ ] No console errors in chat

### Card Management
- [ ] Card listing displaying correctly
- [ ] Add card functionality working
- [ ] Update card functionality working
- [ ] Delete card functionality working
- [ ] Card data calculating correctly
- [ ] APR calculations accurate
- [ ] Balance calculations accurate

### Payment Optimizer
- [ ] Recommendations generating
- [ ] APR-based sorting working
- [ ] Payment distribution calculating
- [ ] Interest savings accurate
- [ ] Data refreshing properly
- [ ] Performance acceptable

### UI/UX
- [ ] OfflineIndicator displaying correctly
- [ ] SyncStatus showing queue information
- [ ] ToastNotifications appearing and dismissing
- [ ] Loading states showing
- [ ] Error states displaying helpful messages
- [ ] Mobile responsive on all screens
- [ ] Touch interactions working

## 5. Performance (CRITICAL)

### Lighthouse Scores
- [ ] Performance score > 85
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] SEO score > 90
- [ ] PWA installable score passing

### Core Web Vitals
- [ ] First Contentful Paint (FCP) < 2.5s
- [ ] Largest Contentful Paint (LCP) < 4s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] First Input Delay (FID) < 100ms
- [ ] Time to Interactive (TTI) < 5s

### Bundle Optimization
- [ ] Code splitting implemented
- [ ] Unused code removed
- [ ] CSS minified and optimized
- [ ] JavaScript minified
- [ ] Images optimized
- [ ] No render-blocking resources
- [ ] Fonts optimized

### API Performance
- [ ] OpenAI API responses < 3s
- [ ] Chat endpoints < 500ms
- [ ] Card endpoints < 200ms
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Caching strategy effective

## 6. Browser & Device Testing

### Desktop Browsers
- [ ] Chrome/Chromium latest - fully working
- [ ] Firefox latest - fully working
- [ ] Safari latest - fully working
- [ ] Edge latest - fully working

### Mobile Browsers
- [ ] iOS Safari latest - fully working
- [ ] Chrome Mobile latest - fully working
- [ ] Samsung Internet - fully working
- [ ] Firefox Mobile - fully working

### Devices Tested
- [ ] iPhone (various sizes) - responsive
- [ ] Android phones (various sizes) - responsive
- [ ] Tablets (iPad, Android) - responsive
- [ ] Desktop resolutions - responsive
- [ ] PWA installable on mobile
- [ ] PWA installable on desktop

### Offline Testing
- [ ] Messages queue while offline
- [ ] Cards load from cache offline
- [ ] Sync completes when online
- [ ] No data loss observed
- [ ] User clearly informed of offline status
- [ ] Retry mechanism working

## 7. Deployment Configuration

### Infrastructure
- [ ] Deployment platform selected (Vercel/Netlify/other)
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] CDN configured
- [ ] Backups configured
- [ ] Auto-scaling configured if needed

### Build Configuration
- [ ] Build command correct
- [ ] Output directory correct
- [ ] Node.js version specified (18.x+)
- [ ] Install command correct
- [ ] Environment variables injected
- [ ] Build caching enabled

### Environment Setup
- [ ] Staging environment available
- [ ] Production environment configured
- [ ] Database backups automated
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Logging centralized

## 8. Monitoring & Analytics (CRITICAL)

### Error Tracking
- [ ] Sentry or similar integrated
- [ ] Error notifications configured
- [ ] Sourcemaps uploaded
- [ ] Alert thresholds set
- [ ] Error rate baseline established
- [ ] Critical errors alert immediately

### Analytics
- [ ] Google Analytics configured
- [ ] User tracking implemented
- [ ] Event tracking implemented
- [ ] Conversion tracking setup
- [ ] Custom dimensions configured
- [ ] Data retention policy set

### Logging
- [ ] Access logs reviewed
- [ ] Error logs monitored
- [ ] Performance logs collected
- [ ] Sync logs tracked
- [ ] Log retention configured
- [ ] Log analysis tools setup

### Monitoring Alerts
- [ ] High error rate alert (> 5%)
- [ ] High latency alert (> 2s)
- [ ] Service worker failure alert
- [ ] Sync failure alert (> 10%)
- [ ] Uptime monitoring configured
- [ ] Alert team communication setup

## 9. Documentation & Runbooks

### Documentation
- [ ] README.md up to date
- [ ] API documentation complete
- [ ] Deployment guide created
- [ ] Troubleshooting guide created
- [ ] Architecture documentation complete
- [ ] Setup instructions clear

### Runbooks
- [ ] Deployment runbook written
- [ ] Rollback procedure documented
- [ ] Incident response procedure
- [ ] Escalation contacts listed
- [ ] Common issues documented
- [ ] Recovery procedures detailed

### Knowledge Transfer
- [ ] Team trained on deployment
- [ ] Monitoring dashboards explained
- [ ] Alert procedures understood
- [ ] Escalation path clear
- [ ] Support procedures documented
- [ ] Contact information current

## 10. Final Verification (PRE-DEPLOYMENT)

### 24 Hours Before Deployment
- [ ] All checklist items reviewed
- [ ] All tests passing
- [ ] Build successful
- [ ] Code review completed
- [ ] Security audit done
- [ ] Performance benchmarks acceptable
- [ ] Team ready and available

### 2 Hours Before Deployment
- [ ] Production environment ready
- [ ] Backups completed
- [ ] Monitoring configured
- [ ] Team on standby
- [ ] Slack/communication channels open
- [ ] Deployment runbook reviewed
- [ ] Rollback plan confirmed

### Deployment Time
- [ ] One person deploying
- [ ] Others monitoring
- [ ] Communication channels active
- [ ] Screenshots/videos recording for QA
- [ ] Logs monitored for errors
- [ ] Deployment progressing normally
- [ ] Post-deployment checks ready

### Immediate Post-Deployment (First 5 min)
- [ ] Application loads
- [ ] No 5xx errors
- [ ] Service worker registered
- [ ] API endpoints responding
- [ ] Database connected
- [ ] No critical errors in logs

### 1 Hour Post-Deployment
- [ ] Full functionality test completed
- [ ] Performance acceptable
- [ ] Error rate < 1%
- [ ] All features working
- [ ] Mobile experience good
- [ ] No user-reported issues
- [ ] Team debriefing scheduled

## Sign-Off

**Prepared By:** _________________ **Date:** ________

**Reviewed By:** _________________ **Date:** ________

**Approved By:** _________________ **Date:** ________

**Deployed By:** _________________ **Date:** ________

## Notes

```
[Space for deployment notes, issues encountered, special configurations, etc.]
```

---

## Quick Command Reference

```bash
# Complete pre-deployment verification
npm test                          # Run all tests
npm test -- __tests__/e2e/       # Run E2E tests
npm run build                     # Build for production
npm run lint                      # Check code quality
npm start                         # Start production server

# Environment verification
echo $OPENAI_API_KEY             # Verify API key set
echo $NEXT_PUBLIC_SUPABASE_URL   # Verify Supabase URL
```

## Abort Criteria

**STOP AND ROLLBACK if:**
- Error rate exceeds 5%
- API response time > 5s
- Service worker fails to register
- Database connectivity lost
- Critical security issue discovered
- Data corruption detected
- Sync failure rate > 20%
- Any critical system down

**Recommended rollback command:**
```bash
git revert <commit_hash>
git push
# Redeploy previous stable version
```
