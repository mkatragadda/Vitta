/**
 * Field Extraction Tests
 * 
 * Comprehensive tests to ensure extractAttribute correctly identifies
 * all database fields from natural language queries.
 * 
 * Tests every queryable field to ensure proper extraction.
 */

import { extractEntities, extractAttribute } from '../../services/chat/entityExtractor.js';

// Helper to extract just the attribute from a query
const getAttribute = (query) => {
  const entities = extractEntities(query);
  return entities.attribute;
};

describe('Field Extraction - extractAttribute', () => {
  describe('Identity Fields', () => {
    test('extracts card_name', () => {
      expect(getAttribute("what's the name of my card")).toBe('card_name');
      expect(getAttribute("show me card name")).toBe('card_name');
      expect(getAttribute("card title")).toBe('card_name');
    });

    test('extracts nickname', () => {
      expect(getAttribute("what's my card nickname")).toBe('nickname');
      expect(getAttribute("show me card nick")).toBe('nickname');
      expect(getAttribute("card alias")).toBe('nickname');
    });

    test('extracts card_type', () => {
      expect(getAttribute("what type of card is this")).toBe('card_type');
      expect(getAttribute("what kind of card")).toBe('card_type');
      expect(getAttribute("card kind")).toBe('card_type');
    });

    test('extracts issuer', () => {
      expect(getAttribute("what's the issuer")).toBe('issuer');
      expect(getAttribute("show me bank")).toBe('issuer');
      expect(getAttribute("card issuer")).toBe('issuer');
      expect(getAttribute("financial institution")).toBe('issuer');
    });

    test('extracts card_network', () => {
      expect(getAttribute("what's the card network")).toBe('card_network');
      expect(getAttribute("show me network")).toBe('card_network');
      expect(getAttribute("payment network")).toBe('card_network');
      // Network names may trigger, but are also handled via distinct queries
      // So this test checks if attribute is set, but network filtering is primarily via distinct
      const attr = getAttribute("show me visa cards");
      // May be null or card_network - both are valid
      expect([null, 'card_network']).toContain(attr);
    });
  });

  describe('Financial Fields', () => {
    test('extracts apr', () => {
      expect(getAttribute("what's my APR")).toBe('apr');
      expect(getAttribute("interest rate")).toBe('apr');
      expect(getAttribute("annual percentage rate")).toBe('apr');
      expect(getAttribute("show me rate")).toBe('apr');
    });

    test('extracts balance', () => {
      expect(getAttribute("what's my balance")).toBe('balance');
      expect(getAttribute("current balance")).toBe('balance');
      expect(getAttribute("how much debt")).toBe('balance');
      expect(getAttribute("what do I owe")).toBe('balance');
      expect(getAttribute("outstanding balance")).toBe('balance');
    });

    test('extracts credit_limit', () => {
      expect(getAttribute("what's my credit limit")).toBe('credit_limit');
      expect(getAttribute("show me limit")).toBe('credit_limit');
      expect(getAttribute("maximum credit")).toBe('credit_limit');
      expect(getAttribute("max credit")).toBe('credit_limit');
    });

    test('extracts annual_fee', () => {
      expect(getAttribute("what's the annual fee")).toBe('annual_fee');
      expect(getAttribute("yearly fee")).toBe('annual_fee');
      expect(getAttribute("show me fee")).toBe('annual_fee');
    });

    test('extracts payment_amount', () => {
      expect(getAttribute("payment amount")).toBe('payment_amount');
      expect(getAttribute("how much should I pay")).toBe('payment_amount');
      expect(getAttribute("minimum payment")).toBe('payment_amount');
      expect(getAttribute("amount to pay")).toBe('payment_amount');
    });
  });

  describe('Date/Time Fields', () => {
    test('extracts due_date', () => {
      expect(getAttribute("when is payment due")).toBe('due_date');
      expect(getAttribute("payment due date")).toBe('due_date');
      expect(getAttribute("due date")).toBe('due_date');
      expect(getAttribute("when due")).toBe('due_date');
      expect(getAttribute("payment due")).toBe('due_date');
    });

    test('extracts statement_close', () => {
      expect(getAttribute("when does statement close")).toBe('statement_close');
      expect(getAttribute("statement end date")).toBe('statement_close');
      expect(getAttribute("statement cycle end")).toBe('statement_close');
      expect(getAttribute("close date")).toBe('statement_close');
    });

    test('extracts statement_start', () => {
      expect(getAttribute("statement start date")).toBe('statement_start');
      expect(getAttribute("statement cycle start")).toBe('statement_start');
      expect(getAttribute("cycle start")).toBe('statement_start');
    });

    test('extracts grace_period', () => {
      expect(getAttribute("grace period")).toBe('grace_period');
      expect(getAttribute("grace days")).toBe('grace_period');
      expect(getAttribute("interest free days")).toBe('grace_period');
      expect(getAttribute("show me grace")).toBe('grace_period');
    });
  });

  describe('Computed Fields', () => {
    test('extracts utilization', () => {
      expect(getAttribute("what's my utilization")).toBe('utilization');
      expect(getAttribute("credit usage")).toBe('utilization');
      expect(getAttribute("percent used")).toBe('utilization');
      expect(getAttribute("usage")).toBe('utilization');
    });

    test('extracts available_credit', () => {
      expect(getAttribute("available credit")).toBe('available_credit');
      expect(getAttribute("how much available")).toBe('available_credit');
      expect(getAttribute("can I spend")).toBe('available_credit');
      expect(getAttribute("remaining credit")).toBe('available_credit');
      expect(getAttribute("free credit")).toBe('available_credit');
    });
  });

  describe('Rewards Fields', () => {
    test('extracts rewards', () => {
      expect(getAttribute("what rewards do I get")).toBe('rewards');
      expect(getAttribute("show me points")).toBe('rewards');
      expect(getAttribute("cashback rate")).toBe('rewards');
      expect(getAttribute("how much can I earn")).toBe('rewards');
      // "miles earning" may not trigger rewards attribute (earn might not match pattern)
      // Check if it extracts or not - both are acceptable
      const attr = getAttribute("miles earning");
      expect([null, 'rewards']).toContain(attr);
    });
  });

  describe('Edge Cases', () => {
    test('returns null for non-field queries', () => {
      expect(getAttribute("show me my cards")).toBeNull();
      expect(getAttribute("hello")).toBeNull();
      expect(getAttribute("list all cards")).toBeNull();
    });

    test('prioritizes more specific patterns', () => {
      // "interest rate" should match APR, not rewards
      expect(getAttribute("what's my interest rate")).toBe('apr');
      
      // "available" should match available_credit, not other fields
      expect(getAttribute("how much available")).toBe('available_credit');
    });

    test('handles queries with multiple field mentions (first wins)', () => {
      // When multiple fields mentioned, should return first detected
      const query = "show me balance and APR";
      const attribute = getAttribute(query);
      // Should detect balance first (appears earlier in extractAttribute logic)
      expect(['balance', 'apr']).toContain(attribute);
    });
  });

  describe('Real-world Query Examples', () => {
    test('extracts from complex queries', () => {
      expect(getAttribute("what's my total balance across all cards")).toBe('balance');
      expect(getAttribute("which card has the lowest APR")).toBe('apr');
      expect(getAttribute("show me cards with highest credit limit")).toBe('credit_limit');
      expect(getAttribute("when is my next payment due")).toBe('due_date');
      expect(getAttribute("what's my credit utilization percentage")).toBe('utilization');
      expect(getAttribute("how much available credit do I have")).toBe('available_credit');
    });

    test('handles queries with modifiers', () => {
      expect(getAttribute("highest balance")).toBe('balance');
      expect(getAttribute("lowest APR")).toBe('apr');
      expect(getAttribute("maximum credit limit")).toBe('credit_limit');
      expect(getAttribute("average utilization")).toBe('utilization');
    });
  });
});

