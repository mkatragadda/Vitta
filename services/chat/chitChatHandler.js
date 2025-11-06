/**
 * Chit Chat Handler
 * Handles casual conversation, greetings, and small talk
 * Focus: Brief, friendly, natural responses
 */

/**
 * Handle chit-chat queries
 * @param {Array} cards - User's credit cards
 * @param {Object} entities - Extracted entities from query
 * @param {string} query - Original query
 * @returns {string} - Friendly response
 */
export const handleChitChat = (cards, entities, query) => {
  console.log('[ChitChatHandler] Handling casual conversation');

  const lowerQuery = query.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(lowerQuery)) {
    const responses = [
      "Hi there! I'm here to help you make the most of your credit cards. What can I do for you today?",
      "Hello! Ready to optimize your credit card strategy? Ask me anything!",
      "Hey! I'm Vitta, your credit card assistant. How can I help you today?",
      "Hi! Whether you need card recommendations or payment advice, I've got you covered. What's on your mind?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Thanks
  if (/thank|thanks|appreciate/.test(lowerQuery)) {
    const responses = [
      "You're welcome! Happy to help anytime. 😊",
      "My pleasure! Let me know if you need anything else.",
      "Glad I could help! Feel free to ask more questions.",
      "You're welcome! I'm here whenever you need me."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Affirmations (ok, got it, yes, etc.)
  if (/^(ok|okay|got it|understood|yes|yep|sure|alright|cool|great|awesome|perfect|nice)$/.test(lowerQuery)) {
    const responses = [
      "Great! Anything else I can help with?",
      "Perfect! Let me know if you have more questions.",
      "Awesome! I'm here if you need anything else.",
      "Cool! Feel free to ask if you need more help."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Goodbye
  if (/bye|goodbye|see you|talk to you later|have a good day/.test(lowerQuery)) {
    const responses = [
      "Goodbye! Come back anytime you need help with your cards.",
      "See you later! I'll be here whenever you need me.",
      "Take care! Don't hesitate to reach out if you have questions.",
      "Have a great day! I'm always here to help with your credit cards."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // How are you
  if (/how are you|how's it going|what's up/.test(lowerQuery)) {
    const responses = [
      "I'm doing great, thanks for asking! Ready to help you optimize your credit card strategy. What's on your mind?",
      "I'm here and ready to help! What can I do for you today?",
      "All good here! How can I assist you with your credit cards?",
      "Doing well! What would you like to know about your cards or payments?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Compliments
  if (/you're (great|helpful|awesome|amazing|the best)|nice job|good work|well done/.test(lowerQuery)) {
    const responses = [
      "Thank you! That means a lot. I'm here to make managing your credit cards easier. 😊",
      "Thanks! I'm glad I could help. Let me know if you need anything else!",
      "I appreciate that! Happy to be your credit card assistant. What else can I help with?",
      "Thank you! Making your financial life easier is what I'm here for. Anything else?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Nice to meet you
  if (/nice to meet you|pleasure to meet/.test(lowerQuery)) {
    return "Nice to meet you too! I'm Vitta, your personal credit card assistant. I can help you choose the best card for purchases, optimize payments, and manage your wallet. What would you like to start with?";
  }

  // Generic friendly response
  return "I'm here to help! You can ask me about:\n• Which card to use for purchases\n• Payment strategies and debt reduction\n• Card balances and due dates\n• Credit score tips\n\nWhat would you like to know?";
};

