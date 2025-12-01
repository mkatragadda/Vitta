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
    action: null,       // 'show', 'list', 'find', 'calculate', 'compare'
    balanceFilter: null, // 'with_balance', 'zero_balance', 'no_balance' - filter cards by balance status
    networkValue: null, // 'Visa', 'Mastercard', 'Amex', 'Discover' - extracted network value for filtering
    issuerValue: null,  // 'Chase', 'Citi', etc. - extracted issuer value for filtering
    
    // Phase 2: Query system entities
    distinctQuery: null,      // { isDistinct: boolean, field: string | null }
    compoundOperators: null,  // { logicalOperators: string[] }
    grouping: null,           // { groupBy: string | null }
    aggregation: null         // { operation: string, field: string | null }
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
  entities.balanceFilter = extractBalanceFilter(query, doc);
  entities.networkValue = extractNetworkValue(query, doc);
  entities.issuerValue = extractIssuerValue(query, doc);

  // Phase 2: Extract query system entities
  entities.distinctQuery = extractDistinctIndicator(query, doc);
  entities.compoundOperators = extractCompoundOperators(query, doc);
  entities.grouping = extractGrouping(query, doc);
  entities.aggregation = extractAggregationOperation(query, doc);

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
 * 
 * Maps natural language terms to database field names.
 * Priority order: more specific patterns first.
 */
