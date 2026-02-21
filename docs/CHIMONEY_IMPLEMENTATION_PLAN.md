# Chimoney Integration - Implementation Plan
**Level**: Senior Staff Engineer + Remittance Specialist
**Scope**: USD to INR transfers via UPI & Bank Transfer
**Duration**: 6-8 weeks (with parallel work)
**Risk Level**: MEDIUM (payment processing is critical)

---

## Executive Summary

This plan sequences Chimoney integration in dependency order, with compliance requirements called out at each step. Each deliverable is testable and can be deployed independently.

### Key Principles
1. **Fail-safe defaults** - Never expose user to incomplete flows
2. **Compliance-first** - Every transfer is auditable
3. **Idempotency everywhere** - No double payments
4. **Observable** - All operations logged and monitorable
5. **Reversible** - Feature flags allow rollback

---

## Part A: Foundation & Prerequisites (Week 1)

### Step A1: Chimoney Account & API Keys Setup

**Deliverable**: Production and sandbox API credentials configured

**Dependencies**: None

**Remittance Requirements**:
- ✅ Verify Chimoney has valid NPCI membership
- ✅ Confirm UPI settlement is direct (not via intermediary)
- ✅ Verify PCI-DSS compliance certification
- ✅ Check KYC/AML capabilities

**Tasks**:
1. [ ] Sign up for Chimoney production account
   - Provide: Company details, banking info, compliance docs
   - Timeline: 3-5 business days

2. [ ] Get sandbox API keys for testing
   - API Key format: `live_xxx` (prod) vs `sandbox_xxx` (test)
   - API Secret: For webhook HMAC-SHA256 signatures

3. [ ] Configure webhook receiving endpoint
   - Endpoint: `https://yourapp.com/api/webhooks/chimoney`
   - Webhook secret: For signature verification
   - Verify webhook signature algorithm: HMAC-SHA256

4. [ ] Document all credentials in secure vault
   ```bash
   # Store in AWS Secrets Manager / HashiCorp Vault
   CHIMONEY_API_KEY_LIVE
   CHIMONEY_API_SECRET_LIVE
   CHIMONEY_API_KEY_SANDBOX
   CHIMONEY_API_SECRET_SANDBOX
   ```

5. [ ] Test connectivity
   ```bash
   curl -H "Authorization: Bearer ${CHIMONEY_API_KEY_SANDBOX}" \
        https://api.sandbox.chimoney.io/v0.2/health
   # Expected: { "status": "healthy" }
   ```

**Output**:
- ✅ API credentials secured in vault
- ✅ Webhook endpoint registered
- ✅ Connectivity verified
- ✅ Documentation of API rate limits (typically 100 req/min)

**Risks**:
- ⚠️ Credential leak → Immediate rotation required
- ⚠️ Webhook endpoint not reachable → Test with ngrok locally

---

### Step A2: Database Schema - Transfer Tables

**Deliverable**: Supabase schema with proper constraints and RLS policies

**Dependencies**: A1 (optional - can work in parallel)

**Remittance Requirements**:
- ✅ Immutable audit logs (transfer_activity_log)
- ✅ Encrypted sensitive fields (UPI, bank accounts)
- ✅ Transaction timestamp with millisecond precision
- ✅ RLS policies to prevent user seeing other users' transfers

**Tasks**:
1. [ ] Create `transfer_corridors` table
   ```sql
   CREATE TABLE transfer_corridors (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     source_country VARCHAR(3) NOT NULL,
     destination_country VARCHAR(3) NOT NULL,
     currency_pair VARCHAR(10) NOT NULL,
     provider VARCHAR(50) DEFAULT 'chimoney',
     min_amount DECIMAL(10,2),
     max_amount DECIMAL(10,2),
     fee_structure JSONB,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT now(),
     updated_at TIMESTAMP DEFAULT now(),
     UNIQUE(source_country, destination_country, provider)
   );
   CREATE INDEX idx_corridors_active ON transfer_corridors(is_active, source_country, destination_country);
   ```

2. [ ] Create `recipients` table (with encryption)
   ```sql
   CREATE TABLE recipients (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     corridor_id UUID NOT NULL REFERENCES transfer_corridors(id),
     recipient_name VARCHAR(255) NOT NULL,
     recipient_phone VARCHAR(20),
     recipient_email VARCHAR(255),
     payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('upi', 'bank_account')),

     -- Encrypted: NEVER query these directly
     recipient_upi_encrypted VARCHAR(500),
     recipient_bank_account_encrypted VARCHAR(500),
     recipient_bank_code VARCHAR(20),

     verification_status VARCHAR(50) DEFAULT 'pending',
     chimoney_recipient_id VARCHAR(255) UNIQUE,
     verified_at TIMESTAMP,
     verified_by_system VARCHAR(50),
     verification_expires_at TIMESTAMP,

     created_at TIMESTAMP DEFAULT now(),
     updated_at TIMESTAMP DEFAULT now()
   );

   CREATE INDEX idx_recipients_user_status ON recipients(user_id, verification_status);
   CREATE INDEX idx_recipients_chimoney_id ON recipients(chimoney_recipient_id);

   -- RLS: Users can only see their own recipients
   ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
   CREATE POLICY recipients_user_access ON recipients
     USING (user_id = auth.uid());
   ```

3. [ ] Create `transfer_requests` table (state machine)
   ```sql
   CREATE TABLE transfer_requests (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id),
     recipient_id UUID NOT NULL REFERENCES recipients(id),
     corridor_id UUID NOT NULL REFERENCES transfer_corridors(id),

     transfer_type VARCHAR(50) NOT NULL CHECK (transfer_type IN ('immediate', 'rate_triggered')),
     status VARCHAR(50) NOT NULL DEFAULT 'draft',

     source_amount DECIMAL(15,2) NOT NULL,
     destination_amount DECIMAL(15,2),
     fee_amount DECIMAL(10,2),

     quoted_rate DECIMAL(15,6),
     quoted_rate_id UUID,
     target_rate DECIMAL(15,6),
     triggered_rate DECIMAL(15,6),

     purpose_of_transfer VARCHAR(255),
     source_of_funds VARCHAR(255),
     relationship_to_recipient VARCHAR(100),

     chimoney_transaction_id VARCHAR(255) UNIQUE,
     payment_status VARCHAR(50),
     payment_method_used VARCHAR(50),

     created_at TIMESTAMP DEFAULT now(),
     rate_locked_at TIMESTAMP,
     rate_lock_expires_at TIMESTAMP,
     monitoring_started_at TIMESTAMP,
     rate_met_at TIMESTAMP,
     completed_at TIMESTAMP,

     error_message TEXT,
     retry_count INT DEFAULT 0
   );

   CREATE INDEX idx_transfers_user ON transfer_requests(user_id);
   CREATE INDEX idx_transfers_status ON transfer_requests(status);
   CREATE INDEX idx_transfers_monitoring ON transfer_requests(status, monitoring_started_at)
     WHERE status = 'monitoring';
   CREATE INDEX idx_transfers_chimoney_tx ON transfer_requests(chimoney_transaction_id);

   ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;
   CREATE POLICY transfers_user_access ON transfer_requests
     USING (user_id = auth.uid());
   ```

