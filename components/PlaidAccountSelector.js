/**
 * PlaidAccountSelector Component
 *
 * Displays accounts from Plaid link and allows user to select which to add to wallet.
 *
 * Handles two scenarios:
 * 1. Initial bank link (Step 3): All accounts are available for selection
 * 2. Add more accounts (Route G): Shows already-added accounts (grayed out) + available accounts
 *
 * Props:
 *  - user: { user_id, ... }
 *  - plaidItemId: string (database UUID from plaid_items)
 *  - accounts: [] (from exchange-token response, all accounts)
 *  - alreadyAddedAccounts: [] (optional, from add-more-accounts response)
 *  - onComplete: function(addedCards)
 *  - onBack: function()
 */

import React, { useState } from 'react';

export default function PlaidAccountSelector({
  user,
  plaidItemId,
  accounts,
  alreadyAddedAccounts = [],
  onComplete,
  onBack,
}) {
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Only show credit accounts (Vitta is a credit card wallet)
  const creditAccounts = accounts.filter(
    (acc) => acc.account_subtype === 'credit_card'
  );

  // Separate into already-added and available
  const alreadyAddedIds = new Set(
    alreadyAddedAccounts.map((acc) => acc.plaid_account_id)
  );
  const availableAccounts = creditAccounts.filter(
    (acc) => !alreadyAddedIds.has(acc.plaid_account_id)
  );

  function toggleAccount(accountId) {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  }

  async function handleConfirm() {
    if (selectedAccounts.length === 0) {
      setError('Please select at least one account');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build selected_accounts array with user nicknames
      const selected_accounts = selectedAccounts.map((accountId) => {
        const account = creditAccounts.find(
          (acc) => acc.plaid_account_id === accountId
        );
        return {
          plaid_account_id: accountId,
          nickname: null, // User can set nickname in post-connect form
        };
      });

      const response = await fetch('/api/plaid/confirm-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          plaid_item_id: plaidItemId,
          selected_accounts,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to confirm accounts');
      }

      const { added_cards } = await response.json();
      onComplete(added_cards);
    } catch (err) {
      console.error('[PlaidAccountSelector] Error confirming accounts:', err);
      setError(err.message || 'Failed to confirm accounts');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Accounts to Add
        </h2>
        <p className="text-gray-600">
          Choose which credit cards you want to track in your Vitta wallet.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Already added accounts section (if any) */}
      {alreadyAddedAccounts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Already Added to Vitta
          </h3>
          <div className="space-y-2">
            {alreadyAddedAccounts.map((account) => (
              <div
                key={account.plaid_account_id}
                className="flex items-center p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-60"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {account.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {account.mask && `•••• ${account.mask}`}
                  </div>
                </div>
                <div className="text-sm text-gray-500">✓ Added</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available accounts section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          {alreadyAddedAccounts.length > 0
            ? 'Add More Accounts'
            : 'Credit Accounts'}
        </h3>

        {availableAccounts.length === 0 ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm">
              {alreadyAddedAccounts.length > 0
                ? 'All credit cards from this bank are already added.'
                : 'No credit accounts found for this bank.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableAccounts.map((account) => (
              <label
                key={account.plaid_account_id}
                className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(
                    account.plaid_account_id
                  )}
                  onChange={() => toggleAccount(account.plaid_account_id)}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div className="ml-4 flex-1">
                  <div className="font-medium text-gray-900">
                    {account.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {account.mask && `•••• ${account.mask}`}
                    {account.current_balance !== null && (
                      <span className="ml-2">
                        Balance: ${account.current_balance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                  {/* Show liability preview if available */}
                  {account.liability && (
                    <div className="text-xs text-gray-500 mt-1">
                      APR: {account.liability.purchase_apr?.toFixed(2) || 'N/A'}% •
                      Min Payment: $
                      {account.liability.minimum_payment?.toFixed(2) || 'N/A'}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Summary of auto-populated fields */}
      <div className="mb-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="font-semibold text-purple-900 mb-2">
          What We&apos;ll Auto-Populate
        </h4>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>✓ Card name and current balance from your bank</li>
          <li>✓ APR and credit limit from your bank</li>
          <li>✓ Minimum payment and statement dates from your bank</li>
          <li>
            ○ Card network, issuer, rewards structure, annual fee (you&apos;ll set
            these)
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-between">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading || selectedAccounts.length === 0}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading ? 'Confirming...' : 'Confirm Selection'}
        </button>
      </div>
    </div>
  );
}
