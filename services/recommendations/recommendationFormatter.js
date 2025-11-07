/**
 * Recommendation Formatter
 * Formats three separate recommendation strategies into clean, readable tables
 * Each table shows actual $$ impact and clear winners
 */

import { detectUserProfile, getProfileAdvice, getProfileEmoji } from './userProfileDetector';

/**
 * Format all three strategies into separate tables
 * @param {Array} cards - User's cards
 * @param {Object} strategies - Results from getAllStrategies()
 * @param {string} category - Purchase category
 * @param {number} amount - Purchase amount
 * @returns {string} Formatted response with 3 tables
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
  response += `${profile.description}\n\n`;
  response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Reorder tables based on profile priority
  const tableOrder = getTableOrder(profile.priority);

  tableOrder.forEach((strategy, index) => {
    const optionNumber = index + 1; // Dynamic option number based on order
    const isPriority = index === 0; // First table is always the priority
    
    if (strategy === 'rewards') {
      response += formatRewardsTable(rewards, amount, isPriority, optionNumber);
    } else if (strategy === 'apr') {
      response += formatAPRTable(apr, amount, isPriority, optionNumber);
    } else if (strategy === 'grace_period') {
      response += formatGracePeriodTable(gracePeriod, isPriority, optionNumber);
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
 * Format rewards optimization table
 */
function formatRewardsTable(recommendations, amount, isPriority, optionNumber = 1) {
  let response = isPriority ? `📊 **Option ${optionNumber}: Maximize Rewards** ⭐ BEST FOR YOU\n\n` : `📊 **Option ${optionNumber}: Maximize Rewards**\n\n`;

  // Only show cards with grace period (can actually earn rewards)
  const eligible = recommendations.filter(r => r.canRecommend).slice(0, 5);
  const ineligible = recommendations.filter(r => !r.canRecommend);

  if (eligible.length === 0) {
    response += `⚠️ **No cards eligible** - All cards have balances (no grace period)\n`;
    response += `💡 **Tip**: Pay off card balances to unlock grace periods and earn rewards without interest!\n\n`;
    
    // Show what they're missing
    if (ineligible.length > 0 && amount > 0) {
      const bestPotential = ineligible[0];
      response += `📉 **You're missing out**: If ${bestPotential.card.nickname || bestPotential.card.card_name} had no balance, you could earn $${bestPotential.cashback.toFixed(2)}!\n`;
    }
    return response;
  }

  // Table header (blank line before table for proper markdown rendering)
  response += `\n| Card | Rewards | You Earn | Annual Value* |\n`;
  response += `|------|---------|----------|---------------|\n`;

  // Table rows
  eligible.forEach(rec => {
    const cardName = (rec.card.nickname || rec.card.card_name).substring(0, 20);
    const multiplier = `${rec.multiplier.toFixed(1)}x`;
    const earnAmount = amount > 0 ? `**$${rec.cashback.toFixed(2)}**` : '-';
    const annualValue = amount > 0 ? `$${Math.round(rec.annualValue)}` : '-';
    
    response += `| ${cardName} | ${multiplier} | ${earnAmount} | ${annualValue} |\n`;
  });

  // Blank line after table (required for markdown)
  response += `\n\n`;

  // Winner
  if (eligible[0] && amount > 0) {
    const winner = eligible[0];
    response += `💰 **Winner**: ${winner.card.nickname || winner.card.card_name} - Earn **$${winner.cashback.toFixed(2)}** on this purchase\n`;
    
    if (winner.annualValue > 0) {
      response += `📈 **Annual Impact**: Spending $${amount.toLocaleString()}/month = **$${Math.round(winner.annualValue)}/year** in rewards!\n`;
    }
  }

  // Show ineligible cards warning
  if (ineligible.length > 0) {
    response += `\n⚠️ **${ineligible.length} card(s) have balances** - no grace period available\n`;
  }

  response += `\n*If you make this purchase monthly\n`;

  return response;
}

/**
 * Format APR optimization table
 */
