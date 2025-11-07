/**
 * Recommendation Chat Handler
 * Conversational AI Financial Coach for card recommendations
 *
 * Philosophy: Act like a knowledgeable friend who understands your full portfolio
 * and gives personalized, context-aware advice - not robotic responses.
 */

import { getRecommendationForPurchase, getAllStrategyRecommendations } from '../recommendations/recommendationEngine.js';
import { getAllStrategies } from '../recommendations/recommendationStrategies.js';
import { formatMultiStrategyRecommendations } from '../recommendations/recommendationFormatter.js';
import { calculateFloatDays } from '../../utils/paymentCycleUtils.js';

/**
 * Handle card recommendation queries with conversational intelligence
 *
 * Examples:
 * - "Which card should I use at Costco?"
 * - "Best card for groceries today?"
 * - "I want to maximize rewards for dining"
 * - "Which card avoids interest for a $500 purchase?"
 * - "Help me choose a card for my trip next week"
 */
export const handleRecommendation = async (userCards, entities, query, userId) => {
  console.log('[RecommendationChatHandler] Handling recommendation', {
    cardsCount: userCards?.length || 0,
    entities,
    userId
  });

  // Guard: No cards in wallet
  if (!userCards || userCards.length === 0) {
    return {
      response: "I'd love to help you choose the best card, but you haven't added any cards to your wallet yet!\n\n" +
                "**Let's fix that:**\n" +
                "Add your first card in [My Wallet](vitta://navigate/cards) and I'll become your personal card coach — " +
                "helping you maximize rewards, avoid interest, and optimize every purchase.\n\n" +
                "**What I'll help you with:**\n" +
                "• Best card for each store or category\n" +
                "• Maximize rewards and cashback\n" +
                "• Minimize interest charges\n" +
                "• Optimize payment timing (float strategy)",
      hasRecommendation: false
    };
  }

  // Build purchase context from entities and query
  const context = buildPurchaseContext(entities, query);

  console.log('[RecommendationChatHandler] Purchase context:', context);

  // Determine user's goal from query
  const userGoal = detectUserGoal(query, context);

  console.log('[RecommendationChatHandler] Detected goal:', userGoal);

  // Get recommendation based on goal
  let recommendation;

  if (userGoal.compareAll) {
    // NEW ARCHITECTURE: Multi-strategy comparison with plain text format
    // IMPORTANT: Using plain text formatter because chat UI only supports ONE table per message
    console.log('[RecommendationHandler] Using NEW multi-strategy architecture (plain text)');
    const { formatMultiStrategyRecommendations: formatPlainText } = await import('../recommendations/recommendationFormatterPlainText.js');
    
    // Default to $1000 if no amount specified - crucial for showing dollar calculations
    const defaultAmount = context.amount || 1000;
    
    const strategies = getAllStrategies(
      userCards,
      context.category || context.merchant || 'general',
      defaultAmount
    );
    const formattedResponse = formatPlainText(
      userCards,
      strategies,
      context.category || context.merchant || 'general',
      defaultAmount
    );
    return {
      response: formattedResponse,
      hasRecommendation: true,
      recommendation: strategies
    };
  } else {
    // Single recommendation with specific strategy
    context.strategy = userGoal.strategy;
    recommendation = await getRecommendationForPurchase(userId, context);
    return formatSingleRecommendation(recommendation, context, query, userGoal);
  }
};

/**
 * Build purchase context from extracted entities and query
 */
const buildPurchaseContext = (entities, query) => {
  const context = {
    date: new Date() // Default to today
  };

  // Extract amount
  if (entities.amount) {
    context.amount = parseFloat(entities.amount);
  }

  // Extract category or merchant
  if (entities.merchant) {
    context.merchant = entities.merchant;
    context.category = inferCategoryFromMerchant(entities.merchant);
  } else if (entities.category) {
    context.category = entities.category;
  }

  // Extract date/timing context
  if (entities.timeframe) {
    context.date = parseDateFromTimeframe(entities.timeframe, query);
  }

  return context;
};

/**
 * Detect what the user is trying to optimize
 * Returns: { strategy: 'REWARDS_MAXIMIZER' | 'APR_MINIMIZER' | 'CASHFLOW_OPTIMIZER', compareAll: boolean, reasoning: string }
 */
