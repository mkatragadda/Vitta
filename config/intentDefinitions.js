/**
 * Intent Definitions
 * Describes all available intents that the system can handle
 * Used for GPT context when no clear intent is detected
 */

export const INTENT_DEFINITIONS = {
  query_card_data: {
    name: "Query Card Data",
    description: "User wants to see information about their credit cards",
    capabilities: [
      "List all cards in wallet",
      "Show card balances and credit limits",
      "Display APR rates (lowest/highest/all)",
      "Show payment due dates",
      "Calculate credit utilization",
      "Show available credit",
      "Recommend best card for specific merchant or category",
      "Display payment amounts"
    ],
    examples: [
      "What cards do I have?",
      "Show my balances",
      "Which card has the lowest APR?",
      "When are my payments due?",
      "Best card for Costco?"
    ]
  },

  add_card: {
    name: "Add Card",
    description: "User wants to add a new credit card to their wallet",
    capabilities: [
      "Navigate to card management screen",
      "Guide user through adding a new card"
    ],
    examples: [
      "Add new card",
      "I want to add a credit card",
      "I got a new card"
    ]
  },

  remove_card: {
    name: "Remove Card",
    description: "User wants to remove/delete a card from their wallet",
    capabilities: [
      "Delete a specific card",
      "Navigate to card management to remove cards"
    ],
    examples: [
      "Delete this card",
      "Remove my Chase card",
      "I want to remove a card"
    ]
  },

  split_payment: {
    name: "Split Payment / Payment Optimization",
    description: "User wants to optimize how to split a payment across multiple cards",
    capabilities: [
      "Calculate optimal payment distribution across cards",
      "Minimize interest by prioritizing high APR cards",
      "Recommend payment amounts per card",
      "Navigate to Payment Optimizer screen"
    ],
    examples: [
      "Split $1500 between cards",
      "How should I split 1000?",
      "Optimize payment of $800"
    ]
  },

  navigate_screen: {
    name: "Navigate Screen",
    description: "User wants to navigate to a different screen in the app",
    capabilities: [
      "Navigate to: My Wallet (cards)",
      "Navigate to: Payment Optimizer (optimizer)",
      "Navigate to: Dashboard (dashboard)",
      "Navigate to: Expense Feed (expenses)"
    ],
    examples: [
      "Take me to my wallet",
      "Open payment optimizer",
      "Show dashboard"
    ]
  },

  help: {
    name: "Help / General Inquiry",
    description: "User needs help or wants to know what Vitta can do",
    capabilities: [
      "Explain Vitta's features",
      "Guide user on how to use the app",
      "Answer general questions about credit card management"
    ],
    examples: [
      "What can you do?",
      "Help me",
      "How can you help?"
    ]
  },

  card_recommendation: {
    name: "Card Recommendation / Purchase Optimization",
    description: "User wants personalized recommendation for which card to use for a specific purchase",
    capabilities: [
      "Recommend best card for specific merchant or category",
      "Maximize rewards (points, cashback, miles)",
      "Minimize interest charges (APR optimization)",
      "Optimize cash flow timing (float strategy)",
      "Compare all strategies for a purchase",
      "Explain reasoning behind recommendations",
      "Consider APR, rewards, statement cycles, and grace periods",
      "Provide coaching tips for better card usage"
    ],
    examples: [
      "Which card should I use at Costco?",
      "Best card for groceries?",
      "I want to maximize rewards for dining",
      "Which card avoids interest for $500 purchase?",
      "Help me choose a card for my trip",
      "Best card to use today?",
      "Compare all strategies for this purchase",
      "Which card has longest grace period?",
      "Lowest interest card for $1000?",
      "Maximize cashback for Target"
    ]
  },

  reminder_settings: {
    name: "Reminder Controls",
    description: "User wants to manage payment reminders or notification preferences",
    capabilities: [
      "Mute or pause payment reminders",
      "Resume reminders after they were muted",
      "List upcoming reminders",
      "Adjust reminder schedules or channels"
    ],
    examples: [
      "Mute all reminders",
      "Pause payment notifications",
      "Resume reminders",
      "Show my reminder schedule"
    ]
  },

  remember_memory: {
    name: "Save Memory or Note",
    description: "User wants to save a financial memory, note, or expense with tags for later recall",
    capabilities: [
      "Store chat notes with tags",
      "Associate optional amount, merchant, or category data",
      "Acknowledge successful capture"
    ],
    examples: [
      "Remember $80 for Danny's birthday gift, tag gifts",
      "Save a note to check travel deals on Friday, tag travel",
      "Remember I paid $45 cash for lunch, tag dining"
    ]
  },

  recall_memory: {
    name: "Recall Tagged Memories",
    description: "User wants to retrieve saved memories or notes by tag or timeframe",
    capabilities: [
      "Search memories by tag",
      "Filter by timeframe (this month, last week, etc.)",
      "Summarize matching entries"
    ],
    examples: [
      "Show memories tagged gifts",
      "What expenses did I tag dining this month?",
      "Recall notes tagged travel deals"
    ]
  },

  transfer_money_international: {
    name: "Transfer Money International",
    description: "User wants to send money internationally or transfer funds to a beneficiary abroad",
    capabilities: [
      "Navigate to beneficiary management screen",
      "Add international recipient/beneficiary",
      "Initiate international money transfer",
      "Monitor and trigger transfers at optimal rates",
      "Execute automated transfers ('Snipe & Settle' feature)",
      "Track transfer status and settlement times"
    ],
    examples: [
      "Send money to India",
      "Transfer funds abroad",
      "Add international recipient",
      "I want to send money internationally",
      "Snipe and settle",
      "Monitor for best FX rate"
    ]
  }
};

/**
 * Format intent definitions for GPT context
 */
export function formatIntentsForGPT() {
  const intents = Object.entries(INTENT_DEFINITIONS).map(([id, def]) => {
    return `**${def.name}** (${id}):
${def.description}
Capabilities: ${def.capabilities.join(', ')}
Examples: ${def.examples.slice(0, 3).join(' | ')}`;
  }).join('\n\n');

  return `Available Intents in the System:

${intents}

When the user's query matches one of these intents, you should respond accordingly. If the query is conversational or doesn't match a specific intent, respond naturally while being helpful.`;
}

/**
 * Get intent description by ID
 */
export function getIntentDescription(intentId) {
  return INTENT_DEFINITIONS[intentId] || null;
}
