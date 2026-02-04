# Phase 6 Task Breakdown - Plaid Frontend Integration

**Objective**: Wire backend Plaid APIs to frontend components to enable users to link banks, add accounts, and manage multiple credit cards from the same institution.

**Current Status**: Backend complete (Phases 1-5). Frontend components exist but need integration and wiring.

**Estimated Deliverable**: Fully functional "Link Bank" and "Add More Accounts" flows with error handling.

---

## Task Group 1: Foundation & API Validation (2-3 tasks)

### 1.1 Review All Plaid API Endpoints
- **File**: `pages/api/plaid/*.js`
- **What to check**:
  - ✓ `create-link-token.js` - Creates Plaid Link token
  - ✓ `exchange-token.js` - Exchanges public token for access token, detects duplicates (409)
  - ✓ `confirm-accounts.js` - Confirms selected accounts, links to catalog
  - ✓ `add-more-accounts.js` - Route G: Shows linked vs available accounts
  - ✓ `refresh.js` - Manual refresh of transactions
  - ✓ `webhooks.js` - Real-time sync
- **Acceptance Criteria**: All endpoints return correct error codes (400, 409, 500)

### 1.2 Create/Verify PlaidLinkButton Component
- **File**: `components/PlaidLinkButton.js` (check if exists)
- **Responsibility**:
  - Initializes Plaid Link with user token
  - Listens for onSuccess, onExit, onEvent events
  - Calls `/api/plaid/exchange-token` with public token
  - Returns access token and accounts to parent
- **Props**:
  ```javascript
  {
    user: { user_id },
    onSuccess: (response) => {},    // { access_token, accounts, plaid_item_id }
    onError: (error) => {},         // { error: 409, message: "Already linked" }
    onExit: () => {},               // User cancelled
    institutionId: string (optional) // Pre-select institution
  }
  ```
- **Acceptance Criteria**: Component loads Plaid Link SDK and handles all three callback scenarios

---

## Task Group 2: Update AddCardFlow Component (4-5 tasks)

AddCardFlow currently has: `browse` → `details` → `manual` → `success` states.
Need to add: `plaid` → `plaid-accounts` → `plaid-post-connect` states.

### 2.1 Add 'plaid' State to AddCardFlow
- **File**: `components/AddCardFlow.js`
- **Change**: Add `'plaid'` to step state machine
- **Logic**:
  ```javascript
  const [step, setStep] = useState('browse');
  // Now: 'browse', 'details', 'manual', 'success'
  // Add: 'plaid', 'plaid-accounts', 'plaid-post-connect'
  ```
- **When triggered**: User clicks "Connect Bank" button in browse screen

### 2.2 Integrate PlaidLinkButton into AddCardFlow
- **File**: `components/AddCardFlow.js`
- **Logic**:
  1. When `step === 'plaid'`, render `<PlaidLinkButton />`
  2. On successful link (onSuccess):
     - Store access token, accounts, plaid_item_id
     - Check response for 409 error → show duplicate message + "Add More Accounts" option
     - Otherwise → move to `plaid-accounts` step
- **Handle Response**:
  ```javascript
  const handlePlaidSuccess = (response) => {
    if (response.error === 409) {
      setError(response.message);
      setPlaidItemId(response.plaid_item_id); // Save for add-more flow
      // Show error with "Add More Accounts" button
      return;
    }

    setPlaidAccounts(response.accounts);
    setPlaidItemId(response.plaid_item_id);
    setStep('plaid-accounts');
  };
  ```
- **Acceptance Criteria**: PlaidLinkButton renders, Plaid SDK loads, success/error/exit handled

### 2.3 Integrate PlaidAccountSelector into AddCardFlow
- **File**: `components/AddCardFlow.js`
- **When**: `step === 'plaid-accounts'`
- **Props to pass**:
  ```javascript
  <PlaidAccountSelector
    user={user}
    plaidItemId={plaidItemId}
    accounts={plaidAccounts}
    alreadyAddedAccounts={alreadyAddedAccounts} // For add-more scenario
    onComplete={(addedCards) => {
      setAddedCards(addedCards);
      setStep('plaid-post-connect');
    }}
    onBack={() => setStep('plaid')}
  />
  ```
