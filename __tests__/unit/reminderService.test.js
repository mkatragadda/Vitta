import {
  upsertReminders,
  listReminders,
  updateReminderStatus,
  snoozeReminder,
  muteReminders,
  deleteReminder,
  __clearInMemoryStore
} from '../../services/reminders/reminderService.js';
import { REMINDER_STATUS } from '../../services/reminders/reminderPlanner.js';

const buildReminder = (overrides = {}) => ({
  id: overrides.id || `rem-${Math.random().toString(36).slice(2, 8)}`,
  user_id: overrides.user_id || 'user-123',
  card_id: overrides.card_id || 'card-1',
  reminder_type: overrides.reminder_type || 'payment_due',
  trigger_date: overrides.trigger_date || '2025-11-20',
  target_datetime: overrides.target_datetime || new Date('2025-11-17T09:00:00.000Z').toISOString(),
  lead_time_days: overrides.lead_time_days ?? -3,
  channel: overrides.channel || ['in_app'],
  status: overrides.status || REMINDER_STATUS.SCHEDULED,
  payload: overrides.payload || { cardNickname: 'Test Card' }
});

beforeEach(() => {
  __clearInMemoryStore();
});

describe('Reminder Service - In-memory fallback', () => {
  test('upsertReminders stores reminders and returns sorted list', async () => {
    const reminderA = buildReminder({ id: 'rem-A', target_datetime: new Date('2025-11-17T09:00:00Z').toISOString() });
    const reminderB = buildReminder({ id: 'rem-B', target_datetime: new Date('2025-11-16T09:00:00Z').toISOString() });

    const stored = await upsertReminders('user-123', [reminderA, reminderB]);
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe('rem-B'); // earlier date first
  });

  test('listReminders filters by time window and status', async () => {
    const r1 = buildReminder({
      id: 'rem-early',
      target_datetime: new Date('2025-11-15T09:00:00Z').toISOString()
    });
    const r2 = buildReminder({
      id: 'rem-late',
      target_datetime: new Date('2025-11-30T09:00:00Z').toISOString()
    });

    await upsertReminders('user-123', [r1, r2]);

    const start = new Date('2025-11-20T00:00:00Z');
    const end = new Date('2025-12-01T00:00:00Z');

    const filtered = await listReminders({
      userId: 'user-123',
      start,
      end
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('rem-late');
  });

  test('muteReminders marks subsequent reminders as muted', async () => {
    await muteReminders({ userId: 'user-123', cardId: 'card-muted', durationDays: 3 });

    const reminder = buildReminder({
      id: 'rem-muted',
      card_id: 'card-muted',
      target_datetime: new Date('2025-11-18T09:00:00Z').toISOString()
    });

    const stored = await upsertReminders('user-123', [reminder]);
    const mutedReminder = stored.find(r => r.id === 'rem-muted');

    expect(mutedReminder.status).toBe(REMINDER_STATUS.MUTED);
  });

  test('updateReminderStatus and snoozeReminder mutate stored reminder', async () => {
    const reminder = buildReminder({ id: 'rem-update' });
    await upsertReminders('user-123', [reminder]);

    const updated = await updateReminderStatus('rem-update', REMINDER_STATUS.ACKNOWLEDGED);
    expect(updated.status).toBe(REMINDER_STATUS.ACKNOWLEDGED);

    const snoozedUntil = new Date('2025-11-19T12:00:00Z');
    const snoozed = await snoozeReminder('rem-update', snoozedUntil);
    expect(new Date(snoozed.target_datetime).getUTCDate()).toBe(19);
    expect(snoozed.status).toBe(REMINDER_STATUS.SNOOZED);
  });

  test('deleteReminder removes reminder from store', async () => {
    const reminder = buildReminder({ id: 'rem-delete' });
    await upsertReminders('user-123', [reminder]);

    await deleteReminder('rem-delete');
    const remaining = await listReminders({ userId: 'user-123' });
    expect(remaining.find(r => r.id === 'rem-delete')).toBeUndefined();
  });
});



