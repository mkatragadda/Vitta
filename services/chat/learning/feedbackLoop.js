/**
 * Feedback Loop
 * 
 * Collects and processes user feedback (implicit and explicit) to improve query patterns.
 * Learns from user behavior and corrections to continuously improve the system.
 * 
 * @module services/chat/learning/feedbackLoop
 * 
 * @example
 * const feedbackLoop = new FeedbackLoop();
 * await feedbackLoop.recordImplicitFeedback(queryId, 'abandonment');
 * await feedbackLoop.recordExplicitFeedback(queryId, 5, 'Great response!');
 */

import { supabase } from '../../../config/supabase.js';
import { PatternLearner } from './patternLearner.js';

/**
 * FeedbackLoop class for collecting and processing feedback
 */
export class FeedbackLoop {
  /**
   * Create a new FeedbackLoop instance
   * 
   * @param {Object} options - Feedback loop options
   * @property {boolean} options.enableProcessing - Enable automatic feedback processing (default: true)
   * @property {number} options.processingDelay - Delay in ms before processing feedback (default: 5000)
   * @property {boolean} options.autoUpdatePatterns - Auto-update patterns from feedback (default: true)
   * 
   * @example
   * const feedbackLoop = new FeedbackLoop({ enableProcessing: true });
   */
  constructor(options = {}) {
    this.options = {
      enableProcessing: options.enableProcessing !== false,
      processingDelay: options.processingDelay || 5000,
      autoUpdatePatterns: options.autoUpdatePatterns !== false,
      ...options
    };

    this.patternLearner = new PatternLearner();
    this.processingQueue = new Set(); // Track feedback being processed
  }

  /**
   * Record implicit feedback from user behavior
   * 
   * @param {string} queryLogId - Query log ID from intent_logs
   * @param {string} feedbackType - Feedback type: 'abandonment', 'correction', 'reformulation', 'navigation'
   * @param {Object} data - Additional feedback data
   * @property {string} data.patternId - Pattern ID if applicable
   * @property {string} data.userId - User ID
   * @property {string} data.sessionId - Session ID
   * @property {string} data.correctionText - Correction text if type is 'correction'
   * @property {string} data.newQuery - New query if type is 'reformulation'
   * @returns {Promise<string>} - Feedback ID
   * 
   * @example
   * // User abandons query (no interaction with response)
   * await feedbackLoop.recordImplicitFeedback(queryId, 'abandonment', {
   *   userId: 'user-123',
   *   sessionId: 'session-456'
   * });
   * 
   * // User corrects query
   * await feedbackLoop.recordImplicitFeedback(queryId, 'correction', {
   *   correctionText: 'I meant Chase cards, not all cards',
   *   patternId: 'pattern-123'
   * });
   */
  async recordImplicitFeedback(queryLogId, feedbackType, data = {}) {
    if (!queryLogId || !feedbackType) {
      throw new Error('FeedbackLoop: queryLogId and feedbackType are required');
    }

    const validTypes = ['abandonment', 'correction', 'reformulation', 'navigation', 'timeout'];
    if (!validTypes.includes(feedbackType)) {
      throw new Error(`FeedbackLoop: Invalid feedback type. Must be one of: ${validTypes.join(', ')}`);
    }

    try {
      console.log(`[FeedbackLoop] Recording implicit feedback: ${feedbackType} for query ${queryLogId}`);

      const {
        patternId = null,
        userId = null,
        sessionId = null,
        correctionText = null,
        newQuery = null,
        metadata = {}
      } = data;

      // Determine rating based on feedback type
      let rating = null;
      let helpful = null;

      switch (feedbackType) {
        case 'abandonment':
          rating = 1; // Low rating - user didn't engage
          helpful = false;
          break;
        case 'correction':
          rating = 2; // Low rating - query was incorrect
          helpful = false;
          break;
        case 'reformulation':
          rating = 3; // Medium rating - query needed reformulation
          helpful = false;
          break;
        case 'navigation':
          rating = 4; // Higher rating - user navigated (engaged)
          helpful = true;
          break;
        default:
          rating = null;
          helpful = null;
      }

      // Create feedback entry
      const feedbackEntry = {
        query_log_id: queryLogId,
        pattern_id: patternId,
        user_id: userId,
        session_id: sessionId,
        feedback_type: 'implicit',
        feedback_subtype: feedbackType,
        rating: rating,
        helpful: helpful,
        correction_text: correctionText || null,
        feedback_data: {
          newQuery: newQuery,
          ...metadata
        },
        created_at: new Date().toISOString()
      };

      const { data: feedback, error } = await supabase
        .from('query_feedback')
        .insert(feedbackEntry)
        .select('id')
        .single();

      if (error) {
        console.error('[FeedbackLoop] Error recording implicit feedback:', error);
        throw error;
      }

      console.log(`[FeedbackLoop] Recorded implicit feedback: ${feedback.id}`);

      // Process feedback if enabled
      if (this.options.enableProcessing && this.options.autoUpdatePatterns && patternId) {
        // Delay processing to avoid race conditions
        setTimeout(() => {
          this.processFeedback(feedback.id);
        }, this.options.processingDelay);
      }

      return feedback.id;
    } catch (error) {
      console.error('[FeedbackLoop] Error recording implicit feedback:', error);
      throw error;
    }
  }

