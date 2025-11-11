/**
 * Reminder Service
 * Handles persistence and state transitions for reminder objects.
 *
 * Architecture notes:
 *  - Supports Supabase persistence when configured
 *  - Falls back to in-memory store for local/demo usage
 *  - Designed for batch upserts from the planner
 */

import { supabase, isSupabaseConfigured } from '../../config/supabase.js';
import { REMINDER_STATUS } from './reminderPlanner.js';

const IN_MEMORY_STORE = new Map(); // Map<userId, Reminder[]>
const IN_MEMORY_MUTES = new Map(); // Map<userId|userId:cardId, Date>

const MAX_BATCH_SIZE = 50;

const generateId = () => (
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `rem-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const normalizeReminder = (reminder) => {
  const nowIso = new Date().toISOString();
  return {
    id: reminder.id || generateId(),
    user_id: reminder.user_id,
    card_id: reminder.card_id ?? null,
    reminder_type: reminder.reminder_type ?? 'payment_due',
    trigger_date: reminder.trigger_date ?? nowIso.slice(0, 10),
    target_datetime: reminder.target_datetime ?? nowIso,
    lead_time_days: reminder.lead_time_days ?? 0,
    channel: reminder.channel ?? ['in_app'],
    status: reminder.status ?? REMINDER_STATUS.SCHEDULED,
    priority: reminder.priority ?? 0,
    payload: reminder.payload ?? {},
    muted_until: reminder.muted_until ?? null
  };
};

const isMuted = (userId, cardId, referenceDate = new Date()) => {
  const globalKey = `${userId}:global`;
  const cardKey = `${userId}:${cardId || 'default'}`;

  const globalMute = IN_MEMORY_MUTES.get(globalKey);
  if (globalMute && globalMute > referenceDate) return true;

  const cardMute = IN_MEMORY_MUTES.get(cardKey);
  if (cardMute && cardMute > referenceDate) return true;

  return false;
};

const applyMute = async ({ userId, cardId = null, until }) => {
  const key = cardId ? `${userId}:${cardId}` : `${userId}:global`;

  if (!until) {
    IN_MEMORY_MUTES.delete(key);
  } else {
    IN_MEMORY_MUTES.set(key, new Date(until));
  }

  if (!isSupabaseConfigured()) {
    return { userId, cardId, mutedUntil: until ? new Date(until) : null };
  }

  const payload = {
    user_id: userId,
    card_id: cardId,
    muted_until: until
  };

  const { data, error } = await supabase
    .from('reminders')
    .update({ muted_until: until })
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .eq('status', REMINDER_STATUS.SCHEDULED);

  if (error) {
    console.error('[ReminderService] Failed to apply mute:', error);
    throw error;
  }

  return payload;
};

/**
 * Bulk upsert reminder candidates.
 */
export const upsertReminders = async (userId, reminders = []) => {
  if (!userId) {
    throw new Error('userId is required to upsert reminders');
  }

  if (!Array.isArray(reminders) || reminders.length === 0) return [];

  const normalized = reminders.slice(0, MAX_BATCH_SIZE).map(normalizeReminder);

  if (!isSupabaseConfigured()) {
    const existing = IN_MEMORY_STORE.get(userId) || [];
    const mergedMap = new Map(existing.map(r => [r.id, r]));

    normalized.forEach(reminder => {
      if (isMuted(userId, reminder.card_id)) {
        reminder.status = REMINDER_STATUS.MUTED;
      }
      mergedMap.set(reminder.id, reminder);
    });

    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(a.target_datetime) - new Date(b.target_datetime)
    );

    IN_MEMORY_STORE.set(userId, merged);
    return merged;
  }

  const cleanPayload = normalized.map(({ channel, payload, ...rest }) => ({
    ...rest,
    channel,
    payload
  }));

  const { data, error } = await supabase
    .from('reminders')
    .upsert(cleanPayload, { onConflict: 'id' })
    .select('*');

  if (error) {
    console.error('[ReminderService] Failed to upsert reminders:', error);
    throw error;
  }

  return data || [];
};

/**
 * List scheduled reminders (optionally within a time window).
 */
export const listReminders = async ({
  userId,
  start = null,
  end = null,
  statuses = [REMINDER_STATUS.SCHEDULED],
  limit = 100
}) => {
  if (!userId) {
    throw new Error('userId is required to list reminders');
  }

  if (!isSupabaseConfigured()) {
    const reminders = IN_MEMORY_STORE.get(userId) || [];
    return reminders.filter(reminder => {
      const target = new Date(reminder.target_datetime);
      if (statuses.length && !statuses.includes(reminder.status)) {
        return false;
      }
      if (start && target < start) return false;
      if (end && target > end) return false;
      return true;
    }).slice(0, limit);
  }

  let query = supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .in('status', statuses)
    .order('target_datetime', { ascending: true })
    .limit(limit);

  if (start) {
    query = query.gte('target_datetime', start.toISOString());
  }

  if (end) {
    query = query.lte('target_datetime', end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ReminderService] Failed to list reminders:', error);
    throw error;
  }

  return data || [];
};

/**
 * Update reminder status (e.g., mark as sent, snoozed, acknowledged).
 */
export const updateReminderStatus = async (reminderId, status, updates = {}) => {
  if (!reminderId) throw new Error('reminderId is required');
  if (!status) throw new Error('status is required');

  if (!isSupabaseConfigured()) {
    for (const [userId, reminders] of IN_MEMORY_STORE.entries()) {
      const index = reminders.findIndex(r => r.id === reminderId);
      if (index !== -1) {
        const updated = { ...reminders[index], status, ...updates };
        reminders[index] = updated;
        IN_MEMORY_STORE.set(userId, [...reminders]);
        return updated;
      }
    }
    return null;
  }

  const { data, error } = await supabase
    .from('reminders')
    .update({ status, ...updates })
    .eq('id', reminderId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[ReminderService] Failed to update reminder status:', error);
    throw error;
  }

  return data;
};

/**
 * Snooze reminder by shifting the target datetime.
 */
export const snoozeReminder = async (reminderId, snoozeUntil) => {
  if (!reminderId) throw new Error('reminderId is required');
  if (!snoozeUntil) throw new Error('snoozeUntil is required');

  const newDate = new Date(snoozeUntil);

  return updateReminderStatus(reminderId, REMINDER_STATUS.SNOOZED, {
    target_datetime: newDate.toISOString()
  });
};

/**
 * Hard delete a reminder (used when payment is cleared).
 */
export const deleteReminder = async (reminderId) => {
  if (!reminderId) throw new Error('reminderId is required');

  if (!isSupabaseConfigured()) {
    for (const [userId, reminders] of IN_MEMORY_STORE.entries()) {
      const filtered = reminders.filter(r => r.id !== reminderId);
      IN_MEMORY_STORE.set(userId, filtered);
    }
    return { id: reminderId };
  }

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId);

  if (error) {
    console.error('[ReminderService] Failed to delete reminder:', error);
    throw error;
  }

  return { id: reminderId };
};

/**
 * Public API to mute reminders.
 */
export const muteReminders = async ({ userId, cardId = null, durationDays = null }) => {
  if (!userId) throw new Error('userId is required');

  let until = null;
  if (durationDays != null) {
    const date = new Date();
    date.setDate(date.getDate() + durationDays);
    until = date.toISOString();
  }

  return applyMute({ userId, cardId, until });
};

/**
 * Clear in-memory state (for tests).
 */
export const __clearInMemoryStore = () => {
  IN_MEMORY_STORE.clear();
  IN_MEMORY_MUTES.clear();
};

export default {
  upsertReminders,
  listReminders,
  updateReminderStatus,
  snoozeReminder,
  deleteReminder,
  muteReminders,
  __clearInMemoryStore
};