const detectUserGoal = (query, context) => {
  const lowerQuery = query.toLowerCase();

  // Check for comparison request
  // DEFAULT: Show all 3 strategies (new architecture)
  // This gives users complete visibility into their best options
  // Only show single strategy if user explicitly asks for it
  
  // Detect if user wants ONLY a specific strategy (very explicit queries only)
  const goals = {
    // Rewards optimization ONLY (explicit)
    rewardsOnly: /only.*reward|just.*reward|exclusively.*reward|specifically.*reward/i.test(query),

    // APR/interest minimization ONLY (explicit)
    aprOnly: /only.*interest|just.*apr|only.*lowest.*rate|specifically.*apr/i.test(query),

    // Cashflow/float optimization ONLY (explicit)
    cashflowOnly: /only.*float|just.*cash flow|only.*grace.*period/i.test(query)
  };

  // If user is VERY explicit about wanting only one strategy, show that
  if (goals.aprOnly) {
    return {
      strategy: 'APR_MINIMIZER',
      compareAll: false,
      reasoning: 'User specifically wants only APR strategy'
    };
  }

  if (goals.rewardsOnly) {
    return {
      strategy: 'REWARDS_MAXIMIZER',
      compareAll: false,
      reasoning: 'User specifically wants only rewards strategy'
    };
  }

  if (goals.cashflowOnly) {
    return {
      strategy: 'CASHFLOW_OPTIMIZER',
      compareAll: false,
      reasoning: 'User specifically wants only cashflow strategy'
    };
  }

  // DEFAULT: Show all 3 strategies for complete visibility
  // This includes queries like "best card for X", "which card", "suggest card", etc.
  return {
    strategy: null,
    compareAll: true,
    reasoning: 'Showing all strategies for complete visibility'
  };
};

/**
 * Format single recommendation response with conversational tone
 */
const formatSingleRecommendation = (recommendation, context, query, userGoal) => {
  if (!recommendation.primary) {
    return {
      response: "I couldn't find the best card for that purchase right now. Let me help you add more details!\n\n" +
                "**What I need to know:**\n" +
                "• Where are you shopping? (e.g., 'Costco', 'gas station', 'restaurant')\n" +
                "• How much are you spending? (optional but helpful)\n" +
                "• What's your goal? (rewards, avoiding interest, or cash flow)\n\n" +
                "**Try asking:**\n" +
                "• 'Best card for $200 at Target'\n" +
                "• 'Which card for dining to maximize rewards'\n" +
                "• 'Lowest interest card for $1000 purchase'",
      hasRecommendation: false
    };
  }

  const card = recommendation.primary;
  const cardName = card.nickname || card.card_name || card.card_type;

  // Build conversational intro based on goal
  let intro = '';

  if (userGoal.strategy === 'REWARDS_MAXIMIZER') {
    intro = `💎 **Great choice asking!** To maximize your rewards${context.merchant ? ` at **${context.merchant}**` : ''}${context.category ? ` on **${context.category}**` : ''}, use your:`;
  } else if (userGoal.strategy === 'APR_MINIMIZER') {
    intro = `💰 **Smart thinking!** To minimize interest charges${context.amount ? ` on this $${context.amount} purchase` : ''}, use your:`;
  } else if (userGoal.strategy === 'CASHFLOW_OPTIMIZER') {
    intro = `📅 **Optimizing your cash flow!** For maximum float time${context.amount ? ` on $${context.amount}` : ''}, use your:`;
  } else {
    intro = `✨ Based on your wallet, here's my recommendation${context.merchant ? ` for **${context.merchant}**` : ''}:`;
  }

  // Card recommendation with emoji
  let response = `${intro}\n\n`;
  response += `## 💳 ${cardName}\n\n`;

  // Why this card? (reasoning)
  response += `**Why this card?**\n`;
  response += `${recommendation.reasoning}\n\n`;

  // Add specific benefits based on strategy
  if (userGoal.strategy === 'REWARDS_MAXIMIZER' && context.amount) {
    const estimatedValue = estimateRewardValue(card, context);
    if (estimatedValue > 0) {
      response += `💵 **Estimated value:** ~$${estimatedValue.toFixed(2)} in rewards\n\n`;
    }
  }

  if (userGoal.strategy === 'CASHFLOW_OPTIMIZER' && card.statement_close_day && card.grace_period_days) {
    const floatDays = calculateFloatDays(card, context.date || new Date());
    if (floatDays > 0) {
      response += `⏰ **Payment timing:** You'll have **${floatDays} days** before payment is due\n\n`;
    }
  }

  if (userGoal.strategy === 'APR_MINIMIZER') {
    if (card.apr === 0) {
      response += `🎉 **No interest!** This card has 0% APR — use it guilt-free!\n\n`;
    } else {
      response += `📊 **APR:** ${card.apr}% — lowest in your wallet\n\n`;
    }
  }

  // Show alternatives if available
  if (recommendation.alternatives && recommendation.alternatives.length > 0) {
    response += `**Other options:**\n`;
    recommendation.alternatives.slice(0, 2).forEach((altCard, idx) => {
      const altName = altCard.nickname || altCard.card_name || altCard.card_type;
      response += `${idx + 2}. **${altName}**`;

      // Brief reason why it's alternative
      if (altCard.score && card.score) {
        const scoreDiff = ((altCard.score / card.score) * 100).toFixed(0);
        if (scoreDiff >= 80) {
          response += ` — also excellent (${scoreDiff}% as good)`;
        }
      }
      response += `\n`;
    });
    response += `\n`;
  }

  // Coaching tip based on user's portfolio
  const tip = generateCoachingTip(recommendation, context, userGoal);
  if (tip) {
    response += `💡 **Coach's tip:** ${tip}\n\n`;
  }

  // Call to action
  response += `**Want to explore more?**\n`;
  response += `• [See full analysis](vitta://navigate/recommendations)\n`;
  response += `• Ask me: "Compare all strategies for this purchase"\n`;
  response += `• Or: "Why not use [another card name]?"`;

  return {
    response: response.trim(),
    hasRecommendation: true,
    recommendedCard: card,
    strategy: userGoal.strategy
  };
};

