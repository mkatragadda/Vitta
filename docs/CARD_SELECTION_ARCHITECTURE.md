# Card Selection Architecture

## Overview
Users can add cards to their wallet in two ways:
1. **Select from Card Catalog** - Choose from pre-populated database of popular cards
2. **Manual Entry** - Enter card details manually if not found in catalog

## Architecture Components

### 1. Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Adds Card                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Search/Browse Card Catalog                        │
│  - Search by name (e.g., "Chase Sapphire")                 │
│  - Filter by category (Travel, Cashback, etc.)             │
│  - Browse popular cards                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
  ┌─────────┐          ┌──────────┐
  │  Found  │          │ Not Found│
  └────┬────┘          └────┬─────┘
       │                    │
       ▼                    ▼
┌────────────────┐   ┌──────────────────┐
│ Pre-fill Form  │   │ Manual Entry Form│
│ from Catalog   │   │                  │
└────────┬───────┘   └────────┬─────────┘
         │                    │
         └──────────┬─────────┘
                    ▼
        ┌───────────────────────┐
        │ User Adds Personal    │
        │ Details:              │
        │ - Credit Limit        │
        │ - Current Balance     │
        │ - Due Date            │
        │ - Statement Cycle     │
        └───────────┬───────────┘
                    ▼
        ┌───────────────────────┐
        │ Save to user_credit_  │
        │ cards with catalog_id │
        └───────────────────────┘
```

### 2. Database Schema

#### `card_catalog` Table (Read-only for users)
```sql
- id (uuid, primary key)
- card_name (text)
- issuer (text)
- card_network (text) - Visa, Mastercard, Amex, Discover
- reward_structure (jsonb) - { dining: 3, travel: 2, default: 1 }
- annual_fee (numeric)
- apr_min (numeric)
- apr_max (numeric)
- sign_up_bonus (jsonb)
- benefits (text[])
- category (text[]) - ['travel', 'cashback', 'dining']
- image_url (text)
- application_url (text)
- grace_period_days (integer)
- is_active (boolean)
- popularity_score (integer)
```

#### `user_credit_cards` Table (User's wallet)
```sql
- id (uuid, primary key)
- user_id (uuid, references users)
- catalog_id (uuid, references card_catalog) - NULL if manual entry
- card_name (text)
- card_type (text) - For legacy support
- issuer (text)
- card_network (text)
- reward_structure (jsonb)
- apr (numeric)
- credit_limit (numeric) - User-specific
- current_balance (numeric) - User-specific
- amount_to_pay (numeric) - User-specific
- due_date (date) - User-specific
- statement_cycle_start (date) - User-specific
- statement_cycle_end (date) - User-specific
- annual_fee (numeric)
- grace_period_days (integer)
- is_manual_entry (boolean) - TRUE if not from catalog
- created_at (timestamp)
- updated_at (timestamp)
```

### 3. Service Layer Architecture

#### `services/cardDatabase/cardCatalogService.js`
```javascript
// Existing:
- getCardCatalog(options) - Get all cards with filters
- searchCards(query, filters) - Search by name/issuer
- getCardById(cardId) - Get specific card details

// New:
- getPopularCards(limit) - Get most popular cards
- getCardsByCategory(category) - Get cards by category
- getCardsByIssuer(issuer) - Get cards by issuer
```

#### `services/cardService.js`
```javascript
// Existing:
- addCard(cardData) - Add card to user wallet
- getUserCards(userId) - Get user's cards
- deleteCard(cardId) - Remove card

