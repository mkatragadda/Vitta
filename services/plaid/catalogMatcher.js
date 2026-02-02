/**
 * Plaid Card Catalog Matcher — Fuzzy matching logic
 *
 * Pure function module (zero side effects, no DB/network calls).
 * Matches a Plaid account name against a catalog of credit cards using
 * a 3-tier priority system:
 *   1. Exact name match (case-insensitive, ignoring ®™©) → HIGH
 *   2. Issuer match + keyword overlap → HIGH
 *   3. Token similarity ≥ 60% (Jaccard) → MEDIUM
 *   4. No match → NONE
 *
 * This pure function design enables exhaustive unit testing.
 */

/**
 * Noise words filtered during tokenization — not distinctive enough for matching.
 * These are common English articles, prepositions, and generic card terminology.
 */
const NOISE_WORDS = new Set([
  'the', 'a', 'an', 'my', 'new', 'card', 'credit', 'of', 'in', 'for', 'with', 'to'
]);

/**
 * Normalize a card name for exact matching.
 * Strips trademark symbols (®™©), collapses whitespace, and converts to lowercase.
 * @param {string} name
 * @returns {string}
 */
function normalizeForExact(name) {
  return name
    .replace(/[®™©]/g, '')                    // Strip trademark symbols
    .replace(/\s+/g, ' ')                     // Collapse multiple whitespace
    .trim()
    .toLowerCase();
}

/**
 * Tokenize a name into distinctive words.
 * Splits on non-alphanumeric characters, lowercases, filters noise words and
 * account suffixes (4+ digit numbers like "4582" or "428012").
 * @param {string} name
 * @returns {Array<string>}
 */
function tokenize(name) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)                     // Split on non-alphanumeric
    .filter(t => t.length > 0)                // Remove empty tokens
    .filter(t => !NOISE_WORDS.has(t))         // Filter noise words
    .filter(t => !(/^\d{4,}$/.test(t)));      // Filter account suffixes (4+ digits)
}

/**
 * Extract distinctive keywords from a catalog card name.
 * Keywords are tokens that are NOT noise words (e.g., "sapphire", "preferred").
 * @param {string} cardName
 * @returns {Array<string>}
 */
function getKeywords(cardName) {
  return tokenize(cardName);
}

/**
 * Compute Jaccard similarity between two names.
 * Similarity = |intersection| / |union| of token sets.
 * Range: 0 (no overlap) to 1 (identical tokens).
 * @param {string} nameA
 * @param {string} nameB
 * @returns {number}
 */
function tokenSimilarity(nameA, nameB) {
  const setA = new Set(tokenize(nameA));
  const setB = new Set(tokenize(nameB));

  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(t => setB.has(t)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Match a Plaid account name against a catalog of credit cards.
 *
 * Uses three priority levels:
 *   1. Exact name match (case-insensitive) → HIGH confidence
 *   2. Issuer name appears in account name + keyword overlap → HIGH confidence
 *   3. Token similarity ≥ 0.6 (Jaccard) → MEDIUM confidence
 *
 * Catalog cards should be pre-sorted by popularity_score DESC for deterministic
 * tie-breaking when multiple cards match at the same priority level.
 *
 * @param {string} plaidAccountName - Account name from Plaid (e.g. "Chase Sapphire Preferred - 4582")
 * @param {Array<Object>} catalogCards - Active cards from card_catalog table.
 *   Each card MUST have: { id, card_name, issuer, card_network, reward_structure, annual_fee }
 * @returns {{ card: Object|null, confidence: 'HIGH'|'MEDIUM'|'NONE' }}
 *   Returns the matched card and confidence level, or null if no match found.
 */
function matchCatalogCard(plaidAccountName, catalogCards) {
  if (!plaidAccountName || !catalogCards || catalogCards.length === 0) {
    return { card: null, confidence: 'NONE' };
  }

  const normalizedPlaid = normalizeForExact(plaidAccountName);
  const plaidTokens = new Set(tokenize(plaidAccountName));

  // ──────────────────────────────────────────────────────────────────────────
  // Priority 1: Exact name match (case-insensitive, ignoring ®™©)
  // ──────────────────────────────────────────────────────────────────────────
  for (const card of catalogCards) {
    if (normalizeForExact(card.card_name) === normalizedPlaid) {
      return { card, confidence: 'HIGH' };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Priority 2: Issuer appears in account name + at least one keyword overlap
  // ──────────────────────────────────────────────────────────────────────────
  for (const card of catalogCards) {
    if (!card.issuer) continue;

    const issuerInName = plaidAccountName.toLowerCase().includes(
      card.issuer.toLowerCase()
    );
    if (!issuerInName) continue;

    const catalogKeywords = getKeywords(card.card_name);
    const hasKeywordOverlap = catalogKeywords.some(kw => plaidTokens.has(kw));

    if (hasKeywordOverlap) {
      return { card, confidence: 'HIGH' };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Priority 3: Best token similarity ≥ 0.6 (Jaccard)
  // ──────────────────────────────────────────────────────────────────────────
  let bestCard = null;
  let bestScore = 0;

  for (const card of catalogCards) {
    const score = tokenSimilarity(plaidAccountName, card.card_name);
    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  if (bestScore >= 0.6) {
    return { card: bestCard, confidence: 'MEDIUM' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // No match
  // ──────────────────────────────────────────────────────────────────────────
  return { card: null, confidence: 'NONE' };
}

module.exports = {
  matchCatalogCard,
  tokenize,
  tokenSimilarity,
  normalizeForExact,
  getKeywords,
};
