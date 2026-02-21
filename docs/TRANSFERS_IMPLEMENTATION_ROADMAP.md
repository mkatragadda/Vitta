# International Transfers - Implementation Roadmap

**Start Date**: Feb 14, 2026
**Target Launch**: Mar 28, 2026 (6 weeks)
**Scope**: India (USD/INR) + Rate Monitoring

---

## Week 1-2: Foundation & Database

### Week 1: Database Schema & Core Types

**Tasks:**
- [ ] Create migration file: `supabase/migrations/001_transfer_corridors_and_rates.sql`
  - Tables: `transfer_corridors`, `fx_rates`, `fx_rates_hourly`
  - Indexes and constraints
  - RLS policies (user can only see own data)

- [ ] Create migration file: `supabase/migrations/002_recipients_and_transfers.sql`
  - Tables: `recipients`, `transfer_requests`, `transfer_activity_log`, `chimoney_webhook_logs`
  - Foreign keys and constraints
  - Audit triggers (log all INSERTs/UPDATEs)

- [ ] Create TypeScript types: `types/transfers.ts`
  ```typescript
  export type TransferStatus = 'draft' | 'rate_quoted' | 'rate_locked' | 'monitoring' | ...
  export type TransferType = 'immediate' | 'rate_triggered'
  export interface Transfer { ... }
  export interface Recipient { ... }
  export interface FXRate { ... }
  ```

- [ ] Create constants: `config/transferConfig.ts`
  ```typescript
  export const corridors = {
    'USD_INR': { ... }
  };
  export const RATE_LOCK_DURATION = 300; // seconds
  export const FX_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
  ```

**Deliverable**: Database fully migrated, no data loss if rollback needed

---

### Week 2: Core Service Layer - Part 1

**Tasks:**
- [ ] Create `services/transfers/transferService.ts`
  - [ ] `initiateTransfer(userId, transferData)` - Returns quote
  - [ ] `lockRate(transferId)` - Locks quote for 5 minutes
  - [ ] `validateTransferCompliance(transfer, user)` - AML checks
  - [ ] `createAuditLog(transferId, activityType, details)` - Immutable logging

- [ ] Create `services/transfers/kycService.ts`
  - [ ] `verifyRecipient(userId, recipientData, corridor)` - Verify via Chimoney
  - [ ] `validateUserKYC(userId)` - Check user KYC status
  - [ ] `encryptSensitiveData(data)` - Use AWS KMS/Vault
  - [ ] `decryptSensitiveData(encrypted)` - Decrypt only when needed

- [ ] Create `services/transfers/fxRateService.ts`
  - [ ] `getQuoteRate(corridor, sourceAmount)` - Call Chimoney API
  - [ ] `checkRateToday(corridor)` - Return min/max for today
  - [ ] `checkHistoricalRates(corridor, days)` - For UI display
  - [ ] Caching strategy (1-minute cache for same corridor+amount)

- [ ] Unit tests for all three services (>80% coverage)

**Deliverable**: All service methods tested and working with mock Chimoney API

---

## Week 2-3: Core Service Layer - Part 2 + APIs

### Week 2 (continued): Payment Service

**Tasks:**
- [ ] Create `services/transfers/paymentService.ts`
  - [ ] `initiatePayment(transferId, approvalData)` - Start payment
  - [ ] `pollPaymentStatus(transferId)` - Check Chimoney status
  - [ ] `handleChimoneyWebhook(payload)` - Process webhooks
  - [ ] `verifyWebhookSignature(signature, payload)` - Security

- [ ] Create `services/transfers/providers/chimoney.ts`
  - [ ] `verifyRecipient(data)` - Recipient verification API
  - [ ] `getQuote(amount)` - FX rate quote
  - [ ] `initiatePayment(transferData)` - Payment API
  - [ ] Error handling & retry logic with exponential backoff

- [ ] Unit tests for payment service and provider

**Deliverable**: Payment service ready for integration

---

### Week 3: Backend APIs

