/**
 * BeneficiariesList Component Tests
 *
 * Unit tests for BeneficiariesList component covering:
 * - Rendering list of beneficiaries
 * - Empty state display
 * - Loading state display
 * - Error state display
 * - UPI and Bank beneficiary display
 * - Masking of sensitive data
 * - Delete confirmation modal
 * - Action buttons (Add, Use for Transfer, Delete)
 * - Verification status badges
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeneficiariesList from '../BeneficiariesList';

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
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock callbacks
const mockOnAddBeneficiary = jest.fn();
const mockOnSelectBeneficiary = jest.fn();
const mockOnDeleteBeneficiary = jest.fn();

describe('BeneficiariesList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  // ========== Empty State Tests ==========

  describe('Empty State', () => {
    test('shows empty state when no beneficiaries exist', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: [] })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no beneficiaries yet/i)).toBeInTheDocument();
      });
    });

    test('renders add beneficiary button in empty state', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: [] })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add beneficiary/i })).toBeInTheDocument();
      });
    });

    test('calls onAddBeneficiary when add button is clicked in empty state', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: [] })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        const addBtn = screen.getByRole('button', { name: /add beneficiary/i });
        fireEvent.click(addBtn);
        expect(mockOnAddBeneficiary).toHaveBeenCalled();
      });
    });
  });

  // ========== List Display Tests ==========

  describe('Beneficiary List Display', () => {
    const mockBeneficiaries = [
      {
        beneficiaryId: 'ben-1',
        name: 'Amit Kumar',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        verificationStatus: 'verified',
        createdAt: '2026-02-21T10:00:00Z',
        relationship: 'family'
      },
      {
        beneficiaryId: 'ben-2',
        name: 'Rajesh Sharma',
        paymentMethod: 'bank_account',
        account: '1234567890',
        ifsc: 'HDFC0000001',
        bankName: 'HDFC Bank',
        verificationStatus: 'verified',
        createdAt: '2026-02-20T10:00:00Z',
        relationship: 'business'
      }
    ];

    test('renders list of beneficiaries', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: mockBeneficiaries })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
        expect(screen.getByText('Rajesh Sharma')).toBeInTheDocument();
      });
    });

    test('displays UPI beneficiary with masked UPI ID', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          beneficiaries: [mockBeneficiaries[0]]
        })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('amit@****')).toBeInTheDocument();
        expect(screen.queryByText('amit@okhdfcbank')).not.toBeInTheDocument();
      });
    });

    test('displays Bank beneficiary with masked account number', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          beneficiaries: [mockBeneficiaries[1]]
        })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('****67890')).toBeInTheDocument();
        expect(screen.queryByText('1234567890')).not.toBeInTheDocument();
      });
    });

    test('displays verification status badges', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          beneficiaries: [
            { ...mockBeneficiaries[0], verificationStatus: 'verified' },
            { ...mockBeneficiaries[1], verificationStatus: 'pending' }
          ]
        })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Verified')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    test('displays payment method as badge', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          beneficiaries: [mockBeneficiaries[0]]
        })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('UPI')).toBeInTheDocument();
      });
    });
  });

  // ========== Button Actions Tests ==========

  describe('Action Buttons', () => {
    const mockBeneficiaries = [
      {
        beneficiaryId: 'ben-1',
        name: 'Amit Kumar',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        verificationStatus: 'verified',
        createdAt: '2026-02-21T10:00:00Z',
        relationship: 'family'
      }
    ];

    test('renders action buttons for each beneficiary', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: mockBeneficiaries })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use for transfer/i })).toBeInTheDocument();
      });
    });

    test('calls onSelectBeneficiary when use button is clicked', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: mockBeneficiaries })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        const useBtn = screen.getByRole('button', { name: /use for transfer/i });
        fireEvent.click(useBtn);
        expect(mockOnSelectBeneficiary).toHaveBeenCalledWith(mockBeneficiaries[0]);
      });
    });
  });

  // ========== Delete Confirmation Tests ==========

  describe('Delete Confirmation', () => {
    const mockBeneficiaries = [
      {
        beneficiaryId: 'ben-1',
        name: 'Amit Kumar',
        paymentMethod: 'upi',
        upiId: 'amit@okhdfcbank',
        verificationStatus: 'verified',
        createdAt: '2026-02-21T10:00:00Z',
        relationship: 'family'
      }
    ];

    test('shows delete confirmation modal when delete button is clicked', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: mockBeneficiaries })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        const trashBtn = deleteButtons.find((btn) => btn.querySelector('svg'));
        fireEvent.click(trashBtn);
      });

      expect(screen.getByText(/delete beneficiary/i)).toBeInTheDocument();
    });

    test('calls onDeleteBeneficiary when confirmed', async () => {
      mockOnDeleteBeneficiary.mockResolvedValueOnce(undefined);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: mockBeneficiaries })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        const trashBtn = deleteButtons.find((btn) => btn.querySelector('svg'));
        fireEvent.click(trashBtn);
      });

      const confirmBtn = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockOnDeleteBeneficiary).toHaveBeenCalledWith('ben-1');
      });
    });

    test('removes deleted beneficiary from list', async () => {
      mockOnDeleteBeneficiary.mockResolvedValueOnce(undefined);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: mockBeneficiaries })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
      });

      // Delete
      const deleteButtons = screen.getAllByRole('button');
      const trashBtn = deleteButtons.find((btn) => btn.querySelector('svg'));
      fireEvent.click(trashBtn);

      const confirmBtn = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.queryByText('Amit Kumar')).not.toBeInTheDocument();
      });
    });

    test('cancels delete when cancel button is clicked', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: mockBeneficiaries })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        const trashBtn = deleteButtons.find((btn) => btn.querySelector('svg'));
        fireEvent.click(trashBtn);
      });

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      expect(screen.queryByText(/delete beneficiary/i)).not.toBeInTheDocument();
      expect(mockOnDeleteBeneficiary).not.toHaveBeenCalled();
    });
  });

  // ========== Loading State Tests ==========

  describe('Loading State', () => {
    test('shows loading skeleton initially', () => {
      fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      const { container } = render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  // ========== Error State Tests ==========

  describe('Error State', () => {
    test('shows error message when API fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Load failed' })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load beneficiaries/i)).toBeInTheDocument();
      });
    });

    test('shows try again button in error state', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Load failed' })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    test('retries loading when try again is clicked', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Load failed' })
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: [] })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(tryAgainBtn);
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ========== Add Button Tests ==========

  describe('Add Button', () => {
    test('renders add button in list view', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: [] })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
      });
    });

    test('calls onAddBeneficiary when add button is clicked', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ beneficiaries: [] })
      });

      render(
        <BeneficiariesList
          onAddBeneficiary={mockOnAddBeneficiary}
          onSelectBeneficiary={mockOnSelectBeneficiary}
          onDeleteBeneficiary={mockOnDeleteBeneficiary}
        />
      );

      await waitFor(() => {
        const addBtn = screen.getByRole('button', { name: /add/i });
        fireEvent.click(addBtn);
        expect(mockOnAddBeneficiary).toHaveBeenCalled();
      });
    });
  });
});