4. [ ] Create `transfer_activity_log` table (immutable audit trail)
   ```sql
   CREATE TABLE transfer_activity_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     transfer_id UUID NOT NULL REFERENCES transfer_requests(id),
     user_id UUID NOT NULL,
     activity_type VARCHAR(100) NOT NULL,
     details JSONB,
     ip_address INET,
     user_agent VARCHAR(500),
     triggered_by VARCHAR(50) NOT NULL DEFAULT 'user_action',
     created_at TIMESTAMP DEFAULT now()
   );

   -- Immutable: Never allow updates/deletes
   CREATE POLICY activity_log_immutable ON transfer_activity_log
     AS (SELECT) USING (true);

   CREATE INDEX idx_activity_transfer ON transfer_activity_log(transfer_id);
   CREATE INDEX idx_activity_type_date ON transfer_activity_log(activity_type, created_at DESC);
   ```

5. [ ] Create `fx_rates` table
   ```sql
   CREATE TABLE fx_rates (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     corridor_id UUID NOT NULL REFERENCES transfer_corridors(id),
     rate DECIMAL(15,6),
     mid_rate DECIMAL(15,6),
     buy_rate DECIMAL(15,6),
     source_amount DECIMAL(15,2),
     destination_amount DECIMAL(15,2),
     fee_amount DECIMAL(10,2),
     rate_validity_seconds INT DEFAULT 300,
     source VARCHAR(50) DEFAULT 'chimoney',
     recorded_at TIMESTAMP DEFAULT now(),
     UNIQUE(corridor_id, recorded_at)
   );

   CREATE INDEX idx_rates_corridor_time ON fx_rates(corridor_id, recorded_at DESC);
   ```

6. [ ] Create `chimoney_webhook_logs` table (for debugging)
   ```sql
   CREATE TABLE chimoney_webhook_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     webhook_id VARCHAR(255),
     transfer_id UUID REFERENCES transfer_requests(id),
     event_type VARCHAR(100),
     payload JSONB,
     processed BOOLEAN DEFAULT false,
     error TEXT,
     received_at TIMESTAMP DEFAULT now(),
     processed_at TIMESTAMP,
     UNIQUE(webhook_id, received_at)
   );

   CREATE INDEX idx_webhooks_transfer ON chimoney_webhook_logs(transfer_id);
   CREATE INDEX idx_webhooks_processed ON chimoney_webhook_logs(processed);
   ```

7. [ ] Create `supported_banks` table (cached from Chimoney)
   ```sql
   CREATE TABLE supported_banks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     country_code VARCHAR(3) NOT NULL,
     bank_code VARCHAR(20) NOT NULL,
     bank_name VARCHAR(255) NOT NULL,
     short_name VARCHAR(50),
     supports_upi BOOLEAN,
     supports_bank_transfer BOOLEAN,
     logo_url TEXT,
     fetched_at TIMESTAMP DEFAULT now(),
     UNIQUE(country_code, bank_code)
   );

   CREATE INDEX idx_banks_country ON supported_banks(country_code);
   ```

8. [ ] Run migrations
   ```bash
   supabase db push  # Apply all migrations
   ```

**Output**:
- ✅ 7 tables created with indexes
- ✅ RLS policies enforced
- ✅ Audit trail immutable
- ✅ Schema documented

**Risks**:
- ⚠️ Missing indexes → Slow queries under load
- ⚠️ Weak RLS → Users see other users' transfers
- ⚠️ No foreign key constraints → Data integrity issues

---

### Step A3: Environment Configuration & Secrets

**Deliverable**: All config loaded securely, no secrets in code

**Dependencies**: A1 (API keys available)

**Tasks**:
1. [ ] Create `.env.local` template
   ```bash
   # Chimoney API
   CHIMONEY_API_KEY=
   CHIMONEY_API_SECRET=
   CHIMONEY_BASE_URL=https://api.chimoney.io/v0.2

   # Encryption
   ENCRYPTION_KEY=  # 32-byte base64 encoded

   # Transfer limits (by corridor)
   TRANSFER_MAX_DAILY_PER_USER=5
   TRANSFER_MAX_AMOUNT=5000
   TRANSFER_MAX_DAILY_AGGREGATE=10000

   # Rate lock
   RATE_LOCK_DURATION_SECONDS=300

   # Cron
   CRON_SECRET=
   ```

2. [ ] Create config module
   ```typescript
   // config/transfers.ts
   export const transferConfig = {
     chimoney: {
       apiKey: process.env.CHIMONEY_API_KEY,
       apiSecret: process.env.CHIMONEY_API_SECRET,
       baseUrl: process.env.CHIMONEY_BASE_URL,
       timeout: 30000,  // 30 seconds
       retryAttempts: 3,
     },
     limits: {
       maxDailyPerUser: parseInt(process.env.TRANSFER_MAX_DAILY_PER_USER) || 5,
       maxAmount: parseFloat(process.env.TRANSFER_MAX_AMOUNT) || 5000,
       maxDailyAggregate: parseFloat(process.env.TRANSFER_MAX_DAILY_AGGREGATE) || 10000,
     },
     rateLock: {
       durationSeconds: parseInt(process.env.RATE_LOCK_DURATION_SECONDS) || 300,
     }
   };
   ```

3. [ ] Store secrets in production vault
   ```bash
   # AWS Secrets Manager
   aws secretsmanager create-secret \
     --name chimoney/api-key-prod \
     --secret-string ${CHIMONEY_API_KEY}
   ```

**Output**:
- ✅ Config module created
- ✅ No hardcoded secrets
- ✅ Environment variables documented

---

## Part B: Core Service Layer (Week 2-3)

### Step B1: Encryption Service

**Deliverable**: Secure encryption/decryption for sensitive fields

**Dependencies**: A3 (config available)

**Remittance Requirements**:
- ✅ AES-256 encryption for UPI/bank accounts
- ✅ Encryption key rotation support
- ✅ No plaintext sensitive data in logs
- ✅ Only decrypt during API calls to Chimoney

