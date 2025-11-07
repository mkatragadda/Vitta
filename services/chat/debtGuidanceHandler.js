/**
 * Debt Guidance Handler
 * Provides strategic advice for reducing credit card debt
 * Focus: Education, actionable steps, empathy
 */

import { getSlotFillingState, QUESTION_TYPES } from './slotFillingManager.js';

/**
 * Handle debt guidance queries
 * @param {Array} cards - User's credit cards
 * @param {Object} entities - Extracted entities from query
 * @param {string} query - Original query
 * @returns {string} - Guidance response
 */
export const handleDebtGuidance = (cards, entities, query) => {
  console.log('[DebtGuidanceHandler] Generating debt payoff strategy');

  // No cards case
  if (!cards || cards.length === 0) {
    return `I'd love to help you create a debt payoff strategy, but you haven't added any cards yet.

**Get started:**
1. Add your cards in [My Wallet](vitta://navigate/cards)
2. I'll analyze your balances, APRs, and payment schedule
3. Get a personalized debt elimination plan

**What I'll help you with:**
• Avalanche vs snowball strategy comparison
• Interest savings calculations
• Payment allocation optimization
• Timeline to debt freedom`;
  }

  // Calculate debt metrics
  const totalBalance = cards.reduce((sum, card) => sum + card.current_balance, 0);
  const totalLimit = cards.reduce((sum, card) => sum + card.credit_limit, 0);
  const utilization = Math.round((totalBalance / totalLimit) * 100);

  // Sort cards by APR (highest first - avalanche method)
  const cardsByAPR = [...cards].sort((a, b) => b.apr - a.apr);

  // Calculate minimum payments
  const totalMinPayment = cards.reduce((sum, card) => sum + (card.amount_to_pay || 0), 0);

  // Calculate monthly interest if only paying minimums
  const monthlyInterest = cards.reduce((sum, card) => {
    const balance = card.current_balance;
    const monthlyRate = (card.apr / 100) / 12;
    return sum + (balance * monthlyRate);
  }, 0);

  let response = `## 💡 Debt Payoff Strategy\n\n`;
  response += `**Current situation:**\n`;
  response += `• Total debt: $${totalBalance.toLocaleString()}\n`;
  response += `• Across ${cards.length} card${cards.length > 1 ? 's' : ''}\n`;
  response += `• Overall utilization: ${utilization}%\n`;
  response += `• Monthly interest (if minimums only): ~$${monthlyInterest.toFixed(2)}\n\n`;

  // Strategy recommendation
  response += `**Recommended: Avalanche Method** ✅\n`;
  response += `Pay minimums on all cards, then put extra toward highest APR first.\n\n`;

  response += `**Priority order:**\n`;
  cardsByAPR.forEach((card, index) => {
    const cardName = card.nickname || card.card_name || card.card_type;
    response += `${index + 1}. **${cardName}** - ${card.apr}% APR, $${card.current_balance.toLocaleString()} balance\n`;
  });
  response += `\n`;

  // High utilization warning
  if (utilization > 50) {
    response += `⚠️ **High utilization (${utilization}%)** hurts your credit score. Try to get below 30%.\n\n`;
  }

  // Actionable steps
  response += `**Action steps:**\n`;
  response += `1. **Cover minimums:** $${totalMinPayment.toLocaleString()}/month minimum\n`;
  response += `2. **Add extra to highest APR:** Every $100 extra saves ~$${(cardsByAPR[0].apr / 12).toFixed(2)}/month in interest\n`;
  response += `3. **Track progress:** Use [Payment Optimizer](vitta://navigate/optimizer) to see your payoff timeline\n`;
  response += `4. **Avoid new charges:** Stop using cards you're paying down\n\n`;

  // Interest savings potential
  if (totalBalance > 1000) {
    const potentialSavings = monthlyInterest * 0.6; // Rough estimate of 60% reduction with aggressive payoff
    response += `💰 **Potential savings:** ~$${potentialSavings.toFixed(2)}/month by paying more than minimums\n\n`;
  }

  // Call to action - SET UP SLOT FILLING
  response += `**Want a detailed plan?** Tell me your monthly budget and I'll show you exactly how to split it across your cards for maximum impact.`;

  // Set up slot-filling expectation
  const slotFillingState = getSlotFillingState();
  slotFillingState.askQuestion(
    QUESTION_TYPES.BUDGET_AMOUNT,
    'split_payment',
    ['budget'],
    {}
  );
  
  console.log('[DebtGuidanceHandler] Slot-filling set up for budget question');

  return response.trim();
};

