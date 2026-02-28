# Beneficiary Frontend Components - Implementation Plan

**Status**: Ready for Implementation
**Date**: Feb 21, 2026
**Quality Standard**: Sr. Staff UI Engineer Level

---

## Component Architecture

### Component Hierarchy

```
AddBeneficiaryFlow (Orchestrator)
├── BeneficiaryFormUPI
│   ├── Input fields (name, phone, upi, relationship)
│   ├── Real-time validation
│   └── Error display
├── BeneficiaryFormBank
│   ├── Input fields (name, phone, account, ifsc, bank, relationship)
│   ├── Real-time validation
│   └── Error display
├── BeneficiaryReview
│   ├── Summary display
│   ├── Masked sensitive fields
│   └── Action buttons (Confirm, Edit, Cancel)
└── BeneficiariesList
    ├── Recipient cards
    ├── Action buttons (Delete, Use)
    └── Empty state

```

### State Management

**AddBeneficiaryFlow State**:
```javascript
{
  step: 'method-select' | 'form' | 'review' | 'loading' | 'success' | 'error',
  paymentMethod: 'upi' | 'bank_account' | null,
  formData: {
    name: string,
    phone: string,
    upiId?: string,
    account?: string,
    ifsc?: string,
    bankName?: string,
    relationship: string
  },
  errors: {
    [fieldName]: string // error message
  },
  loading: boolean,
  error: {
    code: string,
    message: string,
    suggestion: string
  } | null,
  success: {
    beneficiaryId: string,
    name: string,
    message: string
  } | null
}
```

---

## Component Specifications

### 1. BeneficiaryFormUPI Component

**File**: `components/beneficiary/BeneficiaryFormUPI.js`

**Props**:
```javascript
{
  onSubmit: (data) => Promise<void>,
  onCancel: () => void,
  loading: boolean,
  initialData?: {
    name?: string,
    phone?: string,
    upiId?: string,
    relationship?: string
  },
  errors?: { [key]: string }
}
```

**Features**:
- Name input with 2-255 character validation
- Phone input with 10-digit validation (6-9 start)
- UPI ID input with format validation (user@bank)
- Relationship select dropdown (family, friend, business, other)
- Real-time validation feedback
- Field error display below each input
- Submit button (disabled while loading)
- Cancel button

**Validation Rules**:
- Name: 2-255 characters, show error inline
- Phone: 10 digits starting with 6-9, real-time feedback
- UPI: user@bank format, show suggestion on error
- Relationship: required selection

**Styling**: Tailwind CSS with consistent spacing and colors

---

### 2. BeneficiaryFormBank Component

**File**: `components/beneficiary/BeneficiaryFormBank.js`

**Props**:
```javascript
{
  onSubmit: (data) => Promise<void>,
  onCancel: () => void,
  loading: boolean,
  initialData?: {
    name?: string,
    phone?: string,
    account?: string,
    ifsc?: string,
    bankName?: string,
    relationship?: string
  },
  errors?: { [key]: string }
}
```

**Features**:
- Name input (same as UPI form)
- Phone input (same as UPI form)
- Account number input (9-18 digits)
- IFSC code input (11 alphanumeric, auto-uppercase)
- Bank name input
- Relationship dropdown
- Real-time validation
- Field error display
- Helpful hints (e.g., "Use 9-18 digit account")
- Submit/Cancel buttons

**Validation Rules**:
- Account: 9-18 digits only
- IFSC: 11 characters, auto-uppercase
- Bank name: required, not empty
- Phone/Name: same as UPI

**Special Features**:
- Account number auto-formats (groups of 4 digits?)
- IFSC auto-converts to uppercase
- Phone auto-formats as user types

---

### 3. BeneficiaryReview Component

**File**: `components/beneficiary/BeneficiaryReview.js`

**Props**:
```javascript
{
  beneficiaryData: {
    name: string,
    phone: string,
    paymentMethod: 'upi' | 'bank_account',
    upiId?: string,
    account?: string,
    ifsc?: string,
    bankName?: string,
    relationship: string
  },
  onConfirm: () => Promise<void>,
  onEdit: () => void,
  onCancel: () => void,
  loading: boolean
}
```

