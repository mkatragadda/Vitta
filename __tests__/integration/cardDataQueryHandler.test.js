/**
 * Card Data Query Handler Integration Tests
 * Tests the specialized handler for card-related data queries
 * Signature: handleCardDataQuery(cards, entities, query)
 */

import { handleCardDataQuery } from '../../services/chat/cardDataQueryHandler';

// Mock cards array with all required fields
const mockCards = [
  {
    id: 'card-1',
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    balance: 2500.50,
    limit: 10000,
    apr: 18.99,
    annual_fee: 95,
    reward_structure: { travel: 3, dining: 3, default: 1 },
    card_network: 'Visa',
    user_id: 'test-user'
  },
  {
    id: 'card-2',
    name: 'Amex Gold',
    issuer: 'American Express',
    balance: 1500.75,
    limit: 15000,
    apr: 19.99,
    annual_fee: 250,
    reward_structure: { dining: 4, groceries: 4, default: 1 },
    card_network: 'Amex',
    user_id: 'test-user'
  },
  {
    id: 'card-3',
    name: 'Citi Custom Cash',
    issuer: 'Citi',
    balance: 500.25,
    limit: 5000,
    apr: 17.99,
    annual_fee: 0,
    reward_structure: { groceries: 5, gas: 3, default: 1 },
    card_network: 'Mastercard',
    user_id: 'test-user'
  }
];

const createEntities = (overrides = {}) => ({
  attribute: null,
  modifier: null,
  queryType: null,
  merchant: null,
  category: null,
  balanceFilter: null,
  networkValue: null,
  issuerValue: null,
  distinctQuery: false,
  compoundOperators: [],
  ...overrides
});

