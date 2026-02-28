/**
 * AddBeneficiaryFlow Component Tests
 *
 * Unit tests for AddBeneficiaryFlow component covering:
 * - Multi-step flow navigation
 * - Method selection (UPI vs Bank Account)
 * - Form rendering for each payment method
 * - Review rendering and confirmation
 * - API integration and error handling
 * - Success and error states
 * - Retry logic
 * - Cancel functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddBeneficiaryFlow from '../AddBeneficiaryFlow';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {
    auth_token: 'demo-token',
    user_id: 'demo-user-id'
  };
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock components
jest.mock('../BeneficiaryFormUPI', () => {
  return function MockUPIForm({ onSubmit, onCancel }) {
    return (
      <div data-testid="upi-form">
        <button onClick={() => onSubmit({ name: 'Test', phone: '9876543210', upiId: 'test@bank', relationship: 'family' })}>
          Submit UPI
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

jest.mock('../BeneficiaryFormBank', () => {
  return function MockBankForm({ onSubmit, onCancel }) {
    return (
      <div data-testid="bank-form">
        <button onClick={() => onSubmit({ name: 'Test', phone: '9876543210', account: '1234567890', ifsc: 'HDFC0000001', bankName: 'HDFC', relationship: 'family' })}>
          Submit Bank
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

jest.mock('../BeneficiaryReview', () => {
  return function MockReview({ onConfirm, onEdit, onCancel }) {
    return (
      <div data-testid="review">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  };
});

const mockOnBeneficiaryAdded = jest.fn();
const mockOnCancel = jest.fn();

describe('AddBeneficiaryFlow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  // ========== Initial Render Tests ==========

  test('renders method selection screen on mount', () => {
    render(
      <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
    );

    expect(screen.getByText(/add beneficiary/i)).toBeInTheDocument();
    expect(screen.getByText(/choose how you want to send money/i)).toBeInTheDocument();
  });

  test('renders both payment method options', () => {
    render(
      <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
    );

    expect(screen.getByText(/upi transfer/i)).toBeInTheDocument();
    expect(screen.getByText(/bank account transfer/i)).toBeInTheDocument();
  });

  // ========== Method Selection Tests ==========

  describe('Method Selection Flow', () => {
    test('navigates to UPI form when UPI is selected', () => {
      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      expect(screen.getByTestId('upi-form')).toBeInTheDocument();
    });

    test('navigates to Bank form when Bank Account is selected', () => {
      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      const bankOption = screen.getByText(/bank account transfer/i).closest('button');
      fireEvent.click(bankOption);

      expect(screen.getByTestId('bank-form')).toBeInTheDocument();
    });

    test('allows returning to method selection from form', () => {
      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Select UPI
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      expect(screen.getByTestId('upi-form')).toBeInTheDocument();

      // Go back
      const changeMethodBtn = screen.getByText(/change method/i);
      fireEvent.click(changeMethodBtn);

      expect(screen.getByText(/choose how you want to send money/i)).toBeInTheDocument();
    });
  });

  // ========== Form Submission Tests ==========

  describe('Form Submission Flow', () => {
    test('navigates to review screen after UPI form submission', async () => {
      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Select UPI
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      // Submit form
      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      // Should show review
      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });
    });

    test('navigates to review screen after Bank form submission', async () => {
      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Select Bank
      const bankOption = screen.getByText(/bank account transfer/i).closest('button');
      fireEvent.click(bankOption);

      // Submit form
      const submitBtn = screen.getByText('Submit Bank');
      fireEvent.click(submitBtn);

      // Should show review
      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });
    });
  });

  // ========== Review Navigation Tests ==========

  describe('Review Navigation', () => {
    test('returns to form when Edit is clicked on review', async () => {
      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Go through flow to review
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });

      // Click Edit
      const editBtn = screen.getByText('Edit');
      fireEvent.click(editBtn);

      // Should show form again
      expect(screen.getByTestId('upi-form')).toBeInTheDocument();
    });
  });

  // ========== API Integration Tests ==========

  describe('API Integration', () => {
    test('calls API when review is confirmed', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          beneficiary_id: 'ben-123',
          message: 'Success'
        })
      });

      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Go through flow to review
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });

      // Confirm review
      const confirmBtn = screen.getByText('Confirm');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/beneficiaries/add', expect.any(Object));
      });
    });

    test('sends correct API request format', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          beneficiary_id: 'ben-123'
        })
      });

      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Go through flow
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByText('Confirm');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        const call = fetch.mock.calls[0];
        expect(call[0]).toBe('/api/beneficiaries/add');
        expect(call[1].method).toBe('POST');
        expect(call[1].headers).toHaveProperty('Authorization');
        expect(call[1].headers).toHaveProperty('X-User-Id');
      });
    });
  });

  // ========== Success State Tests ==========

  describe('Success State', () => {
    test('shows success screen after successful API call', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          beneficiary_id: 'ben-123',
          message: 'Beneficiary added successfully'
        })
      });

      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Go through flow
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByText('Confirm');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/beneficiary added/i)).toBeInTheDocument();
      });
    });

    test('calls onBeneficiaryAdded callback on success', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          beneficiary_id: 'ben-123'
        })
      });

      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Go through flow
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByText('Confirm');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockOnBeneficiaryAdded).toHaveBeenCalled();
      });
    });
  });

  // ========== Error Handling Tests ==========

  describe('Error Handling', () => {
    test('shows error screen on API failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error_code: 'INVALID_UPI_FORMAT',
          error_message: 'UPI format is invalid',
          suggestion: 'Please use format: name@bank'
        })
      });

      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Go through flow
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByText('Confirm');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    test('shows network error message on fetch failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Go through flow
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByText('Confirm');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    test('allows retry after error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error_code: 'ERROR',
          error_message: 'Test error',
          suggestion: 'Try again'
        })
      });

      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      // Go through flow to error
      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const submitBtn = screen.getByText('Submit UPI');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('review')).toBeInTheDocument();
      });

      const confirmBtn = screen.getByText('Confirm');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Click retry
      const retryBtn = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryBtn);

      // Should be back to form
      expect(screen.getByTestId('upi-form')).toBeInTheDocument();
    });
  });

  // ========== Cancel Tests ==========

  describe('Cancel Functionality', () => {
    test('calls onCancel when cancel is clicked from method selection', () => {
      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    test('calls onCancel from form', () => {
      render(
        <AddBeneficiaryFlow onBeneficiaryAdded={mockOnBeneficiaryAdded} onCancel={mockOnCancel} />
      );

      const upiOption = screen.getByText(/upi transfer/i).closest('button');
      fireEvent.click(upiOption);

      const cancelBtn = screen.getAllByText('Cancel')[0];
      fireEvent.click(cancelBtn);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
