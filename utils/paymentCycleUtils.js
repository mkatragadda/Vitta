/**
 * Payment Cycle Utilities - CRITICAL ARCHITECTURE
 *
 * Key Insight: Users have TWO active payment obligations at any time:
 * 1. PREVIOUS statement payment (DUE NOW - immediate action required)
 * 2. CURRENT/NEXT statement payment (DUE LATER - for float strategy)
 *
 * Example (Today: Jan 20):
 *   Previous: Dec 15 statement → Jan 10 payment (OVERDUE!)
 *   Current:  Jan 15 statement → Feb 10 payment (use for float)
 */

import { calculateGracePeriod } from './statementCycleUtils';

/**
 * Get the most recent closed statement date
 * This is the statement that's already finalized
 *
 * @param {number} statementCloseDay - Day of month (1-31)
 * @param {Date} referenceDate - Today's date
 * @returns {Date} Most recent statement close date
 */
export const getMostRecentStatementClose = (statementCloseDay, referenceDate = new Date()) => {
  if (!statementCloseDay) return null;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfMonth = today.getDate();

  // Try this month's statement
  let statementDate = new Date(year, month, statementCloseDay);
  statementDate.setHours(0, 0, 0, 0);

  // If statement close day hasn't occurred yet this month, use last month
  if (statementCloseDay > dayOfMonth) {
    statementDate = new Date(year, month - 1, statementCloseDay);
  }

  return statementDate;
};

/**
 * Get the previous month's statement close date
 * This is the statement before the most recent one
 *
 * @param {number} statementCloseDay - Day of month (1-31)
 * @param {Date} referenceDate - Today's date
 * @returns {Date} Previous statement close date
 */
export const getPreviousStatementClose = (statementCloseDay, referenceDate = new Date()) => {
  if (!statementCloseDay) return null;

  const mostRecent = getMostRecentStatementClose(statementCloseDay, referenceDate);
  if (!mostRecent) return null;

  // Go back one month
  const previousMonth = new Date(mostRecent);
  previousMonth.setMonth(previousMonth.getMonth() - 1);

  return previousMonth;
};

/**
 * Get payment due date for a specific statement
 *
 * @param {Date} statementCloseDate - When statement closed
 * @param {number} gracePeriodDays - Days between close and due
 * @returns {Date} Payment due date
 */
export const getPaymentDueDateForStatement = (statementCloseDate, gracePeriodDays) => {
  if (!statementCloseDate || !gracePeriodDays) return null;

  const dueDate = new Date(statementCloseDate);
  dueDate.setDate(dueDate.getDate() + gracePeriodDays);

  return dueDate;
};

/**
 * Get BOTH active payment obligations
 * CRITICAL: Returns both previous (due now) and current (due later) payments
 *
 * @param {Object} card - Credit card with statement_close_day and grace_period_days
 * @param {Date} referenceDate - Today's date
 * @returns {Object} Both payment obligations
 */
export const getActivePayments = (card, referenceDate = new Date()) => {
  if (!card.statement_close_day || !card.grace_period_days) {
    return {
      previousPayment: null,
      currentPayment: null
    };
  }

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  // Get statement dates
  const currentStatementClose = getMostRecentStatementClose(card.statement_close_day, today);
  const previousStatementClose = getPreviousStatementClose(card.statement_close_day, today);

  // Calculate payment due dates
  const currentPaymentDue = getPaymentDueDateForStatement(currentStatementClose, card.grace_period_days);
  const previousPaymentDue = getPaymentDueDateForStatement(previousStatementClose, card.grace_period_days);

  // Calculate days until due (negative = overdue)
  const daysUntilCurrent = currentPaymentDue ? Math.ceil((currentPaymentDue - today) / (1000 * 60 * 60 * 24)) : null;
  const daysUntilPrevious = previousPaymentDue ? Math.ceil((previousPaymentDue - today) / (1000 * 60 * 60 * 24)) : null;

  return {
    // Previous statement payment (likely due soon or overdue)
    previousPayment: previousPaymentDue ? {
      statementCloseDate: previousStatementClose,
      paymentDueDate: previousPaymentDue,
      daysUntilDue: daysUntilPrevious,
      isOverdue: daysUntilPrevious < 0,
      isUrgent: daysUntilPrevious >= 0 && daysUntilPrevious <= 7,
      amount: card.current_balance || 0, // User should have this from their statement
      status: daysUntilPrevious < 0 ? 'OVERDUE' : daysUntilPrevious <= 7 ? 'DUE_SOON' : 'UPCOMING'
    } : null,

    // Current/next statement payment (for float strategy)
    currentPayment: currentPaymentDue ? {
      statementCloseDate: currentStatementClose,
      paymentDueDate: currentPaymentDue,
      daysUntilDue: daysUntilCurrent,
      isOverdue: false,
      isUrgent: false,
      amount: 0, // Current statement balance not yet known
      status: 'FUTURE'
    } : null
  };
};

/**
 * Get the NEXT payment that requires immediate attention
 * This is what should show in "upcoming payments" widget
 *
 * @param {Object} card - Credit card object
 * @param {Date} referenceDate - Today's date
 * @returns {Object} Most urgent payment
 */
