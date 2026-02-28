/**
 * BeneficiaryFormUPI Component Tests
 *
 * Unit tests for BeneficiaryFormUPI component covering:
 * - Rendering and initial state
 * - Input validation (name, phone, UPI ID, relationship)
 * - Real-time feedback and error messages
 * - Form submission
 * - Accessibility features
 * - Loading and disabled states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeneficiaryFormUPI from '../BeneficiaryFormUPI';

// Mock data
const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

describe('BeneficiaryFormUPI Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== Rendering Tests ==========

  test('renders form with all required fields', () => {
    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upi id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();
  });

  test('renders form title', () => {
    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByText(/add upi beneficiary/i)).toBeInTheDocument();
  });

  test('renders submit and cancel buttons', () => {
    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByRole('button', { name: /add beneficiary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('populates initial data when provided', () => {
    const initialData = {
      name: 'Amit Kumar',
      phone: '9876543210',
      upiId: 'amit@okhdfcbank',
      relationship: 'family'
    };

    render(
      <BeneficiaryFormUPI
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByDisplayValue('Amit Kumar')).toBeInTheDocument();
    expect(screen.getByDisplayValue('amit@okhdfcbank')).toBeInTheDocument();
  });

  // ========== Input Validation Tests ==========

  describe('Name Field Validation', () => {
    test('shows error when name is empty on submit', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    test('shows error when name is too short', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const nameInput = screen.getByLabelText(/recipient name/i);
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    test('shows error when name exceeds max length', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const nameInput = screen.getByLabelText(/recipient name/i);
      const longName = 'a'.repeat(256);
      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText(/name cannot exceed 255 characters/i)).toBeInTheDocument();
      });
    });

    test('accepts valid names', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const nameInput = screen.getByLabelText(/recipient name/i);
      fireEvent.change(nameInput, { target: { value: 'Amit Kumar' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.queryByText(/name must be/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Phone Field Validation', () => {
    test('shows error when phone is empty on submit', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
      });
    });

    test('shows error when phone has less than 10 digits', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '987654321' } });
      fireEvent.blur(phoneInput);

      await waitFor(() => {
        expect(screen.getByText(/phone must be 10 digits/i)).toBeInTheDocument();
      });
    });

    test('shows error when phone does not start with 6-9', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '1234567890' } });
      fireEvent.blur(phoneInput);

      await waitFor(() => {
        expect(screen.getByText(/phone must start with 6-9/i)).toBeInTheDocument();
      });
    });

    test('accepts valid phone numbers', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      fireEvent.change(phoneInput, { target: { value: '9876543210' } });
      fireEvent.blur(phoneInput);

      await waitFor(() => {
        expect(screen.queryByText(/phone must be/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('UPI ID Validation', () => {
    test('shows error when UPI ID is empty on submit', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/upi id is required/i)).toBeInTheDocument();
      });
    });

    test('shows error for invalid UPI format', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const upiInput = screen.getByLabelText(/upi id/i);
      fireEvent.change(upiInput, { target: { value: 'invalid-upi' } });
      fireEvent.blur(upiInput);

      await waitFor(() => {
        expect(screen.getByText(/use format: name@bank/i)).toBeInTheDocument();
      });
    });

    test('accepts valid UPI IDs', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const upiInput = screen.getByLabelText(/upi id/i);
      fireEvent.change(upiInput, { target: { value: 'amit@okhdfcbank' } });
      fireEvent.blur(upiInput);

      await waitFor(() => {
        expect(screen.queryByText(/use format: name@bank/i)).not.toBeInTheDocument();
      });
    });

    test('accepts UPI with different formats', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const upiInput = screen.getByLabelText(/upi id/i);

      const validUPIs = [
        'user@bank',
        'user.name@bank',
        'user_name@bank',
        'user-name@bank',
        'user123@hdfc'
      ];

      for (const upi of validUPIs) {
        fireEvent.change(upiInput, { target: { value: upi } });
        fireEvent.blur(upiInput);

        await waitFor(() => {
          expect(screen.queryByText(/use format/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Relationship Field Validation', () => {
    test('shows error when relationship is not selected on submit', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/relationship is required/i)).toBeInTheDocument();
      });
    });

    test('accepts valid relationship values', async () => {
      render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const relationshipSelect = screen.getByLabelText(/relationship/i);

      const validRelationships = ['family', 'friend', 'business', 'other'];

      for (const rel of validRelationships) {
        fireEvent.change(relationshipSelect, { target: { value: rel } });
        fireEvent.blur(relationshipSelect);

        await waitFor(() => {
          expect(screen.queryByText(/relationship is required/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  // ========== Form Submission Tests ==========

  test('submits form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/recipient name/i), { target: { value: 'Amit Kumar' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/upi id/i), { target: { value: 'amit@okhdfcbank' } });
    fireEvent.change(screen.getByLabelText(/relationship/i), { target: { value: 'family' } });

    const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Amit Kumar',
        phone: '9876543210',
        upiId: 'amit@okhdfcbank',
        paymentMethod: 'upi',
        relationship: 'family'
      });
    });
  });

  test('does not submit form with invalid data', async () => {
    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitBtn = screen.getByRole('button', { name: /add beneficiary/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  test('trims whitespace from inputs before submission', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/recipient name/i), { target: { value: '  Amit Kumar  ' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/upi id/i), { target: { value: '  amit@okhdfcbank  ' } });
    fireEvent.change(screen.getByLabelText(/relationship/i), { target: { value: 'family' } });

    fireEvent.click(screen.getByRole('button', { name: /add beneficiary/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Amit Kumar',
          upiId: 'amit@okhdfcbank'
        })
      );
    });
  });

  test('converts UPI ID to lowercase before submission', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/recipient name/i), { target: { value: 'Amit Kumar' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/upi id/i), { target: { value: 'AMIT@OKHDFCBANK' } });
    fireEvent.change(screen.getByLabelText(/relationship/i), { target: { value: 'family' } });

    fireEvent.click(screen.getByRole('button', { name: /add beneficiary/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          upiId: 'amit@okhdfcbank'
        })
      );
    });
  });

  // ========== Cancel Tests ==========

  test('calls onCancel when cancel button is clicked', () => {
    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  // ========== Loading State Tests ==========

  test('disables inputs and buttons when loading', () => {
    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} loading={true} />);

    expect(screen.getByLabelText(/recipient name/i)).toBeDisabled();
    expect(screen.getByLabelText(/phone number/i)).toBeDisabled();
    expect(screen.getByLabelText(/upi id/i)).toBeDisabled();
    expect(screen.getByLabelText(/relationship/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  test('shows loading spinner when loading', () => {
    const { container } = render(
      <BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} loading={true} />
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ========== Error Display Tests ==========

  test('displays error from props', () => {
    const errors = { name: 'Name is invalid' };
    render(
      <BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} errors={errors} />
    );

    expect(screen.getByText('Name is invalid')).toBeInTheDocument();
  });

  test('prop errors take precedence over validation errors', async () => {
    const errors = { name: 'Custom error from props' };
    render(
      <BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} errors={errors} />
    );

    const nameInput = screen.getByLabelText(/recipient name/i);
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.blur(nameInput);

    expect(screen.getByText('Custom error from props')).toBeInTheDocument();
  });

  // ========== Accessibility Tests ==========

  test('has proper ARIA labels and descriptions', () => {
    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/recipient name/i);
    expect(nameInput).toHaveAttribute('id', 'name');

    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.blur(nameInput);

    const errorElement = screen.getByText(/name must be at least/i);
    expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('marks invalid fields with aria-invalid', () => {
    render(<BeneficiaryFormUPI onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.blur(phoneInput);

    expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
  });
});
