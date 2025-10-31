# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vitta is a Next.js 14 application - your intelligent credit card platform. Vitta is like chatGPT of your wallet.The app helps users choose the best credit card for every purchase, optimize payments to minimize interest, and maximize rewards with AI-powered insights. Users will interact with app through chat interaface .

## Architecture

This is a **single-page application (SPA)** built with Next.js using a component-based architecture:

### Core Structure
- **Main Component**: `components/VittaApp.js` - Central app component managing authentication, routing, and screen states
- **Screen Components**: Individual feature screens (CreditCardScreen, PaymentOptimizer, etc.)
- **State Management**: React hooks for local state management (no external state library)
- **Routing**: Internal state-based routing (`currentScreen` state) rather than Next.js routing

### Key Components
- `VittaApp.js` - Main application container with authentication and screen navigation
- `VittaDocumentChat.js` - Document chat interface component
- `CreditCardScreen.js` - Credit card portfolio management interface
- `PaymentOptimizer.js` - Payment optimization recommendations
- `Dashboard.js` - Financial overview dashboard
- `StatementAnalyzer.js` - Document analysis interface
- `ExpenseFeedScreen.js` - Transaction feed and categorization
- `FamilyManagementScreen.js` - Family member coordination

### Pages Structure
- `pages/_app.js` - Next.js app wrapper with global styles and Google OAuth script
- `pages/_document.js` - Custom document wrapper
- `pages/index.js` - Entry point that renders VittaApp component

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Technology Stack

- **Framework**: Next.js 14
- **React**: 18.0.0
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Document Processing**: PDF.js (pdfjs-dist), pdf-parse
- **Build**: Next.js built-in bundler
- **Linting**: ESLint with Next.js config

## Key Features & Implementation Notes

### Authentication System
- Demo authentication (accepts any email/password)
- Google OAuth integration via Google Sign-In API
- User state managed in main component


### Credit Card Management
- Mock data for 3 sample cards (Chase, Amex, Citi) for demo flow 
- Real-time balance and utilization calculations
- Payment optimization recommendations

### Screen Navigation
- Internal routing via `currentScreen` state
- Screens: 'main', 'creditCards', 'paymentOptimizer', 'dashboard', etc.
- No Next.js router - all handled in main component

## Development Guidelines

### Component Patterns
- Functional components with React hooks
- State management via useState/useRef
- Props drilling for data sharing between components
- Inline styling with Tailwind CSS classes

### File Organization
- All components in `/components` directory
- Main application logic in VittaApp.js
- Global styles in `/styles/globals.css`
- Static assets in `/public`

### Styling Approach
- Tailwind CSS for all styling
- Responsive design with mobile-first approach
- Custom gradients and animations defined inline
- No custom CSS files beyond globals.css

### Data Flow
- Parent-child prop passing for data sharing
- Event handlers passed down as props
- Local component state for UI interactions
- No global state management library

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

## Testing

No test framework is currently configured. To add testing:
1. Install testing dependencies (Jest, React Testing Library)
2. Add test scripts to package.json
3. Create test files alongside components

## Building and Deployment

The application builds as a static Next.js app. Ensure all components render properly during build:
- Run `npm run build` to check for build errors
- Verify no console errors in development mode
- Test responsive design across different screen sizes

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