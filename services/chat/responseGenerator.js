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

/**
 * Generate response based on classified intent
 */
export const generateResponse = (classification, entities, userData, context) => {
  const { intent, intentData } = classification;
  const { cards = [] } = userData;

  console.log('[ResponseGenerator] Generating response for intent:', intent);

  // Route to appropriate handler based on intent
  switch (intent) {
    case 'query_card_data':
      // Smart handler that answers ANY card-related question
      return handleCardDataQuery(cards, entities, context?.lastQuery || '');

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

    response += `**${index + 1}. ${card.card_name || card.card_type}**\n`;
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

  let response = `For **${entities.merchant}**, use your **${bestCard.card_name || bestCard.card_type}**!\n\n`;
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
    response += `${urgency} **${payment.card_name || payment.card_type}**\n`;
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
    response += `• **${card.card_name || card.card_type}**: $${card.current_balance.toLocaleString()} (${util}%)\n`;
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

const handleSplitPayment = (cards, entities) => {
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
    name: c.card_name || c.card_type,
    balance: c.current_balance || 0,
    apr: c.apr || 0,
    min: c.amount_to_pay || 0
  }));

  // Calculate minimum payments
  const totalMin = paymentCards.reduce((sum, c) => sum + Math.min(c.min, c.balance), 0);

  if (budget < totalMin) {
    return `⚠️ Your budget of $${budget.toLocaleString()} is less than the minimum payments required ($${totalMin.toLocaleString()}).\n\nYou need at least $${totalMin.toLocaleString()} to cover minimum payments on all cards.`;
  }

  const remaining = budget - totalMin;

  // Calculate APR-weighted distribution for remaining budget
  const targets = paymentCards.map(c => ({
    ...c,
    remainingAfterMin: Math.max(0, c.balance - Math.min(c.min, c.balance))
  })).filter(c => c.remainingAfterMin > 0);

  const totalApr = targets.reduce((sum, c) => sum + c.apr, 0) || 1;

  // Calculate allocations
  const allocations = paymentCards.map(c => ({
    id: c.id,
    name: c.name,
    pay: Math.min(c.min, c.balance),
    balance: c.balance,
    apr: c.apr
  }));

  if (remaining > 0 && targets.length > 0) {
    targets.forEach(t => {
      const share = (t.apr / totalApr) * remaining;
      const extra = Math.min(share, t.remainingAfterMin);
      const idx = allocations.findIndex(a => a.id === t.id);
      allocations[idx].pay += extra;
    });
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

  // Generate response
  let response = `**💰 Payment Split for $${budget.toLocaleString()}**\n\n`;
  response += `Here's the optimal way to split your budget:\n\n`;

  allocations.forEach(a => {
    const newBalance = Math.max(0, a.balance - a.pay);
    const percentOfBalance = a.balance > 0 ? Math.round((a.pay / a.balance) * 100) : 0;
    response += `**${a.name}**\n`;
    response += `   • Pay: $${a.pay.toFixed(2)} (${percentOfBalance}% of balance)\n`;
    response += `   • New balance: $${newBalance.toLocaleString()}\n`;
    if (a.apr > 0) {
      response += `   • APR: ${a.apr}%\n`;
    }
    response += '\n';
  });

  if (saved > 0) {
    response += `\n✅ **Interest saved this month:** $${saved.toFixed(2)}\n`;
  }

  response += `\nThis strategy prioritizes high APR cards to minimize interest charges. See full analysis in [Payment Optimizer](vitta://navigate/optimizer).`;

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
    response += `${emoji} **${card.card_name || card.card_type}**: ${util}%\n`;
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
    response += `• **${card.card_name || card.card_type}**: $${available.toLocaleString()}\n`;
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
      response += `• **${card.card_name || card.card_type}**: $${card.amount_to_pay.toLocaleString()}`;
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
    response += `${emoji} **${card.card_name || card.card_type}**: ${card.apr}%\n`;
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
