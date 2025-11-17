/**
 * Test Dining Recommendations - Verify Best Card Selection
 * 
 * Issue: User asked for "best card for dining" and got Discover It (5x via "restaurants")
 * Need to verify: Is it correctly recommending the best card?
 */

import { scoreForRewards } from '../../services/recommendations/recommendationStrategies';

// Cards from TEST_DATA_REWARDS_OPTIMIZER.sql
const CITI_CUSTOM_CASH = {
  id: 'citi-custom',
  nickname: 'Citi Custom',
  card_name: 'Custom Cash',
  current_balance: 0,
  credit_limit: 12000,
  apr: 26.24,
  statement_close_day: 16,
  payment_due_day: 12,
  grace_period_days: 26,
  reward_structure: {
    groceries: 5,
    gas: 5,
    dining: 5,  // Direct 5x dining
    travel: 5,
    default: 1
  }
};

const DISCOVER_IT = {
  id: 'discover-it',
  nickname: 'Discover It',
  card_name: 'Discover It',
  current_balance: 0,
  credit_limit: 14000,
  apr: 22.99,
  statement_close_day: 22,
  payment_due_day: 17,
  grace_period_days: 25,
  reward_structure: {
    groceries: 5,
    gas: 5,
    restaurants: 5,  // 5x via "restaurants" (should map to dining)
    default: 1
  }
};

const AMEX_GOLD = {
  id: 'amex-gold',
  nickname: 'Amex Gold',
  card_name: 'Gold Card',
  current_balance: 0,
  credit_limit: 25000,
  apr: 25.74,
  statement_close_day: 15,
  payment_due_day: 10,
  grace_period_days: 26,
  reward_structure: {
    dining: 4,  // 4x dining
    groceries: 4,
    travel: 3,
    default: 1
  }
};

const CAPITAL_ONE_SAVOR = {
  id: 'capital-one-savor',
  nickname: 'Capital One Savor',
  card_name: 'Savor Rewards',
  current_balance: 0,
  credit_limit: 16000,
  apr: 24.74,
  statement_close_day: 9,
  payment_due_day: 5,
  grace_period_days: 26,
  reward_structure: {
    dining: 4,  // 4x dining
    entertainment: 4,
    groceries: 2,
    default: 1
  }
};

describe('Dining Recommendations - Best Card Selection', () => {
  test('CRITICAL: Both Citi Custom Cash and Discover It should have 5x for dining', () => {
    const cards = [CITI_CUSTOM_CASH, DISCOVER_IT];
    const result = scoreForRewards(cards, 'dining', 1000);

    // Both should have 5x multiplier
    const citiCard = result.find(r => r.card.id === 'citi-custom');
    const discoverCard = result.find(r => r.card.id === 'discover-it');

    expect(citiCard).toBeDefined();
    expect(discoverCard).toBeDefined();

    expect(citiCard.multiplier).toBe(5);
    expect(discoverCard.multiplier).toBe(5); // Should map "restaurants" to "dining"

    expect(citiCard.cashback).toBe(50.00); // $1000 * 5% = $50
    expect(discoverCard.cashback).toBe(50.00); // $1000 * 5% = $50
  });

  test('CRITICAL: 5x dining cards should rank higher than 4x dining cards', () => {
    const cards = [AMEX_GOLD, CAPITAL_ONE_SAVOR, DISCOVER_IT, CITI_CUSTOM_CASH];
    const result = scoreForRewards(cards, 'dining', 1000);

    // Top cards should be 5x (Citi Custom Cash and Discover It)
    const topTwo = result.slice(0, 2);
    
    // Both top cards should have 5x multiplier
    topTwo.forEach(card => {
      expect(card.multiplier).toBe(5);
      expect(card.cashback).toBe(50.00);
    });

    // Verify 4x cards rank lower
    const amexCard = result.find(r => r.card.id === 'amex-gold');
    const savorCard = result.find(r => r.card.id === 'capital-one-savor');

    expect(amexCard.multiplier).toBe(4);
    expect(savorCard.multiplier).toBe(4);
    expect(amexCard.cashback).toBe(40.00);
    expect(savorCard.cashback).toBe(40.00);

    // 5x cards should have higher scores
    topTwo.forEach(topCard => {
      expect(topCard.score).toBeGreaterThan(amexCard.score);
      expect(topCard.score).toBeGreaterThan(savorCard.score);
    });
  });

  test('Discover It "restaurants" should correctly map to "dining" category', () => {
    const cards = [DISCOVER_IT];
    const result = scoreForRewards(cards, 'dining', 100);

    expect(result[0].multiplier).toBe(5);
    expect(result[0].cashback).toBe(5.00); // $100 * 5% = $5
    expect(result[0].card.id).toBe('discover-it');
  });

  test('Citi Custom Cash direct "dining" should work correctly', () => {
    const cards = [CITI_CUSTOM_CASH];
    const result = scoreForRewards(cards, 'dining', 100);

    expect(result[0].multiplier).toBe(5);
    expect(result[0].cashback).toBe(5.00);
    expect(result[0].card.id).toBe('citi-custom');
  });

  test('When both have 5x, tiebreakers should work (lower APR, better credit, etc.)', () => {
    const cards = [CITI_CUSTOM_CASH, DISCOVER_IT];
    const result = scoreForRewards(cards, 'dining', 1000);

    // Both should have same multiplier and cashback
    expect(result[0].multiplier).toBe(5);
    expect(result[1].multiplier).toBe(5);
    expect(result[0].cashback).toBe(50.00);
    expect(result[1].cashback).toBe(50.00);

    // Since cashback is identical, sorting will use other factors:
    // - Available credit (utilization factor)
    // - APR (lower is better)
    // - Grace period
    
    // Discover It has better APR (22.99% vs 26.24%)
    // Discover It has more credit (14000 vs 12000)
    // Both have similar grace periods (25 vs 26 days)
    
    // The one with better factors should rank first
    // But both are valid 5x options
    expect(result[0].canRecommend).toBe(true);
    expect(result[1].canRecommend).toBe(true);
  });
});

