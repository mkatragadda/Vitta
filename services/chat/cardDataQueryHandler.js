/**
 * Card Data Query Handler
 * Intelligently answers questions about card data using semantic entities
 */

import { findBestCardForMerchant } from '../cardAnalyzer';

/**
 * Main handler for query_card_data intent
 * Uses extracted entities to determine what the user wants to know
 */
export const handleCardDataQuery = (cards, entities, query) => {
  console.log('[CardDataQuery] Handling query with entities:', entities);

  if (!cards || cards.length === 0) {
    return "You don't have any cards in your wallet yet. Add one in [My Wallet](vitta://navigate/cards)!";
  }

  const { attribute, modifier, queryType, merchant, category } = entities;

  // Route to specific handlers based on attribute + modifier combination

  // APR queries
  if (attribute === 'apr') {
    if (modifier === 'lowest') return findLowestAPRCard(cards);
    if (modifier === 'highest') return findHighestAPRCard(cards);
    return showAllAPRs(cards);
  }

  // Balance queries
  if (attribute === 'balance') {
    if (modifier === 'highest') return findHighestBalanceCard(cards);
    if (modifier === 'lowest') return findLowestBalanceCard(cards);
    if (modifier === 'total') return calculateTotalBalance(cards);
    return showAllBalances(cards);
  }

  // Due date queries
  if (attribute === 'due_date' || queryType === 'timeframe') {
    return showDueDates(cards);
  }

  // Available credit
  if (attribute === 'available_credit') {
    if (modifier === 'total') return calculateTotalAvailableCredit(cards);
    return showAvailableCredit(cards);
  }

  // Utilization
  if (attribute === 'utilization') {
    return showUtilization(cards);
  }

  // Rewards / Best card for category or merchant recommendations
  if (attribute === 'rewards' || queryType === 'recommendation' || modifier === 'best' || merchant) {
    if (merchant) {
      const bestCard = findBestCardForMerchant(merchant, cards);
      if (!bestCard) {
        return `I don't have specific reward data for **${merchant}** yet.\n\n**What would you like to know?**\n• Which specific merchant? (e.g., "Costco", "Target")\n• Or general category? (e.g., "groceries", "gas", "travel")\n\nFor now, check card details in [My Wallet](vitta://navigate/cards).`;
      }
      return `For **${merchant}**, use your **${bestCard.card_name || bestCard.card_type}**!\n\n**Why?** ${bestCard.reason}\n\n**Other questions?**\n• Want to see all your cards?\n• Need to know due dates or balances?`;
    }
    if (category) {
      return `I can help with **${category}** recommendations!\n\n**Which ${category} merchant?**\n• Costco?\n• Target?\n• Whole Foods?\n• Or another store?\n\nFor general info, check [My Wallet](vitta://navigate/cards).`;
    }
    return "Which merchant or category?\n\n**Try asking:**\n• 'Best card for Costco'\n• 'Which card for Target'\n• 'Card to use at Whole Foods'";
  }

  // Payment amount
  if (attribute === 'payment_amount') {
    return showPaymentAmounts(cards);
  }

  // Listing - just show all cards
  if (queryType === 'listing') {
    return listAllCards(cards);
  }

  // Default: couldn't determine specific query - show helpful suggestions
  return `I'm here to help with your credit cards!\n\n**What would you like to know?**\n• Card balances or APR rates?\n• Best card for a specific store?\n• Payment due dates?\n• Credit utilization?\n\n**Try asking:**\n• "What's my lowest interest card?"\n• "Best card for Costco?"\n• "When are my payments due?"\n• "Show my balances"`;
};

/** Helper Functions **/

const findLowestAPRCard = (cards) => {
  const sorted = [...cards].sort((a, b) => a.apr - b.apr);
  const lowest = sorted[0];

  const status = lowest.apr === 0 ? '✅ Promo 0%' : lowest.apr < 15 ? '🟢 Excellent' : '🟡 Good';

  let response = `**Lowest APR Card**\n\n`;
  response += `**${lowest.card_name || lowest.card_type}** has the lowest APR at **${lowest.apr}%** ${status}\n\n`;
  response += `- Balance: $${lowest.current_balance.toLocaleString()}\n`;
  response += `- Credit Limit: $${lowest.credit_limit.toLocaleString()}\n`;

  if (sorted.length > 1) {
    response += `\n**Other Cards:**\n`;
    sorted.slice(1, 3).forEach(card => {
      response += `- ${card.card_name || card.card_type}: ${card.apr}% APR\n`;
    });
  }

  console.log('[findLowestAPRCard] Response:', response);
  return response.trim();
};

