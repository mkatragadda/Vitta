/**
 * Reminder Planner
 * Baseline scheduling logic for payment reminders (rule-based foundation).
 *
 * Responsibilities:
 *  - Inspect upcoming payment obligations per card
 *  - Generate a small set of reminder candidates (pre-due, day-of, post-due)
 *  - Respect quiet hours & user-configurable options
 *  - Avoid duplicating reminders that would fire in the past
 *
 * NOTE: This module is intentionally stateless. Persistence and delivery
 *       orchestration happen in reminderService / reminderScheduler.
 */

import { getUpcomingPayments } from '../../utils/paymentCycleUtils.js';

export const REMINDER_TYPES = {
  PAYMENT_DUE: 'payment_due',
  MINIMUM_DUE: 'minimum_due',
  UTILIZATION: 'utilization_alert'
};

export const REMINDER_STATUS = {
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  ACKNOWLEDGED: 'acknowledged',
  SNOOZED: 'snoozed',
  CANCELLED: 'cancelled',
  MUTED: 'muted'
};

/**
 * Default planner options.
 */
const DEFAULT_OPTIONS = {
  today: new Date(),
  lookAheadDays: 30,
  preDueOffsets: [-7, -3, 0],
  postDueOffsets: [1],
  defaultHour: 9,              // 9 AM local time
  fallbackHour: 10,            // If we slide because of quiet hours
  quietHours: { start: 21, end: 8 }, // 9PM - 8AM
  timezone: 'UTC',
  channelPreferences: ['in_app'],
  includeUrgencyEmoji: true
};

/**
 * Add days to a Date (without mutating original).
 */
const addDays = (date, delta) => {
  const base = new Date(date);
  base.setDate(base.getDate() + delta);
  return base;
};

/**
 * Clamp the reminder timestamp to outside quiet hours.
 * If target time falls within quiet hours, shift to quietHours.end on the same day,
 * or the next day if necessary.
 */
const applyQuietHours = (date, quietHours, fallbackHour) => {
  if (!quietHours) return date;

  const result = new Date(date);
  const hour = result.getHours();

  const start = quietHours.start ?? 21;
  const end = quietHours.end ?? 8;

  if (start === end) {
    // Quiet hours disabled (same start & end)
    return result;
  }

  // Quiet window that spans midnight (e.g. 21 -> 8)
  if (start > end) {
    if (hour >= start || hour < end) {
      if (hour >= start) {
        // Move to next day at end hour
        result.setDate(result.getDate() + 1);
      }
      result.setHours(end, 0, 0, 0);
    }
    return result;
  }

  // Quiet window within same day (e.g. 22 -> 6)
  if (hour >= start && hour < end) {
    result.setHours(end, 0, 0, 0);
    return result;
  }

  // Fallback if we somehow land in quiet hours after adjustments
  if (result.getHours() === hour && (hour >= start && hour < end)) {
    result.setHours(fallbackHour ?? end, 0, 0, 0);
  }

  return result;
};

/**
 * Normalize reminder object for downstream persistence.
 */
const buildReminder = ({
  userId,
  card,
  payment,
  type,
  targetDate,
  leadTimeDays,
  channelPreferences,
  priority,
  includeUrgencyEmoji
}) => {
  const reminderId = `${card.id || card.card_id || 'card'}-${type}-${targetDate.getTime()}`;

  const payload = {
    cardNickname: card.nickname || card.card_name || card.card_type || 'Card',
    dueDate: payment.paymentDueDate?.toISOString() || null,
    amountDue: payment.amount ?? card.amount_to_pay ?? card.current_balance ?? 0,
    daysUntilDue: payment.daysUntilDue,
    urgency: payment.isOverdue ? 'overdue' : payment.isUrgent ? 'soon' : 'normal',
    urgencyEmoji: includeUrgencyEmoji
      ? payment.isOverdue
        ? '🔴'
        : payment.isUrgent
          ? '🟡'
          : '🟢'
      : undefined
  };

  return {
    id: reminderId,
    user_id: userId,
    card_id: card.id || card.card_id || null,
    reminder_type: type,
    trigger_date: payment.paymentDueDate ? payment.paymentDueDate.toISOString().slice(0, 10) : null,
    target_datetime: targetDate.toISOString(),
    lead_time_days: leadTimeDays,
    channel: channelPreferences,
    status: REMINDER_STATUS.SCHEDULED,
    priority,
    payload
  };
};

