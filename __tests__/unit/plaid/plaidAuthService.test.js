/**
 * Tests for Plaid Auth Service
 * Tests /auth/get endpoint integration for retrieving account and routing numbers
 */

import { getAuthData, getAccountDetails } from '../../../services/plaid/plaidAuthService';
import * as plaidApi from '../../../services/plaid/plaidApi';

jest.mock('../../../services/plaid/plaidApi');

describe('Plaid Auth Service', () => {
  const mockAccessToken = 'access_token_test_xyz';
  const mockAccountId = 'vzeNDwK7KQIm4yEog683uElbp9GRLEFXGK98D';

  const mockAuthResponse = {
    numbers: {
      ach: [
        {
          account_id: mockAccountId,
          account: '9900009606',
          routing: '011401533',
          wire_routing: '021000021',
        },
      ],
    },
    accounts: [
      {
        account_id: mockAccountId,
        name: 'Checking',
        type: 'depository',
        subtype: 'checking',
        mask: '9606',
        owner_name: 'John Doe',
      },
    ],
    item: {
      item_id: 'KdDrm1234567890',
      institution_id: 'ins_1',
      institution_name: 'Chase Bank',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // getAuthData Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('getAuthData', () => {
    test('returns account number and routing number for access token', async () => {
      plaidApi.plaidPost.mockResolvedValue(mockAuthResponse);

      const result = await getAuthData(mockAccessToken);

      expect(result).toEqual({
        account_number: '9900009606',
        routing_number: '011401533',
        wire_routing: '021000021',
        account_id: mockAccountId,
        all_accounts: [
          {
            account_number: '9900009606',
            routing_number: '011401533',
            account_id: mockAccountId,
          },
        ],
      });

      expect(plaidApi.plaidPost).toHaveBeenCalledWith('/auth/get', {
        access_token: mockAccessToken,
      });
    });

    test('returns specific account when accountId provided', async () => {
      plaidApi.plaidPost.mockResolvedValue(mockAuthResponse);

      const result = await getAuthData(mockAccessToken, mockAccountId);

      expect(result).toEqual({
        account_number: '9900009606',
        routing_number: '011401533',
        wire_routing: '021000021',
        account_id: mockAccountId,
      });

      expect(plaidApi.plaidPost).toHaveBeenCalledWith('/auth/get', {
        access_token: mockAccessToken,
        options: { account_ids: [mockAccountId] },
      });
    });

    test('throws error if access token missing', async () => {
      await expect(getAuthData(null)).rejects.toThrow('[plaidAuthService] Missing access_token');
      await expect(getAuthData('')).rejects.toThrow('[plaidAuthService] Missing access_token');
    });

    test('throws error if Plaid API returns no ACH numbers', async () => {
      plaidApi.plaidPost.mockResolvedValue({
        numbers: { ach: [] },
        accounts: [],
        item: {},
      });

      await expect(getAuthData(mockAccessToken)).rejects.toThrow(
        '[plaidAuthService] No ACH accounts found'
      );
    });

    test('throws error if Plaid API returns invalid response structure', async () => {
      plaidApi.plaidPost.mockResolvedValue({
        numbers: {}, // Missing ach array
        accounts: [],
      });

      await expect(getAuthData(mockAccessToken)).rejects.toThrow(
        'Invalid response: missing ACH numbers'
      );
    });

    test('throws error if requested account not found in response', async () => {
      plaidApi.plaidPost.mockResolvedValue({
        numbers: {
          ach: [
            {
              account_id: 'different-account-id',
              account: '1234567890',
              routing: '021000021',
            },
          ],
        },
        accounts: [],
      });

      await expect(getAuthData(mockAccessToken, mockAccountId)).rejects.toThrow(
        `Account ${mockAccountId} not found`
      );
    });

    test('handles Plaid API errors with proper error propagation', async () => {
      const plaidError = new Error('Plaid API error');
      plaidError.plaidError = {
        error_type: 'INVALID_REQUEST',
        error_code: 'INVALID_ACCESS_TOKEN',
        error_message: 'Access token is invalid or expired',
      };
      plaidError.statusCode = 401;

      plaidApi.plaidPost.mockRejectedValue(plaidError);

      await expect(getAuthData(mockAccessToken)).rejects.toThrow(
        'Failed to retrieve bank account details from Plaid'
      );
    });

    test('handles network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      plaidApi.plaidPost.mockRejectedValue(networkError);

      await expect(getAuthData(mockAccessToken)).rejects.toThrow(
        'Failed to retrieve bank account details from Plaid'
      );
    });

    test('handles wire routing as optional field', async () => {
      const responseNoWireRouting = {
        ...mockAuthResponse,
        numbers: {
          ach: [
            {
              account_id: mockAccountId,
              account: '9900009606',
              routing: '011401533',
              // wire_routing omitted
            },
          ],
        },
      };

      plaidApi.plaidPost.mockResolvedValue(responseNoWireRouting);

      const result = await getAuthData(mockAccessToken, mockAccountId);

      expect(result.wire_routing).toBeNull();
      expect(result.account_number).toBe('9900009606');
      expect(result.routing_number).toBe('011401533');
    });

    test('handles multiple ACH accounts and returns first', async () => {
      const multiAccountResponse = {
        numbers: {
          ach: [
            {
              account_id: 'account1',
              account: '1111111111',
              routing: '111111111',
            },
            {
              account_id: 'account2',
              account: '2222222222',
              routing: '222222222',
            },
          ],
        },
        accounts: [],
      };

      plaidApi.plaidPost.mockResolvedValue(multiAccountResponse);

      const result = await getAuthData(mockAccessToken);

      expect(result.account_number).toBe('1111111111');
      expect(result.routing_number).toBe('111111111');
      expect(result.all_accounts).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // getAccountDetails Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe('getAccountDetails', () => {
    test('returns full account details including metadata', async () => {
      plaidApi.plaidPost.mockResolvedValue(mockAuthResponse);

      const result = await getAccountDetails(mockAccessToken, mockAccountId);

      expect(result).toMatchObject({
        account_number: '9900009606',
        routing_number: '011401533',
        account_name: 'Checking',
        account_type: 'depository',
        account_subtype: 'checking',
        account_mask: '9606',
        owner_name: 'John Doe',
      });

      // plaidPost is called twice: once in getAuthData, once in getAccountDetails
      expect(plaidApi.plaidPost).toHaveBeenCalledTimes(2);
    });

    test('throws error if missing accessToken or accountId', async () => {
      await expect(getAccountDetails(null, mockAccountId)).rejects.toThrow(
        'Missing accessToken or accountId'
      );

      await expect(getAccountDetails(mockAccessToken, null)).rejects.toThrow(
        'Missing accessToken or accountId'
      );
    });

    test('returns auth data if account metadata missing', async () => {
      const responseNoMetadata = {
        numbers: {
          ach: [
            {
              account_id: mockAccountId,
              account: '9900009606',
              routing: '011401533',
            },
          ],
        },
        accounts: [], // Empty accounts array
      };

      plaidApi.plaidPost.mockResolvedValue(responseNoMetadata);

      const result = await getAccountDetails(mockAccessToken, mockAccountId);

      expect(result).toHaveProperty('account_number', '9900009606');
      expect(result).toHaveProperty('routing_number', '011401533');
      expect(result.account_name).toBeUndefined();
    });

    test('propagates errors from getAuthData', async () => {
      const plaidError = new Error('Invalid token');
      plaidError.plaidError = {
        error_code: 'INVALID_ACCESS_TOKEN',
      };

      plaidApi.plaidPost.mockRejectedValue(plaidError);

      await expect(getAccountDetails(mockAccessToken, mockAccountId)).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Error Handling & Edge Cases
  // ═══════════════════════════════════════════════════════════════════════

  describe('Error handling and edge cases', () => {
    test('logs detailed error information for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      plaidApi.plaidPost.mockRejectedValue(
        new Error('Network error')
      );

      try {
        await getAuthData(mockAccessToken);
      } catch (e) {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalled();
      const callArgs = consoleSpy.mock.calls[0];
      expect(callArgs[0]).toContain('plaidAuthService');

      consoleSpy.mockRestore();
    });

    test('sanitizes access token in logs (no full token exposure)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      plaidApi.plaidPost.mockResolvedValue(mockAuthResponse);
      await getAuthData(mockAccessToken);

      const logCalls = consoleSpy.mock.calls.map((call) => call.join(' '));
      const fullTokenExposed = logCalls.some((log) =>
        log.includes(mockAccessToken)
      );

      expect(fullTokenExposed).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
