import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, TrendingDown, DollarSign, Calendar, Shield, Zap, ArrowRight, Plus, Eye, EyeOff, Trash2, Edit, Utensils, ShoppingBag, Plane, Fuel, Star } from 'lucide-react';
import { getUserCards, addCard, updateCard, deleteCard } from '../services/cardService';

const CreditCardScreen = ({ onBack, user, onCardsChanged }) => {
  const [showCardNumbers, setShowCardNumbers] = useState(false);
  const [selectedCard, setSelectedCard] = useState(0);
  const [creditCards, setCreditCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({
    // Card Identity
    card_name: '',
    nickname: '',
    issuer: '',
    card_network: 'Visa',
    card_type: '', // Legacy field

    // Financial Details
    apr: '',
    credit_limit: '',
    current_balance: '',
    amount_to_pay: '',
    annual_fee: '0',

    // Statement Cycle - User provides actual dates, we calculate recurring values
    statement_close_date: '', // Actual date from statement (for calculation only)
    payment_due_date: '', // Actual due date from statement (for calculation only)

    // These will be calculated from above dates and stored in DB
    statement_close_day: '', // Day of month (calculated)
    grace_period_days: '', // Days between close and due (calculated)

    // Legacy date field (for backward compatibility)
    due_date: '',

    // Rewards
    reward_dining: '1',
    reward_groceries: '1',
    reward_travel: '1',
    reward_gas: '1',
    reward_default: '1',

    // Metadata
    is_manual_entry: true
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
      console.log('[CreditCardScreen] First card:', cards && cards[0]);
      if (cards && cards[0]) {
        console.log('[CreditCardScreen] First card has nickname?', cards[0].nickname);
      }
    } catch (error) {
      console.error('[CreditCardScreen] Error loading cards:', error);
      setCreditCards([]);
    }
    setIsLoading(false);
  };

  const handleAddCard = async () => {
    try {
      // Build reward structure from individual fields
      const rewardStructure = {
        dining: parseFloat(newCard.reward_dining) || 1,
        groceries: parseFloat(newCard.reward_groceries) || 1,
        travel: parseFloat(newCard.reward_travel) || 1,
        gas: parseFloat(newCard.reward_gas) || 1,
        default: parseFloat(newCard.reward_default) || 1
      };

      // Calculate recurring cycle values from actual dates (if provided)
      // This matches the logic in CardDetailsForm.js for consistency
      let statementCloseDay = null;
      let paymentDueDay = null;
      let gracePeriodDays = null;
      let statementCycleStart = null;

      if (newCard.statement_close_date && newCard.payment_due_date) {
        const closeDate = new Date(newCard.statement_close_date);
        const dueDate = new Date(newCard.payment_due_date);

        // Extract day of month for recurring cycle (same as CardDetailsForm)
        // Use split to avoid timezone issues with date-only strings
        statementCloseDay = parseInt(newCard.statement_close_date.split('-')[2], 10);
        paymentDueDay = parseInt(newCard.payment_due_date.split('-')[2], 10);

        // Calculate grace period (days between close and due)
        const diffTime = dueDate - closeDate;
        gracePeriodDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Calculate statement cycle start (typically 30 days before close)
        statementCycleStart = new Date(closeDate);
        statementCycleStart.setDate(statementCycleStart.getDate() - 30);

        console.log('[CreditCardScreen] Calculated from dates:', {
          statementCloseDate: newCard.statement_close_date,
          paymentDueDate: newCard.payment_due_date,
          calculatedCloseDay: statementCloseDay,
          calculatedPaymentDueDay: paymentDueDay,
          calculatedGracePeriod: gracePeriodDays,
          calculatedCycleStart: statementCycleStart?.toISOString().split('T')[0]
        });
      }

      const cardData = {
        user_id: user.id,

        // Card Identity
        card_name: newCard.card_name || 'Unnamed Card',
        nickname: newCard.nickname || null,
        issuer: newCard.issuer || null,
        card_network: newCard.card_network || 'Visa',
        card_type: newCard.card_type || newCard.card_network, // Legacy compatibility

        // Financial Details
        apr: parseFloat(newCard.apr) || 0,
        credit_limit: parseFloat(newCard.credit_limit) || 0,
        current_balance: parseFloat(newCard.current_balance) || 0,
        amount_to_pay: parseFloat(newCard.amount_to_pay) || 0,
        annual_fee: parseFloat(newCard.annual_fee) || 0,

        // Statement Cycle - Recurring values (day-of-month, 1-31)
        // These match the logic in CardDetailsForm.js and addCardFromCatalog
        statement_close_day: statementCloseDay,
        payment_due_day: paymentDueDay,
        grace_period_days: gracePeriodDays,

        // Legacy date fields (for backward compatibility)
        due_date: newCard.payment_due_date || null,
        statement_cycle_start: statementCycleStart ? statementCycleStart.toISOString().split('T')[0] : null,
        statement_cycle_end: newCard.statement_close_date || null,

        // Rewards
        reward_structure: rewardStructure,

        // Metadata
        is_manual_entry: true
      };

      console.log('[CreditCardScreen] Final card data to save:', cardData);
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
        card_name: '',
        nickname: '',
        issuer: '',
        card_network: 'Visa',
        card_type: '',
        apr: '',
        credit_limit: '',
        current_balance: '',
        amount_to_pay: '',
        annual_fee: '0',
        statement_close_date: '',
        payment_due_date: '',
        statement_close_day: '',
        grace_period_days: '',
        due_date: '',
        reward_dining: '1',
        reward_groceries: '1',
        reward_travel: '1',
        reward_gas: '1',
        reward_default: '1',
        is_manual_entry: true
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
          {creditCards.map((card, index) => {
            const displayName = card.nickname || card.card_name || card.card_type;

            return (
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
                <span className="font-medium">{displayName}</span>
                <div className={`w-3 h-3 rounded-full ${
                  card.current_balance > 0 ? 'bg-red-500' : 'bg-green-500'
                }`}></div>
              </button>
            );
          })}
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
                {/* Card Identity - Nickname (large) with official name (subtitle) */}
                <div className="pb-3 border-b border-gray-200">
                  {currentCard.nickname ? (
                    <>
                      <h4 className="text-2xl font-bold text-gray-900 mb-1">{currentCard.nickname}</h4>
                      <p className="text-sm text-gray-600">{currentCard.card_name || currentCard.card_type}</p>
                    </>
                  ) : (
                    <h4 className="text-2xl font-bold text-gray-900">{currentCard.card_name || currentCard.card_type}</h4>
                  )}

                  {/* Network and Issuer on same line */}
                  {(currentCard.card_network || currentCard.issuer) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {currentCard.card_network}
                      {currentCard.card_network && currentCard.issuer && ' • '}
                      {currentCard.issuer}
                    </p>
                  )}
                </div>

                {/* Account Details */}
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

// Enhanced Add Card Modal Component with Tabbed Interface
const AddCardModal = ({ newCard, setNewCard, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = React.useState('basic');

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const helpTextClass = "text-xs text-gray-500 mt-1";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl">
        {/* Header with Card Preview */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Add New Credit Card</h2>
          <p className="text-blue-100 text-sm">Enter your card details below - all information is stored securely</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'statement'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Statement Cycle
            </button>
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'rewards'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Rewards
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Card Name * <span className="text-red-500">Required</span></label>
                  <input
                    type="text"
                    value={newCard.card_name}
                    onChange={(e) => setNewCard({ ...newCard, card_name: e.target.value })}
                    placeholder="Chase Sapphire Preferred"
                    className={inputClass}
                  />
                  <p className={helpTextClass}>Official card name from your issuer</p>
                </div>

                <div>
                  <label className={labelClass}>Nickname (optional)</label>
                  <input
                    type="text"
                    value={newCard.nickname}
                    onChange={(e) => setNewCard({ ...newCard, nickname: e.target.value })}
                    placeholder="My Travel Card"
                    className={inputClass}
                  />
                  <p className={helpTextClass}>Personal name to identify this card</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Issuer</label>
                  <input
                    type="text"
                    value={newCard.issuer}
                    onChange={(e) => setNewCard({ ...newCard, issuer: e.target.value })}
                    placeholder="Chase, Amex, Citi, etc."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Card Network</label>
                  <select
                    value={newCard.card_network}
                    onChange={(e) => setNewCard({ ...newCard, card_network: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">American Express</option>
                    <option value="Discover">Discover</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-5">
                <h4 className="font-semibold text-gray-900 mb-4">Financial Details</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>APR (%) * <span className="text-red-500">Required</span></label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCard.apr}
                      onChange={(e) => setNewCard({ ...newCard, apr: e.target.value })}
                      placeholder="18.99"
                      className={inputClass}
                    />
                    <p className={helpTextClass}>Annual Percentage Rate (interest rate)</p>
                  </div>

                  <div>
                    <label className={labelClass}>Credit Limit * <span className="text-red-500">Required</span></label>
                    <input
                      type="number"
                      value={newCard.credit_limit}
                      onChange={(e) => setNewCard({ ...newCard, credit_limit: e.target.value })}
                      placeholder="15000"
                      className={inputClass}
                    />
                    <p className={helpTextClass}>Total credit limit in dollars</p>
                  </div>

                  <div>
                    <label className={labelClass}>Current Balance</label>
                    <input
                      type="number"
                      value={newCard.current_balance}
                      onChange={(e) => setNewCard({ ...newCard, current_balance: e.target.value })}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Minimum Payment Due</label>
                    <input
                      type="number"
                      value={newCard.amount_to_pay}
                      onChange={(e) => setNewCard({ ...newCard, amount_to_pay: e.target.value })}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Annual Fee ($)</label>
                    <input
                      type="number"
                      value={newCard.annual_fee}
                      onChange={(e) => setNewCard({ ...newCard, annual_fee: e.target.value })}
                      placeholder="0"
                      className={inputClass}
                    />
                    <p className={helpTextClass}>Enter 0 for no annual fee</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statement Cycle Tab */}
          {activeTab === 'statement' && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2">How Statement Cycles Work</h4>
                <p className="text-sm text-blue-800">
                  Provide any recent statement close date and payment due date from your credit card statement.
                  We'll automatically calculate the recurring monthly pattern (which day of month it closes and the grace period).
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Statement Close Date</label>
                  <input
                    type="date"
                    value={newCard.statement_close_date}
                    onChange={(e) => setNewCard({ ...newCard, statement_close_date: e.target.value })}
                    className={inputClass}
                  />
                  <p className={helpTextClass}>From your most recent statement (any month)</p>
                </div>

                <div>
                  <label className={labelClass}>Payment Due Date</label>
                  <input
                    type="date"
                    value={newCard.payment_due_date}
                    onChange={(e) => setNewCard({ ...newCard, payment_due_date: e.target.value })}
                    className={inputClass}
                  />
                  <p className={helpTextClass}>Corresponding payment due date</p>
                </div>
              </div>

              {/* Show calculated values in real-time */}
              {newCard.statement_close_date && newCard.payment_due_date && (() => {
                const closeDate = new Date(newCard.statement_close_date);
                const dueDate = new Date(newCard.payment_due_date);
                const dayOfMonth = closeDate.getDate();
                const gracePeriod = Math.round((dueDate - closeDate) / (1000 * 60 * 60 * 24));

                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">✓ Calculated Recurring Pattern</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-700 font-medium">Statement Closes On:</p>
                        <p className="text-green-900 text-lg font-bold">Day {dayOfMonth} of every month</p>
                      </div>
                      <div>
                        <p className="text-green-700 font-medium">Grace Period:</p>
                        <p className="text-green-900 text-lg font-bold">{gracePeriod} days</p>
                      </div>
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      Future payments will be calculated automatically based on this pattern
                    </p>
                  </div>
                );
              })()}

              <div className="border-t border-gray-200 pt-5">
                <h4 className="font-semibold text-gray-900 mb-3">Alternative: One-Time Due Date (Not Recommended)</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Only use this if you don't know your statement cycle. This will need to be updated manually each month.
                </p>
                <div>
                  <label className={labelClass}>Next Due Date</label>
                  <input
                    type="date"
                    value={newCard.due_date}
                    onChange={(e) => setNewCard({ ...newCard, due_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <div className="space-y-5">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-purple-900 mb-2">Reward Multipliers</h4>
                <p className="text-sm text-purple-800">
                  Enter the cashback percentage or points multiplier for each category.
                  For example, "3" means 3% cashback or 3x points. Default is 1% for all purchases.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Dining & Restaurants</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newCard.reward_dining}
                      onChange={(e) => setNewCard({ ...newCard, reward_dining: e.target.value })}
                      placeholder="1"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <span className="text-sm text-gray-500">%/x</span>
                </div>

                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Groceries</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newCard.reward_groceries}
                      onChange={(e) => setNewCard({ ...newCard, reward_groceries: e.target.value })}
                      placeholder="1"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <span className="text-sm text-gray-500">%/x</span>
                </div>

                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plane className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Travel</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newCard.reward_travel}
                      onChange={(e) => setNewCard({ ...newCard, reward_travel: e.target.value })}
                      placeholder="1"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <span className="text-sm text-gray-500">%/x</span>
                </div>

                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Fuel className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Gas & Fuel</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newCard.reward_gas}
                      onChange={(e) => setNewCard({ ...newCard, reward_gas: e.target.value })}
                      placeholder="1"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <span className="text-sm text-gray-500">%/x</span>
                </div>

                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg md:col-span-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Everything Else (Default)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newCard.reward_default}
                      onChange={(e) => setNewCard({ ...newCard, reward_default: e.target.value })}
                      placeholder="1"
                      className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <span className="text-sm text-gray-500">%/x</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {activeTab === 'basic' && '* Required fields must be filled'}
            {activeTab === 'statement' && 'Statement cycle is optional but recommended'}
            {activeTab === 'rewards' && 'Rewards are optional, default is 1% for all'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!newCard.card_name || !newCard.apr || !newCard.credit_limit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Add Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardScreen;