const findHighestAPRCard = (cards) => {
  const sorted = [...cards].sort((a, b) => b.apr - a.apr);
  const highest = sorted[0];

  const monthlyInterest = (highest.current_balance * (highest.apr / 100) / 12).toFixed(2);

  let response = `**Highest APR Card** 🔴\n\n`;
  response += `**${highest.card_name || highest.card_type}** has the highest APR at **${highest.apr}%**\n\n`;
  response += `- Balance: $${highest.current_balance.toLocaleString()}\n`;
  response += `- Monthly interest cost: ~$${monthlyInterest}\n`;
  response += `\n💡 **Tip:** Pay this card down first to save on interest!`;

  return response.trim();
};

const showAllAPRs = (cards) => {
  let response = `**APR Rates:**\n\n`;

  response += '| Card | APR | Status |\n';
  response += '|------|-----|--------|\n';

  const sorted = [...cards].sort((a, b) => a.apr - b.apr);
  sorted.forEach(card => {
    const emoji = card.apr === 0 ? '✅' : card.apr < 15 ? '🟢' : card.apr < 20 ? '🟡' : '🔴';
    const status = card.apr === 0 ? 'Promo 0%' : card.apr < 15 ? 'Excellent' : card.apr < 20 ? 'Good' : 'High';
    response += `| ${card.card_name || card.card_type} | ${card.apr}% | ${emoji} ${status} |\n`;
  });

  return response.trim();
};

const findHighestBalanceCard = (cards) => {
  const sorted = [...cards].sort((a, b) => b.current_balance - a.current_balance);
  const highest = sorted[0];

  const util = Math.round((highest.current_balance / highest.credit_limit) * 100);

  let response = `**Highest Balance:** ${highest.card_name || highest.card_type}`;
  response += `\n\nBalance: $${highest.current_balance.toLocaleString()} / $${highest.credit_limit.toLocaleString()}`;
  response += `\nUtilization: ${util}%`;
  response += `\nAPR: ${highest.apr}%`;

  return response.trim();
};

const findLowestBalanceCard = (cards) => {
  const sorted = [...cards].filter(c => c.current_balance > 0).sort((a, b) => a.current_balance - b.current_balance);

  if (sorted.length === 0) {
    return "All your cards have $0 balance! 🎉";
  }

  const lowest = sorted[0];

  let response = `**Lowest Balance:** ${lowest.card_name || lowest.card_type}`;
  response += `\n\nBalance: $${lowest.current_balance.toLocaleString()}`;

  return response.trim();
};

const calculateTotalBalance = (cards) => {
  const total = cards.reduce((sum, card) => sum + card.current_balance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit, 0);
  const overallUtil = Math.round((total / totalLimit) * 100);

  let response = `**Total Balance Across All Cards**`;
  response += `\n\n💳 Total: $${total.toLocaleString()}`;
  response += `\n📊 Total Limit: $${totalLimit.toLocaleString()}`;
  response += `\n📈 Overall Utilization: ${overallUtil}%`;

  return response.trim();
};

const showAllBalances = (cards) => {
  let response = `**Card Balances:**\n\n`;

  response += '| Card | Balance | Limit | Utilization |\n';
  response += '|------|---------|-------|-------------|\n';

  cards.forEach(card => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    const utilEmoji = util < 30 ? '✅' : util < 50 ? '⚠️' : '🔴';
    response += `| ${card.card_name || card.card_type} | $${card.current_balance.toLocaleString()} | $${card.credit_limit.toLocaleString()} | ${util}% ${utilEmoji} |\n`;
  });

  return response.trim();
};

const showDueDates = (cards) => {
  // Use new payment cycle utilities
  const { getUpcomingPayments, getPaymentUrgencyEmoji, getPaymentStatusMessage } = require('../../utils/paymentCycleUtils');

  // Get upcoming payments (automatically filters out $0 balance cards)
  const upcomingPayments = getUpcomingPayments(cards, 30);

  if (upcomingPayments.length === 0) {
    return "You don't have any payments due in the next 30 days. 🎉";
  }

  let response = `**Upcoming Payment Due Dates:**\n\n`;

  response += '| Card | Due Date | Days Left | Amount | Status |\n';
  response += '|------|----------|-----------|--------|--------|\n';

  upcomingPayments.forEach(payment => {
    const cardName = payment.card.nickname || payment.card.card_name || payment.card.card_type;
    const dueDate = payment.paymentDueDate.toLocaleDateString();

    // Format days left - show as "N/A" for cards with $0 balance (won't appear anyway)
    const daysLeftText = payment.daysUntilDue < 0
      ? `${Math.abs(payment.daysUntilDue)} days`  // Overdue
      : `${payment.daysUntilDue} days`;

    const urgency = payment.isOverdue ? '🔴 Urgent' :
                    payment.isUrgent ? '🟡 Soon' :
                    '🟢 OK';

    const amount = `$${payment.amount.toLocaleString()}`;

    response += `| ${cardName} | ${dueDate} | ${daysLeftText} | ${amount} | ${urgency} |\n`;
  });

  return response.trim();
};