**Features**:
- Display summary in readable format
- Mask sensitive fields:
  - UPI: amit@*** or amit@okhdf***
  - Account: ****7890 (last 4 digits only)
- Show settlement time (2-5 min for UPI, 1-2 days for Bank)
- Confirm/Edit/Cancel buttons
- Clear visual hierarchy

**Display Format**:
```
Payment Method: UPI
Recipient Name: Amit Kumar
Phone: 9876543210
UPI ID: amit@****
Relationship: Family
Settlement Time: 2-5 minutes

[Confirm & Add]  [Edit]  [Cancel]
```

---

### 4. AddBeneficiaryFlow Component

**File**: `components/beneficiary/AddBeneficiaryFlow.js`

**Props**:
```javascript
{
  onBeneficiaryAdded: (beneficiary) => void,
  onCancel: () => void,
  corridorId?: string
}
```

**Features**:
- Multi-step flow orchestrator
- Manages state for all child components
- Handles API calls to /api/beneficiaries/add
- Step management (method-select → form → review → loading → success/error)
- Error handling with user-friendly messages
- Loading states
- Success confirmation screen

**Steps**:
1. **Method Select**: User chooses UPI or Bank Account
2. **Form**: User enters beneficiary details
3. **Review**: User confirms details
4. **Loading**: API call in progress
5. **Success**: Confirmation with beneficiary ID
6. **Error**: Error message with suggestion and retry option

**Error Handling**:
- Network errors: Show "Network error, please try again"
- Validation errors: Show error_code + suggestion
- Duplicate errors: Show different message for verified/pending
- Server errors: Show generic error with retry

**API Integration**:
```javascript
POST /api/beneficiaries/add
Headers: {
  Authorization: "Bearer {token}",
  X-User-Id: "{userId}"
}
Body: {
  name, phone, paymentMethod,
  upiId?, account?, ifsc?, bankName?,
  relationship
}
Response: {
  success: boolean,
  beneficiary_id?: string,
  error_code?: string,
  suggestion?: string
}
```

---

### 5. BeneficiariesList Component

**File**: `components/beneficiary/BeneficiariesList.js`

**Props**:
```javascript
{
  onAddBeneficiary: () => void,
  onSelectBeneficiary: (beneficiary) => void,
  onDeleteBeneficiary: (beneficiaryId) => Promise<void>,
  loading: boolean
}
```

**Features**:
- Display list of user's beneficiaries
- Each item shows:
  - Name
  - Payment method (UPI / Bank)
  - Masked details (****@bank or ****7890)
  - Verification status badge
  - Created date
- Action buttons:
  - Delete button (with confirmation)
  - Use for transfer button
- Empty state message
- Add button
- Loading skeleton state
- Refresh button

**Empty State**:
```
No beneficiaries yet
Start by adding your first beneficiary for quick transfers

[+ Add Beneficiary]
```

**Beneficiary Card**:
```
┌─────────────────────────────────┐
│ Amit Kumar                       │
│ UPI • amit@****                  │
│ Family • Added Feb 21            │
│                                  │
│ [Delete]  [Use for Transfer]     │
└─────────────────────────────────┘
```

---

## Styling Guidelines

**Colors** (using Tailwind):
- Primary: `from-blue-600 to-indigo-600` (gradient)
- Success: `green-500`
- Error: `red-500`
- Border: `gray-200`
- Text: `gray-900` (dark), `gray-600` (secondary)

**Spacing**:
- Container: `p-4 md:p-6`
- Input groups: `mb-4`
- Buttons: `mt-6`
- Cards: `space-y-3`

**Components**:
- Inputs: `w-full px-3 py-2 border border-gray-300 rounded-lg`
- Buttons: `px-4 py-2 rounded-lg font-medium transition`
- Error text: `text-red-500 text-sm mt-1`
- Labels: `block text-sm font-medium text-gray-700 mb-1`