**Tasks:**
- [ ] Create API route: `pages/api/transfers/quote.ts`
  - POST /api/transfers/quote
  - Input: { recipientId, sourceAmount, corridor }
  - Output: { quoteId, rate, destinationAmount, fee, rateExpiresAt }

- [ ] Create API route: `pages/api/transfers/lock-rate.ts`
  - POST /api/transfers/lock-rate
  - Input: { quoteId }
  - Output: { lockId, rate, expiresAt }

- [ ] Create API route: `pages/api/transfers/recipients/verify.ts`
  - POST /api/transfers/recipients/verify
  - Verify new recipient before adding to list

- [ ] Create API route: `pages/api/transfers/recipients.ts`
  - GET /api/transfers/recipients - List user's recipients
  - DELETE /api/transfers/recipients/:id - Remove recipient

- [ ] Create API route: `pages/api/transfers/immediate.ts`
  - POST /api/transfers/immediate
  - Initiate immediate payment transfer

- [ ] Create API route: `pages/api/transfers/rate-triggered.ts`
  - POST /api/transfers/rate-triggered
  - Set up rate monitoring

- [ ] Create API route: `pages/api/transfers/rates/today/:corridor.ts`
  - GET /api/transfers/rates/today/:corridor
  - Return current, min, max rates

- [ ] Create API route: `pages/api/webhooks/chimoney.ts`
  - POST /api/webhooks/chimoney
  - Handle Chimoney webhook events

- [ ] API documentation (Postman collection or OpenAPI spec)

**Deliverable**: All APIs tested with mock data, ready for frontend integration

---

## Week 3-4: Frontend - Part 1

### Week 3: Components & Dialogs

**Tasks:**
- [ ] Create `components/transfers/TransferDialog.tsx`
  - Main dialog orchestrator
  - State machine for dialog flow
  - Props: { isOpen, onClose, recipient?, transferType? }

- [ ] Create `components/transfers/RecipientSelector.tsx`
  - List pre-saved recipients
  - "Add new recipient" button
  - Verification status badges

- [ ] Create `components/transfers/AddRecipientForm.tsx`
  - Form for new recipient
  - Input: name, phone, email, payment method
  - Shows verification status (pending/verified/failed)

- [ ] Create `components/transfers/ImmediateTransferFlow.tsx`
  - Amount input with validation
  - FX rate display (live from API)
  - Fee breakdown
  - Confirm button → triggers payment

- [ ] Create `components/transfers/RateTriggeredFlow.tsx`
  - Amount input
  - Target rate input
  - Historical rate chart (24h min/max)
  - "Start monitoring" button

- [ ] Create `components/transfers/ComplianceDisclosure.tsx`
  - Purpose of transfer dropdown
  - Source of funds dropdown
  - Relationship to recipient input
  - Checkbox: "I confirm above details"

- [ ] Styling with Tailwind (mobile-responsive)
  - Desktop: 400px wide centered dialog
  - Mobile: Full-screen dialog with scroll
  - Dark mode support

**Deliverable**: All components build and render with mock data

---

### Week 4: Activity Sidebar & Notifications

**Tasks:**
- [ ] Create `components/transfers/TransferActivityPanel.tsx`
  - Timeline of user's transfers
  - Status badge (color-coded)
  - Amount, recipient, timestamp
  - Filter buttons (All, Monitoring, Pending, Completed)

- [ ] Create `components/transfers/ActivityItem.tsx`
  - Single transfer activity display
  - Action buttons (Approve, Deny, Cancel based on status)
  - Collapsible details

- [ ] Create `components/transfers/NotificationCenter.tsx`
  - Toast notifications (rate met, payment complete)
  - In-app notification bell with badge count
  - Sound alert for important events

- [ ] Implement real-time updates (Supabase realtime subscriptions)
  ```typescript
  supabase
    .from('transfer_activity_log')
    .on('INSERT', payload => updateActivitySidebar(payload))
    .subscribe();
  ```

- [ ] Add transfer quick actions to chat interface
  - Chat message: "Send money to India"
  - Quick action button: Opens TransferDialog

