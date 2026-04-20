# P2P vs P2M Detection - Demo Examples

## Quick Reference Guide

This guide shows how the automatic detection works for different QR code types in your Vitta TravelPay demo.

## Detection at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    UPI QR Code Scanned                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────────┐
            │    Parse QR Parameters         │
            │  - Merchant Code (mc)          │
            │  - Amount (am)                 │
            │  - Organization ID (orgid)     │
            │  - QR Mode (mode)              │
            └───────────────────────────────┘
                            ↓
        ┌─────────────────────────────────────┐
        │      Automatic Detection Logic       │
        │                                      │
        │  Has merchant code (mc)?    ───Yes──┐
        │          ↓                           │
        │         No                           │
        │          ↓                           │
        │  Has orgid?          ───────Yes──────┤
        │          ↓                           │
        │         No                           │
        │          ↓                           │
        │  Static QR + Amount? ───────Yes──────┤
        │          ↓                           │
        │         No                           ↓
        │          ↓                      P2M Payment
        │     P2P Payment                      │
        └──────────────────────────────────────┘
                     ↓                         ↓
        ┌──────────────────────┐  ┌─────────────────────────┐
        │  Transfer Purpose:    │  │  Transfer Purpose:       │
        │  "Sending money to    │  │  "Business/Travel        │
        │   family or friends"  │  │   expenses - Retail"     │
        │                       │  │                          │
        │  Clearing: Instant    │  │  Clearing: Fast          │
        │  (IMPS P2P)           │  │  (Commercial Channel)    │
        └──────────────────────┘  └─────────────────────────┘
```

## Example 1: Grocery Store (P2M)

### QR Code String:
```
upi://pay?pa=supermart@hdfc&pn=SuperMart&mc=5411&am=356.75&cu=INR
```

### Detection Process:
```javascript
{
  merchantCode: "5411",  // ✅ Grocery Store MCC
  amount: 356.75,
  upiId: "supermart@hdfc",
  payeeName: "SuperMart"
}

↓ Detection Result:

{
  paymentType: "P2M",
  transferPurpose: "Business/Travel expenses - Retail purchase",
  merchantCategory: "Grocery Store",
  detectionReasons: {
    merchantCode: true,     // ✅ Primary indicator
    staticQR: false,
    organizationId: false,
    preFilledAmount: true
  }
}
```

### What Happens:
1. User scans QR at store checkout
2. System detects merchant code `5411`
3. Automatically categorizes as Grocery Store
4. Selects business travel purpose
5. ⚡ **Fast commercial clearing** - No delay!

---

## Example 2: Restaurant (P2M)

### QR Code String:
```
upi://pay?pa=cafedelight@paytm&pn=Cafe Delight&mc=5812&mode=02
```

### Detection Process:
```javascript
{
  merchantCode: "5812",  // ✅ Restaurant MCC
  amount: 0,             // User enters amount
  upiId: "cafedelight@paytm",
  payeeName: "Cafe Delight",
  mode: "02"             // ✅ Static merchant QR
}

↓ Detection Result:

{
  paymentType: "P2M",
  transferPurpose: "Business/Travel expenses - Retail purchase",
  merchantCategory: "Restaurant/Dining",
  detectionReasons: {
    merchantCode: true,     // ✅ Primary indicator
    staticQR: true,        // ✅ Secondary confirmation
    organizationId: false,
    preFilledAmount: false
  }
}
```

### What Happens:
1. User scans static QR on restaurant table
2. System detects merchant code `5812` + static mode
3. Automatically categorizes as Restaurant
4. User enters bill amount manually
5. ⚡ **Fast clearing** through commercial channel

---

## Example 3: Paying a Friend (P2P)

### QR Code String:
```
upi://pay?pa=john.doe@okaxis&pn=John Doe
```

### Detection Process:
```javascript
{
  merchantCode: "",      // ❌ No merchant code
  amount: 0,
  upiId: "john.doe@okaxis",
  payeeName: "John Doe"
}

↓ Detection Result:

{
  paymentType: "P2P",
  transferPurpose: "Sending money to family or friends",
  merchantCategory: null,
  detectionReasons: {
    merchantCode: false,    // ❌ No indicators for merchant
    staticQR: false,
    organizationId: false,
    preFilledAmount: false
  }
}
```

### What Happens:
1. User scans friend's personal QR code
2. System finds no merchant indicators
3. Automatically categorizes as personal payment
4. User enters amount to send
5. ⚡ **Instant P2P clearing** (IMPS) - No delay!

---

## Example 4: Verified Merchant (P2M)

### QR Code String:
```
upi://pay?pa=merchant@icici&pn=Electronics Hub&orgid=ORG12345&am=2999
```

### Detection Process:
```javascript
{
  merchantCode: "",            // Missing primary indicator
  amount: 2999,
  upiId: "merchant@icici",
  payeeName: "Electronics Hub",
  orgid: "ORG12345"           // ✅ Verified merchant account
}

