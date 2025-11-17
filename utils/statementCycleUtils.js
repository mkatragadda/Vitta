/**
 * Statement Cycle Date Utilities
 *
 * Critical Logic for Recurring Monthly Credit Card Cycles
 *
 * Problem: Credit card statements recur monthly, but dates vary
 * Solution: Store day-of-month (1-31), calculate actual dates dynamically
 */

/**
 * Calculate grace period from actual statement dates
 * CRITICAL: Grace period is days between statement close and payment due
 * Typically 21-27 days (payment due is next month after statement closes)
 *
 * @param {Date|string} statementCloseDate - When statement closes
 * @param {Date|string} paymentDueDate - When payment is due
 * @returns {number} Grace period in days (typically 21-27)
 *
 * @example
 * // Statement closes Jan 15, payment due Feb 10
 * calculateGracePeriod('2025-01-15', '2025-02-10') // Returns 26 days
 */
export const calculateGracePeriod = (statementCloseDate, paymentDueDate) => {
  if (!statementCloseDate || !paymentDueDate) {
    return 25; // Default grace period
  }

  const closeDate = new Date(statementCloseDate);
  const dueDate = new Date(paymentDueDate);

  // Normalize to midnight
  closeDate.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  // Validate dates
  if (isNaN(closeDate.getTime()) || isNaN(dueDate.getTime())) {
    console.warn('[StatementCycle] Invalid date values:', { statementCloseDate, paymentDueDate });
    return 25;
  }

  // Calculate difference in days
  const diffTime = dueDate - closeDate;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Grace period should be positive and reasonable (21-27 days typically)
  if (diffDays < 1 || diffDays > 60) {
    console.warn('[StatementCycle] Unusual grace period:', { diffDays, statementCloseDate, paymentDueDate });
    return 25;
  }

  console.log('[StatementCycle] Calculated grace period:', {
    statementCloses: closeDate.toLocaleDateString(),
    paymentDue: dueDate.toLocaleDateString(),
    gracePeriodDays: diffDays
  });

  return diffDays;
};

/**
 * Get the actual statement close date for a given reference date
 * Handles current, previous, and next statement cycles
 *
 * @param {number} statementCloseDay - Day of month (1-31)
 * @param {Date} referenceDate - Date to calculate from (default: today)
 * @returns {Date} Actual statement close date
 *
 * @example
 * // If today is Jan 20, 2025 and statement closes on 15th:
 * getStatementCloseDate(15) // Returns Jan 15, 2025 (most recent)
 * getStatementCloseDate(25) // Returns Dec 25, 2024 (previous month)
 */
export const getStatementCloseDate = (statementCloseDay, referenceDate = new Date()) => {
  if (!statementCloseDay) return null;

  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const today = referenceDate.getDate();

  // Try current month first
  let statementDate = new Date(year, month, statementCloseDay);

  // If statement day is today or in the future, use previous month's statement
  // Rationale: "Most recent" statement is the one that already closed.
  if (statementCloseDay >= today) {
    statementDate = new Date(year, month - 1, statementCloseDay);
  }

  return statementDate;
};

/**
 * Get the actual payment due date for a given statement close date
 * Accounts for month boundaries (payment due in month after statement closes)
 *
 * @param {number} statementCloseDay - Day of month statement closes (1-31)
 * @param {number} paymentDueDay - Day of month payment is due (1-31)
 * @param {Date} statementCloseDate - The actual statement close date (NOT a reference date)
 * @returns {Date} Actual payment due date
 *
 * @example
 * // Statement closed on Oct 25, payment due 10th (crosses month)
 * getPaymentDueDate(25, 10, new Date(2025, 9, 25)) // Returns Nov 10, 2025
 */
export const getPaymentDueDate = (statementCloseDay, paymentDueDay, statementCloseDate) => {
  if (!statementCloseDay || !paymentDueDay) return null;

  // If no specific statement date provided, calculate for today
  let statementDate = statementCloseDate;
  if (!statementDate) {
    statementDate = getStatementCloseDate(statementCloseDay, new Date());
  }
  
  if (!statementDate) return null;

  const year = statementDate.getFullYear();
  const month = statementDate.getMonth();

  // If payment_due_day <= statement_close_day, payment is next month
  // Also ensure a minimal practical grace period (e.g., 5 days).
  // Some issuers have due dates shortly after close; if the gap is unrealistically small,
  // push to next month to maintain a reasonable grace period.
  const minimalGraceDays = 5;
  if (paymentDueDay <= statementCloseDay || (paymentDueDay - statementCloseDay) < minimalGraceDays) {
    // Payment due in month after statement closes
    return new Date(year, month + 1, paymentDueDay);
  } else {
    // Payment due in same month as statement
    return new Date(year, month, paymentDueDay);
  }
};

/**
 * Calculate days until payment is due from a reference date
 *
 * @param {number} statementCloseDay - Day of month statement closes (1-31)
 * @param {number} paymentDueDay - Day of month payment is due (1-31)
 * @param {Date} referenceDate - Date to calculate from (default: today)
 * @returns {number} Days until payment due (can be negative if overdue)
 *
 * @example
 * // If today is Jan 20 and payment due is Jan 25:
 * getDaysUntilPaymentDue(15, 25) // Returns 5
 */
