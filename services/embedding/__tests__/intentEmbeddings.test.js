/**
 * Intent Embeddings Tests
 *
 * Unit tests for intent embeddings configuration covering:
 * - Intent definitions and categorization
 * - Example diversity and coverage
 * - New transfer_money_international intent
 * - Category membership validation
 * - Example count validation
 */

import { INTENT_CATEGORIES, INTENT_EXAMPLES } from '../intentEmbeddings.js';
import { INTENT_DEFINITIONS } from '../../../config/intentDefinitions.js';

describe('Intent Embeddings Configuration', () => {
  // ========== Intent Categories Tests ==========

  describe('INTENT_CATEGORIES Structure', () => {
    test('has TASK, GUIDANCE, and CHAT categories', () => {
      expect(INTENT_CATEGORIES).toHaveProperty('TASK');
      expect(INTENT_CATEGORIES).toHaveProperty('GUIDANCE');
      expect(INTENT_CATEGORIES).toHaveProperty('CHAT');
    });

    test('all categories are non-empty arrays', () => {
      Object.entries(INTENT_CATEGORIES).forEach(([category, intents]) => {
        expect(Array.isArray(intents)).toBe(true);
        expect(intents.length).toBeGreaterThan(0);
      });
    });

    test('has transfer_money_international in TASK category', () => {
      expect(INTENT_CATEGORIES.TASK).toContain('transfer_money_international');
    });

    test('no duplicate intents across categories', () => {
      const allIntents = Object.values(INTENT_CATEGORIES).flat();
      const uniqueIntents = new Set(allIntents);
      expect(uniqueIntents.size).toBe(allIntents.length);
    });
  });

  // ========== Intent Examples Tests ==========

  describe('INTENT_EXAMPLES Structure', () => {
    test('has examples for all categorized intents', () => {
      const categorizedIntents = Object.values(INTENT_CATEGORIES).flat();
      categorizedIntents.forEach(intentId => {
        expect(INTENT_EXAMPLES).toHaveProperty(intentId);
        expect(Array.isArray(INTENT_EXAMPLES[intentId])).toBe(true);
      });
    });

    test('all example arrays are non-empty', () => {
      Object.entries(INTENT_EXAMPLES).forEach(([intent, examples]) => {
        expect(examples.length).toBeGreaterThan(0);
      });
    });

    test('examples are strings', () => {
      Object.entries(INTENT_EXAMPLES).forEach(([intent, examples]) => {
        examples.forEach(example => {
          expect(typeof example).toBe('string');
          expect(example.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ========== Transfer Money International Intent Tests ==========

  describe('transfer_money_international Intent', () => {
    test('is defined in INTENT_DEFINITIONS', () => {
      expect(INTENT_DEFINITIONS).toHaveProperty('transfer_money_international');
    });

    test('has required definition properties', () => {
      const definition = INTENT_DEFINITIONS.transfer_money_international;
      expect(definition).toHaveProperty('name');
      expect(definition).toHaveProperty('description');
      expect(definition).toHaveProperty('capabilities');
      expect(definition).toHaveProperty('examples');
    });

    test('definition has non-empty name', () => {
      const definition = INTENT_DEFINITIONS.transfer_money_international;
      expect(typeof definition.name).toBe('string');
      expect(definition.name.length).toBeGreaterThan(0);
    });

    test('definition has non-empty description', () => {
      const definition = INTENT_DEFINITIONS.transfer_money_international;
      expect(typeof definition.description).toBe('string');
      expect(definition.description.length).toBeGreaterThan(0);
    });

    test('definition has at least 3 capabilities', () => {
      const definition = INTENT_DEFINITIONS.transfer_money_international;
      expect(Array.isArray(definition.capabilities)).toBe(true);
      expect(definition.capabilities.length).toBeGreaterThanOrEqual(3);
    });

    test('definition has at least 3 examples', () => {
      const definition = INTENT_DEFINITIONS.transfer_money_international;
      expect(Array.isArray(definition.examples)).toBe(true);
      expect(definition.examples.length).toBeGreaterThanOrEqual(3);
    });

    test('is in TASK category', () => {
      expect(INTENT_CATEGORIES.TASK).toContain('transfer_money_international');
    });

    test('has embedding examples', () => {
      expect(INTENT_EXAMPLES.transfer_money_international).toBeDefined();
      expect(Array.isArray(INTENT_EXAMPLES.transfer_money_international)).toBe(true);
    });

    test('has at least 20 embedding examples for diversity', () => {
      expect(INTENT_EXAMPLES.transfer_money_international.length).toBeGreaterThanOrEqual(20);
    });
  });

  // ========== Example Coverage Tests ==========

  describe('transfer_money_international Examples Coverage', () => {
    const examples = INTENT_EXAMPLES.transfer_money_international || [];

    test('includes basic money transfer phrases', () => {
      const basicTransfers = examples.filter(ex =>
        ex.toLowerCase().includes('send money') ||
        ex.toLowerCase().includes('transfer funds') ||
        ex.toLowerCase().includes('send')
      );
      expect(basicTransfers.length).toBeGreaterThan(0);
    });

    test('includes India-specific transfers', () => {
      const indiaTransfers = examples.filter(ex =>
        ex.toLowerCase().includes('india')
      );
      expect(indiaTransfers.length).toBeGreaterThan(0);
    });

    test('includes snipe and settle phrases', () => {
      const snipeSettle = examples.filter(ex =>
        ex.toLowerCase().includes('snipe') &&
        ex.toLowerCase().includes('settle')
      );
      expect(snipeSettle.length).toBeGreaterThan(0);
    });

    test('includes beneficiary management phrases', () => {
      const beneficiary = examples.filter(ex =>
        ex.toLowerCase().includes('beneficiary') ||
        ex.toLowerCase().includes('recipient')
      );
      expect(beneficiary.length).toBeGreaterThan(0);
    });

    test('includes rate monitoring phrases', () => {
      const rateMonitoring = examples.filter(ex =>
        ex.toLowerCase().includes('rate') ||
        ex.toLowerCase().includes('fx') ||
        ex.toLowerCase().includes('exchange')
      );
      expect(rateMonitoring.length).toBeGreaterThan(0);
    });

    test('includes remittance-related phrases', () => {
      const remittance = examples.filter(ex =>
        ex.toLowerCase().includes('remittance') ||
        ex.toLowerCase().includes('family') ||
        ex.toLowerCase().includes('relatives')
      );
      expect(remittance.length).toBeGreaterThan(0);
    });

    test('no example is longer than 100 characters', () => {
      examples.forEach(example => {
        expect(example.length).toBeLessThanOrEqual(100);
      });
    });

    test('no duplicate examples', () => {
      const unique = new Set(examples.map(ex => ex.toLowerCase()));
      expect(unique.size).toBe(examples.length);
    });
  });

  // ========== Intent Definitions Consistency Tests ==========

  describe('Intent Definitions Consistency', () => {
    test('transfer_money_international exists in both INTENT_CATEGORIES and INTENT_DEFINITIONS', () => {
      expect(INTENT_CATEGORIES.TASK).toContain('transfer_money_international');
      expect(INTENT_DEFINITIONS).toHaveProperty('transfer_money_international');
    });

    test('all intents with examples are in INTENT_CATEGORIES', () => {
      Object.keys(INTENT_EXAMPLES).forEach(intentId => {
        const allIntents = Object.values(INTENT_CATEGORIES).flat();
        expect(allIntents).toContain(intentId);
      });
    });

    test('all intents in INTENT_DEFINITIONS have examples', () => {
      Object.keys(INTENT_DEFINITIONS).forEach(intentId => {
        expect(INTENT_EXAMPLES).toHaveProperty(intentId);
      });
    });

    test('all intents have non-empty capability lists', () => {
      Object.entries(INTENT_DEFINITIONS).forEach(([intentId, definition]) => {
        expect(Array.isArray(definition.capabilities)).toBe(true);
        expect(definition.capabilities.length).toBeGreaterThan(0);
      });
    });

    test('all intents have non-empty definition examples', () => {
      Object.entries(INTENT_DEFINITIONS).forEach(([intentId, definition]) => {
        expect(Array.isArray(definition.examples)).toBe(true);
        expect(definition.examples.length).toBeGreaterThan(0);
      });
    });
  });

  // ========== Intent Name Formatting Tests ==========

  describe('Intent Naming Conventions', () => {
    test('transfer_money_international name is properly formatted', () => {
      const definition = INTENT_DEFINITIONS.transfer_money_international;
      expect(definition.name).toBe('Transfer Money International');
    });

    test('all intent IDs use snake_case', () => {
      Object.keys(INTENT_DEFINITIONS).forEach(id => {
        expect(id).toMatch(/^[a-z_]+$/);
      });
    });

    test('all intent names start with capitalized word', () => {
      Object.entries(INTENT_DEFINITIONS).forEach(([id, definition]) => {
        expect(definition.name[0]).toBe(definition.name[0].toUpperCase());
      });
    });
  });

  // ========== Example Statistics Tests ==========

  describe('Intent Examples Statistics', () => {
    test('has reasonable distribution of examples per intent', () => {
      const exampleCounts = Object.entries(INTENT_EXAMPLES).map(
        ([intent, examples]) => ({ intent, count: examples.length })
      );

      // All intents should have at least 5 examples for good coverage
      exampleCounts.forEach(({ intent, count }) => {
        expect(count).toBeGreaterThanOrEqual(5);
      });
    });

    test('transfer_money_international has comparable example count to other TASK intents', () => {
      const transferExamples = INTENT_EXAMPLES.transfer_money_international.length;
      const cardRecommendationExamples = INTENT_EXAMPLES.card_recommendation.length;
      const queryCardDataExamples = INTENT_EXAMPLES.query_card_data.length;

      // Should have similar or more examples than comparable intents
      expect(transferExamples).toBeGreaterThanOrEqual(15);
      expect(transferExamples).toBeGreaterThanOrEqual(
        Math.min(cardRecommendationExamples, queryCardDataExamples) * 0.5
      );
    });

    test('total examples is reasonable for embedding generation', () => {
      const totalExamples = Object.values(INTENT_EXAMPLES).reduce(
        (sum, examples) => sum + examples.length,
        0
      );
      // Should have at least 200+ total examples
      expect(totalExamples).toBeGreaterThan(200);
      expect(totalExamples).toBeLessThan(2000);
    });
  });

  // ========== Category Coverage Tests ==========

  describe('Category Coverage', () => {
    test('TASK category has sufficient intents', () => {
      expect(INTENT_CATEGORIES.TASK.length).toBeGreaterThanOrEqual(8);
    });

    test('TASK category has transfer_money_international', () => {
      expect(INTENT_CATEGORIES.TASK).toContain('transfer_money_international');
    });

    test('GUIDANCE category exists with intents', () => {
      expect(INTENT_CATEGORIES.GUIDANCE.length).toBeGreaterThan(0);
    });

    test('CHAT category exists with intents', () => {
      expect(INTENT_CATEGORIES.CHAT.length).toBeGreaterThan(0);
    });

    test('all categories have proper intent arrays', () => {
      const categories = Object.values(INTENT_CATEGORIES);
      categories.forEach(intents => {
        expect(Array.isArray(intents)).toBe(true);
        intents.forEach(intent => {
          expect(typeof intent).toBe('string');
        });
      });
    });
  });

  // ========== Transfer Money Specific Scenarios Tests ==========

  describe('Transfer Money Scenarios Coverage', () => {
    const examples = INTENT_EXAMPLES.transfer_money_international;

    test('covers direct money transfer requests', () => {
      const directTransfer = examples.some(ex =>
        ex.toLowerCase().match(/send\s+(money|funds|.*|usd).*(to|abroad|international|india)/i)
      );
      expect(directTransfer).toBe(true);
    });

    test('covers automated/monitoring transfers (Snipe & Settle)', () => {
      const automated = examples.some(ex =>
        ex.toLowerCase().includes('snipe') || ex.toLowerCase().includes('monitor')
      );
      expect(automated).toBe(true);
    });

    test('covers beneficiary setup', () => {
      const beneficiarySetup = examples.some(ex =>
        ex.toLowerCase().match(/(add|register|save).*(beneficiary|recipient)/i)
      );
      expect(beneficiarySetup).toBe(true);
    });

    test('covers rate optimization', () => {
      const rateOpt = examples.some(ex =>
        ex.toLowerCase().match(/(rate|fx|exchange|optimal|best)/i)
      );
      expect(rateOpt).toBe(true);
    });

    test('covers transfer status tracking', () => {
      const statusTracking = examples.some(ex =>
        ex.toLowerCase().match(/(status|track|history|arrive|when)/i)
      );
      expect(statusTracking).toBe(true);
    });
  });
});
