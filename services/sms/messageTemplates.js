/**
 * SMS Message Templates
 * All outbound SMS strings in one place for easy editing.
 */

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://app.getvitta.com';

/**
 * Sent after a pending transfer is created — includes the confirmation link.
 *
 * @param {Object} transfer - pending_sms_transfers row joined with wise_recipient
 * @param {string} confirmURL - full confirmation URL (e.g. https://app.getvitta.com/transfer/confirm/xYz9K)
 */
function buildTransferReadyMessage(transfer, confirmURL) {
  const { source_amount, source_currency = 'USD', wise_recipient } = transfer;
  const recipientName = wise_recipient.account_holder_name;
  const accountHint = wise_recipient.upi_id
    ? `UPI ****${wise_recipient.upi_id.slice(-4)}`
    : wise_recipient.account_number
      ? `****${String(wise_recipient.account_number).slice(-4)}`
      : wise_recipient.type || 'Bank Account';

  return (
    `💰 Transfer Ready\n\n` +
    `Amount: $${Number(source_amount).toFixed(2)} ${source_currency}\n` +
    `To: ${recipientName}\n` +
    `Account: ${accountHint}\n\n` +
    `Tap to review & confirm:\n` +
    `👉 ${confirmURL}\n\n` +
    `Link expires in 15 minutes`
  );
}

/**
 * Sent after the transfer is successfully executed.
 *
 * @param {Object} transfer - pending_sms_transfers row joined with wise_recipient
 * @param {string} reference - WISE transfer reference number
 */
function buildTransferCompleteMessage(transfer, reference) {
  const { source_amount, source_currency = 'USD', wise_recipient } = transfer;
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    `✅ Transfer Complete!\n\n` +
    `$${Number(source_amount).toFixed(2)} ${source_currency} sent to ${wise_recipient.account_holder_name}\n` +
    `Reference: ${reference}\n` +
    `Time: ${time}\n\n` +
    `View receipt: ${APP_URL()}/receipt/${transfer.id}`
  );
}

/**
 * Sent when multiple recipients match and the user must choose.
 *
 * @param {Object[]} matches - wise_recipients rows
 * @param {string} query - the original recipient string the user typed
 */
function buildDisambiguationMessage(matches, query) {
  const options = matches
    .map((m, i) => `${i + 1}. ${m.account_holder_name}`)
    .join('\n');

  return (
    `I found ${matches.length} contacts named "${query}":\n\n` +
    `${options}\n\n` +
    `Reply with the number to select.`
  );
}

/**
 * Sent when no recipient is found.
 *
 * @param {string} name - the recipient string the user typed
 */
function buildRecipientNotFoundMessage(name) {
  return (
    `❌ Couldn't find "${name}".\n\n` +
    `Add them in the Vitta app first:\n` +
    `👉 ${APP_URL()}/recipients`
  );
}

/**
 * Sent when a transfer is cancelled.
 */
function buildCancellationMessage() {
  return '❌ Transfer cancelled. Let me know if you need anything else.';
}

/**
 * Sent for unknown/unrecognised messages.
 */
function buildUnknownMessage() {
  return (
    `🤔 I didn't understand that.\n\n` +
    `Try: "Send $100 to mom"\n` +
    `Or reply "help" for commands.`
  );
}

/**
 * Sent in response to "help".
 */
function buildHelpMessage() {
  return (
    `💡 Vitta SMS Commands:\n\n` +
    `• "Send $500 to mom" — initiate a transfer\n` +
    `• "Cancel" — cancel current transfer\n\n` +
    `Tip: Add recipients in the Vitta app first.`
  );
}

module.exports = {
  buildTransferReadyMessage,
  buildTransferCompleteMessage,
  buildDisambiguationMessage,
  buildRecipientNotFoundMessage,
  buildCancellationMessage,
  buildUnknownMessage,
  buildHelpMessage
};