**Tasks**:
1. [ ] Create encryption service
   ```typescript
   // services/encryption/encryptionService.ts
   import crypto from 'crypto';

   export class EncryptionService {
     private key: Buffer;
     private algorithm = 'aes-256-gcm';

     constructor(keyBase64: string) {
       this.key = Buffer.from(keyBase64, 'base64');
       if (this.key.length !== 32) {
         throw new Error('Encryption key must be 32 bytes (256 bits)');
       }
     }

     encrypt(plaintext: string): string {
       const iv = crypto.randomBytes(16);
       const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

       let encrypted = cipher.update(plaintext, 'utf8', 'hex');
       encrypted += cipher.final('hex');

       const authTag = cipher.getAuthTag();

       // Format: iv:authTag:encrypted
       return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
     }

     decrypt(ciphertext: string): string {
       const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

       const iv = Buffer.from(ivHex, 'hex');
       const authTag = Buffer.from(authTagHex, 'hex');

       const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
       decipher.setAuthTag(authTag);

       let decrypted = decipher.update(encrypted, 'hex', 'utf8');
       decrypted += decipher.final('utf8');

       return decrypted;
     }
   }

   // Initialize
   const encryptionService = new EncryptionService(
     process.env.ENCRYPTION_KEY
   );
   export default encryptionService;
   ```

2. [ ] Test encryption
   ```typescript
   // __tests__/services/encryptionService.test.ts
   describe('EncryptionService', () => {
     it('encrypts and decrypts correctly', () => {
       const plaintext = '9876543210';
       const encrypted = encryptionService.encrypt(plaintext);
       const decrypted = encryptionService.decrypt(encrypted);
       expect(decrypted).toBe(plaintext);
     });

     it('produces different ciphertext for same input (random IV)', () => {
       const plaintext = '9876543210';
       const encrypted1 = encryptionService.encrypt(plaintext);
       const encrypted2 = encryptionService.encrypt(plaintext);
       expect(encrypted1).not.toBe(encrypted2);
     });

     it('fails on corrupted ciphertext', () => {
       const corrupted = 'invalid:invalid:invalid';
       expect(() => encryptionService.decrypt(corrupted)).toThrow();
     });
   });
   ```

**Output**:
- ✅ Encryption service with GCM mode (authenticated)
- ✅ Random IV for each encryption
- ✅ Tests passing

---

### Step B2: Chimoney Provider Service

**Deliverable**: Clean abstraction layer for Chimoney API

**Dependencies**: B1 (encryption available)

**Remittance Requirements**:
- ✅ Idempotency keys for all payment operations
- ✅ Proper error mapping (Chimoney → internal codes)
- ✅ Retry logic with exponential backoff (transient errors only)
- ✅ Request/response logging (no sensitive data)
- ✅ Timeout handling (30 seconds for all calls)

**Tasks**:
1. [ ] Create provider interface
   ```typescript
   // services/transfers/providers/IPaymentProvider.ts
   export interface IPaymentProvider {
     // Recipient verification
     verifyRecipient(data: VerifyRecipientRequest): Promise<RecipientVerifyResponse>;

     // FX rates
     getQuote(params: QuoteRequest): Promise<FXQuote>;

     // Payment
     initiatePayment(data: PaymentInitiationRequest): Promise<PaymentResponse>;
     getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;

     // Webhooks
     verifyWebhookSignature(payload: string, signature: string): boolean;
   }
   ```

2. [ ] Implement Chimoney provider
   ```typescript
   // services/transfers/providers/ChimoneyProvider.ts
   export class ChimoneyProvider implements IPaymentProvider {
     private apiKey: string;
     private apiSecret: string;
     private baseUrl: string;
     private encryptionService: EncryptionService;

     async verifyRecipient(
       data: VerifyRecipientRequest
     ): Promise<RecipientVerifyResponse> {
       const idempotencyKey = generateIdempotencyKey(data.recipientPhone, 'verify');

       // Decrypt sensitive data before sending to Chimoney
       let requestBody: any = {
         countryCode: data.countryCode,
       };

       if (data.paymentMethod === 'upi') {
         requestBody.recipientPhone = data.recipientPhone;
       } else {
         requestBody.bankCode = data.bankCode;
         requestBody.accountNumber = this.encryptionService.decrypt(
           data.accountNumberEncrypted
         );
       }

       return this.callChimoneyAPI(
         'POST',
         '/recipient/verify',
         requestBody,
         idempotencyKey
       );
     }

     private async callChimoneyAPI(
       method: string,
       endpoint: string,
       body?: any,
       idempotencyKey?: string
     ): Promise<any> {
       const maxRetries = 3;
       let attempt = 0;

       while (attempt < maxRetries) {
         try {
           const controller = new AbortController();
           const timeout = setTimeout(() => controller.abort(), 30000);

           const response = await fetch(`${this.baseUrl}${endpoint}`, {
             method,
             headers: {
               'Authorization': `Bearer ${this.apiKey}`,
               'Content-Type': 'application/json',
               'X-Idempotency-Key': idempotencyKey || generateIdempotencyKey('', method),
             },
             body: body ? JSON.stringify(body) : undefined,
             signal: controller.signal,
           });

           clearTimeout(timeout);

           // Handle conflicts (idempotency - already processed)
           if (response.status === 409) {
             console.log('[Chimoney] Request already processed (409 Conflict)');
             const data = await response.json();
             return data.data;
           }

           // Transient errors: retry
           if (response.status >= 500 || response.status === 429) {
             attempt++;
             if (attempt < maxRetries) {
               const delay = Math.pow(2, attempt) * 1000;
               console.log(`[Chimoney] Retry ${attempt}/${maxRetries} after ${delay}ms`);
               await sleep(delay);
               continue;
             }
           }

           const result = await response.json();
           if (!result.success) {
             throw new ChimoneyError(result.error, result.message);
           }

           return result.data;
         } catch (error) {
           if (error instanceof ChimoneyError && !error.isRetryable) {
             throw error;
           }
           attempt++;
           if (attempt >= maxRetries) throw error;
         }
       }
     }
   }
   ```

3. [ ] Custom error class
   ```typescript
   // services/transfers/providers/ChimoneyError.ts
   export class ChimoneyError extends Error {
     code: string;
     isRetryable: boolean;

     constructor(code: string, message: string) {
       super(message);
       this.code = code;
       this.name = 'ChimoneyError';

       // Determine if error is retryable
       const nonRetryableCodes = [
         'INVALID_PHONE_FORMAT',
         'UPI_NOT_ACTIVATED',
         'INVALID_ACCOUNT',
         'RATE_EXPIRED',
       ];

       this.isRetryable = !nonRetryableCodes.includes(code);
     }
   }
   ```

**Output**:
- ✅ Provider interface defined
- ✅ Chimoney implementation with retry logic
- ✅ Idempotency keys on all operations
- ✅ Error classification (retryable vs non-retryable)

---

### Step B3: Transfer Service (Orchestrator)

**Deliverable**: Business logic for transfer workflows

**Dependencies**: B1, B2 (encryption, provider available)

**Remittance Requirements**:
- ✅ State machine validation (only valid transitions)
- ✅ Immutable audit log for every action
- ✅ AML/KYC checks before payment
- ✅ Rate lock validity checking (5-minute window)
- ✅ Recipient verification expiry (7-day re-verify)

