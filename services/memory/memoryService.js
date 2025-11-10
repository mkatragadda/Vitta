import { supabase, isSupabaseConfigured } from '../../config/supabase';
import { analyzeTags } from './tagIntelligence';

const DEFAULT_LIMIT = 25;

export async function createMemory({
  userId,
  naturalText,
  structuredPayload = {},
  tags = [],
  amount = null,
  currency = null,
  eventDate = null,
  source = 'chat'
}) {
  if (!userId) {
    throw new Error('userId is required to create a memory');
  }

  if (!naturalText) {
    throw new Error('naturalText is required to create a memory');
  }

  const { normalizedTags } = analyzeTags(tags, { allowEmpty: false });

  if (!isSupabaseConfigured()) {
    console.log('[MemoryService] Supabase not configured - skipping createMemory');
    return {
      id: 'demo-memory',
      user_id: userId,
      natural_text: naturalText,
      structured_payload: structuredPayload,
      tags: normalizedTags,
      amount,
      currency,
      event_date: eventDate,
      source,
      created_at: new Date().toISOString()
    };
  }

  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: userId,
      natural_text: naturalText,
      structured_payload: structuredPayload,
      tags: normalizedTags,
      amount,
      currency,
      event_date: eventDate,
      source
    })
    .select()
    .single();

  if (error) {
    console.error('[MemoryService] Failed to create memory:', error);
    throw error;
  }

  return data;
}

export async function searchMemories({
  userId,
  tags = [],
  startDate = null,
  endDate = null,
  limit = DEFAULT_LIMIT
}) {
  if (!userId) {
    throw new Error('userId is required to search memories');
  }

  const { normalizedTags } = analyzeTags(tags, { allowEmpty: true });

  if (!isSupabaseConfigured()) {
    console.log('[MemoryService] Supabase not configured - returning empty memory search results');
    return {
      memories: [],
      total: 0
    };
  }

  let query = supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(Math.max(limit, 100));

  if (normalizedTags.length > 0) {
    query = query.contains('tags', normalizedTags);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[MemoryService] Failed to search memories:', error);
    throw error;
  }

  const rawMemories = data || [];
  const filtered = rawMemories.filter(memory => {
    if (!startDate && !endDate) return true;
    const effectiveDate = memory.event_date ? new Date(memory.event_date) : new Date(memory.created_at);
    if (startDate && effectiveDate < startDate) {
      return false;
    }
    if (endDate && effectiveDate > endDate) {
      return false;
    }
    return true;
  });

  const limited = filtered.slice(0, limit);

  return {
    memories: limited,
    total: filtered.length
  };
}

