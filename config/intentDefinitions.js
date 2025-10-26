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
