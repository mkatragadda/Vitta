/**
 * Entity Extractor
 * Extracts entities from natural language using compromise.js and custom patterns
 */

import nlp from 'compromise';
import deeplinksData from '../../data/deeplinks';
import { extractAmount } from '../../utils/textExtraction';

// Merchant synonyms and common names
const MERCHANT_PATTERNS = {
  'costco': ['costco', 'costco wholesale'],
  'walmart': ['walmart', 'wal-mart', 'wal mart'],
  'target': ['target', 'target store'],
  'whole foods': ['whole foods', 'wholefoods', 'whole food'],
  'trader joes': ['trader joes', 'trader joe', 'traders joes'],
  'safeway': ['safeway'],
  'kroger': ['kroger'],
  'gas': ['gas station', 'gas', 'fuel', 'chevron', 'shell', 'exxon', 'bp', '76'],
  'restaurant': ['restaurant', 'dining', 'food', 'eat out', 'chipotle', 'mcdonalds', 'starbucks', 'cafe'],
  'grocery': ['grocery', 'groceries', 'supermarket', 'food shopping'],
  'travel': ['travel', 'flight', 'hotel', 'airline', 'airbnb', 'booking', 'expedia'],
  'amazon': ['amazon', 'amazon.com'],
  'uber': ['uber', 'lyft', 'rideshare'],
  'online': ['online', 'internet', 'web shopping', 'e-commerce']
};

// Card name patterns
const CARD_PATTERNS = [
  'chase', 'sapphire', 'freedom', 'amex', 'american express', 'gold', 'platinum',
  'citi', 'citibank', 'double cash', 'custom cash', 'discover', 'capital one',
  'venture', 'quicksilver', 'bank of america', 'wells fargo'
];

// Time-related patterns
const TIME_PATTERNS = {
  'today': /today|tonight|right now/i,
  'tomorrow': /tomorrow/i,
  'this_week': /this week|within.*week/i,
  'next_week': /next week/i,
  'this_month': /this month|within.*month/i,
  'days': /(?:in|next|within)\s*(\d+)\s*days?/i,
  'weeks': /(?:in|next|within)\s*(\d+)\s*weeks?/i
};

/**
 * Extract all entities from query
 */
export const extractEntities = (query) => {
  const doc = nlp(query.toLowerCase());
  const entities = {
    // Original entities
    merchant: null,
    category: null,
    cardName: null,
    screenName: null,
    timeframe: null,
    amount: null,

    // NEW: Semantic entities for smart query handling
    queryType: null,    // 'comparison', 'listing', 'recommendation', 'timeframe', 'calculation'
    attribute: null,    // 'apr', 'balance', 'due_date', 'credit_limit', 'rewards', 'utilization'
    modifier: null,     // 'lowest', 'highest', 'best', 'worst', 'total', 'average'
    action: null        // 'show', 'list', 'find', 'calculate', 'compare'
  };

  console.log('[EntityExtractor] Extracting from:', query);

  // Extract merchant
  entities.merchant = extractMerchant(query, doc);

  // Extract card name
  entities.cardName = extractCardName(query, doc);

  // Extract screen name
  entities.screenName = extractScreenName(query, doc);

  // Extract timeframe
  entities.timeframe = extractTimeframe(query, doc);

  // Extract amount
  entities.amount = extractAmountFromQuery(query, doc);

  // NEW: Extract semantic entities
  entities.queryType = extractQueryType(query, doc);
  entities.attribute = extractAttribute(query, doc);
  entities.modifier = extractModifier(query, doc);
  entities.action = extractAction(query, doc);

  console.log('[EntityExtractor] Extracted entities:', entities);

  return entities;
};

/**
 * Extract merchant name
 */
const extractMerchant = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Check for merchant patterns
  for (const [merchant, patterns] of Object.entries(MERCHANT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerQuery.includes(pattern.toLowerCase())) {
        console.log('[EntityExtractor] Found merchant:', merchant);
        return merchant;
      }
    }
  }

  // Try to extract using NLP - look for places/organizations after "at", "for", "from"
  const placeMatch = query.match(/(?:at|for|from|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (placeMatch) {
    const place = placeMatch[1].toLowerCase();
    console.log('[EntityExtractor] Found place from pattern:', place);
    return place;
  }

  // Check for proper nouns (capitalized words)
  const organizations = doc.organizations().out('array');
  const places = doc.places().out('array');

  if (organizations.length > 0) {
    console.log('[EntityExtractor] Found organization:', organizations[0]);
    return organizations[0].toLowerCase();
  }

  if (places.length > 0) {
    console.log('[EntityExtractor] Found place:', places[0]);
    return places[0].toLowerCase();
  }

  return null;
};

/**
 * Extract card name
 */
const extractCardName = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Look for card patterns
  for (const pattern of CARD_PATTERNS) {
    if (lowerQuery.includes(pattern.toLowerCase())) {
      console.log('[EntityExtractor] Found card:', pattern);
      return pattern;
    }
  }

  // Look for "my [card name] card" pattern
  const cardMatch = query.match(/(?:my|the)\s+([A-Za-z\s]+?)\s+card/i);
  if (cardMatch) {
    const cardName = cardMatch[1].trim();
    console.log('[EntityExtractor] Found card from pattern:', cardName);
    return cardName;
  }

  return null;
};

