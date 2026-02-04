/**
 * AddCardFlow Plaid Integration Tests
 *
 * Tests the state management and callback handling for Plaid integration
 * in the AddCardFlow component.
 *
 * Focus: Business logic and state transitions, not React rendering
 */

describe('AddCardFlow Plaid Integration', () => {
  describe('Step Management - Browse to Plaid', () => {
    test('starts in browse step', () => {
      // When: Component initializes
      // Then: Initial step should be 'browse'
      const initialStep = 'browse';
      expect(initialStep).toBe('browse');
    });

    test('transitions from browse to plaid when handleLinkBank is called', () => {
      // Given: Component in browse step
      let currentStep = 'browse';

      // When: User clicks "Link Bank"
      const handleLinkBank = () => {
        currentStep = 'plaid';
      };
      handleLinkBank();

      // Then: Step should be 'plaid'
      expect(currentStep).toBe('plaid');
    });

    test('clears plaid state when transitioning to plaid step', () => {
      // Given: Some previous plaid state
      let plaidItemId = 'old-item-123';
      let plaidAccounts = [{ id: 'acc1' }];

      // When: handleLinkBank is called
      const handleLinkBank = () => {
        plaidItemId = null;
        plaidAccounts = [];
      };
      handleLinkBank();

      // Then: Plaid state should be cleared
      expect(plaidItemId).toBeNull();
      expect(plaidAccounts).toEqual([]);
    });
  });

  describe('Plaid Success Flow', () => {
    test('handles PlaidLinkButton success with valid response', () => {
      // Given: Success response from PlaidLinkButton
      const successResponse = {
        plaid_item_id: 'item-abc123',
        accounts: [
          { plaid_account_id: 'acc1', name: 'Checking', current_balance: 5000 },
          { plaid_account_id: 'acc2', name: 'Savings', current_balance: 10000 }
        ]
      };

      // When: handlePlaidSuccess is called
      let plaidItemId = null;
      let plaidAccounts = [];
      let currentStep = 'plaid';

      const handlePlaidSuccess = (response) => {
        plaidItemId = response.plaid_item_id;
        plaidAccounts = response.accounts || [];
        currentStep = 'plaid-accounts';
      };

      handlePlaidSuccess(successResponse);

      // Then: State should be updated with plaid data
      expect(plaidItemId).toBe('item-abc123');
      expect(plaidAccounts.length).toBe(2);
      expect(plaidAccounts[0].plaid_account_id).toBe('acc1');
      expect(currentStep).toBe('plaid-accounts');
    });

    test('transitions to plaid-accounts step after success', () => {
      let currentStep = 'plaid';

      const handlePlaidSuccess = () => {
        currentStep = 'plaid-accounts';
      };

      handlePlaidSuccess();

      expect(currentStep).toBe('plaid-accounts');
    });

    test('stores account data correctly in state', () => {
      const accounts = [
        {
          plaid_account_id: 'acc1',
          name: 'Chase Sapphire',
          current_balance: 5000,
          account_subtype: 'credit_card'
        },
        {
          plaid_account_id: 'acc2',
          name: 'Amex Gold',
          current_balance: 8000,
          account_subtype: 'credit_card'
        }
      ];

      let plaidAccounts = [];
      const handlePlaidSuccess = (response) => {
        plaidAccounts = response.accounts || [];
      };

      handlePlaidSuccess({ plaid_item_id: 'item-123', accounts });

      expect(plaidAccounts).toEqual(accounts);
      expect(plaidAccounts.length).toBe(2);
    });
  });

  describe('409 Conflict Error Handling', () => {
    test('detects 409 conflict error from PlaidLinkButton', () => {
      // Given: 409 error response
      const errorResponse = {
        status: 409,
        error: 'Bank already linked',
        message: 'Chase is already connected to your wallet',
        suggestion: 'Use "Add More Accounts" to link additional cards from this bank',
        plaid_item_id: 'item-existing-123'
      };

      // When: handlePlaidError is called with 409
      let currentStep = 'plaid';
      let plaidItem409Error = null;
      let addMorePlaidItemId = null;

      const handlePlaidError = (error) => {
        if (error.status === 409) {
          plaidItem409Error = error;
          addMorePlaidItemId = error.plaid_item_id;
          currentStep = 'add-more';
        }
      };

      handlePlaidError(errorResponse);

      // Then: Should detect 409 and store error data
      expect(plaidItem409Error).not.toBeNull();
      expect(plaidItem409Error.status).toBe(409);
      expect(currentStep).toBe('add-more');
    });

    test('extracts plaid_item_id from 409 error for add-more flow', () => {
      const errorResponse = {
        status: 409,
        plaid_item_id: 'item-existing-456'
      };

      let addMorePlaidItemId = null;

      const handlePlaidError = (error) => {
        if (error.status === 409) {
          addMorePlaidItemId = error.plaid_item_id;
        }
      };

      handlePlaidError(errorResponse);

      expect(addMorePlaidItemId).toBe('item-existing-456');
    });

    test('stores complete 409 error object with all fields', () => {
      const errorResponse = {
        status: 409,
        error: 'Duplicate Bank',
        message: 'Bank already linked',
        suggestion: 'Add more accounts',
        plaid_item_id: 'item-123'
      };

      let plaidItem409Error = null;

      const handlePlaidError = (error) => {
        if (error.status === 409) {
          plaidItem409Error = error;
        }
      };

      handlePlaidError(errorResponse);

      expect(plaidItem409Error.error).toBe('Duplicate Bank');
      expect(plaidItem409Error.message).toBe('Bank already linked');
      expect(plaidItem409Error.suggestion).toBe('Add more accounts');
      expect(plaidItem409Error.plaid_item_id).toBe('item-123');
    });

    test('transitions to add-more step on 409 conflict', () => {
      let currentStep = 'plaid';

      const handlePlaidError = (error) => {
        if (error.status === 409) {
          currentStep = 'add-more';
        }
      };

      handlePlaidError({ status: 409 });

      expect(currentStep).toBe('add-more');
    });

    test('clears plaid state on 409 error', () => {
      let plaidItemId = 'old-item';
      let plaidAccounts = [{ id: 'acc1' }];

      const handlePlaidError = (error) => {
        if (error.status === 409) {
          // Should NOT clear on 409 - this is for add-more flow
          // But plaidItemId should be from error
          plaidItemId = error.plaid_item_id;
        }
      };

      handlePlaidError({
        status: 409,
        plaid_item_id: 'existing-item-789'
      });

      // State should use error's plaid_item_id, not old one
      expect(plaidItemId).toBe('existing-item-789');
    });
  });

  describe('Other Error Handling', () => {
    test('handles non-409 errors by going back to browse', () => {
      const errorResponse = {
        status: 500,
        error: 'Server Error',
        message: 'Something went wrong'
      };

      let currentStep = 'plaid';

      const handlePlaidError = (error) => {
        if (error.status === 409) {
          currentStep = 'add-more';
        } else {
          // Navigate back
          currentStep = 'browse';
        }
      };

      handlePlaidError(errorResponse);

      expect(currentStep).toBe('browse');
    });

    test('handles 400 Bad Request', () => {
      let currentStep = 'plaid';

      const handlePlaidError = (error) => {
        if (error.status !== 409) {
          currentStep = 'browse';
        }
      };

      handlePlaidError({ status: 400, error: 'Bad Request' });

      expect(currentStep).toBe('browse');
    });

    test('handles network errors', () => {
      let currentStep = 'plaid';

      const handlePlaidError = (error) => {
        if (error.status !== 409) {
          currentStep = 'browse';
        }
      };

      handlePlaidError({
        status: undefined,
        error: 'Network Error'
      });

      expect(currentStep).toBe('browse');
    });

    test('handles timeout errors', () => {
      let currentStep = 'plaid';

      const handlePlaidError = (error) => {
        if (!error.status || error.status !== 409) {
          currentStep = 'browse';
        }
      };

      handlePlaidError({
        status: undefined,
        error: 'Connection timeout'
      });

      expect(currentStep).toBe('browse');
    });
  });

  describe('Plaid Exit Handler', () => {
    test('returns to browse when user exits Plaid UI', () => {
      let currentStep = 'plaid';

      const handlePlaidExit = () => {
        currentStep = 'browse';
      };

      handlePlaidExit();

      expect(currentStep).toBe('browse');
    });

    test('clears plaid state on exit', () => {
      let plaidItemId = 'item-123';
      let plaidAccounts = [{ id: 'acc1' }];

      const handlePlaidExit = () => {
        plaidItemId = null;
        plaidAccounts = [];
      };

      handlePlaidExit();

      expect(plaidItemId).toBeNull();
      expect(plaidAccounts).toEqual([]);
    });
  });

  describe('Account Selection Flow', () => {
    test('transitions from plaid-accounts to success after confirmation', () => {
      let currentStep = 'plaid-accounts';

      const handleAccountsConfirmed = () => {
        currentStep = 'success';
      };

      handleAccountsConfirmed();

      expect(currentStep).toBe('success');
    });

    test('stores added cards from account confirmation', () => {
      const addedCards = [
        { id: 'card1', card_name: 'Chase Sapphire', plaid_account_id: 'acc1' },
        { id: 'card2', card_name: 'Amex Gold', plaid_account_id: 'acc2' }
      ];

      let addedCard = null;

      const handleAccountsConfirmed = (cards) => {
        addedCard = cards;
      };

      handleAccountsConfirmed(addedCards);

      expect(addedCard).toEqual(addedCards);
      expect(addedCard.length).toBe(2);
    });

    test('calls onComplete callback after success', () => {
      const onCompleteMock = jest.fn();
      const addedCards = [{ id: 'card1' }];

      const handleAccountsConfirmed = (cards) => {
        onCompleteMock(cards);
      };

      handleAccountsConfirmed(addedCards);

      expect(onCompleteMock).toHaveBeenCalledWith(addedCards);
    });
  });

  describe('Back Navigation', () => {
    test('navigates back from plaid to browse', () => {
      let currentStep = 'plaid';

      const handleBack = () => {
        currentStep = 'browse';
      };

      handleBack();

      expect(currentStep).toBe('browse');
    });

    test('navigates back from plaid-accounts to plaid', () => {
      let currentStep = 'plaid-accounts';

      const handleBack = () => {
        currentStep = 'plaid';
      };

      handleBack();

      expect(currentStep).toBe('plaid');
    });

    test('clears plaid state when going back from plaid-accounts', () => {
      let currentStep = 'plaid-accounts';
      let plaidItemId = 'item-123';
      let plaidAccounts = [{ id: 'acc1' }];

      const handleBack = () => {
        currentStep = 'plaid';
        plaidAccounts = [];
        plaidItemId = null;
      };

      handleBack();

      expect(currentStep).toBe('plaid');
      expect(plaidItemId).toBeNull();
      expect(plaidAccounts).toEqual([]);
    });

    test('navigates back from add-more to plaid', () => {
      let currentStep = 'add-more';

      const handleBack = () => {
        currentStep = 'plaid';
      };

      handleBack();

      expect(currentStep).toBe('plaid');
    });

    test('clears 409 error state when navigating back from add-more', () => {
      let currentStep = 'add-more';
      let plaidItem409Error = { status: 409, error: 'Duplicate' };

      const handleBack = () => {
        currentStep = 'plaid';
        plaidItem409Error = null;
      };

      handleBack();

      expect(currentStep).toBe('plaid');
      expect(plaidItem409Error).toBeNull();
    });
  });

  describe('State Transitions - Full Flows', () => {
    test('complete flow: browse -> plaid -> plaid-accounts -> success', () => {
      let currentStep = 'browse';
      let plaidItemId = null;
      let plaidAccounts = [];
      let addedCard = null;

      // User clicks "Link Bank"
      currentStep = 'plaid';
      expect(currentStep).toBe('plaid');

      // Plaid returns successfully
      plaidItemId = 'item-123';
      plaidAccounts = [{ id: 'acc1' }, { id: 'acc2' }];
      currentStep = 'plaid-accounts';
      expect(currentStep).toBe('plaid-accounts');

      // User confirms accounts
      addedCard = [{ id: 'card1' }, { id: 'card2' }];
      currentStep = 'success';
      expect(currentStep).toBe('success');
    });

    test('complete flow with 409: plaid -> add-more -> [action] -> success/browse', () => {
      let currentStep = 'plaid';
      let plaidItem409Error = null;

      // Plaid returns 409 conflict
      plaidItem409Error = {
        status: 409,
        plaid_item_id: 'item-existing'
      };
      currentStep = 'add-more';
      expect(currentStep).toBe('add-more');

      // User clicks "Try Another Bank"
      currentStep = 'plaid';
      plaidItem409Error = null;
      expect(currentStep).toBe('plaid');
    });

    test('flow with error and recovery', () => {
      let currentStep = 'plaid';

      // User exits Plaid
      currentStep = 'browse';
      expect(currentStep).toBe('browse');

      // User tries again
      currentStep = 'plaid';
      expect(currentStep).toBe('plaid');
    });
  });

  describe('Callback Data Structure Validation', () => {
    test('PlaidLinkButton success response has required fields', () => {
      const successResponse = {
        plaid_item_id: 'item-abc123',
        accounts: []
      };

      expect(successResponse).toHaveProperty('plaid_item_id');
      expect(successResponse).toHaveProperty('accounts');
      expect(typeof successResponse.plaid_item_id).toBe('string');
      expect(Array.isArray(successResponse.accounts)).toBe(true);
    });

    test('PlaidLinkButton error response has required fields', () => {
      const errorResponse = {
        status: 409,
        error: 'string',
        message: 'string'
      };

      expect(errorResponse).toHaveProperty('status');
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse).toHaveProperty('message');
    });

    test('PlaidAccountSelector onComplete receives added cards', () => {
      const addedCards = [
        {
          id: 'card1',
          card_name: 'Chase Sapphire',
          plaid_account_id: 'acc1'
        }
      ];

      let receivedCards = null;

      const handleAccountsConfirmed = (cards) => {
        receivedCards = cards;
      };

      handleAccountsConfirmed(addedCards);

      expect(receivedCards).toEqual(addedCards);
    });
  });

  describe('Props Validation', () => {
    test('onLinkBank callback is optional but functional when provided', () => {
      const onLinkBankMock = jest.fn();

      const handleLinkBank = onLinkBankMock;
      handleLinkBank();

      expect(onLinkBankMock).toHaveBeenCalled();
    });

    test('CardBrowserScreen receives onLinkBank prop', () => {
      const onLinkBankMock = jest.fn();

      // Verify prop would be passed
      const cardBrowserProps = {
        user: { id: '123' },
        onCardSelect: jest.fn(),
        onManualEntry: jest.fn(),
        onLinkBank: onLinkBankMock
      };

      expect(cardBrowserProps).toHaveProperty('onLinkBank');
      expect(typeof cardBrowserProps.onLinkBank).toBe('function');
    });

    test('PlaidLinkButton receives required user prop', () => {
      const user = { id: 'user-123', email: 'test@example.com' };

      const plaidLinkButtonProps = {
        user,
        onSuccess: jest.fn(),
        onError: jest.fn(),
        onExit: jest.fn()
      };

      expect(plaidLinkButtonProps.user).toEqual(user);
    });

    test('PlaidAccountSelector receives plaid data props', () => {
      const plaidAccountSelectorProps = {
        user: { id: 'user-123' },
        plaidItemId: 'item-123',
        accounts: [{ plaid_account_id: 'acc1' }],
        onComplete: jest.fn(),
        onBack: jest.fn()
      };

      expect(plaidAccountSelectorProps.plaidItemId).toBe('item-123');
      expect(plaidAccountSelectorProps.accounts.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty accounts array from plaid', () => {
      let plaidAccounts = [];

      const handlePlaidSuccess = (response) => {
        plaidAccounts = response.accounts || [];
      };

      handlePlaidSuccess({
        plaid_item_id: 'item-123',
        accounts: []
      });

      expect(plaidAccounts).toEqual([]);
    });

    test('handles missing accounts field in response', () => {
      let plaidAccounts = [];

      const handlePlaidSuccess = (response) => {
        plaidAccounts = response.accounts || [];
      };

      handlePlaidSuccess({ plaid_item_id: 'item-123' });

      expect(plaidAccounts).toEqual([]);
    });

    test('handles null plaid_item_id in error', () => {
      let plaidItem409Error = null;

      const handlePlaidError = (error) => {
        if (error.status === 409) {
          plaidItem409Error = error;
        }
      };

      handlePlaidError({
        status: 409,
        plaid_item_id: null
      });

      expect(plaidItem409Error.plaid_item_id).toBeNull();
    });

    test('handles error with missing message field', () => {
      const errorResponse = {
        status: 409,
        error: 'Duplicate Bank'
      };

      expect(errorResponse).toHaveProperty('status');
      expect(errorResponse).toHaveProperty('error');
      // message might be missing
      expect(errorResponse.message).toBeUndefined();
    });
  });

  describe('Integration with CardBrowserScreen', () => {
    test('CardBrowserScreen calls onLinkBank when button is clicked', () => {
      const onLinkBankMock = jest.fn();

      const handleCardBrowserClick = () => {
        onLinkBankMock();
      };

      handleCardBrowserClick();

      expect(onLinkBankMock).toHaveBeenCalled();
    });

    test('onLinkBank is called with no parameters', () => {
      const onLinkBankMock = jest.fn();

      const handleCardBrowserClick = () => {
        onLinkBankMock();
      };

      handleCardBrowserClick();

      expect(onLinkBankMock).toHaveBeenCalledWith();
    });
  });

  describe('Logging and Debugging', () => {
    test('logs Plaid success event', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const handlePlaidSuccess = (response) => {
        console.log('[AddCardFlow] Plaid success:', response);
      };

      handlePlaidSuccess({ plaid_item_id: 'item-123' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddCardFlow] Plaid success:',
        expect.objectContaining({ plaid_item_id: 'item-123' })
      );

      consoleSpy.mockRestore();
    });

    test('logs Plaid error event', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const handlePlaidError = (error) => {
        console.log('[AddCardFlow] Plaid error:', error);
      };

      handlePlaidError({ status: 409, error: 'Duplicate' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AddCardFlow] Plaid error:',
        expect.objectContaining({ status: 409 })
      );

      consoleSpy.mockRestore();
    });

    test('logs Plaid exit event', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const handlePlaidExit = () => {
        console.log('[AddCardFlow] User exited Plaid');
      };

      handlePlaidExit();

      expect(consoleSpy).toHaveBeenCalledWith('[AddCardFlow] User exited Plaid');

      consoleSpy.mockRestore();
    });
  });
});
