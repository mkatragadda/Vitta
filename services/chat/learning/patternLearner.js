/**
 * Pattern Learner
 * 
 * Learns from successful query decompositions to improve future query understanding.
 * Stores patterns, matches similar queries, and evolves patterns based on feedback.
 * 
 * @module services/chat/learning/patternLearner
 * 
 * @example
 * const learner = new PatternLearner();
 * await learner.learnPattern(query, entities, structuredQuery, result);
 * const pattern = await learner.findMatchingPattern(query, entities);
 */

import { supabase } from '../../../config/supabase.js';
import { getEmbedding } from '../../embedding/embeddingService.js';
import crypto from 'crypto';

/**
 * PatternLearner class for learning and matching query patterns
 */
export class PatternLearner {
  /**
   * Create a new PatternLearner instance
   * 
   * @param {Object} options - Learner options
   * @property {number} options.confidenceThreshold - Minimum confidence to use pattern (default: 0.8)
   * @property {number} options.similarityThreshold - Minimum similarity for pattern matching (default: 0.85)
   * @property {number} options.maxPatterns - Maximum patterns to return (default: 5)
   * 
   * @example
   * const learner = new PatternLearner({ confidenceThreshold: 0.85 });
   */
  constructor(options = {}) {
    this.options = {
      confidenceThreshold: options.confidenceThreshold || 0.8,
      similarityThreshold: options.similarityThreshold || 0.85,
      maxPatterns: options.maxPatterns || 5,
      ...options
    };
  }

  /**
   * Learn from a successful query decomposition
   * 
   * @param {string} query - Natural language query
   * @param {Object} entities - Extracted entities
   * @param {Object} structuredQuery - Decomposed structured query
   * @param {Object} result - Query execution result
   * @param {string} intent - Intent classification
   * @returns {Promise<Object>} - Learned or updated pattern
   * 
   * @example
   * await learner.learnPattern(
   *   "what are the different issuers",
   *   { distinctQuery: { field: 'issuer' } },
   *   { subIntent: 'distinct', distinct: { field: 'issuer' } },
   *   { values: [...], total: 5 },
   *   'query_card_data'
   * );
   */
  async learnPattern(query, entities, structuredQuery, result, intent = 'query_card_data') {
    if (!query || !structuredQuery) {
      throw new Error('PatternLearner: query and structuredQuery are required');
    }

    try {
      console.log('[PatternLearner] Learning pattern from query:', query.substring(0, 50));

      // Check if similar pattern exists
      const existingPattern = await this._findSimilarPattern(query, intent);

      if (existingPattern && existingPattern.similarity >= this.options.similarityThreshold) {
        // Update existing pattern
        return await this._updatePattern(existingPattern.id, query, entities, structuredQuery, result, intent);
      } else {
        // Create new pattern
        return await this._createPattern(query, entities, structuredQuery, result, intent);
      }
    } catch (error) {
      console.error('[PatternLearner] Error learning pattern:', error);
      throw error;
    }
  }

