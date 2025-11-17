/**
 * Entity Extractor
 * Extracts entities from natural language using compromise.js and custom patterns
 */

import nlp from 'compromise';
import deeplinksData from '../../data/deeplinks';
import { extractAmount } from '../../utils/textExtraction';

// Category keywords (must be checked BEFORE merchant patterns to avoid conflicts)
// All 14 categories from the reward structure system
const CATEGORY_PATTERNS = {
  // 1. Dining - restaurants, food, eating out
  'dining': [
    'dining', 'dining out', 'restaurant', 'restaurants', 'restaurant dining',
    'eating out', 'eat out', 'food', 'food dining', 'dinner', 'lunch', 'breakfast',
    'takeout', 'take out', 'delivery', 'food delivery', 'fast food', 'fastfood'
  ],
  
  // 2. Groceries - supermarkets, grocery stores
  'groceries': [
    'grocery', 'groceries', 'grocery store', 'grocery stores',
    'supermarket', 'supermarkets', 'food shopping', 'food store', 'food stores',
    'grocery shopping', 'grocery stores', 'market', 'grocery market'
  ],
  
  // 3. Gas - fuel stations, gasoline
  'gas': [
    'gas', 'gas station', 'gas stations', 'fuel', 'fuel station', 'fuel stations',
    'gasoline', 'petrol', 'ev charging', 'electric vehicle charging',
    'charging station', 'charging stations', 'refueling'
  ],
  
  // 4. Travel - flights, hotels, airlines, vacations
  'travel': [
    'travel', 'traveling', 'travelling', 'trip', 'trips', 'vacation', 'vacations',
    'flight', 'flights', 'airline', 'airlines', 'airfare', 'airfare booking',
    'hotel', 'hotels', 'lodging', 'accommodation', 'accommodations',
    'airbnb', 'booking', 'expedia', 'priceline', 'travel booking',
    'cruise', 'cruises', 'resort', 'resorts'
  ],
  
  // 5. Entertainment - movies, theaters, concerts, events
  'entertainment': [
    'entertainment', 'movies', 'movie', 'movie theater', 'movie theatre',
    'theater', 'theatre', 'cinema', 'cinemas', 'concert', 'concerts',
    'events', 'live events', 'sports events', 'sporting events',
    'tickets', 'event tickets', 'show', 'shows', 'musical', 'musicals'
  ],
  
  // 6. Streaming - streaming services, subscriptions
  'streaming': [
    'streaming', 'streaming service', 'streaming services', 'streaming platform',
    'subscriptions', 'subscription', 'video streaming', 'music streaming',
    'netflix', 'spotify', 'hulu', 'prime video', 'disney plus', 'disney+',
    'apple tv', 'hbo max', 'paramount plus', 'peacock', 'youtube tv',
    'pandora', 'siriusxm', 'sirius xm'
  ],
  
  // 7. Drugstores - pharmacies, CVS, Walgreens
  'drugstores': [
    'drugstore', 'drugstores', 'drug store', 'drug stores',
    'pharmacy', 'pharmacies', 'cvs', 'walgreens', 'rite aid',
    'pharmacy store', 'health pharmacy'
  ],
  
  // 8. Home Improvement - hardware stores, home depot, lowes
  'home_improvement': [
    'home improvement', 'home improvements', 'home improvement store',
    'hardware', 'hardware store', 'hardware stores', 'home depot', 'home depot store',
    'lowes', 'lowes store', 'menards', 'ace hardware', 'true value',
    'home renovation', 'home repair', 'home remodeling', 'diy', 'do it yourself'
  ],
  
  // 9. Department Stores - shopping, retail stores
  'department_stores': [
    'department store', 'department stores', 'shopping', 'retail store',
    'retail stores', 'mall', 'shopping mall', 'shopping center',
    'macy', 'macys', 'nordstrom', 'kohls', 'jcpenney', 'jc penney',
    'dillards', 'belk', 'sears'
  ],
  
  // 10. Transit - public transportation, uber, lyft, taxis
  'transit': [
    'transit', 'public transit', 'public transportation', 'transportation',
    'taxi', 'taxis', 'cab', 'cabs', 'uber', 'lyft', 'rideshare', 'ride share',
    'ride sharing', 'ride-hailing', 'commute', 'commuting', 'metro', 'subway',
    'bus', 'bus fare', 'train', 'train fare', 'public transport'
  ],
  
  // 11. Utilities - electricity, water, internet, phone
  'utilities': [
    'utilities', 'utility', 'utility bill', 'utility bills', 'utility payment',
    'electricity', 'electric bill', 'electric bills', 'power', 'power bill',
    'water', 'water bill', 'water bills', 'sewer', 'sewer bill',
    'internet', 'internet bill', 'internet service', 'internet provider',
    'phone bill', 'phone bills', 'cell phone', 'cell phone bill',
    'cable', 'cable bill', 'cable tv', 'internet and cable'
  ],
  
  // 12. Warehouse - costco, sams club, warehouse clubs
  'warehouse': [
    'warehouse', 'warehouse store', 'warehouse stores', 'warehouse club',
    'warehouse clubs', 'costco', 'sams club', 'sams', "sam's club",
    'bj', 'bjs', "bj's wholesale", 'wholesale club', 'wholesale clubs',
    'bulk store', 'bulk stores'
  ],
  
  // 13. Office Supplies - office depot, staples, stationery
  'office_supplies': [
    'office supplies', 'office supply', 'office supply store',
    'office supply stores', 'office depot', 'staples', 'stationery',
    'stationary', 'office store', 'office stores', 'business supplies'
  ],
  
  // 14. Insurance - auto, health, car, home insurance
  'insurance': [
    'insurance', 'auto insurance', 'car insurance', 'vehicle insurance',
    'health insurance', 'medical insurance', 'home insurance', 'homeowners insurance',
    'renters insurance', 'rental insurance', 'life insurance',
    'insurance premium', 'insurance payment', 'insurance payments'
  ]
};

