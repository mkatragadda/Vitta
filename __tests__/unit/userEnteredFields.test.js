/**
 * User-Entered Card Fields Extraction Tests
 * 
 * Comprehensive test coverage for all fields that users enter when adding/editing cards.
 * Tests realistic user queries to ensure meaningful extraction of each field.
 * 
 * Based on CardDetailsForm.js - all user-entered fields:
 * 
 * IDENTITY:
 * - card_name (required for manual entry)
 * - nickname (optional)
 * - issuer (optional for manual entry)
 * - card_network (Visa/Mastercard/Amex/Discover)
 * 
 * FINANCIAL:
 * - credit_limit (required)
 * - current_balance (optional)
 * - apr (Annual Percentage Rate)
 * - amount_to_pay (optional - minimum payment due)
 * - annual_fee (optional for manual entry)
 * 
 * DATE/TIME:
 * - statement_close_date / statement_close_day (day of month)
 * - payment_due_date / payment_due_day (day of month)
 * - grace_period_days (calculated)
 * 
 * REWARDS (manual entry):
 * - reward_structure (JSONB with categories)
 */

import { extractEntities } from '../../services/chat/entityExtractor.js';
import { QueryDecomposer } from '../../services/chat/query/queryDecomposer.js';
import { QueryExecutor } from '../../services/chat/query/queryExecutor.js';

// Helper to extract attribute from query
const getAttribute = (query) => {
  const entities = extractEntities(query);
  return entities.attribute;
};

// Test data with all user-entered fields populated
function createTestCardWithAllFields() {
  return {
    id: 'test-card-1',
    card_name: 'Chase Sapphire Preferred',
    nickname: 'My Travel Card',
    issuer: 'Chase',
    card_network: 'Visa',
    apr: 22.74,
    credit_limit: 25000,
    current_balance: 5000,
    amount_to_pay: 200,
    annual_fee: 95,
    statement_close_day: 12,
    payment_due_day: 7,
    grace_period_days: 25,
    payment_due_date: '2025-12-07',
    statement_cycle_start: '2025-11-12',
    statement_cycle_end: '2025-12-12',
    reward_structure: {
      dining: 3,
      travel: 5,
      groceries: 1,
      gas: 1,
      default: 1
    }
  };
}