↓ Detection Result:

{
  paymentType: "P2M",
  transferPurpose: "Business/Travel expenses - Retail purchase",
  merchantCategory: "Merchant",  // Generic (no MCC)
  detectionReasons: {
    merchantCode: false,
    staticQR: false,
    organizationId: true,      // ✅ Organization verified
    preFilledAmount: true
  }
}
```

### What Happens:
1. User scans QR at electronics store
2. No merchant code, but has organization ID
3. System detects verified merchant account
4. Automatically categorizes as business payment
5. ⚡ **Fast commercial clearing**

---

## Example 5: Sending Money Home (P2P)

### QR Code String:
```
upi://pay?pa=mom.smith@sbi&pn=Sarah Smith&mc=0000&am=5000
```

### Detection Process:
```javascript
{
  merchantCode: "0000",  // ✅ Explicit P2P indicator
  amount: 5000,
  upiId: "mom.smith@sbi",
  payeeName: "Sarah Smith"
}

↓ Detection Result:

{
  paymentType: "P2P",
  transferPurpose: "Sending money to family or friends",
  merchantCategory: null,
  detectionReasons: {
    merchantCode: false,    // "0000" = not a merchant
    staticQR: false,
    organizationId: false,
    preFilledAmount: true
  }
}
```

### What Happens:
1. User scans family member's QR
2. System detects merchant code `0000` (P2P indicator)
3. Automatically categorizes as family transfer
4. Amount already filled in QR
5. ⚡ **Instant IMPS clearing** - Perfect for family transfers!

---

## Console Output During Demo

When you run the demo, you'll see these logs:

### For P2M Payment:
```
[WiseTransferService] Payment type detected: P2M
[WiseTransferService] Transfer purpose: Business/Travel expenses - Retail purchase
[WiseTransferService] Merchant category: Grocery Store
[WiseTransferService] Creating transfer in Wise API...
```

### For P2P Payment:
```
[WiseTransferService] Payment type detected: P2P
[WiseTransferService] Transfer purpose: Sending money to family or friends
[WiseTransferService] Creating transfer in Wise API...
```

---

## Testing the Detection

You can test the detection logic with different QR formats:

```bash
npm test -- upiTypeDetector.test.js
```

This runs 16 test cases covering:
- Various merchant codes
- Organization IDs
- Static vs dynamic QRs
- Pre-filled amounts
- Real-world scenarios

---

## Common Merchant Codes in Demo

| Code | Category | Example Merchants |
|------|----------|-------------------|
| 5411 | Grocery Store | SuperMart, Reliance Fresh |
| 5812 | Restaurant | Cafe Coffee Day, Domino's |
| 5814 | Fast Food | McDonald's, KFC |
| 5541 | Gas Station | HP Petrol, Indian Oil |
| 5999 | General Retail | Local shops, street vendors |
| 5912 | Pharmacy | Apollo Pharmacy, MedPlus |

---

## Why This Eliminates the Delay

### Before (Hardcoded Purpose):
```
User scans QR → All payments use "family" purpose →
  ↓
Merchant payments routed through wrong channel →
  ↓
⏱️ DELAY while payment reroutes →
  ↓
Finally processed through correct channel
```

### After (Auto-Detection):
```
User scans QR → System detects payment type →
  ↓
Correct purpose selected automatically →
  ↓
⚡ INSTANT routing to correct channel →
  ↓
No delay - processed immediately!
```

---

## Key Benefits in Your Demo

1. **Seamless UX**: User just scans and pays - no manual selection needed
2. **Faster Processing**: Each payment type uses its optimal clearing channel
3. **Smart Categorization**: System knows if you're paying a store or a friend
4. **Future-Proof**: Easy to add new merchant categories as needed
5. **Transparent Logging**: Clear console output shows detection reasoning

---

## Need Help?

If you see unexpected detection results:
1. Check the console logs for detection details
2. Look at the `merchant_code` in the QR string
3. Verify the UPI scan was saved correctly in database
4. Review the detection logic in `utils/upiTypeDetector.js`

Happy testing! 🎉
