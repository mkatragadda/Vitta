import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, Send, Bot, User, MessageCircle, X, Minimize2, LogOut, CreditCard, Calculator, LayoutDashboard, Wallet, Sparkles } from 'lucide-react';
import CreditCardScreen from './CreditCardScreen';
import PaymentOptimizer from './PaymentOptimizer';
import DashboardWithTabs from './DashboardWithTabs';
import VittaChatInterface from './VittaChatInterface';
import RecommendationScreen from './RecommendationScreen';
import { saveGoogleUser } from '../services/userService';
import { getUserCards } from '../services/cardService';
import { processQuery, loadConversationHistory } from '../services/chat/conversationEngineV2';

// Component to render message content with clickable links and tables
const MessageContent = ({ content, onNavigate }) => {
  // Parse markdown-style links [text](url)
  const parseMarkdownLinks = (text) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const linkText = match[1];
      const linkUrl = match[2];

      // Check if it's a deep link (vitta://)
      if (linkUrl.startsWith('vitta://navigate/')) {
        const screenPath = linkUrl.replace('vitta://navigate/', '');
        parts.push(
          <a
            key={match.index}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) {
                onNavigate(screenPath);
              }
            }}
            className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
          >
            {linkText}
          </a>
        );
      } else {
        // External link
        parts.push(
          <a
            key={match.index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {linkText}
          </a>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Check if content contains a table
  const isTable = content && content.includes('|') && content.includes('---');
  
  if (isTable) {
    const lines = content.split('\n');
    const tableLines = [];
    const otherLines = [];
    let inTable = false;
    
    lines.forEach(line => {
      if (line.includes('|') && (line.includes('**Card**') || line.includes('---') || inTable)) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable && line.trim() === '') {
          inTable = false;
        }
        if (!inTable) {
          otherLines.push(line);
        }
      }
    });
    
    return (
      <>
        {/* Render non-table content first */}
        {otherLines.slice(0, otherLines.findIndex(line => tableLines.length > 0)).map((line, index) => (
          <React.Fragment key={`before-${index}`}>
            {parseMarkdownLinks(line)}
            <br />
          </React.Fragment>
        ))}
        
        {/* Render table if exists */}
        {tableLines.length > 0 && (
          <div className="my-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-gray-300">
              {tableLines.map((line, index) => {
                if (line.includes('---')) return null; // Skip separator line
                
                const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
                const isHeader = index === 0;
                
                return isHeader ? (
                  <thead key={index}>
                    <tr className="bg-gray-100">
                      {cells.map((cell, cellIndex) => (
                        <th key={cellIndex} className="border border-gray-300 px-2 py-1 text-left font-semibold">
                          {parseMarkdownLinks(cell.replace(/\*\*/g, ''))}
                        </th>
                      ))}
                    </tr>
                  </thead>
                ) : (
                  <tbody key={index}>
                    <tr className="hover:bg-gray-50">
                      {cells.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-gray-300 px-2 py-1">
                          {parseMarkdownLinks(cell.replace(/\*\*/g, ''))}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                );
              })}
            </table>
          </div>
        )}
        
        {/* Render remaining non-table content */}
        {otherLines.slice(otherLines.findIndex(line => tableLines.length > 0) + 1).map((line, index) => (
          <React.Fragment key={`after-${index}`}>
            {parseMarkdownLinks(line)}
            {index < otherLines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    );
  }
  
  // Regular content without tables
  const lines = content.split('\n');
  
  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {parseMarkdownLinks(line)}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
};

const VittaApp = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Screen navigation state
  const [currentScreen, setCurrentScreen] = useState('main'); // 'main', 'creditCards', 'paymentOptimizer', 'dashboard', 'recommendations'
  
  // Existing states
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: "Hi! I'm your Vitta AI assistant. I can help you choose the best credit card for any purchase, optimize your payments, and maximize your rewards. Ask me anything!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userCards, setUserCards] = useState([]);
  const fileInputRef = useRef(null);
  const [quickActionTrigger, setQuickActionTrigger] = useState(false);
  const userId = user?.id;

  // Login handler
  const handleLogin = (email, password) => {
    // Mock authentication for demo mode
    const demoId = 'demo-user';

    setUser({
      id: demoId,
      email,
      name: email.split('@')[0],
      joinDate: new Date(),
      provider: 'demo',
      picture: null,
      isDemoMode: true
    });
    setIsAuthenticated(true);

    // Add welcome message
    setMessages(prev => [...prev, {
      type: 'bot',
      content: `Welcome back, ${email.split('@')[0]}! I'm ready to help you with your financial documents and credit card optimization. What would you like to know?`,
      timestamp: new Date()
    }]);
  };

  const processGoogleProfile = useCallback(async ({ email, name, picture, sub }) => {
    const savedUser = await saveGoogleUser({
      email,
      name,
      picture,
      sub
    });

    console.log('[Vitta] User saved to database:', savedUser);

    setUser({
      id: savedUser.id,
      email,
      name,
      picture,
      joinDate: savedUser.created_at ? new Date(savedUser.created_at) : new Date(),
      provider: 'google',
      isDemoMode: savedUser.isDemoMode || false
    });

    setIsAuthenticated(true);

    setMessages(prev => [...prev, {
      type: 'bot',
      content: `Welcome back, ${name}! I'm ready to help you choose the best credit card for every purchase and optimize your payments. What would you like to know?`,
      timestamp: new Date()
    }]);

    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
      window.google?.accounts?.id?.cancel?.();
    } catch (err) {
      console.warn('[Vitta] Unable to disable Google auto select:', err);
    }
  }, []);

  // Google OAuth handler
  const handleGoogleSignIn = useCallback(async (response) => {
    try {
      console.log('[Vitta] Google OAuth Success!', response);
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      console.log('[Vitta] Decoded payload:', payload);

      await processGoogleProfile({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
      });
    } catch (error) {
      console.error('[Vitta] Google sign-in error:', error);
      console.error('[Vitta] Full error details:', error);

      // Check for specific error types
      if (error.message && error.message.includes('origin')) {
        alert(`OAuth Error: The current origin (${window.location.origin}) is not authorized.\n\nTroubleshooting steps:\n1. Verify origins are added to Google Console\n2. Wait 5-15 minutes for propagation\n3. Clear browser cache completely\n4. Try incognito/private window\n5. Ensure signed in with way2vitta@gmail.com`);
      } else {
        alert('Google sign-in failed. Please try again.');
      }
    }
  }, [processGoogleProfile]);

  // Initialize Google OAuth (ensure init after script load)
  const [isGsiInitialized, setIsGsiInitialized] = useState(false);
  const [gsiStatus, setGsiStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [hasRenderedGsiButton, setHasRenderedGsiButton] = useState(false);
  const gsiButtonRef = useRef(null);
  const tokenClientRef = useRef(null);

  const triggerOAuthTokenFlow = useCallback(() => {
    if (isAuthenticated) return;
    const tokenClient = tokenClientRef.current;
    if (!tokenClient) {
      alert('Google Sign-In is still loading. Please refresh and try again.');
      return;
    }

    try {
      console.log('[Vitta] Launching OAuth token fallback flow…');
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('[Vitta] Error requesting Google access token:', err);
      alert('Unable to open Google login. Please ensure pop-ups are allowed and try again.');
    }
  }, []);

  const initializeGsiIfNeeded = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const gsi = window.google && window.google.accounts && window.google.accounts.id;
    if (!gsi) {
      console.log('[Vitta] Google GSI not loaded yet');
      return false;
    }
    if (isGsiInitialized) return true;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    // Don't initialize if no real client ID is provided
    if (!clientId) {
      console.log('[Vitta] No Google Client ID provided - skipping Google OAuth initialization');
      setGsiStatus('disabled');
      return false;
    }

    console.log('[Vitta] Initializing GSI with Client ID:', clientId);
    console.log('[Vitta] Current origin:', window.location.origin);
    console.log('[Vitta] Current hostname:', window.location.hostname);
    console.log('[Vitta] Current port:', window.location.port);
    console.log('[Vitta] Current protocol:', window.location.protocol);
    console.log('[Vitta] Required Google Console Origins:', [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002'
    ]);
    try {
      gsi.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
        use_fedcm_for_prompt: false,
        itp_support: true
      });

      if (window.google?.accounts?.oauth2) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          prompt: '',
          callback: async (tokenResponse) => {
            try {
              const accessToken = tokenResponse.access_token;
              if (!accessToken) {
                throw new Error('Access token was not returned by Google');
              }

              const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              });

              if (!profileResponse.ok) {
                throw new Error(`Failed to fetch Google profile: ${profileResponse.status}`);
              }

              const profile = await profileResponse.json();
              console.log('[Vitta] OAuth2 fallback profile:', profile);
              await processGoogleProfile({
                email: profile.email,
                name: profile.name || profile.given_name || 'Google User',
                picture: profile.picture,
                sub: profile.sub
              });
            } catch (err) {
              console.error('[Vitta] OAuth2 fallback failed:', err);
              alert('Google sign-in could not complete. Please ensure pop-ups are enabled and try again.');
            }
          }
        });
      }
      setIsGsiInitialized(true);
      setGsiStatus('ready');
      console.log('[Vitta] GSI initialized successfully');
      // Render official Google button if container exists
      if (gsiButtonRef.current && !hasRenderedGsiButton) {
        try {
          gsi.renderButton(gsiButtonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left'
          });
          setHasRenderedGsiButton(true);
          console.log('[Vitta] GSI button rendered successfully');
        } catch (e) {
          console.warn('[Vitta] GSI renderButton failed:', e);
        }
      }
      return true;
    } catch (e) {
      console.error('[Vitta] GSI initialize failed:', e);
      setGsiStatus('error');
      return false;
    }
  }, [handleGoogleSignIn, hasRenderedGsiButton, isGsiInitialized, isAuthenticated, processGoogleProfile]);

  const showGooglePrompt = useCallback(() => {
    if (isAuthenticated) return;
    const gsi = window.google?.accounts?.id;

    if (!gsi) {
      alert('Google Sign-In is still loading. Please refresh and try again.');
      return;
    }

    try {
      gsi.cancel(); // reset any previous dismissal
    } catch (error) {
      console.warn('[Vitta] Unable to cancel previous prompt:', error);
    }

    console.log('[Vitta] Triggering Google Sign-In prompt…');
    gsi.prompt((notification) => {
      if (!notification) {
        return;
      }

      const momentType = notification.getMomentType?.();
      if (momentType) {
        console.log('[Vitta] Prompt moment:', momentType);
      }

      if (notification.isNotDisplayed?.()) {
        const reason = notification.getNotDisplayedReason?.();
        console.warn('[Vitta] Prompt not displayed:', reason);
        if (tokenClientRef.current) {
          const fallbackReasons = ['opt_out_or_no_session', 'suppressed_by_user', 'browser_not_supported'];
          if (fallbackReasons.includes(reason)) {
            triggerOAuthTokenFlow();
            return;
          }
        }
      }

      if (notification.isDismissedMoment?.()) {
        const reason = notification.getDismissedReason?.();
        console.warn('[Vitta] Prompt dismissed:', reason);
        if (reason === 'credential_returned') {
          // do nothing - user likely completed sign-in
          return;
        }
        if (tokenClientRef.current && !isAuthenticated) {
          const fallbackReasons = ['user_cancel', 'suppressed_by_user', 'secure_request_required'];
          if (fallbackReasons.includes(reason)) {
            triggerOAuthTokenFlow();
            return;
          }
        }
      }

      if (notification.isSkippedMoment?.()) {
        const reason = notification.getSkippedReason?.();
        console.warn('[Vitta] Prompt skipped:', reason);
        if (reason === 'opt_out_or_no_session' && tokenClientRef.current) {
          triggerOAuthTokenFlow();
        }
      }
    });
  }, [isAuthenticated, triggerOAuthTokenFlow]);

  useEffect(() => {
    // Try immediately
    if (initializeGsiIfNeeded()) return;
    // Poll until script loads
    const intervalId = setInterval(() => {
      if (initializeGsiIfNeeded()) {
        clearInterval(intervalId);
      }
    }, 200);
    // Safety timeout after 8s
    const timeoutId = setTimeout(() => clearInterval(intervalId), 8000);
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [initializeGsiIfNeeded]);

  // Reusable function to refresh cards from database
  const refreshCards = useCallback(async () => {
    if (userId) {
      try {
        console.log('[VittaApp] Refreshing cards from database...');
        const cards = await getUserCards(userId);
        setUserCards(cards || []);
        console.log('[VittaApp] Cards refreshed:', cards?.length || 0, 'cards');
        return cards;
      } catch (error) {
        console.error('[Vitta] Error loading user cards:', error);
        setUserCards([]);
        return [];
      }
    }
    return [];
  }, [userId]);

  // Load user cards when user logs in
  useEffect(() => {
    if (userId) {
      refreshCards();
    }
  }, [refreshCards, userId]);

  // Ensure official Google button renders once initialized and ref is ready
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const gsi = window.google && window.google.accounts && window.google.accounts.id;
    if (!gsi) return;
    if (isGsiInitialized && gsiButtonRef.current && !hasRenderedGsiButton) {
      try {
        gsi.renderButton(gsiButtonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left'
        });
        setHasRenderedGsiButton(true);
      } catch (e) {
        console.warn('GSI renderButton failed in effect:', e);
      }
    }
  }, [isGsiInitialized, hasRenderedGsiButton]);

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCurrentScreen('main');
    setMessages([{
      type: 'bot',
      content: "Hi! I'm your Vitta AI assistant. I can help you choose the best credit card for any purchase, optimize your payments, and maximize your rewards. Ask me anything!",
      timestamp: new Date()
    }]);
    setUploadedDocs([]);
    setIsOpen(false);
  };

  // Login Component
  const LoginScreen = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">V</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Vitta</h1>
            <p className="text-gray-600">Your personal financial intelligence platform</p>
          </div>

          {/* Google OAuth Sign-In */}
          {gsiStatus !== 'disabled' && (
            <div className="mb-6">
              <div className="w-full">
                <div className="text-center text-sm text-gray-600 mb-2">
                  {gsiStatus === 'loading' && 'Loading Google Sign-In...'}
                  {gsiStatus === 'ready' && 'Google Sign-In ready'}
                  {gsiStatus === 'error' && 'Google Sign-In failed to initialize'}
                </div>
                <div ref={gsiButtonRef} className="w-full flex items-center justify-center min-h-[46px]" />
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Google will open a secure account chooser. If nothing appears, ensure pop-ups are allowed for this site and refresh the page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (gsiStatus !== 'ready') {
                    alert('Google Sign-In is still loading. Please wait a moment and try again.');
                    return;
                  }
                  showGooglePrompt();
                }}
                className="mt-3 w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
          </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => handleLogin('demo@vitta.ai', 'demo')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Skip demo login
            </button>
            <p className="mt-2 text-sm text-center text-gray-500">
              Explore Vitta instantly with demo data—no email or password required.
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Vitta helps you:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Choose the best card for every purchase</li>
              <li>• Optimize payments to minimize interest</li>
              <li>• Maximize rewards and cashback</li>
              <li>• Avoid interest with smart timing</li>
              <li>• Save money on every transaction</li>
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

  // Mock credit card recommendations database
  const creditCardRecommendations = {
    zeroAPR: [
      {
        name: "Chase Freedom Unlimited®",
        issuer: "Chase",
        introAPR: "0% APR for 15 months on purchases and balance transfers",
        regularAPR: "19.74% - 28.74% Variable",
        annualFee: "$0",
        signupBonus: "$200 cash back after spending $500 in first 3 months",
        rewards: "1.5% cash back on all purchases",
        benefits: ["No foreign transaction fees", "Purchase protection", "Extended warranty"],
        bestFor: "Everyday spending with 0% intro period",
        applyUrl: "https://creditcards.chase.com"
      },
      {
        name: "Citi Simplicity® Card",
        issuer: "Citi",
        introAPR: "0% APR for 21 months on purchases and balance transfers",
        regularAPR: "17.24% - 27.24% Variable",
        annualFee: "$0",
        signupBonus: "No signup bonus",
        rewards: "No rewards program",
        benefits: ["No late fees", "No penalty APR", "No annual fee"],
        bestFor: "Long-term 0% financing and debt consolidation",
        applyUrl: "https://www.citi.com/credit-cards"
      },
      {
        name: "Wells Fargo Reflect® Card",
        issuer: "Wells Fargo", 
        introAPR: "0% APR for 21 months on purchases and qualifying balance transfers",
        regularAPR: "16.49% - 27.24% Variable",
        annualFee: "$0",
        signupBonus: "No signup bonus",
        rewards: "No rewards program",
        benefits: ["Cell phone protection", "Zero liability protection"],
        bestFor: "Extended 0% period for large purchases",
        applyUrl: "https://www.wellsfargo.com/credit-cards"
      }
    ],
    travelRewards: [
      {
        name: "Chase Sapphire Preferred®",
        issuer: "Chase",
        introAPR: "No intro APR offer",
        regularAPR: "19.74% - 26.74% Variable",
        annualFee: "$95 (waived first year)",
        signupBonus: "60,000 bonus points after spending $4,000 in first 3 months",
        rewards: "2x points on travel and dining, 1x on everything else",
        benefits: ["No foreign transaction fees", "Trip cancellation insurance", "Baggage delay insurance", "25% more value when redeeming through Chase Travel"],
        bestFor: "European travel with excellent trip protections",
        applyUrl: "https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred"
      },
      {
        name: "Capital One Venture Rewards",
        issuer: "Capital One",
        introAPR: "No intro APR offer", 
        regularAPR: "19.74% - 29.24% Variable",
        annualFee: "$95",
        signupBonus: "75,000 miles after spending $4,000 in first 3 months",
        rewards: "2x miles on every purchase",
        benefits: ["No foreign transaction fees", "Travel accident insurance", "24/7 travel assistance", "Global Entry/TSA PreCheck credit"],
        bestFor: "Simple flat-rate travel rewards for Europe trips",
        applyUrl: "https://www.capitalone.com/credit-cards/venture"
      },
      {
        name: "American Express® Gold Card",
        issuer: "American Express",
        introAPR: "No intro APR offer",
        regularAPR: "19.74% - 26.74% Variable", 
        annualFee: "$250",
        signupBonus: "60,000 Membership Rewards points after spending $4,000 in first 6 months",
        rewards: "4x points at restaurants & U.S. supermarkets, 3x points on flights",
        benefits: ["No foreign transaction fees", "Baggage insurance", "Trip delay insurance", "$120 dining credit", "$120 Uber Cash"],
        bestFor: "European dining and flight bookings with premium perks",
        applyUrl: "https://www.americanexpress.com/us/credit-cards/card/gold-card"
      }
    ],
    zeroAPRTravel: [
      {
        name: "Bank of America® Travel Rewards",
        issuer: "Bank of America",
        introAPR: "0% APR for 21 months on purchases and balance transfers",
        regularAPR: "16.24% - 26.24% Variable",
        annualFee: "$0",
        signupBonus: "25,000 bonus points after spending $1,000 in first 90 days",
        rewards: "1.5x points on all purchases",
        benefits: ["No foreign transaction fees", "No annual fee", "No category restrictions"],
        bestFor: "Europe trip with 0% financing and travel rewards",
        applyUrl: "https://www.bankofamerica.com/credit-cards/travel-rewards-credit-card"
      },
      {
        name: "Discover it® Miles",
        issuer: "Discover",
        introAPR: "0% APR for 15 months on purchases",
        regularAPR: "16.24% - 25.24% Variable",
        annualFee: "$0", 
        signupBonus: "Match all miles earned at end of first year",
        rewards: "1.5x miles on all purchases",
        benefits: ["No foreign transaction fees", "Free FICO credit score", "Freeze your account instantly"],
        bestFor: "Europe travel with first-year mile matching",
        applyUrl: "https://www.discover.com/credit-cards/travel/it-miles"
      }
    ]
  };

  // Mock AI responses based on query
  const generateResponse = (query, docs) => {
    const q = query.toLowerCase();
    
    // Credit card application recommendations
    if ((q.includes('recommend') || q.includes('suggest') || q.includes('apply')) && q.includes('credit card')) {
      let recommendations = [];
      let responseHeader = "🎯 **Credit Card Recommendations for You:**\n\n";
      
      // Check for specific criteria
      const wantsZeroAPR = q.includes('0%') || q.includes('zero') || q.includes('intro apr') || q.includes('no interest');
      const wantsTravel = q.includes('travel') || q.includes('europe') || q.includes('trip') || q.includes('vacation') || q.includes('miles') || q.includes('points');
      
      if (wantsZeroAPR && wantsTravel) {
        // Best of both worlds - cards with 0% APR AND travel rewards
        recommendations = creditCardRecommendations.zeroAPRTravel;
        responseHeader += "Perfect! I found cards that combine 0% intro APR with travel rewards for your Europe trip:\n\n";
      } else if (wantsZeroAPR) {
        // Focus on 0% APR cards
        recommendations = creditCardRecommendations.zeroAPR;
        responseHeader += "Here are the best 0% APR credit cards currently available:\n\n";
      } else if (wantsTravel) {
        // Focus on travel rewards cards
        recommendations = creditCardRecommendations.travelRewards;
        responseHeader += "Here are the top travel rewards cards perfect for your Europe trip:\n\n";
      } else {
        // General recommendation
        recommendations = [...creditCardRecommendations.zeroAPRTravel, ...creditCardRecommendations.travelRewards.slice(0,1)];
        responseHeader += "Here are some excellent credit card options to consider:\n\n";
      }
      
      let response = responseHeader;
      
      // Create table header
      response += `| **Card** | **Issuer** | **Intro APR** | **Annual Fee** | **Signup Bonus** | **Rewards** | **Apply** |\n`;
      response += `|----------|------------|---------------|----------------|------------------|-------------|----------||\n`;
      
      // Add each card as a table row
      recommendations.forEach((card, index) => {
        const shortName = card.name.replace(/®|™/g, '').substring(0, 20) + (card.name.length > 20 ? '...' : '');
        const shortAPR = card.introAPR.length > 20 ? card.introAPR.substring(0, 20) + '...' : card.introAPR;
        const shortBonus = card.signupBonus.length > 25 ? card.signupBonus.substring(0, 25) + '...' : card.signupBonus;
        const shortRewards = card.rewards.length > 20 ? card.rewards.substring(0, 20) + '...' : card.rewards;
        
        response += `| ${shortName} | ${card.issuer} | ${shortAPR} | ${card.annualFee} | ${shortBonus} | ${shortRewards} | [Apply →](${card.applyUrl}) |\n`;
      });
      
      response += `\n`;
      
      // Add detailed information below table
      response += `📋 **Detailed Information:**\n\n`;
      recommendations.forEach((card, index) => {
        response += `**${index + 1}. ${card.name}**\n`;
        response += `✅ **Best For:** ${card.bestFor}\n`;
        if (card.benefits.length > 0) {
          response += `🛡️ **Key Benefits:** ${card.benefits.slice(0,3).join(", ")}\n`;
        }
        response += `\n`;
      });
      
      if (wantsTravel && q.includes('europe')) {
        response += "\n💡 **Europe Travel Tips:**\n";
        response += "• All recommended cards have no foreign transaction fees\n";
        response += "• Consider cards with trip protection for international travel\n";
        response += "• Sign up 2-3 months before your trip to meet signup bonus requirements\n";
        response += "• Notify your card issuer of travel plans to avoid blocks\n\n";
      }
      
      if (wantsZeroAPR) {
        response += "\n⚠️ **0% APR Important Notes:**\n";
        response += "• Pay off balance before intro rate expires\n";
        response += "• Make minimum payments on time to keep 0% rate\n";
        response += "• Plan your Europe trip expenses within the intro period\n\n";
      }
      
      // Add quick apply section
      response += "\n🎯 **Ready to Apply?** Click the \"Apply Now\" links above to get started!\n\n";
      response += "💬 **Want more details?** Ask me about specific cards, approval requirements, or compare cards side-by-side!";
      
      return response;
    }

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
    const queryText = input;
    setInput('');
    setIsLoading(true);

    try {
      console.log('[VittaApp] Processing query with conversation engine');
      console.log('[VittaApp] Current userCards in state:', userCards?.length || 0, 'cards');

      // Refresh cards from DB to ensure we have latest data (e.g., after manual DB updates)
      const latestCards = await refreshCards();
      console.log('[VittaApp] Refreshed cards from DB:', latestCards?.length || 0, 'cards');

      // Use fresh cards from database
      const userData = {
        user_id: user?.id || null,
        cards: latestCards || userCards || []
      };

      // Load conversation history for context
      const history = loadConversationHistory();
      const context = {
        history: history.slice(-5), // Last 5 exchanges for context
        previousIntent: history.length > 0 ? history[history.length - 1].intent : null
      };

      // Process query through intelligent conversation engine
      const response = await processQuery(queryText, userData, context);

      setMessages(prev => [...prev, {
        type: 'bot',
        content: response,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('[VittaApp] Error processing query:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Navigation handler for deep links in chat
  const handleChatNavigate = (screenPath) => {
    console.log('[VittaApp] Navigating to:', screenPath);
    // Map screen paths to currentScreen values
    const screenMapping = {
      'chat': 'main',
      'cards': 'creditCards',
      'optimizer': 'paymentOptimizer',
      'dashboard': 'dashboard',
      'recommendations': 'recommendations',
      'expenses': 'main' // Default to main if not implemented
    };

    const targetScreen = screenMapping[screenPath] || 'main';
    setCurrentScreen(targetScreen);
    setIsOpen(false); // Close chat when navigating
  };

  const sampleQuestions = [
    "What cards are in my wallet?",
    "Which card should I use at Costco?",
    "Best card for groceries?",
    "Any payments due next week?",
    "Show me my card balances",
    "Which card should I use for dining?",
    "Optimize my payments",
    "Navigate me to add a card"
  ];

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // If credit card screen is active, show it
  if (currentScreen === 'creditCards') {
    return (
      <CreditCardScreen
        onBack={() => setCurrentScreen('main')}
        user={user}
        onCardsChanged={refreshCards} // Refresh cards when add/update/delete happens
      />
    );
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

  // If recommendations screen is active, show it
  if (currentScreen === 'recommendations') {
    return (
      <RecommendationScreen
        onBack={() => setCurrentScreen('main')}
        user={user}
        userCards={userCards}
      />
    );
  }

  // Main interface after login - Use VittaChatInterface for all users
  if (isAuthenticated && user) {
    return (
      <VittaChatInterface
        user={user}
        onLogout={handleLogout}
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        handleSendMessage={handleSendMessage}
        handleKeyPress={handleKeyPress}
        MessageContent={MessageContent}
        isDemoMode={user.provider !== 'google'}
        onCardsChanged={refreshCards}
      />
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
              onClick={() => setCurrentScreen('dashboard')}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentScreen('creditCards')}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <Wallet className="w-4 h-4" />
              My Cards
            </button>
            <button
              onClick={() => setCurrentScreen('paymentOptimizer')}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
            >
              <Calculator className="w-4 h-4" />
              Smart Payments
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
            Your intelligent credit card platform is ready! Get personalized card recommendations,
            optimize your payments, and maximize rewards with AI-powered insights.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setCurrentScreen('dashboard')}>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <LayoutDashboard className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Dashboard</h3>
            <p className="text-gray-600">View personalized payment recommendations and see which card to use for every category and time period.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setCurrentScreen('creditCards')}>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">My Wallet</h3>
            <p className="text-gray-600">Manage your credit cards by type. Add cards without sensitive info - no card numbers needed.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setCurrentScreen('paymentOptimizer')}>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Payment Strategy</h3>
            <p className="text-gray-600">Optimize monthly payments across cards to minimize interest based on APR, balance, and your budget.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setIsOpen(true)}>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Assistant</h3>
            <p className="text-gray-600">Ask which card to use at Costco, for groceries, or any purchase. Get instant, personalized recommendations.</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setCurrentScreen('recommendations')}>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Card Discovery</h3>
            <p className="text-gray-600">Discover new credit cards that could improve your rewards and fit your spending patterns.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-gray-600 mb-6">Start by chatting with your Vitta AI Assistant</p>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            Open Vitta AI Assistant
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
                          <MessageContent content={message.content} onNavigate={handleChatNavigate} />
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
              <div className="border-t border-gray-100 p-3">
                <p className="text-xs text-gray-600 mb-2">Try asking:</p>
                <div className="flex flex-wrap gap-1">
                  {["Which card for groceries?", "Best card at Costco?"].map((question, index) => (
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

              {/* Input */}
              <div className="border-t border-gray-100 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Which card should I use for..."
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

    </div>
  );
};

export default VittaApp;