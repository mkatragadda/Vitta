import { createMemory, searchMemories } from '../memory/memoryService';
import { analyzeTags } from '../memory/tagIntelligence';
import { QUESTION_TYPES } from './slotFillingManager';

const MAX_RESULTS = 10;

const buildStructuredPayload = (entities) => {
  const payload = {};

  if (entities.merchant) payload.merchant = entities.merchant;
  if (entities.category) payload.category = entities.category;
  if (entities.cardName) payload.cardName = entities.cardName;
  if (entities.action) payload.action = entities.action;
  if (entities.attribute) payload.attribute = entities.attribute;

  return Object.keys(payload).length > 0 ? payload : null;
};

const deriveDateRangeFromTimeframe = (timeframe) => {
  if (!timeframe) return { startDate: null, endDate: null };

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed

  switch (timeframe.type) {
    case 'today': {
      const start = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth, now.getUTCDate(), 23, 59, 59));
      return { startDate: start, endDate: end };
    }
    case 'this_week': {
      const dayOfWeek = now.getUTCDay(); // 0 (Sun)…6 (Sat)
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() - dayOfWeek);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    case 'this_month': {
      const start = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59));
      return { startDate: start, endDate: end };
    }
    case 'next_week': {
      const dayOfWeek = now.getUTCDay();
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() + (7 - dayOfWeek));
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    case 'weeks': {
      const weeks = timeframe.value || 1;
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() - (weeks * 7));
      start.setUTCHours(0, 0, 0, 0);
      return { startDate: start, endDate: now };
    }
    case 'days': {
      const days = timeframe.value || 1;
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() - days);
      start.setUTCHours(0, 0, 0, 0);
      return { startDate: start, endDate: now };
    }
    default:
      return { startDate: null, endDate: null };
  }
};

