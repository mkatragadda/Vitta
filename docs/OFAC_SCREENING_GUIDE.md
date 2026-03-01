# OFAC Screening Implementation Guide

**Practical guide for international transfer compliance**

---

## ❓ Does Chimoney Handle OFAC Screening?

**Short Answer: PROBABLY YES, but verify with them**

### What We Know About Chimoney

```
Chimoney is a legitimate payment processor handling:
✅ International transfers
✅ Compliance-heavy transactions
✅ Cross-border payments

They likely:
✅ Perform OFAC screening
✅ Have AML procedures
✅ Document compliance
✅ Have banking relationships (requires compliance)

You should:
✅ ASK them directly: "Do you screen against OFAC SDN list?"
✅ Get written confirmation
✅ Request their compliance documentation
✅ Ask about their error handling
```

---

## 📋 The OFAC Requirement Breakdown

### **Who Needs to Screen?**

```
Money Services Businesses (MSBs) must:
✅ Screen senders
✅ Screen recipients
✅ Screen transactions
✅ Document compliance
✅ File SARs if suspicious

YOU are an MSB if you:
✅ Accept and transmit funds
✅ Facilitate transfers
✅ Handle customer money
```

### **What Gets Screened?**

```
SENDER (Your User)
├─ Name
├─ Address (if available)
├─ Country
└─ Risk Profile

RECIPIENT (Beneficiary)
├─ Name
├─ Account details
├─ Country
└─ Risk assessment

TRANSACTION
├─ Amount
├─ Frequency
├─ Timing
├─ Route
└─ Patterns
```

### **Against What?**

```
FinCEN maintains several lists:

1. SDN List (Specially Designated Nationals)
   - Terrorists
   - Drug traffickers
   - Sanctioned entities
   - ~1,500 names

2. OFAC Sanctions Lists
   - Country-based (Iran, North Korea, etc.)
   - Sector-based (Russian oligarchs, etc.)
   - Event-based (Ukraine sanctions, etc.)
   - ~20+ lists total

3. Other Lists
   - Politically Exposed Persons (PEPs)
   - Adverse Media
   - Various sanctions programs
```

---

## 🔍 Your Actual Options

### **Option 1: Rely on Chimoney** ✅ RECOMMENDED FOR MVP

```
Assumption: Chimoney does OFAC screening

Your responsibility:
✅ Verify Chimoney does screening
✅ Get written confirmation
✅ Document their procedures
✅ Keep records for audits
✅ File SARs if Chimoney flags issues

YOUR ACTION:
1. Email Chimoney: "Do you screen against OFAC SDN list?"
2. Ask for: Compliance documentation
3. Request: List of what they screen
4. Get: Written confirmation
5. Document in your records

RISK:
Low - if Chimoney does legitimate screening
Medium - if Chimoney doesn't confirm

CODE REQUIRED:
None! You're relying on Chimoney
```

**Email Template to Chimoney:**

```
Subject: OFAC Screening Confirmation

Hi Chimoney Support,

We're building a product that uses your payout API for international
transfers (USD to INR).

To ensure compliance, we need to confirm:

1. Do you screen beneficiaries/senders against the FinCEN SDN list?
2. Do you screen against OFAC sanctions lists?
3. Do you have documented AML/KYC procedures?
4. What is your error handling for failed screenings?
5. Do you file SARs (Suspicious Activity Reports) when needed?
6. Can you provide documentation of your compliance program?

Please confirm in writing.

Thanks,
[Your Company]
```

---

### **Option 2: Implement Your Own Screening** (Later)

```
If Chimoney doesn't screen OR you want belt-and-suspenders:

Services Available:
✅ ComplyAdvantage - $500-$2,000/month
✅ Socure - $300-$1,000/month
✅ Plaid Compliance - Built-in OFAC
✅ Tru - $100-$500/month
✅ Open Sanctions API - Free (limited)

Implementation:

// Check before transfer
async function checkOFAC(transfer) {
  const screening = await complyAdvantage.screen({
    name: transfer.recipient_name,
    country: 'IN'
  });

  if (screening.risk_score > 0.7) {
    throw new Error('OFAC screening failed');
  }

  // Log for audit
  await db.ofac_checks.create({
    transfer_id: transfer.id,
    screening_result: screening,
    passed: true
  });
}
```

**Cost**: $100-$2,000/month

---

### **Option 3: Use Plaid's Built-in Compliance** (Best if Available)

```
Plaid has a Compliance API that screens:
✅ Beneficial owners
✅ Sanctions lists
✅ PEPs (Politically Exposed Persons)

Check if available for your use case:
- Plaid Compliance (check their docs)
- Automated sanctions screening
- Integration with existing flow

If available:
✅ Simplest solution
✅ Already integrated
✅ Lower cost
```

---

## 📊 Responsibility Matrix

```
                    Chimoney Screens    You Implement      Best Approach
OFAC SDN            ✅ Maybe            ❌ If needed       Verify Chimoney
AML/KYC             ✅ Probably         ❌ Optional        Verify Chimoney
Transaction Review  ❓ Unknown          ✅ You should      Monitor patterns
SAR Filing          ✅ They handle      ❌ They handle     Chimoney files
Record Keeping      Both               Both               Document both
```

---

## 📝 Minimum Documentation You Need (MVP)

### **Even if Chimoney Screens, You Must Document:**

