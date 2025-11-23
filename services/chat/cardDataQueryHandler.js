/**
 * Card Data Query Handler
 * Intelligently answers questions about card data using semantic entities
 * 
 * Phase 3: Now uses QueryDecomposer → QueryExecutor → ResponseGenerator pipeline
 * Falls back to legacy handlers for compatibility
 */

import { findBestCardForMerchant } from '../cardAnalyzer';
import { QueryDecomposer } from './query/queryDecomposer.js';
import { QueryExecutor } from './query/queryExecutor.js';
import { ResponseGenerator } from './query/responseGenerator.js';

// Phase 3: Initialize components
let decomposer = null;
let executor = null;
let responseGenerator = null;

/**
 * Main handler for query_card_data intent
 * Uses Phase 3 pipeline: Entities → QueryDecomposer → QueryExecutor → ResponseGenerator
 * Phase 6: Now integrates PatternLearner, QueryAnalytics, and FeedbackLoop
 * Falls back to legacy handlers when Phase 3 doesn't apply
 */
export const handleCardDataQuery = async (cards, entities, query) => {
  console.log('[CardDataQuery] Handling query:', query);
  console.log('[CardDataQuery] Extracted entities:', {
    attribute: entities.attribute,
    modifier: entities.modifier,
    queryType: entities.queryType,
    networkValue: entities.networkValue,
    issuerValue: entities.issuerValue,
    balanceFilter: entities.balanceFilter
  });

  if (!cards || cards.length === 0) {
    return "You don't have any cards in your wallet yet. Add one in [My Wallet](vitta://navigate/cards)!";
  }

  // Initialize Phase 3 components if not already done
  // Phase 6: Now includes PatternLearner and QueryAnalytics
  if (!decomposer) {
    decomposer = new QueryDecomposer({
      enablePatternLearning: true // Phase 6: Enable pattern learning
    });
  }
  if (!executor) {
    executor = new QueryExecutor(cards, {
      enableTracking: true, // Phase 6: Enable query tracking
      userId: cards[0]?.user_id || null,
      entities: entities,
      query: query
    });
  }
  if (!responseGenerator) {
    responseGenerator = new ResponseGenerator({ includeInsights: true, includeTips: true });
  }

  const { attribute, modifier, queryType, merchant, category, balanceFilter, networkValue, issuerValue } = entities;

  // Phase 3: Try to use new pipeline for supported queries
  // Use Phase 3 for: distinct queries, aggregations, grouped aggregations, complex filters
  // BUT NOT for:
  //  1. "highest/lowest" queries that need card details (use legacy handler instead)
  //  2. Simple listing queries with balance filters (use legacy handler instead)
  // Exception: Skip Phase 3 for "highest/lowest" queries with network/issuer filters - these need card details
  const isHighestLowestQuery = (modifier === 'highest' || modifier === 'lowest') && 
                                (networkValue || issuerValue || attribute === 'balance' || attribute === 'apr');
  
  // Skip Phase 3 for simple listing queries with balance filters (zero_balance, with_balance)
  // These should use the legacy listing handler which properly formats the response
  const isSimpleBalanceListing = balanceFilter && (queryType === 'listing' || !entities.aggregation);
  
  const shouldUsePhase3 = !isHighestLowestQuery && !isSimpleBalanceListing && (
                          entities.distinctQuery?.isDistinct || 
                          entities.aggregation || 
                          entities.grouping ||
                          (entities.compoundOperators?.logicalOperators?.length > 0));
  
  if (shouldUsePhase3) {
    try {
      console.log('[CardDataQuery] Using Phase 3 pipeline for query:', query);
      // Phase 6: Now async due to pattern matching
      const phase3Response = await handleCardDataQueryPhase3(cards, entities, query);
      if (phase3Response) {
        return phase3Response;
      }
      // If Phase 3 returns null/empty, fall through to legacy
    } catch (error) {
      console.error('[CardDataQuery] Phase 3 pipeline failed, falling back to legacy:', error);
      // Fall through to legacy handlers
    }
  }

  // Apply filters if specified (filters cards before processing)
  let filteredCards = cards;
  
  // Network filter (e.g., "visa cards", "all mastercard cards")
  if (networkValue) {
    const beforeCount = filteredCards.length;
    filteredCards = filteredCards.filter(c => {
      const cardNetwork = (c.card_network || '').toLowerCase();
      const normalizedNetwork = networkValue.toLowerCase();
      // Handle "Amex" vs "American Express"
      if (normalizedNetwork === 'amex') {
        return cardNetwork === 'amex' || cardNetwork === 'american express';
      }
      return cardNetwork === normalizedNetwork;
    });
    const afterCount = filteredCards.length;
    console.log(`[CardDataQuery] Network filter applied: ${networkValue}`);
    console.log(`[CardDataQuery] Filtered from ${beforeCount} to ${afterCount} cards`);
    if (filteredCards.length === 0) {
      return `You don't have any **${networkValue}** cards in your wallet.\n\nAdd one in [My Wallet](vitta://navigate/cards)!`;
    }
  }
  
  // Issuer filter (e.g., "chase cards", "all citi cards")
  if (issuerValue) {
    filteredCards = filteredCards.filter(c => {
      const cardIssuer = (c.issuer || '').toLowerCase();
      const normalizedIssuer = issuerValue.toLowerCase();
      return cardIssuer === normalizedIssuer;
    });
    if (filteredCards.length === 0) {
      return `You don't have any **${issuerValue}** cards in your wallet.\n\nAdd one in [My Wallet](vitta://navigate/cards)!`;
    }
  }
  
  // Balance filter
  if (balanceFilter === 'with_balance') {
    // Only cards with non-zero balance
    filteredCards = filteredCards.filter(c => (c.current_balance || 0) > 0);
    if (filteredCards.length === 0) {
      return "✅ **Great news!** All your cards are paid off. You don't have any cards with balances.\n\nAll your cards show $0.00 balance. Keep it up! 🎉";
    }
  } else if (balanceFilter === 'zero_balance') {
    // Only cards with zero balance (paid off)
    filteredCards = filteredCards.filter(c => (c.current_balance || 0) === 0);
    if (filteredCards.length === 0) {
      return "All your cards have balances. You don't have any cards that are paid off right now.";
    }
  }

  // Route to specific handlers based on attribute + modifier combination

  // APR queries
  if (attribute === 'apr') {
    if (modifier === 'lowest') return findLowestAPRCard(filteredCards);
    if (modifier === 'highest') return findHighestAPRCard(filteredCards);
    return showAllAPRs(filteredCards);
  }

  // Balance queries
  if (attribute === 'balance') {
    if (modifier === 'highest') return findHighestBalanceCard(filteredCards, networkValue, issuerValue);
    if (modifier === 'lowest') return findLowestBalanceCard(filteredCards, networkValue, issuerValue);
    if (modifier === 'total') return calculateTotalBalance(filteredCards);
    return showAllBalances(filteredCards, balanceFilter);
  }

  // Due date queries
  if (attribute === 'due_date' || queryType === 'timeframe') {
    return showDueDates(cards);
  }

  // Available credit
  if (attribute === 'available_credit') {
    if (modifier === 'total') return calculateTotalAvailableCredit(filteredCards);
    return showAvailableCredit(filteredCards);
  }

  // Utilization
  if (attribute === 'utilization') {
    return showUtilization(filteredCards);
  }

  // Payment amount
  if (attribute === 'payment_amount') {
    return showPaymentAmounts(filteredCards);
  }

  // Listing - show cards (filtered if network/issuer/balance filter applied)
  // IMPORTANT: Check listing BEFORE recommendations to avoid routing network/issuer filters to recommendation handler
  // Also check if balanceFilter is present (zero_balance, with_balance) - these are listing queries
  if (queryType === 'listing' || networkValue || issuerValue || balanceFilter) {
    // Check if we have filtered cards (network, issuer, or balance filter)
    if (networkValue || issuerValue || balanceFilter) {
      // Build filter description
      const filterDesc = [];
      if (networkValue) filterDesc.push(networkValue);
      if (issuerValue) filterDesc.push(issuerValue);
      if (balanceFilter === 'with_balance') filterDesc.push('with balance');
      if (balanceFilter === 'zero_balance') filterDesc.push('zero balance');
      
      const filterText = filterDesc.join(' ');
      
      // Show filtered cards with explanation
      if (balanceFilter === 'with_balance') {
        return listCardsWithBalance(filteredCards, cards.length);
      } else if (balanceFilter === 'zero_balance') {
        return listCardsWithZeroBalance(filteredCards, cards.length);
      } else if (networkValue || issuerValue) {
        // Show filtered cards by network/issuer
        return listFilteredCards(filteredCards, filterText, cards.length);
      }
    }
    return listAllCards(filteredCards);
  }

  // Rewards / Best card for category or merchant recommendations
  // NOTE: Check this AFTER listing to avoid routing "all visa cards" to recommendation handler
  if (attribute === 'rewards' || queryType === 'recommendation' || modifier === 'best' || merchant) {
    if (merchant) {
      const bestCard = findBestCardForMerchant(merchant, cards);
      if (!bestCard) {
        return `I don't have specific reward data for **${merchant}** yet.\n\n**What would you like to know?**\n• Which specific merchant? (e.g., "Costco", "Target")\n• Or general category? (e.g., "groceries", "gas", "travel")\n\nFor now, check card details in [My Wallet](vitta://navigate/cards).`;
      }
      return `For **${merchant}**, use your **${bestCard.nickname || bestCard.card_name}**!\n\n**Why?** ${bestCard.reason}\n\n**Other questions?**\n• Want to see all your cards?\n• Need to know due dates or balances?`;
    }
    if (category) {
      return `I can help with **${category}** recommendations!\n\n**Which ${category} merchant?**\n• Costco?\n• Target?\n• Whole Foods?\n• Or another store?\n\nFor general info, check [My Wallet](vitta://navigate/cards).`;
    }
    return "Which merchant or category?\n\n**Try asking:**\n• 'Best card for Costco'\n• 'Which card for Target'\n• 'Card to use at Whole Foods'";
  }

  // Default: couldn't determine specific query - show helpful suggestions
  return `I'm here to help with your credit cards!\n\n**What would you like to know?**\n• Card balances or APR rates?\n• Best card for a specific store?\n• Payment due dates?\n• Credit utilization?\n\n**Try asking:**\n• "What's my lowest interest card?"\n• "Best card for Costco?"\n• "When are my payments due?"\n• "Show my balances"`;
};

