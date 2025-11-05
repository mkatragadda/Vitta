# Vitta Project Structure

## 📁 Directory Organization

```
vitta-document-chat/
├── components/          # React UI components
├── config/             # Configuration files
├── docs/               # All documentation (consolidated)
├── pages/              # Next.js pages and API routes
├── public/             # Static assets
├── services/           # Business logic and API calls
├── styles/             # Global CSS
├── supabase/           # Database schemas and migrations
├── utils/              # Utility functions
├── CLAUDE.md           # Claude AI instructions (root)
├── README.md           # Project overview (root)
└── PROJECT_STRUCTURE.md # This file

```

---

## 🗄️ Database (Supabase)

### Single Source of Truth:
**`supabase/schema.sql`** - Master database schema

All database tables, columns, indexes defined here:
- `users` - User accounts
- `card_catalog` - Master card database (read-only)
- `user_credit_cards` - User's personal cards
- `intent_embeddings` - NLP embeddings
- `screen_deeplinks` - Navigation links
- `user_behavior` - User patterns

### Legacy Files (Moved):
- `supabase/CARDS_TABLE_SCHEMA.sql` → Part of `schema.sql`
- `supabase/SCREEN_DEEPLINKS_SCHEMA.sql` → Part of `schema.sql`
- `supabase/CARD_RECOMMENDATION_SCHEMA.sql` → Part of `schema.sql`

### Migrations:
- `supabase/migrations/` - Timestamped migration files

**Rule**: Always refer to `supabase/schema.sql` for current schema!

---

## 📚 Documentation (`docs/`)

### Setup & Configuration:
- **`SETUP_CHECKLIST.md`** - Quick start guide
- **`SUPABASE_SETUP.md`** - Database setup
- **`GOOGLE_OAUTH_SETUP.md`** - OAuth configuration
- **`EMBEDDING_SETUP.md`** - NLP embeddings setup
- **`VERCEL_ENV_SETUP.md`** - Deployment guide

### Architecture & Design:
- **`CARD_SELECTION_ARCHITECTURE.md`** - Card addition flow design
- **`CARD_RECOMMENDATION_SYSTEM.md`** - Recommendation engine
- **`INTELLIGENT_CHAT_SYSTEM.md`** - Chat/NLP architecture
- **`GRACE_PERIOD_IMPLEMENTATION.md`** - Grace period logic

### Implementation Guides:
- **`IMPLEMENTATION_SUMMARY.md`** - Card catalog integration
- **`TWO_STEP_FLOW_COMPLETE.md`** - Two-step UI implementation

**Rule**: All `.md` files (except CLAUDE.md, README.md) go in `docs/`!

---

## 🧩 Components (`components/`)

### Main Screens:
- `VittaApp.js` - Root application component
- `VittaChatInterface.js` - Main chat interface
- `DashboardWithTabs.js` - Financial dashboard
- `PaymentOptimizer.js` - Payment strategy screen
- `CreditCardScreen.js` - Legacy card management
- `RecommendationScreen.js` - Card discovery

### Card Addition Flow:
- `AddCardFlow.js` - Orchestrator (2-step flow)
- `CardBrowserScreen.js` - Step 1: Browse cards
- `CardDetailsForm.js` - Step 2: Enter details
- `CardSelectorModal.js` - Legacy modal (deprecated)

### Supporting Components:
- `VittaChatInterface.js` - Chat widget
- `ExpenseFeedScreen.js` - Transactions
- `FamilyManagementScreen.js` - Family features
- `StatementAnalyzer.js` - Document analysis

---

## ⚙️ Services (`services/`)

### Card Management:
- `cardService.js` - User card CRUD operations
  - `addCard()`, `getUserCards()`, `deleteCard()`
  - `addCardFromCatalog()` - Add from catalog
  - `addManualCard()` - Manual entry
  - `getOwnedCatalogIds()` - Filter owned cards

### Card Database:
- `cardDatabase/cardCatalogService.js` - Catalog operations
  - `getCardCatalog()`, `searchCards()`
  - `getTopCards()`, `getCardsByCategory()`

### Recommendations:
- `recommendations/recommendationEngine.js` - Main engine
- `recommendations/cardDiscoveryService.js` - Card suggestions
- `recommendations/cardAnalyzer.js` - Card scoring

### Chat/NLP:
- `chat/conversationEngineV2.js` - Chat orchestrator
- `chat/intentClassifier.js` - Intent detection
- `chat/entityExtractor.js` - Entity extraction
- `chat/responseGenerator.js` - Response generation

### Embeddings:
- `embedding/embeddingService.js` - OpenAI wrapper
- `embedding/intentEmbeddings.js` - Intent examples