**Tasks**:
1. [ ] Define state machine
   ```typescript
   // services/transfers/stateMachine.ts
   export type TransferStatus =
     | 'draft'                  // Just created
     | 'rate_quoted'            // Quote received from Chimoney
     | 'rate_locked'            // User locked in the rate (5 min window)
     | 'monitoring'             // Waiting for target FX rate
     | 'rate_met'               // Target rate reached, awaiting user approval
     | 'pending_approval'       // User approved, awaiting payment
     | 'payment_initiated'      // Payment sent to Chimoney
     | 'payment_processing'     // Payment in settlement
     | 'completed'              // Payment settled successfully
     | 'failed'                 // Payment failed
     | 'cancelled';             // User cancelled

   // Valid transitions
   const validTransitions: Record<TransferStatus, TransferStatus[]> = {
     'draft': ['rate_quoted'],
     'rate_quoted': ['rate_locked', 'cancelled'],
     'rate_locked': ['monitoring', 'pending_approval', 'cancelled'],
     'monitoring': ['rate_met', 'cancelled'],
     'rate_met': ['pending_approval', 'cancelled'],
     'pending_approval': ['payment_initiated', 'cancelled'],
     'payment_initiated': ['payment_processing', 'failed'],
     'payment_processing': ['completed', 'failed'],
     'completed': [],
     'failed': ['draft'],  // Allows retry
     'cancelled': []
   };

   export const isValidTransition = (
     from: TransferStatus,
     to: TransferStatus
   ): boolean => {
     return validTransitions[from]?.includes(to) ?? false;
   };
   ```

2. [ ] Create transfer service
   ```typescript
   // services/transfers/transferService.ts
   export class TransferService {
     private provider: IPaymentProvider;
     private encryptionService: EncryptionService;

     async initiateTransfer(
       userId: string,
       recipientId: string,
       sourceAmount: number,
       transferType: 'immediate' | 'rate_triggered'
     ): Promise<Transfer> {
       // 1. Validate user KYC
       const kyc = await this.validateUserKYC(userId);
       if (!kyc.isValid) {
         throw new Error(`KYC failed: ${kyc.reason}`);
       }

       // 2. Get recipient details
       const recipient = await db.recipients.findUnique(recipientId);
       if (!recipient || recipient.verification_status !== 'verified') {
         throw new Error('Recipient not verified');
       }

       // 3. Check recipient verification not expired
       if (new Date() > recipient.verification_expires_at) {
         throw new Error('Recipient verification expired. Re-verify before transfer.');
       }

       // 4. Get FX quote
       const quote = await this.provider.getQuote({
         corridor: recipient.corridor_id,
         sourceAmount,
       });

       // 5. Create transfer record
       const transfer = await db.transfer_requests.create({
         user_id: userId,
         recipient_id: recipientId,
         corridor_id: recipient.corridor_id,
         transfer_type: transferType,
         source_amount: sourceAmount,
         destination_amount: quote.destinationAmount,
         fee_amount: quote.fee,
         quoted_rate: quote.rate,
         quoted_rate_id: quote.id,
         status: 'rate_quoted',
         created_at: new Date(),
       });

       // 6. Log activity
       await this.createActivityLog(transfer.id, 'rate_quoted', {
         rate: quote.rate,
         destinationAmount: quote.destinationAmount,
       });

       return transfer;
     }

     async lockRate(transferId: string): Promise<Transfer> {
       const transfer = await db.transfer_requests.findUnique(transferId);

       if (!isValidTransition(transfer.status, 'rate_locked')) {
         throw new Error(`Cannot lock rate from status: ${transfer.status}`);
       }

       // Update status and set expiry
       const updated = await db.transfer_requests.update(transferId, {
         status: 'rate_locked',
         rate_locked_at: new Date(),
         rate_lock_expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
       });

       await this.createActivityLog(transferId, 'rate_locked', {
         expiresAt: updated.rate_lock_expires_at,
       });

       return updated;
     }

     async approveTransfer(
       transferId: string,
       complianceData: {
         purposeOfTransfer: string;
         sourceOfFunds: string;
         relationshipToRecipient: string;
       }
     ): Promise<Transfer> {
       const transfer = await db.transfer_requests.findUnique(transferId);

       // 1. Verify rate lock still valid
       if (new Date() > transfer.rate_lock_expires_at) {
         throw new Error('Rate lock expired. Please get a new quote.');
       }

       // 2. Verify transfer status
       if (!isValidTransition(transfer.status, 'pending_approval')) {
         throw new Error(`Cannot approve from status: ${transfer.status}`);
       }

       // 3. Update compliance fields
       await db.transfer_requests.update(transferId, {
         status: 'pending_approval',
         purpose_of_transfer: complianceData.purposeOfTransfer,
         source_of_funds: complianceData.sourceOfFunds,
         relationship_to_recipient: complianceData.relationshipToRecipient,
       });

       await this.createActivityLog(transferId, 'user_approved', complianceData);

       return db.transfer_requests.findUnique(transferId);
     }

     private async createActivityLog(
       transferId: string,
       activityType: string,
       details: any
     ): Promise<void> {
       await db.transfer_activity_log.create({
         transfer_id: transferId,
         activity_type: activityType,
         details,
         created_at: new Date(),
       });
     }

     private async validateUserKYC(userId: string): Promise<{ isValid: boolean; reason?: string }> {
       const user = await db.users.findUnique(userId);

       if (!user) {
         return { isValid: false, reason: 'User not found' };
       }

       // Check KYC status (from Google OAuth)
       if (user.kyc_status !== 'verified') {
         return { isValid: false, reason: 'KYC not verified' };
       }

       // Check KYC age (refresh annually)
       const kycAge = new Date().getTime() - new Date(user.kyc_verified_at).getTime();
       if (kycAge > 365 * 24 * 60 * 60 * 1000) {
         return { isValid: false, reason: 'KYC expired. Please re-verify.' };
       }

       return { isValid: true };
     }
   }
   ```

3. [ ] Unit tests
   ```typescript
   // __tests__/services/transferService.test.ts
   describe('TransferService', () => {
     it('creates transfer with rate quote', async () => {
       const transfer = await transferService.initiateTransfer(
         userId,
         recipientId,
         100,
         'immediate'
       );

       expect(transfer.status).toBe('rate_quoted');
       expect(transfer.source_amount).toBe(100);
     });

     it('prevents rate lock after expiry', async () => {
       const transfer = await createTransfer();

       // Mock time to be after expiry
       jest.useFakeTimers();
       jest.setSystemTime(new Date(transfer.rate_lock_expires_at.getTime() + 1000));

       expect(() => {
         transferService.lockRate(transfer.id);
       }).toThrow('Rate lock expired');
     });

     it('validates KYC before transfer', async () => {
       // User without KYC
       const result = await transferService.initiateTransfer(
         userWithoutKYC,
         recipientId,
         100,
         'immediate'
       );

       expect(result).toThrow('KYC not verified');
     });
   });
   ```