  /**
   * Record explicit feedback from user
   * 
   * @param {string} queryLogId - Query log ID from intent_logs
   * @param {Object} feedback - Explicit feedback data
   * @property {number} feedback.rating - Rating 1-5
   * @property {boolean} feedback.helpful - Whether response was helpful
   * @property {string} feedback.comment - Optional comment
   * @property {string} feedback.correctionText - Correction if applicable
   * @property {Object} feedback.metadata - Additional metadata
   * @returns {Promise<string>} - Feedback ID
   * 
   * @example
   * await feedbackLoop.recordExplicitFeedback(queryId, {
   *   rating: 5,
   *   helpful: true,
   *   comment: 'Great response, exactly what I needed!'
   * });
   */
  async recordExplicitFeedback(queryLogId, feedback = {}) {
    if (!queryLogId) {
      throw new Error('FeedbackLoop: queryLogId is required');
    }

    try {
      console.log(`[FeedbackLoop] Recording explicit feedback for query ${queryLogId}`);

      const {
        rating = null,
        helpful = null,
        comment = null,
        correctionText = null,
        userId = null,
        sessionId = null,
        patternId = null,
        metadata = {}
      } = feedback;

      // Validate rating
      if (rating !== null && (rating < 1 || rating > 5)) {
        throw new Error('FeedbackLoop: Rating must be between 1 and 5');
      }

      // Create feedback entry
      const feedbackEntry = {
        query_log_id: queryLogId,
        pattern_id: patternId,
        user_id: userId,
        session_id: sessionId,
        feedback_type: 'explicit',
        feedback_subtype: rating ? 'rating' : (helpful !== null ? (helpful ? 'thumbs_up' : 'thumbs_down') : null),
        rating: rating,
        helpful: helpful,
        correction_text: correctionText || null,
        feedback_data: {
          comment: comment,
          ...metadata
        },
        created_at: new Date().toISOString()
      };

      const { data: feedbackData, error } = await supabase
        .from('query_feedback')
        .insert(feedbackEntry)
        .select('id')
        .single();

      if (error) {
        console.error('[FeedbackLoop] Error recording explicit feedback:', error);
        throw error;
      }

      console.log(`[FeedbackLoop] Recorded explicit feedback: ${feedbackData.id}`);

      // Process feedback if enabled
      if (this.options.enableProcessing && this.options.autoUpdatePatterns && patternId) {
        // Delay processing to avoid race conditions
        setTimeout(() => {
          this.processFeedback(feedbackData.id);
        }, this.options.processingDelay);
      }

      return feedbackData.id;
    } catch (error) {
      console.error('[FeedbackLoop] Error recording explicit feedback:', error);
      throw error;
    }
  }

