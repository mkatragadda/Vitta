/**
 * Embedding Service
 * Handles OpenAI embeddings generation and vector similarity search
 */

import { supabase } from '../../config/supabase.js';

// In-memory cache to avoid redundant API calls
const embeddingCache = new Map();
const CACHE_SIZE_LIMIT = 100;

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
 * Get embedding with caching to reduce API calls
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Cached or freshly generated embedding
 */
export async function getCachedEmbedding(text) {
  const cacheKey = text.toLowerCase().trim();

  // Check cache first
  if (embeddingCache.has(cacheKey)) {
    console.log('[EmbeddingService] Cache hit for:', text.substring(0, 50));
    return embeddingCache.get(cacheKey);
  }

  // Generate new embedding
  const embedding = await getEmbedding(text);

  // Store in cache
  embeddingCache.set(cacheKey, embedding);

  // Limit cache size (LRU-style eviction)
  if (embeddingCache.size > CACHE_SIZE_LIMIT) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
    console.log('[EmbeddingService] Cache evicted oldest entry');
  }

  return embedding;
}

/**
 * Find similar intents using vector similarity search
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {number} threshold - Similarity threshold (0-1)
 * @param {number} limit - Max number of results
 * @returns {Promise<Array>} - Matching intents with similarity scores
 */
export async function findSimilarIntents(queryEmbedding, threshold = 0.75, limit = 3) {
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

    console.log('[EmbeddingService] Found', data?.length || 0, 'similar intents');
    return data || [];

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
    const { error } = await supabase.from('intent_logs').insert({
      user_id: userId,
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
  console.log('[EmbeddingService] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: embeddingCache.size,
    limit: CACHE_SIZE_LIMIT,
    keys: Array.from(embeddingCache.keys()).map(k => k.substring(0, 30))
  };
}