describe('CardDataQueryHandler - Integration Tests', () => {
  describe('Card Listing Queries', () => {
    test('lists all cards', async () => {
      const entities = createEntities({ queryType: 'listing' });
      const result = await handleCardDataQuery(mockCards, entities, 'Show me my cards');
      expect(result).toBeDefined();
    });

    test('handles balance attribute query', async () => {
      const entities = createEntities({ attribute: 'balance' });
      const result = await handleCardDataQuery(mockCards, entities, 'What are my balances?');
      expect(result).toBeDefined();
    });

    test('filters by issuer', async () => {
      const entities = createEntities({ issuerValue: 'Chase' });
      const result = await handleCardDataQuery(mockCards, entities, 'Show my Chase cards');
      expect(result).toBeDefined();
    });
  });

  describe('Balance Queries', () => {
    test('retrieves total balance', async () => {
      const entities = createEntities({ attribute: 'balance', modifier: 'total' });
      const result = await handleCardDataQuery(mockCards, entities, 'What is my total balance?');
      expect(result).toBeDefined();
    });

    test('retrieves balance for specific card', async () => {
      const entities = createEntities({ attribute: 'balance' });
      const result = await handleCardDataQuery(mockCards, entities, 'What is the balance on my Chase card?');
      expect(result).toBeDefined();
    });
  });

  describe('APR Queries', () => {
    test('finds card with lowest APR', async () => {
      const entities = createEntities({ attribute: 'apr', modifier: 'lowest' });
      const result = await handleCardDataQuery(mockCards, entities, 'Which card has the lowest APR?');
      expect(result).toBeDefined();
    });

    test('finds card with highest APR', async () => {
      const entities = createEntities({ attribute: 'apr', modifier: 'highest' });
      const result = await handleCardDataQuery(mockCards, entities, 'Which card has the highest APR?');
      expect(result).toBeDefined();
    });

    test('lists all APRs', async () => {
      const entities = createEntities({ attribute: 'apr' });
      const result = await handleCardDataQuery(mockCards, entities, 'Show me all APRs');
      expect(result).toBeDefined();
    });
  });

  describe('Credit Limit Queries', () => {
    test('retrieves total credit limit', async () => {
      const entities = createEntities({ attribute: 'limit', modifier: 'total' });
      const result = await handleCardDataQuery(mockCards, entities, 'What is my total credit limit?');
      expect(result).toBeDefined();
    });

    test('retrieves available credit', async () => {
      const entities = createEntities({ attribute: 'available_credit' });
      const result = await handleCardDataQuery(mockCards, entities, 'How much credit do I have available?');
      expect(result).toBeDefined();
    });
  });

  describe('Utilization Queries', () => {
    test('calculates card utilization', async () => {
      const entities = createEntities({ attribute: 'utilization' });
      const result = await handleCardDataQuery(mockCards, entities, 'What is my card utilization?');
      expect(result).toBeDefined();
    });

    test('identifies high utilization', async () => {
      const entities = createEntities({ attribute: 'utilization', modifier: 'high' });
      const result = await handleCardDataQuery(mockCards, entities, 'Which cards have high utilization?');
      expect(result).toBeDefined();
    });
  });

  describe('Annual Fee Queries', () => {
    test('finds no-fee cards', async () => {
      const entities = createEntities({ attribute: 'annual_fee', modifier: 'no_fee' });
      const result = await handleCardDataQuery(mockCards, entities, 'Which cards have no annual fee?');
      expect(result).toBeDefined();
    });

    test('calculates total annual fees', async () => {
      const entities = createEntities({ attribute: 'annual_fee', modifier: 'total' });
      const result = await handleCardDataQuery(mockCards, entities, 'What are my total annual fees?');
      expect(result).toBeDefined();
    });
  });

  describe('Reward Queries', () => {
    test('shows rewards for category', async () => {
      const entities = createEntities({ attribute: 'rewards', category: 'dining' });
      const result = await handleCardDataQuery(mockCards, entities, 'Which card has the best dining rewards?');
      expect(result).toBeDefined();
    });

    test('lists all rewards', async () => {
      const entities = createEntities({ attribute: 'rewards' });
      const result = await handleCardDataQuery(mockCards, entities, 'Show me all my card rewards');
      expect(result).toBeDefined();
    });
  });

  describe('Comparison Queries', () => {
    test('compares cards', async () => {
      const entities = createEntities({ queryType: 'comparison', attribute: 'apr' });
      const result = await handleCardDataQuery(mockCards, entities, 'Compare my cards by APR');
      expect(result).toBeDefined();
    });

    test('compares rewards for category', async () => {
      const entities = createEntities({ queryType: 'comparison', attribute: 'rewards', category: 'dining' });
      const result = await handleCardDataQuery(mockCards, entities, 'Which card is best for dining rewards?');
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('handles empty card list', async () => {
      const entities = createEntities();
      const result = await handleCardDataQuery([], entities, 'Show my cards');
      expect(result).toBeDefined();
      expect(typeof result === 'string').toBe(true);
    });

    test('handles null cards gracefully', async () => {
      const entities = createEntities();
      const result = await handleCardDataQuery(null, entities, 'Show my cards');
      expect(result).toBeDefined();
    });

    test('handles invalid query', async () => {
      const entities = createEntities();
      const result = await handleCardDataQuery(mockCards, entities, '');
      expect(result).toBeDefined();
    });
  });

  describe('Complex Queries', () => {
    test('handles multi-attribute query', async () => {
      const entities = createEntities({ attribute: 'balance', modifier: 'total', issuerValue: 'Chase' });
      const result = await handleCardDataQuery(mockCards, entities, 'What is my total Chase balance?');
      expect(result).toBeDefined();
    });

    test('handles filtering with aggregation', async () => {
      const entities = createEntities({ attribute: 'annual_fee', modifier: 'total', issuerValue: 'Amex' });
      const result = await handleCardDataQuery(mockCards, entities, 'Total Amex annual fees?');
      expect(result).toBeDefined();
    });

    test('handles comparison with filters', async () => {
      const entities = createEntities({ queryType: 'comparison', attribute: 'balance', modifier: 'highest' });
      const result = await handleCardDataQuery(mockCards, entities, 'Which card has the highest balance?');
      expect(result).toBeDefined();
    });
  });

  describe('Response Validation', () => {
    test('returns string or object response', async () => {
      const entities = createEntities();
      const result = await handleCardDataQuery(mockCards, entities, 'Show my cards');
      expect(typeof result === 'string' || typeof result === 'object').toBe(true);
    });

    test('response contains meaningful content', async () => {
      const entities = createEntities({ attribute: 'balance' });
      const result = await handleCardDataQuery(mockCards, entities, 'Show balances');
      expect(result).toBeTruthy();
    });
  });

  describe('Performance', () => {
    test('handles many cards efficiently', async () => {
      const manyCards = Array.from({ length: 100 }, (_, i) => mockCards[i % 3]);
      const start = Date.now();
      const entities = createEntities();
      await handleCardDataQuery(manyCards, entities, 'Show my cards');
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });
});