/**
 * Extract screen name
 */
const extractScreenName = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Check against known screens from deeplinks
  for (const link of deeplinksData) {
    // Check screen name
    if (lowerQuery.includes(link.screen_name.toLowerCase())) {
      console.log('[EntityExtractor] Found screen:', link.screen_path);
      return link.screen_path;
    }

    // Check keywords
    for (const keyword of link.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        console.log('[EntityExtractor] Found screen from keyword:', link.screen_path);
        return link.screen_path;
      }
    }
  }

  return null;
};

/**
 * Extract timeframe
 */
const extractTimeframe = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Check predefined time patterns
  for (const [key, pattern] of Object.entries(TIME_PATTERNS)) {
    if (pattern.test(lowerQuery)) {
      const match = lowerQuery.match(pattern);
      if (match && match[1]) {
        // Has a number (e.g., "in 5 days")
        console.log('[EntityExtractor] Found timeframe:', key, match[1]);
        return { type: key, value: parseInt(match[1]) };
      }
      console.log('[EntityExtractor] Found timeframe:', key);
      return { type: key };
    }
  }

  // Note: compromise.js base library doesn't have .dates() method
  // Regex patterns above handle most timeframe extraction needs

  return null;
};

/**
 * Extract monetary amount using common utility
 * This is a wrapper to maintain compatibility with existing code
 */
const extractAmountFromQuery = (query, doc) => {
  // Use common extraction utility
  const amount = extractAmount(query, { minDigits: 3, allowK: true });
  
  if (amount) {
    console.log('[EntityExtractor] Found amount:', amount);
    return amount;
  }

  // Fallback: Use NLP to find money/values
  const money = doc.money().out('array');
  if (money.length > 0) {
    console.log('[EntityExtractor] Found money via NLP:', money[0]);
    return money[0];
  }

  return null;
};

/**
 * Extract query type - what kind of question is this?
 */
const extractQueryType = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Comparison: "lowest", "highest", "best", "worst"
  if (/lowest|highest|best|worst|better|worse|compare/.test(lowerQuery)) {
    return 'comparison';
  }

  // Listing: "show all", "list", "what cards"
  if (/show|list|all|what.*cards|my cards/.test(lowerQuery)) {
    return 'listing';
  }

  // Recommendation: "which card", "should I use", "recommend"
  if (/which card|should i|recommend|use at|use for/.test(lowerQuery)) {
    return 'recommendation';
  }

  // Timeframe: "when", "due", "upcoming"
  if (/when|due|upcoming|next/.test(lowerQuery)) {
    return 'timeframe';
  }

  // Calculation: "how much", "total", "calculate"
  if (/how much|total|calculate|sum/.test(lowerQuery)) {
    return 'calculation';
  }

  return null;
};

/**
 * Extract attribute - what card property are they asking about?
 */
const extractAttribute = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // APR / Interest
  if (/\b(apr|interest|rate)\b/.test(lowerQuery)) {
    return 'apr';
  }

  // Balance / Debt
  if (/\b(balance|debt|owe|owing)\b/.test(lowerQuery)) {
    return 'balance';
  }

  // Due date / Payment date
  if (/\b(due.*date|payment.*date|when.*due)\b/.test(lowerQuery)) {
    return 'due_date';
  }

  // Credit limit
  if (/\b(credit.*limit|limit|max)\b/.test(lowerQuery)) {
    return 'credit_limit';
  }

  // Available credit
  if (/\b(available|can.*spend)\b/.test(lowerQuery)) {
    return 'available_credit';
  }

  // Utilization
  if (/\b(utilization|usage|percent|using)\b/.test(lowerQuery)) {
    return 'utilization';
  }

  // Rewards
  if (/\b(rewards?|points?|cashback|miles|cash back)\b/.test(lowerQuery)) {
    return 'rewards';
  }

  // Payment amount
  if (/\b(payment.*amount|how much.*pay|minimum)\b/.test(lowerQuery)) {
    return 'payment_amount';
  }

  return null;
};

/**
 * Extract modifier - how are they filtering/sorting?
 */
const extractModifier = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  if (/\blowest\b/.test(lowerQuery)) return 'lowest';
  if (/\bhighest\b/.test(lowerQuery)) return 'highest';
  if (/\bbest\b/.test(lowerQuery)) return 'best';
  if (/\bworst\b/.test(lowerQuery)) return 'worst';
  if (/\btotal\b/.test(lowerQuery)) return 'total';
  if (/\baverage\b/.test(lowerQuery)) return 'average';
  if (/\bmost\b/.test(lowerQuery)) return 'most';
  if (/\bleast\b/.test(lowerQuery)) return 'least';

  return null;
};

/**
 * Extract action - what do they want to do?
 */
const extractAction = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  if (/\bshow\b/.test(lowerQuery)) return 'show';
  if (/\blist\b/.test(lowerQuery)) return 'list';
  if (/\bfind\b/.test(lowerQuery)) return 'find';
  if (/\bcalculate\b/.test(lowerQuery)) return 'calculate';
  if (/\bcompare\b/.test(lowerQuery)) return 'compare';
  if (/\btell\b/.test(lowerQuery)) return 'tell';
  if (/\bwhat\b/.test(lowerQuery)) return 'what';
  if (/\bwhich\b/.test(lowerQuery)) return 'which';

  return null;
};
