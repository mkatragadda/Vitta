import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Send, Bot, User, MessageCircle, X, Minimize2, LogOut, CreditCard, Calculator } from 'lucide-react';
import CreditCardScreen from './CreditCardScreen';
import PaymentOptimizer from './PaymentOptimizer';

const VittaDocumentChat = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Screen navigation state
  const [currentScreen, setCurrentScreen] = useState('main'); // 'main', 'creditCards', or 'paymentOptimizer'
  
  // Existing states
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: "Hi! I'm your Vitta AI assistant. Upload your financial documents and I'll help you find information instantly.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef(null);

  // Login handler
  const handleLogin = (email, password) => {
    // Mock authentication - in real app, this would be actual auth
    setUser({ 
      email, 
      name: email.split('@')[0],
      joinDate: new Date()
    });
    setIsAuthenticated(true);
    
    // Add welcome message
    setMessages(prev => [...prev, {
      type: 'bot',
      content: `Welcome back, ${email.split('@')[0]}! I'm ready to help you with your financial documents and credit card optimization. What would you like to know?`,
      timestamp: new Date()
    }]);
  };

  // Google OAuth handler
  const handleGoogleSignIn = (response) => {
    try {
      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      setUser({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        joinDate: new Date(),
        provider: 'google'
      });
      setIsAuthenticated(true);
      
      // Add welcome message
      setMessages(prev => [...prev, {
        type: 'bot',
        content: `Welcome back, ${payload.name}! I'm ready to help you with your financial documents and credit card optimization. What would you like to know?`,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert('Google sign-in failed. Please try again.');
    }
  };

  // Initialize Google OAuth
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'demo_client_id_for_testing',
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true
      });
    }
  }, []);

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCurrentScreen('main');
    setMessages([{
      type: 'bot',
      content: "Hi! I'm your Vitta AI assistant. Upload your financial documents and I'll help you find information instantly.",
      timestamp: new Date()
    }]);
    setUploadedDocs([]);
    setIsOpen(false);
  };

  // Login Component
  const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (email && password) {
        handleLogin(email, password);
      }
    };

    // Google Sign-In button click handler
    const handleGoogleSignInClick = () => {
      if (typeof window !== 'undefined' && window.google) {
        window.google.accounts.id.prompt(); // Show the One Tap dialog
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full max-w-lg">
          {/* Left Column - Branding & Features */}
          <div className="hidden lg:flex lg:flex-col lg:justify-between h-full mr-12">
            <div>
              <div className="flex items-center gap-3 mb-12">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">V</span>
                </div>
                <span className="text-2xl font-bold text-white">Vitta</span>
              </div>

              <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
                Chat with Your Documents
              </h1>
              <p className="text-blue-100 text-lg mb-12">
                Upload your statements, upload your forms, and let Vitta analyze them. Ask natural questions and get answers instantly.
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold">Simple Upload</p>
                  <p className="text-blue-200 text-sm">Drop your bank statements or tax forms</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold">Natural Questions</p>
                  <p className="text-blue-200 text-sm">"What were my expenses last month?"</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold">Smart Answers</p>
                  <p className="text-blue-200 text-sm">AI extracts insights from your documents</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Login Card */}
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">V</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Chat with Your Documents</h1>
              <p className="text-gray-600 text-sm mt-2">Your financial AI assistant</p>
            </div>

            {/* Heading */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Vitta</h2>
              <p className="text-gray-600">Start your document conversation</p>
            </div>

            {/* Google Sign-In Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-500 font-medium">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign In
              </button>
            </form>

            {/* Additional Info */}
            <div className="text-center text-xs text-gray-500 mb-4">
              <p>Demo mode: Use any email and password to explore</p>
            </div>

            {/* Footer Links */}
            <div className="pt-4 border-t border-gray-200 text-center text-xs">
              <p className="text-gray-500">
                <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                {' '} • {' '}
                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              </p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 text-center text-sm text-blue-100">
            <p>🔒 Secure • 🏦 HTTPS • 💳 Encrypted</p>
          </div>
        </div>
      </div>
    );
  };

  // Mock document processing
  const processDocument = async (file) => {
    // Simulate document processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockDocTypes = {
      'w2': 'W-2 Tax Document',
      '1099': '1099 Tax Document', 
      'bank': 'Bank Statement',
      'credit': 'Credit Card Statement',
      'receipt': 'Receipt'
    };
    
    const randomType = Object.keys(mockDocTypes)[Math.floor(Math.random() * Object.keys(mockDocTypes).length)];
    
    return {
      id: Date.now(),
      name: file.name,
      type: mockDocTypes[randomType],
      processed: true,
      extractedData: {
        'W-2 Tax Document': {
          employer: 'TechCorp Inc',
          wages: '$85,000',
          federalTax: '$12,500',
          year: '2024'
        },
        '1099 Tax Document': {
          payer: 'Freelance Client',
          income: '$15,000',
          year: '2024'
        },
        'Bank Statement': {
          account: '****1234',
          balance: '$3,247.82',
          period: 'Nov 2024'
        },
        'Credit Card Statement': {
          card: 'Chase Freedom ****5678',
          balance: '$1,234.56',
          dueDate: 'Dec 15, 2024',
          minPayment: '$35'
        },
        'Receipt': {
          merchant: 'Home Depot',
          amount: '$127.43',
          date: '11/28/2024',
          category: 'Home Improvement'
        }
      }[mockDocTypes[randomType]]
    };
  };

  // Mock AI responses based on query
  const generateResponse = (query, docs) => {
    const q = query.toLowerCase();
    
    if (q.includes('tax') || q.includes('w2') || q.includes('1099')) {
      return "Based on your uploaded tax documents, I found:\n\n• W-2 from TechCorp Inc: $85,000 in wages, $12,500 federal tax withheld\n• 1099 income: $15,000 from freelance work\n• Total taxable income: $100,000\n\nWould you like me to help estimate your tax liability or find specific deductions?";
    }
    
    if (q.includes('credit card') || q.includes('balance') || q.includes('payment')) {
      return "From your credit card statements:\n\n• Chase Freedom ****5678: $1,234.56 balance, minimum payment $35 due Dec 15\n• Based on your spending patterns, I recommend using your Chase Freedom for grocery purchases this quarter (5% cashback)\n\n💳 **Credit Card Management**: You can now access your full credit card dashboard with detailed analytics, spending breakdowns, and optimization tips. Click the 'Credit Cards' button in the header to explore!\n\nWould you like me to analyze your card optimization opportunities?";
    }
    
    if (q.includes('bank') || q.includes('checking') || q.includes('account')) {
      return "Your bank statement shows:\n\n• Account ****1234: $3,247.82 current balance\n• Recent large transactions: $1,500 mortgage payment, $450 utilities\n• Unusual spending detected: $300 at electronics store (20% above normal)\n\nWould you like me to categorize your spending or set up alerts?";
    }
    
    if (q.includes('receipt') || q.includes('expense') || q.includes('business')) {
      return "From your receipts, I found:\n\n• Home Depot: $127.43 (Nov 28) - Categorized as Home Improvement\n• This could be tax-deductible if it's for a home office\n• Total business expenses this month: $847.23\n\nWould you like me to help organize these for tax preparation?";
    }
    
    if (q.includes('summary') || q.includes('overview')) {
      return "Here's your financial summary:\n\n📊 **Income**: $100,000 (W-2 + 1099)\n💳 **Credit Cards**: $1,234.56 total balance\n🏦 **Bank Balance**: $3,247.82\n🧾 **Monthly Expenses**: ~$2,400\n\n💡 **Optimization Tip**: Pay off your credit card balance before the due date to avoid $27 in interest charges.";
    }
    
    if (q.includes('which card') || q.includes('groceries') || q.includes('dining') || q.includes('gas')) {
      return "💳 **Credit Card Recommendations**:\n\n• **Groceries**: Use Amex Gold (4x points) for maximum rewards\n• **Dining**: Amex Gold (4x points) is your best option\n• **Gas**: Chase Freedom Unlimited (1.5% cashback)\n• **Online Shopping**: Citi Double Cash (2% cashback)\n• **Everything Else**: Chase Freedom Unlimited (1.5% cashback)\n\n🎯 **Pro Tip**: Access your full credit card dashboard for detailed spending analysis and real-time optimization tips!";
    }
    
    return "I can help you find information from your uploaded documents. Try asking about:\n\n• Tax information (W-2, 1099 details)\n• Credit card balances and payments\n• Bank account summaries\n• Business expenses and receipts\n• Financial overviews and summaries";
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setIsLoading(true);
    
    for (const file of files) {
      try {
        const processedDoc = await processDocument(file);
        setUploadedDocs(prev => [...prev, processedDoc]);
        
        setMessages(prev => [...prev, {
          type: 'bot',
          content: `✅ Successfully processed ${processedDoc.type}: "${file.name}"\n\nExtracted data:\n${Object.entries(processedDoc.extractedData).map(([key, value]) => `• ${key}: ${value}`).join('\n')}\n\nYou can now ask me questions about this document!`,
          timestamp: new Date()
        }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          type: 'bot',
          content: `❌ Error processing ${file.name}. Please try again.`,
          timestamp: new Date()
        }]);
      }
    }
    
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = generateResponse(input, uploadedDocs);
    
    setMessages(prev => [...prev, {
      type: 'bot',
      content: response,
      timestamp: new Date()
    }]);
    
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const sampleQuestions = [
    "What's my total tax liability?",
    "When are my credit card payments due?",
    "Show me my business expenses",
    "Give me a financial summary",
    "Which card should I use for groceries?"
  ];

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // If credit card screen is active, show it
  if (currentScreen === 'creditCards') {
    return <CreditCardScreen onBack={() => setCurrentScreen('main')} user={user} />;
  }

  // If payment optimizer screen is active, show it
  if (currentScreen === 'paymentOptimizer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentScreen('main')}
                className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
              >
                ←
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Smart Payment Strategies</h1>
                <p className="text-gray-600">Optimize your credit card payments to save money</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back</p>
                <p className="font-medium text-gray-900">{user.name}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">V</span>
              </div>
            </div>
          </div>

          {/* Payment Optimizer Component */}
          <PaymentOptimizer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Main Landing Page */}
      <div className="container mx-auto px-6 py-12">
        {/* Header with Logout */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-2">Vitta</h1>
              <p className="text-xl text-gray-600">Welcome back, {user.name}!</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentScreen('paymentOptimizer')}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
            >
              <Calculator className="w-4 h-4" />
              Smart Payments
            </button>
            <button
              onClick={() => setCurrentScreen('creditCards')}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <CreditCard className="w-4 h-4" />
              Credit Cards
            </button>
            <div className="text-right">
              <p className="text-sm text-gray-600">Signed in as</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Updated description for authenticated users */}
        <div className="text-center mb-16">
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Your family financial intelligence platform is ready! Upload documents, ask questions, 
            and get AI-powered insights for credit card optimization and family spending coordination.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-sm text-gray-500">💳 New:</span>
            <button
              onClick={() => setCurrentScreen('creditCards')}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Credit Card Management Dashboard
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Document Chat</h3>
            <p className="text-gray-600">Ask questions about your tax documents, bank statements, and receipts using natural language.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setCurrentScreen('paymentOptimizer')}>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Payment Strategies</h3>
            <p className="text-gray-600">Optimize your credit card payments to minimize interest and pay off debt faster with AI-powered recommendations.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setCurrentScreen('creditCards')}>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Card Optimization</h3>
            <p className="text-gray-600">Never use the wrong credit card again. Get real-time recommendations for maximum rewards.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Family Coordination</h3>
            <p className="text-gray-600">Real-time spending visibility and coordination across all family members and accounts.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-gray-600 mb-6">Start by chatting with your AI assistant</p>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            Open AI Assistant
          </button>
        </div>
      </div>

      {/* Floating Chat Widget */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 flex items-center justify-center z-50"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <div>
                <h3 className="font-semibold">Vitta AI Assistant</h3>
                <p className="text-blue-100 text-sm">Welcome, {user.name}!</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-6 h-6 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors flex items-center justify-center"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* File Upload Section */}
              <div className="p-4 border-b border-gray-100">
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center hover:border-blue-300 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-gray-600 text-sm mb-2">Upload financial documents</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    Choose Files
                  </button>
                </div>
                
                {/* Uploaded Documents */}
                {uploadedDocs.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1">
                      {uploadedDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                          <FileText className="w-3 h-3" />
                          {doc.type}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message, index) => (
                  <div key={index} className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.type === 'user' ? 'bg-blue-600' : 'bg-gray-600'
                      }`}>
                        {message.type === 'user' ? 
                          <User className="w-3 h-3 text-white" /> : 
                          <Bot className="w-3 h-3 text-white" />
                        }
                      </div>
                      <div className={`p-3 rounded-xl ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-md' 
                          : 'bg-gray-50 text-gray-900 rounded-bl-md'
                      }`}>
                        <div className="whitespace-pre-line text-sm leading-relaxed">
                          {message.content}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl rounded-bl-md">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sample Questions */}
              {uploadedDocs.length > 0 && (
                <div className="border-t border-gray-100 p-3">
                  <p className="text-xs text-gray-600 mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-1">
                    {sampleQuestions.slice(0, 2).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => setInput(question)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-gray-100 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your documents..."
                    className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Demo Notice - Only show when logged in */}
      {isAuthenticated && (
        <div className="fixed bottom-6 left-6 max-w-sm p-3 bg-green-50 border border-green-200 rounded-lg shadow-lg">
          <p className="text-green-800 text-sm">
            ✅ <strong>Logged In:</strong> You&apos;re now using Vitta&apos;s demo platform with enhanced login system.
          </p>
        </div>
      )}
    </div>
  );
};

export default VittaDocumentChat;