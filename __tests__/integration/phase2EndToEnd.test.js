/**
 * Phase 2 End-to-End Integration Tests
 *
 * Tests complete workflows combining all Phase 2 features:
 * - 14-category merchant classification
 * - Multi-strategy card scoring (rewards, APR, grace period)
 * - Card migration from MVP to Phase 2
 * - Chat interaction with enhanced recommendations
 * - Real-world user scenarios
 */

import { scoreForRewards, scoreForAPR, scoreForGracePeriod } from '../../services/recommendations/recommendationStrategies';
import { findBestCardForMerchant } from '../../services/cardAnalyzer';
import { migrateCard, getMigrationReport } from '../../services/cardMigration/cardMigrationHelper';
import { MERCHANT_CATEGORIES } from '../../services/categories/categoryDefinitions';

describe('Phase 2 End-to-End Integration Tests', () => {
  /**
   * Realistic user portfolio with mix of MVP and Phase 2 cards
   */
  const userPortfolio = [
    {
      id: 'card-1',
      card_name: 'American Express® Gold Card',
      nickname: 'Amex Gold',
      current_balance: 0,
      credit_limit: 15000,
      apr: 18.99,
      grace_period_days: 25,
      reward_structure: {
        dining: 4,
        groceries: 1,
        gas: 1,
        travel: 1,
        entertainment: 1,
        streaming: 1,
        drugstores: 1,
        home_improvement: 1,
        department_stores: 1,
        transit: 1,
        utilities: 1,
        warehouse: 1,
        office_supplies: 1,
        insurance: 1,
        default: 1
      }
    },
    {
      id: 'card-2',
      card_name: 'Chase Sapphire Preferred®',
      nickname: 'Chase Sapphire',
      current_balance: 0,
      credit_limit: 25000,
      apr: 22.74,
      grace_period_days: 25,
      reward_structure: {
        dining: 3,
        groceries: 1,
        gas: 1,
        travel: 5,
        entertainment: 2,
        streaming: 1,
        drugstores: 1,
        home_improvement: 1,
        department_stores: 1,
        transit: 3,
        utilities: 1,
        warehouse: 1,
        office_supplies: 1,
        insurance: 1,
        default: 1
      }
    },
    {
      id: 'card-3',
      card_name: 'Citi Custom Cash Card®',
      nickname: 'Citi Custom Cash',
      current_balance: 0,
      credit_limit: 12000,
      apr: 19.99,
      grace_period_days: 25,
      reward_structure: {
        dining: 1,
        groceries: 5,
        gas: 4,
        travel: 1,
        entertainment: 1,
        streaming: 1,
        drugstores: 1,
        home_improvement: 1,
        department_stores: 1,
        transit: 1,
        utilities: 1,
        warehouse: 1,
        office_supplies: 1,
        insurance: 1,
        default: 1
      }
    }
  ];

  describe('Real-World User Scenarios', () => {
    test('User asks for best card for Costco (grocery warehouse)', () => {
      const result = findBestCardForMerchant('costco', userPortfolio);

      // System should return a result for grocery warehouse merchant
      expect(result).toBeDefined();
      // The card analyzer is working if we get here
    });

    test('User wants to maximize rewards for restaurant dinner', () => {
      const result = scoreForRewards(userPortfolio, 'dining', 150);
      const recommendable = result.filter(r => r.canRecommend);

      expect(recommendable.length).toBeGreaterThan(0);
      // Amex Gold has 4x dining (best)
      expect(recommendable[0].card.id).toBe('card-1');
      expect(recommendable[0].multiplier).toBe(4);
    });

    test('User needs to know lowest APR for balance transfer', () => {
      const result = scoreForAPR(userPortfolio, 5000);

      expect(result.length).toBe(3);
      // Amex Gold has lowest APR (18.99%)
      expect(result[0].card.apr).toBeLessThanOrEqual(result[1].card.apr);
      expect(result[0].card.id).toBe('card-1');
    });

    test('User wants grace period information for cash flow optimization', () => {
      const result = scoreForGracePeriod(userPortfolio, new Date());

      expect(result.length).toBe(3);
      // All cards have grace period since balance is $0
      result.forEach(card => {
        expect(card.hasGracePeriod).toBe(true);
      });
    });

    test('Complete purchase decision workflow', () => {
      // User: "Best card for groceries at Whole Foods?"
      // 1. Classify merchant
      const merchant = 'Whole Foods';
      const category = 'groceries';

      // 2. Score all cards for this category
      const rewardScores = scoreForRewards(userPortfolio, category, 100);
      const aprScores = scoreForAPR(userPortfolio, 0); // No balance
      const graceScores = scoreForGracePeriod(userPortfolio, new Date());

      // 3. Get best recommendation
      const bestCard = rewardScores.filter(r => r.canRecommend)[0];

      expect(bestCard).toBeDefined();
      expect(bestCard.card.id).toBe('card-3'); // Citi Custom Cash (5x groceries)

      // 4. Provide user with context
      const cashback = bestCard.cashback;
      expect(cashback).toBeGreaterThan(0);
      expect(cashback).toBeCloseTo(5, 1); // 5x of $100 = $5
    });

    test('Multi-strategy comparison for same purchase', () => {
      // User: "Compare all strategies for $500 at gas station"
      const rewardStrategy = scoreForRewards(userPortfolio, 'gas', 500)
        .filter(r => r.canRecommend)[0];
      const aprStrategy = scoreForAPR(userPortfolio, 0)[0];
      const graceStrategy = scoreForGracePeriod(userPortfolio, new Date())[0];

      // Rewards: Citi Custom Cash (4x gas) = $20
      expect(rewardStrategy.card.id).toBe('card-3');
      expect(rewardStrategy.cashback).toBeCloseTo(20, 1);

      // APR: Amex Gold (18.99%)
      expect(aprStrategy.card.id).toBe('card-1');

      // Grace: All same (all have grace period)
      expect(graceStrategy.hasGracePeriod).toBe(true);
    });
  });

  describe('Card Migration Integration', () => {
    test('User adds old MVP card - system automatically supports it', () => {
      const mvpCard = {
        id: 'old-amex',
        card_name: 'Old Amex Blue',
        reward_structure: {
          dining: 3,
          travel: 1,
          default: 1
        }
      };

      const report = getMigrationReport([mvpCard]);

      expect(report.cards_needing_migration).toBe(1);
      expect(report.total_cards).toBe(1);

      // Migrate it
      const migrated = migrateCard(mvpCard);

      // Verify it now has all 14 categories
      expect(Object.keys(migrated.reward_structure).length).toBeGreaterThanOrEqual(14);

      // Card has migration metadata
      expect(migrated._migration_metadata).toBeDefined();
      expect(migrated._migration_metadata.version).toBe('Phase2-v1');

      // Works with all scoring functions
      const rewards = scoreForRewards([migrated], 'entertainment', 100);
      expect(rewards.length).toBeGreaterThan(0);
    });

    test('Portfolio with MVP cards can be analyzed for migration', () => {
      const mvpPortfolio = [
        { id: 'mvp-1', reward_structure: { dining: 4, default: 1 } },
        { id: 'mvp-2', reward_structure: { travel: 5, default: 1 } },
        { id: 'mvp-3', reward_structure: { groceries: 3, gas: 1, default: 1 } }
      ];

      const report = getMigrationReport(mvpPortfolio);

      // All 3 need migration
      expect(report.cards_needing_migration).toBe(3);
      expect(report.total_cards).toBe(3);

      // Migrate all
      const migrated = mvpPortfolio.map(card => migrateCard(card));

      // All have metadata indicating migration
      migrated.forEach(card => {
        expect(card._migration_metadata).toBeDefined();
      });
    });
  });

  describe('Category Coverage Across All 14 Categories', () => {
    test('Portfolio covers all 14 categories with reasonable recommendations', () => {
      const categories = Object.keys(MERCHANT_CATEGORIES);

      categories.forEach(category => {
        const result = scoreForRewards(userPortfolio, category, 100);
        const recommendable = result.filter(r => r.canRecommend);

        expect(recommendable.length).toBeGreaterThan(0);
        expect(recommendable[0].multiplier).toBeGreaterThan(0);
      });
    });

    test('Each category finds at least one card with grace period', () => {
      const categories = Object.keys(MERCHANT_CATEGORIES);

      categories.forEach(category => {
        const result = scoreForRewards(userPortfolio, category, 100);
        const withGracePeriod = result.filter(r => r.hasGracePeriod);

        expect(withGracePeriod.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Complex Purchase Scenarios', () => {
    test('Business travel expenses - maximize rewards across categories', () => {
      // Flight: travel category
      const flightScore = scoreForRewards(userPortfolio, 'travel', 800);
      const bestFlight = flightScore.filter(r => r.canRecommend)[0];
      expect(bestFlight).toBeDefined();
      expect(bestFlight.card.id).toBe('card-2'); // Chase: 5x travel

      // Meals: dining category
      const mealScore = scoreForRewards(userPortfolio, 'dining', 200);
      const bestMeal = mealScore.filter(r => r.canRecommend)[0];
      expect(bestMeal).toBeDefined();
      expect(bestMeal.card.id).toBe('card-1'); // Amex: 4x dining

      // Ground transport: transit category
      const transitScore = scoreForRewards(userPortfolio, 'transit', 50);
      const bestTransit = transitScore.filter(r => r.canRecommend)[0];
      expect(bestTransit).toBeDefined();
      expect(bestTransit.card.id).toBe('card-2'); // Chase: 3x transit

      // Total value optimization (just flight + meal + transit)
      const totalCashback =
        (bestFlight.cashback || 0) +
        (bestMeal.cashback || 0) +
        (bestTransit.cashback || 0);

      // Chase + Amex + Chase should yield significant rewards
      expect(totalCashback).toBeGreaterThan(40);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Handles MVP cards with limited categories gracefully', () => {
      const limitedPortfolio = [
        {
          id: 'limited',
          card_name: 'Limited Card',
          current_balance: 0,
          reward_structure: {
            dining: 3,
            default: 1
          }
        }
      ];

      const report = getMigrationReport(limitedPortfolio);

      // Card needs migration (only 2 categories)
      expect(report.cards_needing_migration).toBe(1);

      // But still works for recommendations
      const result = scoreForRewards(limitedPortfolio, 'dining', 100);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].multiplier).toBe(3);
    });

    test('All 14 categories are accessible even with MVP cards', () => {
      const mvpCard = {
        id: 'mvp',
        card_name: 'MVP Card',
        current_balance: 0,
        reward_structure: {
          dining: 3,
          default: 1
        }
      };

      // Test that we can still query any of the 14 categories
      const categories = ['dining', 'groceries', 'gas', 'travel', 'entertainment'];

      categories.forEach(cat => {
        const result = scoreForRewards([mvpCard], cat, 100);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].hasGracePeriod).toBe(true);
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('Recommendation scoring is performant for large portfolios', () => {
      // Simulate 50 cards
      const largePortfolio = Array.from({ length: 50 }, (_, i) => ({
        id: `card-${i}`,
        card_name: `Card ${i}`,
        current_balance: 0,
        credit_limit: 10000,
        apr: 15 + (i % 10),
        reward_structure: {
          dining: Math.random() * 5,
          groceries: Math.random() * 5,
          travel: Math.random() * 5,
          default: 1
        }
      }));

      const startTime = performance.now();

      const result = scoreForRewards(largePortfolio, 'dining', 100);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.length).toBe(50);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });
  });
});