const extractAttribute = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Check most specific patterns FIRST (multi-word, unambiguous)
  
  // Grace period (very specific, check before "grace" alone or "period" alone)
  if (/\bgrace\s+period\b/.test(lowerQuery) || /\binterest\s+free\s+days\b/.test(lowerQuery) || /\bdays\s+grace\b/.test(lowerQuery)) {
    return 'grace_period';
  }

  // Statement close (check before other "close" matches)
  if (/\bstatement\s+close\b/.test(lowerQuery) || /\bstatement\s+cycle\s+end\b/.test(lowerQuery) || /\bstatement\s+end\b/.test(lowerQuery) ||
      /\bwhen\s+.*statement\s+close\b/.test(lowerQuery) || /\bclose\s+date\b/.test(lowerQuery)) {
    return 'statement_close';
  }

  // Statement start (check before other "start" matches)
  if (/\bstatement\s+start\b/.test(lowerQuery) || /\bstatement\s+cycle\s+start\b/.test(lowerQuery) || /\bcycle\s+start\b/.test(lowerQuery)) {
    return 'statement_start';
  }

  // Payment due date (check before generic "due" or "payment")
  if (/\bpayment\s+due\s+date\b/.test(lowerQuery) || /\bdue\s+date\b/.test(lowerQuery) || /\bwhen\s+.*due\b/.test(lowerQuery) ||
      /\bwhen\s+.*payment\s+due\b/.test(lowerQuery) || /\bdue\s+dates?\b/.test(lowerQuery)) {
    return 'due_date';
  }

  // Payment amount (check before generic "payment")
  if (/\bpayment\s+amount\b/.test(lowerQuery) || /\bhow\s+much\s+.*pay\b/.test(lowerQuery) || /\bminimum\s+payment\b/.test(lowerQuery) || /\bamount\s+.*pay\b/.test(lowerQuery) ||
      /\bpayment\s+amounts?\b/.test(lowerQuery)) {
    return 'payment_amount';
  }

  // Credit limit (specific, check before generic "limit")
  if (/\bcredit\s+limit\b/.test(lowerQuery) || /\bmaximum\s+credit\b/.test(lowerQuery) || /\bcredit\s+limits?\b/.test(lowerQuery)) {
    return 'credit_limit';
  }

  // Available credit (check before generic "available")
  if (/\bavailable\s+credit\b/.test(lowerQuery) || /\bremaining\s+credit\b/.test(lowerQuery) || /\bfree\s+credit\b/.test(lowerQuery)) {
    return 'available_credit';
  }

  // Card network (check before generic "network" or "payment")
  if (/\bcard\s+network\b/.test(lowerQuery) || /\bpayment\s+network\b/.test(lowerQuery)) {
    return 'card_network';
  }

  // Card name (check before generic "name")
  if (/\bcard\s+name\b/.test(lowerQuery) || /\bcard\s+title\b/.test(lowerQuery) || 
      /\bname\s+of\s+(?:my|this)\s+card\b/.test(lowerQuery) || /\bwhat\s+(?:is|was)\s+(?:the|my)\s+card\b/.test(lowerQuery)) {
    return 'card_name';
  }

  // Card type (check before generic "type")
  if (/\bcard\s+type\b/.test(lowerQuery) || /\bkind\s+.*card\b/.test(lowerQuery) || /\bcard\s+kind\b/.test(lowerQuery)) {
    return 'card_type';
  }

  // Nickname (specific)
  if (/\b(nickname|card\s+nickname|nick|alias)\b/.test(lowerQuery)) {
    return 'nickname';
  }

  // Annual fee (check before generic "fee")
  if (/\bannual\s+fee\b/.test(lowerQuery) || /\byearly\s+fee\b/.test(lowerQuery)) {
    return 'annual_fee';
  }

  // APR / Interest Rate (specific terms)
  if (/\bapr\b/.test(lowerQuery) || /\bannual\s+percentage\s+rate\b/.test(lowerQuery) || /\binterest\s+rate\b/.test(lowerQuery)) {
    return 'apr';
  }

  // Balance / Debt (common query)
  if (/\b(balance|balances|debt|owe|owing|outstanding)\b/.test(lowerQuery)) {
    return 'balance';
  }

  // Available credit
  if (/\b(available.*credit|available|can.*spend|remaining.*credit|free.*credit)\b/.test(lowerQuery)) {
    return 'available_credit';
  }

  // Utilization
  if (/\b(utilization|usage|percent.*used|using|credit.*usage)\b/.test(lowerQuery)) {
    return 'utilization';
  }

  // Less specific patterns (after specific patterns checked)
  
  // Utilization (specific term)
  if (/\butilization\b/.test(lowerQuery) || (/\busage\b/.test(lowerQuery) && /\b(credit|percent)\b/.test(lowerQuery))) {
    return 'utilization';
  }

  // Rewards (check before generic "earn")
  if (/\b(rewards?|points?|cashback|miles|cash\s+back)\b/.test(lowerQuery) || (/\bearn\b/.test(lowerQuery) && /\b(rewards?|points?)\b/.test(lowerQuery))) {
    return 'rewards';
  }

  // Generic terms (lowest priority - check last)
  // Credit limit - generic "limit"
  if (/\blimit\b/.test(lowerQuery) && !/\bcredit\s+limit\b/.test(lowerQuery)) {
    return 'credit_limit';
  }

  // Annual fee - generic "fee"
  if (/\bfee\b/.test(lowerQuery) && !/\bannual\s+fee\b/.test(lowerQuery)) {
    return 'annual_fee';
  }

  // Grace period - generic "grace"
  if (/\bgrace\b/.test(lowerQuery) && !/\bgrace\s+period\b/.test(lowerQuery)) {
    return 'grace_period';
  }

  // Issuer (often handled via distinct queries)
  if (/\b(issuer|bank|banking|card\s+issuer|financial\s+institution)\b/.test(lowerQuery)) {
    return 'issuer';
  }

  // Card network - generic "network" or network names
  if (/\bnetwork\b/.test(lowerQuery) && !/\bcard\s+network\b/.test(lowerQuery)) {
    return 'card_network';
  }
  
  // Network names (visa, mastercard, etc.) - check last as they're often in filters, not attributes
  if (/\b(visa|mastercard|amex|discover)\s+cards?\b/.test(lowerQuery)) {
    return 'card_network';
  }

  return null;
};

/**
 * Extract network value from query (Visa, Mastercard, Amex, Discover)
 * @param {string} query - User query
 * @param {Object} doc - NLP document
 * @returns {string|null} - Network value (normalized) or null
 */
const extractNetworkValue = (query, doc) => {
  const lowerQuery = query.toLowerCase();
  
  // Network name patterns (case-insensitive)
  // Handle variations: "visa", "mastercard"/"master card"/"mastercards"/"master cards", "amex"/"american express", "discover"
  const networkPatterns = {
    'Visa': /\bvisa\b/i,
    'Mastercard': /\bmaster\s*card(s)?\b/i,  // Matches "mastercard", "master card", "mastercards", "master cards"
    'Amex': /\bamex\b/i,
    'American Express': /\bamerican\s+express\b/i,
    'Discover': /\bdiscover\b/i
  };

  // Check each network pattern (order matters - check American Express before Amex)
  // First check for multi-word patterns
  if (networkPatterns['American Express'].test(lowerQuery)) {
    console.log('[EntityExtractor] Found network value: Amex');
    return 'Amex';
  }
  
  // Then check single-word patterns
  for (const [network, pattern] of Object.entries(networkPatterns)) {
    // Skip American Express (already checked above)
    if (network === 'American Express') continue;
    
    if (pattern.test(lowerQuery)) {
      console.log('[EntityExtractor] Found network value:', network);
      return network;
    }
  }

  return null;
};