### User:
- `userService.js` - User database operations
- `userBehavior/behaviorAnalyzer.js` - Pattern detection

### Navigation:
- `deepLinkService.js` - Deep link handling

---

## 🔧 Configuration (`config/`)

- `supabase.js` - Supabase client
- `oauth.js` - Google OAuth settings
- `openai.js` - OpenAI API configuration
- `intentDefinitions.js` - Intent patterns

---

## 🚀 API Routes (`pages/api/`)

- `chat/completions.js` - OpenAI chat proxy
- `embeddings.js` - OpenAI embeddings proxy

**Important**: API keys kept server-side (no `NEXT_PUBLIC_`)

---

## 🎨 Styling

### Global Styles:
- `styles/globals.css` - Global CSS only
- All component styles use **Tailwind CSS** utility classes

### Tailwind Config:
- `tailwind.config.js` - Tailwind configuration

---

## 🛠️ Utilities (`utils/`)

- `logger.js` - Logging utility with prefixes

---

## 📦 Package Management

- `package.json` - Dependencies and scripts
- `package-lock.json` - Lock file
- `.gitignore` - Git ignore rules

---

## 🌐 Environment Variables

### `.env.local` (Not in git):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=           # Server-side only (no NEXT_PUBLIC_)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

---

## 🏗️ Key Architectural Decisions

### 1. Database Schema
**Single Source of Truth**: `supabase/schema.sql`
- All tables defined here
- Includes seed data
- Self-documenting with comments

### 2. Card Catalog Integration
- Cards stored in `card_catalog` table
- Users reference with `catalog_id`
- Manual entries have `catalog_id = NULL`
- Images loaded from `image_url` field

### 3. Documentation
- All docs in `docs/` folder (except CLAUDE.md, README.md)
- Organized by category (setup, architecture, implementation)
- No duplicate schema info across files

### 4. Component Architecture
- Two-step card addition flow
- Functional components with hooks
- Props drilling (no Context API)
- Memoized views for performance

### 5. State Management
- React hooks (`useState`, `useEffect`)
- No external state library
- Local state in components
- User data in parent components

---

## 📋 Development Workflow

### Adding a New Feature:
1. Check `supabase/schema.sql` for database schema
2. Update schema if needed
3. Create/update services in `services/`
4. Create/update components in `components/`
5. Document in `docs/` if significant
6. Update `CLAUDE.md` if architectural change

### Database Changes:
1. Update `supabase/schema.sql` (single source of truth)
2. Create migration in `supabase/migrations/` if needed
3. Update services that interact with table
4. Document in relevant `docs/` file

### Documentation Changes:
1. Keep `CLAUDE.md` and `README.md` in root
2. All other `.md` files go in `docs/`
3. Avoid duplicate information
4. Cross-reference related docs

---

## 🚨 Important Rules

### Database:
✅ **DO**: Always refer to `supabase/schema.sql`
❌ **DON'T**: Create new schema `.sql` files in root
❌ **DON'T**: Put schema info in `.md` files

### Documentation:
✅ **DO**: Put docs in `docs/` folder
❌ **DON'T**: Scatter `.md` files in root
❌ **DON'T**: Duplicate schema across multiple files

### Code Organization:
✅ **DO**: Components in `components/`
✅ **DO**: Business logic in `services/`
✅ **DO**: Config in `config/`
❌ **DON'T**: Mix concerns

### Styling:
✅ **DO**: Use Tailwind utility classes
❌ **DON'T**: Create new CSS files

---

## 🎯 Quick Reference

**Need to**:
- **Check database schema** → `supabase/schema.sql`
- **Setup project** → `docs/SETUP_CHECKLIST.md`
- **Setup database** → `docs/SUPABASE_SETUP.md`
- **Understand architecture** → `docs/CARD_SELECTION_ARCHITECTURE.md`
- **See implementation** → `docs/TWO_STEP_FLOW_COMPLETE.md`
- **Configure Claude** → `CLAUDE.md` (root)

---

## 📊 File Count by Category

- **Components**: 15+ React components
- **Services**: 15+ service files
- **Documentation**: 12 `.md` files in `docs/`
- **Database**: 1 master schema + migrations
- **Config**: 4 configuration files
- **API Routes**: 2 proxy routes

---

## 🔄 Migration Path (If Schema Changes)

1. Edit `supabase/schema.sql` (single source)
2. Create migration:
   ```sql
   -- supabase/migrations/20250104_add_column.sql
   ALTER TABLE user_credit_cards ADD COLUMN new_field TEXT;
   ```
3. Run migration on Supabase
4. Update TypeScript types if needed
5. Update services that use the table

---

**Last Updated**: 2025-01-04
**Maintained By**: Development Team
**Version**: 1.0