- **Acceptance Criteria**: Component renders, shows available accounts, user can select/confirm

### 2.4 Handle 409 Duplicate Link Error
- **File**: `components/AddCardFlow.js`
- **When**: exchange-token returns 409 Conflict
- **UI Flow**:
  1. Show error message: "Chase is already connected to your Vitta account"
  2. Show two options:
     - "View Linked Accounts" → calls Route G with plaid_item_id
     - "Try Different Bank" → reset to browse step
  3. If "View Linked Accounts", transition to add-more flow:
     ```javascript
     const handleAddMoreAccounts = async () => {
       const response = await fetch('/api/plaid/add-more-accounts', {
         method: 'POST',
         body: JSON.stringify({ user_id: user.user_id, plaid_item_id })
       });
       const data = await response.json();
       setPlaidAccounts(data.available_accounts);
       setAlreadyAddedAccounts(data.already_added_accounts);
       setStep('plaid-accounts');
     };
     ```
- **Acceptance Criteria**: 409 error shows helpful UI, add-more flow works

### 2.5 Add Post-Connect Form (Optional Card Customization)
- **File**: `components/PlaidPostConnectForm.js` (new or existing CardDetailsForm)
- **When**: `step === 'plaid-post-connect'`
- **Purpose**: User can override/customize auto-populated fields
  - Card nickname
  - Payment due date preferences
  - Alerts settings
- **Acceptance Criteria**: Form renders added cards, user can customize, saves changes

---

## Task Group 3: Update CardBrowserScreen Component (3-4 tasks)

Currently only shows "Add Your First Card" with catalog search.
Need to add section showing linked banks with "Add More Accounts" option.

### 3.1 Fetch List of Linked Banks
- **File**: `components/CardBrowserScreen.js`
- **Implementation**:
  ```javascript
  const [linkedBanks, setLinkedBanks] = useState([]);

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchLinkedBanks = async () => {
      const response = await fetch(`/api/user/plaid-items?user_id=${user.user_id}`);
      const data = await response.json();
      setLinkedBanks(data); // Array of { id, institution_name, account_count }
    };

    fetchLinkedBanks();
  }, [user?.user_id]);
  ```
- **Note**: May need to create `/api/user/plaid-items` endpoint if doesn't exist
- **Acceptance Criteria**: Endpoint returns linked banks with institution name and count

### 3.2 Add "Linked Banks" Section to UI
- **File**: `components/CardBrowserScreen.js`
- **When**: User has linked banks (linkedBanks.length > 0)
- **UI Position**: Above the catalog search as a collapsible/sticky section
- **Show**:
  ```
  [Linked Banks Section]
  Chase (5 accounts, 2 linked)
    └─ [Add More Accounts] [Manage] buttons

  American Express (3 accounts, 1 linked)
    └─ [Add More Accounts] [Manage] buttons
  ```
- **Acceptance Criteria**: Section renders with linked bank data, responsive design

### 3.3 Implement "Add More Accounts" Button
- **File**: `components/CardBrowserScreen.js`
- **Click Handler**:
  ```javascript
  const handleAddMoreAccounts = (plaidItemId) => {
    onAddMore(plaidItemId); // Pass to parent
  };
  ```
- **Parent** (AddCardFlow) receives:
  1. Calls Route G: `/api/plaid/add-more-accounts`
  2. Transitions to `plaid-accounts` step with both account lists
- **Acceptance Criteria**: Button click triggers add-more flow with Route G call

---

## Task Group 4: Update CreditCardScreen for Bank Management (2 tasks)

Users should be able to see which cards are Plaid-linked and manage them.

### 4.1 Create "Manage Linked Banks" View
- **File**: `components/CreditCardScreen.js` (add new section or tab)
- **Display**:
  - List of linked banks
  - Cards per bank with sync status
  - Last sync timestamp
  - "Add More Accounts" button per bank
  - (Phase 7) "Unlink Bank" button with confirmation
