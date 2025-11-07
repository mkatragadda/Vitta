/**
 * Recommendation Formatter - Plain Text Version
 * 
 * Uses plain text formatting instead of markdown tables
 * because the chat UI only supports ONE table per message
 */

import { detectUserProfile, getProfileAdvice, getProfileEmoji } from './userProfileDetector';

/**
 * Format all three strategies into plain text (no markdown tables)
 */
export function formatMultiStrategyRecommendations(cards, strategies, category = 'general', amount = 0) {
  const { rewards, apr, gracePeriod } = strategies;
  
  // Detect user profile
  const profile = detectUserProfile(cards);
  const emoji = getProfileEmoji(profile.profile);

  let response = '';

  // Header with profile
  response += `🎯 **Card Recommendations for ${category}`;
  if (amount > 0) {
    response += ` ($${amount.toLocaleString()} purchase)`;
  }
  response += `**\n\n`;

  response += `${emoji} **Your Profile**: ${profile.profile.replace('_', ' ')}\n`;
  response += `${profile.description}\n`;
  
  // Show note if using default amount
  if (amount === 1000) {
    response += `💡 Showing example with $1,000 purchase. Specify an amount for custom calculations.\n`;
  }
  
  response += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Reorder based on profile priority
  const tableOrder = getTableOrder(profile.priority);

  tableOrder.forEach((strategy, index) => {
    const optionNumber = index + 1;
    const isPriority = index === 0;
    
    if (strategy === 'rewards') {
      response += formatRewardsPlainText(rewards, amount, isPriority, optionNumber);
    } else if (strategy === 'apr') {
      response += formatAPRPlainText(apr, amount, isPriority, optionNumber);
    } else if (strategy === 'grace_period') {
      response += formatGracePeriodPlainText(gracePeriod, isPriority, optionNumber);
    }
    
    if (index < tableOrder.length - 1) {
      response += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
  });

  // Footer with advice
  response += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  response += getProfileAdvice(profile.profile, profile.metrics);
  response += `\n\n💭 **Want more details?** Ask: "Why not use [card name]?" or "Compare all strategies"`;

  return response;
}

/**
 * Format rewards in plain text
 */
function formatRewardsPlainText(recommendations, amount, isPriority, optionNumber) {
  let response = isPriority 
    ? `📊 **Option ${optionNumber}: Maximize Rewards** ⭐ BEST FOR YOU\n\n` 
    : `📊 **Option ${optionNumber}: Maximize Rewards**\n\n`;

  const eligible = recommendations.filter(r => r.canRecommend).slice(0, 5);
  const ineligible = recommendations.filter(r => !r.canRecommend);

  if (eligible.length === 0) {
    response += `⚠️ **No cards eligible** - All cards have balances (no grace period)\n`;
    response += `💡 **Tip**: Pay off card balances to unlock grace periods!\n`;
    return response;
  }

  // Show only the winner (top card)
  const winner = eligible[0];
  const cardName = winner.card.nickname || winner.card.card_name;
  
  response += `💰 **${cardName}**\n`;
  response += `   • ${winner.multiplier.toFixed(1)}x rewards\n`;
  
  if (amount > 0) {
    response += `   • Earn **$${winner.cashback.toFixed(2)}** on this purchase\n`;
  }

  if (ineligible.length > 0) {
    response += `\n⚠️ ${ineligible.length} other card(s) have balances - no grace period\n`;
  }

  return response;
}

/**
 * Format APR in plain text
 */
function formatAPRPlainText(recommendations, amount, isPriority, optionNumber) {
  let response = isPriority 
    ? `💳 **Option ${optionNumber}: Minimize Interest** ⭐ BEST FOR YOU\n\n` 
    : `💳 **Option ${optionNumber}: Minimize Interest**\n\n`;

  const top5 = recommendations.slice(0, 5);

  // Show only the winner (lowest APR)
  const best = top5[0];
  const cardName = best.card.nickname || best.card.card_name;
  
  response += `💡 **${cardName}**\n`;
  response += `   • Lowest APR: **${best.apr.toFixed(2)}%**\n`;
  
  if (amount > 0) {
    response += `   • Carrying $${amount.toLocaleString()} costs **$${best.monthlyInterest.toFixed(2)}/month**\n`;
  }

  return response;
}

/**
 * Format grace period in plain text
 */
function formatGracePeriodPlainText(recommendations, isPriority, optionNumber) {
  let response = isPriority 
    ? `⏰ **Option ${optionNumber}: Maximize Grace Period** ⭐ BEST FOR YOU\n\n` 
    : `⏰ **Option ${optionNumber}: Maximize Grace Period**\n\n`;

  const eligible = recommendations.filter(r => r.canRecommend).slice(0, 5);
  const ineligible = recommendations.filter(r => !r.canRecommend);

  if (eligible.length === 0) {
    response += `⚠️ **No grace periods available** - All cards have balances\n`;
    response += `💡 Pay off balances to unlock grace periods!\n`;
    return response;
  }

  // Show only the winner (longest grace period)
  const winner = eligible[0];
  const cardName = winner.card.nickname || winner.card.card_name;
  
  response += `⏰ **${cardName}**\n`;
  response += `   • **${winner.floatDays} days** to pay\n`;
  
  if (winner.paymentDue) {
    response += `   • Due: ${winner.paymentDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\n`;
  }

  if (ineligible.length > 0) {
    response += `\n⚠️ ${ineligible.length} other card(s) have balances - no grace period\n`;
  }

  return response;
}

/**
 * Get table order based on user priority
 */
function getTableOrder(priority) {
  if (!priority || priority.length === 0) {
    return ['rewards', 'apr', 'grace_period'];
  }
  
  return priority.map(p => {
    if (p === 'rewards') return 'rewards';
    if (p === 'apr') return 'apr';
    if (p === 'grace_period') return 'grace_period';
    return 'rewards';
  });
}

