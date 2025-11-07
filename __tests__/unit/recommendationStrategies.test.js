/**
 * Unit Tests for Recommendation Strategies
 * CRITICAL: These tests protect financial recommendation logic
 * 
 * Test Coverage:
 * - Grace period rule enforcement (cards with balance cannot be recommended)
 * - Cashback calculations (actual dollar amounts)
 * - Interest calculations (monthly/annual)
 * - Float time calculations
 */

import { scoreForRewards, scoreForAPR, scoreForGracePeriod, getAllStrategies } from '../../services/recommendations/recommendationStrategies';

// Test Fixtures
const CARD_NO_BALANCE = {
  id: 'card-1',
  nickname: 'Test Rewards Card',
  card_name: 'Test Rewards Card',
  current_balance: 0,
  credit_limit: 10000,
  apr: 18.99,
  statement_close_day: 15,
  payment_due_day: 10,
  grace_period_days: 25,
  reward_structure: {
    default: 1.0,
    groceries: 1.5,
    dining: 2.0
  }
};

const CARD_WITH_SMALL_BALANCE = {
  id: 'card-2',
  nickname: 'Card With Small Balance',
  card_name: 'Card With Small Balance',
  current_balance: 0.01, // Even $0.01 means NO grace period
  credit_limit: 10000,
  apr: 19.24,
  statement_close_day: 25,
  payment_due_day: 10,
  grace_period_days: 21,
  reward_structure: {
    default: 2.0
  }
};

const CARD_WITH_HIGH_BALANCE = {
  id: 'card-3',
  nickname: 'Citi Costco',
  card_name: 'Citi Costco Anywhere Visa',
  current_balance: 20999.96,
  credit_limit: 25000,
  apr: 19.24,
  statement_close_day: 1,
  payment_due_day: 28,
  grace_period_days: 27,
  reward_structure: {
    default: 1.0
  }
};

describe('scoreForRewards - Grace Period Rule Enforcement', () => {
  test('CRITICAL: Card with $0 balance HAS grace period and CAN be recommended', () => {
    const cards = [CARD_NO_BALANCE];
    const result = scoreForRewards(cards, 'groceries', 1000);
    
    expect(result).toHaveLength(1);
    expect(result[0].hasGracePeriod).toBe(true);
    expect(result[0].canRecommend).toBe(true);
    expect(result[0].score).toBeGreaterThan(0); // Positive score
    expect(result[0].warning).toBeUndefined();
  });

  test('CRITICAL: Card with $0.01 balance has NO grace period and CANNOT be recommended', () => {
    const cards = [CARD_WITH_SMALL_BALANCE];
    const result = scoreForRewards(cards, 'groceries', 1000);
    
    expect(result).toHaveLength(1);
    expect(result[0].hasGracePeriod).toBe(false);
    expect(result[0].canRecommend).toBe(false);
    expect(result[0].score).toBe(-1000); // Penalty score
    expect(result[0].warning).toContain('no grace period');
  });

  test('CRITICAL: Card with $20,999 balance has NO grace period and CANNOT be recommended', () => {
    const cards = [CARD_WITH_HIGH_BALANCE];
    const result = scoreForRewards(cards, 'groceries', 1000);
    
    expect(result).toHaveLength(1);
    expect(result[0].hasGracePeriod).toBe(false);
    expect(result[0].canRecommend).toBe(false);
    expect(result[0].score).toBe(-1000);
    expect(result[0].warning).toContain('$20,999');
    expect(result[0].explanation).toContain('Interest charges immediately');
  });

  test('Mixed cards: Only $0 balance cards are recommended', () => {
    const cards = [CARD_NO_BALANCE, CARD_WITH_SMALL_BALANCE, CARD_WITH_HIGH_BALANCE];
    const result = scoreForRewards(cards, 'groceries', 1000);
    
    expect(result).toHaveLength(3);
    
    // Only first card should be recommendable
    const recommendable = result.filter(r => r.canRecommend);
    expect(recommendable).toHaveLength(1);
    expect(recommendable[0].card.id).toBe('card-1');
    
    // Other cards should have penalty
    const notRecommendable = result.filter(r => !r.canRecommend);
    expect(notRecommendable).toHaveLength(2);
    notRecommendable.forEach(r => {
      expect(r.score).toBe(-1000);
      expect(r.hasGracePeriod).toBe(false);
    });
  });
});