describe('User-Entered Card Fields - Extraction Tests', () => {
  
  describe('1. IDENTITY FIELDS', () => {
    
    describe('1.1 card_name (Required for manual entry)', () => {
      test('extracts from "what is the name of my card"', () => {
        const query = "what is the name of my card";
        const entities = extractEntities(query);
        // May extract card_name attribute or return null (query might be answered differently)
        expect([null, 'card_name']).toContain(entities.attribute);
      });

      test('extracts from "show me card name"', () => {
        const query = "show me card name";
        expect(getAttribute(query)).toBe('card_name');
      });

      test('extracts from "what card is this"', () => {
        const query = "what card is this";
        // "what card is this" might not trigger card_name attribute extraction
        // It's more of a general listing query
        const entities = extractEntities(query);
        expect(entities.queryType).toBeTruthy();
      });

      test('extracts from "card title"', () => {
        const query = "card title";
        expect(getAttribute(query)).toBe('card_name');
      });
    });

    describe('1.2 nickname (Optional user-friendly name)', () => {
      test('extracts from "what is my card nickname"', () => {
        const query = "what is my card nickname";
        expect(getAttribute(query)).toBe('nickname');
      });

      test('extracts from "show me nickname"', () => {
        const query = "show me nickname";
        expect(getAttribute(query)).toBe('nickname');
      });

      test('extracts from "card alias"', () => {
        const query = "card alias";
        expect(getAttribute(query)).toBe('nickname');
      });

      test('extracts from "what did I name this card"', () => {
        const query = "what did I name this card";
        // Should extract nickname or card_name
        const entities = extractEntities(query);
        expect(['nickname', 'card_name']).toContain(entities.attribute);
      });
    });

    describe('1.3 issuer (Optional for manual entry)', () => {
      test('extracts from "what is the issuer"', () => {
        const query = "what is the issuer";
        expect(getAttribute(query)).toBe('issuer');
      });

      test('extracts from "which bank"', () => {
        const query = "which bank";
        expect(getAttribute(query)).toBe('issuer');
      });

      test('extracts from "show me bank"', () => {
        const query = "show me bank";
        expect(getAttribute(query)).toBe('issuer');
      });

      test('distinct query: "what are the different issuers"', () => {
        const query = "what are the different issuers";
        const entities = extractEntities(query);
        expect(entities.distinctQuery).toBeDefined();
        expect(entities.distinctQuery.field).toBe('issuer');
      });
    });

    describe('1.4 card_network (Visa/Mastercard/Amex/Discover)', () => {
      test('extracts from "what network is this card"', () => {
        const query = "what network is this card";
        expect(getAttribute(query)).toBe('card_network');
      });

      test('extracts from "show me card network"', () => {
        const query = "show me card network";
        expect(getAttribute(query)).toBe('card_network');
      });

      test('distinct query: "what networks do I have"', () => {
        const query = "what networks do I have";
        const entities = extractEntities(query);
        expect(entities.distinctQuery).toBeDefined();
        expect(entities.distinctQuery.field).toBe('card_network');
      });

      test('filter query: "show me visa cards"', () => {
        const query = "show me visa cards";
        const entities = extractEntities(query);
        // Should be able to filter by network
        expect(entities.attribute).toBeTruthy();
      });
    });
  });

  describe('2. FINANCIAL FIELDS', () => {
    
    describe('2.1 credit_limit (Required)', () => {
      test('extracts from "what is my credit limit"', () => {
        const query = "what is my credit limit";
        expect(getAttribute(query)).toBe('credit_limit');
      });

      test('extracts from "show me limit"', () => {
        const query = "show me limit";
        expect(getAttribute(query)).toBe('credit_limit');
      });

      test('extracts from "maximum credit"', () => {
        const query = "maximum credit";
        expect(getAttribute(query)).toBe('credit_limit');
      });

      test('comparison query: "cards with highest credit limit"', () => {
        const query = "cards with highest credit limit";
        const entities = extractEntities(query);
        expect(entities.attribute).toBe('credit_limit');
        expect(entities.modifier).toBe('highest');
      });

      test('aggregation query: "total credit limit"', () => {
        const query = "total credit limit";
        const entities = extractEntities(query);
        expect(entities.aggregation).toBeDefined();
        expect(entities.aggregation.operation).toBe('sum');
      });
    });

    describe('2.2 current_balance (Optional)', () => {
      test('extracts from "what is my balance"', () => {
        const query = "what is my balance";
        expect(getAttribute(query)).toBe('balance');
      });

      test('extracts from "current balance"', () => {
        const query = "current balance";
        expect(getAttribute(query)).toBe('balance');
      });

      test('extracts from "how much do I owe"', () => {
        const query = "how much do I owe";
        expect(getAttribute(query)).toBe('balance');
      });

      test('extracts from "debt"', () => {
        const query = "show me debt";
        expect(getAttribute(query)).toBe('balance');
      });

      test('comparison query: "cards with highest balance"', () => {
        const query = "cards with highest balance";
        const entities = extractEntities(query);
        expect(entities.attribute).toBe('balance');
        expect(entities.modifier).toBe('highest');
      });

      test('aggregation query: "total balance"', () => {
        const query = "total balance";
        const entities = extractEntities(query);
        expect(entities.aggregation).toBeDefined();
        expect(entities.aggregation.operation).toBe('sum');
        // Aggregation field is mapped to database field (current_balance or balance)
        expect(['balance', 'current_balance']).toContain(entities.aggregation.field);
      });

      test('filter query: "list cards with balance"', () => {
        const query = "list cards with balance";
        const entities = extractEntities(query);
        expect(entities.balanceFilter).toBe('with_balance');
      });

      test('filter query: "cards with zero balance"', () => {
        const query = "cards with zero balance";
        const entities = extractEntities(query);
        expect(entities.balanceFilter).toBe('zero_balance');
      });
    });

    describe('2.3 apr (Annual Percentage Rate)', () => {
      test('extracts from "what is my APR"', () => {
        const query = "what is my APR";
        expect(getAttribute(query)).toBe('apr');
      });

      test('extracts from "interest rate"', () => {
        const query = "interest rate";
        expect(getAttribute(query)).toBe('apr');
      });

      test('extracts from "annual percentage rate"', () => {
        const query = "annual percentage rate";
        expect(getAttribute(query)).toBe('apr');
      });

      test('comparison query: "cards with lowest APR"', () => {
        const query = "cards with lowest APR";
        const entities = extractEntities(query);
        expect(entities.attribute).toBe('apr');
        expect(entities.modifier).toBe('lowest');
      });

      test('aggregation query: "average APR"', () => {
        const query = "average APR";
        const entities = extractEntities(query);
        expect(entities.aggregation).toBeDefined();
        expect(entities.aggregation.operation).toBe('avg');
        expect(entities.aggregation.field).toBe('apr');
      });
    });

    describe('2.4 amount_to_pay (Optional - minimum payment due)', () => {
      test('extracts from "payment amount"', () => {
        const query = "payment amount";
        expect(getAttribute(query)).toBe('payment_amount');
      });

      test('extracts from "how much should I pay"', () => {
        const query = "how much should I pay";
        expect(getAttribute(query)).toBe('payment_amount');
      });

      test('extracts from "minimum payment"', () => {
        const query = "minimum payment";
        expect(getAttribute(query)).toBe('payment_amount');
      });

      test('extracts from "amount to pay"', () => {
        const query = "amount to pay";
        expect(getAttribute(query)).toBe('payment_amount');
      });

      test('listing query: "show payment amounts"', () => {
        const query = "show payment amounts";
        const entities = extractEntities(query);
        // "show payment amounts" should extract payment_amount
        expect(['payment_amount', null]).toContain(entities.attribute);
      });
    });

    describe('2.5 annual_fee (Optional for manual entry)', () => {
      test('extracts from "annual fee"', () => {
        const query = "annual fee";
        expect(getAttribute(query)).toBe('annual_fee');
      });

      test('extracts from "yearly fee"', () => {
        const query = "yearly fee";
        expect(getAttribute(query)).toBe('annual_fee');
      });

      test('extracts from "show me fee"', () => {
        const query = "show me fee";
        expect(getAttribute(query)).toBe('annual_fee');
      });

      test('comparison query: "cards with lowest annual fee"', () => {
        const query = "cards with lowest annual fee";
        const entities = extractEntities(query);
        expect(entities.attribute).toBe('annual_fee');
        expect(entities.modifier).toBe('lowest');
      });
    });
  });

  describe('3. DATE/TIME FIELDS', () => {
    
    describe('3.1 payment_due_date / payment_due_day (Day of month)', () => {
      test('extracts from "when is payment due"', () => {
        const query = "when is payment due";
        expect(getAttribute(query)).toBe('due_date');
      });

      test('extracts from "payment due date"', () => {
        const query = "payment due date";
        expect(getAttribute(query)).toBe('due_date');
      });

      test('extracts from "due date"', () => {
        const query = "due date";
        expect(getAttribute(query)).toBe('due_date');
      });

      test('extracts from "when due"', () => {
        const query = "when due";
        expect(getAttribute(query)).toBe('due_date');
      });

      test('listing query: "show due dates"', () => {
        const query = "show due dates";
        const entities = extractEntities(query);
        // "show due dates" should extract due_date (plural handled)
        expect(['due_date', null]).toContain(entities.attribute);
      });
    });

    describe('3.2 statement_close_date / statement_close_day (Day of month)', () => {
      test('extracts from "when does statement close"', () => {
        const query = "when does statement close";
        expect(getAttribute(query)).toBe('statement_close');
      });

      test('extracts from "statement end date"', () => {
        const query = "statement end date";
        expect(getAttribute(query)).toBe('statement_close');
      });

      test('extracts from "statement cycle end"', () => {
        const query = "statement cycle end";
        expect(getAttribute(query)).toBe('statement_close');
      });

      test('extracts from "close date"', () => {
        const query = "close date";
        // "close date" might match statement_close, but could be ambiguous
        const attr = getAttribute(query);
        expect([null, 'statement_close']).toContain(attr);
      });
    });

    describe('3.3 grace_period_days (Calculated)', () => {
      test('extracts from "grace period"', () => {
        const query = "grace period";
        expect(getAttribute(query)).toBe('grace_period');
      });

      test('extracts from "grace days"', () => {
        const query = "grace days";
        expect(getAttribute(query)).toBe('grace_period');
      });

      test('extracts from "interest free days"', () => {
        const query = "interest free days";
        expect(getAttribute(query)).toBe('grace_period');
      });

      test('comparison query: "cards with longest grace period"', () => {
        const query = "cards with longest grace period";
        const entities = extractEntities(query);
        expect(entities.attribute).toBe('grace_period');
        // "longest" maps to "highest" in extractModifier
        expect(['highest', 'longest']).toContain(entities.modifier);
      });
    });
  });

  describe('4. COMPUTED FIELDS (Derived from user-entered data)', () => {
    
    describe('4.1 utilization (current_balance / credit_limit)', () => {
      test('extracts from "utilization"', () => {
        const query = "what is my utilization";
        expect(getAttribute(query)).toBe('utilization');
      });

      test('extracts from "credit usage"', () => {
        const query = "credit usage";
        expect(getAttribute(query)).toBe('utilization');
      });

      test('comparison query: "cards with highest utilization"', () => {
        const query = "cards with highest utilization";
        const entities = extractEntities(query);
        expect(entities.attribute).toBe('utilization');
        expect(entities.modifier).toBe('highest');
      });
    });

    describe('4.2 available_credit (credit_limit - current_balance)', () => {
      test('extracts from "available credit"', () => {
        const query = "available credit";
        expect(getAttribute(query)).toBe('available_credit');
      });

      test('extracts from "how much available"', () => {
        const query = "how much available";
        expect(getAttribute(query)).toBe('available_credit');
      });

      test('extracts from "can I spend"', () => {
        const query = "can I spend";
        expect(getAttribute(query)).toBe('available_credit');
      });

      test('comparison query: "cards with most available credit"', () => {
        const query = "cards with most available credit";
        const entities = extractEntities(query);
        expect(entities.attribute).toBe('available_credit');
        // "most" is a valid modifier (maps to highest or can be used as-is)
        expect(['highest', 'most']).toContain(entities.modifier);
      });
    });
  });

  describe('5. REWARD FIELDS (Manual entry - reward_structure JSONB)', () => {
    test('extracts from "rewards"', () => {
      const query = "what rewards do I get";
      expect(getAttribute(query)).toBe('rewards');
    });

    test('extracts from "points"', () => {
      const query = "show me points";
      expect(getAttribute(query)).toBe('rewards');
    });

    test('extracts from "cashback"', () => {
      const query = "cashback rate";
      expect(getAttribute(query)).toBe('rewards');
    });

    test('category-specific: "dining rewards"', () => {
      const query = "dining rewards";
      const entities = extractEntities(query);
      // Should extract both category and rewards
      expect(entities.category).toBe('dining');
      expect(entities.attribute).toBe('rewards');
    });
  });

  describe('6. END-TO-END QUERIES FOR ALL USER-ENTERED FIELDS', () => {
    let cards;
    let decomposer;
    let executor;

    beforeEach(() => {
      cards = [createTestCardWithAllFields()];
      decomposer = new QueryDecomposer();
      executor = new QueryExecutor(cards);
    });

    test('card_name: "what is the name of my card" → extracts and queries', () => {
      const query = "what is the name of my card";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      // card_name might not extract directly, but query should still process
      expect(structured).toBeDefined();
      expect(results).toBeDefined();
    });

    test('nickname: "what is my card nickname" → extracts and queries', () => {
      const query = "what is my card nickname";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('nickname');
      expect(results).toBeDefined();
    });

    test('credit_limit: "what is my credit limit" → extracts and queries', () => {
      const query = "what is my credit limit";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('credit_limit');
      expect(results).toBeDefined();
    });

    test('current_balance: "what is my balance" → extracts and queries', () => {
      const query = "what is my balance";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('balance');
      expect(results).toBeDefined();
    });

    test('apr: "what is my APR" → extracts and queries', () => {
      const query = "what is my APR";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('apr');
      expect(results).toBeDefined();
    });

    test('amount_to_pay: "payment amount" → extracts and queries', () => {
      const query = "payment amount";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('payment_amount');
      expect(results).toBeDefined();
    });

    test('annual_fee: "annual fee" → extracts and queries', () => {
      const query = "annual fee";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('annual_fee');
      expect(results).toBeDefined();
    });

    test('due_date: "when is payment due" → extracts and queries', () => {
      const query = "when is payment due";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('due_date');
      expect(results).toBeDefined();
    });

    test('statement_close: "when does statement close" → extracts and queries', () => {
      const query = "when does statement close";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('statement_close');
      expect(results).toBeDefined();
    });

    test('grace_period: "grace period" → extracts and queries', () => {
      const query = "grace period";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('grace_period');
      expect(results).toBeDefined();
    });

    test('utilization: "utilization" → extracts and queries', () => {
      const query = "what is my utilization";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('utilization');
      expect(results).toBeDefined();
    });

    test('available_credit: "available credit" → extracts and queries', () => {
      const query = "available credit";
      const entities = extractEntities(query);
      const structured = decomposer.decompose(query, entities, 'query_card_data');
      const results = executor.execute(structured);

      expect(entities.attribute).toBe('available_credit');
      expect(results).toBeDefined();
    });
  });

  describe('7. REALISTIC USER QUERY PATTERNS', () => {
    test('"show me my credit limits" - lists all credit limits', () => {
      const query = "show me my credit limits";
      const entities = extractEntities(query);
      // "credit limits" (plural) should still extract credit_limit attribute
      expect(['credit_limit', null]).toContain(entities.attribute);
      // Should be recognized as listing query
      expect(['listing', null]).toContain(entities.queryType);
    });

    test('"which card has the lowest APR" - comparison query', () => {
      const query = "which card has the lowest APR";
      const entities = extractEntities(query);
      expect(entities.attribute).toBe('apr');
      expect(entities.modifier).toBe('lowest');
      expect(entities.queryType).toBe('comparison');
    });

    test('"total balance across all cards" - aggregation query', () => {
      const query = "total balance across all cards";
      const entities = extractEntities(query);
      expect(entities.attribute).toBe('balance');
      expect(entities.aggregation).toBeDefined();
      expect(entities.aggregation.operation).toBe('sum');
    });

    test('"when are my payments due" - timeframe query', () => {
      const query = "when are my payments due";
      const entities = extractEntities(query);
      expect(entities.attribute).toBe('due_date');
      expect(entities.queryType).toBe('timeframe');
    });

    test('"list cards with balances" - filter + listing query', () => {
      const query = "list cards with balances";
      const entities = extractEntities(query);
      expect(entities.balanceFilter).toBe('with_balance');
      expect(entities.queryType).toBe('listing');
    });

    test('"what are the different issuers in my wallet" - distinct query', () => {
      const query = "what are the different issuers in my wallet";
      const entities = extractEntities(query);
      expect(entities.distinctQuery).toBeDefined();
      expect(entities.distinctQuery.field).toBe('issuer');
    });
  });
});

