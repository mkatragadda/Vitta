import { supabase, isSupabaseConfigured } from '../config/supabase';
import { getCardById } from './cardDatabase/cardCatalogService';

/**
 * Card Service - Handles all credit card database operations
 *
 * Expected Supabase table schema: user_credit_cards
 * See CARDS_TABLE_SCHEMA.sql for full schema
 */

/**
 * Add a new credit card for a user
 * @param {Object} cardData - Card information
 * @param {string} cardData.user_id - User's ID from users table
 * @param {string} cardData.card_type - Type of card (e.g., "Amex Gold", "Chase Freedom")
 * @param {string} cardData.card_name - Optional nickname for the card
 * @param {number} cardData.apr - Annual Percentage Rate
 * @param {number} cardData.credit_limit - Total available credit
 * @param {number} cardData.current_balance - Current balance owed
 * @param {number} cardData.amount_to_pay - Recommended payment amount
 * @returns {Promise<Object>} Created card object
 */
export const addCard = async (cardData) => {
  if (!isSupabaseConfigured()) {
    console.log('[Vitta] Supabase not configured - demo mode');
    return {
      id: 'demo-' + Date.now(),
      ...cardData,
      created_at: new Date().toISOString(),
      isDemoMode: true
    };
  }

  try {
    const { data, error } = await supabase
      .from('user_credit_cards')
      .insert([{
        ...cardData,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('[Vitta] Error adding card:', error);
      throw error;
    }

    console.log('[Vitta] Card added successfully:', data.id);
    return data;
  } catch (error) {
    console.error('[Vitta] Error in addCard:', error);
    throw error;
  }
};

/**
 * Get all cards for a user
 * @param {string} userId - User's ID
 * @returns {Promise<Array>} Array of card objects
 */
export const getUserCards = async (userId) => {
  if (!isSupabaseConfigured()) {
    console.log('[Vitta] Supabase not configured - demo mode');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_credit_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Vitta] Error fetching cards:', error);
      throw error;
    }

    console.log('[Vitta] Fetched cards from DB:', data);
    console.log('[Vitta] First card data:', data && data[0]);
    return data || [];
  } catch (error) {
    console.error('[Vitta] Error in getUserCards:', error);
    return [];
  }
};

/**
 * Update a credit card
 * @param {string} cardId - Card's ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated card object
 */
export const updateCard = async (cardId, updates) => {
  if (!isSupabaseConfigured()) {
    console.log('[Vitta] Supabase not configured - demo mode');
    return { id: cardId, ...updates, isDemoMode: true };
  }

  try {
    const { data, error } = await supabase
      .from('user_credit_cards')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      console.error('[Vitta] Error updating card:', error);
      throw error;
    }

    console.log('[Vitta] Card updated successfully:', cardId);
    return data;
  } catch (error) {
    console.error('[Vitta] Error in updateCard:', error);
    throw error;
  }
};

/**
 * Delete a credit card
 * @param {string} cardId - Card's ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
export const deleteCard = async (cardId) => {
  if (!isSupabaseConfigured()) {
    console.log('[Vitta] Supabase not configured - demo mode');
    return true;
  }

  try {
    const { error } = await supabase
      .from('user_credit_cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      console.error('[Vitta] Error deleting card:', error);
      throw error;
    }

    console.log('[Vitta] Card deleted successfully:', cardId);
    return true;
  } catch (error) {
    console.error('[Vitta] Error in deleteCard:', error);
    return false;
  }
};

/**
 * Calculate utilization rate for a card
 * @param {Object} card - Card object with credit_limit and current_balance
 * @returns {number} Utilization percentage (0-100)
 */
export const calculateUtilization = (card) => {
  if (!card.credit_limit || card.credit_limit === 0) return 0;
  return Math.round((card.current_balance / card.credit_limit) * 100);
};

/**
 * Get card recommendations based on user's cards
 * @param {Array} cards - User's credit cards
 * @returns {Object} Recommendations for different categories
 */