  /**
   * Find matching pattern for a query
   * 
   * @param {string} query - Natural language query
   * @param {Object} entities - Extracted entities
   * @param {string} intent - Intent classification (optional)
   * @returns {Promise<Object|null>} - Matching pattern or null
   * 
   * @example
   * const pattern = await learner.findMatchingPattern("what issuers do I have", entities);
   * if (pattern && pattern.confidence > 0.8) {
   *   // Use pattern
   * }
   */
  async findMatchingPattern(query, entities, intent = null) {
    if (!query) {
      return null;
    }

    try {
      // Generate query embedding
      const queryEmbedding = await getEmbedding(query);

      if (!queryEmbedding) {
        console.warn('[PatternLearner] Could not generate embedding, skipping pattern matching');
        return null;
      }

      // Convert embedding array - Supabase pgvector expects array format
      // The RPC function will convert array to vector type automatically
      const embeddingArray = Array.isArray(queryEmbedding) ? queryEmbedding : [];
      
      if (embeddingArray.length === 0) {
        console.warn('[PatternLearner] Empty embedding array, skipping pattern matching');
        return null;
      }

      // Find similar patterns using vector similarity
      // Note: Supabase converts array to vector type in the RPC function
      let patterns = null;
      let error = null;
      
      try {
        const result = await supabase.rpc('match_patterns', {
          query_embedding: embeddingArray, // Pass as array - Supabase converts to vector
          match_threshold: this.options.similarityThreshold,
          match_count: this.options.maxPatterns,
          pattern_intent: intent || null,
          min_confidence: this.options.confidenceThreshold
        });
        
        patterns = result.data;
        error = result.error;
      } catch (err) {
        // Fallback: If RPC fails, try text-based matching
        console.warn('[PatternLearner] RPC call failed, falling back to text similarity:', err);
        return await this._findSimilarPattern(query, intent);
      }

      if (error) {
        console.error('[PatternLearner] Error finding patterns:', error);
        // Fallback to text-based matching
        return await this._findSimilarPattern(query, intent);
      }

      if (!patterns || patterns.length === 0) {
        // Try text-based matching as fallback
        return await this._findSimilarPattern(query, intent);
      }

      // Return best match
      const bestMatch = patterns[0];
      
      // Additional validation: check entity similarity
      if (entities && Object.keys(entities).length > 0) {
        const entitySimilarity = this._calculateEntitySimilarity(entities, bestMatch.entities);
        if (entitySimilarity < 0.7) {
          console.log('[PatternLearner] Entity similarity too low, not using pattern');
          return null;
        }
      }

      console.log(`[PatternLearner] Found matching pattern: ${bestMatch.id} (confidence: ${bestMatch.confidence}, similarity: ${bestMatch.similarity})`);
      
      return {
        id: bestMatch.id,
        naturalQuery: bestMatch.natural_query,
        decomposedQuery: bestMatch.decomposed_query,
        entities: bestMatch.entities,
        confidence: bestMatch.confidence,
        similarity: bestMatch.similarity,
        successRate: bestMatch.success_rate,
        usageCount: bestMatch.usage_count
      };
    } catch (error) {
      console.error('[PatternLearner] Error finding matching pattern:', error);
      return null;
    }
  }

  /**
   * Record pattern usage (called after successful pattern match)
   * 
   * @param {string} patternId - Pattern ID
   * @param {number} responseTime - Response time in milliseconds
   * @returns {Promise<void>}
   */
  async recordPatternUsage(patternId, responseTime = null) {
    if (!patternId) return;

    try {
      await supabase
        .from('query_patterns')
        .update({
          usage_count: supabase.raw('usage_count + 1'),
          last_used_at: new Date().toISOString(),
          ...(responseTime && {
            average_response_time_ms: supabase.raw(`COALESCE(
              (average_response_time_ms * usage_count + ${responseTime}) / (usage_count + 1),
              ${responseTime}
            )`)
          })
        })
        .eq('id', patternId);
    } catch (error) {
      console.error('[PatternLearner] Error recording pattern usage:', error);
    }
  }

  /**
   * Update pattern based on feedback
   * 
   * @param {string} patternId - Pattern ID
   * @param {Object} feedback - Feedback data
   * @property {boolean} feedback.success - Whether pattern worked correctly
   * @property {number} feedback.rating - User rating (1-5)
   * @property {boolean} feedback.helpful - Whether response was helpful
   * @property {string} feedback.correction - User correction text
   * @returns {Promise<Object>} - Updated pattern
   */
  async updatePatternFeedback(patternId, feedback) {
    if (!patternId || !feedback) {
      throw new Error('PatternLearner: patternId and feedback are required');
    }

    try {
      // Get current pattern
      const { data: pattern, error: fetchError } = await supabase
        .from('query_patterns')
        .select('*')
        .eq('id', patternId)
        .single();

      if (fetchError || !pattern) {
        throw new Error(`Pattern not found: ${patternId}`);
      }

      // Calculate new success rate
      const currentSuccessRate = parseFloat(pattern.success_rate) || 1.0;
      const currentUsageCount = pattern.usage_count || 0;
      
      let newSuccessRate = currentSuccessRate;
      if (feedback.success !== undefined) {
        const successValue = feedback.success ? 1.0 : 0.0;
        if (currentUsageCount > 0) {
          newSuccessRate = (currentSuccessRate * currentUsageCount + successValue) / (currentUsageCount + 1);
        } else {
          newSuccessRate = successValue;
        }
      }

      // Calculate new confidence (weighted by success rate and user satisfaction)
      let newConfidence = parseFloat(pattern.confidence) || 0.5;
      if (feedback.rating) {
        const normalizedRating = (feedback.rating - 1) / 4; // Normalize 1-5 to 0-1
        const currentSatisfaction = parseFloat(pattern.user_satisfaction) || 0.5;
        const newSatisfaction = currentUsageCount > 0
          ? (currentSatisfaction * currentUsageCount + normalizedRating) / (currentUsageCount + 1)
          : normalizedRating;
        
        // Confidence = weighted average of success rate and satisfaction
        newConfidence = (newSuccessRate * 0.6 + newSatisfaction * 0.4);
      } else if (feedback.helpful !== undefined) {
        const helpfulValue = feedback.helpful ? 0.8 : 0.2;
        newConfidence = (currentSuccessRate * 0.7 + helpfulValue * 0.3);
      }

      // Update pattern
      const updateData = {
        success_rate: newSuccessRate,
        confidence: Math.max(0, Math.min(1, newConfidence)), // Clamp to 0-1
        updated_at: new Date().toISOString(),
        last_improved_at: new Date().toISOString(),
        version: pattern.version + 1
      };

      if (feedback.rating !== undefined) {
        const normalizedRating = (feedback.rating - 1) / 4;
        updateData.user_satisfaction = currentUsageCount > 0
          ? (parseFloat(pattern.user_satisfaction || 0.5) * currentUsageCount + normalizedRating) / (currentUsageCount + 1)
          : normalizedRating;
      }

      // Add variation if correction provided
      if (feedback.correction) {
        const currentVariations = pattern.variations || [];
        if (!currentVariations.includes(feedback.correction)) {
          updateData.variations = [...currentVariations, feedback.correction].slice(-10); // Keep last 10
        }
      }

      const { data: updatedPattern, error } = await supabase
        .from('query_patterns')
        .update(updateData)
        .eq('id', patternId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`[PatternLearner] Updated pattern ${patternId} (success_rate: ${newSuccessRate.toFixed(2)}, confidence: ${newConfidence.toFixed(2)})`);
      
      return updatedPattern;
    } catch (error) {
      console.error('[PatternLearner] Error updating pattern feedback:', error);
      throw error;
    }
  }