```
1. Compliance Policy
   - Your AML/KYC procedures
   - Risk assessment framework
   - Who screens and how
   - How you handle failures

2. OFAC Screening Records
   - Copy of Chimoney's screening
   - Dates of screening
   - Results
   - Any overrides/exceptions

3. Incident Log
   - Any failed screenings
   - How they were handled
   - SARs filed (if any)
   - Resolution

4. Audit Trail
   - When transfers happened
   - Who sent them
   - Who received them
   - Amounts
```

### **Template for Your Records:**

```sql
CREATE TABLE ofac_screening_records (
  id UUID PRIMARY KEY,
  transfer_id UUID,

  -- What was screened
  sender_name TEXT,
  recipient_name TEXT,
  recipient_country VARCHAR(3),
  amount DECIMAL(15,2),

  -- Screening details
  screening_provider VARCHAR(50),  -- 'chimoney' or service name
  screening_timestamp TIMESTAMP,
  screening_result JSON,

  -- Result
  passed BOOLEAN,
  risk_score DECIMAL(3,2),
  reason_if_failed TEXT,

  -- Action
  transferred BOOLEAN,
  sar_filed BOOLEAN,
  sar_reference TEXT,

  created_at TIMESTAMP
);
```

---

## 🚀 MVP Approach: 3-Step Implementation

### **Step 1: Verify Chimoney** (Day 1)
```
Email Chimoney asking about OFAC screening
Get written confirmation
Document their procedures
```

### **Step 2: Create Audit Log** (Day 2)
```sql
-- Create table to log screening attempts
CREATE TABLE transfer_compliance_checks (
  id UUID PRIMARY KEY,
  transfer_id UUID,
  check_type VARCHAR(50),  -- 'ofac', 'kyc', 'aml'
  provider VARCHAR(50),    -- 'chimoney'
  passed BOOLEAN,
  result JSONB,
  checked_at TIMESTAMP
);
```

### **Step 3: Document in Privacy Policy** (Day 3)
```
"We use Chimoney to process transfers, which includes
OFAC screening to comply with US sanctions regulations.
Your transaction will be screened against government
watchlists before processing."
```

---

## ⚠️ High-Risk Scenarios (When to File SAR)

**If you see these patterns, Chimoney SHOULD flag:**

```
🚨 Red Flags:
- Transfer to/from sanctioned countries (Iran, North Korea, Syria)
- Recipient name matches SDN list
- Suspicious amount (just under $10K = "structuring")
- Rapid repeated transfers
- Recipient is shell company
- Known PEP (Politically Exposed Person)
- Transfer to different country than stated destination

🚨 What Happens:
1. Chimoney blocks transfer
2. You're notified
3. They file SAR with FinCEN
4. Transfer is permanently blocked
5. No SAR refund possible
```

---

## 📊 For Your MVP

**Recommended Path:**

```
Week 1:
✅ Contact Chimoney about OFAC screening
✅ Get written confirmation
✅ Document their procedures

Week 2:
✅ Create compliance log table
✅ Add to Privacy Policy
✅ Test with real transfer

Week 3:
✅ Monitor first transfers
✅ Keep audit records
✅ Ready for launch

Cost: $0 (if Chimoney handles it)
```

---

## 🔐 What NOT to Do

```
❌ Don't skip screening entirely
   - Illegal, major penalties

❌ Don't implement screening incorrectly
   - False positives = blocked legitimate transfers
   - False negatives = compliance failures

❌ Don't file false SARs
   - Criminal offense

❌ Don't ignore red flags
   - Liable for sanctions violations

❌ Don't miss screening deadlines
   - Screen BEFORE transferring

❌ Don't delete screening records
   - Must keep 5 years for audit
```

---

## 💡 Quick Decision Tree

```
Does Chimoney screen for OFAC?
├─ YES (confirmed in writing)
│  └─ Do minimum: Document + Log
│     Cost: $0
│     Effort: 1 day
│
├─ NO
│  └─ Integrate third-party screening
│     Cost: $100-$2,000/month
│     Effort: 1 week
│
└─ MAYBE (unclear)
   └─ Assume NO until confirmed
      Add your own screening
```

---

## ✅ Action Items for You

```
IMMEDIATE (Today):
[ ] Email Chimoney: "Do you screen OFAC?"
[ ] Save response
[ ] Document their procedures

THIS WEEK:
[ ] Create compliance_checks table
[ ] Update Privacy Policy
[ ] Test with low-amount transfer

BEFORE LAUNCH:
[ ] Verify Chimoney screening works
[ ] Review audit logs
[ ] Check compliance documentation is in place
```

---

## 📞 Bottom Line

**For MVP:**
1. **Verify Chimoney handles OFAC** (email them)
2. **Create audit log** to document screening
3. **Update Privacy Policy** to mention screening
4. **Keep records** for 5 years

**Cost**: $0-100 (mostly your time)

**If Chimoney doesn't screen:**
1. Add ComplyAdvantage or similar ($500/month)
2. Implement screening in API
3. Log all screening attempts

---

## 🎯 My Recommendation

**Assume Chimoney screens, but verify:**

```javascript
// Email Chimoney ASAP:
"Hi Chimoney,

We're integrating your API for international transfers
(USD → INR). For compliance, we need to confirm you
screen against OFAC SDN list.

Can you provide:
1. Confirmation you screen
2. Which lists you check
3. Your AML procedures
4. How you handle failures

Thanks,
[Your team]"

// Then:
✅ Document their response
✅ Create audit log table
✅ Add to Privacy Policy
✅ Move forward with MVP

// If they DON'T screen:
⚠️ Stop and add screening API
❌ Cannot launch without OFAC screening
```

**Ready to move forward with this approach?**

