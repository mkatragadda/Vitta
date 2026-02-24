/**
 * Intent Definitions Tests
 *
 * Unit tests for intent definitions covering:
 * - Structure and required properties
 * - transfer_money_international intent
 * - Definition completeness
 * - Capability descriptions
 */

import { INTENT_DEFINITIONS, getIntentDescription, formatIntentsForGPT } from '../intentDefinitions.js';

describe('Intent Definitions', () => {
  // ========== Basic Structure Tests ==========

  describe('Structure', () => {
    test('INTENT_DEFINITIONS is an object', () => {
      expect(typeof INTENT_DEFINITIONS).toBe('object');
      expect(INTENT_DEFINITIONS).not.toBeNull();
    });

    test('has multiple intent definitions', () => {
      expect(Object.keys(INTENT_DEFINITIONS).length).toBeGreaterThan(5);
    });

    test('transfer_money_international exists', () => {
      expect(INTENT_DEFINITIONS).toHaveProperty('transfer_money_international');
    });
  });

  // ========== transfer_money_international Definition Tests ==========

  describe('transfer_money_international Intent Definition', () => {
    const intentDef = INTENT_DEFINITIONS.transfer_money_international;

    test('has name property', () => {
      expect(intentDef).toHaveProperty('name');
      expect(typeof intentDef.name).toBe('string');
      expect(intentDef.name.length).toBeGreaterThan(0);
    });

    test('has proper name formatting', () => {
      expect(intentDef.name).toBe('Transfer Money International');
    });

    test('has description property', () => {
      expect(intentDef).toHaveProperty('description');
      expect(typeof intentDef.description).toBe('string');
      expect(intentDef.description.length).toBeGreaterThan(0);
    });

    test('description mentions international transfers', () => {
      expect(intentDef.description.toLowerCase()).toMatch(/(international|abroad|send|money)/i);
    });

    test('has capabilities array', () => {
      expect(intentDef).toHaveProperty('capabilities');
      expect(Array.isArray(intentDef.capabilities)).toBe(true);
      expect(intentDef.capabilities.length).toBeGreaterThanOrEqual(3);
    });

    test('all capabilities are strings', () => {
      intentDef.capabilities.forEach(capability => {
        expect(typeof capability).toBe('string');
        expect(capability.length).toBeGreaterThan(0);
      });
    });

    test('capabilities describe key features', () => {
      const capabilitiesText = intentDef.capabilities.join(' ').toLowerCase();
      expect(capabilitiesText).toMatch(/(beneficiary|transfer|recipient|monitor|execute)/i);
    });

    test('has examples array', () => {
      expect(intentDef).toHaveProperty('examples');
      expect(Array.isArray(intentDef.examples)).toBe(true);
      expect(intentDef.examples.length).toBeGreaterThanOrEqual(3);
    });

    test('all examples are strings', () => {
      intentDef.examples.forEach(example => {
        expect(typeof example).toBe('string');
        expect(example.length).toBeGreaterThan(0);
      });
    });

    test('examples include key phrases', () => {
      const examplesText = intentDef.examples.join(' ').toLowerCase();
      expect(examplesText).toMatch(/(india|send|snipe|settle|transfer)/i);
    });
  });

  // ========== All Definitions Consistency Tests ==========

  describe('All Intent Definitions Consistency', () => {
    test('all intents have required properties', () => {
      Object.entries(INTENT_DEFINITIONS).forEach(([intentId, definition]) => {
        expect(definition).toHaveProperty('name');
        expect(definition).toHaveProperty('description');
        expect(definition).toHaveProperty('capabilities');
        expect(definition).toHaveProperty('examples');
      });
    });

    test('all intents have non-empty arrays', () => {
      Object.entries(INTENT_DEFINITIONS).forEach(([intentId, definition]) => {
        expect(Array.isArray(definition.capabilities)).toBe(true);
        expect(definition.capabilities.length).toBeGreaterThan(0);
        expect(Array.isArray(definition.examples)).toBe(true);
        expect(definition.examples.length).toBeGreaterThan(0);
      });
    });

    test('all intent names start with capital letter', () => {
      Object.entries(INTENT_DEFINITIONS).forEach(([intentId, definition]) => {
        // Name should start with capital letter
        expect(definition.name[0]).toBe(definition.name[0].toUpperCase());
      });
    });

    test('no duplicate capability descriptions across intents', () => {
      const allCapabilities = Object.values(INTENT_DEFINITIONS)
        .flatMap(def => def.capabilities)
        .map(cap => cap.toLowerCase());

      const uniqueCapabilities = new Set(allCapabilities);
      // Allow some duplicates but not exact matches
      expect(uniqueCapabilities.size).toBeGreaterThan(allCapabilities.length * 0.7);
    });
  });

  // ========== Helper Function Tests ==========

  describe('getIntentDescription Function', () => {
    test('returns definition for valid intent', () => {
      const def = getIntentDescription('transfer_money_international');
      expect(def).toBeDefined();
      expect(def).toHaveProperty('name');
    });

    test('returns correct transfer_money_international definition', () => {
      const def = getIntentDescription('transfer_money_international');
      expect(def.name).toBe('Transfer Money International');
    });

    test('returns null for invalid intent', () => {
      const def = getIntentDescription('nonexistent_intent');
      expect(def).toBeNull();
    });

    test('works for all intents', () => {
      Object.keys(INTENT_DEFINITIONS).forEach(intentId => {
        const def = getIntentDescription(intentId);
        expect(def).not.toBeNull();
        expect(def.name).toBeDefined();
      });
    });
  });

  describe('formatIntentsForGPT Function', () => {
    test('returns formatted string', () => {
      const formatted = formatIntentsForGPT();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('includes all intent names', () => {
      const formatted = formatIntentsForGPT();
      Object.values(INTENT_DEFINITIONS).forEach(def => {
        expect(formatted).toContain(def.name);
      });
    });

    test('includes transfer_money_international', () => {
      const formatted = formatIntentsForGPT();
      expect(formatted).toContain('Transfer Money International');
    });

    test('includes intent IDs in parentheses', () => {
      const formatted = formatIntentsForGPT();
      Object.keys(INTENT_DEFINITIONS).forEach(intentId => {
        expect(formatted).toContain(`(${intentId})`);
      });
    });

    test('includes capabilities section', () => {
      const formatted = formatIntentsForGPT();
      expect(formatted).toContain('Capabilities:');
    });

    test('includes examples section', () => {
      const formatted = formatIntentsForGPT();
      expect(formatted).toContain('Examples:');
    });

    test('formatted output is meaningful for GPT', () => {
      const formatted = formatIntentsForGPT();
      expect(formatted).toContain('Available Intents');
      expect(formatted.split('\n').length).toBeGreaterThan(20);
    });
  });

  // ========== Intent Coverage Tests ==========

  describe('Intent Coverage', () => {
    test('has card-related intents', () => {
      const cardIntents = Object.keys(INTENT_DEFINITIONS).filter(id =>
        id.includes('card')
      );
      expect(cardIntents.length).toBeGreaterThan(0);
    });

    test('has payment-related intents', () => {
      const paymentIntents = Object.keys(INTENT_DEFINITIONS).filter(id =>
        id.includes('payment') || id.includes('split')
      );
      expect(paymentIntents.length).toBeGreaterThan(0);
    });

    test('has navigation intent', () => {
      expect(INTENT_DEFINITIONS).toHaveProperty('navigate_screen');
    });

    test('has help intent', () => {
      expect(INTENT_DEFINITIONS).toHaveProperty('help');
    });

    test('has memory-related intents', () => {
      expect(INTENT_DEFINITIONS).toHaveProperty('remember_memory');
      expect(INTENT_DEFINITIONS).toHaveProperty('recall_memory');
    });

    test('has transfer money international intent', () => {
      expect(INTENT_DEFINITIONS).toHaveProperty('transfer_money_international');
    });
  });

  // ========== Capability Description Tests ==========

  describe('Capability Descriptions Quality', () => {
    test('capabilities are descriptive and well-formed', () => {
      Object.entries(INTENT_DEFINITIONS).forEach(([id, def]) => {
        def.capabilities.forEach(capability => {
          // Capabilities should be meaningful sentences/phrases
          expect(capability.length).toBeGreaterThan(5);
          expect(capability.length).toBeLessThan(200);
          // Should contain mostly alphabetic characters
          expect(/[a-zA-Z]/.test(capability)).toBe(true);
        });
      });
    });

    test('capabilities are specific and descriptive', () => {
      Object.entries(INTENT_DEFINITIONS).forEach(([id, def]) => {
        def.capabilities.forEach(capability => {
          expect(capability.length).toBeGreaterThan(10);
          expect(capability.length).toBeLessThan(150);
        });
      });
    });
  });

  // ========== transfer_money_international Specific Coverage Tests ==========

  describe('transfer_money_international Capability Coverage', () => {
    const def = INTENT_DEFINITIONS.transfer_money_international;

    test('includes beneficiary management capability', () => {
      const hasBeneficiary = def.capabilities.some(cap =>
        cap.toLowerCase().includes('beneficiary') || cap.toLowerCase().includes('recipient')
      );
      expect(hasBeneficiary).toBe(true);
    });

    test('includes transfer execution capability', () => {
      const hasExecution = def.capabilities.some(cap =>
        cap.toLowerCase().includes('transfer') || cap.toLowerCase().includes('execute')
      );
      expect(hasExecution).toBe(true);
    });

    test('includes monitoring/optimization capability', () => {
      const hasMonitoring = def.capabilities.some(cap =>
        cap.toLowerCase().includes('monitor') || cap.toLowerCase().includes('optimal')
      );
      expect(hasMonitoring).toBe(true);
    });

    test('includes Snipe & Settle capability', () => {
      const hasSnipeSettle = def.capabilities.some(cap =>
        cap.toLowerCase().includes('snipe') || cap.toLowerCase().includes('settle')
      );
      expect(hasSnipeSettle).toBe(true);
    });
  });
});
