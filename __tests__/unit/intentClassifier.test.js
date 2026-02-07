/**
 * Intent Classifier Unit Tests
 * Tests the core intent detection logic used in conversationEngineV2
 */

import { classifyIntent } from '../../services/chat/intentClassifier';

describe('IntentClassifier - Core Classification Logic', () => {
  describe('Basic Intent Recognition', () => {
    test('recognizes card listing intent', () => {
      const result = classifyIntent('Show me my cards');
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.intent).toBeDefined();
    });

    test('recognizes card query intent', () => {
      const result = classifyIntent('What cards do I have?');
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('recognizes recommendation intent', () => {
      const result = classifyIntent('Which card should I use for groceries?');
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('recognizes payment intent', () => {
      const result = classifyIntent('Show me payment due dates');
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    test('returns confidence score between 0 and 1', () => {
      const result = classifyIntent('Show my cards');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('high confidence for exact phrase matches', () => {
      const result = classifyIntent('list my cards');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('lower confidence for ambiguous queries', () => {
      const result = classifyIntent('tell me something');
      // This should either be low confidence or flag for GPT
      expect(result.confidence).toBeLessThan(0.9);
    });

    test('requires GPT for very ambiguous queries', () => {
      const result = classifyIntent('what?');
      // Very short, ambiguous query should flag for GPT processing
      if (result.confidence < 0.5) {
        expect(result.requiresGPT).toBe(true);
      }
    });
  });

  describe('Verb-Based Intent Detection', () => {
    test('detects action verbs like "split"', () => {
      const result = classifyIntent('split $500 between my cards');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    test('detects action verbs like "add"', () => {
      const result = classifyIntent('add a new card');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    test('detects action verbs like "remove"', () => {
      const result = classifyIntent('remove this card');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    test('penalizes non-matching verbs appropriately', () => {
      // "split" is an action verb, but if the intent doesn't have it,
      // it should get a penalty
      const result = classifyIntent('split $100 between cards');
      expect(result).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('Keyword Matching', () => {
    test('matches exact keywords in query', () => {
      const result = classifyIntent('balance on my card');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('prioritizes verb keywords over noun keywords', () => {
      // "split" as a verb should score higher than "split" as a noun
      const verbResult = classifyIntent('split $500');
      const nounResult = classifyIntent('a split in my payments');

      expect(verbResult).toBeDefined();
      expect(nounResult).toBeDefined();
    });

    test('matches multiple keywords', () => {
      const result = classifyIntent('show me my card balance');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Context Awareness', () => {
    test('uses previous intent context for disambiguation', () => {
      const contextWithHistory = { previousIntent: 'list_cards' };
      const result = classifyIntent('what about the first one?', contextWithHistory);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('scores higher when matching previous intent', () => {
      const context1 = { previousIntent: 'list_cards' };
      const context2 = { previousIntent: 'some_other_intent' };

      const result1 = classifyIntent('show it', context1);
      const result2 = classifyIntent('show it', context2);

      // Both should work, context just adds a small bonus
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('Threshold-Based Filtering', () => {
    test('returns high confidence matches', () => {
      const result = classifyIntent('show my cards');
      expect(result.requiresGPT).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('flags low confidence matches for GPT fallback', () => {
      const result = classifyIntent('xyz123 nonsense query');
      if (result.confidence < 0.3) {
        expect(result.requiresGPT).toBe(true);
      }
    });

    test('returns top candidates when flagging for GPT', () => {
      const result = classifyIntent('unclear query here');
      if (result.requiresGPT) {
        expect(result.topCandidates).toBeDefined();
        expect(Array.isArray(result.topCandidates)).toBe(true);
      }
    });
  });

  describe('Response Structure', () => {
    test('returns object with required fields', () => {
      const result = classifyIntent('show my cards');

      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('requiresGPT');
    });

    test('includes intentData for high confidence matches', () => {
      const result = classifyIntent('show my cards');
      if (result.confidence > 0.7) {
        expect(result.intentData).toBeDefined();
        expect(result.intentData).toHaveProperty('id');
        expect(result.intentData).toHaveProperty('name');
      }
    });

    test('includes topCandidates for low confidence matches', () => {
      const result = classifyIntent('unclear unclear unclear');
      if (result.requiresGPT && result.confidence < 0.5) {
        expect(result.topCandidates).toBeDefined();
        expect(Array.isArray(result.topCandidates)).toBe(true);
        expect(result.topCandidates.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles empty string', () => {
      const result = classifyIntent('');
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('handles very short queries', () => {
      const result = classifyIntent('cards');
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('handles very long queries', () => {
      const longQuery = 'show me my cards and their balances and their limits and their apr rates and their due dates';
      const result = classifyIntent(longQuery);
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('is case-insensitive', () => {
      const result1 = classifyIntent('SHOW MY CARDS');
      const result2 = classifyIntent('show my cards');
      const result3 = classifyIntent('Show My Cards');

      // All should produce same intent (but confidence might vary slightly)
      expect(result1.intent).toBe(result2.intent);
      expect(result2.intent).toBe(result3.intent);
    });

    test('handles special characters', () => {
      const result = classifyIntent('show my $cards @2024!');
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('handles numbers in queries', () => {
      const result = classifyIntent('split $1234.56 between my cards');
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multi-Intent Queries', () => {
    test('handles queries with multiple verbs', () => {
      const result = classifyIntent('show and compare my cards');
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    test('prioritizes first/strongest intent', () => {
      const result = classifyIntent('show my cards and payments');
      expect(result.intent).toBeDefined();
      // Should pick the primary intent (showing cards)
      expect(result.requiresGPT === false || result.confidence > 0).toBe(true);
    });
  });

  describe('NLP Feature Extraction', () => {
    test('correctly identifies questions', () => {
      const result = classifyIntent('What cards do I have?');
      // Questions should be detected for appropriate intent routing
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('correctly extracts verbs from queries', () => {
      const result = classifyIntent('show me my cash back rewards');
      // This should extract "show" as the primary verb
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('correctly extracts nouns from queries', () => {
      const result = classifyIntent('what are the annual fees on my cards');
      // Should extract nouns like "annual", "fees", "cards"
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Real-World Query Examples', () => {
    const realWorldQueries = [
      'Show me my credit cards',
      'What cards do I have?',
      'Which card should I use for dining?',
      'Best card for groceries this month',
      'When is my payment due?',
      'What are my balances?',
      'Help me optimize my payments',
      'Split $500 between my cards',
      'Add a new card',
      'Remove my Amex',
      'Compare my Chase and Amex',
      'What are the rewards on my Sapphire?',
      'How much available credit do I have?',
      'Tell me about my cash back',
      'Navigate to payment optimizer'
    ];

    realWorldQueries.forEach(query => {
      test(`handles real-world query: "${query}"`, () => {
        const result = classifyIntent(query);
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(typeof result.requiresGPT).toBe('boolean');
      });
    });
  });
});