export const getDaysUntilPaymentDue = (statementCloseDay, paymentDueDay, referenceDate = new Date()) => {
  // First get the statement close date for this reference date
  const statementDate = getStatementCloseDate(statementCloseDay, referenceDate);
  if (!statementDate) return null;
  
  // Then calculate payment due date based on that statement
  const dueDate = getPaymentDueDate(statementCloseDay, paymentDueDay, statementDate);
  if (!dueDate) return null;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0); // Normalize to midnight

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Calculate total float time (days from purchase to payment due)
 * This is the key metric for cash flow optimization strategy
 *
 * CRITICAL: Only works if card has grace period (no carried balance)
 *
 * @param {Object} card - Credit card object
 * @param {Date} purchaseDate - When purchase will be made
 * @returns {number} Days of float (time until payment required)
 *
 * @example
 * // Purchase on Jan 5, statement closes Jan 15, payment due Feb 10
 * // Float = (Jan 15 - Jan 5) + grace_period
 * // Float = 10 + 25 = 35 days
 */
export const calculateFloatTime = (card, purchaseDate = new Date()) => {
  if (!card.statement_close_day || !card.payment_due_day) {
    // No cycle data - estimate based on grace period
    return card.grace_period_days || 25;
  }

  const statementDate = getStatementCloseDate(card.statement_close_day, purchaseDate);
  if (!statementDate) return card.grace_period_days || 25;
  
  // Calculate payment due date based on the statement close date
  const dueDate = getPaymentDueDate(card.statement_close_day, card.payment_due_day, statementDate);
  if (!dueDate) return card.grace_period_days || 25;

  // If purchase is after statement close, it goes on NEXT statement
  const purchase = new Date(purchaseDate);
  purchase.setHours(0, 0, 0, 0);

  let relevantStatementDate = new Date(statementDate);
  let relevantDueDate = new Date(dueDate);

  if (purchase > statementDate) {
    // Purchase is after this statement close - goes on next statement
    relevantStatementDate = new Date(statementDate);
    relevantStatementDate.setMonth(relevantStatementDate.getMonth() + 1);

    relevantDueDate = new Date(dueDate);
    relevantDueDate.setMonth(relevantDueDate.getMonth() + 1);
  }

  // Calculate days from purchase to payment due
  const diffTime = relevantDueDate - purchase;
  const floatDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  console.log('[FloatCalc]', {
    cardName: card.card_name || card.nickname,
    purchaseDate: purchase.toLocaleDateString(),
    statementCloses: relevantStatementDate.toLocaleDateString(),
    paymentDue: relevantDueDate.toLocaleDateString(),
    floatDays
  });

  return Math.max(0, floatDays);
};

/**
 * Check if purchase is in current statement cycle
 * Important for determining which statement a purchase will appear on
 *
 * @param {number} statementCloseDay - Day of month statement closes
 * @param {Date} purchaseDate - Date of purchase
 * @returns {boolean} True if purchase is in current cycle
 */
export const isInCurrentCycle = (statementCloseDay, purchaseDate = new Date()) => {
  if (!statementCloseDay) return true;

  const purchase = new Date(purchaseDate);
  const statementDate = getStatementCloseDate(statementCloseDay, purchase);

  if (!statementDate) return true;

  // Purchase is in current cycle if it's before or on statement close date
  return purchase <= statementDate;
};

/**
 * Format day-of-month for display
 * Handles ordinal suffixes (1st, 2nd, 3rd, etc.)
 *
 * @param {number} day - Day of month (1-31)
 * @returns {string} Formatted string (e.g., "15th", "1st", "22nd")
 */
export const formatDayOfMonth = (day) => {
  if (!day) return '';

  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = day % 100;
  const suffix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];

  return `${day}${suffix}`;
};

/**
 * Get human-readable description of payment cycle
 *
 * @param {Object} card - Credit card object
 * @returns {string} Description (e.g., "Statement closes 15th, payment due 10th (25 days grace)")
 */
export const getPaymentCycleDescription = (card) => {
  if (!card.statement_close_day || !card.payment_due_day) {
    if (card.grace_period_days) {
      return `${card.grace_period_days}-day grace period`;
    }
    return 'Payment cycle not configured';
  }

  const closeDay = formatDayOfMonth(card.statement_close_day);
  const dueDay = formatDayOfMonth(card.payment_due_day);
  const gracePeriod = card.grace_period_days || calculateGracePeriod(card.statement_close_day, card.payment_due_day);

  return `Statement closes ${closeDay}, payment due ${dueDay} (${gracePeriod} days grace)`;
};

/**
 * Get next payment due date as actual date
 * Useful for displaying in UI
 *
 * @param {Object} card - Credit card object
 * @returns {Date|null} Next payment due date
 */
export const getNextPaymentDue = (card) => {
  if (!card.statement_close_day || !card.payment_due_day) {
    return null;
  }

  return getPaymentDueDate(card.statement_close_day, card.payment_due_day);
};

/**
 * Legacy support: Extract day from old DATE column
 * Used during migration period
 *
 * @param {Date|string} dateValue - Date value from database
 * @returns {number|null} Day of month (1-31)
 */
export const extractDayFromDate = (dateValue) => {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return null;

  return date.getDate();
};
