/**
 * Tests for TransferInitiation component
 *
 * Covers:
 * - Initial render with and without beneficiaries
 * - Beneficiary selection
 * - Amount input validation
 * - Exchange rate fetch (success, error, network failure)
 * - Countdown timer rendering
 * - Continue button state and onProceed callback
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransferInitiation from '../../../components/transfer/TransferInitiation';

// ---------- Mock data ----------

const mockBeneficiaries = [
  {
    id: 'ben-001',
    name: 'Amit Kumar',
    paymentMethod: 'upi',
    upiId: 'amit@okhdfcbank',
    phone: '9876543210'
  },
  {
    id: 'ben-002',
    name: 'Priya Sharma',
    paymentMethod: 'bank_account',
    account: '1234567890',
    ifsc: 'HDFC0000001',
    phone: '9876543211'
  }
];

const mockUserData = { email: 'user@example.com' };

const mockRateResponse = {
  success: true,
  data: {
    exchange_rate: 83.25,
    source_amount: 500,
    source_currency: 'USD',
    target_amount: 41366,
    target_currency: 'INR',
    fee_amount: 2.5,
    fee_percentage: 0.5,
    rate_valid_for_seconds: 30
  }
};

// ---------- Helpers ----------

/**
 * Render component with default props.
 * @param {Object} overrides - Prop overrides
 */
function renderComponent(overrides = {}) {
  const defaultProps = {
    beneficiaries: mockBeneficiaries,
    userData: mockUserData,
    onProceed: jest.fn()
  };
  return render(<TransferInitiation {...defaultProps} {...overrides} />);
}

// ---------- Tests ----------

