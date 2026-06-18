/**
 * PostLaunchBanner tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostLaunchBanner from '../PostLaunchBanner';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPatchSuccess = { success: true };
const mockPatchFailure = { success: false, error: 'Network error' };

function setupFetch(response = mockPatchSuccess) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(response) })
  );
}

const defaultProps = {
  launchId: 'launch-uuid-001',
  userData: { id: 'user-uuid-1', name: 'Test User' },
  recipientName: 'Amit Kumar',
  amountInr: 5000,
  usdEquivalent: 59.8,
  saveContact: true,
  onConfirmed: jest.fn(),
  onDismissed: jest.fn(),
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('PostLaunchBanner — rendering', () => {
  beforeEach(() => { jest.clearAllMocks(); setupFetch(); });

  test('renders the confirmation question', () => {
    render(<PostLaunchBanner {...defaultProps} />);
    expect(screen.getByText(/did you complete the transfer/i)).toBeInTheDocument();
  });

  test('renders recipient name in the summary', () => {
    render(<PostLaunchBanner {...defaultProps} />);
    expect(screen.getByText(/Amit Kumar/)).toBeInTheDocument();
  });

  test('renders INR and USD amounts', () => {
    render(<PostLaunchBanner {...defaultProps} />);
    expect(screen.getByText(/₹5,000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$59\.80/)).toBeInTheDocument();
  });

  test('renders both action buttons', () => {
    render(<PostLaunchBanner {...defaultProps} />);
    expect(screen.getByTestId('confirm-sent')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-later')).toBeInTheDocument();
  });

  test('renders gracefully with no recipientName', () => {
    render(<PostLaunchBanner {...defaultProps} recipientName={undefined} />);
    expect(screen.getByText(/recipient/i)).toBeInTheDocument();
  });

  test('renders gracefully with no amounts', () => {
    render(<PostLaunchBanner {...defaultProps} amountInr={undefined} usdEquivalent={undefined} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// "Yes, I sent it" flow
// ---------------------------------------------------------------------------
describe('PostLaunchBanner — confirm sent', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('calls PATCH /api/payments/launch with status completed', async () => {
    setupFetch(mockPatchSuccess);
    render(<PostLaunchBanner {...defaultProps} />);

    await act(async () => { fireEvent.click(screen.getByTestId('confirm-sent')); });

    const call = global.fetch.mock.calls[0];
    expect(call[0]).toContain('/api/payments/launch');
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body.status).toBe('completed');
    expect(body.launchId).toBe('launch-uuid-001');
  });

  test('calls onConfirmed with saveContact flag on success', async () => {
    const onConfirmed = jest.fn();
    setupFetch(mockPatchSuccess);
    render(<PostLaunchBanner {...defaultProps} onConfirmed={onConfirmed} saveContact={true} />);

    await act(async () => { fireEvent.click(screen.getByTestId('confirm-sent')); });

    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith({ saveContact: true }));
  });

  test('passes saveContact=false to onConfirmed when toggle was off', async () => {
    const onConfirmed = jest.fn();
    setupFetch(mockPatchSuccess);
    render(<PostLaunchBanner {...defaultProps} onConfirmed={onConfirmed} saveContact={false} />);

    await act(async () => { fireEvent.click(screen.getByTestId('confirm-sent')); });

    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith({ saveContact: false }));
  });

  test('buttons are disabled while request is in-flight', async () => {
    // Never resolves
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<PostLaunchBanner {...defaultProps} />);

    fireEvent.click(screen.getByTestId('confirm-sent'));

    expect(screen.getByTestId('confirm-sent')).toBeDisabled();
    expect(screen.getByTestId('confirm-later')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// "I'll do it later" flow
// ---------------------------------------------------------------------------
describe('PostLaunchBanner — dismiss', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('calls PATCH with status cancelled', async () => {
    setupFetch(mockPatchSuccess);
    render(<PostLaunchBanner {...defaultProps} />);

    await act(async () => { fireEvent.click(screen.getByTestId('confirm-later')); });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.status).toBe('cancelled');
  });

  test('calls onDismissed on success', async () => {
    const onDismissed = jest.fn();
    setupFetch(mockPatchSuccess);
    render(<PostLaunchBanner {...defaultProps} onDismissed={onDismissed} />);

    await act(async () => { fireEvent.click(screen.getByTestId('confirm-later')); });

    await waitFor(() => expect(onDismissed).toHaveBeenCalledTimes(1));
  });
});

// ---------------------------------------------------------------------------
// Error resilience
// ---------------------------------------------------------------------------
describe('PostLaunchBanner — error handling', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  test('shows error message when PATCH fails', async () => {
    setupFetch(mockPatchFailure);
    render(<PostLaunchBanner {...defaultProps} />);

    await act(async () => { fireEvent.click(screen.getByTestId('confirm-sent')); });

    await waitFor(() =>
      expect(screen.getByText(/could not save status/i)).toBeInTheDocument()
    );
  });

  test('still calls onConfirmed after a short delay even on API error', async () => {
    const onConfirmed = jest.fn();
    setupFetch(mockPatchFailure);
    render(<PostLaunchBanner {...defaultProps} onConfirmed={onConfirmed} />);

    await act(async () => { fireEvent.click(screen.getByTestId('confirm-sent')); });

    // Advance the 1 500 ms error-recovery timeout
    await act(async () => { jest.advanceTimersByTime(2000); });

    expect(onConfirmed).toHaveBeenCalled();
  });
});
