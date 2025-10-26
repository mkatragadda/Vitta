/**
 * Intelligent Card Analysis Service
 * Analyzes user queries and provides contextual responses based on card data
 */

// Merchant category mappings with reward multipliers
const MERCHANT_REWARDS = {
  'costco': { category: 'warehouse', keywords: ['costco', 'warehouse'] },
  'grocery': { category: 'groceries', keywords: ['grocery', 'groceries', 'supermarket', 'whole foods', 'trader joes', 'safeway', 'kroger'] },
  'gas': { category: 'gas', keywords: ['gas', 'fuel', 'chevron', 'shell', 'exxon', 'bp'] },
  'restaurant': { category: 'dining', keywords: ['restaurant', 'dining', 'food', 'eat', 'chipotle', 'mcdonalds', 'starbucks'] },
  'travel': { category: 'travel', keywords: ['travel', 'flight', 'hotel', 'airline', 'airbnb', 'uber', 'lyft'] }
};

// Card type reward structures (common knowledge base)
const CARD_REWARD_DATABASE = {
  'amex gold': { dining: 4, grocery: 4, travel: 3, default: 1 },
  'chase freedom': { rotating: 5, default: 1 },
  'chase sapphire': { travel: 3, dining: 3, default: 1 },
  'citi double cash': { default: 2 },
  'discover it': { rotating: 5, default: 1 },
  'capital one venture': { travel: 2, default: 1 }
};

/**
 * Analyze user query and extract intent
 */
export const analyzeQuery = (query, cards) => {
  const lowerQuery = query.toLowerCase();

  console.log('[CardAnalyzer] Analyzing query:', query);
  console.log('[CardAnalyzer] Cards received:', cards?.length || 0);

  // Detect query type
  const queryTypes = {
    navigate: /take me to|go to|navigate to|show me.*screen|open.*screen|manage cards|view.*wallet|access.*optimizer|cards screen|wallet screen|payment.*screen|optimizer screen|dashboard screen/i.test(query),
    listCards: /what.*cards|show.*cards|my cards|cards in.*wallet|list.*cards|cards.*in.*my.*wallet/i.test(query),
    bestCard: /best card|which card|recommend|use at|shopping at/i.test(query),
    paymentDue: /payment.*due|due date|when.*due|upcoming payment/i.test(query),
    addCard: /add card|new card|add.*card/i.test(query),
    cardDetails: /balance|limit|apr|utilization|details/i.test(query),
    optimize: /optimize|save money|reduce interest|payment strategy/i.test(query)
  };

  const detectedType = Object.keys(queryTypes).find(key => queryTypes[key]) || 'general';
  console.log('[CardAnalyzer] Detected type:', detectedType);

  return {
    type: detectedType,
    query: lowerQuery,
    cards
  };
};

/**
 * Find best card for a specific merchant or category
 */
export const findBestCardForMerchant = (merchant, cards) => {
  if (!cards || cards.length === 0) {
    return null;
  }

  const lowerMerchant = merchant.toLowerCase();

  // Determine category
  let category = 'default';
  for (const [key, data] of Object.entries(MERCHANT_REWARDS)) {
    if (data.keywords.some(keyword => lowerMerchant.includes(keyword))) {
      category = data.category;
      break;
    }
  }

  // Score each card
  const scoredCards = cards.map(card => {
    const cardTypeLower = card.card_type.toLowerCase();
    let rewardMultiplier = 1;

    // Check if we have reward data for this card
    for (const [cardKey, rewards] of Object.entries(CARD_REWARD_DATABASE)) {
      if (cardTypeLower.includes(cardKey)) {
        rewardMultiplier = rewards[category] || rewards.default || 1;
        break;
      }
    }

    // Calculate score based on:
    // 1. Reward multiplier (higher is better)
    // 2. APR (lower is better, matters if carrying balance)
    // 3. Available credit (need room to charge)
    // 4. Statement cycle (prefer cards in grace period)

    const availableCredit = card.credit_limit - card.current_balance;
    const utilizationPenalty = availableCredit < 100 ? -5 : 0; // Penalize if low available credit
    const aprBonus = card.apr < 20 ? 2 : 0; // Bonus for low APR

    const score = (rewardMultiplier * 10) + aprBonus + utilizationPenalty;

    return {
      ...card,
      score,
      rewardMultiplier,
      availableCredit,
      reason: generateRecommendationReason(card, rewardMultiplier, category)
    };
  });

  // Sort by score and return best
  scoredCards.sort((a, b) => b.score - a.score);
  return scoredCards[0];
};

