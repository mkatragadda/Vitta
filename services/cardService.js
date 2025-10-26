import { supabase, isSupabaseConfigured } from '../config/supabase';

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
      general: null
    };
  }

  // Simple logic: recommend card with lowest balance or highest available credit
  const sortedByAvailableCredit = [...cards].sort((a, b) => {
    const aAvailable = a.credit_limit - a.current_balance;
    const bAvailable = b.credit_limit - b.current_balance;
    return bAvailable - aAvailable;
  });

  return {
    groceries: sortedByAvailableCredit[0],
    dining: sortedByAvailableCredit[0],
    gas: sortedByAvailableCredit[0],
    general: sortedByAvailableCredit[0]
  };
};
