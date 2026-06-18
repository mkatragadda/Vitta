/**
 * Tests for pages/transfer/confirm/[token].js
 *
 * Covers:
 * - Loading state on mount
 * - Valid token renders transfer details
 * - Invalid/expired token shows error/expired state
 * - Confirm button triggers execute endpoint
 * - Success state after execution
 * - Error state when execution fails
 * - Countdown timer display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mock next/router ──────────────────────────────────────────────────────────

const mockRouterReload = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { token: 'xYz9K12A' },
    reload: mockRouterReload,
  }),
}));

// ── Mock next/head ────────────────────────────────────────────────────────────

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

// ── Mock fetch ────────────────────────────────────────────────────────────────

global.fetch = jest.fn();

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validTransfer = {
  id: 'pt_001',
  source_amount: 500,
  source_currency: 'USD',
  target_amount: 41250,
  target_currency: 'INR',
  exchange_rate: 82.5,
  fee_total: 4.99,
  expires_at: new Date(Date.now() + 840_000).toISOString(),
  wise_recipient: {
    account_holder_name: 'Maria Garcia',
    type: 'upi',
    upi_id: 'maria@paytm',
    last4: 'aytm',
  },
};

function mockVerifySuccess(transfer = validTransfer) {
  return {
    ok: true,
    json: async () => ({ valid: true, transfer }),
  };
}

function mockVerifyError(error = 'Token expired') {
  return {
    ok: false,
    json: async () => ({ valid: false, error }),
  };
}

function mockExecuteSuccess() {
  return {
    ok: true,
    json: async () => ({
      success: true,
      transferId: 'wise_123',
      reference: 'SMS-PT001ABC',
      status: 'processing',
    }),
  };
}

function mockExecuteError(error = 'Transfer failed') {
  return {
    ok: true,
    json: async () => ({ success: false, error }),
  };
}

// ── Import component after mocks ──────────────────────────────────────────────

import TransferConfirmPage from '../../../pages/transfer/confirm/[token]';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransferConfirmPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', async () => {
    // fetch never resolves — stays in loading
    fetch.mockImplementation(() => new Promise(() => {}));

    render(<TransferConfirmPage />);

    expect(screen.getByText(/Loading transfer details/i)).toBeInTheDocument();
  });

  test('shows transfer details after successful verify', async () => {
    fetch.mockResolvedValueOnce(mockVerifySuccess());

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/Review Your Transfer/i)).toBeInTheDocument();
    });

    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText(/41250.00 INR/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm Transfer/i })).toBeInTheDocument();
  });

  test('shows expired state when verify returns expir error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ valid: false, error: 'Token expired' }),
    });

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/Link Expired/i)).toBeInTheDocument();
    });
  });

  test('shows error state for non-expiry invalid token', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ valid: false, error: 'Token already used' }),
    });

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/Token already used/i)).toBeInTheDocument();
    });
  });

  test('shows error state when fetch throws', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load transfer details/i)).toBeInTheDocument();
    });
  });

  test('shows processing state while confirming', async () => {
    fetch
      .mockResolvedValueOnce(mockVerifySuccess())
      .mockImplementationOnce(() => new Promise(() => {})); // execute never resolves

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Transfer/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Transfer/i }));

    await waitFor(() => {
      expect(screen.getByText(/Processing transfer/i)).toBeInTheDocument();
    });
  });

  test('shows success state after confirmed execution', async () => {
    fetch
      .mockResolvedValueOnce(mockVerifySuccess())
      .mockResolvedValueOnce(mockExecuteSuccess());

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Transfer/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Transfer/i }));

    await waitFor(() => {
      expect(screen.getByText(/Transfer Complete/i)).toBeInTheDocument();
    });

    expect(screen.getByText('SMS-PT001ABC')).toBeInTheDocument();
  });

  test('shows error state when execution fails', async () => {
    fetch
      .mockResolvedValueOnce(mockVerifySuccess())
      .mockResolvedValueOnce(mockExecuteError('Insufficient funds'));

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Transfer/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Transfer/i }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
    });
  });

  test('shows error state when execute fetch throws', async () => {
    fetch
      .mockResolvedValueOnce(mockVerifySuccess())
      .mockRejectedValueOnce(new Error('Network error'));

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Transfer/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Transfer/i }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  test('posts token to execute endpoint on confirm', async () => {
    fetch
      .mockResolvedValueOnce(mockVerifySuccess())
      .mockResolvedValueOnce(mockExecuteSuccess());

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Transfer/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Transfer/i }));

    await waitFor(() => {
      expect(screen.getByText(/Transfer Complete/i)).toBeInTheDocument();
    });

    const executeCall = fetch.mock.calls[1];
    expect(executeCall[0]).toBe('/api/sms/transfer/execute');
    expect(executeCall[1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'xYz9K12A' }),
    });
  });

  test('shows countdown timer when transfer has expires_at', async () => {
    fetch.mockResolvedValueOnce(mockVerifySuccess());

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/Link expires in/i)).toBeInTheDocument();
    });
  });

  test('shows exchange rate row', async () => {
    fetch.mockResolvedValueOnce(mockVerifySuccess());

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/Exchange Rate/i)).toBeInTheDocument();
      expect(screen.getByText(/1 USD = 82.50 INR/i)).toBeInTheDocument();
    });
  });

  test('shows transfer fee when fee_total is set', async () => {
    fetch.mockResolvedValueOnce(mockVerifySuccess());

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/Transfer Fee/i)).toBeInTheDocument();
      expect(screen.getByText('$4.99')).toBeInTheDocument();
    });
  });

  test('shows reload button in error state', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(mockRouterReload).toHaveBeenCalled();
  });

  test('transitions to expired when countdown reaches zero', async () => {
    // Provide expires_at 1.5 seconds from now so real timer expires during test
    const nearExpiryTransfer = {
      ...validTransfer,
      expires_at: new Date(Date.now() + 1500).toISOString(),
    };

    fetch.mockResolvedValueOnce(mockVerifySuccess(nearExpiryTransfer));

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Transfer/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Link Expired/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('shows UPI account masking in account row', async () => {
    fetch.mockResolvedValueOnce(mockVerifySuccess());

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/UPI \*\*\*\*aytm/i)).toBeInTheDocument();
    });
  });

  test('shows bank account masking when upi_id is null', async () => {
    const bankTransfer = {
      ...validTransfer,
      wise_recipient: {
        account_holder_name: 'Maria Garcia',
        type: 'bank',
        upi_id: null,
        last4: '4321',
      },
    };

    fetch.mockResolvedValueOnce(mockVerifySuccess(bankTransfer));

    render(<TransferConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText(/\*\*\*\*4321/)).toBeInTheDocument();
    });
  });
});