/** Helper Functions **/

const listFilteredCards = (cards, filterText, totalCards) => {
  let response = `**${filterText.charAt(0).toUpperCase() + filterText.slice(1)} Cards** (${cards.length} of ${totalCards} total cards):\n\n`;

  response += '| Card | Balance | Limit | APR | Network | Utilization |\n';
  response += '|------|---------|-------|-----|---------|-------------|\n';

  cards.forEach((card) => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    const utilEmoji = util < 30 ? '✅' : util < 50 ? '⚠️' : '🔴';

    const cardName = card.nickname || card.card_name;
    const balance = `$${card.current_balance.toLocaleString()}`;
    const limit = `$${card.credit_limit.toLocaleString()}`;
    const apr = `${card.apr}%`;
    const network = card.card_network || 'N/A';
    const utilization = `${util}% ${utilEmoji}`;

    response += `| ${cardName} | ${balance} | ${limit} | ${apr} | ${network} | ${utilization} |\n`;
  });

  const totalBalance = cards.reduce((sum, c) => sum + (c.current_balance || 0), 0);
  const totalLimit = cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
  const overallUtil = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;

  response += `\n**Summary:**`;
  response += `\n• Total balance: $${totalBalance.toLocaleString()}`;
  response += `\n• Total limit: $${totalLimit.toLocaleString()}`;
  response += `\n• Overall utilization: ${overallUtil}%`;

  response += `\n\nView all cards in [My Wallet](vitta://navigate/cards)`;
  return response.trim();
};