// New/Updated:
- addCardFromCatalog(userId, catalogId, userDetails) - Add from catalog
- addManualCard(userId, cardData) - Add manual card
- updateCard(cardId, updates) - Update user card details
```

### 4. UI Component Architecture

#### New Component: `CardSelectorModal.js`
```
┌──────────────────────────────────────────┐
│  Add Credit Card to Your Wallet          │
├──────────────────────────────────────────┤
│  🔍 Search: [________________]           │
│                                           │
│  Quick Filters:                          │
│  [All] [Travel] [Cashback] [Dining]     │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ 📇 Chase Sapphire Preferred     │    │
│  │    Travel: 2x | Dining: 2x      │◀── Select
│  │    Annual Fee: $95               │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 📇 Amex Gold Card               │    │
│  │    Dining: 4x | Groceries: 4x   │    │
│  │    Annual Fee: $250              │    │
│  └─────────────────────────────────┘    │
│                                           │
│  Can't find your card?                   │
│  [Enter Manually Instead]                │
└──────────────────────────────────────────┘
```

#### Updated: `CreditCardScreen.js`
```
[Add Card] button → Opens CardSelectorModal
                    ↓
            ┌───────┴────────┐
            ▼                ▼
    From Catalog      Manual Entry
            │                │
            └───────┬────────┘
                    ▼
            Card Details Form
            (pre-filled or blank)
```

### 5. Card Discovery Integration

When showing Card Discovery recommendations:

```javascript
// In RecommendationScreen.js
const getNewCardSuggestions = async () => {
  // Get all catalog cards
  const allCatalogCards = await getCardCatalog();

  // Get user's current cards
  const userCards = await getUserCards(userId);

  // Extract catalog_ids user already owns
  const ownedCatalogIds = userCards
    .filter(c => c.catalog_id)
    .map(c => c.catalog_id);

  // Filter out cards user already has
  const availableCards = allCatalogCards.filter(
    card => !ownedCatalogIds.includes(card.id)
  );

  // Score and return suggestions
  return scoreCards(availableCards, strategy);
};
```

### 6. Implementation Steps

1. **Phase 1: Card Selection Modal**
   - Create CardSelectorModal component
   - Integrate with card catalog service
   - Add search and filter functionality

2. **Phase 2: Update Add Card Flow**
   - Update CreditCardScreen to use modal
   - Handle catalog selection vs manual entry
   - Pre-fill forms from catalog data

3. **Phase 3: Update Card Service**
   - Add catalog_id field tracking
   - Create addCardFromCatalog method
   - Maintain backward compatibility

4. **Phase 4: Update Discovery Screen**
   - Filter out owned cards by catalog_id
   - Show only unowned cards in suggestions
   - Handle manual entries (no catalog_id)

5. **Phase 5: Enhancements**
   - Card comparison feature
   - Bulk import from catalog
   - Card upgrade suggestions

## Benefits

1. **Better User Experience**
   - Fast card addition with search
   - Pre-populated card details
   - No need to remember APR/fees

2. **Data Accuracy**
   - Consistent reward structures
   - Accurate APR ranges
   - Up-to-date benefits

3. **Smart Recommendations**
   - Only show cards user doesn't have
   - Category-based suggestions
   - Personalized based on strategy

4. **Flexibility**
   - Manual entry still available
   - Edit catalog card details
   - Custom cards supported

## Example User Flow

### Scenario: User adds Chase Sapphire Preferred

1. User clicks "Add Card" in My Wallet
2. Modal opens with search bar
3. User types "Chase Sap"
4. Results show "Chase Sapphire Preferred"
5. User clicks on card
6. Form pre-fills:
   - Card Name: Chase Sapphire Preferred
   - Issuer: Chase
   - APR: 21.49%
   - Annual Fee: $95
   - Rewards: { travel: 2, dining: 2, default: 1 }
7. User enters personal details:
   - Credit Limit: $10,000
   - Current Balance: $0
   - Due Date: 15th
8. Card saved with catalog_id reference
9. Card Discovery no longer shows Chase Sapphire Preferred

## Data Migration

For existing users with manual cards:
- Keep existing cards as is
- Mark them with `is_manual_entry = true`
- Optionally match to catalog later
- No disruption to current functionality
