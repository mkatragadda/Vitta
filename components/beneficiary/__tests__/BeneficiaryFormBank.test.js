/**
 * BeneficiaryFormBank Component Tests
 *
 * Unit tests for BeneficiaryFormBank component covering:
 * - Rendering and initial state
 * - Input validation (name, phone, account, IFSC, bank name, relationship)
 * - Auto-formatting (IFSC uppercase)
 * - Real-time feedback and error messages
 * - Form submission
 * - Accessibility features
 * - Loading and disabled states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeneficiaryFormBank from '../BeneficiaryFormBank';

// Mock data
const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

describe('BeneficiaryFormBank Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== Rendering Tests ==========

  test('renders form with all required fields', () => {
    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ifsc code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bank name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
  });

  test('renders form title', () => {
    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByText(/add bank beneficiary/i)).toBeInTheDocument();
  });

  test('renders submit and cancel buttons', () => {
    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByRole('button', { name: /add beneficiary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('populates initial data when provided', () => {
    const initialData = {
      name: 'Amit Kumar',
      phone: '9876543210',
      account: '1234567890',
      ifsc: 'HDFC0000001',
      bankName: 'HDFC Bank',
      relationship: 'family'
    };

    render(
      <BeneficiaryFormBank
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByDisplayValue('Amit Kumar')).toBeInTheDocument();
    expect(screen.getByDisplayValue('HDFC Bank')).toBeInTheDocument();
  });

  // ========== Account Field Validation ==========

  describe('Account Number Validation', () => {
    test('shows error when account is empty on submit', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/account number is required/i)).toBeInTheDocument();
      });
    });

    test('shows error when account has less than 9 digits', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const accountInput = screen.getByLabelText(/account number/i);
      fireEvent.change(accountInput, { target: { value: '12345678' } });
      fireEvent.blur(accountInput);

      await waitFor(() => {
        expect(screen.getByText(/account must be 9-18 digits/i)).toBeInTheDocument();
      });
    });

    test('shows error when account has more than 18 digits', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const accountInput = screen.getByLabelText(/account number/i);
      fireEvent.change(accountInput, { target: { value: '123456789012345678901' } });
      fireEvent.blur(accountInput);

      await waitFor(() => {
        expect(screen.getByText(/account must be 9-18 digits/i)).toBeInTheDocument();
      });
    });

    test('accepts valid account numbers', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const validAccounts = [
        '123456789', // 9 digits
        '12345678901234567', // 17 digits
        '123456789012345678' // 18 digits
      ];

      for (const account of validAccounts) {
        const accountInput = screen.getByLabelText(/account number/i);
        fireEvent.change(accountInput, { target: { value: account } });
        fireEvent.blur(accountInput);

        await waitFor(() => {
          expect(screen.queryByText(/account must be 9-18 digits/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  // ========== IFSC Field Validation ==========

  describe('IFSC Code Validation', () => {
    test('shows error when IFSC is empty on submit', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/ifsc code is required/i)).toBeInTheDocument();
      });
    });

    test('shows error when IFSC is not 11 characters', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const ifscInput = screen.getByLabelText(/ifsc code/i);
      fireEvent.change(ifscInput, { target: { value: 'HDFC00001' } });
      fireEvent.blur(ifscInput);

      await waitFor(() => {
        expect(screen.getByText(/ifsc must be 11 characters/i)).toBeInTheDocument();
      });
    });

    test('shows error when IFSC has non-alphanumeric characters', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const ifscInput = screen.getByLabelText(/ifsc code/i);
      fireEvent.change(ifscInput, { target: { value: 'HDFC000001!' } });
      fireEvent.blur(ifscInput);

      await waitFor(() => {
        expect(screen.getByText(/ifsc must be alphanumeric/i)).toBeInTheDocument();
      });
    });

    test('auto-converts IFSC to uppercase', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const ifscInput = screen.getByLabelText(/ifsc code/i);
      fireEvent.change(ifscInput, { target: { value: 'hdfc0000001' } });

      expect(ifscInput.value).toBe('HDFC0000001');
    });

    test('accepts valid IFSC codes', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const validIFSCs = [
        'HDFC0000001',
        'SBIN0000001',
        'ICIC0000001',
        'AXAB0000001'
      ];

      for (const ifsc of validIFSCs) {
        const ifscInput = screen.getByLabelText(/ifsc code/i);
        fireEvent.change(ifscInput, { target: { value: ifsc } });
        fireEvent.blur(ifscInput);

        await waitFor(() => {
          expect(screen.queryByText(/ifsc must be/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  // ========== Bank Name Field Validation ==========

  describe('Bank Name Validation', () => {
    test('shows error when bank name is empty on submit', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/bank name is required/i)).toBeInTheDocument();
      });
    });

    test('accepts valid bank names', async () => {
      render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const bankNameInput = screen.getByLabelText(/bank name/i);
      fireEvent.change(bankNameInput, { target: { value: 'HDFC Bank' } });
      fireEvent.blur(bankNameInput);

      await waitFor(() => {
        expect(screen.queryByText(/bank name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  // ========== Form Submission Tests ==========

  test('submits form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/recipient name/i), { target: { value: 'Amit Kumar' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/account number/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/ifsc code/i), { target: { value: 'hdfc0000001' } });
    fireEvent.change(screen.getByLabelText(/bank name/i), { target: { value: 'HDFC Bank' } });
    fireEvent.change(screen.getByLabelText(/relationship/i), { target: { value: 'family' } });

    const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Amit Kumar',
        phone: '9876543210',
        account: '1234567890',
        ifsc: 'HDFC0000001',
        bankName: 'HDFC Bank',
        paymentMethod: 'bank_account',
        relationship: 'family'
      });
    });
  });

  test('does not submit form with invalid data', async () => {
    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  test('converts IFSC to uppercase before submission', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/recipient name/i), { target: { value: 'Amit Kumar' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/account number/i), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/ifsc code/i), { target: { value: 'hdfc0000001' } });
    fireEvent.change(screen.getByLabelText(/bank name/i), { target: { value: 'HDFC Bank' } });
    fireEvent.change(screen.getByLabelText(/relationship/i), { target: { value: 'family' } });

    fireEvent.click(screen.getByRole('button', { name: /add beneficiary/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          ifsc: 'HDFC0000001'
        })
      );
    });
  });

  // ========== Cancel Tests ==========

  test('calls onCancel when cancel button is clicked', () => {
    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  // ========== Loading State Tests ==========

  test('disables inputs and buttons when loading', () => {
    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} loading={true} />);

    expect(screen.getByLabelText(/recipient name/i)).toBeDisabled();
    expect(screen.getByLabelText(/phone number/i)).toBeDisabled();
    expect(screen.getByLabelText(/account number/i)).toBeDisabled();
    expect(screen.getByLabelText(/ifsc code/i)).toBeDisabled();
    expect(screen.getByLabelText(/bank name/i)).toBeDisabled();
    expect(screen.getByLabelText(/relationship/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
  });

  // ========== Error Display Tests ==========

  test('displays error from props', () => {
    const errors = { account: 'Invalid account' };
    render(
      <BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} errors={errors} />
    );

    expect(screen.getByText('Invalid account')).toBeInTheDocument();
  });

  // ========== Accessibility Tests ==========

  test('has proper ARIA labels and descriptions', () => {
    render(<BeneficiaryFormBank onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const accountInput = screen.getByLabelText(/account number/i);
    fireEvent.change(accountInput, { target: { value: '123' } });
    fireEvent.blur(accountInput);

    expect(accountInput).toHaveAttribute('aria-invalid', 'true');
    expect(accountInput).toHaveAttribute('aria-describedby', 'account-error');
  });
});
