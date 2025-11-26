import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, CalendarDays, Loader2, PauseCircle, PlayCircle } from 'lucide-react';
import { generateBaselineReminderPlan, summarizeReminderPlan } from '../services/reminders/reminderPlanner';
import { upsertReminders, listReminders, muteReminders } from '../services/reminders/reminderService';

const ReminderWidget = ({ userId, cards = [] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [isManaging, setIsManaging] = useState(false);

  const today = useMemo(() => new Date(), []);

  const loadReminders = async () => {
    if (!userId || cards.length === 0) {
      setReminders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const plan = generateBaselineReminderPlan({
        userId,
        cards,
        options: {
          today,
          includeUrgencyEmoji: true
        }
      });

      await upsertReminders(userId, plan);
      const upcoming = await listReminders({ userId });
      setReminders(upcoming);
    } catch (err) {
      console.error('[ReminderWidget] Failed to load reminders:', err);
      setError('Unable to load reminders right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cards.length]);

  const summary = useMemo(() => summarizeReminderPlan(reminders), [reminders]);

  const upcomingEntries = useMemo(() => {
    if (!reminders || reminders.length === 0) return [];
    return reminders.slice(0, 3);
  }, [reminders]);

  const handleMuteToggle = async () => {
    if (!userId) return;
    try {
      if (isMuted) {
        await muteReminders({ userId, durationDays: null });
        setIsMuted(false);
      } else {
        await muteReminders({ userId, durationDays: 30 });
        setIsMuted(true);
      }
      await loadReminders();
    } catch (err) {
      console.error('[ReminderWidget] Failed to toggle mute:', err);
      setError('Unable to update reminder settings.');
    }
  };

  if (!userId || cards.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 mb-8 border border-blue-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upcoming Payments</h2>
            <p className="text-sm text-gray-600">
              {summary.totalUpcoming > 0
                ? `Next reminder in ${summary.nextReminder?.payload?.daysUntilDue ?? 0} day(s)`
                : 'All caught up — no payments due soon.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMuteToggle}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            {isMuted ? <BellOff className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            {isMuted ? 'Reminders Paused' : 'Pause Reminders'}
          </button>
          <button
            onClick={() => setIsManaging(true)}
            className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            Manage
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading reminders...
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : upcomingEntries.length === 0 ? (
        <p className="text-sm text-gray-600">
          You don&apos;t have any payments due in the next 30 days. Enjoy the breathing room!
        </p>
      ) : (
        <div className="space-y-3">
          {upcomingEntries.map(reminder => {
            const dueDate = new Date(reminder.target_datetime);
            const readableDate = dueDate.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric'
            });

            return (
              <div
                key={reminder.id}
                className="flex items-center justify-between bg-blue-50 rounded-xl p-4 border border-blue-100"
              >
                <div>
                  <p className="text-sm text-gray-600">Card</p>
                  <p className="font-semibold text-gray-900">
                    {reminder.payload?.urgencyEmoji && <span className="mr-2">{reminder.payload.urgencyEmoji}</span>}
                    {reminder.payload?.cardNickname}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Reminder</p>
                  <p className="font-semibold text-gray-900">{readableDate}</p>
                  <p className="text-xs text-blue-600">
                    {reminder.lead_time_days < 0
                      ? `${Math.abs(reminder.lead_time_days)} day(s) before due`
                      : reminder.lead_time_days === 0
                        ? 'Due today'
                        : `Follow-up +${reminder.lead_time_days} day(s)`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Simple management drawer */}
      {isManaging && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end md:items-center md:justify-center z-50">
          <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reminder Preferences</h3>
              <button
                onClick={() => setIsManaging(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <PlayCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Coming soon: fine-grained control over reminder timing, channels, and snooze defaults.
              You can mute reminders from here or by telling the assistant in chat.
            </p>

            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Global reminders</p>
                <p className="text-xs text-gray-600">Mute or resume for every card at once.</p>
              </div>
              <button
                onClick={handleMuteToggle}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
              >
                {isMuted ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                {isMuted ? 'Resume reminders' : 'Pause all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderWidget;




