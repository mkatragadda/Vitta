/**
 * Intent Classifier
 * Uses compromise.js for NLP-based intent classification
 */

import nlp from 'compromise';
import intentsData from '../../data/intents';

/**
 * Classify user intent from natural language query
 * @param {string} query - User's natural language query
 * @param {Object} context - Conversation context
 * @returns {Object} - Classified intent with confidence score
 */
export const classifyIntent = (query, context = {}) => {
  console.log('[IntentClassifier] Classifying:', query);

  const doc = nlp(query.toLowerCase());

  // Extract useful NLP features
  const verbs = doc.verbs().out('array');
  const nouns = doc.nouns().out('array');
  const questions = doc.questions().out('array');

  console.log('[IntentClassifier] Verbs:', verbs);
  console.log('[IntentClassifier] Nouns:', nouns);
  console.log('[IntentClassifier] Questions:', questions);

  // Define lowerQuery first
  const lowerQuery = query.toLowerCase();

  // Detect strong action verbs at the start of query
  const actionVerbs = ['split', 'distribute', 'allocate', 'divide', 'optimize', 'add', 'remove', 'delete'];
  const startsWithAction = actionVerbs.some(verb => lowerQuery.startsWith(verb + ' '));
  const firstVerb = verbs.length > 0 ? verbs[0].toLowerCase() : null;

  // Score each intent
  const scoredIntents = intentsData.map(intent => {
    let score = 0;
    const words = lowerQuery.split(/\s+/);

    // Pattern matching - exact phrase match (HIGHEST priority)
    intent.patterns.forEach(pattern => {
      const patternWords = pattern.toLowerCase().split(/\s+/);

      // Check if pattern is standalone phrase (not part of larger sentence)
      if (lowerQuery.includes(pattern.toLowerCase())) {
        // If query is EXACTLY the pattern or starts/ends with it, give full score
        if (lowerQuery === pattern.toLowerCase() ||
            lowerQuery.startsWith(pattern.toLowerCase() + ' ') ||
            lowerQuery.endsWith(' ' + pattern.toLowerCase())) {
          score += 20; // Maximum for exact standalone match
        } else {
          // Pattern found but embedded in larger query - lower score
          score += 10;
        }
      }
    });

    // Keyword matching
    let hasMatchingVerb = false;
    intent.keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();

      // Exact keyword match in query
      if (lowerQuery.includes(keywordLower)) {
        score += 3;
      }

      // Bonus: Keyword matched as a VERB (action word) - VERY strong signal
      if (verbs.some(verb => verb.toLowerCase().includes(keywordLower))) {
        score += 12; // Very high boost for verb match (split, distribute, etc.)
        hasMatchingVerb = true;
      }

      // Keyword in nouns - weaker signal
      if (nouns.some(noun => noun.toLowerCase().includes(keywordLower))) {
        score += 2;
      }
    });

    // PENALTY: If query starts with strong action verb but this intent doesn't have matching verb
    // This prevents "split 1500 between my cards" from matching "list cards"
    if (startsWithAction && !hasMatchingVerb && firstVerb && !intent.keywords.includes(firstVerb)) {
      score = Math.max(0, score - 15); // Heavy penalty
    }

    // Context bonus - if previous intent was similar
    if (context.previousIntent === intent.id) {
      score += 2;
    }

    // Simple confidence based on raw score
    // Score of 15+ is good confidence
    const confidence = Math.min(score / 20, 1);

    return {
      ...intent,
      score,
      confidence
    };
  });

  // Sort by score
  scoredIntents.sort((a, b) => b.score - a.score);

  const topIntent = scoredIntents[0];

  console.log('[IntentClassifier] Top 3 intents:');
  scoredIntents.slice(0, 3).forEach(intent => {
    console.log(`  - ${intent.name}: ${intent.confidence.toFixed(2)} (score: ${intent.score})`);
  });

  // Return top intent if it meets confidence threshold
  if (topIntent && topIntent.confidence >= topIntent.confidence_threshold) {
    console.log('[IntentClassifier] Selected intent:', topIntent.name, 'confidence:', topIntent.confidence.toFixed(2));
    return {
      intent: topIntent.id,
      intentData: topIntent,
      confidence: topIntent.confidence,
      requiresGPT: false
    };
  }

  // If no confident match, flag for GPT processing
  console.log('[IntentClassifier] No confident match, flagging for GPT');
  return {
    intent: 'unknown',
    intentData: null,
    confidence: topIntent?.confidence || 0,
    requiresGPT: true,
    topCandidates: scoredIntents.slice(0, 3).map(i => ({
      id: i.id,
      name: i.name,
      confidence: i.confidence
    }))
  };
};

/**
 * Extract intent name from compromise.js doc
 */
const extractIntentFromDoc = (doc) => {
  // Check if it's a question
  if (doc.questions().found) {
    if (doc.has('what')) return 'query';
    if (doc.has('which')) return 'recommend';
    if (doc.has('when')) return 'time_query';
    if (doc.has('how much') || doc.has('how many')) return 'quantity';
  }

  // Check for imperative/commands
  if (doc.match('(show|list|display)').found) return 'display';
  if (doc.match('(add|create|new)').found) return 'create';
  if (doc.match('(remove|delete)').found) return 'delete';
  if (doc.match('(go|navigate|take)').found) return 'navigate';
  if (doc.match('(optimize|minimize)').found) return 'optimize';

  return 'unknown';
};