/**
 * Generate human-readable recommendation reason
 */
const generateRecommendationReason = (card, rewardMultiplier, category) => {
  const reasons = [];

  if (rewardMultiplier > 1) {
    reasons.push(`${rewardMultiplier}x rewards on ${category}`);
  }

  if (card.apr < 20) {
    reasons.push(`low APR of ${card.apr}%`);
  }

  const utilization = Math.round((card.current_balance / card.credit_limit) * 100);
  if (utilization < 30) {
    reasons.push(`plenty of available credit ($${(card.credit_limit - card.current_balance).toLocaleString()})`);
  }

  return reasons.join(', ') || 'general use';
};

/**
 * Find upcoming payment due dates
 */
export const findUpcomingPayments = (cards, daysAhead = 7) => {
  if (!cards || cards.length === 0) return [];

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  return cards
    .filter(card => card.due_date)
    .map(card => ({
      ...card,
      dueDate: new Date(card.due_date),
      daysUntilDue: Math.ceil((new Date(card.due_date) - today) / (1000 * 60 * 60 * 24))
    }))
    .filter(card => card.dueDate >= today && card.dueDate <= futureDate)
    .sort((a, b) => a.dueDate - b.dueDate);
};

/**
 * Generate response for listing cards
 */
export const generateCardListResponse = (cards) => {
  if (!cards || cards.length === 0) {
    return "You don't have any cards in your wallet yet. Would you like to add one?";
  }

  let response = `You have ${cards.length} card${cards.length > 1 ? 's' : ''} in your wallet:\n\n`;

  cards.forEach((card, index) => {
    const availableCredit = card.credit_limit - card.current_balance;
    const utilization = Math.round((card.current_balance / card.credit_limit) * 100);

    response += `${index + 1}. **${card.card_name || card.card_type}**\n`;
    response += `   - Balance: $${card.current_balance.toLocaleString()} / $${card.credit_limit.toLocaleString()} (${utilization}% utilization)\n`;
    response += `   - APR: ${card.apr}%\n`;
    response += `   - Available: $${availableCredit.toLocaleString()}\n`;
    if (card.due_date) {
      response += `   - Payment Due: ${new Date(card.due_date).toLocaleDateString()}\n`;
    }
    response += '\n';
  });

  return response.trim();
};

/**
 * Generate response for best card recommendation
 */
export const generateBestCardResponse = (merchant, cards) => {
  const bestCard = findBestCardForMerchant(merchant, cards);

  if (!bestCard) {
    return `I couldn't find a suitable card for shopping at ${merchant}. Would you like to add a card to your wallet?`;
  }

  let response = `For shopping at **${merchant}**, I recommend using your **${bestCard.card_name || bestCard.card_type}**.\n\n`;
  response += `**Why this card?**\n`;
  response += `- ${bestCard.reason}\n`;
  response += `- Available credit: $${bestCard.availableCredit.toLocaleString()}\n`;

  if (bestCard.current_balance > 0) {
    response += `\n*Note: You currently have a balance of $${bestCard.current_balance.toLocaleString()} on this card.*`;
  }

  return response;
};

/**
 * Generate response for upcoming payments
 */
export const generatePaymentDueResponse = (cards, daysAhead = 7) => {
  const upcomingPayments = findUpcomingPayments(cards, daysAhead);

  if (upcomingPayments.length === 0) {
    return `You don't have any payments due in the next ${daysAhead} days. 🎉`;
  }

  let response = `You have ${upcomingPayments.length} payment${upcomingPayments.length > 1 ? 's' : ''} due in the next ${daysAhead} days:\n\n`;

  upcomingPayments.forEach(payment => {
    const urgency = payment.daysUntilDue <= 2 ? '⚠️ URGENT' : payment.daysUntilDue <= 5 ? '⏰' : '📅';
    response += `${urgency} **${payment.card_name || payment.card_type}**\n`;
    response += `   - Amount Due: $${payment.amount_to_pay.toLocaleString()}\n`;
    response += `   - Due Date: ${payment.dueDate.toLocaleDateString()} (${payment.daysUntilDue} day${payment.daysUntilDue !== 1 ? 's' : ''})\n`;
    response += `   - Current Balance: $${payment.current_balance.toLocaleString()}\n\n`;
  });

  return response.trim();
};

/**
 * Generate response for add card request
 */
