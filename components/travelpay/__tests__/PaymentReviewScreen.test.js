/**
 * PaymentReviewScreen tests
 *
 * Strategy: mock all network calls so tests are deterministic and fast.
 * We verify the UI states that matter to the user, not implementation details.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentReviewScreen from '../PaymentReviewScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// wiseLauncher — keep pure-logic module; mock only side effects if needed
jest.mock('../../../utils/wiseLauncher', () => ({
  detectPlatform: jest.fn(() => 'desktop'),
  buildWiseWebUrl: jest.fn(() => 'https://wise.com/send?targetCurrency=INR&sourceAmount=59.80&sourceCurrency=USD'),
  buildPaymentSummary: jest.fn(() => 'UPI ID: test@bank\nAmount: ₹5000.00 INR'),
}));

// Default fetch mock — overridden per test where needed
const mockRateResponse = { success: true, data: { rate: 83.62 } };
const mockCheckResponse = { success: true, found: false, beneficiary: null };
const mockLaunchResponse = { success: true, launchId: 'launch-uuid-001' };

function setupFetch({ rate = mockRateResponse, check = mockCheckResponse, launch = mockLaunchResponse } = {}) {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/wise/rate')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(rate) });
    }
    if (url.includes('/api/beneficiaries/check-upi')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(check) });
    }
    if (url.includes('/api/payments/launch')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(launch) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

// Default props
const defaultParsedUPI = {
  upiId: 'amit.kumar@okicici',
  payeeName: 'Amit Kumar',
  amount: 5000,
  currency: 'INR',
  note: '',
  merchantCode: '',
};
const defaultUserData = { id: 'user-uuid-1', name: 'Test User', email: 'test@test.com' };
const defaultProps = {
  parsedUPI: defaultParsedUPI,
  userData: defaultUserData,
  onBack: jest.fn(),
  onLaunched: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function renderAndWait(props = defaultProps) {
  setupFetch();
  let result;
  await act(async () => { result = render(<PaymentReviewScreen {...props} />); });
  // Wait for async effects (rate fetch + recipient check)
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  return result;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('PaymentReviewScreen — rendering', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('renders recipient name', async () => {
    await renderAndWait();
    expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
  });

  test('renders UPI ID', async () => {
    await renderAndWait();
    expect(screen.getAllByText('amit.kumar@okicici').length).toBeGreaterThan(0);
  });

  test('renders INR amount', async () => {
    await renderAndWait();
    // Amount appears in both the display header and the copy section
    expect(screen.getAllByText(/5,000\.00/).length).toBeGreaterThan(0);
  });

  test('renders "Open Wise" CTA button', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: /open wise/i })).toBeInTheDocument();
  });

  test('renders back button', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  test('renders copy buttons for UPI ID and amount', async () => {
    await renderAndWait();
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Recipient check
// ---------------------------------------------------------------------------
describe('PaymentReviewScreen — recipient status', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('shows "Saved contact" badge when recipient is found', async () => {
    setupFetch({ check: { success: true, found: true, beneficiary: { id: 'b-1', name: 'Amit Kumar', relationship: 'family' } } });
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    await waitFor(() => expect(screen.getByText(/saved contact/i)).toBeInTheDocument());
  });

  test('shows "New recipient" badge when recipient is not found', async () => {
    setupFetch({ check: { success: true, found: false, beneficiary: null } });
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    await waitFor(() => expect(screen.getByText(/new recipient/i)).toBeInTheDocument());
  });

  test('shows "Checking contacts…" while check is in-flight', async () => {
    // Never resolves during this test
    global.fetch = jest.fn(() => new Promise(() => {}));
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    expect(screen.getByText(/checking contacts/i)).toBeInTheDocument();
  });

  test('does not show save-contact toggle when recipient already saved', async () => {
    setupFetch({ check: { success: true, found: true, beneficiary: { id: 'b-1', name: 'Amit', relationship: 'family' } } });
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    await waitFor(() => expect(screen.queryByText(/remember/i)).not.toBeInTheDocument());
  });

  test('shows save-contact toggle when recipient is new', async () => {
    setupFetch({ check: { success: true, found: false, beneficiary: null } });
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    await waitFor(() => expect(screen.getByText(/remember/i)).toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// FX rate display
// ---------------------------------------------------------------------------
describe('PaymentReviewScreen — FX rate', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('shows USD equivalent when rate loads successfully', async () => {
    setupFetch({ rate: { success: true, data: { rate: 83.62 } } });
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    // 5000 / 83.62 ≈ 59.79 — may appear in the amount card and/or copy guide
    await waitFor(() => expect(screen.getAllByText(/\$59\.\d+ USD/).length).toBeGreaterThan(0));
  });

  test('shows rate unavailable message when API fails', async () => {
    setupFetch({ rate: { success: false } });
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    await waitFor(() => expect(screen.getByText(/rate unavailable/i)).toBeInTheDocument());
  });
});

// ---------------------------------------------------------------------------
// Amount editing
// ---------------------------------------------------------------------------
describe('PaymentReviewScreen — amount editing', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('shows Edit button when amount is pre-filled', async () => {
    await renderAndWait();
    await waitFor(() => expect(screen.getByRole('button', { name: /edit amount/i })).toBeInTheDocument());
  });

  test('opens amount input when Edit is clicked', async () => {
    await renderAndWait();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /edit amount/i })));
    expect(screen.getByRole('spinbutton', { name: /amount in inr/i })).toBeInTheDocument();
  });

  test('renders input field in edit mode when QR has no pre-filled amount', async () => {
    setupFetch();
    const noAmountUPI = { ...defaultParsedUPI, amount: 0 };
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} parsedUPI={noAmountUPI} />); });
    await waitFor(() =>
      expect(screen.getByRole('spinbutton', { name: /amount in inr/i })).toBeInTheDocument()
    );
  });

  test('CTA is disabled when amount is zero', async () => {
    setupFetch();
    const noAmountUPI = { ...defaultParsedUPI, amount: 0 };
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} parsedUPI={noAmountUPI} />); });
    const cta = screen.getByRole('button', { name: /open wise/i });
    expect(cta).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Back navigation
// ---------------------------------------------------------------------------
describe('PaymentReviewScreen — navigation', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('calls onBack when back button is clicked', async () => {
    const onBack = jest.fn();
    await renderAndWait({ ...defaultProps, onBack });
    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Launch flow
// ---------------------------------------------------------------------------
describe('PaymentReviewScreen — launch', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('calls POST /api/payments/launch when Open Wise is tapped', async () => {
    setupFetch();
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    await waitFor(() => screen.getByRole('button', { name: /open wise/i }));

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open wise/i })); });

    const launchCall = global.fetch.mock.calls.find(([url]) => url.includes('/api/payments/launch'));
    expect(launchCall).toBeDefined();
    const body = JSON.parse(launchCall[1].body);
    expect(body.recipientUpiId).toBe('amit.kumar@okicici');
    expect(body.amountInr).toBe(5000);
    expect(body.rail).toBe('wise');
  });

  test('calls onLaunched with launchId after successful launch', async () => {
    const onLaunched = jest.fn();
    setupFetch();
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} onLaunched={onLaunched} />); });
    await waitFor(() => screen.getByRole('button', { name: /open wise/i }));

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open wise/i })); });

    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith(
      expect.objectContaining({ launchId: 'launch-uuid-001' })
    ));
  });

  test('shows error message when launch API fails', async () => {
    setupFetch({ launch: { success: false, error: 'Service unavailable' } });
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} />); });
    await waitFor(() => screen.getByRole('button', { name: /open wise/i }));

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open wise/i })); });

    await waitFor(() => expect(screen.getByText(/service unavailable/i)).toBeInTheDocument());
  });

  test('does not call onLaunched when launch fails', async () => {
    const onLaunched = jest.fn();
    setupFetch({ launch: { success: false, error: 'error' } });
    await act(async () => { render(<PaymentReviewScreen {...defaultProps} onLaunched={onLaunched} />); });
    await waitFor(() => screen.getByRole('button', { name: /open wise/i }));

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /open wise/i })); });

    await waitFor(() => expect(onLaunched).not.toHaveBeenCalled());
  });
});
