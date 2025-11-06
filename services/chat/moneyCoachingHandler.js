/**
 * Money Coaching Handler
 * Provides general financial education and credit card best practices
 * Focus: Education, tips, building good habits
 */

/**
 * Handle money coaching queries
 * @param {Array} cards - User's credit cards
 * @param {Object} entities - Extracted entities from query
 * @param {string} query - Original query
 * @returns {string} - Coaching response
 */
export const handleMoneyCoaching = (cards, entities, query) => {
  console.log('[MoneyCoachingHandler] Providing financial coaching');

  const lowerQuery = query.toLowerCase();

  // Detect specific topics
  const topics = {
    creditScore: /credit score|credit rating|improve.*credit|boost.*credit/i.test(query),
    utilization: /utilization|credit usage|how much.*use/i.test(query),
    gracePeriod: /grace period|when.*interest|avoid.*interest/i.test(query),
    apr: /apr|interest rate|how.*interest.*calculated/i.test(query),
    balanceTransfer: /balance transfer|transfer.*balance|0%.*apr/i.test(query),
    rewards: /maximize.*rewards|earn.*points|cashback.*strategy/i.test(query)
  };

  // Credit Score Coaching
  if (topics.creditScore) {
    let response = `## 📈 Improving Your Credit Score\n\n`;
    response += `**Key factors:**\n`;
    response += `1. **Payment history (35%)** - Pay on time, every time\n`;
    response += `2. **Utilization (30%)** - Keep below 30% on each card\n`;
    response += `3. **Credit age (15%)** - Keep old cards open\n`;
    response += `4. **Credit mix (10%)** - Variety of credit types\n`;
    response += `5. **New credit (10%)** - Limit hard inquiries\n\n`;

    if (cards && cards.length > 0) {
      const totalBalance = cards.reduce((sum, c) => sum + c.current_balance, 0);
      const totalLimit = cards.reduce((sum, c) => sum + c.credit_limit, 0);
      const util = Math.round((totalBalance / totalLimit) * 100);

      response += `**Your current utilization:** ${util}%\n`;
      if (util > 30) {
        response += `⚠️ Above 30% - try to pay down balances to boost your score\n\n`;
      } else {
        response += `✅ Good! Keep it below 30%\n\n`;
      }

      // Check for high-utilization cards
      const highUtilCards = cards.filter(c => (c.current_balance / c.credit_limit) > 0.5);
      if (highUtilCards.length > 0) {
        response += `**Cards to focus on:**\n`;
        highUtilCards.forEach(c => {
          const cardUtil = Math.round((c.current_balance / c.credit_limit) * 100);
          response += `• ${c.nickname || c.card_name || c.card_type}: ${cardUtil}% (pay down to <30%)\n`;
        });
        response += `\n`;
      }
    }

    response += `**Quick wins:**\n`;
    response += `• Pay before statement closes (lowers reported utilization)\n`;
    response += `• Set up autopay for minimums (never miss a payment)\n`;
    response += `• Request credit limit increases (lowers utilization ratio)`;

    return response.trim();
  }

  // Utilization Coaching
  if (topics.utilization) {
    let response = `## 📊 Credit Utilization Explained\n\n`;
    response += `**What it is:** Percentage of credit you're using vs. your total limit\n\n`;
    response += `**Why it matters:** Second biggest factor in credit score (30%)\n\n`;
    response += `**The rules:**\n`;
    response += `• **Under 10%:** Excellent 🌟\n`;
    response += `• **10-30%:** Good ✅\n`;
    response += `• **30-50%:** Fair ⚠️\n`;
    response += `• **Over 50%:** Poor 🔴\n\n`;

    if (cards && cards.length > 0) {
      const totalBalance = cards.reduce((sum, c) => sum + c.current_balance, 0);
      const totalLimit = cards.reduce((sum, c) => sum + c.credit_limit, 0);
      const util = Math.round((totalBalance / totalLimit) * 100);

      response += `**Your utilization:**\n`;
      response += `• Overall: ${util}% ($${totalBalance.toLocaleString()} / $${totalLimit.toLocaleString()})\n\n`;

      response += `**Per card:**\n`;
      cards.forEach(c => {
        const cardUtil = Math.round((c.current_balance / c.credit_limit) * 100);
        const emoji = cardUtil < 30 ? '✅' : cardUtil < 50 ? '⚠️' : '🔴';
        response += `${emoji} ${c.nickname || c.card_name || c.card_type}: ${cardUtil}%\n`;
      });
      response += `\n`;
    }

    response += `**Pro tips:**\n`;
    response += `• Pay multiple times per month to keep it low\n`;
    response += `• Both per-card AND overall utilization matter\n`;
    response += `• Lenders report on statement close date, not due date`;

    return response.trim();
  }

  // Grace Period Coaching
  if (topics.gracePeriod) {
    let response = `## ⏰ Grace Periods Explained\n\n`;
    response += `**What it is:** Interest-free period between purchase and payment due date\n\n`;
    response += `**Typical length:** 21-25 days after statement closes\n\n`;
    response += `**How to keep it:**\n`;
    response += `✅ Pay statement balance in full each month\n`;
    response += `❌ Carry any balance → lose grace period on NEW purchases\n\n`;

    response += `**Example:**\n`;
    response += `1. Statement closes Jan 15 with $1,000 balance\n`;
    response += `2. Payment due Feb 10 (25-day grace period)\n`;
    response += `3. Pay $1,000 in full → keep grace period\n`;
    response += `4. Pay $500 only → lose grace period, new purchases accrue interest immediately\n\n`;

    if (cards && cards.length > 0) {
      const carryingBalance = cards.filter(c => c.current_balance > 0);
      if (carryingBalance.length > 0) {
        response += `⚠️ **You're carrying balances on ${carryingBalance.length} card(s):**\n`;
        carryingBalance.forEach(c => {
          response += `• ${c.nickname || c.card_name || c.card_type}: $${c.current_balance.toLocaleString()} - likely NO grace period\n`;
        });
        response += `\n**Impact:** New purchases on these cards start accruing interest immediately.\n\n`;
      }
    }

    response += `**Key takeaway:** Pay in full = free 25-day loan. Carry balance = pay interest from day 1.`;

    return response.trim();
  }

  // APR Coaching
  if (topics.apr) {
    let response = `## 💰 APR (Annual Percentage Rate) Explained\n\n`;
    response += `**What it is:** Yearly interest rate on unpaid balances\n\n`;
    response += `**How it's calculated:**\n`;
    response += `• Monthly rate = APR ÷ 12\n`;
    response += `• Daily rate = APR ÷ 365\n`;
    response += `• Interest compounds daily\n\n`;

    if (cards && cards.length > 0) {
      response += `**Your cards:**\n`;
      const sortedByAPR = [...cards].sort((a, b) => a.apr - b.apr);
      sortedByAPR.forEach(c => {
        const monthlyRate = (c.apr / 12).toFixed(2);
        const monthlyInterest = (c.current_balance * (c.apr / 100) / 12).toFixed(2);
        response += `• **${c.nickname || c.card_name || c.card_type}:** ${c.apr}% APR\n`;
        response += `  - Monthly rate: ${monthlyRate}%\n`;
        if (c.current_balance > 0) {
          response += `  - Current monthly interest: ~$${monthlyInterest}\n`;
        }
      });
      response += `\n`;
    }

    response += `**Example:** $1,000 balance at 20% APR\n`;
    response += `• Monthly interest: $1,000 × (20% ÷ 12) = $16.67\n`;
    response += `• Pay $50/month → takes 24 months, costs $200 in interest\n`;
    response += `• Pay $100/month → takes 11 months, costs $90 in interest\n\n`;

    response += `**Pro tip:** Every dollar above the minimum saves you money!`;

    return response.trim();
  }

  // General coaching (fallback)
  let response = `## 💡 Credit Card Best Practices\n\n`;
  response += `**The golden rules:**\n`;
  response += `1. **Pay in full** each month (avoid interest)\n`;
  response += `2. **Keep utilization under 30%** (boost credit score)\n`;
  response += `3. **Pay on time** always (set up autopay)\n`;
  response += `4. **Don't close old cards** (hurts credit age)\n`;
  response += `5. **Review statements** monthly (catch fraud early)\n\n`;

  if (cards && cards.length > 0) {
    const totalBalance = cards.reduce((sum, c) => sum + c.current_balance, 0);
    const util = Math.round((totalBalance / cards.reduce((sum, c) => sum + c.credit_limit, 0)) * 100);

    response += `**Your snapshot:**\n`;
    response += `• ${cards.length} card${cards.length > 1 ? 's' : ''} in wallet\n`;
    response += `• $${totalBalance.toLocaleString()} total balance\n`;
    response += `• ${util}% utilization\n\n`;
  }

  response += `**What would you like to know more about?**\n`;
  response += `• "How to improve my credit score"\n`;
  response += `• "What is credit utilization"\n`;
  response += `• "How does grace period work"\n`;
  response += `• "Explain APR"`;

  return response.trim();
};