describe('TransferInitiation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  // ---- Render ----

  describe('Rendering', () => {
    test('renders heading', () => {
      renderComponent();
      expect(screen.getByText('Send Money to India')).toBeInTheDocument();
    });

    test('renders beneficiary dropdown when beneficiaries provided', () => {
      renderComponent();
      expect(screen.getByLabelText('Select recipient')).toBeInTheDocument();
    });

    test('shows no-beneficiaries message when list is empty', () => {
      renderComponent({ beneficiaries: [] });
      expect(
        screen.getByText(/No saved beneficiaries/i)
      ).toBeInTheDocument();
    });

    test('renders amount input', () => {
      renderComponent();
      expect(screen.getByLabelText('Transfer amount in USD')).toBeInTheDocument();
    });

    test('renders Get Exchange Rate button', () => {
      renderComponent();
      expect(screen.getByText('Get Exchange Rate')).toBeInTheDocument();
    });

    test('Continue button is initially disabled (no rate fetched)', () => {
      renderComponent();
      const continueBtn = screen.getByLabelText('Continue to transfer review');
      expect(continueBtn).toBeDisabled();
    });
  });

  // ---- Beneficiary selection ----

  describe('Beneficiary Selection', () => {
    test('selecting a beneficiary shows its summary', () => {
      renderComponent();
      const select = screen.getByLabelText('Select recipient');
      fireEvent.change(select, { target: { value: 'ben-001' } });
      // The summary span appears below the dropdown (distinct from the option text)
      const summaryElements = screen.getAllByText(/amit@okhdfcbank/i);
      expect(summaryElements.length).toBeGreaterThan(0);
    });

    test('lists all beneficiaries in dropdown', () => {
      renderComponent();
      expect(screen.getByText(/Amit Kumar/)).toBeInTheDocument();
      expect(screen.getByText(/Priya Sharma/)).toBeInTheDocument();
    });
  });

  // ---- Amount validation ----

  describe('Amount Validation', () => {
    test('shows error on blur if amount is empty', () => {
      renderComponent();
      const input = screen.getByLabelText('Transfer amount in USD');
      fireEvent.blur(input);
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
    });

    test('shows error if amount is below minimum', () => {
      renderComponent();
      const input = screen.getByLabelText('Transfer amount in USD');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.blur(input);
      expect(screen.getByText('Minimum transfer is $1.00')).toBeInTheDocument();
    });

    test('shows error if amount exceeds maximum', () => {
      renderComponent();
      const input = screen.getByLabelText('Transfer amount in USD');
      fireEvent.change(input, { target: { value: '1000000' } });
      fireEvent.blur(input);
      expect(screen.getByText('Maximum transfer is $999,999')).toBeInTheDocument();
    });

    test('does not show error for valid amount', () => {
      renderComponent();
      const input = screen.getByLabelText('Transfer amount in USD');
      fireEvent.change(input, { target: { value: '500' } });
      fireEvent.blur(input);
      expect(screen.queryByText('Amount is required')).not.toBeInTheDocument();
      expect(screen.queryByText(/Minimum/i)).not.toBeInTheDocument();
    });

    test('rejects non-numeric characters', () => {
      renderComponent();
      const input = screen.getByLabelText('Transfer amount in USD');
      fireEvent.change(input, { target: { value: 'abc' } });
      expect(input.value).toBe('');
    });
  });

  // ---- Rate fetch ----

  describe('Exchange Rate Fetch', () => {
    test('shows error when no beneficiary is selected and rate fetch attempted', async () => {
      renderComponent();
      const input = screen.getByLabelText('Transfer amount in USD');
      fireEvent.change(input, { target: { value: '500' } });

      // The button is disabled when no beneficiary is selected, so we need to
      // check the disabled state or call fetchRate directly via programmatic click.
      // Since the button is disabled, we verify the disabled attribute prevents action.
      const rateBtn = screen.getByText('Get Exchange Rate').closest('button');
      expect(rateBtn).toBeDisabled();
    });

    test('fetches rate successfully and shows breakdown', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateResponse
      });

      renderComponent();

      // Select beneficiary
      const select = screen.getByLabelText('Select recipient');
      fireEvent.change(select, { target: { value: 'ben-001' } });

      // Enter amount
      const input = screen.getByLabelText('Transfer amount in USD');
      fireEvent.change(input, { target: { value: '500' } });

      // Fetch rate
      const rateBtn = screen.getByText('Get Exchange Rate');
      fireEvent.click(rateBtn);

      await waitFor(() => {
        expect(screen.getByText(/1 USD = 83.25 INR/)).toBeInTheDocument();
      });
    });

    test('shows fee and target amount after rate fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateResponse
      });

      renderComponent();
      fireEvent.change(screen.getByLabelText('Select recipient'), {
        target: { value: 'ben-001' }
      });
      fireEvent.change(screen.getByLabelText('Transfer amount in USD'), {
        target: { value: '500' }
      });
      fireEvent.click(screen.getByText('Get Exchange Rate'));

      await waitFor(() => {
        // Fee row
        expect(screen.getByText(/Transfer fee/i)).toBeInTheDocument();
      });
    });

    test('shows error when rate fetch API returns failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error_message: 'Rate service unavailable'
        })
      });

      renderComponent();
      fireEvent.change(screen.getByLabelText('Select recipient'), {
        target: { value: 'ben-001' }
      });
      fireEvent.change(screen.getByLabelText('Transfer amount in USD'), {
        target: { value: '500' }
      });
      fireEvent.click(screen.getByText('Get Exchange Rate'));

      await waitFor(() => {
        expect(screen.getByText('Rate service unavailable')).toBeInTheDocument();
      });
    });

    test('shows error on network failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network down'));

      renderComponent();
      fireEvent.change(screen.getByLabelText('Select recipient'), {
        target: { value: 'ben-001' }
      });
      fireEvent.change(screen.getByLabelText('Transfer amount in USD'), {
        target: { value: '500' }
      });
      fireEvent.click(screen.getByText('Get Exchange Rate'));

      await waitFor(() => {
        expect(
          screen.getByText(/Network error/i)
        ).toBeInTheDocument();
      });
    });

    test('enables Continue button after valid rate fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateResponse
      });

      renderComponent();
      fireEvent.change(screen.getByLabelText('Select recipient'), {
        target: { value: 'ben-001' }
      });
      fireEvent.change(screen.getByLabelText('Transfer amount in USD'), {
        target: { value: '500' }
      });
      fireEvent.click(screen.getByText('Get Exchange Rate'));

      await waitFor(() => {
        const continueBtn = screen.getByLabelText('Continue to transfer review');
        expect(continueBtn).not.toBeDisabled();
      });
    });
  });

  // ---- onProceed callback ----

  describe('onProceed Callback', () => {
    test('calls onProceed with rateData and beneficiary on Continue click', async () => {
      const onProceed = jest.fn();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateResponse
      });

      render(
        <TransferInitiation
          beneficiaries={mockBeneficiaries}
          userData={mockUserData}
          onProceed={onProceed}
        />
      );

      fireEvent.change(screen.getByLabelText('Select recipient'), {
        target: { value: 'ben-001' }
      });
      fireEvent.change(screen.getByLabelText('Transfer amount in USD'), {
        target: { value: '500' }
      });
      fireEvent.click(screen.getByText('Get Exchange Rate'));

      await waitFor(() => {
        expect(screen.getByLabelText('Continue to transfer review')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByLabelText('Continue to transfer review'));

      expect(onProceed).toHaveBeenCalledWith(
        expect.objectContaining({
          rateData: expect.objectContaining({ exchange_rate: 83.25 }),
          beneficiary: expect.objectContaining({ id: 'ben-001' }),
          sourceAmount: 500
        })
      );
    });
  });

  // ---- Countdown timer ----

  describe('Countdown Timer', () => {
    test('shows countdown timer label after rate fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateResponse
      });

      renderComponent();
      fireEvent.change(screen.getByLabelText('Select recipient'), {
        target: { value: 'ben-001' }
      });
      fireEvent.change(screen.getByLabelText('Transfer amount in USD'), {
        target: { value: '500' }
      });
      fireEvent.click(screen.getByText('Get Exchange Rate'));

      await waitFor(() => {
        expect(screen.getByText('Rate Locked')).toBeInTheDocument();
      });
    });
  });

  // ---- Rate fetch button states ----

  describe('Rate Button States', () => {
    test('fetch rate button is disabled without amount and beneficiary', () => {
      renderComponent();
      // The button itself is enabled by CSS; verify it's disabled via disabled attribute
      const btn = screen.getByText('Get Exchange Rate').closest('button');
      expect(btn).toBeDisabled();
    });

    test('shows "Refresh Rate" text when a rate is already loaded', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRateResponse
      });

      renderComponent();
      fireEvent.change(screen.getByLabelText('Select recipient'), {
        target: { value: 'ben-001' }
      });
      fireEvent.change(screen.getByLabelText('Transfer amount in USD'), {
        target: { value: '500' }
      });
      fireEvent.click(screen.getByText('Get Exchange Rate'));

      await waitFor(() => {
        expect(screen.getByText('Refresh Rate')).toBeInTheDocument();
      });
    });
  });
});
