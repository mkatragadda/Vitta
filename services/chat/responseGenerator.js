/**
 * Response Generator
 * Generates dynamic responses based on intent and user data
 */

import { findBestCardForMerchant, findUpcomingPayments } from '../cardAnalyzer';
import { handleCardDataQuery } from './cardDataQueryHandler';
import { handleRecommendation } from './recommendationChatHandler.js';
import { handleDebtGuidance } from './debtGuidanceHandler.js';
import { handleMoneyCoaching } from './moneyCoachingHandler.js';
import { handleChitChat } from './chitChatHandler.js';
import { handleRememberMemory, handleRecallMemory } from './memoryHandler.js';

/**
 * Generate response based on classified intent
 * Phase 6: Now async due to pattern learning integration
 */
export const generateResponse = async (classification, entities, userData, context) => {
  const { intent, intentData } = classification;
  const { cards = [] } = userData;

  console.log('[ResponseGenerator] Generating response for intent:', intent);

  // Route to appropriate handler based on intent
  switch (intent) {
    case 'query_card_data':
      // Smart handler that answers ANY card-related question
      // Phase 6: Now async due to pattern matching and analytics
      return await handleCardDataQuery(cards, entities, context?.lastQuery || '');

    case 'card_recommendation':
      // AI Financial Coach for card recommendations
      // Returns async - conversation engine will handle the promise
      return handleRecommendation(cards, entities, context?.lastQuery || '', userData.user_id);

    case 'debt_guidance':
      // NEW: Debt payoff strategies and guidance
      return handleDebtGuidance(cards, entities, context?.lastQuery || '');

    case 'money_coaching':
      // NEW: Financial education and credit card best practices
      return handleMoneyCoaching(cards, entities, context?.lastQuery || '');

    case 'chit_chat':
      // NEW: Casual conversation and greetings
      return handleChitChat(cards, entities, context?.lastQuery || '');

    case 'add_card':
      return handleAddCard();

    case 'remove_card':
      return handleRemoveCard(cards, entities);

    case 'split_payment':
      return handleSplitPayment(cards, entities);

    case 'navigate_screen':
      return handleNavigateScreen(entities);

    case 'help':
      return handleHelp();

    case 'remember_memory':
      return handleRememberMemory({
        userId: userData.user_id,
        query: context?.lastQuery || '',
        entities,
        slotFillingState: context?.slotFillingState || null
      });

    case 'recall_memory':
      return handleRecallMemory({
        userId: userData.user_id,
        entities
      });

    default:
      return handleUnknown(intent, entities);
  }
};

/** Intent Handlers **/

const handleListCards = (cards, entities) => {
  if (!cards || cards.length === 0) {
    return "You don't have any cards in your wallet yet. Add one in [My Wallet](vitta://navigate/cards)!";
  }

  let response = `You have **${cards.length} card${cards.length > 1 ? 's' : ''}** in your wallet:\n\n`;

  cards.forEach((card, index) => {
    const available = card.credit_limit - card.current_balance;
    const util = Math.round((card.current_balance / card.credit_limit) * 100);

    response += `**${index + 1}. ${card.nickname || card.card_name}**\n`;
    response += `   • Balance: $${card.current_balance.toLocaleString()} / $${card.credit_limit.toLocaleString()} (${util}% used)\n`;
    response += `   • Available: $${available.toLocaleString()}\n`;
    if (card.due_date) {
      response += `   • Next payment: ${new Date(card.due_date).toLocaleDateString()}\n`;
    }
    response += '\n';
  });

  response += `View details in [My Wallet](vitta://navigate/cards)`;
  return response.trim();
};

const handleRecommendCard = (cards, entities) => {
  if (!entities.merchant) {
    return "Which merchant or category? Try:\n• 'Best card for Costco'\n• 'Which card for groceries'\n• 'Card to use at Target'";
  }

  const bestCard = findBestCardForMerchant(entities.merchant, cards);
  if (!bestCard) {
    return `I couldn't find a great match for **${entities.merchant}**. Add more cards in [My Wallet](vitta://navigate/cards) to get better recommendations!`;
  }

  let response = `For **${entities.merchant}**, use your **${bestCard.nickname || bestCard.card_name}**!\n\n`;
  response += `**Why?**\n${bestCard.reason}\n\n`;
  response += `**Available credit:** $${bestCard.availableCredit.toLocaleString()}`;

  if (bestCard.current_balance > 0) {
    response += `\n\n*Current balance: $${bestCard.current_balance.toLocaleString()}*`;
  }

  return response;
};

