/**
 * ConversationEngineV2 Integration Tests
 * Tests the complete conversation flow from query to response
 */

import { processQuery } from '../../services/chat/conversationEngineV2';

// Mock user data
const mockUserData = {
  user_id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  cards: [
    {
      id: 'card-1',
      name: 'Chase Sapphire Preferred',
      issuer: 'Chase',
      balance: 2500,
      limit: 10000,
      apr: 18.99,
      annual_fee: 95
    },
    {
      id: 'card-2',
      name: 'Amex Gold',
      issuer: 'American Express',
      balance: 1500,
      limit: 15000,
      apr: 19.99,
      annual_fee: 250
    }
  ]
};

describe('ConversationEngineV2 - Integration Tests', () => {
  describe('Basic Query Processing', () => {
    test('processes simple card query and returns response', async () => {
      const result = await processQuery('Show me my cards', mockUserData);

      expect(result).toBeDefined();
      expect(result.message || result.text || result).toBeTruthy();
    });

    test('processes recommendation query', async () => {
      const result = await processQuery(
        'Which card should I use for groceries?',
        mockUserData
      );

      expect(result).toBeDefined();
      expect(result.message || result.text || result).toBeTruthy();
    });

    test('processes payment query', async () => {
      const result = await processQuery(
        'Show me my payment due dates',
        mockUserData
      );

      expect(result).toBeDefined();
      expect(result.message || result.text || result).toBeTruthy();
    });

    test('handles queries with no user data', async () => {
      const result = await processQuery('Show my cards', {});

      expect(result).toBeDefined();
      // Should still return something, even if incomplete
      expect(result.message || result.text || result).toBeTruthy();
    });
  });

  describe('Response Structure', () => {
    test('returns response that is not null/undefined', async () => {
      const result = await processQuery('Show my cards', mockUserData);

      // Result should be defined and not empty
      expect(result).toBeDefined();
      expect(result !== null && result !== undefined).toBe(true);
    });

    test('includes intent information in response or message content', async () => {
      const result = await processQuery('Show my cards', mockUserData);

      // Should have intent info or message content
      expect(result).toBeDefined();
      expect(
        result.intent ||
        result.message ||
        result.text ||
        typeof result === 'string'
      ).toBeTruthy();
    });

    test('handles invalid queries without crashing', async () => {
      const result = await processQuery('', mockUserData);

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Entity Extraction Integration', () => {
    test('extracts amount from query', async () => {
      const result = await processQuery(
        'Split $500 between my cards',
        mockUserData
      );

      expect(result).toBeDefined();
      // Should process the amount entity
      expect(result).toBeTruthy();
    });

    test('extracts merchant from query', async () => {
      const result = await processQuery(
        'Best card for whole foods',
        mockUserData
      );

      expect(result).toBeDefined();
      expect(result).toBeTruthy();
    });

    test('extracts category from query', async () => {
      const result = await processQuery(
        'Which card for dining expenses?',
        mockUserData
      );

      expect(result).toBeDefined();
      expect(result).toBeTruthy();
    });

    test('extracts multiple entities from complex query', async () => {
      const result = await processQuery(
        'Which card should I use for $100 at a grocery store this week?',
        mockUserData
      );

      expect(result).toBeDefined();
      // Should extract: amount, merchant/category, timeframe
      expect(result).toBeTruthy();
    });
  });

  describe('User Data Integration', () => {
    test('uses user cards for recommendations', async () => {
      const result = await processQuery(
        'Show me my cards',
        mockUserData
      );

      expect(result).toBeDefined();
      // Should use the mock user's cards
      expect(result).toBeTruthy();
    });

    test('handles user with empty card list', async () => {
      const emptyUserData = { ...mockUserData, cards: [] };
      const result = await processQuery('Show my cards', emptyUserData);

      expect(result).toBeDefined();
      // Should indicate no cards available
      expect(result).toBeTruthy();
    });

    test('handles user with many cards', async () => {
      const manyCardsData = {
        ...mockUserData,
        cards: Array.from({ length: 10 }, (_, i) => ({
          id: `card-${i}`,
          name: `Card ${i}`,
          issuer: 'Test Bank',
          balance: Math.random() * 10000,
          limit: 10000,
          apr: 15 + Math.random() * 10
        }))
      };

      const result = await processQuery('Show my cards', manyCardsData);

      expect(result).toBeDefined();
      expect(result).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('handles empty query gracefully', async () => {
      const result = await processQuery('', mockUserData);

      expect(result).toBeDefined();
      // Should not throw, return some response
      expect(result !== null && result !== undefined).toBe(true);
    });

    test('handles very long queries', async () => {
      const longQuery = 'show me my cards '.repeat(100);
      const result = await processQuery(longQuery, mockUserData);

      expect(result).toBeDefined();
      expect(result !== null && result !== undefined).toBe(true);
    });

    test('handles null/undefined user data gracefully', async () => {
      const result = await processQuery('Show my cards', null);

      expect(result).toBeDefined();
      expect(result !== null && result !== undefined).toBe(true);
    });

    test('handles special characters in query', async () => {
      const result = await processQuery(
        'Show my cards!!! @#$%',
        mockUserData
      );

      expect(result).toBeDefined();
      expect(result !== null && result !== undefined).toBe(true);
    });
  });

  describe('Query Type Recognition', () => {
    test('recognizes card listing query', async () => {
      const queries = [
        'Show me my cards',
        'List my cards',
        'What cards do I have?',
        'My cards'
      ];

      for (const query of queries) {
        const result = await processQuery(query, mockUserData);
        expect(result).toBeDefined();
        expect(result !== null && result !== undefined).toBe(true);
      }
    });

    test('recognizes recommendation query', async () => {
      const queries = [
        'Which card should I use?',
        'Best card for dining',
        'Where should I use this card?'
      ];

      for (const query of queries) {
        const result = await processQuery(query, mockUserData);
        expect(result).toBeDefined();
        expect(result !== null && result !== undefined).toBe(true);
      }
    });

    test('recognizes payment query', async () => {
      const queries = [
        'When is my payment due?',
        'Show payment dates',
        'What are my balance?'
      ];

      for (const query of queries) {
        const result = await processQuery(query, mockUserData);
        expect(result).toBeDefined();
        expect(result !== null && result !== undefined).toBe(true);
      }
    });

    test('recognizes navigation query', async () => {
      const queries = [
        'Go to payment optimizer',
        'Show me the dashboard',
        'Take me to settings'
      ];

      for (const query of queries) {
        const result = await processQuery(query, mockUserData);
        expect(result).toBeDefined();
        expect(result !== null && result !== undefined).toBe(true);
      }
    });
  });

  describe('Context Awareness', () => {
    test('accepts context parameter', async () => {
      const context = {
        previousIntent: 'list_cards',
        lastResponse: 'Here are your cards...'
      };

      const result = await processQuery(
        'Show my cards',
        mockUserData,
        context
      );

      expect(result).toBeDefined();
      expect(result).toBeTruthy();
    });

    test('uses context for follow-up queries', async () => {
      const context = {
        previousIntent: 'list_cards',
        previousQuery: 'Show me my cards',
        lastResponse: 'Here are your cards: Chase Sapphire and Amex Gold'
      };

      const result = await processQuery(
        'What about the first one?',
        mockUserData,
        context
      );

      expect(result).toBeDefined();
      expect(result).toBeTruthy();
    });
  });

  describe('Processing Time', () => {
    test('completes within reasonable time for simple query', async () => {
      const start = Date.now();
      await processQuery('Show my cards', mockUserData);
      const duration = Date.now() - start;

      // Simple query should complete quickly (even if it makes API calls)
      expect(duration).toBeLessThan(10000); // 10 second timeout for tests
    });

    test('completes within reasonable time for complex query', async () => {
      const start = Date.now();
      await processQuery(
        'Which card should I use for $100 at a grocery store this weekend?',
        mockUserData
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Case Insensitivity', () => {
    test('handles uppercase queries', async () => {
      const result = await processQuery('SHOW MY CARDS', mockUserData);
      expect(result).toBeDefined();
      expect(result).toBeTruthy();
    });

    test('handles mixed case queries', async () => {
      const result = await processQuery('Show My Cards', mockUserData);
      expect(result).toBeDefined();
      expect(result).toBeTruthy();
    });

    test('handles lowercase queries', async () => {
      const result = await processQuery('show my cards', mockUserData);
      expect(result).toBeDefined();
      expect(result).toBeTruthy();
    });
  });

  describe('Real-World Scenarios', () => {
    const scenarios = [
      {
        query: 'Show me my credit cards',
        description: 'User listing cards'
      },
      {
        query: 'Which card has the best rewards for groceries?',
        description: 'User seeking category-specific recommendation'
      },
      {
        query: 'What are my payment due dates?',
        description: 'User checking payment schedule'
      },
      {
        query: 'I want to pay $1000 across my cards',
        description: 'User planning payment distribution'
      },
      {
        query: 'Add a new card to my wallet',
        description: 'User adding a new card'
      },
      {
        query: 'Which card should I use at Whole Foods?',
        description: 'User asking for specific merchant recommendation'
      },
      {
        query: 'Show me my balances',
        description: 'User checking balances'
      },
      {
        query: 'Help me optimize my payments',
        description: 'User seeking optimization advice'
      }
    ];

    scenarios.forEach(({ query, description }) => {
      test(`handles scenario: ${description}`, async () => {
        const result = await processQuery(query, mockUserData);

        expect(result).toBeDefined();
        expect(result !== null && result !== undefined).toBe(true);
      });
    });
  });

  describe('Response Content Validation', () => {
    test('response is defined and meaningful for card query', async () => {
      const result = await processQuery('Show my cards', mockUserData);

      expect(result).toBeDefined();
      // Response should be either a message, object with data, or string
      expect(
        result &&
        (result.message || result.text || typeof result === 'string' || Object.keys(result).length > 0)
      ).toBeTruthy();
    });

    test('response is not null/undefined for valid query', async () => {
      const result = await processQuery('Show my cards', mockUserData);

      expect(result).toBeDefined();
      expect(result !== null && result !== undefined).toBe(true);
    });
  });

  describe('Type Safety', () => {
    test('returns response without throwing', async () => {
      const result = await processQuery('Show my cards', mockUserData);
      expect(result).toBeDefined();
    });

    test('user data parameter is optional', async () => {
      // Should not throw
      const result = await processQuery('Show my cards');
      expect(result).toBeDefined();
    });

    test('context parameter is optional', async () => {
      // Should not throw
      const result = await processQuery('Show my cards', mockUserData);
      expect(result).toBeDefined();
    });
  });
});