/**
 * Format multi-strategy comparison response
 * Exported for use in direct routing (follow-up handling)
 */
export const formatMultiStrategyResponse = (recommendations, context, query) => {
  console.log('[FormatMultiStrategy] Context:', context);
  console.log('[FormatMultiStrategy] Recommendations:', {
    rewards: recommendations.REWARDS_MAXIMIZER?.primary?.nickname,
    apr: recommendations.APR_MINIMIZER?.primary?.nickname,
    cashflow: recommendations.CASHFLOW_OPTIMIZER?.primary?.nickname
  });

  // Build purchase context header
  let purchaseContext = '';
  if (context.merchant || context.category) {
    purchaseContext = context.merchant || context.category;
    if (context.amount) {
      purchaseContext += ` ($${context.amount})`;
    }
  } else if (context.amount) {
    purchaseContext = `$${context.amount} purchase`;
  } else {
    purchaseContext = 'this purchase';
  }

  // Map merchant/category to reward category FIRST
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
  
  console.log('[FormatMultiStrategy] Reward category:', rewardCategory);

  // Start response with header AND table together (no line breaks)
  let response = `**Comparison for ${purchaseContext}:**\n\n`;
  response += `*Each row shows the best card for that optimization strategy*\n\n`;
  response += `| Strategy | Card | Rewards | Cashback | Utilization | APR |\n`;
  response += `|----------|------|---------|----------|-------------|-----|\n`;

  const strategies = [
    { key: 'REWARDS_MAXIMIZER', label: '💎 Rewards', rec: recommendations.REWARDS_MAXIMIZER },
    { key: 'APR_MINIMIZER', label: '💰 Low APR', rec: recommendations.APR_MINIMIZER },
    { key: 'CASHFLOW_OPTIMIZER', label: '📅 Cashflow', rec: recommendations.CASHFLOW_OPTIMIZER }
  ];

  // Track which cards are recommended for which strategies
  const cardStrategies = new Map();

  // Add each strategy to table
  strategies.forEach(({ label, key, rec }) => {
    if (rec?.primary) {
      const card = rec.primary;
      const cardName = card.nickname || card.card_name || card.card_type;
      
      // Track this card's strategies
      if (!cardStrategies.has(card.id)) {
        cardStrategies.set(card.id, { name: cardName, strategies: [], hasBalance: card.current_balance > 0 });
      }
      cardStrategies.get(card.id).strategies.push(key);
      
      // Get reward multiplier from reward_structure for the specific category
      const rewardStructure = card.reward_structure || {};
      const rewardMultiplier = rewardStructure[rewardCategory] || rewardStructure['default'] || 1;
      const rewards = `${rewardMultiplier.toFixed(1)}x`;
      
      console.log('[FormatMultiStrategy] Card:', cardName, 'Category:', rewardCategory, 'Multiplier:', rewardMultiplier, 'Structure:', rewardStructure, 'Balance:', card.current_balance);
      
      // Calculate cashback (rewards are in % cashback, so divide by 100)
      const amount = context.amount || 100; // Default to $100 for display
      const cashbackAmount = amount * (rewardMultiplier / 100);
      const cashback = `$${cashbackAmount.toFixed(2)}`;
      
      // Calculate utilization impact
      const currentUtil = (card.current_balance / card.credit_limit) * 100;
      const newBalance = card.current_balance + amount;
      const newUtil = (newBalance / card.credit_limit) * 100;
      const utilization = `${currentUtil.toFixed(0)}% → ${newUtil.toFixed(0)}%`;
      
      // APR
      const apr = card.apr !== undefined ? `${card.apr.toFixed(2)}%` : 'N/A';
      
      // Warning for cashflow with balance
      let cardDisplayName = cardName;
      if (key === 'CASHFLOW_OPTIMIZER' && card.current_balance > 0) {
        cardDisplayName = `⚠️ ${cardName}`;
      }
      
      response += `| ${label} | ${cardDisplayName} | ${rewards} | ${cashback} | ${utilization} | ${apr} |\n`;
    }
  });

  response += `\n`;

  // Add notes about warnings and duplicate cards
  let hasWarnings = false;
  let hasDuplicates = false;
  
  cardStrategies.forEach((info, cardId) => {
    if (info.strategies.includes('CASHFLOW_OPTIMIZER') && info.hasBalance) {
      hasWarnings = true;
    }
    if (info.strategies.length > 1) {
      hasDuplicates = true;
    }
  });

  if (hasWarnings || hasDuplicates) {
    response += `**Notes:**\n`;
    
    if (hasWarnings) {
      response += `- ⚠️ = Card has a balance, so **no grace period** available. Interest charges immediately on new purchases. Not ideal for cashflow optimization.\n`;
    }
    
    if (hasDuplicates) {
      cardStrategies.forEach((info, cardId) => {
        if (info.strategies.length > 1) {
          const strategyNames = info.strategies.map(s => {
            if (s === 'REWARDS_MAXIMIZER') return 'Rewards';
            if (s === 'APR_MINIMIZER') return 'Low APR';
            if (s === 'CASHFLOW_OPTIMIZER') return 'Cashflow';
            return s;
          });
          response += `- **${info.name}** wins for ${strategyNames.length} strategies: ${strategyNames.join(' + ')}\n`;
        }
      });
    }
    
    response += `\n`;
  }

  // Add detailed recommendations
  response += `**Recommendation:**\n\n`;

  const rewardsRec = recommendations.REWARDS_MAXIMIZER;
  const aprRec = recommendations.APR_MINIMIZER;
  const cashflowRec = recommendations.CASHFLOW_OPTIMIZER;

  // Check if same card wins multiple strategies
  const allSameCard = rewardsRec?.primary && aprRec?.primary && cashflowRec?.primary &&
                      rewardsRec.primary.id === aprRec.primary.id && 
                      aprRec.primary.id === cashflowRec.primary.id;

  if (allSameCard) {
    const winningCard = rewardsRec.primary.nickname || rewardsRec.primary.card_name;
    response += `**${winningCard}** wins across all strategies! It offers the best rewards, lowest APR, and optimal cash flow for ${purchaseContext}.\n\n`;
  } else {
    // Different cards for different strategies
    let strategyNum = 1;
    
    if (rewardsRec?.primary) {
      const card = rewardsRec.primary;
      const rewardStructure = card.reward_structure || {};
      const multiplier = rewardStructure[rewardCategory] || rewardStructure['default'] || 1;
      response += `${strategyNum}. **${card.nickname || card.card_name}** (Rewards): ${multiplier}x cashback = best value for ${purchaseContext}\n\n`;
      strategyNum++;
    }
    
    if (aprRec?.primary && aprRec.primary.id !== rewardsRec?.primary?.id) {
      const card = aprRec.primary;
      response += `${strategyNum}. **${card.nickname || card.card_name}** (Low APR): ${card.apr.toFixed(2)}% APR = best if carrying balance\n\n`;
      strategyNum++;
    }
    
    if (cashflowRec?.primary && 
        cashflowRec.primary.id !== rewardsRec?.primary?.id && 
        cashflowRec.primary.id !== aprRec?.primary?.id) {
      const card = cashflowRec.primary;
      response += `${strategyNum}. **${card.nickname || card.card_name}** (Cashflow): Latest due date = maximize float\n\n`;
    }
  }

  // Add coaching tip
  response += `💡 **Coach's tip:** `;
  if (allSameCard) {
    response += `This card is your best choice no matter your goal!`;
  } else {
    response += `Pay in full monthly? Choose **Rewards**. Carrying balance? Choose **Low APR**. Want float? Choose **Cashflow**.`;
  }

  return {
    response: response.trim(),
    hasRecommendation: true,
    multiStrategy: true
  };
};

