/**
 * Tag Intelligence utilities
 *  - Cleans raw tag phrases extracted from chat
 *  - Suggests canonical tags based on heuristics / keyword mapping
 *  - Provides diagnostics for user messaging
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'to', 'my', 'your', 'our', 'on', 'with', 'about', 'and', 'purchase',
  'spend', 'spent', 'payment', 'ticket', 'purchase', 'buy', 'bought', 'order', 'expense', 'expenses',
  'purchase', 'walmart', 'amazon', 'target', 'as', 'from', 'tag', 'tags'
]);

const CANONICAL_KEYWORDS = [
  { canonical: 'travel', keywords: ['flight', 'airline', 'airfare', 'travel', 'trip', 'vacation'] },
  { canonical: 'groceries', keywords: ['grocery', 'groceries', 'supermarket', 'food'] },
  { canonical: 'dining', keywords: ['restaurant', 'dining', 'lunch', 'dinner', 'meal'] },
  { canonical: 'supplies', keywords: ['supplies', 'office', 'staples'] },
  { canonical: 'entertainment', keywords: ['entertainment', 'movie', 'concert', 'show'] },
  { canonical: 'gifts', keywords: ['gift', 'gifts', 'present', 'birthday', 'bday'] }
];

const MAX_TERMS_PER_TAG = 3;

const sanitizeWord = (word) =>
  word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

const mapToCanonical = (words) => {
  for (const mapping of CANONICAL_KEYWORDS) {
    if (words.some((w) => mapping.keywords.includes(w))) {
      return mapping.canonical;
    }
  }
  return null;
};

const MERCHANT_ALIAS = new Map([
  ['walmart', []],
  ['amazon', []],
  ['target', []],
  ['costco', []]
]);

const buildCleanTag = (rawTag) => {
  if (!rawTag) return null;

  const tokenized = rawTag
    .toString()
    .toLowerCase()
    .replace(/[#'"`]/g, ' ')
    .split(/\s+/)
    .map(sanitizeWord)
    .filter(Boolean)
    .filter((word) => !STOP_WORDS.has(word));

  if (tokenized.length === 0) {
    return null;
  }

  const canonical = mapToCanonical(tokenized);
  if (canonical) {
    return canonical;
  }

  const compact = tokenized.slice(-MAX_TERMS_PER_TAG);
  return compact.join(' ').trim();
};

/**
 * Analyze and normalize a list of tag phrases.
 * @param {string[]} rawTags - Tags extracted from user query
 * @param {Object} options - { allowEmpty: boolean }
 * @returns {Object} { normalizedTags: string[], discarded: string[], suggestions: string[] }
 */
export const analyzeTags = (rawTags = [], options = {}) => {
  const unique = Array.from(new Set(rawTags.map((tag) => tag.trim()).filter(Boolean)));

  const normalizedTags = [];
  const discarded = [];

  unique.forEach((tag) => {
    const cleaned = buildCleanTag(tag);
    if (cleaned) {
      normalizedTags.push(cleaned);
    } else {
      discarded.push(tag);
    }
  });

  const deduped = Array.from(new Set(normalizedTags));

  if (!deduped.length && !options.allowEmpty && unique.length) {
    // As a fallback, take the last two words from the final tag
    const raw = unique[unique.length - 1];
    const fallback = raw
      .toLowerCase()
      .replace(/[#'"`]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .join(' ')
      .trim();

    if (fallback) {
      return {
        normalizedTags: [fallback],
        discarded,
        fallbackUsed: true
      };
    }
  }

  const finalTags = deduped.length ? deduped : [];
  const merchantEntities = [];

  unique.forEach((tag) => {
    const words = tag
      .toLowerCase()
      .replace(/[#'"`]/g, ' ')
      .split(/\s+/)
      .map(sanitizeWord)
      .filter(Boolean);

    words.forEach((word) => {
      if (MERCHANT_ALIAS.has(word)) {
        merchantEntities.push(word);
      }
    });
  });

  return {
    normalizedTags: finalTags,
    discarded,
    fallbackUsed: false,
    merchantEntities
  };
};

export default {
  analyzeTags
};