**Output**:
- ✅ State machine with valid transitions
- ✅ Transfer orchestrator service
- ✅ Compliance checks (KYC, rate lock validity)
- ✅ Immutable audit trail
- ✅ Unit tests (>85% coverage)

---

### Step B4: KYC & Recipient Verification Service

**Deliverable**: Recipient verification with caching and expiry

**Dependencies**: B2, B3 (provider available)

**Remittance Requirements**:
- ✅ Recipient verification via Chimoney (NPCI link)
- ✅ Verification caching (7-day expiry)
- ✅ UPI-specific verification (phone number)
- ✅ Bank transfer verification (IFSC + account)
- ✅ Verification re-tries with manual override option

**Tasks**:
1. [ ] Recipient verification service
   ```typescript
   // services/transfers/kycService.ts
   export class KYCService {
     private provider: IPaymentProvider;
     private encryptionService: EncryptionService;

     async verifyRecipient(
       userId: string,
       recipientData: {
         name: string;
         phone?: string;  // For UPI
         bankCode?: string;  // For bank transfer
         accountNumber?: string;  // For bank transfer
         accountType?: 'savings' | 'current';
         countryCode: string;
         paymentMethod: 'upi' | 'bank_account';
       }
     ): Promise<Recipient> {
       // 1. Validate input
       if (recipientData.paymentMethod === 'upi') {
         if (!recipientData.phone || !/^\d{10}$/.test(recipientData.phone)) {
           throw new Error('Invalid phone number. Must be 10 digits.');
         }
       } else {
         if (!recipientData.bankCode || !recipientData.accountNumber) {
           throw new Error('Bank code and account number required');
         }
       }

       // 2. Check if recipient already exists (idempotency)
       const existing = await db.recipients.findFirst({
         where: {
           user_id: userId,
           recipient_phone: recipientData.phone,
           recipient_bank_code: recipientData.bankCode,
         },
       });

       if (existing && existing.verification_status === 'verified') {
         // Already verified
         return existing;
       }

       // 3. Call Chimoney verification API
       console.log('[KYCService] Starting recipient verification');

       let chimoneyResponse;
       try {
         chimoneyResponse = await this.provider.verifyRecipient({
           countryCode: recipientData.countryCode,
           paymentMethod: recipientData.paymentMethod,
           recipientPhone: recipientData.phone,
           bankCode: recipientData.bankCode,
           accountNumber: recipientData.accountNumber,
         });
       } catch (error) {
         console.error('[KYCService] Verification failed:', error);

         // Save failed attempt
         await db.recipients.create({
           user_id: userId,
           recipient_name: recipientData.name,
           recipient_phone: recipientData.phone,
           recipient_bank_code: recipientData.bankCode,
           payment_method: recipientData.paymentMethod,
           verification_status: 'failed',
           verified_by_system: 'chimoney_api',
         });

         throw error;
       }

       // 4. Encrypt sensitive data before saving
       const encrypted: any = {};
       if (recipientData.phone) {
         encrypted.recipient_upi_encrypted = this.encryptionService.encrypt(
           recipientData.phone
         );
       }
       if (recipientData.accountNumber) {
         encrypted.recipient_bank_account_encrypted = this.encryptionService.encrypt(
           recipientData.accountNumber
         );
       }

       // 5. Save verified recipient
       const recipient = await db.recipients.create({
         user_id: userId,
         corridor_id: recipientData.countryCode === 'IN' ? corridorINDId : null,
         recipient_name: chimoneyResponse.recipientName,
         recipient_phone: recipientData.phone,
         recipient_bank_code: recipientData.bankCode,
         payment_method: recipientData.paymentMethod,
         ...encrypted,
         chimoney_recipient_id: chimoneyResponse.recipientId,
         verification_status: 'verified',
         verified_at: new Date(),
         verification_expires_at: new Date(
           Date.now() + 7 * 24 * 60 * 60 * 1000  // 7 days
         ),
         verified_by_system: 'chimoney_api',
       });

       console.log('[KYCService] Recipient verified:', recipient.id);
       return recipient;
     }
   }
   ```

**Output**:
- ✅ Recipient verification service
- ✅ Sensitive data encryption
- ✅ 7-day verification expiry
- ✅ Error handling with user-friendly messages

---

## Part C: FX Rate Management (Week 2-3)

### Step C1: FX Rate Service with Caching

**Deliverable**: Real-time FX rate management with caching

**Dependencies**: B2 (provider available)

**Remittance Requirements**:
- ✅ Rates updated regularly from Chimoney (not cached >1 min)
- ✅ Quote rates valid for 5 minutes
- ✅ Mid-market rates for transparency
- ✅ Fee structure transparent to user
- ✅ Historical rates stored for analytics

**Tasks**:
1. [ ] FX rate service
   ```typescript
   // services/transfers/fxRateService.ts
   export class FXRateService {
     private provider: IPaymentProvider;
     private rateCache: Map<string, { rate: FXQuote; expiresAt: Date }> = new Map();
     private CACHE_DURATION_MS = 60 * 1000;  // 1 minute

     async getQuote(
       corridorId: string,
       sourceAmount: number
     ): Promise<FXQuote> {
       const cacheKey = `${corridorId}:${sourceAmount}`;

       // Check cache
       const cached = this.rateCache.get(cacheKey);
       if (cached && new Date() < cached.expiresAt) {
         console.log('[FXRateService] Cache hit');
         return cached.rate;
       }

       // Fetch from Chimoney
       console.log('[FXRateService] Fetching quote from Chimoney');
       const quote = await this.provider.getQuote({
         corridor: corridorId,
         sourceAmount,
       });

       // Cache it
       this.rateCache.set(cacheKey, {
         rate: quote,
         expiresAt: new Date(Date.now() + this.CACHE_DURATION_MS),
       });

       // Store in DB for historical analysis
       await db.fx_rates.create({
         corridor_id: corridorId,
         rate: quote.rate,
         mid_rate: quote.midRate,
         buy_rate: quote.buyRate,
         source_amount: sourceAmount,
         destination_amount: quote.destinationAmount,
         fee_amount: quote.fee,
         rate_validity_seconds: quote.validitySeconds,
         source: 'chimoney',
         recorded_at: new Date(),
       });

       return quote;
     }

     async getRatesToday(corridorId: string): Promise<{
       current: number;
       min: number;
       max: number;
     }> {
       const today = new Date();
       today.setHours(0, 0, 0, 0);

       const rates = await db.fx_rates.findMany({
         where: {
           corridor_id: corridorId,
           recorded_at: { gte: today },
         },
         select: ['buy_rate'],
       });

       if (rates.length === 0) {
         // Get fresh quote if no rates today
         const quote = await this.getQuote(corridorId, 100);
         return {
           current: quote.buyRate,
           min: quote.buyRate,
           max: quote.buyRate,
         };
       }

       const buyRates = rates.map(r => r.buy_rate);
       return {
         current: buyRates[buyRates.length - 1],
         min: Math.min(...buyRates),
         max: Math.max(...buyRates),
       };
     }
   }
   ```