/**
 * Extract issuer value from query (Chase, Citi, etc.)
 * @param {string} query - User query
 * @param {Object} doc - NLP document
 * @returns {string|null} - Issuer value (normalized) or null
 */
const extractIssuerValue = (query, doc) => {
  const lowerQuery = query.toLowerCase();
  
  // Common issuer patterns
  const issuerPatterns = [
    { pattern: /\bchase\b/i, value: 'Chase' },
    { pattern: /\bciti\b/i, value: 'Citi' },
    { pattern: /\bcitibank\b/i, value: 'Citi' },
    { pattern: /\bamerican\s+express\b/i, value: 'American Express' },
    { pattern: /\bamex\b/i, value: 'American Express' },
    { pattern: /\bcapital\s+one\b/i, value: 'Capital One' },
    { pattern: /\bdiscover\b/i, value: 'Discover' },
    { pattern: /\bbank\s+of\s+america\b/i, value: 'Bank of America' },
    { pattern: /\bbofa\b/i, value: 'Bank of America' },
    { pattern: /\bwells\s+fargo\b/i, value: 'Wells Fargo' }
  ];

  // Check each issuer pattern
  for (const { pattern, value } of issuerPatterns) {
    if (pattern.test(lowerQuery)) {
      console.log('[EntityExtractor] Found issuer value:', value);
      return value;
    }
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
  if (/\blongest\b/.test(lowerQuery)) return 'highest'; // "longest grace period" = highest grace period
  if (/\bshortest\b/.test(lowerQuery)) return 'lowest'; // "shortest grace period" = lowest grace period
  if (/\bbest\b/.test(lowerQuery)) return 'best';
  if (/\bworst\b/.test(lowerQuery)) return 'worst';
  if (/\btotal\b/.test(lowerQuery)) return 'total';
  if (/\baverage\b/.test(lowerQuery)) return 'average';
  if (/\bmost\b/.test(lowerQuery)) return 'most'; // "most available credit" - can be treated as highest or most
  if (/\bleast\b/.test(lowerQuery)) return 'least';

  return null;
};

/**
 * Extract balance filter - are they filtering by balance status?
 * Detects patterns like "with balance", "only with balance", "zero balance", "no balance", "paid off"
 */
const extractBalanceFilter = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Patterns for cards WITH balance (non-zero)
  if (/\b(?:only\s+)?(?:with|having|that have|that has)\s+balance/i.test(lowerQuery)) {
    console.log('[EntityExtractor] Found balance filter: with_balance');
    return 'with_balance';
  }
  if (/\bcards?\s+(?:with|having)\s+balance/i.test(lowerQuery)) {
    console.log('[EntityExtractor] Found balance filter: with_balance');
    return 'with_balance';
  }
  if (/\bbalance[s]?(?:\s+only)?(?!\s+(?:is|are|of|zero|no))/i.test(lowerQuery) && 
      /(?:list|show|cards?)/.test(lowerQuery)) {
    // "list cards with balance" or "show cards balance"
    // But NOT "zero balance" or "no balance"
    if (!/\bzero\b/.test(lowerQuery) && !/\bno\b.*balance/.test(lowerQuery)) {
      console.log('[EntityExtractor] Found balance filter: with_balance (implicit)');
      return 'with_balance';
    }
  }

  // Patterns for cards with ZERO balance (paid off)
  if (/\bzero\s+balance/i.test(lowerQuery)) {
    console.log('[EntityExtractor] Found balance filter: zero_balance');
    return 'zero_balance';
  }
  if (/\bno\s+balance/i.test(lowerQuery)) {
    console.log('[EntityExtractor] Found balance filter: zero_balance');
    return 'zero_balance';
  }
  if (/\b(?:paid\s+off|paid\s+in\s+full|no\s+debt|all\s+paid)/i.test(lowerQuery)) {
    console.log('[EntityExtractor] Found balance filter: zero_balance (paid off)');
    return 'zero_balance';
  }
  if (/\b\$0\s+balance/i.test(lowerQuery)) {
    console.log('[EntityExtractor] Found balance filter: zero_balance ($0)');
    return 'zero_balance';
  }
  // Pattern: "0 dollars balance" or "0 dollar balance"
  if (/\b0\s+(?:dollar|dollars)\s+balance/i.test(lowerQuery)) {
    console.log('[EntityExtractor] Found balance filter: zero_balance (0 dollars)');
    return 'zero_balance';
  }
  // Pattern: "cards with 0 balance" or "0 balance cards"
  if (/\b0\s+balance/i.test(lowerQuery) || /\bbalance.*\b0\b/i.test(lowerQuery)) {
    console.log('[EntityExtractor] Found balance filter: zero_balance (0)');
    return 'zero_balance';
  }

  return null;
};

