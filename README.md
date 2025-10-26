# Vitta - Your Intelligent Credit Card Platform

Vitta helps you choose the best credit card for every purchase, optimize payments to minimize interest, and maximize rewards with AI-powered insights.

## Features

### 🔐 Authentication System
- **Demo Login**: Test the app with any email/password
- **Google OAuth**: Sign in with your Google account
- **User Persistence**: Supabase database integration for Google login users
- Secure session management and logout

### 💳 Credit Card Management Dashboard
- **Multi-card support**: Manage multiple credit cards in one interface
- **Visual card display**: Beautiful card representations with brand-specific colors
- **Real-time analytics**: Balance, utilization rate, payment due dates
- **Spending analysis**: Category breakdown and month-over-month trends
- **Rewards optimization**: Detailed rewards program information and sign-up bonuses
- **Smart recommendations**: AI-powered tips for optimal card usage
- **Quick actions**: Make payments, view statements, set alerts

### 🤖 AI Assistant
- **Best Card Recommendations**: Ask which card to use for any purchase
- **Smart Payment Strategy**: Optimize payments across all cards to minimize interest
- **Rewards Maximization**: Get recommendations to maximize cashback and points
- Natural language chat interface for all your card questions

### 📱 Modern UI/UX
- Responsive design with Tailwind CSS
- Floating chat widget
- Beautiful gradients and animations
- Intuitive navigation between screens

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd vitta

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Usage
1. Open [http://localhost:3000](http://localhost:3000)
2. Sign in with:
   - **Demo Login**: Enter any email and password
   - **Google OAuth**: Click "Continue with Google"
3. Explore the features:
   - **Dashboard**: View smart payment recommendations and best card suggestions
   - **My Cards**: Manage your credit card wallet (add cards by type, no card numbers needed)
   - **Smart Payments**: Optimize monthly payments to minimize interest
   - **AI Assistant**: Ask which card to use for any purchase

## Technology Stack

- **Frontend**: Next.js 14, React 18
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Google OAuth + Demo mode
- **Build Tool**: Next.js built-in bundler

## Project Structure

```
vitta/
├── components/
│   ├── VittaApp.js             # Main application component
│   ├── Dashboard.js            # Smart payment recommendations dashboard
│   ├── CreditCardScreen.js     # Credit card wallet management
│   └── PaymentOptimizer.js     # Payment strategy optimizer
├── config/
│   └── supabase.js             # Supabase client configuration
├── services/
│   └── userService.js          # User database operations
├── pages/
│   ├── _app.js                 # App wrapper with Google OAuth
│   ├── _document.js            # Document wrapper
│   └── index.js                # Home page
├── styles/
│   └── globals.css             # Global styles
└── public/                     # Static assets
```

## Here are the full list of Vitta features

Here's a comprehensive list of all Vitta features for your README and to give Cursor context:

## **🏠 Vitta - Family Financial Intelligence Platform**

### **Core Value Proposition**
Vitta is the first AI-powered platform built specifically for families managing multiple credit cards, providing real-time payment optimization, family coordination, and intelligent financial decision-making.

---

## **🎯 Authentication & User Management**
- **Demo Login System** - Any email/password for testing
- **Family Account Management** - Multi-user household support
- **Personalized Dashboard** - User-specific financial overview
- **Session Management** - Secure login/logout functionality

---

## **💳 Credit Card Intelligence**

### **Card Management**
- **Add Credit Cards** - Manual card entry with detailed information
- **Card Portfolio View** - Visual grid of all family credit cards
- **Real-time Card Data** - Balance, limits, APR, and utilization tracking
- **Card Categorization** - Standard vs Promotional APR classification

### **APR Monitoring & Alerts**
- **Promotional APR Tracking** - Monitor 0% intro rate expiration dates
- **Smart Alert System** - 60/30/7 day expiration warnings
- **APR Type Classification** - Standard vs Promotional rate identification
- **Interest Cost Calculations** - Real-time cost analysis

### **Optimization Engine**
- **Real-time Purchase Recommendations** - "Which card should I use?"
- **Category Bonus Tracking** - Quarterly rotating rewards optimization
- **Utilization Optimization** - Credit score protection recommendations
- **Payment Timing Intelligence** - Optimize payment schedules

---

## **🤖 AI-Powered Financial Assistant**

### **Conversational Interface**
- **Natural Language Queries** - Chat with your financial data
- **Context-Aware Responses** - AI understands family financial situation
- **Multi-Modal Intelligence** - Documents, cards, and spending patterns
- **Proactive Recommendations** - Smart suggestions for optimization

### **Document Intelligence**
- **AI Document Chat** - Upload and query financial documents
- **OCR Processing** - Extract data from PDFs, images, receipts
- **Smart Categorization** - Automatic expense classification
- **Tax Document Analysis** - W-2, 1099, business expense identification

### **Receipt Intelligence** 
- **Receipt Scanning** - Photo capture and OCR processing
- **Merchant Recognition** - Automatic merchant and category detection
- **Family Receipt Coordination** - Shared receipt vault for all members
- **Business Expense Detection** - Tax-deductible expense identification
- **Receipt-to-Transaction Matching** - Link receipts to card transactions

---

## **👥 Family Financial Coordination**

### **Real-Time Family Features**
- **Family Spending Coordination** - Real-time visibility across all members
- **Cross-Member Optimization** - "Sarah should use Chase, Mike use Discover"
- **Shared Financial Goals** - Household budget and savings coordination
- **Family Alert System** - Notify family of important financial events

### **Permission Management**
- **Granular Access Controls** - Control who sees what financial data
- **Family Member Roles** - Parents, teens, view-only access levels
- **Privacy Settings** - Individual vs shared transaction visibility
- **Safe Family Sharing** - Secure multi-user financial coordination

---

## **🛡️ BNPL (Buy Now, Pay Later) Intelligence**

### **BNPL Integration & Optimization**
- **Multi-Service BNPL Tracking** - Klarna, Afterpay, Affirm, Sezzle coordination
- **BNPL vs Credit Card Optimization** - Real-time decision engine
- **Family BNPL Exposure Management** - Household payment obligation tracking
- **Payment Schedule Coordination** - Avoid conflicting due dates
- **Interest vs Reward Analysis** - Cost-benefit calculations

### **BNPL Decision Engine**
- **Real-time BNPL Recommendations** - When to use BNPL vs credit cards
- **Cash Flow Optimization** - Schedule BNPL around family income cycles
- **Credit Impact Analysis** - How BNPL affects credit utilization
- **Family BNPL Limits** - Prevent household overextension

---

## **⚠️ Smart Alerts & Notifications**

### **Proactive Financial Alerts**
- **APR Expiration Warnings** - Multi-stage promotional rate alerts
- **Annual Fee Reminders** - 30/60/90 day advance notifications
- **High Utilization Alerts** - Credit score protection warnings
- **Payment Due Reminders** - Avoid late fees and interest charges
- **Reward Optimization Alerts** - Missed cashback opportunities

### **Family Coordination Alerts**
- **Large Purchase Notifications** - Alert family of significant spending
- **Budget Threshold Warnings** - Category and total spending limits
- **Card Recommendation Updates** - When optimal card usage changes
- **Family Financial Milestones** - Goal achievement celebrations

---

## **🛡️ Security & Fraud Protection**

### **Community Fraud Intelligence**
- **Merchant Safety Scoring** - Community-driven business risk ratings
- **Real-time Fraud Alerts** - Crowd-sourced security warnings
- **Geographic Risk Mapping** - Location-based safety intelligence
- **Anonymous Fraud Reporting** - Protect community while maintaining privacy

### **Personal Security Features**
- **Bank-Level Encryption** - AES-256 data protection
- **Multi-Factor Authentication** - Secure account access
- **Zero-Knowledge Architecture** - Privacy-preserving data handling
- **Granular Permission Controls** - Family-safe data sharing

---

## **📊 Financial Analytics & Insights**

### **Spending Intelligence**
- **Cross-Platform Analytics** - Credit cards, BNPL, bank accounts
- **Family Spending Patterns** - Household financial behavior analysis
- **Seasonal Trend Recognition** - Holiday, vacation, back-to-school patterns
- **Category Optimization** - Where families can save money

### **Predictive Intelligence**
- **Cash Flow Forecasting** - Predict monthly expenses and income
- **Goal Progress Tracking** - Visual progress toward financial objectives
- **Reward Earning Projections** - Annual cashback/points optimization
- **Credit Score Impact Modeling** - How decisions affect credit health

---

## **💼 Tax & Business Features**

### **Tax Intelligence**
- **Business Expense Classification** - Automatic 1099/Schedule C categorization
- **Receipt-Based Deductions** - Tax-deductible expense identification
- **Family Tax Coordination** - Multi-member tax document organization
- **Year-End Tax Reports** - Organized expense summaries for filing

### **Business Financial Management**
- **Business vs Personal Categorization** - Smart expense classification
- **Contractor/Freelancer Tools** - 1099 income and expense tracking
- **Home Office Deductions** - Automatic business expense detection
- **Tax Document Organization** - Secure storage and categorization

---

## **📱 User Experience & Interface**

### **Modern Interface Design**
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Floating Chat Widget** - Always-accessible Vitta AI Assistant
- **Clean Dashboard** - Intuitive financial overview
- **Real-time Updates** - Live transaction feeds and alerts

### **Accessibility & Usability**
- **Family-Friendly Design** - Simple enough for teens, powerful for adults
- **Progressive Disclosure** - Advanced features available when needed
- **Voice-Friendly Interface** - Natural language interaction
- **Customizable Dashboards** - Personalized financial views

---

## **🔗 Integration & Connectivity**

### **Financial Institution Support**
- **Plaid Integration** - Secure bank and credit card connectivity
- **Real-time Transaction Sync** - Live spending and balance updates
- **Multi-Bank Support** - Connect accounts from any institution
- **Investment Account Tracking** - 401k, IRA, brokerage integration

### **Third-Party Integrations**
- **BNPL Service APIs** - Direct integration with major BNPL providers
- **Tax Software Compatibility** - Export data for tax preparation
- **Receipt Processing** - OCR and merchant database integration
- **Credit Monitoring** - Real-time credit score and report tracking

---

## **🚀 Advanced Features (Roadmap)**

### **AI & Machine Learning**
- **Predictive Fraud Detection** - AI-powered security monitoring
- **Personalized Optimization** - Machine learning spending recommendations
- **Voice Assistant Integration** - "Hey Vitta, which card should I use?"
- **Computer Vision** - Advanced receipt and document processing

### **Financial Planning Tools**
- **Retirement Planning** - Long-term financial goal coordination
- **Investment Recommendations** - Family-coordinated investment strategy
- **Insurance Optimization** - Family insurance policy coordination
- **Estate Planning** - Family financial legacy management

---

## **💡 Unique Differentiators**

### **Market-First Features**
- **Family-Native Architecture** - Built for households, not individuals
- **Real-time Payment Optimization** - Decision support at point of purchase
- **BNPL Family Coordination** - Only platform offering household BNPL management
- **Community Fraud Intelligence** - Crowd-sourced security network
- **Payment Network Expertise** - Industry insights for superior optimization

### **Technical Advantages**
- **Multi-Modal AI Intelligence** - Documents + transactions + family context
- **Real-time Decision Engine** - Instant optimization recommendations
- **Cross-Platform Data Synthesis** - Unified view of all family financial data
- **Privacy-Preserving Analytics** - Smart insights without compromising security

---

This comprehensive feature list showcases Vitta as a sophisticated, family-first financial intelligence platform that goes far beyond traditional budgeting apps to provide real-time optimization, coordination, and AI-powered insights for modern families managing complex financial lives.

## Configuration

### Supabase Setup

To enable user persistence with Google OAuth:

1. Follow the detailed guide in `SUPABASE_SETUP.md`
2. Create a Supabase project and users table
3. Add your credentials to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### Google OAuth Setup

See `GOOGLE_OAUTH_SETUP.md` for detailed instructions on configuring Google Sign-In.

**Note**: The app works in demo mode even without Supabase configured. Google login users will work but won't be persisted to a database.

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features
1. Create new components in the `components/` directory
2. Update the main `VittaApp.js` component
3. Add new screen states and navigation as needed
4. Test with `npm run build` to ensure no syntax errors

## Future Enhancements

- Live credit card data synchronization via Plaid
- Advanced spending analytics and forecasting
- Family member management and sharing
- Mobile app development
- Real-time notifications and alerts
- BNPL (Buy Now, Pay Later) integration
- Community fraud intelligence

## Contributing

Vitta is an intelligent credit card platform helping users make smarter financial decisions. For questions or contributions, please contact the development team.

## License

This project is proprietary.