**Output**:
- ✅ Rate caching (1-minute TTL)
- ✅ Historical rate storage
- ✅ Min/max rates for user reference
- ✅ Real-time quotes from Chimoney

---

## Part D: Payment Processing (Week 3-4)

### Step D1: Payment Initiation Service

**Deliverable**: Secure payment initiation with idempotency

**Dependencies**: B2, B3, B4 (provider, transfer service, KYC available)

**Remittance Requirements**:
- ✅ Idempotency keys on ALL payment calls
- ✅ Idempotent payment initiation (409 Conflict handling)
- ✅ No duplicate charges
- ✅ Transaction ID persistence
- ✅ Immediate webhook notification registration

**Tasks**:
1. [ ] Payment service
   ```typescript
   // services/transfers/paymentService.ts
   export class PaymentService {
     private provider: IPaymentProvider;

     async initiatePayment(
       transferId: string,
       userId: string
     ): Promise<PaymentResponse> {
       // 1. Get transfer details
       const transfer = await db.transfer_requests.findUnique(transferId);

       if (transfer.status !== 'pending_approval') {
         throw new Error(`Cannot initiate payment from status: ${transfer.status}`);
       }

       // 2. Get recipient
       const recipient = await db.recipients.findUnique(transfer.recipient_id);

       // 3. Verify rate lock still valid
       if (new Date() > transfer.rate_lock_expires_at) {
         throw new Error('Rate lock expired');
       }

       // 4. Decrypt sensitive data
       let decryptedPhone: string | undefined;
       let decryptedAccount: string | undefined;

       if (recipient.recipient_upi_encrypted) {
         decryptedPhone = this.encryptionService.decrypt(
           recipient.recipient_upi_encrypted
         );
       }
       if (recipient.recipient_bank_account_encrypted) {
         decryptedAccount = this.encryptionService.decrypt(
           recipient.recipient_bank_account_encrypted
         );
       }

       // 5. Call Chimoney payment API
       const idempotencyKey = generateIdempotencyKey(transferId, 'payment-initiation');

       console.log('[PaymentService] Initiating payment', {
         transferId,
         amount: transfer.source_amount,
         idempotencyKey,
       });

       let paymentResponse;
       try {
         paymentResponse = await this.provider.initiatePayment({
           recipientId: recipient.chimoney_recipient_id,
           sourceAmount: transfer.source_amount,
           currencyCode: 'USD',
           paymentMethod: recipient.payment_method,
           senderName: (await db.users.findUnique(userId)).name,
           senderEmail: (await db.users.findUnique(userId)).email,
           senderPhone: (await db.users.findUnique(userId)).phone,
           purposeOfTransfer: transfer.purpose_of_transfer,
           sourceOfFunds: transfer.source_of_funds,
           idempotencyKey,
         });
       } catch (error) {
         console.error('[PaymentService] Payment initiation failed:', error);

         await db.transfer_requests.update(transferId, {
           status: 'failed',
           payment_status: 'failed',
           error_message: error.message,
           retry_count: transfer.retry_count + 1,
         });

         await this.createActivityLog(transferId, 'payment_failed', {
           error: error.message,
           retryCount: transfer.retry_count + 1,
         });

         throw error;
       }

       // 6. Update transfer with transaction ID
       await db.transfer_requests.update(transferId, {
         status: 'payment_initiated',
         payment_status: 'pending',
         chimoney_transaction_id: paymentResponse.transactionId,
         payment_method_used: recipient.payment_method,
       });

       await this.createActivityLog(transferId, 'payment_initiated', {
         transactionId: paymentResponse.transactionId,
         estimatedDelivery: paymentResponse.estimatedDeliveryTime,
       });

       return paymentResponse;
     }

     private async createActivityLog(
       transferId: string,
       type: string,
       details: any
     ): Promise<void> {
       await db.transfer_activity_log.create({
         transfer_id: transferId,
         activity_type: type,
         details,
       });
     }
   }
   ```

**Output**:
- ✅ Idempotent payment initiation
- ✅ Transaction ID storage
- ✅ Error handling with retry tracking
- ✅ Immutable activity log

---

### Step D2: Payment Status Polling

**Deliverable**: Continuous polling for payment confirmation

**Dependencies**: D1 (payment service available)

**Remittance Requirements**:
- ✅ Aggressive polling (2-second interval for first 10 minutes)
- ✅ Graceful degradation (poll less frequently after 10 min)
- ✅ Timeout handling (mark as "stuck" after 1 hour)
- ✅ Webhook as primary, polling as backup
- ✅ User notification on completion

**Tasks**:
1. [ ] Payment polling service
   ```typescript
   // services/transfers/paymentPollingService.ts
   export class PaymentPollingService {
     private provider: IPaymentProvider;

     async pollPaymentStatus(transferId: string): Promise<void> {
       const transfer = await db.transfer_requests.findUnique(transferId);

       if (transfer.payment_status !== 'pending') {
         return; // Already completed or failed
       }

       try {
         const status = await this.provider.getPaymentStatus(
           transfer.chimoney_transaction_id
         );

         await db.transfer_requests.update(transferId, {
           payment_status: status.paymentStatus,
           last_status_check: new Date(),
         });

         if (status.paymentStatus === 'completed') {
           await db.transfer_requests.update(transferId, {
             status: 'completed',
             completed_at: new Date(),
           });

           await this.notifyUser(transfer.user_id, transfer.id, 'completed');
         } else if (status.paymentStatus === 'failed') {
           await db.transfer_requests.update(transferId, {
             status: 'failed',
             error_message: status.errorMessage,
           });

           await this.notifyUser(transfer.user_id, transfer.id, 'failed');
         }
       } catch (error) {
         console.error('[PaymentPolling] Status check failed:', error);
         // Continue polling, don't throw
       }
     }

     private async notifyUser(
       userId: string,
       transferId: string,
       status: 'completed' | 'failed'
     ): Promise<void> {
       // Send push notification
       // Send in-app notification
       // Send email
     }
   }
   ```