export const generateAddCardResponse = () => {
  return "I can help you add a new card! Click here to go to [My Wallet](vitta://navigate/cards) and add a new card. You can add card details without entering sensitive information like card numbers.";
};

/**
 * Generate navigation response based on query
 */
export const generateNavigationResponse = (query) => {
  // Clean up the query by removing common filler words
  let cleanQuery = query.toLowerCase();

  // Remove navigation phrases
  cleanQuery = cleanQuery.replace(/take me to\s+/g, '');
  cleanQuery = cleanQuery.replace(/go to\s+/g, '');
  cleanQuery = cleanQuery.replace(/navigate to\s+/g, '');
  cleanQuery = cleanQuery.replace(/show me\s+/g, '');
  cleanQuery = cleanQuery.replace(/open\s+/g, '');
  cleanQuery = cleanQuery.replace(/access\s+/g, '');
  cleanQuery = cleanQuery.replace(/view\s+/g, '');

  // Remove screen/page/panel at end
  cleanQuery = cleanQuery.replace(/\s+screen$/g, '');
  cleanQuery = cleanQuery.replace(/\s+page$/g, '');
  cleanQuery = cleanQuery.replace(/\s+panel$/g, '');

  // Also remove in middle
  cleanQuery = cleanQuery.replace(/\s+screen\s+/g, ' ');
  cleanQuery = cleanQuery.replace(/\s+page\s+/g, ' ');
  cleanQuery = cleanQuery.replace(/\s+panel\s+/g, ' ');

  cleanQuery = cleanQuery.trim();

  console.log('[Navigation] Original query:', query);
  console.log('[Navigation] Clean query:', cleanQuery);

  // Map common phrases to screen paths (order matters - most specific first)
  const screenMappings = [
    { keywords: ['manage card', 'wallet', 'my card', 'card detail', 'view card', 'cards', 'card'], screen: 'cards', name: 'My Wallet' },
    { keywords: ['payment', 'optimizer', 'optimize', 'smart payment', 'payment strategy', 'pay'], screen: 'optimizer', name: 'Payment Optimizer' },
    { keywords: ['dashboard', 'overview', 'summary', 'home'], screen: 'dashboard', name: 'Dashboard' },
    { keywords: ['chat', 'assistant', 'ai', 'vitta', 'talk'], screen: 'chat', name: 'Vitta Chat' }
  ];

  // Find best matching screen
  for (const mapping of screenMappings) {
    if (mapping.keywords.some(keyword => cleanQuery.includes(keyword))) {
      console.log('[Navigation] Matched screen:', mapping.name);
      return `Taking you to [${mapping.name}](vitta://navigate/${mapping.screen})! Click the link above to navigate.`;
    }
  }

  // Default navigation response
  console.log('[Navigation] No match found, showing default options');
  return `I can help you navigate! Here are the available screens:\n\n- [My Wallet](vitta://navigate/cards) - Manage your credit cards\n- [Payment Optimizer](vitta://navigate/optimizer) - Optimize your payments\n- [Vitta Chat](vitta://navigate/chat) - Chat with me\n\nJust click any link above!`;
};

/**
 * Extract entities from natural language query
 */
