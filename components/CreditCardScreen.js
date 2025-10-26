import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, TrendingDown, DollarSign, Calendar, Shield, Zap, ArrowRight, Plus, Eye, EyeOff, Trash2, Edit } from 'lucide-react';
import { getUserCards, addCard, updateCard, deleteCard } from '../services/cardService';

const CreditCardScreen = ({ onBack, user, onCardsChanged }) => {
  const [showCardNumbers, setShowCardNumbers] = useState(false);
  const [selectedCard, setSelectedCard] = useState(0);
  const [creditCards, setCreditCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({
    card_type: '',
    card_name: '',
    apr: '',
    credit_limit: '',
    current_balance: '',
    amount_to_pay: '',
    due_date: ''
  });

  // Load cards from database on mount
  useEffect(() => {
    loadCards();
  }, [user]);

  const loadCards = async () => {
    if (!user || !user.id) return;

    setIsLoading(true);
    try {
      const cards = await getUserCards(user.id);
      setCreditCards(cards || []);
      console.log('[CreditCardScreen] Loaded cards:', cards?.length || 0);
    } catch (error) {
      console.error('[CreditCardScreen] Error loading cards:', error);
      setCreditCards([]);
    }
    setIsLoading(false);
  };

  const handleAddCard = async () => {
    try {
      const cardData = {
        user_id: user.id,
        card_type: newCard.card_type,
        card_name: newCard.card_name || newCard.card_type,
        apr: parseFloat(newCard.apr) || 0,
        credit_limit: parseFloat(newCard.credit_limit) || 0,
        current_balance: parseFloat(newCard.current_balance) || 0,
        amount_to_pay: parseFloat(newCard.amount_to_pay) || 0,
        due_date: newCard.due_date || null
      };

      await addCard(cardData);
      console.log('[CreditCardScreen] Card added successfully');

      // Reload cards and trigger parent refresh
      await loadCards();
      console.log('[CreditCardScreen] Calling onCardsChanged callback...');
      if (onCardsChanged) {
        await onCardsChanged();
        console.log('[CreditCardScreen] onCardsChanged callback completed');
      } else {
        console.warn('[CreditCardScreen] onCardsChanged callback not provided!');
      }

      // Reset form and close modal
      setNewCard({
        card_type: '',
        card_name: '',
        apr: '',
        credit_limit: '',
        current_balance: '',
        amount_to_pay: '',
        due_date: ''
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('[CreditCardScreen] Error adding card:', error);
      alert('Failed to add card. Please try again.');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      await deleteCard(cardId);
      console.log('[CreditCardScreen] Card deleted successfully');

      // Reload cards and trigger parent refresh
      await loadCards();
      console.log('[CreditCardScreen] Calling onCardsChanged callback after delete...');
      if (onCardsChanged) {
        await onCardsChanged();
        console.log('[CreditCardScreen] onCardsChanged callback completed');
      } else {
        console.warn('[CreditCardScreen] onCardsChanged callback not provided!');
      }

      // Reset selection if needed
      if (selectedCard >= creditCards.length - 1) {
        setSelectedCard(Math.max(0, creditCards.length - 2));
      }
    } catch (error) {
      console.error('[CreditCardScreen] Error deleting card:', error);
      alert('Failed to delete card. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your cards...</p>
        </div>
      </div>
    );
  }

  if (creditCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={onBack} className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2">
            ← Back
          </button>

          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <CreditCard className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Cards Yet</h2>
            <p className="text-gray-600 mb-8">Add your first credit card to get started with smart payment optimization</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Add Your First Card
            </button>
          </div>
        </div>

        {showAddModal && (
          <AddCardModal
            newCard={newCard}
            setNewCard={setNewCard}
            onSave={handleAddCard}
            onCancel={() => setShowAddModal(false)}
          />
        )}
      </div>
    );
  }

  // Use real cards from database
  const currentCard = creditCards[selectedCard];
  const utilizationRate = ((currentCard.current_balance / currentCard.credit_limit) * 100).toFixed(1);
  const daysUntilDue = currentCard.due_date
    ? Math.ceil((new Date(currentCard.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const getCardColor = (cardType) => {
    const type = cardType?.toLowerCase() || '';
    if (type.includes('visa')) return 'from-blue-600 to-blue-800';
    if (type.includes('amex') || type.includes('american express')) return 'from-green-600 to-green-800';
    if (type.includes('mastercard')) return 'from-orange-600 to-red-600';
    if (type.includes('discover')) return 'from-purple-600 to-purple-800';
    return 'from-gray-600 to-gray-800';
  };

  const getOptimizationTips = () => {
    const tips = [];

    if (currentCard.current_balance > 0 && currentCard.due_date) {
      const interestCost = (currentCard.current_balance * currentCard.apr / 100 / 12).toFixed(2);
      tips.push({
        icon: '💡',
        title: 'Pay in Full',
        description: `Pay your $${currentCard.current_balance.toFixed(2)} balance before ${new Date(currentCard.due_date).toLocaleDateString()} to avoid $${interestCost} in interest.`
      });
    }

    if (utilizationRate > 30) {
      tips.push({
        icon: '⚠️',
        title: 'High Utilization',
        description: `Your ${utilizationRate}% utilization rate may impact your credit score. Aim for under 30%.`
      });
    }

    if (currentCard.current_balance === 0 && currentCard.credit_limit > 0) {
      tips.push({
        icon: '✅',
        title: 'Zero Balance',
        description: `Great job! You have no balance on this card. Keep it up!`
      });
    }

    return tips;
  };

  const optimizationTips = getOptimizationTips();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
            >
              <ArrowRight className="w-5 h-5 text-gray-600 rotate-180" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credit Cards</h1>
              <p className="text-gray-600">Manage your cards and optimize rewards</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600 font-medium">Add Card</span>
            </button>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">V</span>
            </div>
          </div>
        </div>

        {/* Card Selection Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {creditCards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(index)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap transition-all ${
                selectedCard === index
                  ? 'bg-white shadow-lg text-blue-600'
                  : 'bg-white/50 hover:bg-white/80 text-gray-600'
              }`}
            >
              <CreditCard className={`w-5 h-5 ${
                selectedCard === index ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <span className="font-medium">{card.card_name || card.card_type}</span>
              <div className={`w-3 h-3 rounded-full ${
                card.current_balance > 0 ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Card Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Visual */}
            <div className={`bg-gradient-to-r ${getCardColor(currentCard.card_type)} rounded-2xl p-6 text-white shadow-2xl`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{currentCard.card_name || currentCard.card_type}</h3>
                    <p className="text-blue-100">{currentCard.card_type}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCard(currentCard.id)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-red-500/80 transition-colors"
                  title="Delete Card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-blue-100 text-sm mb-2">Balance</p>
                <p className="text-3xl font-bold tracking-wider">
                  ${currentCard.current_balance.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Credit Limit</p>
                  <p className="font-medium">${currentCard.credit_limit.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">APR</p>
                  <p className="font-medium">{currentCard.apr}%</p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Utilization</p>
                    <p className="text-2xl font-bold text-gray-900">{utilizationRate}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        utilizationRate < 30 ? 'bg-green-600' : utilizationRate < 50 ? 'bg-yellow-500' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Due</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${currentCard.amount_to_pay?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
                {daysUntilDue !== null ? (
                  <p className="text-sm text-gray-600">
                    Due in {daysUntilDue} days ({new Date(currentCard.due_date).toLocaleDateString()})
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">No due date set</p>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Available Credit</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(currentCard.credit_limit - currentCard.current_balance).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  of ${currentCard.credit_limit.toLocaleString()} limit
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Card Info */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" />
                Card Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Card Name</p>
                  <p className="font-semibold text-gray-900">{currentCard.card_name || currentCard.card_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Card Type</p>
                  <p className="font-semibold text-gray-900">{currentCard.card_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">APR</p>
                  <p className="font-semibold text-gray-900">{currentCard.apr}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Credit Limit</p>
                  <p className="font-semibold text-gray-900">${currentCard.credit_limit.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Smart Tips */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Smart Tips
              </h3>
              <div className="space-y-3">
                {optimizationTips.map((tip, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{tip.icon}</span>
                      <div>
                        <p className="font-medium text-blue-900 text-sm">{tip.title}</p>
                        <p className="text-blue-800 text-xs">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {optimizationTips.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Great job! Your card usage is optimized.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <AddCardModal
          newCard={newCard}
          setNewCard={setNewCard}
          onSave={handleAddCard}
          onCancel={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

// Add Card Modal Component
const AddCardModal = ({ newCard, setNewCard, onSave, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Card</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Type *</label>
            <input
              type="text"
              value={newCard.card_type}
              onChange={(e) => setNewCard({ ...newCard, card_type: e.target.value })}
              placeholder="e.g., Chase Freedom Unlimited"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Name (optional)</label>
            <input
              type="text"
              value={newCard.card_name}
              onChange={(e) => setNewCard({ ...newCard, card_name: e.target.value })}
              placeholder="e.g., My Travel Card"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">APR (%)</label>
              <input
                type="number"
                step="0.01"
                value={newCard.apr}
                onChange={(e) => setNewCard({ ...newCard, apr: e.target.value })}
                placeholder="18.99"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
              <input
                type="number"
                value={newCard.credit_limit}
                onChange={(e) => setNewCard({ ...newCard, credit_limit: e.target.value })}
                placeholder="15000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Balance</label>
              <input
                type="number"
                value={newCard.current_balance}
                onChange={(e) => setNewCard({ ...newCard, current_balance: e.target.value })}
                placeholder="1234.56"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Due</label>
              <input
                type="number"
                value={newCard.amount_to_pay}
                onChange={(e) => setNewCard({ ...newCard, amount_to_pay: e.target.value })}
                placeholder="35"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
            <input
              type="date"
              value={newCard.due_date}
              onChange={(e) => setNewCard({ ...newCard, due_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!newCard.card_type}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add Card
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditCardScreen;