// Merchant synonyms and common names (specific merchants that may map to categories)
const MERCHANT_PATTERNS = {
  'costco': ['costco', 'costco wholesale'],
  'walmart': ['walmart', 'wal-mart', 'wal mart'],
  'target': ['target', 'target store'],
  'whole foods': ['whole foods', 'wholefoods', 'whole food'],
  'trader joes': ['trader joes', 'trader joe', 'traders joes'],
  'safeway': ['safeway'],
  'kroger': ['kroger'],
  'gas': ['gas station', 'chevron', 'shell', 'exxon', 'bp', '76'],
  'restaurant': ['restaurant', 'chipotle', 'mcdonalds', 'starbucks', 'cafe'],
  'grocery': ['supermarket', 'food shopping'],
  'travel': ['flight', 'hotel', 'airline', 'airbnb', 'booking', 'expedia'],
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
    tags: [],

    // NEW: Semantic entities for smart query handling
    queryType: null,    // 'comparison', 'listing', 'recommendation', 'timeframe', 'calculation'
    attribute: null,    // 'apr', 'balance', 'due_date', 'credit_limit', 'rewards', 'utilization'
    modifier: null,     // 'lowest', 'highest', 'best', 'worst', 'total', 'average'
    action: null        // 'show', 'list', 'find', 'calculate', 'compare'
  };

  console.log('[EntityExtractor] Extracting from:', query);

  // Extract category FIRST (before merchant to avoid conflicts)
  entities.category = extractCategory(query, doc);

  // Extract merchant (will skip if already matched as category)
  entities.merchant = extractMerchant(query, doc, entities.category);

  // Extract card name
  entities.cardName = extractCardName(query, doc);

  // Extract screen name
  entities.screenName = extractScreenName(query, doc);

  // Extract timeframe
  entities.timeframe = extractTimeframe(query, doc);

  // Extract amount
  entities.amount = extractAmountFromQuery(query, doc);
  entities.tags = extractTags(query);
  entities.isRememberCommand = /^tag\b/i.test(query) || /\bremember\b/i.test(query);

  // NEW: Extract semantic entities
  entities.queryType = extractQueryType(query, doc);
  entities.attribute = extractAttribute(query, doc);
  entities.modifier = extractModifier(query, doc);
  entities.action = extractAction(query, doc);

  console.log('[EntityExtractor] Extracted entities:', entities);

  return entities;
};

