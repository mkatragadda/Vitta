/**
 * Test Home Improvement Recommendations
 * Verify category extraction and reward multiplier matching
 */

import { scoreForRewards } from '../../services/recommendations/recommendationStrategies';

// Cards from TEST_DATA_REWARDS_OPTIMIZER_COMPREHENSIVE.sql
const CARD_HOME_5X = {
  id: 'us-bank-home',
  nickname: 'US Bank Home',
  card_name: 'Cash Plus Home Improvement',
  current_balance: 0,
  credit_limit: 15000,
  apr: 25.99,
  statement_close_day: 10,
  payment_due_day: 5,
  grace_period_days: 24,
  reward_structure: {
    home_improvement: 5,  // 5x home improvement
    utilities: 5,
    streaming: 5,
    default: 1
  }
};

const CARD_HOME_DEPOT_5X = {
  id: 'home-depot',
  nickname: 'Home Depot',
  card_name: 'Home Depot Card',
  current_balance: 0,
  credit_limit: 12000,
  apr: 26.99,
  statement_close_day: 8,
  payment_due_day: 3,
  grace_period_days: 23,
  reward_structure: {
    home_improvement: 5,  // 5x home improvement
    default: 1
  }
};

const CARD_LOWES_5X = {
  id: 'lowes',
  nickname: 'Lowes Card',
  card_name: 'Lowes Card',
  current_balance: 0,
  credit_limit: 11000,
  apr: 25.99,
  statement_close_day: 18,
  payment_due_day: 13,
  grace_period_days: 22,
  reward_structure: {
    home_improvement: 5,  // 5x home improvement
    default: 1
  }
};

const CARD_DEFAULT_2X = {
  id: 'citi-double',
  nickname: 'Citi Double Cash',
  card_name: 'Double Cash',
  current_balance: 0,
  credit_limit: 20000,
  apr: 27.99,
  statement_close_day: 1,
  payment_due_day: 28,
  grace_period_days: 23,
  reward_structure: {
    default: 2  // Only 2x default, no home_improvement
  }
};

describe('Home Improvement Recommendations', () => {
  test('CRITICAL: "home_improvement" category correctly finds 5x multiplier', () => {
    const cards = [CARD_HOME_5X, CARD_DEFAULT_2X];
    const result = scoreForRewards(cards, 'home_improvement', 1000);

    // 5x home improvement card should rank first
    expect(result[0].card.id).toBe('us-bank-home');
    expect(result[0].multiplier).toBe(5);
    expect(result[0].cashback).toBe(50.00); // $1000 * 5% = $50
    expect(result[0].score).toBe(50.00);

    // 2x default card should rank second
    expect(result[1].card.id).toBe('citi-double');
    expect(result[1].multiplier).toBe(2); // Falls back to default: 2
    expect(result[1].cashback).toBe(20.00); // $1000 * 2% = $20
    expect(result[1].score).toBe(20.00);
  });

  test('CRITICAL: All 5x home improvement cards rank higher than 2x default', () => {
    const cards = [CARD_DEFAULT_2X, CARD_LOWES_5X, CARD_HOME_DEPOT_5X, CARD_HOME_5X];
    const result = scoreForRewards(cards, 'home_improvement', 1000);

    // All 5x cards should rank before 2x default card
    const topThree = result.slice(0, 3);
    
    topThree.forEach(card => {
      expect(card.multiplier).toBe(5);
      expect(card.cashback).toBe(50.00);
    });

    // 2x default card should rank last
    const defaultCard = result.find(r => r.card.id === 'citi-double');
    expect(defaultCard.multiplier).toBe(2);
    expect(defaultCard.cashback).toBe(20.00);
    
    // Verify 5x cards have higher scores
    topThree.forEach(topCard => {
      expect(topCard.score).toBeGreaterThan(defaultCard.score);
    });
  });

  test('"hardware" alias correctly maps to home_improvement category', () => {
    const cards = [CARD_HOME_5X, CARD_DEFAULT_2X];
    const result = scoreForRewards(cards, 'hardware', 100);

    // Should use home_improvement multiplier via alias
    expect(result[0].card.id).toBe('us-bank-home');
    expect(result[0].multiplier).toBe(5);
    expect(result[0].cashback).toBe(5.00); // $100 * 5% = $5
  });

  test('Cards with 0 balance can be recommended for home_improvement', () => {
    const cards = [CARD_HOME_5X];
    const result = scoreForRewards(cards, 'home_improvement', 1000);

    expect(result[0].canRecommend).toBe(true);
    expect(result[0].hasGracePeriod).toBe(true);
    expect(result[0].multiplier).toBe(5);
  });

  test('CRITICAL: "home improvement" (with space) correctly maps to "home_improvement" multiplier', () => {
    // Test normalization: spaces should be converted to underscores
    const cards = [CARD_HOME_5X, CARD_DEFAULT_2X];
    const result = scoreForRewards(cards, 'home improvement', 1000);

    // Should use home_improvement multiplier via normalization
    expect(result[0].card.id).toBe('us-bank-home');
    expect(result[0].multiplier).toBe(5);
    expect(result[0].cashback).toBe(50.00);
  });
});

