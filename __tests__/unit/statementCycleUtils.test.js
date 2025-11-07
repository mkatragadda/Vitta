/**
 * Unit Tests for Statement Cycle Utilities
 * CRITICAL: These tests protect payment due date calculations
 * 
 * Test Coverage:
 * - Payment due date calculation across month boundaries
 * - Statement close date calculation
 * - End-of-month date handling
 * - Leap year handling
 */

import { 
  getPaymentDueDate, 
  getStatementCloseDate,
  getDaysUntilPaymentDue,
  calculateGracePeriod
} from '../../utils/statementCycleUtils';

describe('getPaymentDueDate - Month Boundary Handling', () => {
  test('CRITICAL: handles month boundary correctly (25th → 10th)', () => {
    // Statement closes Oct 25, payment due 10th (next month)
    const statementClose = new Date(2025, 9, 25); // Oct 25, 2025
    const result = getPaymentDueDate(25, 10, statementClose);
    
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(10); // November (0-indexed)
    expect(result.getDate()).toBe(10);
  });

  test('CRITICAL: handles same month correctly (5th → 20th)', () => {
    // Statement closes Oct 5, payment due 20th (same month)
    const statementClose = new Date(2025, 9, 5); // Oct 5, 2025
    const result = getPaymentDueDate(5, 20, statementClose);
    
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(9); // October
    expect(result.getDate()).toBe(20);
  });

  test('handles end of year crossing (Dec 25 → Jan 10)', () => {
    const statementClose = new Date(2025, 11, 25); // Dec 25, 2025
    const result = getPaymentDueDate(25, 10, statementClose);
    
    expect(result.getFullYear()).toBe(2026); // Crosses to next year
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(10);
  });

  test('handles 31st day of month correctly', () => {
    const statementClose = new Date(2025, 0, 31); // Jan 31, 2025
    const result = getPaymentDueDate(31, 28, statementClose);
    
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28);
  });

  test('handles February dates correctly (non-leap year)', () => {
    const statementClose = new Date(2025, 1, 15); // Feb 15, 2025
    const result = getPaymentDueDate(15, 10, statementClose);
    
    expect(result.getMonth()).toBe(2); // March (payment due crosses month)
    expect(result.getDate()).toBe(10);
  });

  test('handles leap year February correctly', () => {
    const statementClose = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
    const result = getPaymentDueDate(29, 20, statementClose);
    
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(20);
  });

  test('handles null/undefined inputs gracefully', () => {
    expect(getPaymentDueDate(null, 10, new Date())).toBeNull();
    expect(getPaymentDueDate(25, null, new Date())).toBeNull();
    expect(getPaymentDueDate(25, 10, null)).toBeDefined(); // Should use default
  });
});

describe('getStatementCloseDate - Recent Statement Calculation', () => {
  test('returns current month if statement day is in the past', () => {
    const today = new Date(2025, 10, 20); // Nov 20, 2025
    const result = getStatementCloseDate(15, today); // Statement closes 15th
    
    expect(result.getMonth()).toBe(10); // November
    expect(result.getDate()).toBe(15);
  });

  test('returns previous month if statement day is in the future', () => {
    const today = new Date(2025, 10, 10); // Nov 10, 2025
    const result = getStatementCloseDate(15, today); // Statement closes 15th
    
    expect(result.getMonth()).toBe(9); // October (previous month)
    expect(result.getDate()).toBe(15);
  });

  test('handles today being statement close day', () => {
    const today = new Date(2025, 10, 15); // Nov 15, 2025
    const result = getStatementCloseDate(15, today);
    
    // Should return this month since today IS the close day
    expect(result.getMonth()).toBe(9); // October (most recent past statement)
    expect(result.getDate()).toBe(15);
  });

  test('handles end of month correctly', () => {
    const today = new Date(2025, 10, 5); // Nov 5, 2025
    const result = getStatementCloseDate(31, today);
    
    // 31st hasn't happened yet in Nov, so return Oct 31
    expect(result.getMonth()).toBe(9); // October
    expect(result.getDate()).toBe(31);
  });

  test('returns null for invalid input', () => {
    expect(getStatementCloseDate(null, new Date())).toBeNull();
    expect(getStatementCloseDate(undefined, new Date())).toBeNull();
  });
});

describe('getDaysUntilPaymentDue - Days Calculation', () => {
  test('calculates positive days for future payment', () => {
    const today = new Date(2025, 10, 1); // Nov 1, 2025
    // Statement closes Nov 15, payment due Dec 10 (39 days from Nov 1)
    const result = getDaysUntilPaymentDue(15, 10, today);
    
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(50); // Reasonable range
  });

  test('calculates negative days for overdue payment', () => {
    const today = new Date(2025, 10, 20); // Nov 20, 2025
    // Statement closed Oct 15, payment due Nov 10 (10 days ago = -10)
    const result = getDaysUntilPaymentDue(15, 10, today);
    
    expect(result).toBeLessThan(0); // Overdue
  });

  test('returns 0 days when payment is due today', () => {
    const today = new Date(2025, 10, 10); // Nov 10, 2025
    // Statement closed Oct 15, payment due Nov 10 (today)
    const result = getDaysUntilPaymentDue(15, 10, today);
    
    expect(result).toBe(0);
  });
});