describe('scoreForRewards - Cashback Calculations', () => {
  test('calculates correct cashback for 1.5x rewards on $1000 groceries', () => {
    const cards = [CARD_NO_BALANCE];
    const result = scoreForRewards(cards, 'groceries', 1000);
    
    expect(result[0].multiplier).toBe(1.5);
    expect(result[0].cashback).toBe(15.00);
    expect(result[0].annualValue).toBe(180); // $15 * 12 months
    expect(result[0].explanation).toContain('$15.00 cashback');
  });

  test('calculates correct cashback for 2.0x rewards on $500 dining', () => {
    const cards = [CARD_NO_BALANCE];
    const result = scoreForRewards(cards, 'dining', 500);
    
    expect(result[0].multiplier).toBe(2.0);
    expect(result[0].cashback).toBe(10.00);
    expect(result[0].annualValue).toBe(120);
  });

  test('uses default multiplier for unknown category', () => {
    const cards = [CARD_NO_BALANCE];
    const result = scoreForRewards(cards, 'unknown_category', 1000);
    
    expect(result[0].multiplier).toBe(1.0);
    expect(result[0].cashback).toBe(10.00);
  });

  test('handles $0 amount correctly', () => {
    const cards = [CARD_NO_BALANCE];
    const result = scoreForRewards(cards, 'groceries', 0);
    
    expect(result[0].cashback).toBe(0);
    expect(result[0].annualValue).toBe(0);
  });
});

describe('scoreForAPR - Interest Calculations', () => {
  test('calculates correct monthly interest for 18.99% APR on $1000', () => {
    const cards = [CARD_NO_BALANCE];
    const result = scoreForAPR(cards, 1000);
    
    const monthlyRate = (18.99 / 12) / 100;
    const expectedMonthly = 1000 * monthlyRate;
    
    expect(result[0].apr).toBe(18.99);
    expect(result[0].monthlyInterest).toBeCloseTo(expectedMonthly, 2);
    expect(result[0].monthlyInterest).toBeCloseTo(15.825, 2);
  });

  test('calculates correct annual interest for 18.99% APR on $1000', () => {
    const cards = [CARD_NO_BALANCE];
    const result = scoreForAPR(cards, 1000);
    
    const expectedAnnual = 1000 * (18.99 / 100);
    
    expect(result[0].annualInterest).toBeCloseTo(expectedAnnual, 2);
    expect(result[0].annualInterest).toBeCloseTo(189.90, 2);
  });

  test('sorts by lowest APR first', () => {
    const cards = [
      { ...CARD_NO_BALANCE, apr: 19.99, id: 'high-apr' },
      { ...CARD_NO_BALANCE, apr: 15.99, id: 'low-apr' },
      { ...CARD_NO_BALANCE, apr: 18.99, id: 'mid-apr' }
    ];
    const result = scoreForAPR(cards, 1000);
    
    // Should be sorted by lowest APR (lowest interest = highest score)
    expect(result[0].card.id).toBe('low-apr');
    expect(result[1].card.id).toBe('mid-apr');
    expect(result[2].card.id).toBe('high-apr');
  });

  test('handles different balance amounts', () => {
    const cards = [CARD_NO_BALANCE];
    
    const result100 = scoreForAPR(cards, 100);
    const result1000 = scoreForAPR(cards, 1000);
    const result10000 = scoreForAPR(cards, 10000);
    
    expect(result1000[0].monthlyInterest).toBeCloseTo(result100[0].monthlyInterest * 10, 2);
    expect(result10000[0].monthlyInterest).toBeCloseTo(result1000[0].monthlyInterest * 10, 2);
  });
});