---

## Testing Strategy

### Unit Tests (Per Component)

**BeneficiaryFormUPI**:
- Renders all fields correctly
- Validation feedback for each field
- Submit with valid data
- Cancel action
- Error display
- Disabled state while loading
- Initial data population

**BeneficiaryFormBank**:
- Renders all fields correctly
- Account number validation (9-18 digits)
- IFSC auto-uppercase
- IFSC validation (11 chars)
- Bank name required
- Submit/Cancel
- Error display
- Loading state

**BeneficiaryReview**:
- Displays summary correctly
- Masks UPI ID
- Masks account number (last 4)
- Shows settlement time
- Confirm/Edit/Cancel actions
- Loading state on confirm

**AddBeneficiaryFlow**:
- Renders method select first
- Transitions through steps correctly
- API call on review confirm
- Error handling and retry
- Success confirmation
- Cancel from any step

**BeneficiariesList**:
- Renders empty state
- Lists beneficiaries
- Renders actions
- Delete confirmation modal
- Loading state

### Integration Tests
- Full flow: Method → Form → Review → API → Success
- Error flow: API error → Error message → Retry
- Duplicate detection: Show duplicate message
- Network error: Show retry option

### E2E Test Scenarios
1. Add UPI beneficiary successfully
2. Add Bank beneficiary successfully
3. Validation error recovery
4. Duplicate beneficiary handling
5. Delete beneficiary with confirmation
6. Network error handling

---

## Code Quality Standards

✅ **Senior Staff UI Engineer**:
- JSDoc comments on all components
- Proper TypeScript-like JSDoc for props
- Clear component responsibilities
- Reusable utility functions
- Consistent error handling
- Accessibility considerations (labels, ARIA)
- Performance optimizations (memoization where needed)

✅ **Maintainability**:
- Consistent naming conventions
- Organized file structure
- Separation of concerns
- No prop drilling (use context if needed)
- Reusable form components

✅ **Security**:
- No sensitive data in console logs
- Sanitize user input before display
- Proper error messages (no tech details)

✅ **Accessibility**:
- Form labels associated with inputs
- Error messages announced
- Keyboard navigation support
- ARIA labels for screen readers

---

## Implementation Order

1. ✅ Create BeneficiaryFormUPI component + tests
2. ✅ Create BeneficiaryFormBank component + tests
3. ✅ Create BeneficiaryReview component + tests
4. ✅ Create AddBeneficiaryFlow orchestrator + tests
5. ✅ Create BeneficiariesList component + tests
6. ✅ Integration tests for full flow
7. ✅ Build and test verification

---

## API Integration Details

**Endpoint**: POST /api/beneficiaries/add

**Request**:
```javascript
fetch('/api/beneficiaries/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': userId
  },
  body: JSON.stringify({
    name: 'Amit Kumar',
    phone: '9876543210',
    paymentMethod: 'upi',
    upiId: 'amit@okhdfcbank',
    relationship: 'family'
  })
})
```

**Success Response** (200):
```javascript
{
  success: true,
  beneficiary_id: 'uuid-123',
  name: 'Amit Kumar',
  verificationStatus: 'verified',
  message: 'Beneficiary added successfully...',
  isDuplicate: false
}
```

**Error Response** (400):
```javascript
{
  success: false,
  error_code: 'INVALID_UPI_FORMAT',
  error_message: 'UPI format invalid',
  suggestion: 'Use format: name@bank'
}
```

---

## Environment Setup

**Required Environment Variables** (already configured):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase key
- `X-User-Id` header - From auth context

---

## Success Criteria

✅ All components render correctly
✅ Validation works as designed
✅ API integration works end-to-end
✅ Error handling shows user-friendly messages
✅ Duplicate detection works
✅ All tests passing (100+ new tests)
✅ No build errors or regressions
✅ Responsive design on mobile/tablet/desktop
✅ Accessibility compliance

---

**Ready to begin implementation!**