const handleUpcomingPayments = (cards, entities) => {
  const days = entities.timeframe?.value || 7;
  const upcomingPayments = findUpcomingPayments(cards, days);

  if (upcomingPayments.length === 0) {
    return `No payments due in the next ${days} days! 🎉`;
  }

  let response = `**${upcomingPayments.length} payment${upcomingPayments.length > 1 ? 's' : ''} coming up:**\n\n`;

  upcomingPayments.forEach(payment => {
    const urgency = payment.daysUntilDue <= 2 ? '🔴 URGENT' : payment.daysUntilDue <= 5 ? '🟡' : '🟢';
    response += `${urgency} **${payment.nickname || payment.card_name}**\n`;
    response += `   • Due: ${payment.dueDate.toLocaleDateString()} (${payment.daysUntilDue} day${payment.daysUntilDue !== 1 ? 's' : ''})\n`;
    response += `   • Amount: $${payment.amount_to_pay.toLocaleString()}\n\n`;
  });

  response += `Optimize payments in [Payment Optimizer](vitta://navigate/optimizer)`;
  return response.trim();
};

const handleCardBalance = (cards, entities) => {
  if (!cards || cards.length === 0) {
    return "No cards in your wallet yet. Add one in [My Wallet](vitta://navigate/cards)!";
  }

  const totalBalance = cards.reduce((sum, card) => sum + card.current_balance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit, 0);
  const totalUtil = Math.round((totalBalance / totalLimit) * 100);

  let response = `**Total balance:** $${totalBalance.toLocaleString()} / $${totalLimit.toLocaleString()} (${totalUtil}% utilization)\n\n`;

  cards.forEach(card => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    response += `• **${card.nickname || card.card_name}**: $${card.current_balance.toLocaleString()} (${util}%)\n`;
  });

  return response.trim();
};

const handleAddCard = () => {
  return "Let's add a card! Taking you to [My Wallet](vitta://navigate/cards) where you can add a new card.";
};

const handleRemoveCard = (cards, entities) => {
  if (!entities.cardName) {
    return "Which card would you like to remove? Go to [My Wallet](vitta://navigate/cards) to manage your cards.";
  }

  return `To remove your ${entities.cardName} card, go to [My Wallet](vitta://navigate/cards) and use the card management options.`;
};

const handleOptimizePayments = (cards) => {
  if (!cards || cards.length === 0) {
    return "Add cards to your wallet first, then I can help optimize your payments!";
  }

  return `Let's optimize your payments! The [Payment Optimizer](vitta://navigate/optimizer) will show you the best strategy to minimize interest and pay down debt faster across your ${cards.length} card${cards.length > 1 ? 's' : ''}.`;
};

