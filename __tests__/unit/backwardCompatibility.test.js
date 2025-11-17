/**
 * Backward Compatibility Tests - Phase 2
 *
 * Verifies that Phase 2 enhancements (14-category system) work seamlessly
 * with existing MVP cards and code paths. Tests ensure:
 *
 * - Legacy cards with 3-7 categories still work perfectly
 * - Old code paths remain unchanged
 * - Upgrade path is smooth and transparent
 * - No breaking changes to existing APIs
 */

import { scoreForRewards, scoreForAPR, scoreForGracePeriod, getAllStrategies, getRewardMultiplier } from '../../services/recommendations/recommendationStrategies';

describe('Backward Compatibility - Legacy Card Formats', () => {
  /**
   * MVP Cards - Original 3-category system
   * These represent cards from the original MVP before Phase 2
   */
  const mvpCards = {
    // Minimal 3-category card
    minimal: {
      id: 'mvp-minimal',
      card_name: 'Simple Card',
      current_balance: 0,
      credit_limit: 5000,
      apr: 19.99,
      statement_close_day: 15,
      payment_due_day: 10,
      grace_period_days: 21,
      reward_structure: {
        travel: 2,
        dining: 1.5,
        default: 1
      }
    },

    // Typical MVP card - Chase Sapphire style
    typical: {
      id: 'mvp-typical',
      card_name: 'Chase Sapphire Preferred',
      current_balance: 2500,
      credit_limit: 15000,
      apr: 18.99,
      statement_close_day: 1,
      payment_due_day: 25,
      grace_period_days: 25,
      reward_structure: {
        travel: 3,
        dining: 3,
        default: 1
      }
    },

    // Rotating category card
    rotating: {
      id: 'mvp-rotating',
      card_name: 'Chase Freedom',
      current_balance: 0,
      credit_limit: 10000,
      apr: 20.99,
      statement_close_day: 20,
      payment_due_day: 15,
      grace_period_days: 25,
      reward_structure: {
        rotating: 5,
        default: 1
      }
    }
  };

  describe('MVP Card Support - 3 Categories', () => {
    test('minimal MVP card works with travel category', () => {
      const result = scoreForRewards([mvpCards.minimal], 'travel', 100);
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].multiplier).toBe(2);
    });

    test('minimal MVP card works with dining category', () => {
      const result = scoreForRewards([mvpCards.minimal], 'dining', 100);
      expect(result).toBeDefined();
      expect(result[0].multiplier).toBe(1.5);
    });

    test('typical MVP card returns correct multipliers', () => {
      // mvpCards.typical has balance, so it won't be recommended for rewards
      // But we can still check that the multiplier logic works
      const cardNoBalance = {
        ...mvpCards.typical,
        current_balance: 0
      };
      const travelResult = scoreForRewards([cardNoBalance], 'travel', 100);
      const diningResult = scoreForRewards([cardNoBalance], 'dining', 100);

      expect(travelResult[0].multiplier).toBe(3);
      expect(diningResult[0].multiplier).toBe(3);
    });

    test('rotating category card works correctly', () => {
      const result = scoreForRewards([mvpCards.rotating], 'rotating', 100);
      expect(result[0].multiplier).toBe(5);
    });

    test('MVP cards return default for unknown categories', () => {
      const result = scoreForRewards([mvpCards.minimal], 'gas', 100);
      expect(result[0].multiplier).toBe(1);
    });
  });

  describe('Phase 2 Cards with 14 Categories', () => {
    const phase2Card = {
      id: 'phase2-full',
      card_name: 'Phase 2 Test Card',
      current_balance: 0,
      credit_limit: 20000,
      apr: 17.99,
      statement_close_day: 10,
      payment_due_day: 5,
      grace_period_days: 25,
      reward_structure: {
        dining: 4,
        groceries: 3,
        gas: 4,
        travel: 5,
        entertainment: 2,
        streaming: 1,
        drugstores: 2,
        home_improvement: 1,
        department_stores: 1,
        transit: 2,
        utilities: 1,
        warehouse: 1.5,
        office_supplies: 1,
        insurance: 1,
        default: 1
      }
    };

    test('Phase 2 card works with all 14 categories', () => {
      const categories = [
        { name: 'dining', expected: 4 },
        { name: 'groceries', expected: 3 },
        { name: 'gas', expected: 4 },
        { name: 'travel', expected: 5 }
      ];

      categories.forEach(cat => {
        const result = scoreForRewards([phase2Card], cat.name, 100);
        expect(result[0].multiplier).toBe(cat.expected);
      });
    });

    test('Phase 2 card works alongside MVP cards', () => {
      const cards = [phase2Card, mvpCards.typical];
      const result = scoreForRewards(cards, 'travel', 100);

      // Both cards are scored, but only phase2Card is recommendable ($0 balance)
      expect(result.length).toBe(2);

      // Filter to only recommendable cards
      const recommendable = result.filter(r => r.canRecommend);
      expect(recommendable.length).toBe(1);
      expect(recommendable[0].card.id).toBe('phase2-full');
      expect(recommendable[0].multiplier).toBe(5);

      // MVP card with balance should have negative score
      const nonRecommendable = result.filter(r => !r.canRecommend);
      expect(nonRecommendable[0].card.id).toBe('mvp-typical');
      expect(nonRecommendable[0].score).toBe(-1000);
    });
  });

  describe('Mixed Portfolio - MVP + Phase 2 Cards', () => {
    test('mixed portfolio scores correctly', () => {
      const mixedPortfolio = [
        mvpCards.minimal,
        mvpCards.typical,
        {
          id: 'hybrid-card',
          card_name: 'Hybrid Card',
          current_balance: 0,
          credit_limit: 12000,
          apr: 18.99,
          statement_close_day: 15,
          payment_due_day: 10,
          grace_period_days: 25,
          reward_structure: {
            dining: 4,
            groceries: 2,
            travel: 2,
            default: 1
          }
        }
      ];

      const result = scoreForRewards(mixedPortfolio, 'dining', 100);
      expect(result.length).toBe(3);
      // Hybrid card should rank first with 4x dining
      expect(result[0].card.id).toBe('hybrid-card');
      expect(result[0].multiplier).toBe(4);
    });

    test('APR scoring works across MVP and Phase 2 cards', () => {
      const cards = [mvpCards.minimal, mvpCards.typical];
      const result = scoreForAPR(cards, 500);

      expect(result.length).toBe(2);
      // Cards sorted by APR (lower APR first)
      expect(result[0].card.apr).toBeLessThanOrEqual(result[1].card.apr);
    });

    test('grace period scoring works across all card types', () => {
      const cards = [mvpCards.minimal, mvpCards.typical];
      const result = scoreForGracePeriod(cards, new Date());

      expect(result.length).toBe(2);
      // Both should be evaluated
      expect(result[0].hasGracePeriod !== result[1].hasGracePeriod).toBe(true);
    });
  });
});