export const getNextDuePayment = (card, referenceDate = new Date()) => {
  const { previousPayment, currentPayment } = getActivePayments(card, referenceDate);

  // If previous payment exists and is not far in the past (>30 days), show it
  if (previousPayment && previousPayment.daysUntilDue > -30) {
    return previousPayment;
  }

  // Otherwise show current payment
  if (currentPayment) {
    return currentPayment;
  }

  // FALLBACK: For cards with old due_date field (no statement_close_day/grace_period_days)
  if (card.due_date) {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(card.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    return {
      statementCloseDate: null,
      paymentDueDate: dueDate,
      daysUntilDue,
      isOverdue: daysUntilDue < 0,
      isUrgent: daysUntilDue >= 0 && daysUntilDue <= 7,
      amount: card.current_balance || 0,
      status: daysUntilDue < 0 ? 'OVERDUE' : daysUntilDue <= 7 ? 'DUE_SOON' : 'UPCOMING'
    };
  }

  return null;
};

/**
 * Get payment due date for FLOAT STRATEGY calculations
 * This should use the FUTURE payment (current statement)
 * NOT the immediate payment (previous statement)
 *
 * @param {Object} card - Credit card object
 * @param {Date} purchaseDate - When purchase will be made
 * @returns {Date} Payment due date to use for float calculation
 */
export const getPaymentDueDateForFloat = (card, purchaseDate = new Date()) => {
  if (!card.statement_close_day || !card.grace_period_days) return null;

  const purchase = new Date(purchaseDate);
  purchase.setHours(0, 0, 0, 0);

  // Determine which statement this purchase will appear on
  const mostRecentStatementClose = getMostRecentStatementClose(card.statement_close_day, purchase);

  let relevantStatementClose;

  // If purchase is AFTER most recent statement close, it goes on NEXT statement
  if (purchase > mostRecentStatementClose) {
    relevantStatementClose = new Date(mostRecentStatementClose);
    relevantStatementClose.setMonth(relevantStatementClose.getMonth() + 1);
  } else {
    // Purchase is on current statement
    relevantStatementClose = mostRecentStatementClose;
  }

  // Calculate payment due for that statement
  return getPaymentDueDateForStatement(relevantStatementClose, card.grace_period_days);
};

/**
 * Calculate float days for a purchase
 * Float = Days from purchase date to payment due date
 *
 * @param {Object} card - Credit card object
 * @param {Date} purchaseDate - When purchase will be made
 * @returns {number} Float days
 */
export const calculateFloatDays = (card, purchaseDate = new Date()) => {
  const paymentDue = getPaymentDueDateForFloat(card, purchaseDate);
  if (!paymentDue) return 0;

  const purchase = new Date(purchaseDate);
  purchase.setHours(0, 0, 0, 0);

  const floatTime = paymentDue - purchase;
  const floatDays = Math.ceil(floatTime / (1000 * 60 * 60 * 24));

  return Math.max(0, floatDays);
};

/**
 * Get all upcoming payments across multiple cards
 * Sorted by urgency (overdue first, then by date)
 *
 * @param {Array} cards - Array of credit cards
 * @param {number} daysAhead - How many days to look ahead (default: 30)
 * @param {Date} referenceDate - Today's date
 * @returns {Array} Sorted list of upcoming payments
 */
export const getUpcomingPayments = (cards, daysAhead = 30, referenceDate = new Date()) => {
  if (!cards || cards.length === 0) return [];

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const payments = [];

  cards.forEach(card => {
    // Skip cards with $0 balance - no payment required
    const balance = Number(card.current_balance) || 0;
    if (balance <= 0) {
      return;
    }

    const nextPayment = getNextDuePayment(card, today);

    if (nextPayment && nextPayment.paymentDueDate <= futureDate) {
      payments.push({
        card,
        ...nextPayment
      });
    }
  });

  // Sort: overdue first, then by days until due
  payments.sort((a, b) => {
    // Overdue payments first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;

    // Then by days until due (soonest first)
    return a.daysUntilDue - b.daysUntilDue;
  });

  return payments;
};

/**
 * Get human-readable description of payment schedule
 *
 * @param {Object} card - Credit card object
 * @param {Date} referenceDate - Today's date
 * @returns {string} Description
 */
export const getPaymentScheduleDescription = (card, referenceDate = new Date()) => {
  const { previousPayment, currentPayment } = getActivePayments(card, referenceDate);

  if (!previousPayment && !currentPayment) {
    return 'Payment schedule not configured';
  }

  const parts = [];

  if (previousPayment) {
    const prevDesc = `Previous statement payment: ${previousPayment.paymentDueDate.toLocaleDateString()} (${previousPayment.status})`;
    parts.push(prevDesc);
  }

  if (currentPayment) {
    const currDesc = `Next statement payment: ${currentPayment.paymentDueDate.toLocaleDateString()} (${currentPayment.daysUntilDue} days)`;
    parts.push(currDesc);
  }

  return parts.join(' | ');
};

/**
 * Format payment urgency with emoji
 *
 * @param {Object} payment - Payment object from getActivePayments
 * @returns {string} Emoji indicator
 */
export const getPaymentUrgencyEmoji = (payment) => {
  if (!payment) return '';

  if (payment.isOverdue) return '🔴';
  if (payment.isUrgent) return '🟡';
  return '🟢';
};

/**
 * Get payment status message for UI
 *
 * @param {Object} payment - Payment object
 * @returns {string} User-friendly message
 */
export const getPaymentStatusMessage = (payment) => {
  if (!payment) return '';

  if (payment.isOverdue) {
    return `OVERDUE by ${Math.abs(payment.daysUntilDue)} days!`;
  }

  if (payment.isUrgent) {
    return `Due in ${payment.daysUntilDue} day${payment.daysUntilDue !== 1 ? 's' : ''}`;
  }

  return `Due ${payment.paymentDueDate.toLocaleDateString()}`;
};