const humanizeTag = (tag) =>
  tag
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatMemoryList = (memories, total, tags, startDate, endDate) => {
  if (memories.length === 0) {
    const tagText = tags.length > 0
      ? ` with tag${tags.length > 1 ? 's' : ''} ${tags.map(t => `#${humanizeTag(t)}`).join(', ')}`
      : '';
    return `I couldn't find any saved memories${tagText ? tagText : ''}${startDate || endDate ? ' for that time range' : ''}.`;
  }

  const tagSummary = tags.length > 0
    ? `tag${tags.length > 1 ? 's' : ''} ${tags.map(t => `#${humanizeTag(t)}`).join(', ')}`
    : 'all tags';

  const timeframeSummary = startDate || endDate
    ? ` for ${startDate ? startDate.toLocaleDateString() : 'the beginning'} to ${endDate ? endDate.toLocaleDateString() : 'now'}`
    : '';

  const header = `Here ${memories.length === 1 ? 'is' : 'are'} what I found under ${tagSummary}${timeframeSummary}:`;
  let totalAmount = 0;
  const rows = memories.map(memory => {
    const amount = memory.amount ? Number(memory.amount) : null;
    const amountDisplay = amount !== null ? `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—';
    if (amount !== null) {
      totalAmount += amount;
    }

    const eventDate = memory.event_date ? new Date(memory.event_date) : new Date(memory.created_at);
    const dateDisplay = eventDate.toLocaleDateString();
    const tagsDisplay = (memory.tags || []).map(t => `#${humanizeTag(t)}`).join(', ') || '—';
    const payload = memory.structured_payload || {};
    const merchant = payload.merchant ? payload.merchant.replace(/\b\w/g, c => c.toUpperCase()) : '—';
    const category = payload.category ? payload.category.replace(/\b\w/g, c => c.toUpperCase()) : '—';

    return {
      dateDisplay,
      amountDisplay,
      merchant,
      category,
      tagsDisplay,
      naturalText: memory.natural_text
    };
  });

  const tableLines = [
    '| **Date** | **Amount** | **Merchant** | **Category** | **Tags** |',
    '|----------|-----------|--------------|--------------|---------|',
    ...rows.map(row => `| ${row.dateDisplay} | ${row.amountDisplay} | ${row.merchant} | ${row.category} | ${row.tagsDisplay} |`)
  ];

  const footerParts = [];
  if (total > memories.length) {
    footerParts.push(`Showing ${memories.length} of ${total} entries. Ask for a narrower timeframe or additional tags to focus.`);
  }

  if (totalAmount > 0) {
    footerParts.push(`Total tracked amount: $${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
  }

  const footer = footerParts.length > 0 ? `\n\n${footerParts.join('\n')}` : '';

  const noteLines = rows.some(row => row.naturalText)
    ? [
        '',
        '_Saved notes:_',
        ...rows.map(row => `• ${row.naturalText}`)
      ]
    : [];

  return `${header}\n\n${tableLines.join('\n')}${footer}${noteLines.length ? `\n\n${noteLines.join('\n')}` : ''}`;
};

export async function handleRememberMemory({
  userId,
  query,
  entities,
  slotFillingState = null,
  memoryDraftOverride = null,
  overrideTags = null
}) {
  if (!userId) {
    return "I need to know who I'm saving this for. Please sign in and try again.";
  }

  const memoryDraft = memoryDraftOverride || {
    userId,
    naturalText: query,
    structuredPayload: buildStructuredPayload(entities),
    amount: entities.amount || null,
    currency: entities.currency || 'USD',
    eventDate: entities.eventDate || null,
    source: 'chat'
  };

  const tagCandidates = overrideTags || entities.tags || [];
  const { normalizedTags, discarded, fallbackUsed } = analyzeTags(tagCandidates, { allowEmpty: false });

  if (normalizedTags.length === 0) {
    if (slotFillingState) {
      slotFillingState.askQuestion(
        QUESTION_TYPES.MEMORY_TAG,
        'remember_memory',
        ['tags'],
        { memoryDraft }
      );
    }

    if (discarded.length > 0) {
      return "I couldn't find a short tag in that sentence. Try something like 'tag travel' or 'tag supplies'.";
    }

    return "Please include a short, descriptive tag so I can find this later. For example: 'tag gifts' or 'tag travel'.";
  }

  try {
    await createMemory({
      userId: memoryDraft.userId,
      naturalText: memoryDraft.naturalText,
      structuredPayload: memoryDraft.structuredPayload,
      tags: normalizedTags,
      amount: memoryDraft.amount,
      currency: memoryDraft.currency,
      eventDate: memoryDraft.eventDate,
      source: memoryDraft.source
    });

    const tagList = normalizedTags.map(t => `#${t}`).join(', ');
    const discardedMsg = discarded.length
      ? ` I ignored ${discarded.map(t => `'${t}'`).join(', ')} because tags work best as short words or phrases.`
      : '';
    const fallbackMsg = fallbackUsed
      ? " I kept things simple and used the last part of your phrase as the tag."
      : '';

    return `Got it! I saved that note under ${tagList}.${discardedMsg}${fallbackMsg} You can ask me later with "show memories tagged ${normalizedTags[0]}".`;
  } catch (error) {
    console.error('[MemoryHandler] Failed to store memory:', error);
    return "I ran into an issue saving that memory. Please try again in a moment.";
  }
}

export async function handleRecallMemory({ userId, entities }) {
  if (!userId) {
    return "I need to know whose memories to look up. Please sign in first.";
  }

  const { normalizedTags } = analyzeTags(entities.tags || [], { allowEmpty: true });
  if (normalizedTags.length === 0) {
    return "Tell me which tag to search. For example: 'show memories tagged gifts' or 'list notes tagged travel'.";
  }

  const { startDate, endDate } = deriveDateRangeFromTimeframe(entities.timeframe);

  try {
    const { memories, total } = await searchMemories({
      userId,
      tags: normalizedTags,
      startDate,
      endDate,
      limit: MAX_RESULTS
    });

    return formatMemoryList(memories, total, normalizedTags, startDate, endDate);
  } catch (error) {
    console.error('[MemoryHandler] Failed to search memories:', error);
    return "I wasn't able to look that up. Please try again soon.";
  }
}