- **Acceptance Criteria**: Section renders with all linked bank data

### 4.2 Add "Add More Accounts" Flow in CreditCardScreen
- **File**: `components/CreditCardScreen.js`
- **Click Handler**: Triggers AddCardFlow in `add-more` mode
- **Mode Setting**: Pass `mode="add-more"` to AddCardFlow to skip browse step
- **Acceptance Criteria**: Clicking "Add More Accounts" opens add-more flow

---

## Task Group 5: Error Handling & Edge Cases (3 tasks)

### 5.1 Handle 409 Duplicate Link Detection
- **File**: `components/AddCardFlow.js` (already covered in 2.4)
- **Error Response**:
  ```javascript
  {
    error: 'Bank already linked',
    message: 'Chase is already connected to your Vitta account',
    suggestion: 'Use "Add More Accounts" to add additional cards',
    plaid_item_id: 'uuid-...'
  }
  ```
- **UI Response**: Show error with "Add More Accounts" button
- **Acceptance Criteria**: 409 errors handled gracefully

### 5.2 Handle Network/Rate Limit Errors
- **File**: All Plaid API calls in AddCardFlow
- **Handle 429 (Too Many Requests)**:
  ```javascript
  if (response.status === 429) {
    const retryAfter = response.headers['retry-after'];
    setError(`Too many requests. Please wait ${retryAfter}s`);
  }
  ```
- **Handle Network Errors**:
  ```javascript
  catch (error) {
    setError('Network error. Please check your connection and try again.');
  }
  ```
- **Acceptance Criteria**: Errors show helpful messages, no generic crashes

### 5.3 Handle User Cancellation of Plaid Link
- **File**: PlaidLinkButton.js, AddCardFlow.js
- **onExit Handler**:
  ```javascript
  const handlePlaidExit = (err, metadata) => {
    // User cancelled Plaid Link
    // metadata.status = 'requires_action' | other states
    setStep('browse'); // Return to bank search
  };
  ```
- **Acceptance Criteria**: Cancelling Plaid Link returns to browse screen

---

## Task Group 6: Testing (4-5 tasks)

### 6.1 Write Integration Tests for AddCardFlow + Plaid
- **File**: `__tests__/integration/addCardFlow.test.js` (new)
- **Tests**:
  - Browse → Select "Connect Bank" → PlaidLinkButton renders
  - PlaidLinkButton success → PlaidAccountSelector renders
  - PlaidAccountSelector confirm → Accounts added
  - PlaidLinkButton cancel → Back to browse
  - Success screen → Redirect after 2s
- **Acceptance Criteria**: All happy path and error scenarios covered

### 6.2 Test Duplicate Link Detection
- **File**: `__tests__/integration/duplicateLink.test.js` (new)
- **Scenario**: User links Chase, receives 409
- **Tests**:
  - 409 response shows error message
  - "Add More Accounts" button visible
  - Click "Add More Accounts" → Route G called
  - Route G returns available accounts
  - User selects account → Confirms → Added to wallet
- **Acceptance Criteria**: Full error recovery flow tested

### 6.3 Test Add-More-Accounts Flow
- **File**: `__tests__/integration/addMoreAccounts.test.js` (may exist from Phase 3.5)
- **Scenario**: User has linked Chase with 2 cards, wants to add 3rd
- **Tests**:
  - CardBrowserScreen shows "Chase (3 linked, 5 total)"
  - Click "Add More" → Route G called
  - Shows already-added (grayed out) + available
  - User selects available → Confirms
  - API confirms → Success screen
- **Acceptance Criteria**: Add-more flow end-to-end works

### 6.4 Test Error Handling
- **File**: `__tests__/integration/plaidErrors.test.js` (new)
- **Tests**:
  - Network error → shows retry message
  - 429 rate limit → shows retry-after time
  - 500 server error → shows helpful error
  - Exchange token fails → shows error + retry button
