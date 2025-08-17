# Vitta Document Chat - AI-Powered Financial Assistant

A Next.js demo application showcasing Vitta's family financial intelligence platform with AI-powered document analysis and credit card optimization.

## Features

### 🔐 Authentication System
- Demo login system (enter any email/password combination)
- User session management
- Secure logout functionality

### 📄 AI Document Chat
- Upload financial documents (PDF, PNG, JPG, JPEG)
- AI-powered document analysis and data extraction
- Natural language queries about your financial documents
- Support for W-2, 1099, bank statements, credit card statements, and receipts

### 💳 Credit Card Management Dashboard
- **Multi-card support**: Manage multiple credit cards in one interface
- **Visual card display**: Beautiful card representations with brand-specific colors
- **Real-time analytics**: Balance, utilization rate, payment due dates
- **Spending analysis**: Category breakdown and month-over-month trends
- **Rewards optimization**: Detailed rewards program information and sign-up bonuses
- **Smart recommendations**: AI-powered tips for optimal card usage
- **Quick actions**: Make payments, view statements, set alerts

### 🎯 Smart Recommendations
- Credit card selection guidance for different spending categories
- Interest savings calculations
- Credit score optimization tips
- Family spending coordination insights

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
cd vitta-document-chat

# Install dependencies
npm install

# Run the development server
npm run dev
```

### Usage
1. Open [http://localhost:3000](http://localhost:3000)
2. Enter any email and password combination to access the demo
3. Upload financial documents or start chatting with the AI assistant
4. Click "Credit Cards" to access the comprehensive credit card management dashboard
5. Explore different cards, analyze spending patterns, and get optimization tips

## Technology Stack

- **Frontend**: Next.js 14, React 18
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Next.js built-in bundler

## Project Structure

```
vitta-document-chat/
├── components/
│   ├── VittaDocumentChat.js    # Main application component
│   └── CreditCardScreen.js     # Credit card management dashboard
├── pages/
│   ├── _app.js                 # App wrapper
│   ├── _document.js            # Document wrapper
│   └── index.js                # Home page
├── styles/
│   └── globals.css             # Global styles
└── public/                     # Static assets
```

## Demo Features

### Document Processing
- Simulated AI document analysis
- Multiple document type support
- Extracted data visualization
- Sample questions and responses

### Credit Card Simulation
- 3 sample credit cards with realistic data
- Chase Freedom Unlimited (Visa)
- Amex Gold Card (American Express)
- Citi Double Cash (Mastercard)
- Dynamic spending patterns and balances

### AI Assistant
- Context-aware responses
- Document-specific insights
- Credit card optimization advice
- Financial summary generation

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features
1. Create new components in the `components/` directory
2. Update the main `VittaDocumentChat.js` component
3. Add new screen states and navigation as needed
4. Test with `npm run build` to ensure no syntax errors

## Future Enhancements

- Real API integration for document processing
- Live credit card data synchronization
- Advanced spending analytics and forecasting
- Family member management and sharing
- Mobile app development
- Real-time notifications and alerts

## Contributing

This is a demo application showcasing Vitta's financial platform capabilities. For questions or contributions, please contact the development team.

## License

This project is for demonstration purposes only.