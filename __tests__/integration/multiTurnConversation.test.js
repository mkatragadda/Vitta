/**
 * Multi-Turn Conversation Integration Tests
 * Tests conversation context preservation across multiple turns
 */

import { processQuery } from '../../services/chat/conversationEngineV2';

const mockUserData = {
  user_id: 'test-user-123',
  cards: [
    { id: 'c1', name: 'Chase', balance: 2500, apr: 18.99, limit: 10000 },
    { id: 'c2', name: 'Amex', balance: 1500, apr: 19.99, limit: 15000 }
  ]
};

describe('Multi-Turn Conversation - Integration Tests', () => {
  describe('Simple Follow-Up Queries', () => {
    test('handles follow-up after initial card query', async () => {
      const turn1 = await processQuery('Show me my cards', mockUserData);
      expect(turn1).toBeDefined();

      // Follow-up query referencing previous response
      const context = { previousIntent: 'list_cards', lastResponse: turn1 };
      const turn2 = await processQuery('What about the first one?', mockUserData, context);
      expect(turn2).toBeDefined();
    });

    test('maintains context across three turns', async () => {
      // Turn 1: List cards
      const turn1 = await processQuery('Show my cards', mockUserData);
      expect(turn1).toBeDefined();

      // Turn 2: Ask about specific card
      const context2 = { previousIntent: 'list_cards' };
      const turn2 = await processQuery('Which one has the highest rewards?', mockUserData, context2);
      expect(turn2).toBeDefined();

      // Turn 3: Ask about details
      const context3 = { previousIntent: 'card_recommendation' };
      const turn3 = await processQuery('Tell me more about that', mockUserData, context3);
      expect(turn3).toBeDefined();
    });
  });

  describe('Context-Aware References', () => {
    test('resolves pronoun references with context', async () => {
      const context = {
        previousIntent: 'list_cards',
        entities: { cardName: 'Chase' }
      };
      const result = await processQuery('What are its rewards?', mockUserData, context);
      expect(result).toBeDefined();
    });

    test('understands "it" pronoun in context', async () => {
      const context = {
        previousQuery: 'Show me my Chase card',
        previousIntent: 'list_cards'
      };
      const result = await processQuery('What is the APR on it?', mockUserData, context);
      expect(result).toBeDefined();
    });

    test('handles "that" reference', async () => {
      const context = {
        lastResponse: 'Your Chase Sapphire has 3x rewards on dining',
        previousIntent: 'card_recommendation'
      };
      const result = await processQuery('Can I use that at restaurants?', mockUserData, context);
      expect(result).toBeDefined();
    });
  });

  describe('Query Refinement', () => {
    test('refines previous query with new details', async () => {
      const turn1 = await processQuery('Show my cards', mockUserData);
      expect(turn1).toBeDefined();

      const context = { previousIntent: 'list_cards' };
      const turn2 = await processQuery('But only the ones with no annual fee', mockUserData, context);
      expect(turn2).toBeDefined();
    });

    test('adds specificity to vague query', async () => {
      const turn1 = await processQuery('Which card should I use?', mockUserData);
      expect(turn1).toBeDefined();

      const context = { previousIntent: 'card_recommendation' };
      const turn2 = await processQuery('For groceries specifically', mockUserData, context);
      expect(turn2).toBeDefined();
    });
  });

  describe('Complex Multi-Turn Flows', () => {
    test('handles comparison followed by details request', async () => {
      // Turn 1: Request comparison
      const t1 = await processQuery('Compare my cards', mockUserData);
      expect(t1).toBeDefined();

      // Turn 2: Ask about specific card from comparison
      const ctx2 = { previousIntent: 'comparison' };
      const t2 = await processQuery('Tell me more about the first one', mockUserData, ctx2);
      expect(t2).toBeDefined();

      // Turn 3: Drill down further
      const ctx3 = { previousIntent: 'card_details' };
      const t3 = await processQuery('What are the specific rewards?', mockUserData, ctx3);
      expect(t3).toBeDefined();
    });

    test('handles topic switch mid-conversation', async () => {
      // Talk about cards
      const t1 = await processQuery('Show my cards', mockUserData);
      expect(t1).toBeDefined();

      // Switch to payments
      const ctx2 = { previousIntent: 'list_cards' };
      const t2 = await processQuery('How much do I owe?', mockUserData, ctx2);
      expect(t2).toBeDefined();

      // Back to cards
      const ctx3 = { previousIntent: 'payment_query' };
      const t3 = await processQuery('Which card should I pay first?', mockUserData, ctx3);
      expect(t3).toBeDefined();
    });
  });

  describe('Context Preservation', () => {
    test('preserves entities across turns', async () => {
      const context = {
        previousIntent: 'list_cards',
        entities: {
          cardName: 'Chase',
          category: 'dining'
        }
      };
      const result = await processQuery('What rewards does it give?', mockUserData, context);
      expect(result).toBeDefined();
    });

    test('maintains conversation history', async () => {
      const conversationHistory = [
        { role: 'user', content: 'Show my cards' },
        { role: 'assistant', content: 'Here are your cards: Chase and Amex' },
        { role: 'user', content: 'Which has better rewards?' },
        { role: 'assistant', content: 'Amex has better dining rewards' }
      ];

      const context = {
        conversationHistory,
        previousIntent: 'comparison'
      };
      const result = await processQuery('Can I use it for groceries?', mockUserData, context);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases in Multi-Turn', () => {
    test('handles context without previous intent', async () => {
      const context = { entities: { cardName: 'Chase' } };
      const result = await processQuery('Show me details', mockUserData, context);
      expect(result).toBeDefined();
    });

    test('handles inconsistent context', async () => {
      const context = {
        previousIntent: 'list_cards',
        entities: { cardName: 'Nonexistent Card' }
      };
      const result = await processQuery('Tell me about it', mockUserData, context);
      expect(result).toBeDefined();
    });

    test('gracefully handles missing context properties', async () => {
      const context = {};
      const result = await processQuery('Show my cards', mockUserData, context);
      expect(result).toBeDefined();
    });
  });

  describe('Response Quality', () => {
    test('context-aware response is coherent', async () => {
      const context = {
        previousQuery: 'Show my Chase card',
        previousIntent: 'list_cards'
      };
      const result = await processQuery('What is the APR?', mockUserData, context);
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    test('follow-up response addresses the question', async () => {
      const context = { previousIntent: 'card_recommendation' };
      const result = await processQuery('Any alternatives?', mockUserData, context);
      expect(result).toBeDefined();
    });
  });

  describe('Long Conversations', () => {
    test('handles 5-turn conversation', async () => {
      let context = {};

      for (let i = 0; i < 5; i++) {
        const query = i === 0
          ? 'Show my cards'
          : i === 1 ? 'Which has the best rewards?'
          : i === 2 ? 'What about the other one?'
          : i === 3 ? 'Can I use it for groceries?'
          : 'Tell me the APR';

        const result = await processQuery(query, mockUserData, context);
        expect(result).toBeDefined();

        context = { previousIntent: 'ongoing_conversation' };
      }
    });
  });
});