// Export for testing
export const handleSplitPayment = (cards, entities) => {
  if (!cards || cards.length === 0) {
    return "Add cards to your wallet first, then I can help split your payment!";
  }

  if (!entities.amount) {
    return "How much would you like to split? Try: 'Split $1500 between all my cards' or 'Distribute 1000 across cards'";
  }

  const budget = entities.amount;

  // Transform cards to payment optimizer format
  const paymentCards = cards.map(c => ({
    id: c.id,
    name: c.nickname || c.card_name,
    balance: c.current_balance || 0,
    apr: c.apr || 0,
    min: c.amount_to_pay || 0
  }));

  // Calculate total balance across all cards
  const totalBalance = paymentCards.reduce((sum, c) => sum + (c.balance || 0), 0);

  // Check if all cards have zero balance
  if (totalBalance === 0) {
    return `✅ **Great news!** All your cards are paid off.\n\nThere's nothing to split right now since all your cards have $0.00 balances.\n\n**What you can do:**\n• Save your $${budget.toLocaleString()} for future expenses\n• Keep building good credit by using your cards responsibly\n• Check back when you have balances to optimize\n\nWhen you do have balances, I'll help you split payments to minimize interest!`;
  }

  // Calculate minimum payments
  const totalMin = paymentCards.reduce((sum, c) => sum + Math.min(c.min, c.balance), 0);

  // Check if budget is insufficient (warning but still show partial split)
  const budgetInsufficient = budget < totalMin;
  const remaining = Math.max(0, budget - totalMin);

  // Calculate APR-weighted distribution for remaining budget
  const targets = paymentCards.map(c => ({
    ...c,
    remainingAfterMin: Math.max(0, c.balance - Math.min(c.min, c.balance))
  })).filter(c => c.remainingAfterMin > 0);

  const totalApr = targets.reduce((sum, c) => sum + c.apr, 0) || 1;

  // Calculate allocations - initialize with minimums (or proportional split if budget insufficient)
  let allocations;
  
  if (budgetInsufficient) {
    // When budget < totalMin, distribute available budget proportionally by minimum payment amount
    // Cards with higher minimums get proportionally more
    const totalMinimums = paymentCards.reduce((sum, c) => sum + Math.min(c.min, c.balance), 0) || 1;
    allocations = paymentCards.map(c => {
      const minAmount = Math.min(c.min, c.balance);
      const proportionalShare = (minAmount / totalMinimums) * budget;
      return {
        id: c.id,
        name: c.name,
        pay: Math.min(proportionalShare, c.balance), // Can't pay more than balance
        minPay: minAmount,
        balance: c.balance,
        apr: c.apr
      };
    });
  } else {
    // Normal flow: start with minimums, then distribute extra
    allocations = paymentCards.map(c => ({
      id: c.id,
      name: c.name,
      pay: Math.min(c.min, c.balance),
      minPay: Math.min(c.min, c.balance),
      balance: c.balance,
      apr: c.apr
    }));

    // Distribute remaining budget to cards with highest APR
    if (remaining > 0 && targets.length > 0 && totalApr > 0) {
      targets.forEach(t => {
        const share = (t.apr / totalApr) * remaining;
        const extra = Math.min(share, t.remainingAfterMin);
        const idx = allocations.findIndex(a => a.id === t.id);
        allocations[idx].pay += extra;
      });
    }
  }

  // Calculate interest savings
  const monthlyRate = (apr) => (Math.max(0, apr) / 100) / 12;
  const interestIfMin = paymentCards.reduce((sum, c) => {
    const newBal = Math.max(0, c.balance - Math.min(c.min, c.balance));
    return sum + newBal * monthlyRate(c.apr);
  }, 0);
  const interestIfPlan = paymentCards.reduce((sum, c) => {
    const pay = allocations.find(a => a.id === c.id)?.pay || 0;
    const newBal = Math.max(0, c.balance - pay);
    return sum + newBal * monthlyRate(c.apr);
  }, 0);
  const saved = Math.max(0, interestIfMin - interestIfPlan);

  const currency = (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalPay = allocations.reduce((sum, a) => sum + a.pay, 0);
  const budgetRemaining = Math.max(0, budget - totalPay);

  // Generate response
  let response = `**💰 Payment Split for ${currency(budget)}**\n\n`;
  
  if (budgetInsufficient) {
    response += `⚠️ **Warning:** Your budget of ${currency(budget)} is less than the minimum payments required (${currency(totalMin)}).\n\n`;
    response += `Here's a proportional split of what you can afford:\n\n`;
  } else {
    response += `You need at least ${currency(totalMin)} to cover minimum payments on all cards. Here's the optimized split:\n\n`;
  }

  response += `| Card | Current Balance | Minimum Payment | Pay This Month | Remaining Balance |\n`;
  response += `| --- | ---:| ---:| ---:| ---:|\n`;

  // Show ALL cards (including zero balance ones) - allocations already contains all cards
  allocations.forEach(allocation => {
    const remainingBalance = Math.max(0, allocation.balance - allocation.pay);
    response += `| ${allocation.name} | ${currency(allocation.balance)} | ${currency(allocation.minPay)} | ${currency(allocation.pay)} | ${currency(remainingBalance)} |\n`;
  });

  response += `\n**Summary**: Processing ${allocations.length} card${allocations.length !== 1 ? 's' : ''} - Pay ${currency(totalPay)} this cycle`;
  if (budgetRemaining > 0.01) {
    response += ` (Budget remaining: ${currency(budgetRemaining)})`;
  }
  if (budgetInsufficient) {
    const shortfall = totalMin - totalPay;
    response += `\n\n**Shortfall**: You're ${currency(shortfall)} short of covering all minimum payments.`;
  }
  response += `.`;

  if (saved > 0) {
    response += `\n\n✅ **Estimated interest saved this month:** ${currency(saved)}`;
  }

  response += `\n\n**Next Steps:**\n`;
  if (budgetInsufficient) {
    response += `1. ⚠️ **Priority**: Try to secure ${currency(totalMin - budget)} more to cover all minimum payments and avoid late fees.\n`;
    response += `2. Make these proportional payments to minimize impact on your credit.\n`;
    response += `3. Track progress in [Payment Optimizer](vitta://navigate/optimizer) for ongoing adjustments.`;
  } else {
    response += `1. Make these payments to cover minimums and reduce high-APR balances.\n`;
    if (budgetRemaining > 0.01) {
      response += `2. Apply the remaining ${currency(budgetRemaining)} toward the highest APR balance for additional savings.\n`;
      response += `3. Track progress in [Payment Optimizer](vitta://navigate/optimizer) for ongoing adjustments.`;
    } else {
      response += `2. Track progress in [Payment Optimizer](vitta://navigate/optimizer) for ongoing adjustments.`;
    }
  }

  return response.trim();
};

const handleNavigateScreen = (entities) => {
  if (!entities.screenName) {
    return `Where would you like to go?\n\n• [My Wallet](vitta://navigate/cards)\n• [Payment Optimizer](vitta://navigate/optimizer)\n• [Dashboard](vitta://navigate/dashboard)\n• [Expense Feed](vitta://navigate/expenses)`;
  }

  const screenNames = {
    'cards': 'My Wallet',
    'optimizer': 'Payment Optimizer',
    'dashboard': 'Dashboard',
    'expenses': 'Expense Feed',
    'chat': 'Vitta Chat'
  };

  const screenName = screenNames[entities.screenName] || entities.screenName;
  return `Taking you to [${screenName}](vitta://navigate/${entities.screenName})!`;
};

const handleCreditUtilization = (cards, entities) => {
  if (!cards || cards.length === 0) {
    return "Add cards to see your credit utilization.";
  }

  const totalBalance = cards.reduce((sum, card) => sum + card.current_balance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit, 0);
  const totalUtil = Math.round((totalBalance / totalLimit) * 100);

  let response = `**Overall utilization:** ${totalUtil}% ${totalUtil < 30 ? '✅ Excellent!' : totalUtil < 50 ? '⚠️ Fair' : '🔴 High'}\n\n`;

  cards.forEach(card => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    const emoji = util < 30 ? '✅' : util < 50 ? '⚠️' : '🔴';
    response += `${emoji} **${card.nickname || card.card_name}**: ${util}%\n`;
  });

  response += `\n*Tip: Keep utilization below 30% for best credit score impact.*`;
  return response.trim();
};

