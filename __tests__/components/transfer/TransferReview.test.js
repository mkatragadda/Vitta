/**
 * Tests for TransferReview component
 *
 * Covers:
 * - Initial render with transfer data
 * - Recipient details display
 * - Fee breakdown display
 * - Settlement timeline display
 * - Cancel button callback
 * - Confirm button initiates and executes transfer
 * - Error handling for API failures
 * - Rate change modal shown on >1% decline
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransferReview from '../../../components/transfer/TransferReview';

// ---------- Mock RateChangeModal ----------
jest.mock('../../../components/transfer/RateChangeModal', () => {
  return function MockRateChangeModal({ onAccept, onReject, rateDecision }) {
    return (
      <div data-testid="rate-change-modal">
        <p>Rate changed: {rateDecision?.change_percent}%</p>
        <button onClick={onAccept}>Accept Modal</button>
        <button onClick={onReject}>Reject Modal</button>
      </div>
    );
  };
});

// ---------- Mock data ----------

const mockRateData = {
  exchange_rate: 83.25,
  source_amount: 500,
  source_currency: 'USD',
  target_amount: 41366,
  target_currency: 'INR',
  fee_amount: 2.5,
  fee_percentage: 0.5
};

const mockBeneficiaryUPI = {
  id: 'ben-001',
  name: 'Amit Kumar',
  phone: '9876543210',
  paymentMethod: 'upi',
  upiId: 'amit@okhdfcbank'
};

const mockBeneficiaryBank = {
  id: 'ben-002',
  name: 'Priya Sharma',
  phone: '9876543211',
  paymentMethod: 'bank_account',
  account: '1234567890',
  ifsc: 'HDFC0000001'
};

const buildTransferData = (beneficiary = mockBeneficiaryUPI) => ({
  rateData: mockRateData,
  beneficiary,
  sourceAmount: 500
});

// ---------- Helpers ----------

function renderComponent(overrides = {}) {
  const defaultProps = {
    transferData: buildTransferData(),
    onConfirm: jest.fn(),
    onCancel: jest.fn()
  };
  return render(<TransferReview {...defaultProps} {...overrides} />);
}

// ---------- Tests ----------

describe('TransferReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  // ---- Rendering ----

  describe('Rendering', () => {
    test('renders heading', () => {
      renderComponent();
      expect(screen.getByText('Review Transfer')).toBeInTheDocument();
    });

    test('renders recipient name', () => {
      renderComponent();
      expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
    });

    test('renders UPI payment detail', () => {
      renderComponent();
      expect(screen.getByText(/UPI: amit@okhdfcbank/i)).toBeInTheDocument();
    });

    test('renders bank payment detail for bank_account beneficiary', () => {
      renderComponent({
        transferData: buildTransferData(mockBeneficiaryBank)
      });
      expect(screen.getByText(/Bank Account:/i)).toBeInTheDocument();
    });

    test('renders source amount', () => {
      renderComponent();
      // Multiple elements may show the USD amount
      const usdElements = screen.getAllByText(/\$500/);
      expect(usdElements.length).toBeGreaterThan(0);
    });

    test('renders exchange rate', () => {
      renderComponent();
      expect(screen.getAllByText(/1 USD = 83.25 INR/i).length).toBeGreaterThan(0);
    });

    test('renders fee breakdown row', () => {
      renderComponent();
      expect(screen.getByText(/Service fee/i)).toBeInTheDocument();
    });

    test('renders settlement time for UPI as Instant', () => {
      renderComponent();
      expect(screen.getByText(/Instant \(UPI\)/i)).toBeInTheDocument();
    });

    test('renders settlement time as business days for bank account', () => {
      renderComponent({
        transferData: buildTransferData(mockBeneficiaryBank)
      });
      expect(screen.getByText(/1-3 business days/i)).toBeInTheDocument();
    });

    test('Cancel and Confirm buttons are rendered', () => {
      renderComponent();
      expect(screen.getByLabelText('Cancel transfer')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm and send transfer')).toBeInTheDocument();
    });
  });

  // ---- Cancel ----

  describe('Cancel Button', () => {
    test('calls onCancel when Cancel is clicked', () => {
      const onCancel = jest.fn();
      renderComponent({ onCancel });
      fireEvent.click(screen.getByLabelText('Cancel transfer'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('Cancel button is disabled during loading', async () => {
      // Mock a delayed response so loading state persists
      global.fetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: { transfer_id: 'txn-001' }
                  })
                }),
              500
            )
          )
      );

      renderComponent();
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(screen.getByLabelText('Cancel transfer')).toBeDisabled();
      });
    });
  });

  // ---- Confirm flow ----

  describe('Confirm Button - Successful Transfer', () => {
    test('calls POST /api/transfers/initiate then /api/transfers/execute on confirm', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { transfer_id: 'txn-001' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              transfer_id: 'txn-001',
              chimoney_reference: 'CHI_123',
              status: 'completed',
              source_amount: 500,
              exchange_rate: 83.25,
              target_amount: 41366,
              fee_amount: 2.5,
              payment_method: 'upi',
              beneficiary_name: 'Amit Kumar',
              created_at: '2026-03-01T12:00:00Z'
            }
          })
        });

      const onConfirm = jest.fn();
      renderComponent({ onConfirm });
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/transfers/initiate',
          expect.objectContaining({ method: 'POST' })
        );
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/transfers/execute',
          expect.objectContaining({ method: 'POST' })
        );
      });

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({ transfer_id: 'txn-001' })
        );
      });
    });
  });

  // ---- Error handling ----

  describe('Error Handling', () => {
    test('shows error when initiate fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error_message: 'Beneficiary not found'
        })
      });

      renderComponent();
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(screen.getByText('Beneficiary not found')).toBeInTheDocument();
      });
    });

    test('shows error when execute fails', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { transfer_id: 'txn-001' }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            success: false,
            error_message: 'Insufficient funds'
          })
        });

      renderComponent();
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
      });
    });

    test('shows network error message when fetch throws', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      renderComponent();
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  // ---- Rate Change Modal ----

  describe('Rate Change Modal', () => {
    test('shows rate change modal when execute returns rate_decision alert', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { transfer_id: 'txn-001' }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            success: false,
            error_code: 'RATE_CHANGED',
            rate_decision: {
              action: 'alert',
              original_rate: 83.50,
              current_rate: 82.10,
              change_percent: 1.68,
              loss_amount: 700
            }
          })
        });

      renderComponent();
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(screen.getByTestId('rate-change-modal')).toBeInTheDocument();
      });
    });

    test('proceeds with transfer when rate modal Accept is clicked', async () => {
      const successData = {
        transfer_id: 'txn-001',
        chimoney_reference: 'CHI_123',
        status: 'completed',
        source_amount: 500,
        exchange_rate: 82.10,
        target_amount: 41050,
        fee_amount: 2.5,
        payment_method: 'upi',
        beneficiary_name: 'Amit Kumar',
        created_at: '2026-03-01T12:00:00Z'
      };

      global.fetch
        // initiate
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { transfer_id: 'txn-001' } })
        })
        // execute → rate changed
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            success: false,
            error_code: 'RATE_CHANGED',
            rate_decision: {
              action: 'alert',
              original_rate: 83.50,
              current_rate: 82.10,
              change_percent: 1.68,
              loss_amount: 700
            }
          })
        })
        // execute again after acceptance
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: successData })
        });

      const onConfirm = jest.fn();
      renderComponent({ onConfirm });
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(screen.getByTestId('rate-change-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Accept Modal'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ transfer_id: 'txn-001' }));
      });
    });

    test('calls onCancel when rate modal Reject is clicked', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { transfer_id: 'txn-001' } })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            success: false,
            error_code: 'RATE_CHANGED',
            rate_decision: {
              action: 'alert',
              original_rate: 83.50,
              current_rate: 82.10,
              change_percent: 1.68,
              loss_amount: 700
            }
          })
        });

      const onCancel = jest.fn();
      renderComponent({ onCancel });
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(screen.getByTestId('rate-change-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Reject Modal'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Loading state ----

  describe('Loading State', () => {
    test('Confirm button shows Processing text when loading', async () => {
      global.fetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: { transfer_id: 'txn-001' }
                  })
                }),
              500
            )
          )
      );

      renderComponent();
      fireEvent.click(screen.getByLabelText('Confirm and send transfer'));

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });
  });
});
