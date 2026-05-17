/**
 * SMS Intent Parser
 *
 * Parses natural language SMS messages into structured intents and entities.
 * Supports: transfer_money, confirmation, cancellation, disambiguation_response, unknown
 */

const PATTERNS = {
  transfer_money: [
    // "send $500 to mom" / "send 500 to mom"
    /^send\s+\$?(\d+(?:\.\d{1,2})?)\s+to\s+(.+)$/i,
    // "pay mom $500" / "pay mom 500"
    /^pay\s+(.+?)\s+\$?(\d+(?:\.\d{1,2})?)$/i,
    // "transfer $500 to mom" / "transfer $500 mom"
    /^transfer\s+\$?(\d+(?:\.\d{1,2})?)\s+(?:to\s+)?(.+)$/i,
    // "send mom $500"
    /^send\s+(.+?)\s+\$?(\d+(?:\.\d{1,2})?)$/i,
  ],

  // Single digit for disambiguation (reply "1", "2", etc.)
  number_selection: /^([1-9])\s*$/,

  confirmation: /^(yes|yeah|yep|ok|okay|confirm|proceed|sure|go ahead|do it)$/i,

  cancellation: /^(no|nope|cancel|stop|nevermind|never mind|abort|quit)$/i,

  // "balance", "help", "list"
  help: /^(help|commands|what can you do|\?)$/i,
  balance: /^(balance|my balance|check balance|how much)$/i,
};

/**
 * Parse an SMS message into a structured intent object.
 *
 * @param {string} message - Raw SMS message body
 * @param {Object} conversationState - Current conversation state from sms_conversations
 * @returns {{ intent: string, confidence: number, entities: Object }}
 */
function parseIntent(message, conversationState = {}) {
  const msg = message.trim();

  // --- Transfer money ---
  const [sendAmountTo, payRecipientAmount, transferAmountTo, sendRecipientAmount] = PATTERNS.transfer_money;

  let match;

  // "send $500 to mom"
  match = msg.match(sendAmountTo);
  if (match) {
    return buildTransferIntent(match[1], match[2]);
  }

  // "pay mom $500"
  match = msg.match(payRecipientAmount);
  if (match) {
    return buildTransferIntent(match[2], match[1]);
  }

  // "transfer $500 to mom"
  match = msg.match(transferAmountTo);
  if (match) {
    return buildTransferIntent(match[1], match[2]);
  }

  // "send mom $500"
  match = msg.match(sendRecipientAmount);
  if (match) {
    return buildTransferIntent(match[2], match[1]);
  }

  // --- Disambiguation response (only valid when awaiting) ---
  if (conversationState.state === 'awaiting_disambiguation') {
    match = msg.match(PATTERNS.number_selection);
    if (match) {
      return {
        intent: 'disambiguation_response',
        confidence: 1.0,
        entities: { selection: parseInt(match[1], 10) }
      };
    }
  }

  // --- Confirmation / Cancellation ---
  if (PATTERNS.confirmation.test(msg)) {
    return { intent: 'confirmation', confidence: 1.0, entities: {} };
  }

  if (PATTERNS.cancellation.test(msg)) {
    return { intent: 'cancellation', confidence: 1.0, entities: {} };
  }

  // --- Utility intents ---
  if (PATTERNS.help.test(msg)) {
    return { intent: 'help', confidence: 1.0, entities: {} };
  }

  if (PATTERNS.balance.test(msg)) {
    return { intent: 'balance', confidence: 1.0, entities: {} };
  }

  return { intent: 'unknown', confidence: 0.0, entities: {} };
}

function buildTransferIntent(rawAmount, rawRecipient) {
  const amount = parseFloat(rawAmount);
  const recipient = rawRecipient.trim().toLowerCase();

  if (isNaN(amount) || amount <= 0) {
    return { intent: 'unknown', confidence: 0.0, entities: {} };
  }

  return {
    intent: 'transfer_money',
    confidence: 0.95,
    entities: {
      amount: { value: amount, currency: 'USD', raw: rawAmount },
      recipient: { value: recipient, raw: rawRecipient.trim() }
    }
  };
}

module.exports = { parseIntent };