/**
 * Generate personalized coaching tip based on user's situation
 */
const generateCoachingTip = (recommendation, context, userGoal) => {
  const card = recommendation.primary;

  // Warning: No grace period
  if (card._noGracePeriod) {
    return "⚠️ This card is carrying a balance, so you'll start paying interest immediately on new purchases. Consider paying it off first!";
  }

  // Warning: High utilization
  const utilization = (card.current_balance / card.credit_limit) * 100;
  if (utilization > 50) {
    return `This card is at ${utilization.toFixed(0)}% utilization. Keep it under 30% for a better credit score.`;
  }

  // Tip: Multiple cards with good rewards
  if (userGoal.strategy === 'REWARDS_MAXIMIZER' && recommendation.alternatives?.length > 0) {
    const topAlt = recommendation.alternatives[0];
    if (topAlt.score >= card.score * 0.9) {
      return `Your ${topAlt.nickname || topAlt.card_name} is almost as good for this! You have great reward cards.`;
    }
  }

  // Tip: APR optimization
  if (userGoal.strategy === 'APR_MINIMIZER' && card.apr > 0) {
    return `Consider paying this off before the statement closes to avoid the ${card.apr}% APR.`;
  }

  // Tip: Float optimization
  if (userGoal.strategy === 'CASHFLOW_OPTIMIZER') {
    return "Remember: float only works if you pay in full each month. Carrying balances means immediate interest!";
  }

  return null;
};