  /**
   * Process feedback and update patterns
   * 
   * @param {string} feedbackId - Feedback ID
   * @returns {Promise<Object>} - Processing result
   * 
   * @example
   * await feedbackLoop.processFeedback(feedbackId);
   */
  async processFeedback(feedbackId) {
    if (!feedbackId) {
      throw new Error('FeedbackLoop: feedbackId is required');
    }

    // Avoid processing same feedback multiple times
    if (this.processingQueue.has(feedbackId)) {
      console.log(`[FeedbackLoop] Feedback ${feedbackId} is already being processed`);
      return { processed: false, reason: 'already_processing' };
    }

    this.processingQueue.add(feedbackId);

    try {
      console.log(`[FeedbackLoop] Processing feedback: ${feedbackId}`);

      // Fetch feedback
      const { data: feedback, error: fetchError } = await supabase
        .from('query_feedback')
        .select('*, query_logs:id(intent_logs(*))')
        .eq('id', feedbackId)
        .single();

      if (fetchError || !feedback) {
        throw new Error(`Feedback not found: ${feedbackId}`);
      }

      // Get associated query log
      const queryLog = feedback.query_logs;
      const patternId = feedback.pattern_id || (queryLog && queryLog.pattern_id);

      if (!patternId) {
        console.log(`[FeedbackLoop] No pattern ID associated with feedback ${feedbackId}`);
        this.processingQueue.delete(feedbackId);
        return { processed: false, reason: 'no_pattern_id' };
      }

      // Prepare feedback data for pattern update
      const feedbackData = {
        success: feedback.rating ? feedback.rating >= 4 : (feedback.helpful !== null ? feedback.helpful : null),
        rating: feedback.rating,
        helpful: feedback.helpful,
        correction: feedback.correction_text
      };

      // Update pattern based on feedback
      const updatedPattern = await this.patternLearner.updatePatternFeedback(patternId, feedbackData);

      console.log(`[FeedbackLoop] Updated pattern ${patternId} from feedback ${feedbackId}`);

      this.processingQueue.delete(feedbackId);

      return {
        processed: true,
        feedbackId,
        patternId,
        updatedPattern
      };
    } catch (error) {
      console.error('[FeedbackLoop] Error processing feedback:', error);
      this.processingQueue.delete(feedbackId);
      throw error;
    }
  }

  /**
   * Identify patterns needing improvement
   * 
   * @param {number} threshold - Success rate threshold (default: 0.7)
   * @param {number} minUsageCount - Minimum usage count to consider (default: 5)
   * @returns {Promise<Array>} - Patterns needing improvement
   * 
   * @example
   * const problematicPatterns = await feedbackLoop.identifyProblemPatterns(0.7, 5);
   */
  async identifyProblemPatterns(threshold = 0.7, minUsageCount = 5) {
    try {
      console.log(`[FeedbackLoop] Identifying problem patterns (threshold: ${threshold}, minUsage: ${minUsageCount})`);

      // Get patterns with low success rate
      const { data: patterns, error } = await supabase
        .from('query_patterns')
        .select('*')
        .eq('is_active', true)
        .gte('usage_count', minUsageCount)
        .lt('success_rate', threshold)
        .order('success_rate', { ascending: true })
        .limit(50);

      if (error) {
        throw error;
      }

      // Enrich with feedback data
      const enrichedPatterns = await Promise.all(
        (patterns || []).map(async (pattern) => {
          // Get recent feedback for this pattern
          const { data: feedback } = await supabase
            .from('query_feedback')
            .select('*')
            .eq('pattern_id', pattern.id)
            .order('created_at', { ascending: false })
            .limit(10);

          const recentFeedback = feedback || [];
          const negativeFeedback = recentFeedback.filter(f => 
            (f.rating && f.rating < 3) || f.helpful === false
          );

          return {
            id: pattern.id,
            naturalQuery: pattern.natural_query,
            intent: pattern.intent,
            successRate: parseFloat(pattern.success_rate) || 0,
            usageCount: pattern.usage_count || 0,
            confidence: parseFloat(pattern.confidence) || 0,
            lastUsedAt: pattern.last_used_at,
            recentFeedbackCount: recentFeedback.length,
            negativeFeedbackCount: negativeFeedback.length,
            recentNegativeRate: recentFeedback.length > 0
              ? (negativeFeedback.length / recentFeedback.length) * 100
              : 0,
            needsAttention: true
          };
        })
      );

      console.log(`[FeedbackLoop] Found ${enrichedPatterns.length} patterns needing improvement`);

      return enrichedPatterns;
    } catch (error) {
      console.error('[FeedbackLoop] Error identifying problem patterns:', error);
      throw error;
    }
  }

