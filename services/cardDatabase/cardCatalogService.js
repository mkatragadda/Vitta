/**
 * Card Catalog Service
 * Manages the card catalog database and provides search/filter functionality
 */

import { supabase, isSupabaseConfigured } from '../../config/supabase';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CardCatalog');

/**
 * Get all cards from catalog
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of card objects
 */
export const getCardCatalog = async (options = {}) => {
  if (!isSupabaseConfigured()) {
    logger.info('Supabase not configured - returning empty catalog');
    return [];
  }

  try {
    let query = supabase
      .from('card_catalog')
      .select('*')
      .eq('is_active', true);

    // Apply filters if provided
    if (options.category) {
      query = query.contains('category', [options.category]);
    }

    if (options.issuer) {
      query = query.eq('issuer', options.issuer);
    }

    if (options.maxAnnualFee !== undefined) {
      query = query.lte('annual_fee', options.maxAnnualFee);
    }

    // Sort by popularity by default
    query = query.order('popularity_score', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching catalog', error);
      throw error;
    }

    logger.debug('Fetched cards from catalog', { count: data?.length || 0, filters: options });
    return data || [];

  } catch (error) {
    logger.error('Error in getCardCatalog', error);
    return [];
  }
};

/**
 * Search cards by name or issuer with fuzzy matching
 * @param {string} query - Search query
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Matching cards
 */
export const searchCards = async (query, filters = {}) => {
  if (!isSupabaseConfigured()) {
    logger.info('Supabase not configured - returning empty results');
    return [];
  }

  if (!query || query.length < 2) {
    return [];
  }

  try {
    const searchTerm = query.toLowerCase().trim();

    // Get all cards and filter client-side for better fuzzy matching
    // For production, consider using PostgreSQL full-text search
    let cards = await getCardCatalog(filters);

    // Filter by search term
    cards = cards.filter(card => {
      const nameMatch = card.card_name.toLowerCase().includes(searchTerm);
      const issuerMatch = card.issuer.toLowerCase().includes(searchTerm);
      const categoryMatch = card.category?.some(cat =>
        cat.toLowerCase().includes(searchTerm)
      );

      return nameMatch || issuerMatch || categoryMatch;
    });

    // Score results for relevance
    cards = cards.map(card => {
      let score = 0;

      // Exact name match gets highest score
      if (card.card_name.toLowerCase() === searchTerm) {
        score += 100;
      }
      // Name starts with search term
      else if (card.card_name.toLowerCase().startsWith(searchTerm)) {
        score += 50;
      }
      // Name contains search term
      else if (card.card_name.toLowerCase().includes(searchTerm)) {
        score += 25;
      }

      // Issuer match
      if (card.issuer.toLowerCase().includes(searchTerm)) {
        score += 20;
      }

      // Add popularity score
      score += (card.popularity_score || 0) / 10;

      return { ...card, searchScore: score };
    });

    // Sort by search score
    cards.sort((a, b) => b.searchScore - a.searchScore);

    logger.debug('Search completed', { query, resultCount: cards.length });
    return cards;

  } catch (error) {
    logger.error('Error in searchCards', error);
    return [];
  }
};

/**
 * Get a single card by ID
 * @param {string} cardId - Card ID
 * @returns {Promise<Object|null>} Card object or null
 */
export const getCardById = async (cardId) => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('card_catalog')
      .select('*')
      .eq('id', cardId)
      .single();

    if (error) {
      logger.error('Error fetching card', error);
      return null;
    }

    return data;

  } catch (error) {
    logger.error('Error in getCardById', error);
    return null;
  }
};

/**
 * Get cards by category
 * @param {string} category - Category name
 * @returns {Promise<Array>} Cards in category
 */
export const getCardsByCategory = async (category) => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('card_catalog')
      .select('*')
      .contains('category', [category])
      .eq('is_active', true)
      .order('popularity_score', { ascending: false });

    if (error) {
      logger.error('Error fetching cards by category', error);
      return [];
    }

    logger.debug('Found cards by category', { category, count: data?.length || 0 });
    return data || [];

  } catch (error) {
    logger.error('Error in getCardsByCategory', error);
    return [];
  }
};

/**
 * Get top cards (most popular)
 * @param {number} limit - Number of cards to return
 * @returns {Promise<Array>} Top cards
 */
export const getTopCards = async (limit = 10) => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('card_catalog')
      .select('*')
      .eq('is_active', true)
      .order('popularity_score', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching top cards', error);
      return [];
    }

    return data || [];

  } catch (error) {
    logger.error('Error in getTopCards', error);
    return [];
  }
};

/**
 * Get cards with no annual fee
 * @returns {Promise<Array>} No-fee cards
 */
export const getNoFeeCards = async () => {
  return getCardCatalog({ maxAnnualFee: 0 });
};

/**
 * Get travel cards
 * @returns {Promise<Array>} Travel cards
 */
export const getTravelCards = async () => {
  return getCardsByCategory('travel');
};

/**
 * Get cashback cards
 * @returns {Promise<Array>} Cashback cards
 */
export const getCashbackCards = async () => {
  return getCardsByCategory('cashback');
};

/**
 * Get all unique issuers
 * @returns {Promise<Array>} Array of issuer names
 */
export const getIssuers = async () => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('card_catalog')
      .select('issuer')
      .eq('is_active', true);

    if (error) {
      logger.error('Error fetching issuers', error);
      return [];
    }

    // Get unique issuers
    const issuers = [...new Set(data.map(card => card.issuer))];
    return issuers.sort();

  } catch (error) {
    logger.error('Error in getIssuers', error);
    return [];
  }
};

/**
 * Get all unique categories
 * @returns {Promise<Array>} Array of category names
 */
export const getCategories = async () => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('card_catalog')
      .select('category')
      .eq('is_active', true);

    if (error) {
      logger.error('Error fetching categories', error);
      return [];
    }

    // Flatten and get unique categories
    const allCategories = data.flatMap(card => card.category || []);
    const categories = [...new Set(allCategories)];
    return categories.sort();

  } catch (error) {
    logger.error('Error in getCategories', error);
    return [];
  }
};

/**
 * Add a new card to catalog (admin function)
 * @param {Object} cardData - Card information
 * @returns {Promise<Object>} Created card
 */
export const addCardToCatalog = async (cardData) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase
      .from('card_catalog')
      .insert([cardData])
      .select()
      .single();

    if (error) {
      logger.error('Error adding card', error);
      throw error;
    }

    logger.info('Card added to catalog', { cardName: data.card_name, cardId: data.id });
    return data;

  } catch (error) {
    logger.error('Error in addCardToCatalog', error);
    throw error;
  }
};

/**
 * Update card in catalog (admin function)
 * @param {string} cardId - Card ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated card
 */
export const updateCardInCatalog = async (cardId, updates) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase
      .from('card_catalog')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating card', error);
      throw error;
    }

    logger.info('Card updated in catalog', { cardId, updatedFields: Object.keys(updates) });
    return data;

  } catch (error) {
    logger.error('Error in updateCardInCatalog', error);
    throw error;
  }
};