const calculateTotalAvailableCredit = (cards) => {
  const totalAvailable = cards.reduce((sum, card) => sum + (card.credit_limit - card.current_balance), 0);

  let response = `**Total Available Credit:** $${totalAvailable.toLocaleString()}`;

  return response.trim();
};

const showAvailableCredit = (cards) => {
  let response = `**Available Credit:**\n\n`;

  response += '| Card | Available | Limit | Balance |\n';
  response += '|------|-----------|-------|----------|\n';

  cards.forEach(card => {
    const available = card.credit_limit - card.current_balance;
    response += `| ${card.card_name || card.card_type} | $${available.toLocaleString()} | $${card.credit_limit.toLocaleString()} | $${card.current_balance.toLocaleString()} |\n`;
  });

  const totalAvailable = cards.reduce((sum, card) => sum + (card.credit_limit - card.current_balance), 0);
  response += `\n**Total Available:** $${totalAvailable.toLocaleString()}`;

  return response.trim();
};

const showUtilization = (cards) => {
  const totalBalance = cards.reduce((sum, card) => sum + card.current_balance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit, 0);
  const overallUtil = Math.round((totalBalance / totalLimit) * 100);

  let response = `**Credit Utilization**\n\n`;
  response += `**Overall: ${overallUtil}%** ${overallUtil < 30 ? '✅ Excellent!' : overallUtil < 50 ? '⚠️ Fair' : '🔴 High'}\n\n`;

  response += '| Card | Balance | Limit | Utilization | Status |\n';
  response += '|------|---------|-------|-------------|--------|\n';

  cards.forEach(card => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    const emoji = util < 30 ? '✅' : util < 50 ? '⚠️' : '🔴';
    const status = util < 30 ? 'Excellent' : util < 50 ? 'Fair' : 'High';
    response += `| ${card.card_name || card.card_type} | $${card.current_balance.toLocaleString()} | $${card.credit_limit.toLocaleString()} | ${util}% | ${emoji} ${status} |\n`;
  });

  response += `\n*Tip: Keep utilization below 30% for best credit score.*`;

  return response.trim();
};

const showPaymentAmounts = (cards) => {
  const cardsWithPayments = cards.filter(c => c.amount_to_pay);

  if (cardsWithPayments.length === 0) {
    return "No payment amounts set. Optimize payments in [Payment Optimizer](vitta://navigate/optimizer)";
  }

  let response = `**Payment Amounts:**\n\n`;

  response += '| Card | Balance | Payment Amount | APR |\n';
  response += '|------|---------|----------------|-----|\n';

  cardsWithPayments.forEach(card => {
    response += `| ${card.card_name || card.card_type} | $${card.current_balance.toLocaleString()} | $${card.amount_to_pay.toLocaleString()} | ${card.apr}% |\n`;
  });

  response += `\nOptimize payments in [Payment Optimizer](vitta://navigate/optimizer)`;

  return response.trim();
};

const listAllCards = (cards) => {
  let response = `You have **${cards.length} card${cards.length > 1 ? 's' : ''}** in your wallet:\n\n`;

  // Create table header
  response += '| Card | Balance | Limit | APR | Utilization |\n';
  response += '|------|---------|-------|-----|-------------|\n';

  // Add table rows
  cards.forEach((card) => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    const utilEmoji = util < 30 ? '✅' : util < 50 ? '⚠️' : '🔴';

    const cardName = card.card_name || card.card_type;
    const balance = `$${card.current_balance.toLocaleString()}`;
    const limit = `$${card.credit_limit.toLocaleString()}`;
    const apr = `${card.apr}%`;
    const utilization = `${util}% ${utilEmoji}`;

    response += `| ${cardName} | ${balance} | ${limit} | ${apr} | ${utilization} |\n`;
  });

  response += `\nView details in [My Wallet](vitta://navigate/cards)`;
  return response.trim();
};