**Deliverable**: Activity sidebar fully functional with real-time updates

---

## Week 4-5: Integration & Testing

### Week 4: Integration Testing

**Tasks:**
- [ ] End-to-end test: Immediate transfer flow
  1. User selects recipient
  2. Enters amount
  3. Receives quote (mock API)
  4. Locks rate
  5. Approves payment
  6. Receives confirmation

- [ ] End-to-end test: Rate-triggered flow
  1. User selects recipient
  2. Sets target rate
  3. Starts monitoring
  4. Cron job checks rate (simulated)
  5. Rate met → notification sent
  6. User approves → payment initiated

- [ ] Integration test: Webhook processing
  - Simulate Chimoney webhook
  - Verify payment status updated
  - Verify notification sent to user

- [ ] Integration test: Recipient verification
  - New recipient → verify request sent
  - Mock success response
  - Verify recipient saved as 'verified'
  - Mock failure response
  - Verify error shown to user

- [ ] Load test: FX rate checking
  - Simulate 1000 transfers with monitoring
  - Cron job runs rate check
  - Verify all transfers checked in <5 seconds

**Deliverable**: 95%+ pass rate on integration tests

---

### Week 5: Bug Fixes & Polish

**Tasks:**
- [ ] User feedback from internal testing
  - [ ] Fix UX issues (buttons not clear, flows confusing)
  - [ ] Fix validation errors (show helpful messages)
  - [ ] Fix edge cases (rate expired, recipient failed, etc.)

- [ ] Performance optimization
  - [ ] Memoize React components (prevent re-renders)
  - [ ] Lazy load transfer dialog
  - [ ] Cache FX rates locally for 1 minute

- [ ] Security audit
  - [ ] Verify no sensitive data in logs
  - [ ] Verify API responses don't leak PII
  - [ ] Test with various malicious inputs
  - [ ] Verify encryption working correctly

- [ ] Compliance review
  - [ ] Verify audit logs capture all actions
  - [ ] Test KYC validation
  - [ ] Test AML checks
  - [ ] Document compliance features

- [ ] Documentation
  - [ ] Create user guide: "How to send money to India"
  - [ ] Create admin guide: "Monitoring transfers"
  - [ ] Create runbook: "Handling transfer failures"

**Deliverable**: Production-ready code with <1% error rate in staging

---

## Week 5-6: Deployment & Monitoring

### Week 5: Staging Deployment

**Tasks:**
- [ ] Deploy to staging environment
  - [ ] Database migrations (test rollback procedure)
  - [ ] Backend APIs
  - [ ] Frontend components
  - [ ] Cron jobs (rate check, KYC refresh)

- [ ] Staging environment setup
  - [ ] Create 10 test users
  - [ ] Pre-populate recipients
  - [ ] Configure Chimoney sandbox credentials
  - [ ] Set up webhook tunneling (ngrok)

- [ ] Acceptance testing by product team
  - [ ] Test immediate transfer end-to-end
  - [ ] Test rate-triggered transfer end-to-end
  - [ ] Verify activity sidebar updates
  - [ ] Check notification delivery

- [ ] Performance testing in staging
  - [ ] Measure API latency (<200ms target)
  - [ ] Measure FX rate check duration (<5s for 1000 transfers)
  - [ ] Monitor error rates (<0.5% target)

**Deliverable**: Staging deployment successful, all features working

---

### Week 6: Production Rollout

**Tasks:**
- [ ] Feature flag setup
  ```javascript
  // config/featureFlags.ts
  export const featureFlags = {
    international_transfers_india: {
      enabled: true,
      rolloutPercentage: 10, // 10% of users initially
      whitelist: [...betaUserIds]
    }
  };
  ```

- [ ] Production database migration
  - [ ] Run migrations on prod
  - [ ] Verify data integrity
  - [ ] Backup before migration
  - [ ] Have rollback procedure ready

- [ ] Deploy to production
  - [ ] Backend APIs
  - [ ] Frontend components
  - [ ] Cron jobs (with monitoring)

