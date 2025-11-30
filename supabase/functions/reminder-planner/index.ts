// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.200.0/http/server.ts';

const ensureProcessEnv = () => {
  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ??
    Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  if (!globalThis.process) {
    // @ts-ignore - create lightweight Node compat shim
    globalThis.process = { env: {} };
  }

  if (!globalThis.process.env) {
    globalThis.process.env = {};
  }

  globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = serviceRoleKey;
  globalThis.process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
};

const jsonResponse = (payload: Record<string, any>, status = 200) =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
  });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    ensureProcessEnv();

    const { fetchReminderEligibleUsers, planRemindersForUsers, planRemindersForUser } =
      await import('../../../services/reminders/reminderRunner.js');

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (userId) {
      const result = await planRemindersForUser(userId);
      return jsonResponse({
        ok: true,
        mode: 'single',
        userId,
        result
      });
    }

    const userIds = await fetchReminderEligibleUsers();
    if (!userIds.length) {
      return jsonResponse({
        ok: true,
        mode: 'bulk',
        processed: 0,
        results: [],
        message: 'No eligible users found.'
      });
    }

    const results = await planRemindersForUsers(userIds);

    return jsonResponse({
      ok: true,
      mode: 'bulk',
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('[ReminderPlanner] Fatal error:', error);
    return jsonResponse(
      {
        ok: false,
        error: error?.message || 'Unknown error'
      },
      500
    );
  }
});





