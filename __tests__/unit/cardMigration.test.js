/**
 * Card Migration Helper Tests - Phase 2
 *
 * Tests the migration of cards from old MVP structure to new Phase 2 structure
 */

import {
  needsMigration,
  migrateCard,
  migrateCards,
  getMigrationReport,
  validateMigratedCard,
  getMigrationSummary,
  CATEGORY_MIGRATION_MAP,
  MIGRATION_STRATEGY
} from '../../services/cardMigration/cardMigrationHelper';

describe('Card Migration Helper - Phase 2', () => {
  describe('needsMigration - Detection Logic', () => {
    test('detects MVP 3-category card needs migration', () => {
      const mvpCard = {
        id: 'mvp-1',
        card_name: 'Old Card',
        reward_structure: {
          dining: 3,
          groceries: 2,
          travel: 1,
          default: 1
        }
      };

      expect(needsMigration(mvpCard)).toBe(true);
    });

    test('detects MVP 5-category card needs migration', () => {
      const mvpCard = {
        id: 'mvp-5',
        card_name: 'Old Card',
        reward_structure: {
          dining: 3,
          groceries: 2,
          gas: 1.5,
          travel: 1,
          online: 1.5,
          default: 1
        }
      };

      expect(needsMigration(mvpCard)).toBe(true);
    });

    test('detects Phase 2 card does NOT need migration', () => {
      const phase2Card = {
        id: 'phase2-1',
        card_name: 'New Card',
        reward_structure: {
          dining: 4,
          groceries: 3,
          travel: 5,
          entertainment: 2,
          streaming: 1,
          drugstores: 1,
          home_improvement: 1,
          department_stores: 1,
          transit: 2,
          utilities: 1,
          warehouse: 1,
          office_supplies: 1,
          insurance: 1,
          gas: 1,
          default: 1
        }
      };

      expect(needsMigration(phase2Card)).toBe(false);
    });

    test('handles null reward_structure gracefully', () => {
      const card = {
        id: 'null-card',
        card_name: 'Null Card',
        reward_structure: null
      };

      expect(needsMigration(card)).toBe(false);
    });

    test('handles missing reward_structure', () => {
      const card = {
        id: 'no-rewards',
        card_name: 'No Rewards Card'
      };

      expect(needsMigration(card)).toBe(false);
    });

    test('handles null card gracefully', () => {
      expect(needsMigration(null)).toBe(false);
    });
  });

  describe('migrateCard - Single Card Migration', () => {
    test('migrates MVP 3-category dining specialist card', () => {
      const oldCard = {
        id: 'mvp-dining',
        card_name: 'Dining Card',
        reward_structure: {
          dining: 4,
          groceries: 1,
          travel: 1,
          default: 1
        }
      };

      const migrated = migrateCard(oldCard);

      // Check new categories are present
      expect(migrated.reward_structure.entertainment).toBeDefined();
      expect(migrated.reward_structure.streaming).toBeDefined();
      expect(migrated.reward_structure.drugstores).toBeDefined();
      expect(migrated.reward_structure.transit).toBeDefined();

      // Check old multipliers are preserved
      expect(migrated.reward_structure.dining).toBe(4);
      expect(migrated.reward_structure.groceries).toBe(1);

      // Check metadata
      expect(migrated._migration_metadata).toBeDefined();
      expect(migrated._migration_metadata.version).toBe('Phase2-v1');
    });

    test('migrates MVP 5-category card with online category', () => {
      const oldCard = {
        id: 'mvp-online',
        card_name: 'Online Card',
        reward_structure: {
          dining: 1,
          groceries: 1,
          gas: 1,
          travel: 1,
          online: 3,
          default: 1
        }
      };

      const migrated = migrateCard(oldCard);

      // online should map to department_stores
      expect(migrated.reward_structure.department_stores).toBe(3);
      expect(migrated.reward_structure.online).toBeUndefined();

      // All Phase 2 categories should exist
      expect(Object.keys(migrated.reward_structure).length).toBeGreaterThanOrEqual(14);
    });

    test('preserves card identity during migration', () => {
      const oldCard = {
        id: 'mvp-123',
        user_id: 'user-456',
        card_name: 'Original Card Name',
        nickname: 'Original Nickname',
        issuer: 'Chase',
        apr: 18.99,
        credit_limit: 10000,
        current_balance: 5000,
        reward_structure: {
          dining: 3,
          default: 1
        }
      };

      const migrated = migrateCard(oldCard);

      // Identity fields should be unchanged
      expect(migrated.id).toBe('mvp-123');
      expect(migrated.user_id).toBe('user-456');
      expect(migrated.card_name).toBe('Original Card Name');
      expect(migrated.nickname).toBe('Original Nickname');
      expect(migrated.issuer).toBe('Chase');
      expect(migrated.apr).toBe(18.99);
      expect(migrated.credit_limit).toBe(10000);
      expect(migrated.current_balance).toBe(5000);
    });

    test('handles card with no reward structure gracefully', () => {
      const card = {
        id: 'no-rewards',
        card_name: 'No Rewards',
        reward_structure: null
      };

      const result = migrateCard(card);
      expect(result).toEqual(card); // Should return unchanged
    });

    test('returns already-migrated card unchanged', () => {
      const migratedCard = {
        id: 'phase2-card',
        card_name: 'Phase 2 Card',
        reward_structure: {
          dining: 4,
          travel: 5,
          entertainment: 2,
          grocery: 3,
          streaming: 1,
          drugstores: 1,
          home_improvement: 1,
          department_stores: 1,
          transit: 2,
          utilities: 1,
          warehouse: 1,
          office_supplies: 1,
          insurance: 1,
          default: 1
        }
      };

      const result = migrateCard(migratedCard);
      expect(result._migration_metadata).toBeUndefined(); // Should not add metadata
      expect(result.reward_structure).toEqual(migratedCard.reward_structure);
    });
  });

  describe('migrateCards - Batch Migration', () => {
    test('migrates multiple cards at once', () => {
      const cards = [
        {
          id: 'card-1',
          card_name: 'Card 1',
          reward_structure: {
            dining: 3,
            default: 1
          }
        },
        {
          id: 'card-2',
          card_name: 'Card 2',
          reward_structure: {
            travel: 5,
            default: 1
          }
        }
      ];

      const migrated = migrateCards(cards);

      expect(migrated.length).toBe(2);
      expect(migrated[0].id).toBe('card-1');
      expect(migrated[1].id).toBe('card-2');
      expect(migrated[0]._migration_metadata).toBeDefined();
      expect(migrated[1]._migration_metadata).toBeDefined();
    });

    test('handles empty array gracefully', () => {
      const result = migrateCards([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('handles non-array input gracefully', () => {
      const result = migrateCards(null);
      expect(result).toEqual(null);
    });
  });

  describe('getMigrationReport - Portfolio Analysis', () => {
    test('generates accurate migration report for mixed portfolio', () => {
      const portfolio = [
        {
          id: 'mvp-1',
          card_name: 'Old Card',
          reward_structure: { dining: 3, default: 1 }
        },
        {
          id: 'phase2-1',
          card_name: 'New Card',
          reward_structure: {
            dining: 4,
            travel: 5,
            groceries: 3,
            entertainment: 2,
            streaming: 1,
            drugstores: 1,
            home_improvement: 1,
            department_stores: 1,
            transit: 1,
            utilities: 1,
            warehouse: 1,
            office_supplies: 1,
            insurance: 1,
            gas: 1,
            default: 1
          }
        },
        {
          id: 'mvp-2',
          card_name: 'Another Old Card',
          reward_structure: { travel: 5, default: 1 }
        }
      ];

      const report = getMigrationReport(portfolio);

      expect(report.total_cards).toBe(3);
      expect(report.cards_needing_migration).toBe(2);
      expect(report.cards_already_migrated).toBe(1);
      expect(report.migration_rate).toBe('33.3');
      expect(report.details.length).toBe(3);
    });

    test('correctly counts category counts in report', () => {
      const portfolio = [
        {
          id: 'card-1',
          card_name: 'MVP Card',
          reward_structure: {
            dining: 3,
            groceries: 2,
            gas: 1,
            default: 1
          }
        }
      ];

      const report = getMigrationReport(portfolio);
      const cardDetail = report.details[0];

      expect(cardDetail.category_count).toBe(4);
      expect(cardDetail.categories).toContain('dining');
      expect(cardDetail.categories).toContain('default');
    });

    test('handles null portfolio gracefully', () => {
      const report = getMigrationReport(null);

      expect(report.total_cards).toBe(0);
      expect(report.cards_needing_migration).toBe(0);
      expect(report.cards_already_migrated).toBe(0);
    });

    test('handles empty portfolio', () => {
      const report = getMigrationReport([]);

      expect(report.total_cards).toBe(0);
      expect(report.cards_needing_migration).toBe(0);
      expect(report.cards_already_migrated).toBe(0);
      expect(report.details.length).toBe(0);
    });
  });

  describe('validateMigratedCard - Validation Logic', () => {
    test('validates correct Phase 2 card structure', () => {
      const validCard = {
        id: 'valid',
        card_name: 'Valid Card',
        reward_structure: {
          dining: 4,
          groceries: 3,
          gas: 1,
          travel: 5,
          entertainment: 2,
          streaming: 1,
          drugstores: 1,
          home_improvement: 1,
          department_stores: 1,
          transit: 2,
          utilities: 1,
          warehouse: 1,
          office_supplies: 1,
          insurance: 1,
          default: 1
        }
      };

      const result = validateMigratedCard(validCard);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('detects missing reward_structure', () => {
      const card = {
        id: 'no-rewards',
        card_name: 'No Rewards'
      };

      const result = validateMigratedCard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing reward_structure');
    });

    test('detects invalid multiplier values', () => {
      const card = {
        id: 'invalid-multiplier',
        card_name: 'Invalid Card',
        reward_structure: {
          dining: 'not_a_number',
          default: -1
        }
      };

      const result = validateMigratedCard(card);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('warns about unusually high multipliers', () => {
      const card = {
        id: 'high-multiplier',
        card_name: 'High Card',
        reward_structure: {
          dining: 100,
          default: 1
        }
      };

      const result = validateMigratedCard(card);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('warns about missing categories', () => {
      const card = {
        id: 'missing-cats',
        card_name: 'Missing Card',
        reward_structure: {
          dining: 3,
          default: 1
        }
      };

      const result = validateMigratedCard(card);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getMigrationSummary - Human-Readable Reports', () => {
    test('generates readable summary text', () => {
      const portfolio = [
        {
          id: 'card-1',
          card_name: 'Old Card',
          reward_structure: { dining: 3, default: 1 }
        },
        {
          id: 'card-2',
          card_name: 'New Card',
          reward_structure: {
            dining: 4,
            travel: 5,
            entertainment: 2,
            streaming: 1,
            drugstores: 1,
            home_improvement: 1,
            department_stores: 1,
            transit: 1,
            utilities: 1,
            warehouse: 1,
            office_supplies: 1,
            insurance: 1,
            groceries: 3,
            gas: 1,
            default: 1
          }
        }
      ];

      const summary = getMigrationSummary(portfolio);

      expect(summary).toContain('Card Migration Report');
      expect(summary).toContain('Phase 2');
      expect(summary).toContain('Old Card');
      expect(summary).toContain('New Card');
    });

    test('includes migration status indicators', () => {
      const portfolio = [
        {
          id: 'card-1',
          card_name: 'Old Card',
          reward_structure: { dining: 3, default: 1 }
        }
      ];

      const summary = getMigrationSummary(portfolio);

      expect(summary).toContain('NEEDS MIGRATION');
    });

    test('handles empty portfolio', () => {
      const summary = getMigrationSummary([]);

      expect(summary).toContain('Card Migration Report');
      expect(summary).toContain('Total cards: 0');
    });
  });

  describe('Category Migration Mapping', () => {
    test('exposes category migration mappings', () => {
      expect(CATEGORY_MIGRATION_MAP).toBeDefined();
      expect(CATEGORY_MIGRATION_MAP.dining).toBeDefined();
      expect(CATEGORY_MIGRATION_MAP.groceries).toBeDefined();
      expect(CATEGORY_MIGRATION_MAP.gas).toBeDefined();
      expect(CATEGORY_MIGRATION_MAP.travel).toBeDefined();
    });

    test('mapping has newCategory and aliases', () => {
      const mappings = Object.values(CATEGORY_MIGRATION_MAP);

      mappings.forEach(mapping => {
        expect(mapping.newCategory).toBeDefined();
        expect(Array.isArray(mapping.aliases)).toBe(true);
      });
    });
  });

  describe('Migration Strategy Patterns', () => {
    test('exposes migration strategy templates', () => {
      expect(MIGRATION_STRATEGY).toBeDefined();
      expect(MIGRATION_STRATEGY.dining_specialist).toBeDefined();
      expect(MIGRATION_STRATEGY.grocery_specialist).toBeDefined();
      expect(MIGRATION_STRATEGY.travel_specialist).toBeDefined();
      expect(MIGRATION_STRATEGY.cashback_general).toBeDefined();
    });

    test('strategies provide reasonable defaults for all categories', () => {
      Object.values(MIGRATION_STRATEGY).forEach(strategy => {
        expect(typeof strategy).toBe('object');
        // Each strategy should have some categories defined
        expect(Object.keys(strategy).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-World Migration Scenarios', () => {
    test('migrates user with mixed MVP and Phase 2 cards', () => {
      const userPortfolio = [
        {
          id: 'amex-old',
          card_name: 'Amex Gold (Old)',
          reward_structure: {
            dining: 4,
            groceries: 1,
            default: 1
          }
        },
        {
          id: 'chase-new',
          card_name: 'Chase Sapphire (Phase 2)',
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
        }
      ];

      const report = getMigrationReport(userPortfolio);

      expect(report.total_cards).toBe(2);
      expect(report.cards_needing_migration).toBe(1);
      expect(report.cards_already_migrated).toBe(1);

      const migrated = migrateCards(userPortfolio);

      expect(migrated[0]._migration_metadata).toBeDefined();
      expect(migrated[1]._migration_metadata).toBeUndefined(); // Already migrated
    });

    test('handles user onboarding with legacy data', () => {
      const legacyUserCards = [
        {
          id: 'legacy-1',
          card_name: 'Chase Freedom',
          reward_structure: {
            rotating: 5,
            dining: 1,
            default: 1
          }
        },
        {
          id: 'legacy-2',
          card_name: 'Amex Blue',
          reward_structure: {
            online: 2,
            travel: 1,
            default: 1
          }
        }
      ];

      const report = getMigrationReport(legacyUserCards);

      expect(report.cards_needing_migration).toBe(2);
      expect(report.migration_rate).toBe('0.0');

      // Migrate all cards
      const migrated = migrateCards(legacyUserCards);

      // Verify all are now compliant
      const newReport = getMigrationReport(migrated);
      expect(newReport.cards_needing_migration).toBeLessThan(report.cards_needing_migration);
    });
  });
});