const findLowestAPRCard = (cards) => {
  const sorted = [...cards].sort((a, b) => a.apr - b.apr);
  const lowest = sorted[0];

  const status = lowest.apr === 0 ? '✅ Promo 0%' : lowest.apr < 15 ? '🟢 Excellent' : '🟡 Good';

  let response = `**Lowest APR Card**\n\n`;
  response += `**${lowest.nickname || lowest.card_name}** has the lowest APR at **${lowest.apr}%** ${status}\n\n`;
  response += `- Balance: $${lowest.current_balance.toLocaleString()}\n`;
  response += `- Credit Limit: $${lowest.credit_limit.toLocaleString()}\n`;

  if (sorted.length > 1) {
    response += `\n**Other Cards:**\n`;
    sorted.slice(1, 3).forEach(card => {
      response += `- ${card.nickname || card.card_name}: ${card.apr}% APR\n`;
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
  response += `**${highest.nickname || highest.card_name}** has the highest APR at **${highest.apr}%**\n\n`;
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
    response += `| ${card.nickname || card.card_name} | ${card.apr}% | ${emoji} ${status} |\n`;
  });

  return response.trim();
};

const findHighestBalanceCard = (cards, networkValue = null, issuerValue = null) => {
  if (!cards || cards.length === 0) {
    console.log('[findHighestBalanceCard] No cards provided');
    return "No cards found.";
  }

  console.log(`[findHighestBalanceCard] Finding highest balance from ${cards.length} card(s)`);
  console.log(`[findHighestBalanceCard] Filter context: network=${networkValue || 'none'}, issuer=${issuerValue || 'none'}`);
  
  const sorted = [...cards].sort((a, b) => b.current_balance - a.current_balance);
  const highest = sorted[0];
  
  console.log(`[findHighestBalanceCard] Highest balance card: ${highest.nickname || highest.card_name} ($${highest.current_balance})`);
  console.log(`[findHighestBalanceCard] Card network: ${highest.card_network || 'unknown'}`);

  const util = Math.round((highest.current_balance / highest.credit_limit) * 100);

  // Build context prefix if filtered
  let contextPrefix = '';
  if (networkValue) {
    contextPrefix = `**${networkValue} Card with Highest Balance**\n\n`;
  } else if (issuerValue) {
    contextPrefix = `**${issuerValue} Card with Highest Balance**\n\n`;
  }

  let response = `${contextPrefix}**Highest Balance:** ${highest.nickname || highest.card_name}`;
  response += `\n\nBalance: $${highest.current_balance.toLocaleString()} / $${highest.credit_limit.toLocaleString()}`;
  response += `\nUtilization: ${util}%`;
  response += `\nAPR: ${highest.apr}%`;
  
  // Add network/issuer info if available
  if (highest.card_network) {
    response += `\nNetwork: ${highest.card_network}`;
  }
  if (highest.issuer) {
    response += `\nIssuer: ${highest.issuer}`;
  }

  // Show count if filtered
  if (networkValue || issuerValue) {
    response += `\n\n*Found ${cards.length} ${networkValue || issuerValue} card${cards.length !== 1 ? 's' : ''} total*`;
  }

  return response.trim();
};

const findLowestBalanceCard = (cards, networkValue = null, issuerValue = null) => {
  if (!cards || cards.length === 0) {
    console.log('[findLowestBalanceCard] No cards provided');
    return "No cards found.";
  }

  console.log(`[findLowestBalanceCard] Finding lowest balance from ${cards.length} card(s)`);
  console.log(`[findLowestBalanceCard] Filter context: network=${networkValue || 'none'}, issuer=${issuerValue || 'none'}`);

  // Filter to cards with balance > 0 (exclude $0 balance cards - they're already paid off)
  // Then sort by balance (ascending) to find the lowest non-zero balance
  const sorted = [...cards].filter(c => (c.current_balance || 0) > 0).sort((a, b) => {
    const balanceA = a.current_balance || 0;
    const balanceB = b.current_balance || 0;
    return balanceA - balanceB;
  });

  if (sorted.length === 0) {
    // Check if all cards are zero balance
    const hasAnyBalance = cards.some(c => (c.current_balance || 0) > 0);
    if (!hasAnyBalance) {
      return "All your cards have $0 balance! 🎉";
    }
    // If filtered by network/issuer and no matches with balance
    if (networkValue || issuerValue) {
      return `You don't have any **${networkValue || issuerValue}** cards with balances.\n\nAll your ${networkValue || issuerValue} cards are paid off! 🎉`;
    }
    return "All your cards have $0 balance! 🎉";
  }

  const lowest = sorted[0];
  
  console.log(`[findLowestBalanceCard] Lowest balance card: ${lowest.nickname || lowest.card_name} ($${lowest.current_balance})`);
  console.log(`[findLowestBalanceCard] Card network: ${lowest.card_network || 'unknown'}`);

  const util = Math.round((lowest.current_balance / lowest.credit_limit) * 100);

  // Build context prefix if filtered
  let contextPrefix = '';
  if (networkValue) {
    contextPrefix = `**${networkValue} Card with Lowest Balance**\n\n`;
  } else if (issuerValue) {
    contextPrefix = `**${issuerValue} Card with Lowest Balance**\n\n`;
  }

  let response = `${contextPrefix}**Lowest Balance:** ${lowest.nickname || lowest.card_name}`;
  response += `\n\nBalance: $${lowest.current_balance.toLocaleString()} / $${lowest.credit_limit.toLocaleString()}`;
  response += `\nUtilization: ${util}%`;
  response += `\nAPR: ${lowest.apr}%`;
  
  // Add network/issuer info if available
  if (lowest.card_network) {
    response += `\nNetwork: ${lowest.card_network}`;
  }
  if (lowest.issuer) {
    response += `\nIssuer: ${lowest.issuer}`;
  }

  // Show count if filtered
  if (networkValue || issuerValue) {
    const cardsWithBalance = sorted.length;
    response += `\n\n*Found ${cardsWithBalance} ${networkValue || issuerValue} card${cardsWithBalance !== 1 ? 's' : ''} with balance${cardsWithBalance !== 1 ? 's' : ''}*`;
  }

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

const showAllBalances = (cards, balanceFilter = null) => {
  let response = '';
  
  // Add filter explanation if balance filter is applied
  if (balanceFilter === 'with_balance') {
    response = `**Cards with Balances:**\n\n`;
  } else if (balanceFilter === 'zero_balance') {
    response = `**Cards with Zero Balance (Paid Off):**\n\n`;
  } else {
    response = `**Card Balances:**\n\n`;
  }

  response += '| Card | Balance | Limit | Utilization |\n';
  response += '|------|---------|-------|-------------|\n';

  cards.forEach(card => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    const utilEmoji = util < 30 ? '✅' : util < 50 ? '⚠️' : '🔴';
    response += `| ${card.nickname || card.card_name} | $${card.current_balance.toLocaleString()} | $${card.credit_limit.toLocaleString()} | ${util}% ${utilEmoji} |\n`;
  });

  // Add summary if filtered
  if (balanceFilter === 'with_balance' && cards.length > 0) {
    const totalBalance = cards.reduce((sum, c) => sum + (c.current_balance || 0), 0);
    response += `\n**Total balance across ${cards.length} card${cards.length !== 1 ? 's' : ''}:** $${totalBalance.toLocaleString()}`;
  } else if (balanceFilter === 'zero_balance' && cards.length > 0) {
    response += `\n**✅ ${cards.length} card${cards.length !== 1 ? 's are' : ' is'} paid off!** Keep up the great work! 🎉`;
  }

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

  response += '| Card | Due Date | Days Left | Current Balance | Min Payment Due | Status |\n';
  response += '|------|----------|-----------|-----------------|-----------------|--------|\n';

  upcomingPayments.forEach(payment => {
    const cardName = payment.card.nickname || payment.card.card_name || payment.card.card_type;
    const dueDate = payment.paymentDueDate.toLocaleDateString();
    const absDays = Math.abs(payment.daysUntilDue);
    let daysLeftText;

    if (payment.daysUntilDue === 0) {
      daysLeftText = 'Today';
    } else if (payment.daysUntilDue < 0) {
      daysLeftText = `Overdue by ${absDays} day${absDays !== 1 ? 's' : ''}`;
    } else {
      daysLeftText = `${payment.daysUntilDue} day${payment.daysUntilDue !== 1 ? 's' : ''}`;
    }

    const urgency = payment.isOverdue ? '🔴 Overdue' :
                    payment.isUrgent ? '🟡 Soon' :
                    '🟢 OK';

    // Show both current balance and minimum payment due as separate columns
    const currentBalance = `$${(payment.card.current_balance || 0).toLocaleString()}`;
    const minPaymentDue = `$${(payment.card.amount_to_pay || 0).toLocaleString()}`;

    response += `| ${cardName} | ${dueDate} | ${daysLeftText} | ${currentBalance} | ${minPaymentDue} | ${urgency} |\n`;
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
    response += `| ${card.nickname || card.card_name} | $${available.toLocaleString()} | $${card.credit_limit.toLocaleString()} | $${card.current_balance.toLocaleString()} |\n`;
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
    response += `| ${card.nickname || card.card_name} | $${card.current_balance.toLocaleString()} | $${card.credit_limit.toLocaleString()} | ${util}% | ${emoji} ${status} |\n`;
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
    response += `| ${card.nickname || card.card_name} | $${card.current_balance.toLocaleString()} | $${card.amount_to_pay.toLocaleString()} | ${card.apr}% |\n`;
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

    const cardName = card.nickname || card.card_name;
    const balance = `$${card.current_balance.toLocaleString()}`;
    const limit = `$${card.credit_limit.toLocaleString()}`;
    const apr = `${card.apr}%`;
    const utilization = `${util}% ${utilEmoji}`;

    response += `| ${cardName} | ${balance} | ${limit} | ${apr} | ${utilization} |\n`;
  });

  response += `\nView details in [My Wallet](vitta://navigate/cards)`;
  return response.trim();
};

const listCardsWithBalance = (cards, totalCards) => {
  let response = `**Cards with Balances** (${cards.length} of ${totalCards} total cards):\n\n`;

  response += '| Card | Balance | Limit | APR | Utilization |\n';
  response += '|------|---------|-------|-----|-------------|\n';

  // Sort by balance (highest first)
  const sorted = [...cards].sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0));

  sorted.forEach((card) => {
    const util = Math.round((card.current_balance / card.credit_limit) * 100);
    const utilEmoji = util < 30 ? '✅' : util < 50 ? '⚠️' : '🔴';

    const cardName = card.nickname || card.card_name;
    const balance = `$${card.current_balance.toLocaleString()}`;
    const limit = `$${card.credit_limit.toLocaleString()}`;
    const apr = `${card.apr}%`;
    const utilization = `${util}% ${utilEmoji}`;

    response += `| ${cardName} | ${balance} | ${limit} | ${apr} | ${utilization} |\n`;
  });

  const totalBalance = cards.reduce((sum, c) => sum + (c.current_balance || 0), 0);
  const totalLimit = cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
  const overallUtil = Math.round((totalBalance / totalLimit) * 100);

  response += `\n**Summary:**`;
  response += `\n• Total balance: $${totalBalance.toLocaleString()}`;
  response += `\n• Average utilization: ${overallUtil}%`;
  response += `\n• ${totalCards - cards.length} card${totalCards - cards.length !== 1 ? 's are' : ' is'} paid off`;

  response += `\n\nView all cards in [My Wallet](vitta://navigate/cards)`;
  return response.trim();
};