- **Acceptance Criteria**: All error codes handled with appropriate UI

### 6.5 Manual Testing Checklist
- **Environments**: Mobile (iOS/Android), Desktop (Chrome/Safari)
- **Test Cases**:
  - ✓ Link first bank (happy path)
  - ✓ Link second bank from different institution
  - ✓ Try to link same bank twice (409 error)
  - ✓ Add more accounts from linked bank
  - ✓ Cancel during Plaid Link
  - ✓ View linked banks in CardBrowserScreen
  - ✓ Check sync status and timestamps
  - ✓ Refresh transactions
- **Acceptance Criteria**: All manual tests pass on mobile + desktop

---

## Task Group 7: Documentation & Polish (2-3 tasks)

### 7.1 Create Phase 6 Implementation Guide
- **File**: `docs/PHASE6_IMPLEMENTATION.md` (new)
- **Content**:
  - Overview of Phase 6 architecture
  - Component interaction diagram
  - User flow diagrams (Initial link, Add more, Error recovery)
  - API endpoint summary with response codes
  - Testing checklist
- **Acceptance Criteria**: Document is clear and can guide future developers

### 7.2 Update CLAUDE.md with Phase 6 Completion
- **File**: `CLAUDE.md`
- **Update Sections**:
  - Architecture → Add Plaid frontend flow
  - Development Guidelines → Add Plaid flow specifics
  - Add Phase 6 to completed checklist
- **Acceptance Criteria**: CLAUDE.md reflects Phase 6 changes

### 7.3 Create User Guide for "Add More Accounts"
- **File**: `docs/USER_GUIDE_PLAID.md` (new or update existing)
- **Content**:
  - Step-by-step: Link your first bank
  - Step-by-step: Add more accounts from linked bank
  - Screenshot walkthrough (if possible)
  - FAQ: What if I get an error? Can I unlink a bank? etc.
- **Acceptance Criteria**: User guide is clear for non-technical users

---

## Implementation Order

**Recommended sequence** (dependencies first):

1. **Group 1** (Foundation): Verify APIs, check/create PlaidLinkButton
2. **Group 2** (Core Flow): Update AddCardFlow with Plaid integration
3. **Group 3** (Discovery): Update CardBrowserScreen to show linked banks
4. **Group 4** (Management): Add bank management to CreditCardScreen
5. **Group 5** (Resilience): Add error handling throughout
6. **Group 6** (Quality): Write tests
7. **Group 7** (Polish): Documentation and final cleanup

---

## Success Criteria for Phase 6

✅ Users can link their first bank and select accounts to add
✅ Users can add more accounts from an already-linked bank
✅ Users see helpful error messages if they try to link the same bank twice
✅ All error scenarios (network, rate limit, server errors) handled gracefully
✅ CardBrowserScreen shows linked banks with account counts
✅ PlaidAccountSelector shows already-added vs available accounts
✅ All flows tested (unit, integration, manual)
✅ Documentation updated and clear
✅ No console errors or warnings
✅ Responsive design works on mobile and desktop

---

## Dependencies & Prerequisites

- ✅ Phase 1-5 backend complete (API routes, services, tests)
- ✅ Plaid SDK loaded in `_app.js`
- ✅ Database schema with plaid_items, plaid_accounts, user_credit_cards tables
- ⚠️ `/api/user/plaid-items` endpoint (may need to create)

---

## Timeline Estimate

**Phase 6 Scope**: ~15-20 tasks across 7 groups

**Critical Path** (must do first):
1. Foundation validation (2 tasks)
2. AddCardFlow Plaid integration (4 tasks)
3. Error handling (2 tasks)

**Suggested workflow**: Complete critical path first → verify with manual testing → then complete remaining tasks.

---

## Notes

- PlaidAccountSelector component **already exists** and is ready to use
- No major new components needed except PlaidLinkButton (if missing)
- Most work is wiring existing backend APIs to existing components
- Focus on error handling and user experience
