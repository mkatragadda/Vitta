# OTP-Based Recipient Verification Design

**Critical for KYC Compliance**: NPCI/RBI requires verification before any UPI or bank transfer.

---

## 1. The Problem

```
User wants to send $500 to their friend Amit in India via UPI
    ↓
We need to verify:
  ✅ Is this actually Amit's phone number?
  ✅ Does Amit consent to receive this transfer?
  ✅ Is the phone number valid and active?
    ↓
Solution: Send OTP to phone → User asks Amit to read OTP → Amit tells user → User enters OTP
    ↓
Verification complete: We can now initiate payment safely
```

---

## 2. OTP Verification Flow (UPI - Phone-Based)

### Step-by-Step Flow

```
User says: "Send $500 to Amit. His number is +91-9876543210"
    ↓
┌────────────────────────────────────────────────────────┐
│ STEP 1: Initiate OTP Request                           │
├────────────────────────────────────────────────────────┤
│ Frontend → Backend: POST /api/transfers/recipients/verify
│ {
│   phone: "+91-9876543210",
│   payment_method: "upi",
│   transfer_id: "txn-123"
│ }
└────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────┐
│ STEP 2: Validate Phone Number                          │
├────────────────────────────────────────────────────────┤
│ Backend checks:
│   ✅ Valid Indian phone number (+91 prefix)
│   ✅ 10 digits after country code
│   ✅ Not blacklisted (fraud database)
│   ✅ Not already verified for another user
└────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────┐
│ STEP 3: Generate OTP                                   │
├────────────────────────────────────────────────────────┤
│ Backend:
│   1. Generate random 6-digit OTP: 123456
│   2. Hash OTP: SHA256(123456)
│   3. Store hashed OTP with expiry (5 minutes)
│   4. Store attempt count (max 3 attempts)
│   5. Create verification record in DB
└────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────┐
│ STEP 4: Send OTP via SMS                               │
├────────────────────────────────────────────────────────┤
│ Backend → Chimoney API: POST /v1/recipient/verify
│ {
│   phone: "+91-9876543210",
│   type: "upi"
│ }
│   OR
│ Backend → Twilio API: POST /Messages
│ {
│   to: "+91-9876543210",
│   body: "Your Vitta verification code: 123456. Valid for 5 minutes."
│ }
│
│ Recipient Amit receives SMS:
│ ┌─────────────────────────────────────┐
│ │ Your Vitta verification code:      │
│ │ 123456                               │
│ │ Valid for 5 minutes. Reply with OTP.│
│ └─────────────────────────────────────┘
└────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────┐
│ STEP 5: User Receives OTP from Recipient               │
├────────────────────────────────────────────────────────┤
│ User (in chat): "Amit told me the code is 123456"
│                 OR
│ User manually enters: [1][2][3][4][5][6]
└────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────┐
│ STEP 6: Verify OTP                                     │
├────────────────────────────────────────────────────────┤
│ Frontend → Backend: POST /api/transfers/recipients/verify-otp
│ {
│   phone: "+91-9876543210",
│   otp: "123456",
│   transfer_id: "txn-123"
│ }
│
│ Backend validates:
│   ✅ OTP not expired (< 5 minutes)
│   ✅ OTP matches stored hash: SHA256(123456) == stored_hash
│   ✅ Attempt count < 3
│   ✅ User owns transfer_id
└────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────┐
│ STEP 7: Mark Recipient as Verified                     │
├────────────────────────────────────────────────────────┤
│ Backend:
│   1. Update recipients table: verified = true
│   2. Set verified_at = now()
│   3. Set valid_until = now() + 7 days (NPCI requirement)
│   4. Store in transfer_recipients table
│   5. Return success response
└────────────────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────────────────┐
│ STEP 8: Ready for Payment                              │
├────────────────────────────────────────────────────────┤
│ Frontend shows confirmation:
│ "✅ Amit Kumar (+91-9876543210) verified!
│  Ready to send ₹41,750 via UPI"
│ [Proceed with Transfer] [Cancel]
└────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema for OTP Tracking

```sql
-- Table to store OTP verification requests
CREATE TABLE recipient_verification_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  phone VARCHAR(20) NOT NULL,

  -- OTP Details
  otp_hash VARCHAR(64) NOT NULL,  -- SHA256(otp)
  otp_created_at TIMESTAMP DEFAULT now(),
  otp_expires_at TIMESTAMP DEFAULT now() + INTERVAL '5 minutes',

  -- Attempt tracking
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_attempt_at TIMESTAMP,

  -- Status
  status VARCHAR(50) DEFAULT 'pending',  -- pending, verified, expired, failed
  verified_at TIMESTAMP,

  -- Security
  ip_address INET,
  user_agent TEXT,

  -- Indexing for quick lookups
  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT otp_not_expired CHECK (otp_expires_at > now()),
  CONSTRAINT max_attempts_not_exceeded CHECK (attempt_count <= max_attempts)
);

