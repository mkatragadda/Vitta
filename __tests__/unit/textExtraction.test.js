/**
 * Unit tests for text extraction utilities
 */

import {
  extractAmount,
  extractAllAmounts,
  extractPercentage,
  formatAmount
} from '../../utils/textExtraction';

describe('extractAmount', () => {
  describe('Dollar sign formats', () => {
    test('extracts simple dollar amount', () => {
      expect(extractAmount('I have $5000')).toBe(5000);
      expect(extractAmount('budget is $500')).toBe(500);
      expect(extractAmount('Need $25')).toBe(25);
    });

    test('extracts dollar amount with commas', () => {
      expect(extractAmount('I have $5,000')).toBe(5000);
      expect(extractAmount('budget is $1,500')).toBe(1500);
      expect(extractAmount('$10,000.50')).toBe(10000.50);
    });

    test('extracts dollar amount with decimals', () => {
      expect(extractAmount('$100.50')).toBe(100.50);
      expect(extractAmount('$1,234.56')).toBe(1234.56);
    });

    test('handles space after dollar sign', () => {
      expect(extractAmount('$ 5000')).toBe(5000);
      expect(extractAmount('$  500')).toBe(500);
    });
  });

  describe('Word formats', () => {
    test('extracts amount with "dollars"', () => {
      expect(extractAmount('5000 dollars')).toBe(5000);
      expect(extractAmount('500 dollar')).toBe(500);
      expect(extractAmount('1,500 dollars')).toBe(1500);
    });

    test('extracts amount with "USD"', () => {
      expect(extractAmount('5000 USD')).toBe(5000);
      expect(extractAmount('1,500 usd')).toBe(1500);
    });

    test('extracts amount with "bucks"', () => {
      expect(extractAmount('5000 bucks')).toBe(5000);
      expect(extractAmount('500 buck')).toBe(500);
    });
  });

  describe('K notation', () => {
    test('extracts amount with k', () => {
      expect(extractAmount('5k')).toBe(5000);
      expect(extractAmount('2.5k')).toBe(2500);
      expect(extractAmount('10K')).toBe(10000);
    });

    test('respects allowK option', () => {
      expect(extractAmount('5k', { allowK: false })).toBeNull();
    });
  });

  describe('Plain numbers', () => {
    test('extracts plain numbers', () => {
      expect(extractAmount('5000')).toBe(5000);
      expect(extractAmount('500')).toBe(500);
      expect(extractAmount('5,000')).toBe(5000);
    });

    test('respects minDigits option', () => {
      expect(extractAmount('50', { minDigits: 3 })).toBeNull();
      expect(extractAmount('500', { minDigits: 3 })).toBe(500);
    });
  });

  describe('Complex sentences', () => {
    test('extracts from natural language', () => {
      expect(extractAmount('I have budget of $5000 for credit card payments')).toBe(5000);
      expect(extractAmount('Split 5000 between my cards')).toBe(5000);
      expect(extractAmount('My budget is around $1,500')).toBe(1500);
      expect(extractAmount('I can afford 2.5k per month')).toBe(2500);
    });

    test('handles the reported bug case', () => {
      // The original bug: $5000 was being extracted as 500
      expect(extractAmount('Ive budget of $5000 for credit card payments and need to split between my cards in optimum way')).toBe(5000);
      expect(extractAmount('I have $5000')).toBe(5000);
      expect(extractAmount('budget of $5000')).toBe(5000);
    });
  });

  describe('Edge cases', () => {
    test('returns null for no amount', () => {
      expect(extractAmount('Hello world')).toBeNull();
      expect(extractAmount('')).toBeNull();
      expect(extractAmount('No numbers here')).toBeNull();
    });

    test('returns null for invalid input', () => {
      expect(extractAmount(null)).toBeNull();
      expect(extractAmount(undefined)).toBeNull();
      expect(extractAmount(123)).toBeNull();
    });

    test('ignores very small numbers with minDigits', () => {
      expect(extractAmount('I have 5 cards', { minDigits: 3 })).toBeNull();
      expect(extractAmount('Pay 50', { minDigits: 3 })).toBeNull();
    });

    test('handles zero (returns null)', () => {
      expect(extractAmount('$0')).toBeNull();
    });
    
    test('extracts absolute value from negative notation', () => {
      // In budget/payment context, we extract the number even if prefixed with minus
      // This is acceptable since users shouldn't be entering negative budgets
      expect(extractAmount('-$500')).toBe(500);
    });
  });
});

