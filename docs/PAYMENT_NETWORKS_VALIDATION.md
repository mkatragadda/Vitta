# Payment Networks Validation

## Overview

Vitta validates and supports **4 payment networks** across the system:

1. **Visa**
2. **Mastercard**
3. **Amex** (American Express - normalized)
4. **Discover**

---

## Network Validation Locations

### 1. Entity Extraction (`services/chat/entityExtractor.js`)

**Function:** `extractNetworkValue(query, doc)`

Extracts network names from user queries (e.g., "give me all visa cards").

```javascript
const networkPatterns = {
  'Visa': /\bvisa\b/i,
  'Mastercard': /\bmastercard\b/i,
  'Amex': /\bamex\b/i,
  'American Express': /\bamerican\s+express\b/i,
  'Discover': /\bdiscover\b/i
};
```

**Normalization:**
- "American Express" → normalized to "Amex"
- All other networks return as-is

**Location:** ```673:701:services/chat/entityExtractor.js
const extractNetworkValue = (query, doc) => {
  const lowerQuery = query.toLowerCase();
  
  // Network name patterns (case-insensitive)
  const networkPatterns = {
    'Visa': /\bvisa\b/i,
    'Mastercard': /\bmastercard\b/i,
    'Amex': /\bamex\b/i,
    'American Express': /\bamerican\s+express\b/i,
    'Discover': /\bdiscover\b/i
  };

  // Check each network pattern
  for (const [network, pattern] of Object.entries(networkPatterns)) {
    if (pattern.test(lowerQuery)) {
      console.log('[EntityExtractor] Found network value:', network);
      // Normalize Amex/American Express to consistent value
      return network === 'American Express' ? 'Amex' : network;
    }
  }

  return null;
};
```

---

### 2. Data Import Normalization (`scripts/loadCardsToDatabase.js`)

**Function:** `normalizeNetwork(network)`

Normalizes network names from CSV/data imports (uppercase/underscore format → standard format).

```javascript
function normalizeNetwork(network) {
  const mapping = {
    'AMERICAN_EXPRESS': 'Amex',
    'VISA': 'Visa',
    'MASTERCARD': 'Mastercard',
    'DISCOVER': 'Discover'
  };
  return mapping[network] || network;
}
```

**Supported Input Formats:**
- `AMERICAN_EXPRESS` → `Amex`
- `VISA` → `Visa`
- `MASTERCARD` → `Mastercard`
- `DISCOVER` → `Discover`
- Any other value → returns as-is (no validation)

**Location:** ```47:56:scripts/loadCardsToDatabase.js
// Map network names
function normalizeNetwork(network) {
  const mapping = {
    'AMERICAN_EXPRESS': 'Amex',
    'VISA': 'Visa',
    'MASTERCARD': 'Mastercard',
    'DISCOVER': 'Discover'
  };
  return mapping[network] || network;
}
```

---

### 3. Card Data Query Handler (`services/chat/cardDataQueryHandler.js`)

**Location:** Network filtering logic

Validates and filters cards by network when processing user queries.

**Normalization Logic:**
- "Amex" matches both `card_network = 'Amex'` and `card_network = 'American Express'`
- All other networks use exact match (case-insensitive)

```javascript
// Handle "Amex" vs "American Express"
if (normalizedNetwork === 'amex') {
  return cardNetwork === 'amex' || cardNetwork === 'american express';
}
return cardNetwork === normalizedNetwork;
```

**Location:** ```78:92:services/chat/cardDataQueryHandler.js
  // Network filter (e.g., "visa cards", "all mastercard cards")
  if (networkValue) {
    filteredCards = filteredCards.filter(c => {
      const cardNetwork = (c.card_network || '').toLowerCase();
      const normalizedNetwork = networkValue.toLowerCase();
      // Handle "Amex" vs "American Express"
      if (normalizedNetwork === 'amex') {
        return cardNetwork === 'amex' || cardNetwork === 'american express';
      }
      return cardNetwork === normalizedNetwork;
    });
    if (filteredCards.length === 0) {
      return `You don't have any **${networkValue}** cards in your wallet.\n\nAdd one in [My Wallet](vitta://navigate/cards)!`;
    }
  }
```

---

### 4. Database Schema (`supabase/schema.sql`)

**Column:** `card_network TEXT`

**Documentation:**
- Network type: "Visa", "Mastercard", "Amex", "Discover"

**Expected Values:**
- Standardized format: `Visa`, `Mastercard`, `Amex`, `Discover`
- No strict enum constraint (allows flexibility for future networks)
- Case-sensitive in storage, but queries use case-insensitive matching

**Location:** ```85:85:supabase/schema.sql
  card_network TEXT, -- Network type: "Visa", "Mastercard", "Amex", "Discover"
```

---

## Network Normalization Summary

| Input Format | Normalized Output | Notes |
|-------------|-------------------|-------|
| `visa` | `Visa` | User query extraction |
| `VISA` | `Visa` | CSV import normalization |
| `mastercard` | `Mastercard` | User query extraction |
| `MASTERCARD` | `Mastercard` | CSV import normalization |
| `amex` | `Amex` | User query extraction |
| `AMERICAN_EXPRESS` | `Amex` | CSV import normalization |
| `american express` | `Amex` | User query extraction (normalized) |
| `discover` | `Discover` | User query extraction |
| `DISCOVER` | `Discover` | CSV import normalization |

---

## Supported Query Patterns

Users can query cards by network using any of these patterns:

- "give me all **visa** cards"
- "show me all **mastercard** cards"
- "list all **amex** cards"
- "all **american express** cards"
- "**discover** cards"

All patterns are case-insensitive and will correctly filter cards by network.

---

## Future Considerations

### Adding New Networks

To add a new payment network (e.g., "Diners Club"):

1. **Entity Extraction** - Add pattern to `extractNetworkValue()`:
   ```javascript
   'Diners Club': /\b(?:diners|diners\s+club)\b/i
   ```

2. **Data Import** - Add mapping to `normalizeNetwork()`:
   ```javascript
   'DINERS_CLUB': 'Diners Club'
   ```

3. **Query Handler** - Filtering logic will automatically handle it if matching is case-insensitive

4. **Database** - No schema change needed (TEXT field allows any value)

---

## Testing

Network validation is tested in:
- `__tests__/unit/query/queryExecutor.test.js` - Network filtering
- `__tests__/unit/query/phase3Integration.test.js` - End-to-end queries
- Manual testing: "give me all visa cards" queries

---

## Related Files

- `services/chat/entityExtractor.js` - Network extraction from queries
- `services/chat/cardDataQueryHandler.js` - Network filtering logic
- `scripts/loadCardsToDatabase.js` - Network normalization for imports
- `scripts/generateCardInserts.js` - Network normalization for SQL generation
- `supabase/schema.sql` - Database schema definition