/**
 * Extract category from query
 * Categories are checked, with longer patterns prioritized to avoid partial matches
 */
const extractCategory = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Collect all patterns with their categories, sorted by length (longest first)
  const allPatterns = [];
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      allPatterns.push({
        category,
        pattern: pattern.toLowerCase(),
        length: pattern.length
      });
    }
  }
  
  // Sort by length (longest first) to prioritize longer matches like "food shopping" over "food"
  allPatterns.sort((a, b) => b.length - a.length);

  // Check each pattern (longest first)
  for (const { category, pattern } of allPatterns) {
    // Use word boundary matching to avoid partial matches
    // Handle both spaces and underscores in patterns
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${escapedPattern}\\b`, 'i');
    
    if (regex.test(lowerQuery)) {
      console.log('[EntityExtractor] Found category:', category, 'from pattern:', pattern);
      return category;
    }
  }

  // Special case: If query contains "costco" or specific merchant that maps to category,
  // and no other category was found, extract the category
  // But only if it's clearly a category query (e.g., "best card for costco" not "costco store")
  if (!lowerQuery.includes('store') && !lowerQuery.includes('shopping')) {
    if (lowerQuery.includes('costco') && lowerQuery.match(/\b(best|which|what|suggest|card|for)\b/i)) {
      // If query is like "best card for costco", treat as warehouse category
      return 'warehouse';
    }
    if (lowerQuery.includes('uber') && lowerQuery.match(/\b(best|which|what|suggest|card|for)\b/i)) {
      return 'transit';
    }
    if (lowerQuery.includes('lyft') && lowerQuery.match(/\b(best|which|what|suggest|card|for)\b/i)) {
      return 'transit';
    }
  }

  return null;
};

/**
 * Extract merchant name
 * Can extract merchant even if category is present (e.g., "travel at costco")
 */
const extractMerchant = (query, doc, extractedCategory = null) => {
  const lowerQuery = query.toLowerCase();

  // Check for merchant patterns
  for (const [merchant, patterns] of Object.entries(MERCHANT_PATTERNS)) {
    for (const pattern of patterns) {
      const patternLower = pattern.toLowerCase();
      
      // If category was extracted, don't extract merchant if it's the same word
      // (e.g., "travel" shouldn't be merchant if it's already category)
      if (extractedCategory) {
        const categoryPatterns = CATEGORY_PATTERNS[extractedCategory] || [];
        const isCategoryKeyword = categoryPatterns.some(catPattern => 
          catPattern.toLowerCase() === patternLower
        );
        if (isCategoryKeyword) {
          continue; // Skip this merchant pattern - it's the category keyword
        }
      }
      
      if (lowerQuery.includes(patternLower)) {
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
 * Extract tags from query
 * Supports patterns like:
 *  - "tag gifts"
 *  - "tags travel, food"
 *  - "tag with summer travel"
 *  - "#gifts"
 */
const extractTags = (query) => {
  const lowerQuery = query.toLowerCase();
  const tags = new Set();

  // Pattern: tag/tagged with ...
  const tagPattern = /(tag(?:ged)?(?:\s+(?:as|with))?\s+)([^\.,;]+)/gi;
  let match = tagPattern.exec(lowerQuery);
  while (match) {
    const raw = match[2]
      .replace(/['"]/g, '')
      .replace(/(?:and|&)/g, ',');
    raw.split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => tags.add(part));
    match = tagPattern.exec(lowerQuery);
  }

  // Pattern: tags: foo, bar
  const tagColonPattern = /tags?\s*[:=]\s*([^\.,;]+)/gi;
  match = tagColonPattern.exec(lowerQuery);
  while (match) {
    match[1].split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => tags.add(part));
    match = tagColonPattern.exec(lowerQuery);
  }

  // Pattern: #hashtag
  const hashPattern = /#([a-z0-9_\-]+)/gi;
  match = hashPattern.exec(lowerQuery);
  while (match) {
    tags.add(match[1]);
    match = hashPattern.exec(lowerQuery);
  }

  return Array.from(tags).map(tag =>
    tag
      .replace(/[^a-z0-9\s\-]/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
  ).filter(Boolean);
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