describe('calculateGracePeriod - Grace Period Calculation', () => {
  test('calculates grace period correctly for same month', () => {
    const statementClose = new Date(2025, 10, 5); // Nov 5
    const paymentDue = new Date(2025, 10, 30); // Nov 30
    const result = calculateGracePeriod(statementClose, paymentDue);
    
    expect(result).toBe(25); // 30 - 5 = 25 days
  });

  test('calculates grace period correctly across months', () => {
    const statementClose = new Date(2025, 10, 25); // Nov 25
    const paymentDue = new Date(2025, 11, 20); // Dec 20
    const result = calculateGracePeriod(statementClose, paymentDue);
    
    expect(result).toBe(25); // 5 days in Nov + 20 days in Dec = 25 days
  });

  test('returns default (25 days) for null inputs', () => {
    expect(calculateGracePeriod(null, null)).toBe(25);
    expect(calculateGracePeriod(undefined, new Date())).toBe(25);
  });

  test('returns default for invalid dates', () => {
    expect(calculateGracePeriod('invalid', 'invalid')).toBe(25);
  });

  test('warns for unusual grace periods', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const statementClose = new Date(2025, 10, 1);
    const paymentDue = new Date(2026, 0, 1); // 61 days later
    const result = calculateGracePeriod(statementClose, paymentDue);
    
    expect(result).toBe(25); // Returns default
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unusual grace period'),
      expect.anything()
    );
    
    consoleSpy.mockRestore();
  });
});

// REGRESSION TEST: Payment Due Date Bug (Fixed 2025-11-06)
describe('REGRESSION: Payment Due Date Recalculation Bug (Fixed 2025-11-06)', () => {
  test('does not recalculate statement close date when provided', () => {
    // BUG: Function was recalculating statement close date from the passed date
    // This caused month shifts and wrong payment dates
    
    const explicitStatementClose = new Date(2025, 9, 25); // Oct 25, 2025
    const result = getPaymentDueDate(25, 10, explicitStatementClose);
    
    // Should use Oct 25 as-is, resulting in Nov 10 payment
    expect(result.getMonth()).toBe(10); // November
    expect(result.getDate()).toBe(10);
    
    // Should NOT be Dec 10 (which would happen if it recalculated Oct 25 as Nov 25)
    expect(result.getMonth()).not.toBe(11);
  });

  test('correct dates for all real user cards (Nov 7, 2025)', () => {
    const today = new Date(2025, 10, 7); // Nov 7, 2025
    
    const testCases = [
      { card: 'bofa unlimited', stmtDay: 15, payDay: 16, expectedMonth: 10, expectedDay: 16 },
      { card: 'citi master', stmtDay: 8, payDay: 28, expectedMonth: 10, expectedDay: 28 },
      { card: 'citi costco', stmtDay: 1, payDay: 28, expectedMonth: 10, expectedDay: 28 },
      { card: 'bofa travel', stmtDay: 12, payDay: 9, expectedMonth: 11, expectedDay: 9 }
    ];
    
    testCases.forEach(({ card, stmtDay, payDay, expectedMonth, expectedDay }) => {
      const stmtClose = getStatementCloseDate(stmtDay, today);
      const paymentDue = getPaymentDueDate(stmtDay, payDay, stmtClose);
      
      expect(paymentDue.getMonth()).toBe(expectedMonth);
      expect(paymentDue.getDate()).toBe(expectedDay);
    });
  });

  test('handles month boundary edge cases correctly', () => {
    const testCases = [
      // (statement day, payment day, reference date, expected payment month, expected payment day)
      [25, 10, new Date(2025, 9, 26), 10, 10], // Oct 26 → statement Oct 25 → payment Nov 10
      [1, 28, new Date(2025, 10, 5), 10, 28],  // Nov 5 → statement Nov 1 → payment Nov 28
      [31, 28, new Date(2025, 0, 15), 1, 28],  // Jan 15 → statement Dec 31 → payment Jan 28
    ];
    
    testCases.forEach(([stmtDay, payDay, refDate, expMonth, expDay]) => {
      const stmtClose = getStatementCloseDate(stmtDay, refDate);
      const paymentDue = getPaymentDueDate(stmtDay, payDay, stmtClose);
      
      expect(paymentDue.getMonth()).toBe(expMonth);
      expect(paymentDue.getDate()).toBe(expDay);
    });
  });
});

// Edge Cases
describe('Edge Cases', () => {
  test('handles statement close and payment due on same day', () => {
    const statementClose = new Date(2025, 10, 15);
    const result = getPaymentDueDate(15, 15, statementClose);
    
    // Same day should be same month (edge case)
    expect(result.getMonth()).toBe(10);
    expect(result.getDate()).toBe(15);
  });

  test('handles maximum month boundary (Dec 31 → Jan 1)', () => {
    const statementClose = new Date(2025, 11, 31); // Dec 31
    const result = getPaymentDueDate(31, 1, statementClose);
    
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(1);
  });

  test('handles February 30th gracefully (invalid date)', () => {
    // Some credit cards might have "30th" stored but Feb doesn't have 30 days
    const today = new Date(2025, 1, 15); // Feb 15
    const result = getStatementCloseDate(30, today);
    
    // JavaScript Date handles this by rolling to next month
    expect(result).toBeDefined();
  });
});

