/**
 * Embedding Service
 * Handles OpenAI embeddings generation and vector similarity search
 *
 * Performance optimizations (Phase 7):
 * - Enhanced embedding cache with 1000-entry capacity and TTL
 * - Request coalescing to dedupe identical requests within 100ms
 */

import { supabase } from '../../config/supabase.js';
import EmbeddingCache from '../cache/embeddingCache.js';
import { embeddingCoalescer } from '../performance/requestCoalescer.js';

// Enhanced embedding cache with TTL and LRU eviction
const embeddingCache = new EmbeddingCache({
  capacity: 1000,        // 10x the previous limit
  ttlMs: 3600000         // 1 hour TTL
});

/**
 * Generate embedding for text using OpenAI API via server route
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - 1536-dimensional embedding vector
 */
export async function getEmbedding(text) {
  try {
    // Call our API route instead of OpenAI directly
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[EmbeddingService] API error details:', errorData);
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    console.log('[EmbeddingService] Generated embedding for:', text.substring(0, 50));
    return embedding;

  } catch (error) {
    console.error('[EmbeddingService] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Get embedding with caching and request coalescing to reduce API calls
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Cached or freshly generated embedding
 */
export async function getCachedEmbedding(text) {
  const cacheKey = text.toLowerCase().trim();

  // Check cache first
  const cached = embeddingCache.get(cacheKey);
  if (cached) {
    console.log('[EmbeddingService] Cache hit for:', text.substring(0, 50));
    return cached;
  }

  // Coalesce identical requests to avoid duplicate API calls
  return embeddingCoalescer.coalesce(cacheKey, async () => {
    const embedding = await getEmbedding(text);
    embeddingCache.set(cacheKey, embedding);
    return embedding;
  });
}

/**
 * Find similar intents using vector similarity search
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {number} threshold - Similarity threshold (0-1)
 * @param {number} limit - Max number of results
 * @param {Object} options - Optional filters
 * @param {string[]} options.filterIntents - Array of intent_ids to filter by (for hierarchical classification)
 * @returns {Promise<Array>} - Matching intents with similarity scores
 */
export async function findSimilarIntents(queryEmbedding, threshold = 0.75, limit = 3, options = {}) {
  try {
    const { data, error } = await supabase.rpc('match_intents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.error('[EmbeddingService] Error in similarity search:', error);
      throw error;
    }

    let results = data || [];

    // Apply intent filtering if specified (for hierarchical classification)
    if (options.filterIntents && Array.isArray(options.filterIntents) && options.filterIntents.length > 0) {
      console.log('[EmbeddingService] Filtering to intents:', options.filterIntents);
      results = results.filter(match => options.filterIntents.includes(match.intent_id));
    }

    console.log('[EmbeddingService] Found', results.length, 'similar intents');
    return results;

  } catch (error) {
    console.error('[EmbeddingService] Error finding similar intents:', error);
    return [];
  }
}

/**
 * Log intent detection for analytics
 * @param {string} query - User query
 * @param {string} intent - Detected intent
 * @param {number} similarity - Similarity score
 * @param {string} method - Detection method
 * @param {string} userId - User ID
 */
export async function logIntentDetection(query, intent, similarity, method, userId = null) {
  try {
    // Skip logging for demo mode (demo user IDs don't exist in DB)
    if (userId && userId.startsWith('demo-')) {
      console.log('[EmbeddingService] Skipping intent log (demo mode)');
      return;
    }

    // Log with user_id (can be null for unauthenticated users)
    const { error } = await supabase.from('intent_logs').insert({
      user_id: userId || null,
      query,
      matched_intent: intent,
      similarity_score: similarity,
      detection_method: method
    });

    if (error) {
      console.error('[EmbeddingService] Error logging intent:', error);
    }
  } catch (error) {
    console.error('[EmbeddingService] Error logging intent:', error);
  }
}

/**
 * Clear the embedding cache (useful for testing)
 */
export function clearEmbeddingCache() {
  embeddingCache.clear();
  embeddingCoalescer.clear();
  console.log('[EmbeddingService] Cache and coalescer cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return embeddingCache.getStats();
}

/**
 * Get request coalescer statistics
 */
export function getCoalescerStats() {
  return embeddingCoalescer.getStats();
}

/**
 * Get top cached entries by access frequency
 */
export function getTopCachedEntries(n = 10) {
  return embeddingCache.getTopEntries(n);
}