const listCardsWithZeroBalance = (cards, totalCards) => {
  let response = `**Cards with Zero Balance (Paid Off)** (${cards.length} of ${totalCards} total cards):\n\n`;

  response += '| Card | Limit | APR | Status |\n';
  response += '|------|-------|-----|--------|\n';

  cards.forEach((card) => {
    const cardName = card.nickname || card.card_name;
    const limit = `$${card.credit_limit.toLocaleString()}`;
    const apr = `${card.apr}%`;
    const status = '✅ Paid Off';

    response += `| ${cardName} | ${limit} | ${apr} | ${status} |\n`;
  });

  const totalAvailable = cards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);

  response += `\n**Summary:**`;
  response += `\n• Total available credit: $${totalAvailable.toLocaleString()}`;
  response += `\n• ${totalCards - cards.length} card${totalCards - cards.length !== 1 ? 's have' : ' has'} balances`;

  response += `\n\n🎉 **Great job keeping these cards paid off!**`;
  response += `\n\nView all cards in [My Wallet](vitta://navigate/cards)`;
  return response.trim();
};

/**
 * Phase 3: Handle queries using QueryDecomposer → QueryExecutor → ResponseGenerator pipeline
 * 
 * @param {Array<Object>} cards - User's cards
 * @param {Object} entities - Extracted entities
 * @param {string} query - Original user query
 * @returns {string|null} - Formatted response or null if should fall back
 */
