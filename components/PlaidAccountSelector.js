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
 *  - user: { id, ... }
 *  - plaidItemId: string (database UUID from plaid_items)
 *  - accounts: [] (from exchange-token response, all accounts)
 *  - alreadyAddedAccounts: [] (optional, from add-more-accounts response)
 *  - onComplete: function(addedCards)
 *  - onBack: function()
 */

import React, { useState, useEffect } from 'react';

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

  // Debug logging on mount and when accounts change
  useEffect(() => {
    console.log('[PlaidAccountSelector] Component mounted with accounts:', accounts);
    if (accounts && accounts.length > 0) {
      console.log('[PlaidAccountSelector] Account details:');
      accounts.forEach((acc, idx) => {
        console.log(`  Account ${idx}:`, {
          name: acc.name,
          plaid_account_id: acc.plaid_account_id,
          account_type: acc.account_type,
          account_subtype: acc.account_subtype,
          subtype_check: acc.account_subtype === 'credit_card',
          all_keys: Object.keys(acc),
        });
      });
    }
  }, [accounts]);

  // Supported account types: any depository or credit type
  // Includes: credit cards, debit cards, checking, savings, money market, etc.
  // Excludes: loans, investments, and other non-transactional accounts
  const isAccountTypeSupported = (subtype) => {
    if (!subtype) return false;
    const normalized = subtype.toLowerCase().trim();

    // Explicitly supported account subtypes
    const supported = [
      'credit_card', 'credit card', 'creditcard', 'credit',
      'debit_card', 'debit card', 'debitcard', 'debit',
      'checking', 'savings', 'money_market', 'money market',
      'cd', 'certificate_of_deposit', 'prepaid', 'depository'
    ];

    return supported.includes(normalized);
  };

  // Filter and categorize accounts
  const supportedAccounts = accounts.filter((acc) =>
    isAccountTypeSupported(acc.account_subtype)
  );

  // Group accounts by category for better UX
  const accountsByCategory = {
    credit: supportedAccounts.filter((acc) => {
      const subtype = acc.account_subtype?.toLowerCase().trim() || '';
      return subtype.includes('credit') || acc.account_type?.toLowerCase().includes('credit');
    }),
    debit: supportedAccounts.filter((acc) => {
      const subtype = acc.account_subtype?.toLowerCase().trim() || '';
      return subtype.includes('debit') && !subtype.includes('credit');
    }),
    checking: supportedAccounts.filter((acc) => {
      const subtype = acc.account_subtype?.toLowerCase().trim() || '';
      // Include: checking, savings, money market, CD, and other depository accounts (but not credit)
      return (
        subtype === 'checking' ||
        subtype === 'savings' ||
        subtype === 'money_market' ||
        subtype === 'cd' ||
        subtype === 'certificate_of_deposit' ||
        subtype === 'prepaid' ||
        (subtype === 'depository' && !subtype.includes('credit'))
      );
    }),
  };

  console.log('[PlaidAccountSelector] Account categorization:', {
    total_accounts: accounts.length,
    supported_accounts: supportedAccounts.length,
    subtypes_found: accounts.map((acc) => acc.account_subtype),
    by_category: {
      credit: accountsByCategory.credit.length,
      debit: accountsByCategory.debit.length,
      checking: accountsByCategory.checking.length,
    },
  });

  // Enhanced debug: show all accounts with detailed filtering info
  console.log('[PlaidAccountSelector] DETAILED ACCOUNT ANALYSIS:');
  accounts.forEach((acc, idx) => {
    const subtype = acc.account_subtype?.toLowerCase().trim() || '';
    const isSupported = isAccountTypeSupported(acc.account_subtype);
    console.log(`  Account ${idx}: ${acc.name}`, {
      subtype: acc.account_subtype,
      subtype_normalized: subtype,
      account_type: acc.account_type,
      is_supported: isSupported,
      category: isSupported
        ? subtype.includes('credit')
          ? 'CREDIT'
          : subtype.includes('debit')
          ? 'DEBIT'
          : 'BANK ACCOUNTS'
        : 'NOT SUPPORTED',
      reason: !isSupported
        ? `Subtype "${acc.account_subtype}" not in supported list`
        : 'OK',
    });
  });

  // Separate into already-added and available
  const alreadyAddedIds = new Set(
    alreadyAddedAccounts.map((acc) => acc.plaid_account_id)
  );
  const availableAccounts = supportedAccounts.filter(
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
      const selected_accounts = selectedAccounts.map((accountId) => ({
        plaid_account_id: accountId,
        nickname: null, // User can set nickname in post-connect form
      }));

      const response = await fetch('/api/plaid/confirm-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
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
            : 'Available Accounts'}
        </h3>

        {availableAccounts.length === 0 ? (
          <div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-blue-700 text-sm">
                {alreadyAddedAccounts.length > 0
                  ? 'All accounts from this bank are already added.'
                  : 'No compatible accounts found for this bank.'}
              </p>
            </div>
            {/* Debug panel: Show all accounts when filtering returns nothing */}
            {accounts && accounts.length > 0 && supportedAccounts.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-xs font-semibold mb-2">
                  DEBUG: Accounts received but none are compatible
                </p>
                <div className="text-xs text-yellow-700 bg-white p-2 rounded border border-yellow-100 overflow-auto max-h-48">
                  <pre>{JSON.stringify(accounts, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Credit Cards Section */}
            {accountsByCategory.credit.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">💳</span> Credit Cards
                </h4>
                <div className="space-y-2">
                  {accountsByCategory.credit
                    .filter((acc) => !alreadyAddedIds.has(acc.plaid_account_id))
                    .map((account) => (
                      <AccountCheckbox
                        key={account.plaid_account_id}
                        account={account}
                        selected={selectedAccounts.includes(account.plaid_account_id)}
                        onToggle={() => toggleAccount(account.plaid_account_id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Debit Cards Section */}
            {accountsByCategory.debit.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🏦</span> Debit Cards
                </h4>
                <div className="space-y-2">
                  {accountsByCategory.debit
                    .filter((acc) => !alreadyAddedIds.has(acc.plaid_account_id))
                    .map((account) => (
                      <AccountCheckbox
                        key={account.plaid_account_id}
                        account={account}
                        selected={selectedAccounts.includes(account.plaid_account_id)}
                        onToggle={() => toggleAccount(account.plaid_account_id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Bank Accounts Section (Checking, Savings, Money Market, etc.) */}
            {accountsByCategory.checking.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <span className="text-lg">🧾</span> Bank Accounts
                </h4>
                <div className="space-y-2">
                  {accountsByCategory.checking
                    .filter((acc) => !alreadyAddedIds.has(acc.plaid_account_id))
                    .map((account) => (
                      <AccountCheckbox
                        key={account.plaid_account_id}
                        account={account}
                        selected={selectedAccounts.includes(account.plaid_account_id)}
                        onToggle={() => toggleAccount(account.plaid_account_id)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug Section: Show all accounts returned by Plaid */}
      <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
            DEBUG: View all accounts returned by Plaid ({accounts.length} total)
          </summary>
          <div className="bg-white p-2 rounded border border-gray-200 overflow-auto max-h-64 mt-2">
            <pre>{JSON.stringify(
              accounts.map((acc) => ({
                name: acc.name,
                subtype: acc.account_subtype,
                type: acc.account_type,
                balance: acc.current_balance,
                mask: acc.mask,
              })),
              null,
              2
            )}</pre>
          </div>
        </details>
      </div>

      {/* Summary of auto-populated fields */}
      <div className="mb-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="font-semibold text-purple-900 mb-2">
          What We&apos;ll Auto-Populate
        </h4>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>✓ Account name and current balance</li>
          <li>✓ Account type (credit card, debit card, checking)</li>
          <li>✓ Account number (last 4 digits)</li>
          <li>✓ For credit cards: APR, credit limit, minimum payment, statement dates</li>
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

/**
 * Reusable account checkbox component
 */
function AccountCheckbox({ account, selected, onToggle }) {
  return (
    <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
      />
      <div className="ml-4 flex-1">
        <div className="font-medium text-gray-900">{account.name}</div>
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
        {/* Show liability preview if available (credit cards only) */}
        {account.liability && (
          <div className="text-xs text-gray-500 mt-1">
            APR: {account.liability.purchase_apr?.toFixed(2) || 'N/A'}% •
            Min Payment: ${account.liability.minimum_payment?.toFixed(2) || 'N/A'}
          </div>
        )}
      </div>
    </label>
  );
}