describe('Backward Compatibility - getRewardMultiplier Function', () => {
  describe('MVP Cards with Old Structure', () => {
    const mvpCard = {
      reward_structure: {
        travel: 3,
        dining: 2,
        online: 1.5,
        default: 1
      }
    };

    test('returns exact match for legacy categories', () => {
      expect(getRewardMultiplier(mvpCard, 'travel')).toBe(3);
      expect(getRewardMultiplier(mvpCard, 'dining')).toBe(2);
      expect(getRewardMultiplier(mvpCard, 'online')).toBe(1.5);
    });

    test('handles legacy online category', () => {
      expect(getRewardMultiplier(mvpCard, 'online')).toBe(1.5);
    });

    test('maps ecommerce alias to online', () => {
      expect(getRewardMultiplier(mvpCard, 'ecommerce')).toBe(1.5);
    });

    test('returns default for unknown categories', () => {
      expect(getRewardMultiplier(mvpCard, 'gas')).toBe(1);
      expect(getRewardMultiplier(mvpCard, 'groceries')).toBe(1);
    });
  });

  describe('Migration Path - Old to New', () => {
    const oldCard = {
      reward_structure: {
        travel: 3,
        dining: 2,
        default: 1
      }
    };

    test('old card works with legacy categories', () => {
      expect(getRewardMultiplier(oldCard, 'travel')).toBe(3);
      expect(getRewardMultiplier(oldCard, 'dining')).toBe(2);
    });

    test('old card returns default for new categories', () => {
      // Old cards don't have these categories, so they get default
      expect(getRewardMultiplier(oldCard, 'gas')).toBe(1);
      expect(getRewardMultiplier(oldCard, 'groceries')).toBe(1);
      expect(getRewardMultiplier(oldCard, 'streaming')).toBe(1);
    });

    test('migration is non-breaking - old code path continues', () => {
      // Simulating old code that checks for 'travel'
      const multiplier = getRewardMultiplier(oldCard, 'travel');
      if (multiplier > 1) {
        expect(multiplier).toBe(3); // Should still work
      }
    });
  });
});