async function handleCardDataQueryPhase3(cards, entities, query) {
  console.log('[CardDataQuery] Phase 3: Using new pipeline for query:', query);

  try {
    // Recreate executor with current cards (cards may have changed)
    const currentExecutor = new QueryExecutor(cards);
    const startTime = performance.now();
    
    // Step 1: Decompose query into structured query (Phase 6: now async and uses pattern matching)
    const structuredQuery = await decomposer.decompose(query, entities, 'query_card_data');
    console.log('[CardDataQuery] Phase 3: Structured query:', JSON.stringify(structuredQuery, null, 2));
    console.log('[CardDataQuery] Phase 3: Decomposition method:', structuredQuery.decompositionMethod || 'direct');
    if (structuredQuery.patternId) {
      console.log('[CardDataQuery] Phase 3: Using pattern:', structuredQuery.patternId);
    }

    // Step 2: Execute structured query (Phase 6: now tracks execution automatically)
    const queryResults = currentExecutor.execute(structuredQuery, {
      query,
      entities,
      userId: cards[0]?.user_id || null // Extract userId from cards if available
    });
    const responseTime = performance.now() - startTime;
    
    // Phase 6: Add response time to results
    queryResults.queryMetadata = queryResults.queryMetadata || {};
    queryResults.queryMetadata.responseTime = Math.round(responseTime);
    
    console.log('[CardDataQuery] Phase 3: Query results:', JSON.stringify(queryResults, null, 2));

    // Step 3: Generate natural language response
    const response = responseGenerator.generateResponse(queryResults, structuredQuery, query);
    console.log('[CardDataQuery] Phase 3: Generated response:', response);

    // Phase 6: Learn from successful decomposition (async, don't wait)
    if (structuredQuery && queryResults) {
      decomposer.learnFromSuccess(queryResults).catch(error => {
        console.error('[CardDataQuery] Error learning from success:', error);
      });
    }

    // Update context for follow-up queries
    decomposer.updateContext(structuredQuery, queryResults);

    // Return response if valid
    if (response && response.trim().length > 0) {
      return response;
    }

    return null; // Fall back to legacy if response is empty
  } catch (error) {
    console.error('[CardDataQuery] Phase 3 error:', error);
    throw error; // Let caller handle fallback
  }
}