/**
 * Estimate reward value for a purchase
 */
const estimateRewardValue = (card, context) => {
  if (!context.amount) return 0;

  const category = context.category || 'default';
  const rewardStructure = card.reward_structure || {};
  const multiplier = rewardStructure[category] || rewardStructure.default || 1;

  // Assume 1 point = $0.01
  return (context.amount * multiplier) / 100;
};

/**
 * Infer category from merchant name
 */
const inferCategoryFromMerchant = (merchant) => {
  const lowerMerchant = merchant.toLowerCase();

  const categoryMap = {
    'groceries': ['costco', 'whole foods', 'trader joe', 'safeway', 'kroger', 'walmart', 'target', 'grocery'],
    'dining': ['restaurant', 'chipotle', 'mcdonald', 'starbucks', 'cafe', 'pizza', 'burger'],
    'gas': ['gas', 'shell', 'chevron', 'exxon', 'bp', 'fuel'],
    'travel': ['airline', 'hotel', 'airbnb', 'uber', 'lyft', 'flight'],
    'online': ['amazon', 'ebay', 'online']
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => lowerMerchant.includes(keyword))) {
      return category;
    }
  }

  return 'default';
};

/**
 * Parse date from timeframe entity
 */
const parseDateFromTimeframe = (timeframe, query) => {
  const today = new Date();
  const lowerTimeframe = timeframe.toLowerCase();

  if (lowerTimeframe.includes('today') || lowerTimeframe.includes('now')) {
    return today;
  }

  if (lowerTimeframe.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  if (lowerTimeframe.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  return today; // Default to today
};