const handleAvailableCredit = (cards) => {
  if (!cards || cards.length === 0) {
    return "Add cards to see available credit.";
  }

  const totalAvailable = cards.reduce((sum, card) => sum + (card.credit_limit - card.current_balance), 0);

  let response = `**Total available credit:** $${totalAvailable.toLocaleString()}\n\n`;

  cards.forEach(card => {
    const available = card.credit_limit - card.current_balance;
    response += `• **${card.nickname || card.card_name}**: $${available.toLocaleString()}\n`;
  });

  return response.trim();
};

const handlePaymentAmount = (cards) => {
  if (!cards || cards.length === 0) {
    return "Add cards to see payment amounts.";
  }

  let response = `**Upcoming payments:**\n\n`;

  cards.forEach(card => {
    if (card.amount_to_pay) {
      response += `• **${card.nickname || card.card_name}**: $${card.amount_to_pay.toLocaleString()}`;
      if (card.due_date) {
        response += ` (due ${new Date(card.due_date).toLocaleDateString()})`;
      }
      response += '\n';
    }
  });

  response += `\nOptimize payments in [Payment Optimizer](vitta://navigate/optimizer)`;
  return response.trim();
};

const handleRewardsSummary = (cards) => {
  return `Rewards tracking coming soon! For now, check your card statements or go to [My Wallet](vitta://navigate/cards) to see card details.`;
};

const handleSpendingSummary = () => {
  return `View your spending in [Expense Feed](vitta://navigate/expenses) to see transactions and spending patterns.`;
};

const handleAPRInfo = (cards, entities) => {
  if (!cards || cards.length === 0) {
    return "Add cards to see APR information.";
  }

  let response = `**APR rates:**\n\n`;

  cards.forEach(card => {
    const emoji = card.apr < 15 ? '✅' : card.apr < 20 ? '⚠️' : '🔴';
    response += `${emoji} **${card.nickname || card.card_name}**: ${card.apr}%\n`;
  });

  response += `\n*Lower APR = less interest on balances*`;
  return response.trim();
};

const handleHelp = () => {
  return `**I can help you with:**\n\n**💳 Cards**\n• "What cards are in my wallet?"\n• "Show my balances"\n• "What's my credit utilization?"\n\n**🎯 Recommendations**\n• "Which card should I use at Costco?"\n• "Best card for groceries?"\n\n**📅 Payments**\n• "When are my payments due?"\n• "How much do I need to pay?"\n• "Optimize my payments"\n\n**🧭 Navigation**\n• "Take me to my wallet"\n• "Show payment optimizer"\n\nJust ask naturally!`;
};

const handleUnknown = (intent, entities) => {
  return `I'm not sure about that. Try asking:\n• "What cards do I have?"\n• "Which card for Costco?"\n• "When are payments due?"\n• "Help"\n\nWhat would you like to know?`;
};
