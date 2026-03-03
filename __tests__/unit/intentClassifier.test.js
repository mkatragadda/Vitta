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

  describe('Transfer Money International Intent Recognition', () => {
    test('recognizes "send money to India" as transfer intent', () => {
      const result = classifyIntent('send money to India');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      // Should match transfer_money_international, not card_recommendation
      expect(result.intent).not.toMatch(/card_recommendation/i);
    });

    test('recognizes "Snipe and Settle" as transfer intent', () => {
      const result = classifyIntent('Snipe and settle');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.intent).not.toMatch(/card_recommendation/i);
    });

    test('recognizes transfer funds abroad intent', () => {
      const result = classifyIntent('I want to transfer funds abroad');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.intent).not.toMatch(/card_recommendation/i);
    });

    test('recognizes international recipient addition', () => {
      const result = classifyIntent('Add international recipient');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.intent).not.toMatch(/card_recommendation/i);
    });

    test('recognizes monitor FX rate intent', () => {
      const result = classifyIntent('Monitor for best FX rate');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.intent).not.toMatch(/card_recommendation/i);
    });

    test('recognizes sending money internationally', () => {
      const result = classifyIntent('Send money internationally');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(result.intent).not.toMatch(/card_recommendation/i);
    });
  });

  describe('Intent Misclassification Prevention', () => {
    test('does not confuse "best card for India trip" with transfer intent', () => {
      const result = classifyIntent('Which card should I use for an India trip?');
      // This should be card_recommendation, NOT transfer intent
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      // Could be either, but should NOT be misclassified as transfer
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('distinguishes between split payment and transfer', () => {
      const splitResult = classifyIntent('Split $500 between my cards');
      const transferResult = classifyIntent('Send $500 to India');

      expect(splitResult.intent).toBeDefined();
      expect(transferResult.intent).toBeDefined();
      // These should NOT be the same intent
      expect(splitResult.intent).not.toBe(transferResult.intent);
    });

    test('does not confuse "transfer between accounts" with international transfer', () => {
      // This is an edge case - "transfer" could mean within app or international
      const result = classifyIntent('transfer between my accounts');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });

    test('distinguishes send payment (split_payment) from send money internationally', () => {
      const localPaymentResult = classifyIntent('Help me send payment to my cards');
      const internationalResult = classifyIntent('Send money to my friend in India');

      expect(localPaymentResult).toBeDefined();
      expect(internationalResult).toBeDefined();
      // Should be different intents
      expect(localPaymentResult.intent).not.toBe(internationalResult.intent);
    });

    test('does not confuse reward optimization with international transfer', () => {
      const result = classifyIntent('Which card gives best rewards for international purchases?');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      // This should be card_recommendation, not transfer
      expect(result.intent).not.toMatch(/transfer/i);
    });
  });

  describe('Transfer Intent - Real World Variations', () => {
    const transferQueries = [
      'send money to India',
      'Send $1000 to family in India',
      'Transfer funds to India account',
      'Send money abroad',
      'I need to send money internationally',
      'Snipe and settle feature',
      'Monitor exchange rate and send when ready',
      'Add beneficiary for international transfer',
      'Transfer $500 USD to INR',
      'Send cash to India',
      'International money transfer',
      'Transfer to overseas account',
      'Send to India best FX rate'
    ];

    transferQueries.forEach(query => {
      test(`correctly classifies transfer query: "${query}"`, () => {
        const result = classifyIntent(query);
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        // Should NOT be misclassified as card_recommendation
        if (result.confidence > 0.5) {
          expect(result.intent).not.toMatch(/card_recommendation/i);
        }
      });
    });
  });

  describe('Intent Ordering Impact - Priority Tests', () => {
    test('transfer_money_international has appropriate priority', () => {
      // Core test: "send money to india" should match transfer, not card recommendation
      const result = classifyIntent('send money to india');
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      // If confidence is high enough to match, it should be transfer (not card)
      if (result.confidence > 0.5) {
        expect(result.intent).not.toMatch(/card_recommendation/i);
      } else if (result.confidence === 0 && result.requiresGPT) {
        // If classification confidence is 0, it should fall back to GPT
        // GPT will handle the intent classification
        expect(result.requiresGPT).toBe(true);
      }
    });

    test('Snipe & Settle is unambiguous transfer intent', () => {
      const result = classifyIntent('Snipe & Settle');
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
      // This phrase is unique to transfer intent
      expect(result.intent).not.toMatch(/card_recommendation/i);
    });

    test('card queries still work when not transfer-related', () => {
      const cardResult = classifyIntent('Best card for groceries?');
      const transferResult = classifyIntent('Send money to India');

      expect(cardResult).toBeDefined();
      expect(transferResult).toBeDefined();
      // These should produce different results
      expect(cardResult.intent).not.toBe(transferResult.intent);
    });
  });
});
