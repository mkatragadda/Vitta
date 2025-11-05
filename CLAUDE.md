# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📁 Project Organization

**IMPORTANT**: This project follows a strict organization structure:

- **Database Schema**: `supabase/schema.sql` - SINGLE SOURCE OF TRUTH for all tables and columns
- **Documentation**: `docs/` folder - All `.md` files (except this one and README.md)
- **Project Structure**: See `PROJECT_STRUCTURE.md` for complete file organization

**Rules**:
- ✅ Always check `supabase/schema.sql` for current database schema
- ❌ Never create schema files outside `supabase/` folder
- ❌ Never put schema information in `.md` files
- ✅ All documentation goes in `docs/` folder

## Project Overview

Vitta is a Next.js 14 application - your intelligent credit card platform. Vitta is like chatGPT of your wallet. The app helps users choose the best credit card for every purchase, optimize payments to minimize interest, and maximize rewards with AI-powered insights. Users interact with the app through a chat interface.

## Architecture

This is a **single-page application (SPA)** built with Next.js using a component-based architecture:

### Core Structure
- **Main Component**: `components/VittaApp.js` - Central app component managing authentication, routing, and screen states
- **Screen Components**: Individual feature screens (CreditCardScreen, PaymentOptimizer, etc.)
- **State Management**: React hooks for local state management (no external state library)
- **Routing**: Internal state-based routing (`currentScreen` state) rather than Next.js routing
- **Backend**: Next.js API routes in `pages/api/` for OpenAI proxy and embeddings

### AI/Chat Architecture
The app uses a hybrid NLP approach with OpenAI fallback:

1. **Intent Classification**:
   - V1 (`conversationEngine.js`): Uses `compromise.js` for local NLP
   - V2 (`conversationEngineV2.js`): Uses OpenAI embeddings + Supabase pgvector for similarity search

2. **OpenAI Integration**:
   - API key kept server-side via `pages/api/chat/completions.js` proxy
   - `OPENAI_API_KEY` must be in `.env.local` (not `NEXT_PUBLIC_`)
   - GPT-3.5-turbo fallback for complex queries

3. **Embedding-Based Intent Detection** (V2):
   - Pre-computed embeddings stored in Supabase `intent_embeddings` table
   - Vector similarity search for intent matching
   - Confidence thresholds: High (≥85%), Medium (70-84%), Low (<70%)
   - See `EMBEDDING_SETUP.md` for setup instructions

