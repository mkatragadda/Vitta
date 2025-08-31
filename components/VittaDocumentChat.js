import React, { useState, useRef } from 'react';
import { Upload, FileText, Send, Bot, User, MessageCircle, X, Minimize2, LogOut, CreditCard, Users, TrendingUp } from 'lucide-react';

import FamilyManagementScreen from './FamilyManagementScreen';
import dynamic from 'next/dynamic';
const StatementAnalyzer = dynamic(() => import('./StatementAnalyzer'), { ssr: false });
const Dashboard = dynamic(() => import('./Dashboard'), { ssr: false });


const VittaDocumentChat = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Screen navigation state
  const [currentScreen, setCurrentScreen] = useState('dashboard'); // 'dashboard', 'familyManagement', 'statementAnalyzer'
  
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          {/* Demo Banner */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚧</span>
              <h3 className="font-semibold text-amber-800">Demo Mode</h3>
            </div>
            <p className="text-amber-800 text-sm">
              This is a demo of Vitta's login system. Enter any email and password combination to access the platform.
            </p>
          </div>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">V</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Vitta</h1>
            <p className="text-gray-600">Your family's financial intelligence platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Sign In
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => handleLogin('demo@vitta.ai', 'demo')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Skip demo login
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">What's New in Vitta:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• AI-powered document chat</li>
              <li>• Smart credit card recommendations</li>
              <li>• Family spending coordination</li>
              <li>• Real-time financial optimization</li>
            </ul>
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



  // If family management screen is active, show it
  if (currentScreen === 'familyManagement') {
    return <FamilyManagementScreen onBack={() => setCurrentScreen('dashboard')} user={user} />;
  }

  if (currentScreen === 'statementAnalyzer') {
    return <StatementAnalyzer onBack={() => setCurrentScreen('dashboard')} />;
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
              onClick={() => setCurrentScreen('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all shadow-lg ${currentScreen === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentScreen('familyManagement')}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
            >
              <Users className="w-4 h-4" />
              Family
            </button>
            <button
              onClick={() => setCurrentScreen('statementAnalyzer')}
              className="flex items-center gap-2 px-4 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-lg"
            >
              Analyze Statement
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

        {/* Dashboard Content */}
        <div className="mb-16">
          <Dashboard
            onOpenAnalyzer={() => setCurrentScreen('statementAnalyzer')}
            onOpenOptimizer={() => setCurrentScreen('familyManagement')}
            onOpenCards={() => setCurrentScreen('familyManagement')}
          />
        </div>
      </div>

              {/* Floating Chat Widget */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-20 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 flex items-center justify-center z-50 px-4"
            title="Open Vitta AI Assistant"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Vitta AI</span>
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
            ✅ <strong>Logged In:</strong> You're now using Vitta's demo platform with enhanced login system.
          </p>
        </div>
      )}
    </div>
  );
};

export default VittaDocumentChat;