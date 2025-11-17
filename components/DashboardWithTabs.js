import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LogOut, Wallet, TrendingUp, Star, Plus, Trash2, Edit2, MessageCircle, X, Minimize2, Send, Bot, User } from 'lucide-react';
import { getUserCards, addCard, updateCard, deleteCard, calculateUtilization, getCardRecommendations } from '../services/cardService';
import PaymentOptimizer from './PaymentOptimizer';
import ReminderWidget from './ReminderWidget';

const DashboardWithTabs = ({ onBack, user, messages, input, setInput, isLoading: isChatLoading, handleSendMessage, handleKeyPress, MessageContent }) => {
  const userId = user?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet', 'payments', 'recommendations'
  const [cards, setCards] = useState([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);

  // Form state for adding/editing cards
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

  // Load user's cards on mount
  const loadCards = useCallback(async () => {
    if (!userId) {
      setIsLoadingCards(false);
      return;
    }

    try {
      setIsLoadingCards(true);
      const userCards = await getUserCards(userId);
      setCards(userCards);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setIsLoadingCards(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleAddCard = useCallback(async (e) => {
    e.preventDefault();
    if (!userId) return;

    try {
      const newCard = await addCard({
        user_id: userId,
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
  }, [formData, userId]);

  const handleDeleteCard = useCallback(async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      await deleteCard(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card. Please try again.');
    }
  }, []);

  // My Wallet Tab
  const WalletTab = useMemo(() => (
    <div className="space-y-6">
      {/* Add Card Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Wallet</h2>
        <button
          onClick={() => setShowAddCard(!showAddCard)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Type *
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={formData.card_name}
                  onChange={(e) => setFormData(prev => ({...prev, card_name: e.target.value}))}
                  placeholder="e.g., My Travel Card"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APR (%) *
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Limit ($) *
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Balance ($)
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Pay ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount_to_pay}
                  onChange={(e) => setFormData(prev => ({...prev, amount_to_pay: e.target.value}))}
                  placeholder="e.g., 500"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({...prev, due_date: e.target.value}))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statement Cycle Start (Day of Month)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.statement_cycle_start}
                  onChange={(e) => setFormData(prev => ({...prev, statement_cycle_start: e.target.value}))}
                  placeholder="e.g., 1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statement Cycle End (Day of Month)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.statement_cycle_end}
                  onChange={(e) => setFormData(prev => ({...prev, statement_cycle_end: e.target.value}))}
                  placeholder="e.g., 31"
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
          <p className="text-gray-600 mb-4">Add your first credit card to get started with smart recommendations</p>
          <button
            onClick={() => setShowAddCard(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Card
          </button>
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
                    {card.nickname ? (
                      <>
                        <h3 className="text-lg font-bold text-gray-900">{card.nickname}</h3>
                        <p className="text-sm text-gray-600">{card.card_name || card.card_type}</p>
                        {(card.card_network || card.issuer) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {card.card_network}
                            {card.card_network && card.issuer && ' • '}
                            {card.issuer}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-gray-900">{card.card_name || card.card_type}</h3>
                        {(card.card_network || card.issuer) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {card.card_network}
                            {card.card_network && card.issuer && ' • '}
                            {card.issuer}
                          </p>
                        )}
                      </>
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

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount to Pay:</span>
                    <span className="text-sm font-semibold text-blue-600">${card.amount_to_pay.toLocaleString()}</span>
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
  ), [cards, formData, handleAddCard, handleDeleteCard, isLoadingCards, showAddCard]);

  // Smart Payment Strategy Tab
  const PaymentsTab = useMemo(() => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Smart Payment Strategy</h2>
      {cards.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cards to Optimize</h3>
          <p className="text-gray-600 mb-4">Add credit cards to see payment optimization recommendations</p>
          <button
            onClick={() => setActiveTab('wallet')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to My Wallet
          </button>
        </div>
      ) : (
        <PaymentOptimizer cards={cards} isDemoMode={!user?.provider || user?.provider !== 'google'} />
      )}
    </div>
  ), [cards, user]);

  // Today's Best Card Tab
  const RecommendationsTab = useMemo(() => {
    const recommendations = getCardRecommendations(cards);

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Today&apos;s Best Card</h2>

        {cards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recommendations Yet</h3>
            <p className="text-gray-600 mb-4">Add credit cards to get personalized recommendations</p>
            <button
              onClick={() => setActiveTab('wallet')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Cards Now
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { category: 'Groceries', icon: '🛒', card: recommendations.groceries },
              { category: 'Dining', icon: '🍽️', card: recommendations.dining },
              { category: 'Gas', icon: '⛽', card: recommendations.gas },
              { category: 'General', icon: '💳', card: recommendations.general }
            ].map(({ category, icon, card }) => (
              <div key={category} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{icon}</span>
                  <h3 className="text-lg font-bold text-gray-900">{category}</h3>
                </div>

                {card ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Best card to use:</p>
                    <p className="font-bold text-blue-600 text-lg">{card.nickname || card.card_name || card.card_type}</p>
                    <div className="pt-3 space-y-1 text-sm">
                      <p className="text-gray-600">Available Credit: <span className="font-semibold text-green-600">${(card.credit_limit - card.current_balance).toLocaleString()}</span></p>
                      <p className="text-gray-600">APR: <span className="font-semibold">{card.apr}%</span></p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recommendation available</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [cards]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">V</span>
            </div>
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-2">Vitta</h1>
              <p className="text-xl text-gray-600">Welcome back, {user?.name || 'User'}!</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Signed in as</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <ReminderWidget userId={userId} cards={cards} />

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'wallet'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Wallet className="w-5 h-5" />
            My Wallet
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Smart Payment Strategy
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'recommendations'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Star className="w-5 h-5" />
            Today&apos;s Best Card
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'wallet' && WalletTab}
          {activeTab === 'payments' && PaymentsTab}
          {activeTab === 'recommendations' && RecommendationsTab}
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
                          <MessageContent content={message.content} />
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isChatLoading && (
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
                    disabled={isChatLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isChatLoading}
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

export default DashboardWithTabs;