export const getCardRecommendations = (cards) => {
  if (!cards || cards.length === 0) {
    return {
      groceries: null,
      dining: null,
      gas: null,
      travel: null,
      general: null
    };
  }

  // Helper function to get reward multiplier for a category
  const getRewardMultiplier = (card, category) => {
    if (!card.reward_structure || typeof card.reward_structure !== 'object') {
      return 1; // Default 1x if no reward structure
    }

    // Check various possible category names in reward structure
    const categoryMappings = {
      groceries: ['groceries', 'grocery', 'supermarkets'],
      dining: ['dining', 'restaurants', 'restaurant'],
      gas: ['gas', 'fuel'],
      travel: ['travel', 'flights', 'hotels'],
      general: ['all purchases', 'everything', 'default']
    };

    const possibleKeys = categoryMappings[category] || [category];

    for (const key of possibleKeys) {
      if (card.reward_structure[key]) {
        return parseFloat(card.reward_structure[key]) || 1;
      }
    }

    // Check for default/catch-all rate
    return card.reward_structure.default || card.reward_structure['all purchases'] || 1;
  };

  // Find best card for each category
  const findBestCard = (category) => {
    return [...cards].sort((a, b) => {
      const aReward = getRewardMultiplier(a, category);
      const bReward = getRewardMultiplier(b, category);

      // If rewards are equal, prefer card with more available credit
      if (aReward === bReward) {
        const aAvailable = a.credit_limit - a.current_balance;
        const bAvailable = b.credit_limit - b.current_balance;
        return bAvailable - aAvailable;
      }

      return bReward - aReward; // Higher reward first
    })[0];
  };

  return {
    groceries: findBestCard('groceries'),
    dining: findBestCard('dining'),
    gas: findBestCard('gas'),
    travel: findBestCard('travel'),
    general: findBestCard('general')
  };
};

/**
 * Add a card from catalog with user-specific details
 * @param {string} userId - User's ID
 * @param {string} catalogId - Card catalog ID
 * @param {Object} userDetails - User-specific card details (balance, limit, etc.)
 * @returns {Promise<Object>} Created card object
 */
export const addCardFromCatalog = async (userId, catalogId, userDetails) => {
  try {
    // Get card details from catalog
    const catalogCard = await getCardById(catalogId);

    console.log('[addCardFromCatalog] Fetched catalog card:', catalogCard);
    console.log('[addCardFromCatalog] reward_structure:', catalogCard?.reward_structure);
    console.log('[addCardFromCatalog] issuer:', catalogCard?.issuer);
    console.log('[addCardFromCatalog] card_network:', catalogCard?.card_network);

    if (!catalogCard) {
      throw new Error('Card not found in catalog');
    }

    // Merge catalog data with user-specific details
    const cardData = {
      user_id: userId,
      catalog_id: catalogId,
      card_name: catalogCard.card_name,
      nickname: userDetails.nickname || null,
      card_type: catalogCard.card_network || null, // Legacy field, use network type
      issuer: catalogCard.issuer,
      card_network: catalogCard.card_network,
      reward_structure: catalogCard.reward_structure,
      apr: userDetails.apr !== undefined ? userDetails.apr : catalogCard.apr_min,
      annual_fee: catalogCard.annual_fee,
      grace_period_days: catalogCard.grace_period_days,
      is_manual_entry: false,
      // User-specific fields
      credit_limit: userDetails.credit_limit || 0,
      current_balance: userDetails.current_balance || 0,
      amount_to_pay: userDetails.amount_to_pay || 0,
      due_date: userDetails.due_date || null,
      statement_cycle_start: userDetails.statement_cycle_start || null,
      statement_cycle_end: userDetails.statement_cycle_end || null
    };

    console.log('[addCardFromCatalog] Final cardData being inserted:', cardData);
    console.log('[addCardFromCatalog] cardData.reward_structure:', cardData.reward_structure);

    return await addCard(cardData);
  } catch (error) {
    console.error('[Vitta] Error adding card from catalog:', error);
    throw error;
  }
};

/**
 * Add a manually entered card (not from catalog)
 * @param {string} userId - User's ID
 * @param {Object} cardData - Complete card data entered manually
 * @returns {Promise<Object>} Created card object
 */
export const addManualCard = async (userId, cardData) => {
  const manualCardData = {
    ...cardData,
    user_id: userId,
    catalog_id: null,
    is_manual_entry: true
  };

  return await addCard(manualCardData);
};

/**
 * Get catalog IDs of cards user already owns
 * @param {string} userId - User's ID
 * @returns {Promise<Array>} Array of catalog IDs
 */
export const getOwnedCatalogIds = async (userId) => {
  try {
    const userCards = await getUserCards(userId);
    return userCards
      .filter(card => card.catalog_id)
      .map(card => card.catalog_id);
  } catch (error) {
    console.error('[Vitta] Error getting owned catalog IDs:', error);
    return [];
  }
};
