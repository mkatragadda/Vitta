# Automatic P2P vs P2M Detection for Vitta TravelPay

## Problem Statement

When users scan UPI QR codes to make payments through Vitta TravelPay, the system was experiencing a "Sending" delay because it couldn't differentiate between:
- **P2P (Person-to-Person)**: Personal payments to friends/family
- **P2M (Person-to-Merchant)**: Business payments to shops, restaurants, etc.

This delay occurred because the transfer purpose was hardcoded to "Sending money to family", which caused slower processing for merchant payments that should use faster commercial clearing channels.

## Solution Overview

We've implemented automatic detection that analyzes the UPI QR code parameters to determine the payment type and select the optimal Wise transfer purpose for faster clearing.

## How It Works

### 1. Detection Logic (`utils/upiTypeDetector.js`)

The system examines multiple indicators from the UPI QR code:

#### Primary Indicator: Merchant Code (mc parameter)
- **P2M Payment**: Has a 4-digit merchant category code (e.g., 5411 for Grocery, 5812 for Restaurant)
- **P2P Payment**: Either missing the mc parameter or has '0000'

#### Secondary Indicators:
- **Organization ID (orgid)**: Presence indicates a verified merchant account
- **QR Mode (mode=02)**: Static merchant QR code
- **Pre-filled Amount**: Dynamic merchant QR generated at POS terminal

### 2. Transfer Purpose Selection

Based on detection, the system automatically selects the appropriate transfer purpose:

| Payment Type | Transfer Purpose | Clearing Channel |
|--------------|------------------|------------------|
| P2M (Merchant) | "Business/Travel expenses - Retail purchase" | Fast commercial clearing |
| P2P (Personal) | "Sending money to family or friends" | Instant P2P clearing (IMPS) |

### 3. Integration Flow

```
1. User scans QR code
   ↓
2. UPI parser extracts merchant code and parameters
   ↓
3. Data saved to database (upi_scans table)
   ↓
4. Transfer service fetches scan data
   ↓
5. Detection utility analyzes parameters
   ↓
6. Appropriate transfer purpose selected automatically
   ↓
7. Wise transfer created with optimal purpose
   ↓
8. ✅ Fast clearing based on payment type
```

## Implementation Details

### Files Modified

1. **`utils/upiTypeDetector.js`** (NEW)
   - Detection logic for P2P vs P2M
   - Merchant category code mapping
   - Transfer purpose selection

2. **`services/wise/wiseTransferService.js`** (MODIFIED)
   - Imports detection utility
   - Fetches UPI scan data before creating transfer
   - Dynamically sets transfer purpose based on detection

3. **`utils/__tests__/upiTypeDetector.test.js`** (NEW)
   - Comprehensive test coverage for detection logic
   - Real-world scenario validation

### Database Schema

The existing `upi_scans` table already stores the necessary data:
- `merchant_code`: 4-digit MCC code from QR
- `amount`: Pre-filled amount (if any)
- `raw_qr_data`: Complete QR string for additional parsing

## Merchant Category Codes

Common codes recognized by the system:

| Code | Category |
|------|----------|
| 5411 | Grocery Store |
| 5812 | Restaurant/Dining |
| 5814 | Fast Food |
| 5541 | Gas Station |
| 5999 | Miscellaneous Retail |
| 7230 | Beauty/Barber Shop |
| 7997 | Gym/Fitness |
| 8062 | Hospital |

Unknown codes default to generic "Merchant" classification.

## Benefits

### 1. Eliminates Manual Selection
- No need for users to choose payment type
- Automatic detection based on QR code data

### 2. Faster Clearing Times
- P2M payments route through commercial channels
- P2P payments use instant IMPS clearing in India

### 3. Optimal Fee Structure
- Wise applies appropriate fee structure based on purpose
- Better compliance with payment network requirements

### 4. Better User Experience
- No "Sending" delay while waiting for purpose selection
- Seamless payment flow from scan to confirmation

## Testing

Run the test suite to verify detection logic:

```bash
npm test -- upiTypeDetector.test.js
```

All 16 tests should pass, covering:
- Merchant code detection
- Organization ID detection
- Static QR mode detection
- Various merchant categories
- Real-world payment scenarios

## Example Detection Results

### Example 1: Grocery Store Payment
```javascript
// QR: upi://pay?pa=store@hdfc&pn=SuperMart&mc=5411&am=356.75
detectPaymentType({ merchantCode: '5411', amount: 356.75 })
// Result:
// {
//   paymentType: 'P2M',
//   transferPurpose: 'Business/Travel expenses - Retail purchase',
//   merchantCategory: 'Grocery Store'
// }
```

### Example 2: Friend Payment
```javascript
// QR: upi://pay?pa=john@paytm&pn=John Doe
detectPaymentType({ merchantCode: '', amount: 0 })
// Result:
// {
//   paymentType: 'P2P',
//   transferPurpose: 'Sending money to family or friends',
//   merchantCategory: null
// }
```

## Console Logging

When a transfer is created, the service logs detection details:

```
[WiseTransferService] Payment type detected: P2M
[WiseTransferService] Transfer purpose: Business/Travel expenses - Retail purchase
[WiseTransferService] Merchant category: Restaurant/Dining
```

This helps with debugging and monitoring payment flows.

## Future Enhancements

Potential improvements for consideration:

1. **Machine Learning**: Train model on historical payment patterns
2. **UPI ID Analysis**: Detect merchant patterns in UPI addresses
3. **Amount Heuristics**: Use transaction amount to refine detection
4. **User Override**: Allow manual correction if detection is wrong
5. **Analytics Dashboard**: Track P2P vs P2M payment distributions

## Maintenance Notes

- Merchant category codes follow NPCI standards
- Update `getMerchantCategory()` when new codes are introduced
- Monitor Wise API documentation for transfer purpose changes
- Test with new QR formats as payment networks evolve

## Support

If detection seems incorrect:
1. Check console logs for detection details
2. Verify merchant_code in database (upi_scans table)
3. Review raw_qr_data for additional parameters
4. Update detection logic if new patterns emerge

---

**Implementation Date**: 2026-04-20
**Status**: ✅ Complete and Tested
**Test Coverage**: 16/16 passing