  /**
   * Get feedback statistics for a pattern
   * 
   * @param {string} patternId - Pattern ID
   * @returns {Promise<Object>} - Feedback statistics
   * 
   * @example
   * const stats = await feedbackLoop.getPatternFeedbackStats('pattern-123');
   */
  async getPatternFeedbackStats(patternId) {
    if (!patternId) {
      throw new Error('FeedbackLoop: patternId is required');
    }

    try {
      // Get all feedback for this pattern
      const { data: feedback, error } = await supabase
        .from('query_feedback')
        .select('*')
        .eq('pattern_id', patternId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const allFeedback = feedback || [];
      const explicitFeedback = allFeedback.filter(f => f.feedback_type === 'explicit');
      const implicitFeedback = allFeedback.filter(f => f.feedback_type === 'implicit');

      // Calculate statistics
      const stats = {
        patternId,
        totalFeedback: allFeedback.length,
        explicitFeedback: explicitFeedback.length,
        implicitFeedback: implicitFeedback.length,
        
        // Rating statistics
        averageRating: explicitFeedback.length > 0
          ? explicitFeedback
              .filter(f => f.rating)
              .reduce((sum, f) => sum + f.rating, 0) / explicitFeedback.filter(f => f.rating).length
          : null,
        ratingDistribution: this._calculateRatingDistribution(explicitFeedback),
        
        // Helpfulness statistics
        helpfulCount: allFeedback.filter(f => f.helpful === true).length,
        notHelpfulCount: allFeedback.filter(f => f.helpful === false).length,
        helpfulRate: allFeedback.length > 0
          ? (allFeedback.filter(f => f.helpful === true).length / allFeedback.length) * 100
          : 0,
        
        // Feedback types
        feedbackTypes: this._calculateFeedbackTypeDistribution(allFeedback),
        
        // Corrections
        correctionsCount: allFeedback.filter(f => f.correction_text).length,
        recentCorrections: allFeedback
          .filter(f => f.correction_text)
          .slice(0, 5)
          .map(f => f.correction_text),
        
        // Recent feedback
        recentFeedback: allFeedback.slice(0, 10),
        
        // Timestamps
        firstFeedbackAt: allFeedback.length > 0 ? allFeedback[allFeedback.length - 1].created_at : null,
        lastFeedbackAt: allFeedback.length > 0 ? allFeedback[0].created_at : null
      };

      return stats;
    } catch (error) {
      console.error('[FeedbackLoop] Error getting pattern feedback stats:', error);
      throw error;
    }
  }

  /**
   * Batch process pending feedback
   * 
   * @param {number} limit - Maximum number of feedback items to process (default: 50)
   * @returns {Promise<Object>} - Processing results
   * 
   * @example
   * const results = await feedbackLoop.processPendingFeedback(50);
   */
  async processPendingFeedback(limit = 50) {
    try {
      console.log(`[FeedbackLoop] Processing pending feedback (limit: ${limit})`);

      // Get feedback that hasn't been processed yet (no pattern update timestamp)
      // For now, we'll process feedback that has pattern_id but patterns haven't been updated
      // This is a simplified approach - in production, you might want a processed flag

      const { data: feedback, error } = await supabase
        .from('query_feedback')
        .select('id, pattern_id, query_log_id')
        .not('pattern_id', 'is', null)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!feedback || feedback.length === 0) {
        return { processed: 0, total: 0, results: [] };
      }

      const results = [];
      let processed = 0;
      let failed = 0;

      for (const item of feedback) {
        try {
          if (this.processingQueue.has(item.id)) {
            continue; // Skip if already processing
          }

          const result = await this.processFeedback(item.id);
          results.push(result);
          
          if (result.processed) {
            processed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`[FeedbackLoop] Error processing feedback ${item.id}:`, error);
          failed++;
        }
      }

      console.log(`[FeedbackLoop] Processed ${processed} feedback items, ${failed} failed`);

      return {
        processed,
        failed,
        total: feedback.length,
        results
      };
    } catch (error) {
      console.error('[FeedbackLoop] Error processing pending feedback:', error);
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Calculate rating distribution
   * @private
   */
  _calculateRatingDistribution(feedback) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    feedback.forEach(f => {
      if (f.rating && f.rating >= 1 && f.rating <= 5) {
        distribution[f.rating]++;
      }
    });

    return Object.entries(distribution).map(([rating, count]) => ({
      rating: parseInt(rating),
      count
    }));
  }

  /**
   * Calculate feedback type distribution
   * @private
   */
  _calculateFeedbackTypeDistribution(feedback) {
    const distribution = {};
    
    feedback.forEach(f => {
      const subtype = f.feedback_subtype || 'unknown';
      distribution[subtype] = (distribution[subtype] || 0) + 1;
    });

    return Object.entries(distribution).map(([type, count]) => ({ type, count }));
  }
}