const extractEntities = (query) => {
  const entities = {
    merchant: null,
    category: null,
    timeframe: null,
    cardName: null,
    amount: null
  };

  // Extract merchant name (after "at", "for", "in", "from")
  const merchantMatch = query.match(/(?:at|for|in|from|shopping at|buying at|purchasing at)\s+([a-z\s&]+?)(?:\s+(?:today|tomorrow|this week|next week|store|shop)?)?$/i);
  if (merchantMatch) {
    entities.merchant = merchantMatch[1].trim();
  }

  // Extract timeframe (today, this week, next week, in X days)
  if (/today|tonight/i.test(query)) {
    entities.timeframe = 'today';
  } else if (/this week/i.test(query)) {
    entities.timeframe = 'this_week';
  } else if (/next week/i.test(query)) {
    entities.timeframe = 'next_week';
  } else {
    const daysMatch = query.match(/(?:in|next|within)\s*(\d+)\s*days?/i);
    if (daysMatch) {
      entities.timeframe = { days: parseInt(daysMatch[1]) };
    }
  }

  // Extract specific card name
  const cardMatch = query.match(/(?:my|the)\s+(chase|amex|citi|discover|capital one|bank of america|wells fargo)(?:\s+\w+)?\s+card/i);
  if (cardMatch) {
    entities.cardName = cardMatch[1];
  }

  // Extract amount
  const amountMatch = query.match(/\$?([\d,]+(?:\.\d{2})?)/);
  if (amountMatch) {
    entities.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  return entities;
};

/**
 * Generate contextual response based on intent and entities
 */
const generateContextualResponse = (type, query, cards, entities) => {
  switch (type) {
    case 'listCards':
      if (cards && cards.length > 0) {
        let response = `You have ${cards.length} card${cards.length > 1 ? 's' : ''} in your wallet:\n\n`;
        cards.forEach((card, index) => {
          const available = card.credit_limit - card.current_balance;
          const utilization = Math.round((card.current_balance / card.credit_limit) * 100);
          response += `${index + 1}. **${card.card_name || card.card_type}**\n`;
          response += `   Balance: $${card.current_balance.toLocaleString()} / $${card.credit_limit.toLocaleString()} (${utilization}% used)\n`;
          response += `   Available: $${available.toLocaleString()}\n`;
          if (card.due_date) {
            response += `   Next payment: ${new Date(card.due_date).toLocaleDateString()}\n`;
          }
          response += '\n';
        });
        return response.trim();
      }
      return "You don't have any cards in your wallet yet. Add one in [My Wallet](vitta://navigate/cards) to get started!";

    case 'bestCard':
      if (entities.merchant) {
        const bestCard = findBestCardForMerchant(entities.merchant, cards);
        if (bestCard) {
          let response = `For **${entities.merchant}**, I recommend your **${bestCard.card_name || bestCard.card_type}**.\n\n`;
          response += `**Why?** ${bestCard.reason}\n\n`;
          response += `You have $${bestCard.availableCredit.toLocaleString()} available on this card.`;
          return response;
        }
      }
      return "I need to know where you're shopping. Try asking 'Which card should I use at Costco?' or 'Best card for groceries?'";

    case 'paymentDue':
      const timeframeDays = entities.timeframe?.days || 7;
      const upcomingPayments = findUpcomingPayments(cards, timeframeDays);

      if (upcomingPayments.length === 0) {
        return `No payments due in the next ${timeframeDays} days. You're all set!`;
      }

      let response = `You have ${upcomingPayments.length} payment${upcomingPayments.length > 1 ? 's' : ''} coming up:\n\n`;
      upcomingPayments.forEach(payment => {
        const urgency = payment.daysUntilDue <= 2 ? '🔴' : payment.daysUntilDue <= 5 ? '🟡' : '🟢';
        response += `${urgency} **${payment.card_name || payment.card_type}**\n`;
        response += `   Due: ${payment.dueDate.toLocaleDateString()} (${payment.daysUntilDue} day${payment.daysUntilDue !== 1 ? 's' : ''})\n`;
        response += `   Amount: $${payment.amount_to_pay.toLocaleString()}\n\n`;
      });
      return response.trim();

    default:
      return null;
  }
};

/**
 * Generate general response based on query analysis
 */
export const generateIntelligentResponse = (analysis) => {
  const { type, query, cards } = analysis;

  console.log('[CardAnalyzer] Generating response for type:', type);
  console.log('[CardAnalyzer] Query:', query);
  console.log('[CardAnalyzer] Cards available:', cards?.length || 0);

  // Extract entities from the query
  const entities = extractEntities(query);
  console.log('[CardAnalyzer] Extracted entities:', entities);

  // Try to generate contextual response
  const contextualResponse = generateContextualResponse(type, query, cards, entities);
  console.log('[CardAnalyzer] Contextual response generated:', !!contextualResponse);
  if (contextualResponse) {
    return contextualResponse;
  }

  // Fallback to type-based responses
  switch (type) {
    case 'navigate':
      return generateNavigationResponse(query);

    case 'addCard':
      return "Add a new card in [My Wallet](vitta://navigate/cards). You can enter card details without sensitive information like card numbers.";

    case 'optimize':
      return "Optimize your payments in the [Payment Optimizer](vitta://navigate/optimizer) to minimize interest and pay down debt faster.";

    case 'cardDetails':
      return generateCardListResponse(cards);

    default:
      if (cards && cards.length > 0) {
        return "I'm your wallet assistant! Ask me:\n- 'What cards are in my wallet?'\n- 'Which card for Costco?'\n- 'Any payments due this week?'\n- 'Take me to my wallet'\n\nHow can I help?";
      } else {
        return "Hi! I'm Vitta. Add cards to your wallet in [My Wallet](vitta://navigate/cards) and I can help you choose the best card for purchases, track payments, and optimize your spending!";
      }
  }
};