2. [ ] Cron job for polling
   ```typescript
   // pages/api/cron/poll-payment-status.ts
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     // Verify cron secret
     if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
       return res.status(401).json({ error: 'Unauthorized' });
     }

     const pendingTransfers = await db.transfer_requests.findMany({
       where: { payment_status: 'pending' },
     });

     const pollingService = new PaymentPollingService(provider);

     for (const transfer of pendingTransfers) {
       // Determine polling frequency
       const timeSinceInitiation = Date.now() - transfer.payment_initiated_at.getTime();
       const TEN_MINUTES = 10 * 60 * 1000;
       const ONE_HOUR = 60 * 60 * 1000;

       if (timeSinceInitiation > ONE_HOUR) {
         // Mark as stuck
         await db.transfer_requests.update(transfer.id, {
           payment_status: 'stuck',
           error_message: 'No status update from Chimoney in 1 hour',
         });
         continue;
       }

       if (timeSinceInitiation < TEN_MINUTES) {
         // Aggressive polling - run every time cron job runs (2 minutes)
         await pollingService.pollPaymentStatus(transfer.id);
       } else {
         // Normal polling - run less frequently
         const lastCheck = transfer.last_status_check?.getTime() || 0;
         const THIRTY_SECONDS = 30 * 1000;
         if (Date.now() - lastCheck > THIRTY_SECONDS) {
           await pollingService.pollPaymentStatus(transfer.id);
         }
       }
     }

     res.status(200).json({
       success: true,
       checked: pendingTransfers.length,
     });
   }
   ```

**Output**:
- ✅ Payment status polling service
- ✅ Cron job for automatic polling
- ✅ Graduated polling strategy
- ✅ Timeout handling

---

## Part E: Backend APIs (Week 3-4)

### Step E1: Transfer API Endpoints

**Deliverable**: REST APIs for transfer operations

**Dependencies**: B3, D1 (transfer service, payment service available)

**Tasks**:
1. [ ] Create API routes (see CHIMONEY_INTEGRATION_GUIDE.md for details)
   - `POST /api/transfers/quote`
   - `POST /api/transfers/lock-rate`
   - `POST /api/transfers/recipients/verify`
   - `GET /api/transfers/recipients`
   - `POST /api/transfers/immediate`
   - `POST /api/transfers/rate-triggered`
   - `GET /api/transfers/rates/today/:corridor`
   - `GET /api/transfers/:id/status`

2. [ ] Error handling & validation
   ```typescript
   // Validate input
   // Return user-friendly error messages
   // Log all API calls (no sensitive data)
   // Rate limit: 100 req/min per user
   ```

3. [ ] API tests
   ```typescript
   // Happy path: immediate transfer
   // Happy path: rate-triggered transfer
   // Error cases: invalid recipient, expired rate
   // Edge cases: duplicate requests, rate lock expiry
   ```

**Output**:
- ✅ 8 API endpoints
- ✅ Input validation
- ✅ Rate limiting
- ✅ Error handling
- ✅ Integration tests

---

### Step E2: Webhook Handler

**Deliverable**: Chimoney webhook processor

**Dependencies**: B2, D1 (provider, payment service)