function formatAPRTable(recommendations, amount, isPriority, optionNumber = 2) {
  let response = isPriority ? `💳 **Option ${optionNumber}: Minimize Interest** ⭐ BEST FOR YOU\n\n` : `💳 **Option ${optionNumber}: Minimize Interest** (If you carry a balance)\n\n`;

  const top5 = recommendations.slice(0, 5);

  // Table header (blank line before table for proper markdown rendering)
  response += `\n| Card | APR | Interest/Month | Interest/Year |\n`;
  response += `|------|-----|----------------|---------------|\n`;

  // Table rows
  top5.forEach(rec => {
    const cardName = (rec.card.nickname || rec.card.card_name).substring(0, 20);
    const aprText = `${rec.apr.toFixed(2)}%`;
    const monthlyText = `**$${rec.monthlyInterest.toFixed(2)}**`;
    const annualText = `$${Math.round(rec.annualInterest)}`;
    
    response += `| ${cardName} | ${aprText} | ${monthlyText} | ${annualText} |\n`;
  });

  // Blank line after table (required for markdown)
  response += `\n\n`;

  // Winner and savings
  if (top5.length > 0) {
    const best = top5[0];
    const worst = top5[top5.length - 1];
    const savings = worst.annualInterest - best.annualInterest;
    
    response += `💡 **Winner**: ${best.card.nickname || best.card.card_name} - Lowest APR at ${best.apr.toFixed(2)}%\n`;
    
    if (amount > 0) {
      response += `⚠️ **Cost**: Carrying $${amount.toLocaleString()} balance = ~$${best.monthlyInterest.toFixed(2)}/month interest\n`;
      
      if (savings > 1) {
        response += `💰 **Savings**: Save $${Math.round(savings)}/year vs highest APR card\n`;
      }
    }
  }

  return response;
}

/**
 * Format grace period optimization table
 */
function formatGracePeriodTable(recommendations, isPriority, optionNumber = 3) {
  let response = isPriority ? `⏰ **Option ${optionNumber}: Maximize Grace Period** ⭐ BEST FOR YOU\n\n` : `⏰ **Option ${optionNumber}: Maximize Grace Period** (Best for cash flow)\n\n`;

  const eligible = recommendations.filter(r => r.canRecommend).slice(0, 5);
  const ineligible = recommendations.filter(r => !r.canRecommend);

  if (eligible.length === 0) {
    response += `⚠️ **No grace periods available** - All cards have balances\n`;
    response += `💡 **Tip**: Pay off balances to unlock grace periods and avoid immediate interest charges!\n`;
    return response;
  }

  // Table header (blank line before table for proper markdown rendering)
  response += `\n| Card | Days to Pay | Payment Due | Grace Period |\n`;
  response += `|------|-------------|-------------|---------------|\n`;

  // Show ALL cards (eligible first, then ineligible with warnings)
  const allRecs = [...eligible, ...ineligible].slice(0, 5);
  
  allRecs.forEach(rec => {
    const cardName = (rec.card.nickname || rec.card.card_name).substring(0, 20);
    const floatText = rec.hasGracePeriod ? `**${rec.floatDays}** days` : '0 days';
    const dueText = rec.paymentDue ? rec.paymentDue.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : '-';
    const status = rec.hasGracePeriod ? '✅ Available' : '⚠️ No grace*';
    
    response += `| ${cardName} | ${floatText} | ${dueText} | ${status} |\n`;
  });

  // Blank line after table (required for markdown)
  response += `\n\n`;

  // Winner
  if (eligible[0]) {
    const winner = eligible[0];
    response += `💡 **Winner**: ${winner.card.nickname || winner.card.name} - **${winner.floatDays} days** to pay\n`;
    response += `📅 **Payment Due**: ${winner.paymentDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n`;
  }

  // Warning about cards without grace
  if (ineligible.length > 0) {
    response += `\n⚠️ ***Cards with asterisk have balances - no grace period available**\n`;
    response += `Interest charges immediately on new purchases!\n`;
  }

  return response;
}

/**
 * Get table order based on user priority
 */
function getTableOrder(priority) {
  // Default order if not specified
  if (!priority || priority.length === 0) {
    return ['rewards', 'apr', 'grace_period'];
  }
  
  return priority.map(p => {
    if (p === 'rewards') return 'rewards';
    if (p === 'apr') return 'apr';
    if (p === 'grace_period') return 'grace_period';
    return 'rewards'; // fallback
  });
}

/**
 * Format comparison of multiple cards (for "compare" queries)
 * Shows side-by-side comparison across all three strategies
 */
export function formatCardComparison(cards, cardNames, category, amount) {
  // Implementation for card comparison view
  // This would be used for "compare X vs Y" queries
  // TODO: Implement if needed
  return 'Card comparison view - to be implemented';
}

