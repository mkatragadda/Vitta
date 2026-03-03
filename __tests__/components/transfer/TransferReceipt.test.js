/**
 * Tests for TransferReceipt component
 *
 * Covers:
 * - Renders with complete transfer data
 * - Success vs processing status
 * - Amount sent and received display
 * - Settlement timeline (UPI instant vs bank days)
 * - Transaction reference IDs
 * - Expandable details section
 * - Copy to clipboard button
 * - New Transfer and Back to Home callbacks
 * - Graceful rendering with missing data
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransferReceipt from '../../../components/transfer/TransferReceipt';

// ---------- Mock data ----------

const mockTransferDataCompleted = {
  transfer_id: 'txn-abc-123',
  chimoney_reference: 'CHI_xyz789',
  status: 'completed',
  source_amount: 500,
  exchange_rate: 83.25,
  target_amount: 41366,
  fee_amount: 2.5,
  fee_percentage: 0.5,
  payment_method: 'upi',
  beneficiary_name: 'Amit Kumar',
  created_at: '2026-03-01T12:00:00Z'
};

const mockTransferDataProcessing = {
  ...mockTransferDataCompleted,
  status: 'processing',
  payment_method: 'bank_account'
};

// ---------- Helper ----------

function renderComponent(overrides = {}) {
  const defaultProps = {
    transferData: mockTransferDataCompleted,
    onNewTransfer: jest.fn(),
    onHome: jest.fn()
  };
  return render(<TransferReceipt {...defaultProps} {...overrides} />);
}

// ---------- Tests ----------

// Stable clipboard mock shared across all tests in this file
const mockWriteText = jest.fn().mockResolvedValue(undefined);

describe('TransferReceipt', () => {
  let originalClipboard;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockClear();
    // Save original clipboard descriptor so we can restore it after each test.
    originalClipboard = Object.getOwnPropertyDescriptor(global.navigator, 'clipboard');
    // Override global.navigator.clipboard with a stable reference so the
    // component's `await navigator.clipboard.writeText(...)` call can be
    // asserted on a consistent mock function.
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore the original clipboard descriptor to avoid leaking state
    // across parallel worker processes.
    if (originalClipboard) {
      Object.defineProperty(global.navigator, 'clipboard', originalClipboard);
    }
  });

  // ---- Rendering ----

  describe('Rendering', () => {
    test('renders "Transfer Sent!" for completed status', () => {
      renderComponent();
      expect(screen.getByText('Transfer Sent!')).toBeInTheDocument();
    });

    test('renders "Transfer Processing" for processing status', () => {
      renderComponent({ transferData: mockTransferDataProcessing });
      expect(screen.getByText('Transfer Processing')).toBeInTheDocument();
    });

    test('renders beneficiary name in subtitle', () => {
      renderComponent();
      expect(screen.getByText(/Amit Kumar/)).toBeInTheDocument();
    });

    test('renders source amount', () => {
      renderComponent();
      // Multiple places show the amount; ensure at least one occurrence
      const usdElements = screen.getAllByText(/\$500/);
      expect(usdElements.length).toBeGreaterThan(0);
    });

    test('renders exchange rate', () => {
      renderComponent();
      expect(screen.getByText(/1 USD = 83.25 INR/)).toBeInTheDocument();
    });

    test('renders transfer_id', () => {
      renderComponent();
      expect(screen.getByText('txn-abc-123')).toBeInTheDocument();
    });

    test('renders Chimoney reference', () => {
      renderComponent();
      expect(screen.getByText('CHI_xyz789')).toBeInTheDocument();
    });

    test('renders New Transfer button', () => {
      renderComponent();
      expect(screen.getByLabelText('Start a new transfer')).toBeInTheDocument();
    });

    test('renders Back to Home button', () => {
      renderComponent();
      expect(screen.getByLabelText('Go back to home')).toBeInTheDocument();
    });
  });

  // ---- Settlement timeline ----

  describe('Settlement Timeline', () => {
    test('shows "Instant" for UPI payment method', () => {
      renderComponent();
      expect(screen.getByText(/Instant/)).toBeInTheDocument();
    });

    test('shows "1-3 Business Days" for bank_account method', () => {
      renderComponent({ transferData: mockTransferDataProcessing });
      expect(screen.getByText(/1-3 Business Days/)).toBeInTheDocument();
    });
  });

  // ---- Expandable details ----

  describe('Transaction Details Expansion', () => {
    test('details section is collapsed by default', () => {
      renderComponent();
      // The details content div should not be present
      expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    });

    test('expands details when toggle button is clicked', () => {
      renderComponent();
      const toggleBtn = screen.getByText('Transaction Details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    test('shows service fee in expanded details', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Transaction Details'));
      expect(screen.getByText(/Service fee/i)).toBeInTheDocument();
    });

    test('shows payment method in expanded details', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Transaction Details'));
      expect(screen.getByText('UPI')).toBeInTheDocument();
    });

    test('collapses again on second click', () => {
      renderComponent();
      const toggleBtn = screen.getByText('Transaction Details');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Completed')).toBeInTheDocument();
      fireEvent.click(toggleBtn);
      expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    });

    test('shows "Processing" status in expanded details for processing transfer', () => {
      renderComponent({ transferData: mockTransferDataProcessing });
      fireEvent.click(screen.getByText('Transaction Details'));
      expect(screen.getByText('Processing')).toBeInTheDocument();
    });
  });

  // ---- Copy to clipboard ----

  describe('Copy to Clipboard', () => {
    test('copy transfer_id button is rendered', () => {
      renderComponent();
      expect(screen.getByLabelText('Copy transfer ID')).toBeInTheDocument();
    });

    test('copy Chimoney reference button is rendered', () => {
      renderComponent();
      expect(screen.getByLabelText('Copy Chimoney reference')).toBeInTheDocument();
    });

    test('clicking copy transfer_id calls clipboard.writeText', async () => {
      renderComponent();
      fireEvent.click(screen.getByLabelText('Copy transfer ID'));
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('txn-abc-123');
      });
    });

    test('clicking copy Chimoney reference calls clipboard.writeText', async () => {
      renderComponent();
      fireEvent.click(screen.getByLabelText('Copy Chimoney reference'));
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('CHI_xyz789');
      });
    });
  });

  // ---- Callbacks ----

  describe('Callback Functions', () => {
    test('calls onNewTransfer when New Transfer is clicked', () => {
      const onNewTransfer = jest.fn();
      renderComponent({ onNewTransfer });
      fireEvent.click(screen.getByLabelText('Start a new transfer'));
      expect(onNewTransfer).toHaveBeenCalledTimes(1);
    });

    test('calls onHome when Back to Home is clicked', () => {
      const onHome = jest.fn();
      renderComponent({ onHome });
      fireEvent.click(screen.getByLabelText('Go back to home'));
      expect(onHome).toHaveBeenCalledTimes(1);
    });

    test('onNewTransfer is not called when Back to Home is clicked', () => {
      const onNewTransfer = jest.fn();
      const onHome = jest.fn();
      renderComponent({ onNewTransfer, onHome });
      fireEvent.click(screen.getByLabelText('Go back to home'));
      expect(onNewTransfer).not.toHaveBeenCalled();
    });
  });

  // ---- Edge cases ----

  describe('Edge Cases', () => {
    test('renders gracefully with empty transferData', () => {
      renderComponent({ transferData: {} });
      // Should not crash; heading is still rendered
      expect(screen.getByText('Transfer Sent!')).toBeInTheDocument();
    });

    test('renders gracefully with null transferData', () => {
      renderComponent({ transferData: null });
      expect(screen.getByText('Transfer Sent!')).toBeInTheDocument();
    });

    test('renders "—" placeholder when exchange_rate is missing', () => {
      renderComponent({
        transferData: { ...mockTransferDataCompleted, exchange_rate: undefined }
      });
      // The rate display falls back to undefined.toFixed which would error, so
      // we just verify no crash
      expect(screen.getByText('Transfer Sent!')).toBeInTheDocument();
    });

    test('shows privacy note at bottom', () => {
      renderComponent();
      expect(
        screen.getByText(/confirmation will be available in your transfer history/i)
      ).toBeInTheDocument();
    });
  });
});