- [ ] Gradual rollout
  - [ ] Day 1: 10% of users (50 users)
  - [ ] Day 2: 25% of users (250 users)
  - [ ] Day 3: 50% of users (500 users)
  - [ ] Day 4+: 100% of users
  - [ ] Monitor errors at each stage

- [ ] Production monitoring setup
  - [ ] Dashboard: Transfer volume, success rate, avg fee
  - [ ] Alerts: >1% error rate, >300ms API latency
  - [ ] Logs: All transfers audited, errors investigated
  - [ ] On-call support for critical issues

- [ ] Support team training
  - [ ] How to handle failed transfers
  - [ ] How to re-verify recipient
  - [ ] How to refund user (if needed)

**Deliverable**: Feature live to 100% of users, monitored & stable

---

## Parallel Work (Can Start Earlier)

### Chimoney API Integration
- [ ] Set up Chimoney sandbox account
- [ ] Create API client wrapper: `services/transfers/providers/chimoney.ts`
- [ ] Test all API endpoints in isolation
- [ ] Create mock provider for testing: `services/transfers/providers/mock.ts`

### Chat Interface Enhancement
- [ ] Add "Send money to India" quick action
- [ ] Add chat command: `/transfer recipient:name amount:100`
- [ ] Update chat prompts to suggest transfers

### Analytics & Monitoring
- [ ] Set up transfer metrics in analytics
- [ ] Create Grafana dashboard for transfers
- [ ] Alert configuration in Datadog/Sentry

---

## Risk Mitigation

### High Risk: Chimoney API Failures
- **Mitigation**: Implement robust error handling, retry logic, webhook fallback
- **Testing**: Test with simulated API failures in staging
- **Rollback**: Feature flag to disable transfers if API down

### High Risk: Rate Lock Expiry During Approval
- **Mitigation**: Check rate lock validity before payment, notify if expired
- **Testing**: Test with manual clock manipulation in staging
- **UX**: Clear message: "Rate expired, please re-quote"

### Medium Risk: Webhook Delivery Failures
- **Mitigation**: Cron job to poll Chimoney status if webhook not received
- **Testing**: Simulate missing webhooks, verify polling works
- **Monitoring**: Alert if >5% of payments not confirmed via webhook

### Medium Risk: Double Payment
- **Mitigation**: All Chimoney API calls use idempotency keys
- **Testing**: Retry same payment 3 times, verify only charged once
- **Database**: Unique constraint on transfer_id + chimoney_transaction_id

### Low Risk: Recipient Account Deleted
- **Mitigation**: Error handling when recipient not found in Chimoney
- **UX**: "Recipient account no longer exists, please re-verify"

---

## Success Metrics

### Launch Day
- [ ] Zero critical errors
- [ ] <0.1% API error rate
- [ ] <200ms average API latency
- [ ] 100% webhook delivery success

### Week 1
- [ ] >100 successful transfers
- [ ] >95% user satisfaction rating
- [ ] <1 support ticket per 100 transfers

### Month 1
- [ ] $50,000+ in transfer volume
- [ ] >90% repeat user rate
- [ ] $0 in failed refunds

---

## Budget & Resources

### Engineering
- 1 Full-stack engineer (6 weeks)
- 0.5 QA engineer (3 weeks, starting week 3)
- 0.5 Product manager (6 weeks, planning/review)

### Infrastructure
- Staging environment: $500/month
- Prod environment: $200/month (included in existing)
- Monitoring/alerting: $100/month

### Third-party
- Chimoney API: $0.50-$5.00 per transaction (negotiated)
- Encryption (AWS KMS): $1/month
- SMS notifications: $0.01 per SMS (estimate $500/month for 50k transfers)

**Total Estimated Cost**: $12,000-$15,000 for 6-week development

---

## Sign-Off

**Product Manager**: _________________ Date: _______
**Engineering Lead**: _________________ Date: _______
**Compliance Officer**: _________________ Date: _______