/**
 * Phase 2: Extract distinct query indicator
 * Detects queries like "what are the different issuers", "what networks do I have"
 * 
 * @param {string} query - User query
 * @param {Object} doc - NLP document
 * @returns {Object|null} - { isDistinct: boolean, field: string | null }
 */
const extractDistinctIndicator = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Keywords that STRONGLY indicate distinct queries (exclude generic action words)
  const distinctKeywords = [
    'different', 'various', 'varied', 'diverse',
    'breakdown', 'distribution', 'categorization'
  ];
  
  // Phrases that require distinct keyword context (more specific patterns)
  const distinctPhrases = [
    /what\s+are\s+(?:the|all|different|various|types|kinds)/i,
    /what\s+(?:networks|issuers|types|kinds)\s+(?:do\s+I\s+have|are|in)/i,
    /how\s+many\s+(?:different|various|types)/i,
    /number\s+of\s+(?:different|various)/i,
    /all\s+(?:the|of\s+the)\s+(?:different|various|types|kinds|issuers|networks)/i,
    /grouped\s+by/i,
    /breakdown\s+(?:by|of)/i,
    /distribution\s+(?:by|of)/i
  ];

  // Field keywords that map to card fields
  const fieldPatterns = {
    'issuer': ['issuer', 'issuers', 'bank', 'banks', 'card issuer', 'financial institution'],
    'card_network': ['network', 'networks', 'card network', 'payment network', 'credit card network'],
    'card_type': ['type', 'types', 'card type', 'card types', 'kinds of cards', 'kinds'],
    'issuer': ['issuer', 'issuers'] // Keep for backward compatibility
  };

  // Check if query contains distinct keywords or phrases
  const hasDistinctPhrase = distinctPhrases.some(phrase => phrase.test(lowerQuery));
  
  const hasDistinctKeyword = distinctKeywords.some(keyword => {
    // Handle multi-word keywords
    if (keyword.includes(' ')) {
      return lowerQuery.includes(keyword);
    }
    return new RegExp(`\\b${keyword}\\b`, 'i').test(lowerQuery);
  });
  
  // Only return distinct if we have STRONG indicators (keyword or phrase)
  if (!hasDistinctKeyword && !hasDistinctPhrase) {
    return null;
  }
  
  // Additional check: exclude simple action queries without distinct context
  // Pattern: "show me my cards", "list cards", "tell me cards"
  // Only exclude if NO distinct keyword/phrase matched
  const simpleActionPattern = /^(show|list|tell)\s+(?:me|my|all)\s+(?:my|the|all|cards?|card)\s*$/i;
  if (simpleActionPattern.test(lowerQuery.trim()) && !hasDistinctKeyword && !hasDistinctPhrase) {
    return null;
  }

  // Determine which field they're asking about
  let detectedField = null;
  for (const [field, patterns] of Object.entries(fieldPatterns)) {
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerQuery)) {
        detectedField = field;
        console.log('[EntityExtractor] Found distinct query for field:', field);
        break;
      }
    }
    if (detectedField) break;
  }

  return {
    isDistinct: true,
    field: detectedField || 'issuer' // Default to issuer if field not detected
  };
};

/**
 * Phase 2: Extract compound filter operators (AND/OR)
 * Detects queries with multiple conditions like "visa cards with balance over 5000 and APR less than 25"
 * 
 * @param {string} query - User query
 * @param {Object} doc - NLP document
 * @returns {Object} - { logicalOperators: string[] }
 */
