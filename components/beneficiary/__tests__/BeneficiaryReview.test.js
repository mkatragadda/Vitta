/**
 * BeneficiaryReview Component Tests
 *
 * Unit tests for BeneficiaryReview component covering:
 * - Rendering and display of beneficiary details
 * - UPI ID masking
 * - Account number masking
 * - Settlement time display
 * - Button functionality (confirm, edit, cancel)
 * - Loading states
 * - Display for different payment methods
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeneficiaryReview from '../BeneficiaryReview';

// Mock data
const mockOnConfirm = jest.fn();
const mockOnEdit = jest.fn();
const mockOnCancel = jest.fn();

describe('BeneficiaryReview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== UPI Beneficiary Display Tests ==========

  describe('UPI Beneficiary Display', () => {
    const upiData = {
      name: 'Amit Kumar',
      phone: '9876543210',
      paymentMethod: 'upi',
      upiId: 'amit@okhdfcbank',
      relationship: 'family'
    };

    test('renders UPI beneficiary details', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={upiData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
      expect(screen.getByText('9876543210')).toBeInTheDocument();
      expect(screen.getByText(/Review Beneficiary/i)).toBeInTheDocument();
    });

    test('displays UPI payment method', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={upiData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('UPI')).toBeInTheDocument();
    });

    test('masks UPI ID correctly', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={upiData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('amit@****')).toBeInTheDocument();
      expect(screen.queryByText('amit@okhdfcbank')).not.toBeInTheDocument();
    });

    test('masks different UPI ID formats correctly', () => {
      const testCases = [
        { input: 'user@bank', expected: 'user@ba****' },
        { input: 'john@okhdfcbank', expected: 'john@okh*****' },
        { input: 'x@hdfc', expected: 'x@hd**' }
      ];

      for (const testCase of testCases) {
        const { rerender } = render(
          <BeneficiaryReview
            beneficiaryData={{ ...upiData, upiId: testCase.input }}
            onConfirm={mockOnConfirm}
            onEdit={mockOnEdit}
            onCancel={mockOnCancel}
          />
        );

        expect(screen.getByText(testCase.expected)).toBeInTheDocument();
        rerender(<div />);
      }
    });

    test('displays settlement time for UPI', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={upiData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('2-5 minutes')).toBeInTheDocument();
    });

    test('displays relationship capitalized', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={{ ...upiData, relationship: 'family' }}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Family')).toBeInTheDocument();
    });
  });

  // ========== Bank Beneficiary Display Tests ==========

  describe('Bank Beneficiary Display', () => {
    const bankData = {
      name: 'Rajesh Sharma',
      phone: '8765432109',
      paymentMethod: 'bank_account',
      account: '1234567890',
      ifsc: 'HDFC0000001',
      bankName: 'HDFC Bank',
      relationship: 'business'
    };

    test('renders bank beneficiary details', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={bankData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Rajesh Sharma')).toBeInTheDocument();
      expect(screen.getByText('HDFC0000001')).toBeInTheDocument();
      expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
    });

    test('displays Bank Account payment method', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={bankData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Bank Account')).toBeInTheDocument();
    });

    test('masks account number to show only last 4 digits', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={bankData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('****67890')).toBeInTheDocument();
      expect(screen.queryByText('1234567890')).not.toBeInTheDocument();
    });

    test('masks different account numbers correctly', () => {
      const testCases = [
        { account: '123456789', expected: '****56789' },
        { account: '12345678901234567', expected: '****34567' },
        { account: '9876543210123456789', expected: '****56789' }
      ];

      for (const testCase of testCases) {
        const { rerender } = render(
          <BeneficiaryReview
            beneficiaryData={{ ...bankData, account: testCase.account }}
            onConfirm={mockOnConfirm}
            onEdit={mockOnEdit}
            onCancel={mockOnCancel}
          />
        );

        expect(screen.getByText(testCase.expected)).toBeInTheDocument();
        rerender(<div />);
      }
    });

    test('displays settlement time for Bank Account', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={bankData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('1-2 business days')).toBeInTheDocument();
    });
  });

  // ========== Button Functionality Tests ==========

  describe('Button Actions', () => {
    const testData = {
      name: 'Test User',
      phone: '9876543210',
      paymentMethod: 'upi',
      upiId: 'test@bank',
      relationship: 'family'
    };

    test('calls onConfirm when confirm button is clicked', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={testData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmBtn);

      expect(mockOnConfirm).toHaveBeenCalled();
    });

    test('calls onEdit when edit button is clicked', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={testData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      const editBtn = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      expect(mockOnEdit).toHaveBeenCalled();
    });

    test('calls onCancel when cancel button is clicked', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={testData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  // ========== Loading State Tests ==========

  describe('Loading State', () => {
    const testData = {
      name: 'Test User',
      phone: '9876543210',
      paymentMethod: 'upi',
      upiId: 'test@bank',
      relationship: 'family'
    };

    test('disables buttons when loading', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={testData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    test('shows loading indicator when loading', () => {
      const { container } = render(
        <BeneficiaryReview
          beneficiaryData={testData}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // ========== Phone Display Tests ==========

  describe('Phone Formatting', () => {
    const testData = {
      name: 'Test User',
      paymentMethod: 'upi',
      upiId: 'test@bank',
      relationship: 'family'
    };

    test('formats 10-digit phone number correctly', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={{ ...testData, phone: '9876543210' }}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('987-654-3210')).toBeInTheDocument();
    });

    test('displays phone as-is if not 10 digits', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={{ ...testData, phone: '123' }}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('123')).toBeInTheDocument();
    });
  });

  // ========== Data Validation Tests ==========

  describe('Data Validation', () => {
    test('handles missing UPI ID gracefully', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={{
            name: 'Test User',
            phone: '9876543210',
            paymentMethod: 'upi',
            relationship: 'family'
          }}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Review Beneficiary/i)).toBeInTheDocument();
    });

    test('handles missing account number gracefully', () => {
      render(
        <BeneficiaryReview
          beneficiaryData={{
            name: 'Test User',
            phone: '9876543210',
            paymentMethod: 'bank_account',
            ifsc: 'HDFC0000001',
            bankName: 'HDFC Bank',
            relationship: 'family'
          }}
          onConfirm={mockOnConfirm}
          onEdit={mockOnEdit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Review Beneficiary/i)).toBeInTheDocument();
    });
  });

  // ========== Relationship Display Tests ==========

  describe('Relationship Display', () => {
    const testData = {
      name: 'Test User',
      phone: '9876543210',
      paymentMethod: 'upi',
      upiId: 'test@bank'
    };

    test('displays all relationship types capitalized', () => {
      const relationships = ['family', 'friend', 'business', 'other'];

      for (const rel of relationships) {
        const { rerender } = render(
          <BeneficiaryReview
            beneficiaryData={{ ...testData, relationship: rel }}
            onConfirm={mockOnConfirm}
            onEdit={mockOnEdit}
            onCancel={mockOnCancel}
          />
        );

        const capitalized = rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
        expect(screen.getByText(capitalized)).toBeInTheDocument();
        rerender(<div />);
      }
    });
  });
});
