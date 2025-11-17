import {
  generateBaselineReminderPlan,
  filterExistingReminders,
  summarizeReminderPlan,
  REMINDER_STATUS
} from '../../services/reminders/reminderPlanner.js';

const buildCard = ({
  id,
  nickname,
  statementCloseDay,
  paymentDueDay,
  balance = 1000,
  amountToPay = 1000
}) => ({
  id,
  nickname,
  statement_close_day: statementCloseDay,
  payment_due_day: paymentDueDay,
  current_balance: balance,
  amount_to_pay: amountToPay
});

describe('Reminder Planner - Baseline Schedule', () => {
  const today = new Date('2025-11-10T00:00:00Z');

  test('generates pre-due reminders at -7/-3/0 for upcoming payment', () => {
    const cards = [
      buildCard({
        id: 'card-1',
        nickname: 'Citi Master',
        statementCloseDay: 25,
        paymentDueDay: 20
      })
    ];

    const reminders = generateBaselineReminderPlan({
      userId: 'user-123',
      cards,
      options: {
        today,
        quietHours: null, // deterministic times for test
        preDueOffsets: [-7, -3, 0],
        postDueOffsets: [1],
        defaultHour: 9
      }
    });

    expect(reminders).toHaveLength(3);
    expect(reminders.map(r => r.lead_time_days)).toEqual([-7, -3, 0]);
    const first = new Date(reminders[0].target_datetime);
    expect(first.getUTCFullYear()).toBe(2025);
    expect(first.getUTCMonth()).toBe(10); // November (0-indexed)
    expect(first.getUTCDate()).toBe(13);
    expect(reminders.every(r => r.status === REMINDER_STATUS.SCHEDULED)).toBe(true);
  });

  test('includes day-of and post-due reminder when payment is due today', () => {
    const cards = [
      buildCard({
        id: 'card-2',
        nickname: 'Bofa Travel',
        statementCloseDay: 25,
        paymentDueDay: 10
      })
    ];

    const reminders = generateBaselineReminderPlan({
      userId: 'user-123',
      cards,
      options: {
        today,
        quietHours: null,
        preDueOffsets: [-3, 0],
        postDueOffsets: [1],
        defaultHour: 8
      }
    });

    // -3 (Nov 7) should be filtered because it's in the past; expect day-of + post-due
    expect(reminders).toHaveLength(2);
    expect(reminders.map(r => r.lead_time_days)).toEqual([0, 1]);
    const dayOf = new Date(reminders[0].target_datetime);
    const postDue = new Date(reminders[1].target_datetime);
    expect(dayOf.getUTCDate()).toBe(10);
    expect(postDue.getUTCDate()).toBe(11);
  });

  test('schedules only future post-due reminders for overdue payments', () => {
    const cards = [
      buildCard({
        id: 'card-3',
        nickname: 'Capital One',
        statementCloseDay: 25,
        paymentDueDay: 8
      })
    ];

    const reminders = generateBaselineReminderPlan({
      userId: 'user-123',
      cards,
      options: {
        today,
        quietHours: null,
        preDueOffsets: [-3, 0],
        postDueOffsets: [1, 3],
        defaultHour: 9
      }
    });

    // Payment due date = Nov 8 (past). Only post-due offsets should be scheduled.
    expect(reminders).toHaveLength(2);
    expect(reminders.map(r => r.lead_time_days)).toEqual([1, 3]);
    const first = new Date(reminders[0].target_datetime);
    const second = new Date(reminders[1].target_datetime);
    expect(first.getUTCDate()).toBe(9);
    expect(second.getUTCDate()).toBe(11);
  });

  test('respects quiet hours by shifting to end of quiet window', () => {
    const cards = [
      buildCard({
        id: 'card-4',
        nickname: 'Discover',
        statementCloseDay: 20,
        paymentDueDay: 25
      })
    ];

    const reminders = generateBaselineReminderPlan({
      userId: 'user-quiet',
      cards,
      options: {
        today,
        preDueOffsets: [-7],
        postDueOffsets: [],
        defaultHour: 22, // intentionally within quiet hours
        quietHours: { start: 21, end: 8 }
      }
    });

    expect(reminders).toHaveLength(1);
    const reminderDate = new Date(reminders[0].target_datetime);
    expect(reminderDate.getHours()).toBe(8); // shifted to quietHours.end
  });
});

describe('Reminder Planner - Deduplication & Summary', () => {
  test('filterExistingReminders removes duplicates within tolerance window', () => {
    const candidate = [{
      id: 'rem-1',
      card_id: 'card-1',
      reminder_type: 'payment_due',
      target_datetime: '2025-11-13T09:00:00.000Z'
    }];

    const existing = [{
      id: 'rem-legacy',
      card_id: 'card-1',
      reminder_type: 'payment_due',
      target_datetime: '2025-11-13T09:30:00.000Z'
    }];

    const filtered = filterExistingReminders(candidate, existing, 60);
    expect(filtered).toHaveLength(0); // duplicate within tolerance
  });

  test('summarizeReminderPlan returns next reminder and grouping', () => {
    const reminders = [
      {
        id: 'r1',
        card_id: 'card-1',
        target_datetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        reminder_type: 'payment_due'
      },
      {
        id: 'r2',
        card_id: 'card-2',
        target_datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        reminder_type: 'payment_due'
      }
    ];

    const summary = summarizeReminderPlan(reminders);
    expect(summary.totalUpcoming).toBe(2);
    expect(summary.nextReminder.id).toBe('r1');
    expect(Object.keys(summary.byCard)).toEqual(expect.arrayContaining(['card-1', 'card-2']));
  });
});