describe('scoreForGracePeriod - Grace Period Rule Enforcement', () => {
  test('CRITICAL: Card with $0 balance HAS grace period', () => {
    const cards = [CARD_NO_BALANCE];
    const result = scoreForGracePeriod(cards, new Date());
    
    expect(result[0].hasGracePeriod).toBe(true);
    expect(result[0].canRecommend).toBe(true);
    expect(result[0].floatDays).toBeGreaterThan(0);
    expect(result[0].warning).toBeUndefined();
  });

  test('CRITICAL: Card with balance has NO grace period', () => {
    const cards = [CARD_WITH_HIGH_BALANCE];
    const result = scoreForGracePeriod(cards, new Date());
    
    expect(result[0].hasGracePeriod).toBe(false);
    expect(result[0].canRecommend).toBe(false);
    expect(result[0].floatDays).toBe(0);
    expect(result[0].score).toBe(-1000);
    expect(result[0].warning).toContain('NO grace period');
  });

  test('sorts by longest float time first', () => {
    const cards = [
      { ...CARD_NO_BALANCE, statement_close_day: 1, payment_due_day: 5, id: 'short' },
      { ...CARD_NO_BALANCE, statement_close_day: 1, payment_due_day: 28, id: 'long' },
      { ...CARD_NO_BALANCE, statement_close_day: 15, payment_due_day: 10, id: 'mid' }
    ];
    const result = scoreForGracePeriod(cards, new Date(2025, 10, 2)); // Nov 2
    
    // Longest float should be first
    expect(result[0].floatDays).toBeGreaterThanOrEqual(result[1].floatDays);
    expect(result[1].floatDays).toBeGreaterThanOrEqual(result[2].floatDays);
  });
});

describe('getAllStrategies - Integration', () => {
  test('returns all three strategies', () => {
    const cards = [CARD_NO_BALANCE];
    const result = getAllStrategies(cards, 'groceries', 1000);
    
    expect(result).toHaveProperty('rewards');
    expect(result).toHaveProperty('apr');
    expect(result).toHaveProperty('gracePeriod');
    
    expect(result.rewards).toBeInstanceOf(Array);
    expect(result.apr).toBeInstanceOf(Array);
    expect(result.gracePeriod).toBeInstanceOf(Array);
  });

  test('CRITICAL: Cards with balance are marked correctly across all strategies', () => {
    const cards = [CARD_NO_BALANCE, CARD_WITH_HIGH_BALANCE];
    const result = getAllStrategies(cards, 'groceries', 1000);
    
    // Rewards: Only card 1 can be recommended
    const rewardsRecommendable = result.rewards.filter(r => r.canRecommend);
    expect(rewardsRecommendable).toHaveLength(1);
    expect(rewardsRecommendable[0].card.id).toBe('card-1');
    
    // APR: Both cards can be compared (even with balance)
    expect(result.apr).toHaveLength(2);
    expect(result.apr.every(r => r.canRecommend)).toBe(true);
    
    // Grace Period: Only card 1 has grace period
    const graceAvailable = result.gracePeriod.filter(r => r.hasGracePeriod);
    expect(graceAvailable).toHaveLength(1);
    expect(graceAvailable[0].card.id).toBe('card-1');
  });

  test('handles empty card array', () => {
    const result = getAllStrategies([], 'groceries', 1000);
    
    expect(result.rewards).toEqual([]);
    expect(result.apr).toEqual([]);
    expect(result.gracePeriod).toEqual([]);
  });
});

// Regression Test: Citi Costco Bug
describe('REGRESSION: Citi Costco with high balance (Fixed 2025-11-06)', () => {
  test('Citi Costco with $20,999 balance is NOT recommended for cashflow', () => {
    const cards = [CARD_WITH_HIGH_BALANCE];
    const result = scoreForGracePeriod(cards, new Date());
    
    expect(result[0].canRecommend).toBe(false);
    expect(result[0].hasGracePeriod).toBe(false);
    expect(result[0].warning).toContain('NO grace period');
    expect(result[0].explanation).toContain('Interest charges immediately');
  });

  test('Citi Costco with $20,999 balance is NOT recommended for rewards', () => {
    const cards = [CARD_WITH_HIGH_BALANCE];
    const result = scoreForRewards(cards, 'groceries', 1000);
    
    expect(result[0].canRecommend).toBe(false);
    expect(result[0].score).toBe(-1000);
    expect(result[0].cashback).toBe(0);
  });

  test('Citi Costco CAN be shown for APR comparison (even with balance)', () => {
    const cards = [CARD_WITH_HIGH_BALANCE];
    const result = scoreForAPR(cards, 1000);
    
    // APR comparison works regardless of balance
    expect(result[0].canRecommend).toBe(true);
    expect(result[0].apr).toBe(19.24);
    expect(result[0].monthlyInterest).toBeGreaterThan(0);
  });
});

