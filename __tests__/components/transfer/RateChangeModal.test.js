/**
 * Tests for RateChangeModal component
 *
 * Covers:
 * - Renders with rate decision data
 * - Displays original rate and current rate
 * - Shows percentage decline
 * - Shows loss amount in INR
 * - Accept button fires onAccept
 * - Reject / Go Back button fires onReject
 * - Escape key fires onReject
 * - Accessibility attributes (role, aria-modal, aria-labelledby)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RateChangeModal from '../../../components/transfer/RateChangeModal';

// ---------- Mock data ----------

const mockRateDecision = {
  original_rate: 83.50,
  current_rate: 82.10,
  change_percent: 1.68,
  loss_amount: 700
};

// ---------- Helper ----------

function renderModal(overrides = {}) {
  const defaultProps = {
    rateDecision: mockRateDecision,
    onAccept: jest.fn(),
    onReject: jest.fn()
  };
  return render(<RateChangeModal {...defaultProps} {...overrides} />);
}

// ---------- Tests ----------

describe('RateChangeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Rendering ----

  describe('Rendering', () => {
    test('renders modal title', () => {
      renderModal();
      expect(screen.getByText('Exchange Rate Changed')).toBeInTheDocument();
    });

    test('renders subtitle explaining rate drop', () => {
      renderModal();
      expect(
        screen.getByText(/The rate has dropped since you locked it in/i)
      ).toBeInTheDocument();
    });

    test('renders original rate', () => {
      renderModal();
      expect(screen.getByText(/1 USD = 83.50 INR/)).toBeInTheDocument();
    });

    test('renders current (new) rate', () => {
      renderModal();
      expect(screen.getByText(/1 USD = 82.10 INR/)).toBeInTheDocument();
    });

    test('renders percentage change', () => {
      renderModal();
      expect(screen.getByText(/1.68%/)).toBeInTheDocument();
    });

    test('renders loss amount in INR', () => {
      renderModal();
      // INR 700 formatted by Intl.NumberFormat en-IN
      expect(screen.getByText(/700/)).toBeInTheDocument();
    });

    test('renders Accept & Send button', () => {
      renderModal();
      expect(screen.getByLabelText('Accept new rate and continue with transfer')).toBeInTheDocument();
    });

    test('renders Go Back button', () => {
      renderModal();
      expect(screen.getByLabelText('Go back and modify transfer')).toBeInTheDocument();
    });

    test('renders decision prompt text', () => {
      renderModal();
      expect(
        screen.getByText(/Do you want to proceed at the current rate/i)
      ).toBeInTheDocument();
    });
  });

  // ---- Callbacks ----

  describe('Button Callbacks', () => {
    test('calls onAccept when Accept button is clicked', () => {
      const onAccept = jest.fn();
      renderModal({ onAccept });
      fireEvent.click(screen.getByLabelText('Accept new rate and continue with transfer'));
      expect(onAccept).toHaveBeenCalledTimes(1);
    });

    test('calls onReject when Go Back button is clicked', () => {
      const onReject = jest.fn();
      renderModal({ onReject });
      fireEvent.click(screen.getByLabelText('Go back and modify transfer'));
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    test('does not call onAccept when Go Back is clicked', () => {
      const onAccept = jest.fn();
      const onReject = jest.fn();
      renderModal({ onAccept, onReject });
      fireEvent.click(screen.getByLabelText('Go back and modify transfer'));
      expect(onAccept).not.toHaveBeenCalled();
    });

    test('does not call onReject when Accept is clicked', () => {
      const onAccept = jest.fn();
      const onReject = jest.fn();
      renderModal({ onAccept, onReject });
      fireEvent.click(screen.getByLabelText('Accept new rate and continue with transfer'));
      expect(onReject).not.toHaveBeenCalled();
    });
  });

  // ---- Keyboard ----

  describe('Keyboard Interaction', () => {
    test('calls onReject when Escape key is pressed', () => {
      const onReject = jest.fn();
      renderModal({ onReject });
      const backdrop = screen.getByRole('dialog');
      fireEvent.keyDown(backdrop, { key: 'Escape', code: 'Escape' });
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    test('does not call onReject for other keys', () => {
      const onReject = jest.fn();
      renderModal({ onReject });
      const backdrop = screen.getByRole('dialog');
      fireEvent.keyDown(backdrop, { key: 'Enter', code: 'Enter' });
      expect(onReject).not.toHaveBeenCalled();
    });
  });

  // ---- Accessibility ----

  describe('Accessibility', () => {
    test('dialog has role="dialog"', () => {
      renderModal();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('dialog has aria-modal="true"', () => {
      renderModal();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    test('dialog has aria-labelledby pointing to title', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      const labelId = dialog.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      const titleEl = document.getElementById(labelId);
      expect(titleEl).toBeInTheDocument();
      expect(titleEl.textContent).toMatch(/Exchange Rate Changed/i);
    });

    test('dialog has aria-describedby pointing to description', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      const descId = dialog.getAttribute('aria-describedby');
      expect(descId).toBeTruthy();
      const descEl = document.getElementById(descId);
      expect(descEl).toBeInTheDocument();
    });
  });

  // ---- Edge cases ----

  describe('Edge Cases', () => {
    test('renders gracefully when loss_amount is zero', () => {
      const zeroLoss = { ...mockRateDecision, loss_amount: 0 };
      renderModal({ rateDecision: zeroLoss });
      // Should not crash
      expect(screen.getByText('Exchange Rate Changed')).toBeInTheDocument();
    });

    test('renders gracefully when loss_amount is null', () => {
      const nullLoss = { ...mockRateDecision, loss_amount: null };
      renderModal({ rateDecision: nullLoss });
      expect(screen.getByText('Exchange Rate Changed')).toBeInTheDocument();
      // Impact section should not render
      expect(screen.queryByText(/will receive/i)).not.toBeInTheDocument();
    });

    test('renders with undefined rateDecision without crashing', () => {
      renderModal({ rateDecision: undefined });
      expect(screen.getByText('Exchange Rate Changed')).toBeInTheDocument();
    });
  });
});