**Remittance Requirements**:
- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ Webhook idempotency (handle duplicates)
- ✅ Always return 200 OK (even on processing error)
- ✅ Async processing (don't block webhook)
- ✅ Webhook logging for audit trail

**Tasks**:
1. [ ] Webhook handler
   ```typescript
   // pages/api/webhooks/chimoney.ts
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     const signature = req.headers['x-chimoney-signature'];
     const rawBody = getRawBody(req);  // Must be raw JSON

     // 1. Verify signature
     if (!verifyWebhookSignature(rawBody, signature)) {
       console.error('[Webhook] Invalid signature');
       return res.status(401).json({ error: 'Invalid signature' });
     }

     const { eventType, data } = req.body;

     // 2. Log webhook for audit trail
     const webhookLog = await db.chimoney_webhook_logs.create({
       webhook_id: data.transactionId,
       event_type: eventType,
       payload: data,
       received_at: new Date(),
     });

     // 3. Async processing (don't block webhook response)
     setImmediate(() => processWebhook(eventType, data, webhookLog.id));

     // 4. Always return 200 OK immediately
     res.status(200).json({ success: true });
   }

   async function processWebhook(
     eventType: string,
     data: any,
     webhookLogId: string
   ): Promise<void> {
     try {
       const transfer = await db.transfer_requests.findUnique({
         where: { chimoney_transaction_id: data.transactionId }
       });

       if (!transfer) {
         console.warn(`[Webhook] Transfer not found: ${data.transactionId}`);
         return;
       }

       switch (eventType) {
         case 'transfer.completed':
           await handleTransferCompleted(transfer, data);
           break;
         case 'transfer.failed':
           await handleTransferFailed(transfer, data);
           break;
         // ... other events
       }

       // Mark webhook as processed
       await db.chimoney_webhook_logs.update(webhookLogId, {
         processed: true,
         processed_at: new Date(),
       });
     } catch (error) {
       console.error('[Webhook] Processing failed:', error);
       // Mark webhook with error for manual investigation
       await db.chimoney_webhook_logs.update(webhookLogId, {
         error: error.message,
       });
     }
   }
   ```

**Output**:
- ✅ Webhook handler with signature verification
- ✅ Idempotent processing
- ✅ Webhook logging for compliance
- ✅ Async processing (non-blocking)

---

## Part F: Frontend Components (Week 4-5)

### Step F1: Transfer Dialog Components

**Deliverable**: React components for transfer workflow

**Dependencies**: E1 (API endpoints available)

**Tasks**:
1. [ ] Create component structure
   - `TransferDialog` (main orchestrator)
   - `RecipientSelector` (choose/add recipient)
   - `RecipientForm` (add new recipient)
   - `ImmediateTransferFlow` (quote → payment)
   - `RateTriggeredFlow` (set target rate)
   - `ComplianceForm` (purpose, source of funds)
   - `ConfirmationScreen` (final review)

2. [ ] State management
   ```typescript
   // Dialog state: open, step, recipient, amount, quoteId, etc.
   // Loading states: verifying recipient, getting quote, initiating payment
   // Error states: with user-friendly messages and retry options
   ```

3. [ ] API integration
   - Call `/api/transfers/quote` for FX rates
   - Call `/api/transfers/recipients/verify` for recipient verification
   - Call `/api/transfers/immediate` to initiate payment
   - Poll `/api/transfers/:id/status` for payment status

**Output**:
- ✅ Transfer dialog with full workflow
- ✅ Error handling
- ✅ Loading states
- ✅ Mobile-responsive design

---

### Step F2: Activity Sidebar

**Deliverable**: Real-time activity tracking

**Dependencies**: E1 (APIs available), Supabase realtime

**Tasks**:
1. [ ] Activity feed component
   - List of user's transfers
   - Status badges (color-coded)
   - Timeline view
   - Filters (All, Pending, Completed, Failed)

2. [ ] Real-time updates
   ```typescript
   // Supabase realtime subscription
   supabase
     .from('transfer_activity_log')
     .on('INSERT', payload => {
       // Update sidebar with new activity
     })
     .subscribe();
   ```

3. [ ] Notifications
   - In-app toast notifications
   - Push notifications (if enabled)
   - Email notifications (for completion/failure)

**Output**:
- ✅ Activity sidebar with real-time updates
- ✅ Notifications system
- ✅ Filter functionality

---

## Part G: Monitoring & Testing (Week 5-6)

### Step G1: Monitoring & Observability

**Deliverable**: Production-ready monitoring

**Tasks**:
1. [ ] Metrics
   ```typescript
   // Track in Datadog/New Relic
   - transfer_initiated_count
   - transfer_completed_count
   - transfer_failed_count
   - payment_avg_settlement_time_ms
   - fxrate_avg_latency_ms
   - recipient_verification_success_rate
   - webhook_delivery_success_rate
   ```

2. [ ] Alerts
   ```
   🔴 CRITICAL:
   - Error rate > 5%
   - Payment settlement > 30 minutes
   - Webhook failures > 10%

   🟡 WARNING:
   - Success rate < 95%
   - Average latency > 5 seconds
   - Verification failures > 20%
   ```

3. [ ] Dashboards
   - Transfer volume by type
   - Success/failure breakdown
   - Settlement time distribution
   - Top error reasons

**Output**:
- ✅ Metrics dashboard
- ✅ Alert rules configured
- ✅ Runbooks for on-call

---

### Step G2: Testing & QA

**Deliverable**: >85% test coverage, staging validation

**Tasks**:
1. [ ] Unit tests (all services)
   - Transfer service state machine
   - Payment service idempotency
   - FX rate caching
   - Encryption/decryption
   - **Target**: >85% coverage

2. [ ] Integration tests (API + services)
   - Immediate transfer end-to-end
   - Rate-triggered transfer end-to-end
   - Webhook processing
   - Error recovery
   - **Target**: All happy paths + error paths

3. [ ] E2E tests (staging with Chimoney sandbox)
   - Real API calls to Chimoney sandbox
   - Verify rates returned correctly
   - Verify recipient verification works
   - Verify payment initiated and settled
   - Verify webhook received and processed

4. [ ] Performance tests
   - Load test: 1000 concurrent transfers
   - Rate limiting works
   - DB queries optimized (<100ms)
   - API response times (<200ms)

**Output**:
- ✅ Test suite with >85% coverage
- ✅ All E2E tests passing
- ✅ Performance benchmarks documented

---

## Part H: Deployment (Week 6)

### Step H1: Staging Deployment

**Deliverable**: Production-like environment for final validation

**Tasks**:
1. [ ] Deploy to staging
   - All services running
   - Database migrated
   - APIs functioning
   - Webhooks receiving

2. [ ] Staging validation
   - Immediate transfer works end-to-end
   - Rate-triggered transfer works
   - Activity sidebar updates in real-time
   - Webhook processing works
   - Error handling working

3. [ ] Performance validation
   - No queries >100ms
   - No API responses >200ms
   - No memory leaks over 1 hour

**Output**:
- ✅ Staging environment live
- ✅ All validation passing
- ✅ Performance benchmarks met

---

### Step H2: Production Rollout

**Deliverable**: Gradual rollout with feature flags

**Tasks**:
1. [ ] Feature flag setup
   ```typescript
   international_transfers_india: {
     enabled: true,
     rolloutPercentage: 10,  // 10% of users initially
     whitelist: [...betaUserIds]
   }
   ```

2. [ ] Gradual rollout schedule
   - Day 1: 10% of users (50 users)
   - Day 2: 25% of users (250 users)
   - Day 3: 50% of users (500 users)
   - Day 4+: 100% of users

3. [ ] Monitoring during rollout
   - Error rate <1%
   - Success rate >95%
   - No critical incidents
   - User feedback positive

**Output**:
- ✅ Feature live in production
- ✅ Monitoring alerts active
- ✅ Rollback plan ready

---

## Dependency Graph

```
A1 (Chimoney Setup) ──────┐
                            ├─→ B1 (Encryption) ──┐
A2 (Database Schema) ──────┐ │                      ├─→ B2 (Provider) ──┐
                            ├─→ A3 (Config) ─────┘│                      ├─→ B3 (Transfer Service)
                            │                       │                    │
                            │                       ├─→ B4 (KYC Service)┤
                            │                       │                    ├─→ C1 (FX Rate Service)
                            └───→ C1 ──────────────┴──────────────────┬─┘
                                                                       │
                                                                       └─→ D1 (Payment Service)
                                                                           │
                                                                           ├─→ D2 (Polling)
                                                                           │
                                                                           ├─→ E1 (APIs)
                                                                           │
                                                                           ├─→ E2 (Webhook)
                                                                           │
                                                                           └─→ F1, F2 (Frontend)
                                                                               │
                                                                               └─→ G1, G2 (Testing)
                                                                                   │
                                                                                   └─→ H1, H2 (Deploy)
```

---

## Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Chimoney API down | HIGH | Feature flag to disable transfers, fallback message |
| Double payment | CRITICAL | Idempotency keys on ALL payment calls |
| Rate lock expires during approval | MEDIUM | Check validity before payment, show user "re-quote" |
| Webhook not received | MEDIUM | Polling as backup, manual verification |
| Recipient verification expired | MEDIUM | Automatic re-verification, block transfers if expired |
| User KYC invalid/expired | HIGH | Annual refresh, prevent transfer if invalid |
| Payment stuck (no webhook, polling silent) | MEDIUM | Mark as "stuck" after 1 hour, manual support follow-up |
| Encryption key lost | CRITICAL | Key rotation procedure, backup keys in vault |

---

## Compliance Checklist

- [ ] RBI compliance for USD→INR transfers
- [ ] NPCI compliance for UPI processing
- [ ] PCI-DSS compliance for payment data
- [ ] KYC/AML checks before transfer
- [ ] Immutable audit logs for all transfers
- [ ] Data encryption at rest & in transit
- [ ] Annual KYC refresh enforcement
- [ ] Daily/monthly transfer limits enforced
- [ ] Webhook signature verification
- [ ] No plaintext sensitive data in logs

---

## Success Metrics (Launch Day)

✅ Transfer volume: >50 transfers
✅ Success rate: >95%
✅ Average settlement: 3-5 minutes (UPI)
✅ Error rate: <1%
✅ API latency: <200ms (p95)
✅ Zero double-payments
✅ Webhook delivery: 100%

---

## Timeline Summary

| Week | Deliverable |
|------|------------|
| **W1** | Foundation: Chimoney setup, DB schema, config |
| **W2-3** | Core services: Encryption, Provider, Transfer, KYC, FX |
| **W3-4** | APIs & webhooks: Payment processing, status polling |
| **W4-5** | Frontend: Transfer dialog, activity sidebar |
| **W5-6** | Testing: Unit tests, integration tests, E2E tests |
| **W6** | Deployment: Staging, production rollout |

---

## Sign-Off

**Product Manager**: _________________ Date: _______
**Engineering Lead**: _________________ Date: _______
**Remittance Specialist**: _________________ Date: _______
**Compliance Officer**: _________________ Date: _______

