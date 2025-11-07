/**
 * Card Comparison Handler
 * Explains why one card is better than another for a specific purchase
 * Handles queries like "why not use X card" or "why is X better than Y"
 */

/**
 * Compare two cards for a specific purchase context
 * @param {Object} recommendedCard - The card that was recommended
 * @param {Object} alternativeCard - The card user is asking about
 * @param {Object} context - Purchase context (merchant, category, amount)
 * @param {string} strategy - Strategy being used
 * @returns {string} - Detailed comparison explanation
 */
export const compareCards = (recommendedCard, alternativeCard, context, strategy = 'REWARDS_MAXIMIZER') => {
  const recCard = recommendedCard.nickname || recommendedCard.card_name || 'Recommended card';
  const altCard = alternativeCard.nickname || alternativeCard.card_name || 'Alternative card';
  
  // Determine category for reward lookup
  const categoryMapping = {
    'groceries': 'groceries',
    'grocery': 'groceries',
    'supermarket': 'groceries',
    'dining': 'dining',
    'restaurant': 'dining',
    'gas': 'gas',
    'fuel': 'gas',
    'travel': 'travel',
    'flight': 'travel',
    'hotel': 'travel'
  };
  
  const merchantLower = (context.merchant || context.category || '').toLowerCase();
  const rewardCategory = categoryMapping[merchantLower] || 'default';
  
  console.log('[CardComparison] Comparing cards for category:', rewardCategory);
  
  let response = `## 🔍 Card Comparison: ${recCard} vs ${altCard}\n\n`;
  
  if (context.merchant || context.category) {
    response += `**For:** ${context.merchant || context.category}`;
    if (context.amount) {
      response += ` ($${context.amount})`;
    }
    response += `\n\n`;
  }
  
  // Get reward multipliers
  const recRewardStructure = recommendedCard.reward_structure || {};
  const altRewardStructure = alternativeCard.reward_structure || {};
  
  const recMultiplier = recRewardStructure[rewardCategory] || recRewardStructure['default'] || 1;
  const altMultiplier = altRewardStructure[rewardCategory] || altRewardStructure['default'] || 1;
  
  console.log('[CardComparison] Multipliers:', {
    recommended: recMultiplier,
    alternative: altMultiplier
  });
  
  // Strategy-specific comparison
  if (strategy === 'REWARDS_MAXIMIZER') {
    response += `### 💎 Rewards Comparison\n\n`;
    
    // Reward multipliers
    response += `**${recCard}:** ${recMultiplier}x cashback\n`;
    response += `**${altCard}:** ${altMultiplier}x cashback\n\n`;
    
    // Calculate value difference
    const amount = context.amount || 100;
    const recValue = amount * (recMultiplier / 100);
    const altValue = amount * (altMultiplier / 100);
    const difference = recValue - altValue;
    
    response += `**Value for $${amount} purchase:**\n`;
    response += `• ${recCard}: $${recValue.toFixed(2)}\n`;
    response += `• ${altCard}: $${altValue.toFixed(2)}\n\n`;
    
    if (difference > 0) {
      response += `✅ **${recCard} earns $${difference.toFixed(2)} MORE** (${((difference/altValue)*100).toFixed(0)}% better)\n\n`;
    } else if (difference < 0) {
      response += `⚠️ **${altCard} would earn $${Math.abs(difference).toFixed(2)} MORE**\n\n`;
    } else {
      response += `🟰 **Both cards earn the same rewards**\n\n`;
    }
    
    // Explain category bonuses
    if (recMultiplier > altMultiplier) {
      response += `**Why ${recCard} wins:**\n`;
      
      if (rewardCategory !== 'default' && recRewardStructure[rewardCategory]) {
        response += `• Has **${recMultiplier}x category bonus** for ${rewardCategory}\n`;
      }
      
      if (altMultiplier === altRewardStructure['default']) {
        response += `• ${altCard} only offers **${altMultiplier}x flat rate** (no category bonus)\n`;
      }
    } else if (altMultiplier > recMultiplier) {
      response += `**Why ${altCard} might be better:**\n`;
      response += `• Has **${altMultiplier}x category bonus** for ${rewardCategory}\n`;
      response += `• ${recCard} only offers **${recMultiplier}x** for this category\n`;
    }
    
    response += `\n`;
  }
  
  // Utilization comparison
  response += `### 📊 Utilization Impact\n\n`;
  
  const recUtil = (recommendedCard.current_balance / recommendedCard.credit_limit) * 100;
  const altUtil = (alternativeCard.current_balance / alternativeCard.credit_limit) * 100;
  
  const amount = context.amount || 100;
  const recNewUtil = ((recommendedCard.current_balance + amount) / recommendedCard.credit_limit) * 100;
  const altNewUtil = ((alternativeCard.current_balance + amount) / alternativeCard.credit_limit) * 100;
  
  response += `**Current utilization:**\n`;
  response += `• ${recCard}: ${recUtil.toFixed(0)}% → ${recNewUtil.toFixed(0)}%\n`;
  response += `• ${altCard}: ${altUtil.toFixed(0)}% → ${altNewUtil.toFixed(0)}%\n\n`;
  
  if (recNewUtil < altNewUtil) {
    response += `✅ **${recCard} keeps utilization lower** (better for credit score)\n\n`;
  } else if (altNewUtil < recNewUtil) {
    response += `⚠️ **${altCard} would have lower utilization**\n\n`;
  }
  
  // APR comparison
  response += `### 💰 APR Comparison\n\n`;
  response += `• ${recCard}: ${recommendedCard.apr}% APR\n`;
  response += `• ${altCard}: ${alternativeCard.apr}% APR\n\n`;
  
  if (recommendedCard.apr < alternativeCard.apr) {
    response += `✅ **${recCard} has lower APR** (better if carrying balance)\n\n`;
  } else if (alternativeCard.apr < recommendedCard.apr) {
    response += `⚠️ **${altCard} has lower APR** (${(alternativeCard.apr - recommendedCard.apr).toFixed(2)}% difference)\n\n`;
  }
  
  // Final recommendation
  response += `---\n\n`;
  response += `**Bottom line:**\n\n`;
  
  // Calculate overall winner
  let recScore = 0;
  let altScore = 0;
  
  if (recMultiplier > altMultiplier) recScore += 3;
  else if (altMultiplier > recMultiplier) altScore += 3;
  
  if (recNewUtil < altNewUtil) recScore += 1;
  else if (altNewUtil < recNewUtil) altScore += 1;
  
  if (recommendedCard.apr < alternativeCard.apr) recScore += 1;
  else if (alternativeCard.apr < recommendedCard.apr) altScore += 1;
  
  if (recScore > altScore) {
    response += `✅ **Use ${recCard}** - Better rewards and overall value for ${context.merchant || context.category || 'this purchase'}`;
  } else if (altScore > recScore) {
    response += `⚠️ **${altCard} might be better** - Consider using it instead`;
  } else {
    response += `🟰 **Both cards are similar** - Either works, slight edge to ${recCard}`;
  }
  
  return response.trim();
};