const extractCompoundOperators = (query, doc) => {
  const lowerQuery = query.toLowerCase();
  const logicalOperators = [];

  // Detect AND operators
  const andPatterns = [
    /\band\b/i,
    /\s+&\s+/,
    /\s+\+\s+/,
    /,.*(?:with|that|and)/i
  ];

  // Detect OR operators
  const orPatterns = [
    /\bor\b/i,
    /\s+\|\s+/,
    /,\s*(?:or)/i
  ];

  // Count AND occurrences
  andPatterns.forEach(pattern => {
    const matches = lowerQuery.match(pattern);
    if (matches) {
      matches.forEach(() => logicalOperators.push('AND'));
    }
  });

  // Count OR occurrences
  orPatterns.forEach(pattern => {
    const matches = lowerQuery.match(pattern);
    if (matches) {
      matches.forEach(() => logicalOperators.push('OR'));
    }
  });

  // If we have multiple conditions but no explicit operator, default to AND
  // Look for multiple filter-like patterns
  const filterIndicators = [
    /\b(with|having|that have|that has)\b/i,
    /\b(over|above|greater than|more than)\b/i,
    /\b(under|below|less than|below)\b/i,
    /\b(equal to|exactly)\b/i
  ];

  let filterCount = 0;
  filterIndicators.forEach(pattern => {
    const matches = lowerQuery.match(pattern);
    if (matches) filterCount += matches.length;
  });

  // If we have 2+ filter indicators but no explicit operators, infer AND
  if (filterCount >= 2 && logicalOperators.length === 0) {
    // Add AND operators for implicit conditions
    for (let i = 0; i < filterCount - 1; i++) {
      logicalOperators.push('AND');
    }
  }

  return {
    logicalOperators: logicalOperators.length > 0 ? logicalOperators : []
  };
};

/**
 * Phase 2: Extract grouping indicator
 * Detects queries like "by issuer", "grouped by network", "breakdown by issuer"
 * 
 * @param {string} query - User query
 * @param {Object} doc - NLP document
 * @returns {Object|null} - { groupBy: string | null }
 */
const extractGrouping = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Patterns for grouping
  const groupPatterns = [
    /(?:by|grouped by|group by|organized by)\s+(\w+)/i,
    /breakdown\s+(?:by|of)\s+(\w+)/i,
    /distribution\s+(?:by|of)\s+(\w+)/i
  ];

  const fieldPatterns = {
    'issuer': ['issuer', 'issuers', 'bank', 'banks'],
    'card_network': ['network', 'networks', 'card network'],
    'card_type': ['type', 'types', 'card type']
  };

  for (const pattern of groupPatterns) {
    const match = lowerQuery.match(pattern);
    if (match && match[1]) {
      const matchedField = match[1].toLowerCase();
      
      // Map to actual field name
      for (const [field, patterns] of Object.entries(fieldPatterns)) {
        if (patterns.some(p => matchedField.includes(p) || p.includes(matchedField))) {
          console.log('[EntityExtractor] Found grouping by:', field);
          return { groupBy: field };
        }
      }
      
      // Return matched field if no mapping found (let QueryBuilder handle validation)
      return { groupBy: matchedField };
    }
  }

  return null;
};

/**
 * Phase 2: Extract aggregation operation
 * Detects queries like "total balance", "average APR", "how many cards", "sum of balances"
 * 
 * @param {string} query - User query
 * @param {Object} doc - NLP document
 * @returns {Object|null} - { operation: string, field: string | null }
 */
const extractAggregationOperation = (query, doc) => {
  const lowerQuery = query.toLowerCase();

  // Aggregation operation patterns
  const aggregationPatterns = {
    'sum': ['total', 'sum', 'add up', 'sum of', 'total of', 'combined', 'together'],
    'avg': ['average', 'avg', 'mean', 'typical'],
    'count': ['how many', 'number of', 'count', 'how much'],
    'min': ['minimum', 'min', 'lowest', 'smallest', 'least'],
    'max': ['maximum', 'max', 'highest', 'largest', 'most']
  };

  // Field patterns that might be aggregated
  const fieldPatterns = {
    'current_balance': ['balance', 'balances', 'debt', 'owed', 'amount due'],
    'apr': ['apr', 'interest rate', 'rate', 'percentage'],
    'credit_limit': ['limit', 'credit limit', 'max credit'],
    'utilization': ['utilization', 'usage', 'used']
  };

  let detectedOperation = null;
  let detectedField = null;

  // Find aggregation operation
  for (const [operation, patterns] of Object.entries(aggregationPatterns)) {
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerQuery)) {
        detectedOperation = operation;
        console.log('[EntityExtractor] Found aggregation operation:', operation);
        break;
      }
    }
    if (detectedOperation) break;
  }

  // Find field if operation detected
  if (detectedOperation) {
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'i');
        if (regex.test(lowerQuery)) {
          detectedField = field;
          console.log('[EntityExtractor] Found aggregation field:', field);
          break;
        }
      }
      if (detectedField) break;
    }
  }

  if (detectedOperation) {
    return {
      operation: detectedOperation,
      field: detectedField || null
    };
  }

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
