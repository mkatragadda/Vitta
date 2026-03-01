# Compliance Requirements: Storing Account & Routing Numbers

**Legal and regulatory obligations for handling banking information**

---

## ⚠️ Executive Summary

**Risk Level: HIGH**

Storing account numbers and routing numbers means you're handling **Sensitive Personal Financial Information (SPFI)** and subject to:

```
🔒 Encryption Requirements
🏦 Banking Regulations (FDIC, Federal Reserve)
🔐 Data Protection (CCPA, GDPR, GLBA)
🛡️ Fraud Prevention (PCI-adjacent)
📋 KYC/AML Compliance (FinCEN)
✅ Audit & Verification Requirements
```

---

## 1️⃣ Plaid Terms & Restrictions

### ❌ What You CANNOT Do

```javascript
❌ Store Plaid access tokens in your DB
   └─ Plaid handles this (they keep encrypted in their servers)

❌ Store full account numbers without encryption
   └─ Must use AES-256 minimum

❌ Log account numbers to console or files
   └─ Violates Plaid's terms

❌ Share account details with third parties
   └─ Only Chimoney API (your payment processor)

❌ Store data longer than necessary
   └─ Must have retention policies
```

### ✅ What You CAN Do

```javascript
✅ Store encrypted account numbers (your system)
✅ Store masked account numbers (****1234)
✅ Use Plaid's data with explicit user consent
✅ Process payments through your payment processor
✅ Keep audit logs of who accessed what
```

