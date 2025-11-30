import { isSupabaseConfigured, supabase } from '../../config/supabase.js';
import { getUserCards } from '../cardService.js';
import {
  generateBaselineReminderPlan,
  filterExistingReminders
} from './reminderPlanner.js';
import {
  listReminders,
  upsertReminders
} from './reminderService.js';

const dedupeUserIds = (rows = []) => {
  const set = new Set();
  rows.forEach((row) => {
    const userId = row?.user_id;
    if (userId) {
      set.add(userId);
    }
  });
  return Array.from(set);
};

export const fetchReminderEligibleUsers = async () => {
  if (!isSupabaseConfigured()) {
    console.warn('[ReminderRunner] Supabase not configured. No users to process.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_credit_cards')
      .select('user_id')
      .neq('user_id', null);

    if (error) {
      console.error('[ReminderRunner] Failed to fetch reminder-eligible users:', error);
      return [];
    }

    return dedupeUserIds(data);
  } catch (error) {
    console.error('[ReminderRunner] Unexpected error fetching users:', error);
    return [];
  }
};

export const planRemindersForUser = async (userId, options = {}) => {
  if (!userId) {
    throw new Error('userId is required to plan reminders');
  }

  const cards = await getUserCards(userId);
  if (!cards || cards.length === 0) {
    return {
      userId,
      created: 0,
      skipped: true,
      reason: 'no_cards'
    };
  }

  const baselinePlan = generateBaselineReminderPlan({
    userId,
    cards,
    options
  });

  let existingReminders = [];
  if (isSupabaseConfigured()) {
    existingReminders = await listReminders({ userId });
  }

  const candidates = filterExistingReminders(baselinePlan, existingReminders);

  if (!candidates.length) {
    return {
      userId,
      created: 0,
      skipped: true,
      reason: 'no_new_candidates'
    };
  }

  await upsertReminders(userId, candidates);

  return {
    userId,
    created: candidates.length,
    skipped: false
  };
};

export const planRemindersForUsers = async (userIds = [], options = {}) => {
  const results = [];

  for (const userId of userIds) {
    try {
      const result = await planRemindersForUser(userId, options);
      results.push({ ok: true, ...result });
    } catch (error) {
      console.error('[ReminderRunner] Failed to plan reminders for user:', userId, error);
      results.push({
        ok: false,
        userId,
        error: error?.message || 'unknown_error'
      });
    }
  }

  return results;
};

export default {
  fetchReminderEligibleUsers,
  planRemindersForUser,
  planRemindersForUsers
};