  /**
   * Merge similar patterns
   * 
   * @param {Array<string>} patternIds - Pattern IDs to merge
   * @returns {Promise<Object>} - Merged pattern
   */
  async mergePatterns(patternIds) {
    if (!patternIds || patternIds.length < 2) {
      throw new Error('PatternLearner: At least 2 patterns required for merging');
    }

    try {
      // Fetch all patterns
      const { data: patterns, error: fetchError } = await supabase
        .from('query_patterns')
        .select('*')
        .in('id', patternIds);

      if (fetchError || !patterns || patterns.length === 0) {
        throw new Error('Patterns not found');
      }

      // Use the pattern with highest usage_count as base
      const basePattern = patterns.reduce((max, p) => 
        (p.usage_count || 0) > (max.usage_count || 0) ? p : max
      );

      // Merge data
      const allVariations = patterns.flatMap(p => p.variations || []);
      const uniqueVariations = [...new Set([...basePattern.variations || [], ...allVariations])];

      // Calculate merged metrics
      const totalUsage = patterns.reduce((sum, p) => sum + (p.usage_count || 0), 0);
      const weightedSuccessRate = patterns.reduce((sum, p) => 
        sum + (parseFloat(p.success_rate || 1.0) * (p.usage_count || 0)), 0
      ) / totalUsage;

      // Update base pattern
      const { data: mergedPattern, error } = await supabase
        .from('query_patterns')
        .update({
          variations: uniqueVariations.slice(0, 20), // Limit to 20 variations
          success_rate: weightedSuccessRate,
          usage_count: totalUsage,
          updated_at: new Date().toISOString(),
          last_improved_at: new Date().toISOString()
        })
        .eq('id', basePattern.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Deactivate other patterns
      const otherIds = patternIds.filter(id => id !== basePattern.id);
      await supabase
        .from('query_patterns')
        .update({ is_active: false })
        .in('id', otherIds);

      console.log(`[PatternLearner] Merged ${patternIds.length} patterns into ${basePattern.id}`);
      
      return mergedPattern;
    } catch (error) {
      console.error('[PatternLearner] Error merging patterns:', error);
      throw error;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Find similar pattern using text search
   * @private
   */
  async _findSimilarPattern(query, intent) {
    try {
      // Simple text similarity search (fallback if embeddings not available)
      const { data: patterns, error } = await supabase
        .from('query_patterns')
        .select('*')
        .eq('is_active', true)
        .eq('intent', intent)
        .gte('confidence', this.options.confidenceThreshold)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error || !patterns || patterns.length === 0) {
        return null;
      }

      // Simple text similarity (Levenshtein-like)
      const queryLower = query.toLowerCase();
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const pattern of patterns) {
        const patternQuery = pattern.natural_query.toLowerCase();
        const similarity = this._calculateTextSimilarity(queryLower, patternQuery);
        
        if (similarity > bestSimilarity && similarity >= 0.7) {
          bestSimilarity = similarity;
          bestMatch = { ...pattern, similarity };
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('[PatternLearner] Error finding similar pattern:', error);
      return null;
    }
  }

  /**
   * Create new pattern
   * @private
   */
  async _createPattern(query, entities, structuredQuery, result, intent) {
    try {
      // Generate embedding
      const queryEmbedding = await getEmbedding(query);

      // Calculate query hash for deduplication
      const queryHash = crypto
        .createHash('sha256')
        .update(query.toLowerCase().trim())
        .digest('hex');

      // Check for duplicate by hash
      const { data: existing } = await supabase
        .from('query_patterns')
        .select('id')
        .eq('query_hash', queryHash)
        .single();

      if (existing) {
        // Update existing pattern instead
        return await this._updatePattern(existing.id, query, entities, structuredQuery, result, intent);
      }

      // Helper to safely serialize objects (remove circular references)
      const safeSerialize = (obj) => {
        if (!obj) return null;
        try {
          const visited = new WeakSet();
          let depth = 0;
          // Use JSON.parse/stringify to remove circular references
          return JSON.parse(JSON.stringify(obj, (key, value) => {
            // Skip functions and undefined values
            if (typeof value === 'function' || value === undefined) {
              return null;
            }
            // Skip circular references
            if (typeof value === 'object' && value !== null) {
              // Check for circular reference
              if (visited.has(value)) {
                return '[Circular]';
              }
              visited.add(value);
              // Limit depth to prevent huge objects
              depth++;
              if (depth > 10) {
                depth--;
                return '[Too Deep]';
              }
            }
            return value;
          }));
        } catch (error) {
          console.warn('[PatternLearner] Error serializing object:', error.message);
          // Return simplified version if full serialization fails
          return typeof obj === 'object' ? {} : obj;
        }
      };

      const patternData = {
        natural_query: query,
        decomposed_query: safeSerialize(structuredQuery),
        entities: safeSerialize(entities) || {},
        intent: intent,
        query_embedding: queryEmbedding,
        query_hash: queryHash,
        success_rate: 1.0,
        usage_count: 0,
        confidence: 0.8, // Start with moderate confidence
        variations: [],
        common_contexts: [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: pattern, error } = await supabase
        .from('query_patterns')
        .insert(patternData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`[PatternLearner] Created new pattern: ${pattern.id} for query: "${query.substring(0, 50)}"`);
      
      return pattern;
    } catch (error) {
      console.error('[PatternLearner] Error creating pattern:', error);
      throw error;
    }
  }

  /**
   * Update existing pattern
   * @private
   */
  async _updatePattern(patternId, query, entities, structuredQuery, result, intent) {
    try {
      // Get current pattern
      const { data: currentPattern, error: fetchError } = await supabase
        .from('query_patterns')
        .select('*')
        .eq('id', patternId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Add query as variation if different
      const variations = currentPattern.variations || [];
      if (!variations.includes(query) && query !== currentPattern.natural_query) {
        variations.push(query);
      }

      // Update pattern
      const updateData = {
        variations: variations.slice(-10), // Keep last 10
        updated_at: new Date().toISOString(),
        last_improved_at: new Date().toISOString(),
        version: (currentPattern.version || 1) + 1
      };

      // Update embedding if query changed significantly
      if (query !== currentPattern.natural_query) {
        const newEmbedding = await getEmbedding(query);
        if (newEmbedding) {
          updateData.query_embedding = newEmbedding;
        }
      }

      const { data: updatedPattern, error } = await supabase
        .from('query_patterns')
        .update(updateData)
        .eq('id', patternId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`[PatternLearner] Updated existing pattern: ${patternId}`);
      
      return updatedPattern;
    } catch (error) {
      console.error('[PatternLearner] Error updating pattern:', error);
      throw error;
    }
  }

  /**
   * Calculate text similarity (simple Levenshtein-based)
   * @private
   */
  _calculateTextSimilarity(str1, str2) {
    // Simple word overlap similarity
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate entity similarity
   * @private
   */
  _calculateEntitySimilarity(entities1, entities2) {
    if (!entities1 || !entities2) return 0.5; // Neutral if entities not available

    const keys1 = Object.keys(entities1);
    const keys2 = Object.keys(entities2);

    if (keys1.length === 0 && keys2.length === 0) return 1.0;
    if (keys1.length === 0 || keys2.length === 0) return 0.0;

    const commonKeys = keys1.filter(k => keys2.includes(k));
    const totalKeys = new Set([...keys1, ...keys2]).size;

    return commonKeys.length / totalKeys;
  }
}