/**
 * Generate reminder candidates for upcoming payments.
 *
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {Array<Object>} params.cards - Array of card objects with payment metadata
 * @param {Object} params.options - Planner options
 * @returns {Array<Object>} Reminder objects ready for persistence
 */
export const generateBaselineReminderPlan = ({
  userId,
  cards = [],
  options = {}
}) => {
  if (!userId) {
    throw new Error('userId is required to generate reminders');
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const {
    today,
    lookAheadDays,
    preDueOffsets,
    postDueOffsets,
    defaultHour,
    quietHours,
    channelPreferences,
    includeUrgencyEmoji
  } = mergedOptions;

  const now = new Date(today);
  now.setHours(0, 0, 0, 0);

  const payments = getUpcomingPayments(cards, lookAheadDays, now);

  const reminders = [];

  payments.forEach((payment, index) => {
    const card = payment.card || {};
    const dueDate = new Date(payment.paymentDueDate);
    dueDate.setHours(0, 0, 0, 0);

    const offsets = [...preDueOffsets];

    // Only add post-due offsets if payment is overdue or today
    if (payment.isOverdue || payment.daysUntilDue === 0) {
      postDueOffsets.forEach(offset => offsets.push(offset));
    }

    offsets.forEach(offset => {
      const targetDate = addDays(dueDate, offset);

      // Skip if scheduled time would have been before today (and not a post-due)
      if (offset < 0 && targetDate < now) {
        return;
      }

      // For post-due offsets, ensure we only schedule future notifications
      if (offset >= 0) {
        const earliest = new Date(now);
        earliest.setHours(0, 0, 0, 0);
        if (targetDate < earliest) {
          return;
        }
      }

      // Set default hour
      targetDate.setHours(defaultHour, 0, 0, 0);

      const adjustedDate = applyQuietHours(targetDate, quietHours, mergedOptions.fallbackHour);

      const priority = Math.max(0, 100 - offset * 10) + (payment.isOverdue ? 50 : 0) + (index > 0 ? -index : 0);

      reminders.push(
        buildReminder({
          userId,
          card,
          payment,
          type: REMINDER_TYPES.PAYMENT_DUE,
          targetDate: adjustedDate,
          leadTimeDays: offset,
          channelPreferences,
          priority,
          includeUrgencyEmoji
        })
      );
    });
  });

  // Sort by target datetime ascending for deterministic order
  reminders.sort((a, b) => new Date(a.target_datetime) - new Date(b.target_datetime));

  return reminders;
};

/**
 * Filter reminder candidates against existing scheduled reminders.
 * Prevents duplicates when the planner runs multiple times per day.
 */
export const filterExistingReminders = (candidates = [], existingReminders = [], toleranceMinutes = 60) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  if (!Array.isArray(existingReminders) || existingReminders.length === 0) return candidates;

  const existingIndex = existingReminders.reduce((map, reminder) => {
    const key = `${reminder.card_id || 'card'}-${reminder.reminder_type}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(reminder);
    return map;
  }, new Map());

  return candidates.filter(candidate => {
    const key = `${candidate.card_id || 'card'}-${candidate.reminder_type}`;
    const matches = existingIndex.get(key);
    if (!matches || matches.length === 0) return true;

    const candidateTime = new Date(candidate.target_datetime).getTime();
    return matches.every(existing => {
      const diff = Math.abs(new Date(existing.target_datetime).getTime() - candidateTime);
      return diff > toleranceMinutes * 60 * 1000;
    });
  });
};

/**
 * Summarize reminders for UI widgets.
 */
export const summarizeReminderPlan = (reminders = []) => {
  const upcoming = reminders
    .filter(r => new Date(r.target_datetime) >= new Date())
    .sort((a, b) => new Date(a.target_datetime) - new Date(b.target_datetime));

  const grouped = upcoming.reduce((acc, reminder) => {
    const key = reminder.card_id || reminder.payload?.cardNickname || 'card';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(reminder);
    return acc;
  }, {});

  return {
    totalUpcoming: upcoming.length,
    byCard: grouped,
    nextReminder: upcoming[0] || null
  };
};

export default {
  REMINDER_TYPES,
  REMINDER_STATUS,
  generateBaselineReminderPlan,
  filterExistingReminders,
  summarizeReminderPlan
};