/**
 * Handle "why not use X" queries
 * @param {Array} cards - User's cards
 * @param {Object} entities - Extracted entities
 * @param {Object} context - Conversation context
 * @returns {string} - Explanation
 */
export const handleWhyNotCard = (cards, entities, context) => {
  console.log('[CardComparison] Handling "why not" query');
  console.log('[CardComparison] Entities:', entities);
  console.log('[CardComparison] Context:', context);
  
  // Get the rejected card name from entities
  const rejectedCardName = entities.rejectedCard || entities.cardName;
  
  if (!rejectedCardName) {
    return "I'd be happy to explain! Which card are you asking about?";
  }
  
  // Find the rejected card
  const rejectedCard = cards.find(card => {
    const cardName = (card.nickname || card.card_name || '').toLowerCase();
    return cardName.includes(rejectedCardName.toLowerCase());
  });
  
  if (!rejectedCard) {
    return `I don't see a card called "${rejectedCardName}" in your wallet. Could you check the name?`;
  }
  
  // Get the recommended card from context
  const lastIntent = context.lastIntent;
  const contextEntities = context.entities || {};
  
  if (lastIntent !== 'card_recommendation') {
    return `To compare cards, first ask me which card to use for a specific purchase (e.g., "which card for groceries"), then I can explain why I didn't recommend ${rejectedCard.nickname || rejectedCard.card_name}.`;
  }
  
  // Find the recommended card (highest rewards for the category)
  const merchant = contextEntities.merchant || contextEntities.category;
  
  if (!merchant) {
    return `I need to know what purchase you're comparing for. Try asking "which card for [merchant/category]" first.`;
  }
  
  // Get recommendations for this merchant
  const categoryMapping = {
    'groceries': 'groceries',
    'grocery': 'groceries',
    'dining': 'dining',
    'gas': 'gas',
    'travel': 'travel'
  };
  
  const category = categoryMapping[merchant.toLowerCase()] || 'default';
  
  // Score cards for this category
  const scoredCards = cards.map(card => {
    const rewardStructure = card.reward_structure || {};
    const multiplier = rewardStructure[category] || rewardStructure['default'] || 1;
    return { ...card, multiplier, score: multiplier * 100 };
  }).sort((a, b) => b.score - a.score);
  
  const recommendedCard = scoredCards[0];
  
  // Compare the two cards
  return compareCards(
    recommendedCard,
    rejectedCard,
    { merchant, category, amount: contextEntities.amount },
    'REWARDS_MAXIMIZER'
  );
};


