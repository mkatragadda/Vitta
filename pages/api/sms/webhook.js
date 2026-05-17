/**
 * AgentPhone SMS Webhook Handler
 *
 * Receives incoming SMS messages from AgentPhone and processes them.
 *
 * Webhook payload example:
 * {
 *   "event": "message.received",
 *   "data": {
 *     "id": "msg_123",
 *     "conversation_id": "conv_abc",
 *     "from": "+1234567890",
 *     "to": "+0987654321",
 *     "body": "Send $500 to mom",
 *     "channel": "sms",
 *     "created_at": "2026-05-17T12:00:00Z"
 *   }
 * }
 */

const webhookVerifier = require('../../../services/agentphone/webhookVerifier');
const agentPhoneClient = require('../../../services/agentphone/agentphoneClient');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[SMS Webhook] Received webhook request');

  try {
    // Step 1: Verify webhook signature
    const isValid = webhookVerifier.verifyRequest(req);

    if (!isValid) {
      console.error('[SMS Webhook] Invalid signature - rejecting webhook');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('[SMS Webhook] Signature verified');

    // Step 2: Parse webhook payload
    const { event, data } = req.body;

    if (!event || !data) {
      console.error('[SMS Webhook] Invalid payload structure');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Step 3: Handle different event types
    switch (event) {
      case 'message.received':
        await handleIncomingMessage(data);
        break;

      case 'message.sent':
        console.log('[SMS Webhook] Message sent confirmation:', data.id);
        break;

      case 'message.failed':
        console.error('[SMS Webhook] Message failed:', data.id, data.error);
        break;

      default:
        console.log('[SMS Webhook] Unhandled event type:', event);
    }

    // Step 4: Log webhook to database
    await logWebhook(event, data, req.headers);

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[SMS Webhook] Error processing webhook:', error);

    // Still return 200 to prevent AgentPhone retries
    // (we've logged the error for debugging)
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle incoming SMS message
 */
async function handleIncomingMessage(messageData) {
  const {
    id: messageId,
    conversation_id: conversationId,
    from: phoneNumber,
    body: messageBody,
    created_at: timestamp
  } = messageData;

  console.log('[SMS Webhook] Processing message from', phoneNumber);
  console.log('[SMS Webhook] Message:', messageBody);

  // Step 1: Find user by phone number
  const { data: phoneRecord, error: phoneError } = await supabase
    .from('user_phone_numbers')
    .select('user_id, is_verified')
    .eq('phone_number', phoneNumber)
    .eq('is_active', true)
    .single();

  if (phoneError || !phoneRecord) {
    console.log('[SMS Webhook] Unknown phone number:', phoneNumber);
    await sendWelcomeMessage(phoneNumber, conversationId);
    return;
  }

  if (!phoneRecord.is_verified) {
    console.log('[SMS Webhook] Unverified phone number:', phoneNumber);
    await sendVerificationMessage(phoneNumber, conversationId);
    return;
  }

  const userId = phoneRecord.user_id;

  // Step 2: Log message to database
  await logMessage({
    conversationId,
    userId,
    direction: 'inbound',
    phoneNumber,
    messageBody,
    agentphoneMessageId: messageId,
    agentphoneConversationId: conversationId,
    channel: 'sms'
  });

  // Step 3: Process message intent
  // For Phase 1, just echo back a confirmation
  const responseMessage = `✅ Message received: "${messageBody}"\n\n` +
    `SMS integration is active! Intent parsing coming in Phase 2.\n\n` +
    `Your user ID: ${userId.substring(0, 8)}...`;

  await agentPhoneClient.sendMessage(
    phoneNumber,
    responseMessage,
    conversationId
  );

  // Log outbound message
  await logMessage({
    conversationId,
    userId,
    direction: 'outbound',
    phoneNumber,
    messageBody: responseMessage,
    agentphoneConversationId: conversationId,
    channel: 'sms',
    status: 'sent'
  });
}

/**
 * Send welcome message to unknown phone number
 */
async function sendWelcomeMessage(phoneNumber, conversationId) {
  const message =
    `👋 Welcome to Vitta!\n\n` +
    `This phone number is not linked to a Vitta account.\n\n` +
    `To use SMS transfers, please:\n` +
    `1. Sign in to Vitta web app\n` +
    `2. Go to Settings\n` +
    `3. Add and verify this phone number\n\n` +
    `Need help? Visit vitta.app`;

  await agentPhoneClient.sendMessage(phoneNumber, message, conversationId);

  await logMessage({
    direction: 'outbound',
    phoneNumber,
    messageBody: message,
    agentphoneConversationId: conversationId,
    channel: 'sms',
    status: 'sent'
  });
}

/**
 * Send verification reminder message
 */
async function sendVerificationMessage(phoneNumber, conversationId) {
  const message =
    `⚠️ Phone number not verified\n\n` +
    `Please verify your phone number in the Vitta app before using SMS transfers.\n\n` +
    `Settings → Phone Numbers → Verify`;

  await agentPhoneClient.sendMessage(phoneNumber, message, conversationId);
}

/**
 * Log message to database
 */
async function logMessage(messageData) {
  const {
    conversationId,
    userId,
    direction,
    phoneNumber,
    messageBody,
    agentphoneMessageId,
    agentphoneConversationId,
    channel,
    status,
    errorMessage
  } = messageData;

  try {
    const { error } = await supabase
      .from('sms_messages_log')
      .insert({
        conversation_id: conversationId || null,
        user_id: userId || null,
        direction,
        phone_number: phoneNumber,
        message_body: messageBody,
        agentphone_message_id: agentphoneMessageId || null,
        agentphone_conversation_id: agentphoneConversationId || null,
        channel: channel || 'sms',
        status: status || null,
        error_message: errorMessage || null
      });

    if (error) {
      console.error('[SMS Webhook] Failed to log message:', error);
    }
  } catch (err) {
    console.error('[SMS Webhook] Error logging message:', err);
  }
}

/**
 * Log webhook event to database
 */
async function logWebhook(event, data, headers) {
  try {
    // Extract relevant data for logging
    const logEntry = {
      direction: 'inbound',
      phone_number: data.from || data.to || 'unknown',
      message_body: `[Webhook Event: ${event}]`,
      agentphone_message_id: data.id || null,
      agentphone_conversation_id: data.conversation_id || null,
      channel: data.channel || 'sms',
      webhook_signature: headers['x-webhook-signature'] || null,
      webhook_timestamp: headers['x-webhook-timestamp']
        ? parseInt(headers['x-webhook-timestamp'], 10)
        : null
    };

    const { error } = await supabase
      .from('sms_messages_log')
      .insert(logEntry);

    if (error) {
      console.error('[SMS Webhook] Failed to log webhook:', error);
    }
  } catch (err) {
    console.error('[SMS Webhook] Error logging webhook:', err);
  }
}

/**
 * Custom body parser configuration for Next.js
 * We need the raw body for signature verification
 */
export const config = {
  api: {
    bodyParser: true // Next.js will parse JSON, but we can still verify signature
  }
};