**Reference**: [Plaid Data Protection](https://plaid.com/security/)

---

## 2️⃣ Payment Card Industry (PCI) Adjacency

### "Why is this relevant if we're not storing credit cards?"

Because you're storing **bank account data**, which is equally sensitive.

**PCI DSS Principles Apply** (or similar standards):

```
Standard 1: Secure Network Architecture
  ✅ Your database must be encrypted & access-controlled

Standard 2: Protect Cardholder Data
  ✅ Must also protect account holder data
  └─ Encrypt at rest: AES-256-CBC (MINIMUM)
  └─ Encrypt in transit: TLS 1.2+ (HTTPS only)
  └─ Separate encryption keys (don't hardcode)

Standard 3: Vulnerability Management
  ✅ Regular security audits
  ✅ Penetration testing
  ✅ Dependency scanning

Standard 4: Access Control
  ✅ Restrict who can view account numbers
  ✅ Audit logs for all access
  ✅ Role-based access control (RBAC)

Standard 5: Monitoring & Testing
  ✅ Security event logging
  ✅ Regular backups
  ✅ Incident response plan

Standard 6: Data Retention
  ✅ Delete data when no longer needed
  ✅ Secure destruction of deleted data
  ✅ Define retention policies
```

**Cost**: PCI compliance can cost $1,000-$10,000+ annually

---

## 3️⃣ US Banking Regulations

### **Gramm-Leach-Bliley Act (GLBA)**

**If you operate in the US, you MUST:**

```
✅ Safeguard customer financial information
✅ Provide privacy notices
✅ Allow customers to opt-out (limited)
✅ Implement physical, technical, administrative safeguards
✅ Notify customers of data breaches within 60 days
✅ Have a written Information Security Program
```

**What this means for your app:**

```javascript
// Privacy Policy Required
// You MUST disclose:
- What data you collect
- How you use it (e.g., "to process international transfers")
- Who you share it with (Chimoney API)
- How you protect it (encryption)
- How long you keep it (retention policy)
- User rights (access, deletion, etc.)

// Data Breach Notification
// Within 60 days, notify:
- All affected users
- Regulatory authorities
- Media (if > 500 people affected)

// Information Security Program
// Required components:
- Designate responsible officer
- Risk assessment
- Encryption standards
- Access controls
- Incident response plan
- Annual audit
```

### **OFAC (Office of Foreign Assets Control) Compliance**

**Critical for international transfers!**

```
Since you're sending money to India, you MUST:

✅ Screen beneficiaries against OFAC SDN list
   └─ Sanctioned Designations National (terrorist watchlist)
   └─ Check before every transfer

✅ Screen senders against OFAC list
   └─ No US citizens sending to sanctioned countries/people

✅ Document compliance
   └─ Keep screening records for 5 years
   └─ Audit trail of all checks

✅ Report suspicious activity
   └─ File SARs (Suspicious Activity Reports) if warranted
```

**Implementation Required:**

```javascript
// Before executing transfer:
async function checkOFACCompliance(transfer) {
  // Screen beneficiary
  const beneficiaryScreening = await ofacAPI.screen({
    name: transfer.recipient_name,
    country: transfer.recipient_country
  });

  if (beneficiaryScreening.risk_score > 0.5) {
    throw new Error('Beneficiary failed OFAC screening');
  }

  // Screen sender (user)
  const senderScreening = await ofacAPI.screen({
    name: transfer.user_name,
    country: 'US'  // or user's country
  });

  if (senderScreening.risk_score > 0.5) {
    throw new Error('Sender failed OFAC screening');
  }

  // Log screening for audit
  await db.ofac_screening_logs.create({
    transfer_id: transfer.id,
    beneficiary_screening: beneficiaryScreening,
    sender_screening: senderScreening,
    passed_at: new Date()
  });
}
```

**Cost**: OFAC screening APIs: $100-$1,000/month depending on volume

---

## 4️⃣ Data Protection Laws (CCPA & GDPR)

### **California Consumer Privacy Act (CCPA)**

**If you have any California users:**

```
✅ Provide Privacy Policy (must include account handling)
✅ Allow users to:
  - See what data you have (right of access)
  - Delete their data (right to deletion)
  - Opt-out of data sales
  - Know why you use their data

✅ Data Minimization
  - Only collect what's necessary
  - Don't store more than needed
  - Delete when purpose is fulfilled

✅ Security Standards
  - Reasonable security measures
  - Encryption recommended
  - Incident response plan

❌ Penalties
  - $2,500 per violation
  - $7,500 per intentional violation
```

### **General Data Protection Regulation (GDPR)**

**If you have any EU users:**

```
✅ Explicit Consent
  - User must explicitly agree to store account data
  - "Do you consent to storing your bank account number
     encrypted in our servers?"

✅ Data Processing Agreement (DPA)
  - With Chimoney (your payment processor)
  - Define how they use the data

✅ Lawful Basis
  - Why you're storing the data:
    LEGITIMATE INTEREST or CONSENT
  - Document this in your Privacy Policy

✅ Data Subject Rights
  - Right to access
  - Right to erasure ("right to be forgotten")
  - Right to rectification
  - Right to restrict processing
  - Right to portability

✅ Data Breach Notification
  - Within 72 hours to regulators
  - Immediately to affected users
  - Even if low risk

❌ Penalties
  - Up to €20 million or 4% of annual revenue (whichever is higher)
```

---

## 5️⃣ Know Your Customer (KYC) & Anti-Money Laundering (AML)

### **FinCEN Regulations (US)**

**You're a "money services business":**

```
✅ KYC (Know Your Customer)
  - Verify user identity before transfers
  - Collect: Name, Address, DOB, SSN/Tax ID
  - Verify against government ID

✅ Customer Identification Program (CIP)
  - Document and verify customer identity
  - Maintain records for 5 years

✅ AML Compliance
  - Monitor for suspicious patterns
  - File SARs if suspicious
  - Maintain AML program

✅ Beneficial Ownership (BO)
  - Know who owns accounts
  - Identify beneficial owners of entities

✅ Travel Rule (for crypto, but principle applies)
  - Report when transfers exceed $3,000
  - Include beneficiary info
```

### **Risk Assessment Framework**

```javascript
// Risk scoring for transfers
function assessTransferRisk(transfer) {
  let riskScore = 0;

  // Red flags
  if (transfer.source_amount > 10000) riskScore += 30;        // High amount
  if (transfer.frequency > 5 && transfer.time < 7) riskScore += 20;  // Rapid transfers
  if (transfer.recipient_country in ['XX', 'YY']) riskScore += 25;   // High-risk country
  if (transfer.recipient_name_different) riskScore += 15;            // Name mismatch
  if (transfer.new_beneficiary) riskScore += 10;                     // New recipient

  // Thresholds
  if (riskScore > 70) return 'HIGH_RISK';      // File SAR
  if (riskScore > 40) return 'MEDIUM_RISK';    // Enhanced monitoring
  return 'LOW_RISK';
}

// File SAR (Suspicious Activity Report)
async function fileSAR(transfer, reason) {
  await db.sars.create({
    transfer_id: transfer.id,
    reason,
    filed_at: new Date(),
    fincen_report_number: generateReportNumber()  // Filed with FinCEN
  });
}
```

---

## 6️⃣ Your Required Security Implementation

### **Encryption Standards**

```javascript
// MINIMUM Requirements:

✅ At-Rest Encryption
  Algorithm: AES-256-CBC (or AES-256-GCM)
  Mode: CBC or GCM (never ECB!)
  Key Length: 256 bits (32 bytes)
  Random IV: 16 bytes per encryption

✅ In-Transit Encryption
  Protocol: TLS 1.2+ (HTTPS only)
  Cipher: AES-256-GCM or similar
  Certificate: Valid SSL/TLS certificate

✅ Key Management
  ❌ DON'T hardcode keys in code
  ✅ DO use environment variables
  ✅ DO rotate keys regularly (annually minimum)
  ✅ DO separate encryption keys (don't reuse)
  ✅ DO use key management service (AWS KMS, Google Cloud KMS)
```

### **Access Control**

```javascript
// Database Access
✅ Row-level security (Supabase RLS)
  - Users can only see their own data
  - Admin can only see what they need

✅ Application-level encryption
  - Decrypt only when necessary
  - Never log decrypted values
  - Immediate re-encryption

✅ Audit Logging
  - Who accessed what data
  - When they accessed it
  - What operation (read, write, delete)
  - IP address
  - Keep for minimum 1 year
```

### **Data Retention Policy**

```javascript
// Example retention policy (adjust for your needs)

Account Numbers:
  Keep: 3 years after last transfer
  Delete: Securely shred (overwrite 3x)
  Reason: Tax records, dispute resolution

Transfer Records:
  Keep: 7 years (tax + legal requirement)
  Delete: After 7 years
  Note: Can anonymize instead of deleting

Audit Logs:
  Keep: Minimum 1 year
  Keep: 3-5 years for security incidents
  Delete: Secure deletion

User Data:
  Keep: As long as account exists
  Delete: Upon user request (GDPR/CCPA)
```

---

## 7️⃣ Compliance Checklist

### **Before Launch:**

```
Security Implementation
  ☐ AES-256-CBC encryption for account numbers
  ☐ Random IVs for each encryption
  ☐ TLS 1.2+ for all connections
  ☐ No account numbers in logs
  ☐ No hardcoded encryption keys

Data Protection
  ☐ Privacy Policy (mentions account storage)
  ☐ Data Processing Agreement with Chimoney
  ☐ Encryption key rotation schedule
  ☐ Data retention policy
  ☐ Incident response plan

KYC/AML
  ☐ Identity verification for users
  ☐ OFAC screening before transfers
  ☐ SAR filing procedures
  ☐ Risk assessment framework
  ☐ Transaction monitoring

Access Control
  ☐ Role-based access (users see only their data)
  ☐ Audit logging (who did what when)
  ☐ Admin access restrictions
  ☐ API key rotation

Testing & Audits
  ☐ Security penetration test
  ☐ Encryption key management review
  ☐ Data breach simulation
  ☐ Compliance audit

Documentation
  ☐ Security architecture document
  ☐ Data flow diagram (for audit)
  ☐ Incident response procedures
  ☐ Change log for security patches
  ☐ Staff training on data handling
```

### **Ongoing:**

```
Quarterly
  ☐ Review access logs
  ☐ Check for anomalies
  ☐ Update threat assessment

Annually
  ☐ Full security audit
  ☐ Penetration testing
  ☐ Encrypt key rotation
  ☐ Staff compliance training
  ☐ Policy updates
```

---

## 8️⃣ What Happens If You Get It Wrong?

### **Regulatory Penalties**

```
🚨 GLBA Violation
   $100 - $1 Million per violation
   + Criminal charges for intentional violations

🚨 GDPR Violation
   €20 Million or 4% revenue (whichever is higher)

🚨 CCPA Violation
   $2,500 - $7,500 per violation

🚨 Data Breach (unencrypted data)
   - Notification costs: $100K-$1M+
   - Lawsuit settlements: $1M-$100M+
   - Reputational damage: Incalculable

🚨 AML/FinCEN Violation
   $25,000 - $100,000+ per violation
   + Criminal charges possible
```

### **Real Examples**

```
Equifax Data Breach (2017)
  - 147 million records compromised
  - Settlement: $700 million
  - Regulatory fines: Additional millions

Target Data Breach (2013)
  - 40 million credit cards
  - Settlement: $18.5 million
  - Lost customer trust: Priceless

Wells Fargo (2016)
  - Unauthorized accounts/transfers
  - Fines: $3 billion+
  - Criminal charges against executives
```

---

## 9️⃣ Alternative Approach: NOT Storing Account Numbers

### **Why some fintech apps don't store this data:**

```
✅ PayPal
  - Stores token from bank (Plaid)
  - Never stores actual account number
  - Uses Plaid's encrypted storage

✅ Square
  - Uses tokenization
  - Stores payment processor token
  - Not raw account numbers

✅ Venmo
  - Uses OAuth for bank connections
  - No direct account number storage
  - Uses API tokens instead
```

### **Your Options:**

**Option 1: Store Encrypted (Current Plan)**
  - Pros: Full control, can process immediately
  - Cons: High compliance burden, expensive audits

**Option 2: Use Plaid Processor Tokens**
  - Pros: Plaid handles encryption, simpler
  - Cons: Less flexibility, additional costs
  - How: Use Plaid's `/processor_token/create` endpoint
  - Send token to Chimoney instead of account number

**Option 3: Hybrid Approach**
  - Store only masked account (****1234)
  - Use Plaid API to get full number when needed
  - Never store full number in your DB
  - Pros: Minimal compliance, Plaid handles security
  - Cons: Extra API calls, slower transfers

---

## 🔟 Recommended Implementation for MVP

**Balance between functionality and compliance:**

```javascript
// RECOMMENDED: Hybrid Approach

// 1. Get account from Plaid (encrypted at Plaid)
const plaidAccount = await plaid.accounts.get(accessToken);
// Returns: {
//   account_id: "xxx",
//   mask: "1234",  ← Store this
//   name: "Checking"
// }

// 2. Store ONLY masked info in your DB
const savedAccount = {
  plaid_account_id: "xxx",      // From Plaid
  mask: "****1234",              // Last 4 digits
  name: "Checking",
  can_transfer: true
  // NO full account number!
};

// 3. When executing transfer, call Plaid for full details
// (only when actually processing)
const fullAccount = await plaid.accounts.getWithAuth(accessToken);

// 4. Pass directly to Chimoney (never store in your DB)
await chimoney.payouts.bank({
  account_number: fullAccount.account_number,
  routing_number: fullAccount.routing_number,
  // ... other fields
});
```

**Compliance Benefits:**
- ✅ Simpler than storing encrypted
- ✅ Plaid handles security
- ✅ Minimal data in your DB
- ✅ Faster to implement
- ✅ Reduces audit burden

---

## 💡 Recommendation for Your Project

**For MVP (launch quickly):**
```
Use HYBRID approach:
  1. Don't store full account numbers in DB
  2. Store only masked info + Plaid account ID
  3. Call Plaid API when executing transfer
  4. Pass to Chimoney directly

Result:
  - 80% less compliance work
  - Faster launch
  - Simpler architecture
  - Still secure
```

**For Production (mature app):**
```
Upgrade to full encryption if needed:
  1. Add AES-256-CBC encryption
  2. Implement OFAC screening
  3. Add SAR filing system
  4. Full audit logging
  5. Annual security audits

Budget: $50K-$200K for full compliance setup
```

---

## 📞 Next Steps

1. **Choose approach** (Hybrid vs. Full Encryption)
2. **Update Privacy Policy**
3. **Set up OFAC screening**
4. **Implement audit logging**
5. **Get legal review** (recommend)
6. **Plan security audit** (before launch)

**Recommendation**: Start with HYBRID approach, upgrade to full encryption later if needed.

Should we implement the hybrid approach first?