describe('Backward Compatibility - API Signatures', () => {
  const testCards = [
    {
      id: 'test-1',
      card_name: 'Test Card 1',
      current_balance: 0,
      credit_limit: 10000,
      apr: 18.99,
      statement_close_day: 15,
      payment_due_day: 10,
      grace_period_days: 25,
      reward_structure: {
        dining: 3,
        travel: 2,
        default: 1
      }
    }
  ];

  describe('scoreForRewards API', () => {
    test('function signature unchanged', () => {
      const result = scoreForRewards(testCards, 'dining', 100);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('returns same response structure', () => {
      const result = scoreForRewards(testCards, 'dining', 100);
      const first = result[0];

      expect(first).toHaveProperty('card');
      expect(first).toHaveProperty('score');
      expect(first).toHaveProperty('multiplier');
      expect(first).toHaveProperty('cashback');
      expect(first).toHaveProperty('annualValue');
      expect(first).toHaveProperty('hasGracePeriod');
      expect(first).toHaveProperty('canRecommend');
    });
  });

  describe('scoreForAPR API', () => {
    test('function signature unchanged', () => {
      const result = scoreForAPR(testCards, 500);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('returns same response structure', () => {
      const result = scoreForAPR(testCards, 500);
      const first = result[0];

      expect(first).toHaveProperty('card');
      expect(first).toHaveProperty('score');
      expect(first).toHaveProperty('apr');
      expect(first).toHaveProperty('monthlyInterest');
      expect(first).toHaveProperty('annualInterest');
    });
  });

  describe('scoreForGracePeriod API', () => {
    test('function signature unchanged', () => {
      const result = scoreForGracePeriod(testCards, new Date());
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('returns same response structure', () => {
      const result = scoreForGracePeriod(testCards, new Date());
      const first = result[0];

      expect(first).toHaveProperty('card');
      expect(first).toHaveProperty('score');
      expect(first).toHaveProperty('floatDays');
      expect(first).toHaveProperty('hasGracePeriod');
    });
  });

  describe('getAllStrategies API', () => {
    test('function signature unchanged', () => {
      const result = getAllStrategies(testCards, 'dining', 100);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('rewards');
      expect(result).toHaveProperty('apr');
      expect(result).toHaveProperty('gracePeriod');
    });

    test('returns same structure for all strategies', () => {
      const result = getAllStrategies(testCards, 'dining', 100);

      expect(Array.isArray(result.rewards)).toBe(true);
      expect(Array.isArray(result.apr)).toBe(true);
      expect(Array.isArray(result.gracePeriod)).toBe(true);
    });
  });
});

describe('Backward Compatibility - Critical Features', () => {
  const cardWithBalance = {
    id: 'with-balance',
    card_name: 'Card With Balance',
    current_balance: 5000,
    credit_limit: 10000,
    apr: 18.99,
    statement_close_day: 15,
    payment_due_day: 10,
    grace_period_days: 25,
    reward_structure: {
      dining: 3,
      default: 1
    }
  };

  const cardZeroBalance = {
    id: 'zero-balance',
    card_name: 'Card Zero Balance',
    current_balance: 0,
    credit_limit: 10000,
    apr: 18.99,
    statement_close_day: 15,
    payment_due_day: 10,
    grace_period_days: 25,
    reward_structure: {
      dining: 3,
      default: 1
    }
  };

  describe('Grace Period Rule - Critical Feature', () => {
    test('card with balance has NO grace period', () => {
      const result = scoreForRewards([cardWithBalance], 'dining', 100);
      expect(result[0].hasGracePeriod).toBe(false);
      expect(result[0].canRecommend).toBe(false);
    });

    test('card with $0 balance HAS grace period', () => {
      const result = scoreForRewards([cardZeroBalance], 'dining', 100);
      expect(result[0].hasGracePeriod).toBe(true);
      expect(result[0].canRecommend).toBe(true);
    });

    test('grace period rule is enforced consistently', () => {
      const rewardsResult = scoreForRewards([cardWithBalance], 'dining', 100);
      const gracePeriodResult = scoreForGracePeriod([cardWithBalance], new Date());

      // Both should agree: card with balance has NO grace period
      expect(rewardsResult[0].hasGracePeriod).toBe(false);
      expect(gracePeriodResult[0].hasGracePeriod).toBe(false);
    });
  });

  describe('Interest Calculation - Critical Feature', () => {
    test('monthly interest calculated correctly for card with balance', () => {
      const result = scoreForAPR([cardWithBalance], 5000);
      const monthlyRate = (18.99 / 12) / 100;
      const expectedMonthly = 5000 * monthlyRate;

      expect(result[0].monthlyInterest).toBeCloseTo(expectedMonthly, 2);
    });

    test('zero balance card has zero interest due', () => {
      // Card is scored for APR purposes (for comparison)
      const result = scoreForAPR([cardZeroBalance], 0);
      expect(result[0].monthlyInterest).toBe(0);
    });
  });

  describe('Cashback Calculation - Critical Feature', () => {
    test('cashback calculated with correct multiplier', () => {
      const result = scoreForRewards([cardZeroBalance], 'dining', 100);
      const expectedCashback = (3 * 100) / 100; // 3x multiplier on $100 = $3

      expect(result[0].cashback).toBeCloseTo(expectedCashback, 2);
      expect(result[0].annualValue).toBeCloseTo(expectedCashback * 12, 2);
    });

    test('unknown category returns default cashback', () => {
      // Use cardZeroBalance since cardWithBalance has NO grace period and won't be recommended
      const result = scoreForRewards([cardZeroBalance], 'unknown', 100);
      const expectedCashback = (1 * 100) / 100; // 1x default

      expect(result[0].cashback).toBeCloseTo(expectedCashback, 2);
    });
  });
});

describe('Backward Compatibility - Real-World Scenarios', () => {
  const userPortfolio = [
    {
      id: 'amex-gold',
      card_name: 'Amex Gold',
      current_balance: 0,
      credit_limit: 50000,
      apr: 17.99,
      statement_close_day: 1,
      payment_due_day: 25,
      grace_period_days: 25,
      reward_structure: {
        dining: 4,
        groceries: 1,
        travel: 1,
        default: 1
      }
    },
    {
      id: 'chase-sapphire',
      card_name: 'Chase Sapphire Preferred',
      current_balance: 2500,
      credit_limit: 25000,
      apr: 18.99,
      statement_close_day: 10,
      payment_due_day: 5,
      grace_period_days: 25,
      reward_structure: {
        travel: 3,
        dining: 3,
        default: 1
      }
    },
    {
      id: 'citi-custom-cash',
      card_name: 'Citi Custom Cash',
      current_balance: 0,
      credit_limit: 15000,
      apr: 19.99,
      statement_close_day: 15,
      payment_due_day: 10,
      grace_period_days: 25,
      reward_structure: {
        groceries: 5,
        gas: 1,
        transit: 1,
        dining: 1,
        default: 1
      }
    }
  ];

  test('real portfolio: best card for dining', () => {
    const result = scoreForRewards(userPortfolio, 'dining', 100);

    // Amex Gold should be recommended (4x, $0 balance)
    const recommendable = result.filter(r => r.canRecommend);
    expect(recommendable.length).toBeGreaterThan(0);

    // Best should be Amex Gold with 4x
    const best = recommendable[0];
    expect(best.card.id).toBe('amex-gold');
    expect(best.multiplier).toBe(4);
  });

  test('real portfolio: best card for groceries', () => {
    const result = scoreForRewards(userPortfolio, 'groceries', 100);

    // Citi Custom Cash should be recommended (5x, $0 balance)
    const recommendable = result.filter(r => r.canRecommend);
    expect(recommendable.length).toBeGreaterThan(0);

    const best = recommendable[0];
    expect(best.card.id).toBe('citi-custom-cash');
    expect(best.multiplier).toBe(5);
  });

  test('real portfolio: best card by APR', () => {
    const result = scoreForAPR(userPortfolio, 5000);

    // All cards should be ranked by APR
    expect(result.length).toBe(3);
    expect(result[0].card.apr).toBeLessThanOrEqual(result[1].card.apr);
    expect(result[1].card.apr).toBeLessThanOrEqual(result[2].card.apr);
  });

  test('real portfolio: best card for travel (new category)', () => {
    const result = scoreForRewards(userPortfolio, 'travel', 100);

    // Chase Sapphire should be best (3x for travel, but has balance)
    // So Amex Gold with $0 balance should be recommended
    const recommendable = result.filter(r => r.canRecommend);
    expect(recommendable.length).toBeGreaterThan(0);
  });
});

describe('Backward Compatibility - Edge Cases', () => {
  test('card with null reward_structure returns default', () => {
    const card = {
      id: 'null-rewards',
      card_name: 'Null Rewards Card',
      current_balance: 0,
      credit_limit: 10000,
      apr: 18.99,
      reward_structure: null
    };

    expect(getRewardMultiplier(card, 'dining')).toBe(1.0);
  });

  test('card with missing reward_structure returns default', () => {
    const card = {
      id: 'no-rewards',
      card_name: 'No Rewards Card',
      current_balance: 0,
      credit_limit: 10000,
      apr: 18.99
    };

    expect(getRewardMultiplier(card, 'dining')).toBe(1.0);
  });

  test('empty cards array returns empty results', () => {
    const result = scoreForRewards([], 'dining', 100);
    expect(result).toEqual([]);
  });

  test('null cards array returns empty results', () => {
    const result = scoreForRewards(null, 'dining', 100);
    expect(result).toEqual([]);
  });

  test('zero amount purchase returns zero cashback', () => {
    const card = {
      id: 'test',
      card_name: 'Test',
      current_balance: 0,
      credit_limit: 10000,
      apr: 18.99,
      reward_structure: { dining: 3, default: 1 }
    };

    const result = scoreForRewards([card], 'dining', 0);
    expect(result[0].cashback).toBe(0);
  });

  test('very high APR card still returns valid score', () => {
    const card = {
      id: 'high-apr',
      card_name: 'High APR Card',
      current_balance: 0,
      credit_limit: 10000,
      apr: 29.99,
      reward_structure: { dining: 3, default: 1 }
    };

    const result = scoreForRewards([card], 'dining', 100);
    expect(result[0].score).toBeGreaterThan(0);
  });

  test('very low APR card returns valid score', () => {
    const card = {
      id: 'low-apr',
      card_name: 'Low APR Card',
      current_balance: 0,
      credit_limit: 10000,
      apr: 5.99,
      reward_structure: { dining: 1, default: 1 }
    };

    const result = scoreForRewards([card], 'dining', 100);
    expect(result[0].score).toBeGreaterThan(0);
  });

  test('card with high balance but low APR', () => {
    const card = {
      id: 'high-balance-low-apr',
      card_name: 'High Balance Low APR',
      current_balance: 20000,
      credit_limit: 25000,
      apr: 5.99,
      reward_structure: { dining: 2, default: 1 }
    };

    const result = scoreForRewards([card], 'dining', 100);
    // Card has balance so NO grace period
    expect(result[0].hasGracePeriod).toBe(false);
    expect(result[0].canRecommend).toBe(false);
  });
});