describe('extractAllAmounts', () => {
  test('extracts multiple amounts from text', () => {
    const amounts = extractAllAmounts('Split $1000 on card A and $500 on card B');
    expect(amounts).toContain(1000);
    expect(amounts).toContain(500);
    expect(amounts.length).toBe(2);
  });

  test('extracts mixed format amounts', () => {
    const amounts = extractAllAmounts('Pay $1000, 500 dollars, and 2k');
    expect(amounts).toContain(1000);
    expect(amounts).toContain(500);
    expect(amounts).toContain(2000);
  });

  test('returns empty array for no amounts', () => {
    expect(extractAllAmounts('No amounts here')).toEqual([]);
    expect(extractAllAmounts('')).toEqual([]);
  });

  test('removes duplicates', () => {
    const amounts = extractAllAmounts('Pay $500 or 500 dollars');
    expect(amounts.filter(a => a === 500).length).toBe(1);
  });
});

describe('extractPercentage', () => {
  test('extracts percentage with % sign', () => {
    expect(extractPercentage('APR is 25%')).toBe(0.25);
    expect(extractPercentage('Rate: 18.5%')).toBe(0.185);
  });

  test('extracts percentage with "percent" word', () => {
    expect(extractPercentage('25 percent')).toBe(0.25);
    expect(extractPercentage('18.5 percent APR')).toBe(0.185);
  });

  test('extracts decimal format', () => {
    expect(extractPercentage('Rate is 0.25')).toBe(0.25);
    expect(extractPercentage('0.185 APR')).toBe(0.185);
  });

  test('returns null for invalid percentages', () => {
    expect(extractPercentage('No percentage here')).toBeNull();
    expect(extractPercentage('150%')).toBeNull(); // > 100%
    expect(extractPercentage('')).toBeNull();
  });
});

describe('formatAmount', () => {
  test('formats amount with dollar sign and commas', () => {
    expect(formatAmount(5000)).toBe('$5,000.00');
    expect(formatAmount(1500)).toBe('$1,500.00');
    expect(formatAmount(100.5)).toBe('$100.50');
  });

  test('respects decimals option', () => {
    expect(formatAmount(5000, { decimals: 0 })).toBe('$5,000');
    expect(formatAmount(1500.99, { decimals: 0 })).toBe('$1,501');
  });

  test('respects includeSymbol option', () => {
    expect(formatAmount(5000, { includeSymbol: false })).toBe('5,000.00');
    expect(formatAmount(1500, { includeSymbol: false })).toBe('1,500.00');
  });

  test('handles edge cases', () => {
    expect(formatAmount(0)).toBe('$0.00');
    expect(formatAmount(NaN)).toBe('$0.00');
    expect(formatAmount(null)).toBe('$0.00');
  });

  test('formats large amounts', () => {
    expect(formatAmount(1000000)).toBe('$1,000,000.00');
    expect(formatAmount(123456.78)).toBe('$123,456.78');
  });
});

describe('Real-world integration scenarios', () => {
  test('handles user query variations for $5000', () => {
    // All these should extract 5000
    const queries = [
      'I have budget of $5000',
      'budget is $5000',
      'I have $5000',
      '$5000',
      '5000',
      '5,000',
      '$5,000',
      '5k',
      '5000 dollars',
      'Split $5000 between cards',
      'Ive budget of $5000 for credit card payments and need to split between my cards in optimum way'
    ];

    queries.forEach(query => {
      const amount = extractAmount(query);
      expect(amount).toBe(5000);
    });
  });

  test('handles budget context extraction', () => {
    expect(extractAmount('my budget is 2000')).toBe(2000);
    expect(extractAmount('I can pay 1500')).toBe(1500);
    expect(extractAmount('afford $3000')).toBe(3000);
  });

  test('handles payment split scenarios', () => {
    expect(extractAmount('split 5000 between all my cards')).toBe(5000);
    expect(extractAmount('distribute $2000 across cards')).toBe(2000);
  });
});