### Key Services
- `services/chat/conversationEngineV2.js` - Main conversation orchestrator (latest version)
- `services/chat/intentClassifier.js` - Intent detection using NLP
- `services/chat/entityExtractor.js` - Extract entities from user queries
- `services/chat/responseGenerator.js` - Generate responses based on intents
- `services/chat/cardDataQueryHandler.js` - Handle card-specific queries
- `services/embedding/embeddingService.js` - OpenAI embedding API wrapper
- `services/embedding/intentEmbeddings.js` - Intent examples and embedding generation
- `services/userService.js` - User database operations (Supabase)
- `services/cardService.js` - Credit card data management
- `services/deepLinkService.js` - Navigation deep links (vitta://navigate/)
- `services/cardAnalyzer.js` - Card recommendation logic

### Configuration Files
- `config/openai.js` - OpenAI model settings and system prompt
- `config/supabase.js` - Supabase client configuration
- `config/oauth.js` - Google OAuth configuration
- `config/intentDefinitions.js` - Intent definitions and patterns

### Key Components
- `VittaApp.js` - Main application container with authentication and screen navigation
- `VittaChatInterface.js` - Chat interface component
- `VittaDocumentChat.js` - Document chat interface component
- `CreditCardScreen.js` - Credit card portfolio management interface
- `PaymentOptimizer.js` - Payment optimization recommendations
- `Dashboard.js` - Financial overview dashboard
- `DashboardWithTabs.js` - Dashboard with tabbed navigation
- `StatementAnalyzer.js` - Document analysis interface
- `ExpenseFeedScreen.js` - Transaction feed and categorization
- `FamilyManagementScreen.js` - Family member coordination

### Pages Structure
- `pages/_app.js` - Next.js app wrapper with global styles and Google OAuth script
- `pages/_document.js` - Custom document wrapper with favicon configuration
- `pages/index.js` - Entry point that renders VittaApp component
- `pages/api/chat/completions.js` - OpenAI API proxy for chat
- `pages/api/embeddings.js` - OpenAI API proxy for embeddings

## Development Commands

```bash
# Start development server (default port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Setup intent embeddings (one-time, requires OpenAI API key)
node scripts/setupIntentEmbeddings.js
```

## Technology Stack

- **Framework**: Next.js 14 (App Router disabled, using Pages Router)
- **React**: 18.0.0
- **Styling**: Tailwind CSS with custom gradients
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **AI/NLP**:
  - OpenAI GPT-3.5-turbo (chat fallback)
  - OpenAI text-embedding-ada-002 (intent matching)
  - compromise.js (local NLP)
- **Document Processing**: PDF.js (pdfjs-dist), pdf-parse
- **Authentication**: Google OAuth + Demo mode
- **Build**: Next.js built-in bundler
- **Linting**: ESLint with Next.js config

## Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Supabase (required for user persistence and embeddings)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (required for AI features - keep server-side only)
OPENAI_API_KEY=sk-...

# Google OAuth (optional, for Google Sign-In)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Important**:
- `OPENAI_API_KEY` should NOT have `NEXT_PUBLIC_` prefix (server-side only)
- See `SUPABASE_SETUP.md` for Supabase configuration
- See `GOOGLE_OAUTH_SETUP.md` for Google OAuth setup
- See `EMBEDDING_SETUP.md` for embedding-based intent detection setup

## Key Features & Implementation Notes

### Authentication System
- **Demo Mode**: Accepts any email/password (no validation)
- **Google OAuth**: Integration via Google Sign-In API
- **User Persistence**: Google users saved to Supabase `users` table
- **User State**: Managed in `VittaApp.js` main component
- User data includes: email, name, picture URL, and linked cards

### Credit Card Management
- **Mock Data**: 3 sample cards (Chase Sapphire, Amex Gold, Citi Custom Cash) for demo
- **Card Service**: `services/cardService.js` handles card CRUD operations
- **Real-time Calculations**: Balance, utilization, APR tracking
- **Payment Optimization**: APR-based payment distribution recommendations
- **Rewards Logic**: Category bonus tracking (e.g., 4% groceries, 3% dining)

### AI Chat Features
- **Conversational Interface**: Floating chat widget available on all screens
- **Deep Links**: Markdown links with `vitta://navigate/` protocol for in-app navigation
- **Intent Detection**: 6 main intents (query_card_data, add_card, split_payment, navigate, help, small_talk)
- **Entity Extraction**: Extracts amounts, dates, categories, card names from queries
- **Context Awareness**: Maintains conversation history and user's card portfolio

### Screen Navigation
- **State-Based Routing**: Via `currentScreen` state in `VittaApp.js`
- **Available Screens**: 'main', 'cards', 'optimizer', 'dashboard', 'expenses', 'chat', 'family'
- **Deep Links**: Chat can navigate users with `vitta://navigate/screen_name`
- **No Next.js Router**: All routing handled internally in main component

## Development Guidelines

### Component Patterns
- **Functional Components**: All components use React hooks (no class components)
- **State Management**: `useState`, `useRef`, `useEffect` for local state
- **Props Drilling**: Data passed parent → child via props (no Context API)
- **Inline Styling**: Tailwind CSS classes directly in JSX

### File Organization
- **Components**: `/components/*.js` - All React components
- **Services**: `/services/**/*.js` - Business logic, API calls, data operations
- **Config**: `/config/*.js` - Configuration and constants
- **Pages**: `/pages/*.js` - Next.js pages (entry points)
- **API Routes**: `/pages/api/**/*.js` - Backend API endpoints
- **Styles**: `/styles/globals.css` - Global CSS only
- **Public**: `/public/*` - Static assets (favicon, images)

### Styling Approach
- **Tailwind CSS**: All styling via utility classes
- **Mobile-First**: Responsive design with `sm:`, `md:`, `lg:` breakpoints
- **Custom Gradients**: Defined inline (e.g., `bg-gradient-to-br from-purple-600 to-blue-500`)
- **Animations**: CSS transitions and transforms in Tailwind
- **No Custom CSS**: Avoid creating new CSS files beyond `globals.css`

### Data Flow
- **Props Drilling**: Parent → Child component data passing
- **Event Handlers**: Callbacks passed as props (e.g., `onNavigate`, `onCardAdd`)
- **Local State**: UI state in component, user data in `VittaApp.js`
- **No State Library**: No Redux, Zustand, or MobX - pure React state

### API Integration Best Practices
- **Server-Side Keys**: Keep `OPENAI_API_KEY` server-side (no `NEXT_PUBLIC_`)
- **API Proxies**: Use `/pages/api/*` routes to proxy OpenAI calls
- **Error Handling**: Always wrap API calls in try/catch with user-friendly fallbacks
- **Timeouts**: Set 30s timeout for OpenAI API calls (AbortController)
- **Rate Limiting**: Add delays between embedding generation (100ms recommended)

## Vitta Core Feature Priorities

Based on impact, feasibility for MVP/demo, and market differentiation, here are Vitta's prioritized core features:

### **Priority 1: High-Impact MVP Features**

### 🔐 Onboarding & Access

* **Google Sign-In** → quick entry, no friction with full account creation.
* **Manual Wallet Setup** → user can add cards *by type only* (e.g., *Amex Gold, Chase Freedom, Citi Custom Cash*) without card numbers.

---

### 💳 Core Features


1   **Chatinterface**

-User: “Add $50 cash grocery expense from yesterday.”
-Chatbot: Uses NLU to parse amount, category, date; stores in memory.
-User: “What cash expenses did I record this month?”
-Chatbot: Fetches matching entries from memory, summarizes conversationally.
-User: “Which card should I use at Amazon?”
-Chatbot: Runs payment reward logic, explains reasoning, offers direct link to card details.
-User: “Take me to privacy settings.”
-Chatbot: Presents deep link; user clicks, routed immediately.
  
   - Chatbot replies based on:
     - Cards in the user's wallet (manually added types)
     - Known reward categories per card type
     - Payment statement cycles + APR

2. **Auto-Optimized Credit Card Payment Recommendations**
   - Suggest monthly payment amounts per card based on APR, balance, and user's total budget
   - Key value driver to minimize interest and save money
   - Example: If user pays $1000/month for credit cards across 3 cards, Vitta suggests optimal distribution based on APR, available balance, and debt clearance strategy

3. **Best Card Recommendation (Based on Statement Cycle)**
   - For upcoming purchases, Vitta suggests which card is "cheapest" to use:
     - Avoiding interest by using cards still in the grace period
     - Maximizing rewards (cashback, points, miles)
     - Reducing risk of hitting high APR cards.

### 🧠 Differentiators in MVP

* No need to add sensitive card numbers — lowers onboarding friction.
* Optimizer + chatbot = **proactive + conversational** solution (not a static dashboard).
* Combines **rewards optimization + interest minimization** → solves both *short-term cash flow* and *long-term reward maximization*.

## Web App Wireframe Structure

### Core Screens & Navigation

1. **Login/Onboarding Screen**
   - Simple login/signup with OAuth (Google, Apple)
   - Guided onboarding to link credit cards and set monthly payment budget
   - Quick tutorial highlighting core value

2. **Dashboard (Home Screen)** 
   - Smart Payment Recommendations: Table showing each card with balance, APR, and recommended payment
   - Best Card Suggestions: for each time period within the month show card to use to avoid interest and also for each top merchant categories like food, grocery shopping, gas and travel show best card to use based on rewards from available added card types

3. **Payment Strategy Page** *(avoid "Payment Optimizer" naming)*
   - Detailed transaction list per card with filters
   - Editable payment recommendations with user override capability
   - Visual breakdown of interest saved by following recommendations

4. **AI Assistant Interface**
   - Floating chatbot available on all pages
   - Persistent conversation history with example prompts

5. **Settings & Profile**
   - User profile, security settings, linked accounts management
   - Notification preferences and privacy controls

### Design Principles
- Clear data visualization with progress bars and charts
- Mobile-first responsive design
- Progressive disclosure: summary first, details on demand
- Simple, consistent navigation

## Debugging and Common Issues

### Chat/AI Issues

**"OpenAI API error: 401"**
- Check `OPENAI_API_KEY` in `.env.local` (no `NEXT_PUBLIC_` prefix)
- Verify API key is valid and has credits
- Restart dev server after adding/changing env vars

**"No matches found" in intent detection**
- Run `node scripts/setupIntentEmbeddings.js` to generate embeddings
- Verify Supabase `intent_embeddings` table exists
- Check Supabase connection (NEXT_PUBLIC_SUPABASE_URL and ANON_KEY)

**Chat not responding**
- Check browser console for errors
- Verify `/api/chat/completions` route is accessible
- Check if rate limited by OpenAI (429 error)

### Google OAuth Issues

**"Failed to save user"**
- Verify Supabase credentials in `.env.local`
- Check `users` table exists in Supabase
- See `SUPABASE_SETUP.md` for table schema

**Google Sign-In button not appearing**
- Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`
- Verify Google OAuth script loads in `_app.js`
- Check browser console for Google API errors

### Build/Development Issues

**"Module not found" errors**
- Run `npm install` to ensure all dependencies are installed
- Clear `.next` directory: `rm -rf .next`
- Restart dev server

**Tailwind styles not applying**
- Check `tailwind.config.js` content paths include your files
- Verify component imports Tailwind classes correctly
- Run `npm run dev` to rebuild

### Performance Tips

**Console Logging**
- Services use `console.log` with prefixes: `[ServiceName]`
- Set `localStorage.debug = 'vitta:*'` for verbose logging
- Check conversation history: `localStorage.getItem('vitta_conversation_history')`

**Embedding Cache**
- Last 100 query embeddings cached in memory
- Clear cache: restart dev server
- Monitor cache hits in console logs

## Testing

No automated test framework is currently configured. Testing approach:

**Manual Testing**:
- Test authentication flows (demo + Google OAuth)
- Verify screen navigation and deep links
- Test chat with various queries (see `EMBEDDING_SETUP.md` for examples)
- Check responsive design across mobile/tablet/desktop
- Verify build: `npm run build` (must pass before deployment)

**To Add Automated Testing**:
1. Install: `npm install --save-dev jest @testing-library/react @testing-library/jest-dom`
2. Add test scripts to `package.json`
3. Create `__tests__` directories alongside components
4. Write tests for services first (business logic), then components (UI)

## Building and Deployment

The application builds as a Next.js app with API routes:

**Local Build**:
```bash
npm run build
npm start
```

**Pre-Deployment Checklist**:
- ✅ Run `npm run build` - must complete without errors
- ✅ Test all screens and navigation in production mode
- ✅ Verify chat functionality with OpenAI API
- ✅ Check responsive design on mobile/tablet/desktop
- ✅ Ensure `.env.local` values are set in deployment platform
- ✅ Test Google OAuth flow (if enabled)

**Environment Variables for Deployment**:
- Set all `.env.local` variables in your deployment platform (Vercel, Netlify, etc.)
- See `VERCEL_ENV_SETUP.md` for Vercel-specific instructions
- Never commit `.env.local` to git (already in `.gitignore`)

## Development Workflow & Guidelines

### Standard Workflow
1. **Analysis Phase**: First think through the problem, read the codebase for relevant files, and create a structured plan
2. **Planning**: Create todo items that can be checked off as you complete them
3. **Validation**: Check in with stakeholders before beginning work to verify the plan
4. **Implementation**: Work on todo items incrementally, marking them as complete
5. **Communication**: Provide high-level explanations of changes at each step
6. **Simplicity First**: Make every task and code change as simple as possible - avoid massive or complex changes
7. **Review**: Add summary of changes and relevant information

### Code Quality Standards
- **Naming Conventions**: Avoid "Payment Optimizer" terminology - use alternatives like "Payment Strategy", "Smart Payments", or "Payment Recommendations"
- **Component Structure**: Maintain the single-page app architecture with state-based routing
- **Responsive Design**: Ensure all new components work across mobile and desktop
- **Performance**: Keep bundle size minimal - avoid unnecessary dependencies
- **Accessibility**: Include proper ARIA labels and keyboard navigation support
- **Console Logs**: Use prefixed logs (e.g., `console.log('[ComponentName] message')`) for easier debugging

### Working with Chat/AI Features

When modifying the chat system:

1. **Intent Classification**:
   - Add new intents to `config/intentDefinitions.js`
   - Add example queries to `services/embedding/intentEmbeddings.js`
   - Re-run `node scripts/setupIntentEmbeddings.js` after changes

2. **Response Generation**:
   - Modify `services/chat/responseGenerator.js` for intent-based responses
   - Update `config/openai.js` system prompt for GPT fallback behavior
   - Test both local NLP and GPT fallback paths

3. **Deep Links**:
   - Use format: `[Link Text](vitta://navigate/screen_name)`
   - Available screens: cards, optimizer, dashboard, expenses, chat, family
   - Handled by `services/deepLinkService.js`

4. **Card Data Queries**:
   - `services/chat/cardDataQueryHandler.js` handles all card-related queries
   - Access user's cards via `userData.cards` array
   - Always check if user has cards before making recommendations

### Testing Strategy
- Manual testing across different screen sizes during development
- Verify build process (`npm run build`) before deployment
- Test authentication flow and screen transitions
- Validate PDF upload and processing functionality

### Security Considerations
- Demo authentication only - no real credential validation
- Client-side only processing for uploaded documents
- No sensitive data persistence beyond browser session
- Privacy-first approach aligning with manual data entry philosophy