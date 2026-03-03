/**
 * Plaid Auth Service
 * Retrieves account and routing numbers from Plaid /auth/get endpoint
 *
 * Usage:
 * const authData = await getAuthData(accessToken, accountId);
 * // Returns: { account: "9900009606", routing: "011401533", ... }
 */

import { plaidPost } from './plaidApi';

/**
 * Retrieve ACH account and routing numbers from Plaid
 * @param {string} accessToken - Plaid access_token for the item
 * @param {string} [accountId] - Optional: specific account to retrieve
 * @returns {Promise<Object>} Auth data with account numbers and routing info
 * @throws {Error} If Plaid API fails or account not found
 */
export async function getAuthData(accessToken, accountId = null) {
  if (!accessToken) {
    throw new Error('[plaidAuthService] Missing access_token');
  }

  console.log('[plaidAuthService] Fetching auth data from Plaid', {
    accountId: accountId ? `${accountId.substring(0, 10)}...` : 'all',
  });

  try {
    // Call Plaid /auth/get endpoint
    const body = { access_token: accessToken };

    // If specific account requested, filter response
    if (accountId) {
      body.options = { account_ids: [accountId] };
    }

    const response = await plaidPost('/auth/get', body);

    console.log('[plaidAuthService] Successfully fetched auth data', {
      ach_count: response.numbers?.ach?.length || 0,
      accounts_count: response.accounts?.length || 0,
      institution: response.item?.institution_name,
    });

    // Validate response structure
    if (!response.numbers || !Array.isArray(response.numbers.ach)) {
      throw new Error('[plaidAuthService] Invalid response: missing ACH numbers');
    }

    if (response.numbers.ach.length === 0) {
      throw new Error('[plaidAuthService] No ACH accounts found in Plaid response');
    }

    // If specific account was requested, find it
    if (accountId) {
      const achAccount = response.numbers.ach.find(
        (item) => item.account_id === accountId
      );

      if (!achAccount) {
        console.error('[plaidAuthService] Account not found in response', {
          requested_account_id: accountId,
          available_accounts: response.numbers.ach.map((a) => a.account_id),
        });
        throw new Error(
          `[plaidAuthService] Account ${accountId} not found in Plaid auth response`
        );
      }

      return {
        account_number: achAccount.account,
        routing_number: achAccount.routing,
        wire_routing: achAccount.wire_routing || null,
        account_id: achAccount.account_id,
      };
    }

    // Return first ACH account if no specific one requested
    const primaryAccount = response.numbers.ach[0];
    return {
      account_number: primaryAccount.account,
      routing_number: primaryAccount.routing,
      wire_routing: primaryAccount.wire_routing || null,
      account_id: primaryAccount.account_id,
      all_accounts: response.numbers.ach.map((a) => ({
        account_number: a.account,
        routing_number: a.routing,
        account_id: a.account_id,
      })),
    };
  } catch (error) {
    if (error.message?.includes('[plaidAuthService]')) {
      // Already prefixed error from this service
      console.error('[plaidAuthService] Error:', error.message);
      throw error;
    }

    // Error from plaidApi or network
    console.error('[plaidAuthService] Failed to fetch auth data', {
      error_message: error.message,
      error_type: error.plaidError?.error_type,
      error_code: error.plaidError?.error_code,
      status_code: error.statusCode,
    });

    throw new Error(
      `Failed to retrieve bank account details from Plaid: ${
        error.message || 'Unknown error'
      }`
    );
  }
}

/**
 * Retrieve account details for a specific Plaid account
 * @param {string} accessToken - Plaid access_token
 * @param {string} accountId - Plaid account_id
 * @returns {Promise<Object>} Account details including name, type, mask
 */
export async function getAccountDetails(accessToken, accountId) {
  if (!accessToken || !accountId) {
    throw new Error('[plaidAuthService] Missing accessToken or accountId');
  }

  console.log('[plaidAuthService] Fetching account details', {
    account_id: `${accountId.substring(0, 10)}...`,
  });

  try {
    const authData = await getAuthData(accessToken, accountId);

    // Call /auth/get to also get account metadata
    const response = await plaidPost('/auth/get', {
      access_token: accessToken,
      options: { account_ids: [accountId] },
    });

    // Find matching account in accounts array
    const accountInfo = response.accounts?.[0];

    if (!accountInfo) {
      console.warn('[plaidAuthService] Account metadata not found', {
        account_id: accountId,
      });
      return authData; // Return auth data even if metadata missing
    }

    return {
      ...authData,
      account_name: accountInfo.name,
      account_type: accountInfo.type,
      account_subtype: accountInfo.subtype,
      account_mask: accountInfo.mask, // Last 4 digits
      owner_name: accountInfo.owner_name,
    };
  } catch (error) {
    console.error('[plaidAuthService] Failed to fetch account details', {
      error_message: error.message,
      account_id: accountId,
    });
    throw error;
  }
}

export default {
  getAuthData,
  getAccountDetails,
};
