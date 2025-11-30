import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MessageCircle, CreditCard, TrendingUp, LogOut, Send, Bot, User, Menu, X, Wallet, Plus, Trash2, Sparkles } from 'lucide-react';
import PaymentOptimizer from './PaymentOptimizer';
import CreditCardScreen from './CreditCardScreen';
import RecommendationScreen from './RecommendationScreen';
import AddCardFlow from './AddCardFlow';
import { getUserCards, addCard, deleteCard, calculateUtilization } from '../services/cardService';

const VittaChatInterface = ({ user, onLogout, messages, input, setInput, isLoading, handleSendMessage, handleKeyPress, MessageContent, isDemoMode = false, onCardsChanged }) => {
  const [quickActionTrigger, setQuickActionTrigger] = useState(false);
  const textareaRef = useRef(null);

  // Helper function to send a quick action message directly
  const sendQuickAction = useCallback((query) => {
    setInput(query);
    setQuickActionTrigger(true);
  }, [setInput, setQuickActionTrigger]);

  // Effect to trigger send after input is set by quick action
  useEffect(() => {
    if (quickActionTrigger && input) {
      handleSendMessage();
      setQuickActionTrigger(false);
    }
  }, [quickActionTrigger, input, handleSendMessage]);

  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'optimizer', 'cards', 'add-card'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Navigation handler for deep links
  const handleNavigate = useCallback((screenPath) => {
    console.log('[VittaChatInterface] Navigating to:', screenPath);
    setCurrentView(screenPath);
  }, []);
  const [cards, setCards] = useState([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [formData, setFormData] = useState({
    card_type: '',
    card_name: '',
    apr: '',
    credit_limit: '',
    current_balance: '',
    amount_to_pay: '',
    due_date: '',
    statement_cycle_start: '',
    statement_cycle_end: ''
  });

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  // Load cards for Google users
  const loadCards = useCallback(async () => {
    try {
      setIsLoadingCards(true);
      const userCards = await getUserCards(user.id);
      setCards(userCards);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setIsLoadingCards(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isDemoMode && user?.id) {
      loadCards();
    } else {
      setIsLoadingCards(false);
    }
  }, [isDemoMode, loadCards, user?.id]);

  const handleAddCard = useCallback(async (e) => {
    e.preventDefault();
    try {
      const newCard = await addCard({
        user_id: user.id,
        card_type: formData.card_type,
        card_name: formData.card_name || formData.card_type,
        apr: parseFloat(formData.apr),
        credit_limit: parseFloat(formData.credit_limit),
        current_balance: parseFloat(formData.current_balance) || 0,
        amount_to_pay: parseFloat(formData.amount_to_pay) || 0,
        due_date: formData.due_date || null,
        statement_cycle_start: formData.statement_cycle_start ? parseInt(formData.statement_cycle_start) : null,
        statement_cycle_end: formData.statement_cycle_end ? parseInt(formData.statement_cycle_end) : null
      });
      setCards(prev => [...prev, newCard]);
      console.log('[VittaChatInterface] Card added, calling onCardsChanged...');
      if (onCardsChanged) {
        await onCardsChanged();
        console.log('[VittaChatInterface] onCardsChanged callback completed');
      }
      setShowAddCard(false);
      setFormData({
        card_type: '',
        card_name: '',
        apr: '',
        credit_limit: '',
        current_balance: '',
        amount_to_pay: '',
        due_date: '',
        statement_cycle_start: '',
        statement_cycle_end: ''
      });
    } catch (error) {
      console.error('Error adding card:', error);
      alert('Failed to add card. Please try again.');
    }
  }, [formData, onCardsChanged, user?.id]);

  const handleDeleteCard = useCallback(async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    try {
      await deleteCard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
      console.log('[VittaChatInterface] Card deleted, calling onCardsChanged...');
      if (onCardsChanged) {
        await onCardsChanged();
        console.log('[VittaChatInterface] onCardsChanged callback completed');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card. Please try again.');
    }
  }, [onCardsChanged]);

  // Sidebar Navigation
  const Sidebar = () => (
    <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-gradient-to-b from-blue-900 to-indigo-900 text-white flex flex-col transition-all duration-300 overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-blue-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-blue-600 font-bold text-sm">V</span>
          </div>
          <span className="font-semibold">Vitta</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden text-blue-200 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-4 space-y-2">
        <button
          onClick={() => setCurrentView('chat')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'chat'
              ? 'bg-white/20 text-white shadow-lg'
              : 'text-blue-100 hover:bg-white/10'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span>Vitta Chat</span>
        </button>

        <button
          onClick={() => setCurrentView('optimizer')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'optimizer'
              ? 'bg-white/20 text-white shadow-lg'
              : 'text-blue-100 hover:bg-white/10'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span>Payment Optimizer</span>
        </button>

        <button
          onClick={() => setCurrentView('cards')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'cards'
              ? 'bg-white/20 text-white shadow-lg'
              : 'text-blue-100 hover:bg-white/10'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>Cards</span>
        </button>

        <button
          onClick={() => setCurrentView('recommendations')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            currentView === 'recommendations'
              ? 'bg-white/20 text-white shadow-lg'
              : 'text-blue-100 hover:bg-white/10'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>Card Discovery</span>
        </button>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-blue-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
              <span className="text-blue-600 font-bold text-xs">{user?.name?.[0] || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-blue-200 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-blue-200 hover:text-white transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // Chat View
  const ChatView = useMemo(() => (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }`}>
                {message.type === 'user' ?
                  <User className="w-4 h-4 text-white" /> :
                  <Bot className="w-4 h-4 text-white" />
                }
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium mb-1 ${
                  message.type === 'user' ? 'text-right text-gray-700' : 'text-left text-gray-700'
                }`}>
                  {message.type === 'user' ? user?.name || 'You' : 'Vitta AI'}
                </div>
                <div className={`p-4 rounded-lg shadow-sm ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-white text-gray-900'
                }`}>
                  <div className="whitespace-pre-line leading-relaxed">
                    <MessageContent content={message.content} onNavigate={handleNavigate} />
                  </div>
                </div>
                <div className={`text-xs text-gray-500 mt-1 ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium mb-1 text-gray-700">Vitta AI</div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Buttons - Inside messages area */}
        {messages.filter(m => m.type === 'user').length === 0 && (
          <div className="max-w-3xl mx-auto mt-6">
            <p className="text-sm text-gray-600 mb-3 font-medium">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => sendQuickAction('list my cards')}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  disabled={isLoading}
                >
                  📋 List my cards
                </button>
                <button
                  onClick={() => sendQuickAction('show my balances')}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  disabled={isLoading}
                >
                  💰 Show balances
                </button>
                <button
                  onClick={() => sendQuickAction('card with lowest APR')}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  disabled={isLoading}
                >
                  📊 Lowest APR card
                </button>
                <button
                  onClick={() => sendQuickAction('when are my payments due')}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  disabled={isLoading}
                >
                  📅 Payment due dates
                </button>
                <button
                  onClick={() => handleNavigate('cards')}
                  className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  disabled={isLoading}
                >
                  ➕ Add new card
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-3 md:p-4 bg-white sticky bottom-0 z-40">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me about your cards, payments, or which card to use..."
              rows={1}
              wrap="soft"
              className="w-full p-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto max-h-40 text-sm md:text-base"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ), [messages, isLoading, input, user, handleKeyPress, handleSendMessage, handleNavigate, sendQuickAction, setInput]);

  // Payment Optimizer View
  const OptimizerView = useMemo(() => (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Payment Optimizer</h1>
        <PaymentOptimizer cards={cards} isDemoMode={isDemoMode} />
      </div>
    </div>
  ), [cards, isDemoMode]);

  // Cards View - My Wallet
  const CardsView = useMemo(() => (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Wallet</h1>

        {isDemoMode ? (
          <CreditCardScreen />
        ) : (
          <div className="space-y-6">
            {/* Add Card Button */}
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Manage your credit cards without entering sensitive information</p>
              <button
                onClick={() => setCurrentView('add-card')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Card
              </button>
            </div>
            {/* Add Card Form */}
            {showAddCard && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Card</h3>
                <form onSubmit={handleAddCard} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Card Type *</label>
                      <input
                        type="text"
                        required
                        value={formData.card_type}
                        onChange={(e) => setFormData(prev => ({...prev, card_type: e.target.value}))}
                        placeholder="e.g., Amex Gold, Chase Freedom"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Card Nickname (Optional)</label>
                      <input
                        type="text"
                        value={formData.card_name}
                        onChange={(e) => setFormData(prev => ({...prev, card_name: e.target.value}))}
                        placeholder="e.g., My Travel Card"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">APR (%) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.apr}
                        onChange={(e) => setFormData(prev => ({...prev, apr: e.target.value}))}
                        placeholder="e.g., 18.99"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.credit_limit}
                        onChange={(e) => setFormData(prev => ({...prev, credit_limit: e.target.value}))}
                        placeholder="e.g., 10000"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Balance ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.current_balance}
                        onChange={(e) => setFormData(prev => ({...prev, current_balance: e.target.value}))}
                        placeholder="e.g., 2500"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Pay ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount_to_pay}
                        onChange={(e) => setFormData(prev => ({...prev, amount_to_pay: e.target.value}))}
                        placeholder="e.g., 500"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCard(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Cards List */}
            {isLoadingCards ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading your cards...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cards Yet</h3>
                <p className="text-gray-600 mb-4">Add your first credit card to get started</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {cards.map(card => {
                  const utilization = calculateUtilization(card);
                  const availableCredit = card.credit_limit - card.current_balance;

                  return (
                    <div key={card.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{card.nickname || card.card_name || card.card_type}</h3>
                          {card.nickname && <p className="text-sm text-gray-600">{card.card_name || card.card_type}</p>}
                          {(card.card_network || card.issuer) && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {card.card_network}
                              {card.card_network && card.issuer && ' • '}
                              {card.issuer}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Show reward structure if available */}
                        {card.reward_structure && typeof card.reward_structure === 'object' && Object.keys(card.reward_structure).length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <p className="text-xs font-semibold text-blue-900 mb-2">Rewards</p>
                            <div className="space-y-1">
                              {Object.entries(card.reward_structure).map(([category, multiplier]) => (
                                <div key={category} className="flex justify-between text-xs">
                                  <span className="text-blue-700 capitalize">{category}:</span>
                                  <span className="font-semibold text-blue-900">{multiplier}x points</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">APR:</span>
                          <span className="text-sm font-semibold text-gray-900">{card.apr}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Credit Limit:</span>
                          <span className="text-sm font-semibold text-gray-900">${card.credit_limit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Current Balance:</span>
                          <span className="text-sm font-semibold text-red-600">${card.current_balance.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Available Credit:</span>
                          <span className="text-sm font-semibold text-green-600">${availableCredit.toLocaleString()}</span>
                        </div>

                        {/* Utilization Bar */}
                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Utilization</span>
                            <span className={utilization > 70 ? 'text-red-600 font-semibold' : utilization > 30 ? 'text-yellow-600' : 'text-green-600'}>
                              {utilization}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                utilization > 70 ? 'bg-red-500' : utilization > 30 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ), [cards, formData, handleAddCard, handleDeleteCard, isDemoMode, isLoadingCards, setCurrentView, showAddCard]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {!isSidebarOpen && (
          <div className="lg:hidden p-4 bg-white border-b border-gray-200 flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-semibold text-gray-900">Vitta</span>
            </div>
          </div>
        )}

        {/* Content Area */}
        {currentView === 'chat' && ChatView}
        {currentView === 'optimizer' && OptimizerView}
        {currentView === 'cards' && CardsView}
        {currentView === 'recommendations' && (
          <RecommendationScreen
            onBack={() => setCurrentView('chat')}
            user={user}
            userCards={cards}
          />
        )}
        {currentView === 'add-card' && (
          <AddCardFlow
            user={user}
            onComplete={(newCard) => {
              // Refresh cards list
              loadCards();
              // Notify parent if callback provided
              if (onCardsChanged) {
                onCardsChanged();
              }
              // Go back to cards view
              setCurrentView('cards');
            }}
            onCancel={() => setCurrentView('cards')}
          />
        )}
      </div>
    </div>
  );
};

export default VittaChatInterface;