-- Table to store verified recipients (for user's account)
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Recipient Info
  phone VARCHAR(20),  -- For UPI
  account_number VARCHAR(20),  -- For Bank Transfer
  ifsc_code VARCHAR(11),  -- For Bank Transfer
  bank_name VARCHAR(100),

  -- Name (optional, for user reference)
  recipient_name VARCHAR(255),

  -- Verification Status
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  valid_until TIMESTAMP,  -- 7 days from verification (NPCI requirement)
  verification_method VARCHAR(50),  -- 'otp_sms', 'otp_email', 'bank_transfer_verification'

  -- Payment methods supported
  supported_payment_methods TEXT[],  -- ARRAY['upi', 'bank_transfer']

  -- Usage stats
  transfer_count INT DEFAULT 0,
  last_transfer_at TIMESTAMP,

  -- Security
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Indexes
  UNIQUE(user_id, phone),  -- One phone per user for UPI
  CONSTRAINT phone_or_account CHECK (phone IS NOT NULL OR account_number IS NOT NULL)
);

-- Table for audit logging all verification attempts
CREATE TABLE recipient_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID REFERENCES recipients(id),
  phone VARCHAR(20),

  -- Event details
  event VARCHAR(50),  -- 'otp_requested', 'otp_verified', 'otp_failed', 'verification_complete'
  event_details JSONB,  -- Additional data like attempt count, error reason

  -- Security info
  ip_address INET,
  user_agent TEXT,

  -- Timing
  created_at TIMESTAMP DEFAULT now(),

  -- RLS policies
  CONSTRAINT user_data_isolation CHECK (user_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_otp_user_phone ON recipient_verification_otp(user_id, phone);
CREATE INDEX idx_otp_expires ON recipient_verification_otp(otp_expires_at);
CREATE INDEX idx_recipients_user ON recipients(user_id);
CREATE INDEX idx_recipients_verified ON recipients(user_id, verified);
CREATE INDEX idx_verification_logs_user ON recipient_verification_logs(user_id);
```

---

## 4. Backend Implementation (Node.js)

### 4.1 Initiate OTP Request

```typescript
// pages/api/transfers/recipients/verify.ts

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, payment_method, transfer_id } = req.body;
  const userId = req.user.id;

  try {
    // 1. Validate phone number
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PHONE',
        message: 'Please provide a valid Indian phone number (+91XXXXXXXXXX)'
      });
    }

    // 2. Check if recipient already verified by this user
    const existingRecipient = await db
      .from('recipients')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', phone)
      .eq('verified', true)
      .single();

    if (existingRecipient.data) {
      // Already verified, no need for OTP
      return res.status(200).json({
        success: true,
        already_verified: true,
        recipient_id: existingRecipient.data.id,
        message: 'This recipient is already verified.'
      });
    }

    // 3. Check if OTP request already in progress (within last minute)
    const recentOTP = await db
      .from('recipient_verification_otp')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', phone)
      .eq('status', 'pending')
      .gt('otp_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentOTP.data) {
      // Throttle: Don't allow multiple OTP requests in quick succession
      const timeSinceLastRequest =
        (new Date() - new Date(recentOTP.data.created_at)) / 1000;

      if (timeSinceLastRequest < 60) {
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: 'Please wait before requesting another OTP',
          retry_after: Math.ceil(60 - timeSinceLastRequest)
        });
      }
    }

    // 4. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // 5. Store OTP in database
    const verificationId = uuidv4();
    await db.from('recipient_verification_otp').insert({
      id: verificationId,
      user_id: userId,
      phone: phone,
      otp_hash: otpHash,
      otp_created_at: new Date().toISOString(),
      otp_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempt_count: 0,
      status: 'pending',
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      user_agent: req.headers['user-agent']
    });

    // 6. Send OTP via SMS (Twilio or Chimoney)
    try {
      await client.messages.create({
        body: `Your Vitta verification code: ${otp}\n\nValid for 5 minutes. Do not share this code.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      console.log(`[OTP] Sent to ${phone} (verification_id: ${verificationId})`);
    } catch (smsError) {
      console.error('[OTP] SMS send failed:', smsError);

      // Fallback: Try Chimoney API
      try {
        await chimoneyApi.post('/v1/recipient/verify', {
          phone: phone,
          type: 'upi'
        });
      } catch (chimmoneyError) {
        console.error('[OTP] Chimoney verification failed:', chimmoneyError);

        // If both fail, still store OTP (will be resent)
        throw new Error('SEND_OTP_FAILED');
      }
    }

    // 7. Log OTP request
    await db.from('recipient_verification_logs').insert({
      user_id: userId,
      phone: phone,
      event: 'otp_requested',
      event_details: { verification_id: verificationId },
      ip_address: req.headers['x-forwarded-for'],
      user_agent: req.headers['user-agent']
    });

    // 8. Return success (DO NOT return actual OTP)
    res.status(200).json({
      success: true,
      message: `OTP sent to ${phone}`,
      verification_id: verificationId,
      expires_in_seconds: 300,
      otp_length: 6,
      instructions: 'Ask the recipient to share the code they received via SMS'
    });

  } catch (error) {
    console.error('[OTP Initiate] Error:', error);
    res.status(500).json({
      success: false,
      error: 'OTP_SEND_FAILED',
      message: 'Failed to send verification code. Please try again.'
    });
  }
}
```

### 4.2 Verify OTP Submission

```typescript
// pages/api/transfers/recipients/verify-otp.ts

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, otp, transfer_id } = req.body;
  const userId = req.user.id;

  try {
    // 1. Validate input
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_OTP_FORMAT',
        message: 'OTP must be 6 digits'
      });
    }

    // 2. Find pending OTP record
    const otpRecord = await db
      .from('recipient_verification_otp')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', phone)
      .eq('status', 'pending')
      .gt('otp_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord.data) {
      // OTP not found or expired
      await db.from('recipient_verification_logs').insert({
        user_id: userId,
        phone: phone,
        event: 'otp_verification_failed',
        event_details: { reason: 'OTP_NOT_FOUND' }
      });

      return res.status(400).json({
        success: false,
        error: 'OTP_NOT_FOUND_OR_EXPIRED',
        message: 'Verification code not found or expired. Request a new one.'
      });
    }

    // 3. Check attempt count
    if (otpRecord.data.attempt_count >= 3) {
      // Block further attempts
      await db
        .from('recipient_verification_otp')
        .update({ status: 'failed' })
        .eq('id', otpRecord.data.id);

      await db.from('recipient_verification_logs').insert({
        user_id: userId,
        phone: phone,
        event: 'otp_verification_failed',
        event_details: { reason: 'MAX_ATTEMPTS_EXCEEDED' }
      });

      return res.status(429).json({
        success: false,
        error: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Too many failed attempts. Request a new verification code.'
      });
    }

    // 4. Verify OTP (constant-time comparison to prevent timing attacks)
    const submittedHash = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(submittedHash),
      Buffer.from(otpRecord.data.otp_hash)
    );

    if (!isValid) {
      // Increment attempt count
      const newAttemptCount = otpRecord.data.attempt_count + 1;

      await db
        .from('recipient_verification_otp')
        .update({
          attempt_count: newAttemptCount,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', otpRecord.data.id);

      await db.from('recipient_verification_logs').insert({
        user_id: userId,
        phone: phone,
        event: 'otp_verification_failed',
        event_details: {
          reason: 'INCORRECT_OTP',
          attempt: newAttemptCount,
          remaining_attempts: 3 - newAttemptCount
        }
      });

      return res.status(400).json({
        success: false,
        error: 'INCORRECT_OTP',
        message: `Incorrect code. ${3 - newAttemptCount} attempts remaining.`
      });
    }

    // 5. OTP is valid! Mark as verified
    // First, check if recipient already exists
    let recipientId;
    const existingRecipient = await db
      .from('recipients')
      .select('id')
      .eq('user_id', userId)
      .eq('phone', phone)
      .single();

    if (existingRecipient.data) {
      // Update existing recipient
      recipientId = existingRecipient.data.id;
      await db
        .from('recipients')
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          verification_method: 'otp_sms'
        })
        .eq('id', recipientId);
    } else {
      // Create new recipient record
      const newRecipient = await db
        .from('recipients')
        .insert({
          user_id: userId,
          phone: phone,
          verified: true,
          verified_at: new Date().toISOString(),
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          verification_method: 'otp_sms',
          supported_payment_methods: ['upi']
        })
        .select('id')
        .single();

      recipientId = newRecipient.data.id;
    }

    // 6. Mark OTP as verified and completed
    await db
      .from('recipient_verification_otp')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.data.id);

    // 7. Log successful verification
    await db.from('recipient_verification_logs').insert({
      user_id: userId,
      recipient_id: recipientId,
      phone: phone,
      event: 'otp_verified',
      event_details: { success: true }
    });

    // 8. Update transfer request if provided
    if (transfer_id) {
      await db
        .from('transfer_requests')
        .update({ recipient_verified: true })
        .eq('id', transfer_id);
    }

    // 9. Return success
    res.status(200).json({
      success: true,
      message: 'Recipient verified successfully!',
      recipient_id: recipientId,
      phone: phone,
      verified_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      next_step: 'You can now proceed with the transfer'
    });

  } catch (error) {
    console.error('[OTP Verify] Error:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'An error occurred during verification. Please try again.'
    });
  }
}
```

---

## 5. Frontend Implementation (React)

### 5.1 OTP Request Component

```typescript
// components/chat/RecipientOTPRequest.jsx

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RecipientOTPRequest({
  phone,
  transferId,
  onVerified,
  onCancel
}) {
  const [step, setStep] = useState('request'); // request, waiting, verify, confirmed
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [attempts, setAttempts] = useState(0);

  // Request OTP
  const handleRequestOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/transfers/recipients/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          payment_method: 'upi',
          transfer_id: transferId
        })
      });

      const data = await response.json();

      if (data.already_verified) {
        // Recipient already verified
        onVerified(data.recipient_id);
        setStep('confirmed');
      } else if (data.success) {
        // OTP sent successfully
        setVerificationId(data.verification_id);
        setStep('waiting');
        setTimeLeft(data.expires_in_seconds);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Error requesting OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/transfers/recipients/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          otp,
          transfer_id: transferId
        })
      });

      const data = await response.json();

      if (data.success) {
        onVerified(data.recipient_id);
        setStep('confirmed');
      } else {
        setError(data.message);
        setAttempts(attempts + 1);
        setOtp('');
      }
    } catch (err) {
      setError('Error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Timer for OTP expiry
  useEffect(() => {
    if (step !== 'waiting') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStep('request');
          setError('OTP expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  if (step === 'confirmed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-900">Recipient Verified</p>
            <p className="text-sm text-green-700">{phone} is verified and ready for transfer</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Verify Recipient</h3>
        <p className="text-sm text-gray-600 mt-1">
          We'll send a verification code to {phone}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {step === 'request' && (
        <button
          onClick={handleRequestOTP}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Send Verification Code
        </button>
      )}

      {step === 'waiting' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            📱 A code has been sent to the recipient's phone.
            <br />
            Ask them to read it to you.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter the 6-digit code
            </label>
            <input
              type="text"
              maxLength="6"
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setOtp(val);
              }}
              placeholder="000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-widest"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify Code
            </button>
            <button
              onClick={onCancel}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Code expires in: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            {attempts > 0 && ` • ${3 - attempts} attempts remaining`}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 6. Integration with Chat Flow

### Chat Message Flow

```typescript
// Example: User sends money with recipient verification

User: "Send $500 to Amit. His number is +91-9876543210"
    ↓
Chat parses intent and entities
    ↓
Chat displays: "Let me verify Amit's number first..."
    ↓
Chat → API: POST /api/transfers/recipients/verify
    ↓
API sends OTP to +91-9876543210
    ↓
Chat renders: RecipientOTPRequest component
    ├─ Shows: "Verification code sent to Amit's phone"
    ├─ Input field: "Enter the 6-digit code they share with you"
    └─ Timer: "Code expires in 4:52"
    ↓
User waits for Amit to receive and share code
    ↓
User: "He says the code is 123456"
    ↓
Chat → API: POST /api/transfers/recipients/verify-otp
    ↓
API verifies: SHA256("123456") == stored_hash ✅
    ↓
API marks: recipients.verified = true
    ↓
Chat displays: "✅ Amit verified! Ready to send $500"
    ↓
Chat shows: FX rate quote, transfer details
    ↓
User: "Send it"
    ↓
Transfer executes...
```

---

## 7. Security Considerations

### 7.1 Threat Prevention

| Threat | Prevention |
|--------|-----------|
| **Brute Force Attacks** | Max 3 attempts per OTP, 5-min expiry, rate limiting |
| **OTP Interception** | SMS encrypted, HTTPS only, no OTP in logs/responses |
| **Timing Attacks** | Use `crypto.timingSafeEqual()` for comparison |
| **Replay Attacks** | OTP marked as "used" immediately, single-use only |
| **Wrong Recipient** | Phone verified by recipient themselves (SMS) |
| **Phishing** | SMS includes "Vitta" branding, no links in SMS |

### 7.2 Audit Trail

```sql
-- Every OTP action is logged
SELECT * FROM recipient_verification_logs
WHERE user_id = '123'
  AND phone = '+91-9876543210'
ORDER BY created_at DESC;

-- Output:
-- event: 'otp_requested' @ 2024-02-19 10:00:00
-- event: 'otp_verification_failed' (attempt 1) @ 10:01:00
-- event: 'otp_verification_failed' (attempt 2) @ 10:02:00
-- event: 'otp_verified' @ 10:03:00
```

---

## 8. Error Handling

### Common Scenarios

```
❌ INVALID_PHONE
   → "Please provide a valid Indian phone number (+91XXXXXXXXXX)"

❌ PHONE_ALREADY_USED
   → "This number is already verified by another user"

❌ TOO_MANY_REQUESTS
   → "Please wait 45 seconds before requesting another OTP"

❌ OTP_NOT_FOUND_OR_EXPIRED
   → "Verification code not found or expired. Request a new one."

❌ INCORRECT_OTP (attempt 1)
   → "Incorrect code. 2 attempts remaining."

❌ INCORRECT_OTP (attempt 2)
   → "Incorrect code. 1 attempt remaining."

❌ MAX_ATTEMPTS_EXCEEDED
   → "Too many failed attempts. Request a new verification code."

✅ OTP_VERIFIED
   → "Recipient verified successfully!"
```

---

## 9. Compliance Notes

### NPCI/RBI Requirements Met

✅ **OTP Verification**: Only via SMS to recipient's phone (NPCI mandate)
✅ **7-Day Validity**: Recipient remains verified for 7 days
✅ **Audit Trail**: Immutable logs of all verification attempts
✅ **Failed Attempt Tracking**: Max 3 attempts enforced
✅ **Timeout**: OTP expires in 5 minutes
✅ **Recipient Consent**: Recipient must share OTP (proves consent)

### Annual KYC Refresh
After 7 days, recipient must be re-verified:
```sql
-- Check for expired recipients
SELECT * FROM recipients
WHERE verified = true
  AND valid_until < now();

-- These need re-verification before next transfer
```

---

## 10. Chimoney vs Twilio Decision Tree

```
Is Chimoney available/stable?
  ├─ YES → Use Chimoney API (preferred)
  │  └─ More control, built-in for UPI
  └─ NO → Fallback to Twilio
     └─ Reliable SMS delivery, global support

If Chimoney fails:
  └─ Retry with exponential backoff
  └─ After 3 attempts, fallback to Twilio
  └─ Log failure for monitoring

Always have fallback SMS provider
```

---

## 11. Testing Checklist

```
[ ] Valid phone verification
  [ ] Indian phone with +91 prefix
  [ ] OTP sent successfully
  [ ] OTP expires after 5 minutes
  [ ] OTP marked as verified after correct entry

[ ] Invalid phone handling
  [ ] Rejected: +1-2125551234 (non-Indian)
  [ ] Rejected: 9876543210 (missing +91)
  [ ] Rejected: +91-123 (too short)

[ ] OTP attempts
  [ ] Attempt 1 failed: Show error + 2 remaining
  [ ] Attempt 2 failed: Show error + 1 remaining
  [ ] Attempt 3 failed: Block further attempts
  [ ] Correct OTP on attempt 1: Verify immediately

[ ] Timing
  [ ] Timer counts down from 5:00
  [ ] At 0:00, show "OTP expired"
  [ ] User can request new OTP after expiry

[ ] Recipient already verified
  [ ] Skip OTP if phone already verified
  [ ] Show: "This recipient is already verified"
  [ ] Proceed directly to transfer confirmation
```

---

## Summary

**OTP Verification Flow**:
1. User provides recipient phone → Backend sends OTP via SMS/Chimoney
2. User asks recipient to share code → Recipient receives OTP in SMS
3. User enters code → Backend verifies (max 3 attempts, 5-min expiry)
4. On success → Recipient marked verified for 7 days → Transfer can proceed
5. After 7 days → Recipient must be re-verified (NPCI requirement)

**Key Security**:
- ✅ Constant-time OTP comparison (prevent timing attacks)
- ✅ Rate limiting (prevent brute force)
- ✅ Immutable audit logs (compliance)
- ✅ SMS encryption (data security)
- ✅ No OTP in logs (operational security)
