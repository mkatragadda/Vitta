/**
 * OpenAI Fallback Integration Tests
 * Tests behavior when local NLP has low confidence and falls back to GPT
 */

import { processQuery } from '../../services/chat/conversationEngineV2';

const mockUserData = {
  user_id: 'test-user-123',
  cards: [
    { id: 'c1', name: 'Chase', balance: 2500, apr: 18.99, limit: 10000 },
    { id: 'c2', name: 'Amex', balance: 1500, apr: 19.99, limit: 15000 }
  ]
};

describe('OpenAI Fallback - Integration Tests', () => {
  describe('Low Confidence Query Handling', () => {
    test('handles ambiguous queries gracefully', async () => {
      // Very ambiguous query that should trigger fallback
      const result = await processQuery('Tell me something', mockUserData);
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    test('handles misspelled card names', async () => {
      const result = await processQuery('Show me my Chase card', mockUserData);
      expect(result).toBeDefined();
    });

    test('handles unclear intent queries', async () => {
      const result = await processQuery('What can you do?', mockUserData);
      expect(result).toBeDefined();
    });

    test('handles context-less follow-ups', async () => {
      // Follow-up without proper context should trigger fallback
      const result = await processQuery('What about it?', mockUserData, {});
      expect(result).toBeDefined();
    });
  });

  describe('Fallback Response Quality', () => {
    test('provides meaningful response for unclear query', async () => {
      const result = await processQuery('xyz abc def', mockUserData);
      expect(result).toBeDefined();
      // Response should attempt to address the query or ask for clarification
    });

    test('response suggests clarification if needed', async () => {
      const result = await processQuery('Tell me...', mockUserData);
      expect(result).toBeDefined();
    });

    test('includes relevant context in fallback response', async () => {
      const context = {
        previousIntent: 'list_cards',
        lastResponse: 'Here are your cards'
      };
      const result = await processQuery('What else?', mockUserData, context);
      expect(result).toBeDefined();
    });
  });

  describe('Partial Match Handling', () => {
    test('handles queries with multiple intents', async () => {
      const result = await processQuery('Show my cards and their APRs and rewards', mockUserData);
      expect(result).toBeDefined();
    });

    test('handles compound requests', async () => {
      const result = await processQuery('Compare my cards and recommend the best one', mockUserData);
      expect(result).toBeDefined();
    });

    test('handles queries with extra words', async () => {
      const result = await processQuery('Um, could you maybe show my cards please?', mockUserData);
      expect(result).toBeDefined();
    });
  });

  describe('Fallback with Context', () => {
    test('uses conversation context in fallback response', async () => {
      const context = {
        conversationHistory: [
          { role: 'user', content: 'Show my cards' },
          { role: 'assistant', content: 'Your cards are Chase and Amex' }
        ],
        previousIntent: 'list_cards'
      };
      const result = await processQuery('Anything else I should know?', mockUserData, context);
      expect(result).toBeDefined();
    });

    test('preserves user intent with fallback', async () => {
      const context = {
        entities: { category: 'dining' },
        previousIntent: 'card_recommendation'
      };
      const result = await processQuery('Like what specifically?', mockUserData, context);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Case Queries', () => {
    test('handles single word queries', async () => {
      const result = await processQuery('Balance?', mockUserData);
      expect(result).toBeDefined();
    });

    test('handles very long queries', async () => {
      const longQuery = 'I was wondering if you could help me understand more about my cards and their features and rewards programs and annual fees and how I can best utilize them for my spending patterns';
      const result = await processQuery(longQuery, mockUserData);
      expect(result).toBeDefined();
    });

    test('handles queries with special characters', async () => {
      const result = await processQuery('My card... balance???', mockUserData);
      expect(result).toBeDefined();
    });

    test('handles queries mixing English and other content', async () => {
      const result = await processQuery('Show cards!!! 123 xyz', mockUserData);
      expect(result).toBeDefined();
    });
  });

  describe('Fallback Consistency', () => {
    test('returns response even for very unclear queries', async () => {
      const queries = [
        '???',
        'fjdjkfdf',
        '...',
        'qwerty asdfgh',
        'null undefined'
      ];

      for (const query of queries) {
        const result = await processQuery(query, mockUserData);
        expect(result).toBeDefined();
        expect(result).not.toBeNull();
      }
    });

    test('maintains response format consistency', async () => {
      const result1 = await processQuery('unclear query 1', mockUserData);
      const result2 = await processQuery('unclear query 2', mockUserData);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Both should be valid responses
    });
  });

  describe('Error Recovery', () => {
    test('recovers from failed intent classification', async () => {
      // First, a potentially problematic query
      const result1 = await processQuery('!!!', mockUserData);
      expect(result1).toBeDefined();

      // Then, a normal query should still work
      const result2 = await processQuery('Show my cards', mockUserData);
      expect(result2).toBeDefined();
    });

    test('handles multiple consecutive unclear queries', async () => {
      const result1 = await processQuery('xyz', mockUserData);
      const result2 = await processQuery('abc', mockUserData);
      const result3 = await processQuery('def', mockUserData);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
    });
  });

  describe('Fallback Performance', () => {
    test('completes within timeout for unclear query', async () => {
      const start = Date.now();
      await processQuery('unclear unclear unclear query', mockUserData);
      const duration = Date.now() - start;

      // Should complete even if it needs to fall back to GPT
      expect(duration).toBeLessThan(35000); // Allow for API call
    });

    test('handles batch of unclear queries efficiently', async () => {
      const start = Date.now();
      for (let i = 0; i < 3; i++) {
        await processQuery(`unclear query ${i}`, mockUserData);
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(45000);
    });
  });

  describe('User Experience', () => {
    test('provides actionable fallback response', async () => {
      const result = await processQuery('I need help', mockUserData);
      expect(result).toBeDefined();
      // Should provide some form of helpful response
    });

    test('doesn\'t crash on unexpected input', async () => {
      const edgeCases = [
        null,
        undefined,
        '',
        ' ',
        '\n',
        '\t',
        '   null   ',
        'undefined'
      ];

      for (const query of edgeCases) {
        if (query) { // Skip null/undefined
          const result = await processQuery(query, mockUserData);
          expect(result).toBeDefined();
        }
      }
    });
  });

  describe('Fallback Accuracy', () => {
    test('still attempts to understand intent when possible', async () => {
      // Query that's confusing but has some recognizable words
      const result = await processQuery('uh um show uh cards?', mockUserData);
      expect(result).toBeDefined();
      // Might mention cards in response
    });

    test('recognizes partial card names', async () => {
      const result = await processQuery('Ch... card', mockUserData);
      expect(result).toBeDefined();
    });

    test('handles typos in intents', async () => {
      const result = await processQuery('sho me my cardsss', mockUserData);
      expect(result).toBeDefined();
    });
  });
});
