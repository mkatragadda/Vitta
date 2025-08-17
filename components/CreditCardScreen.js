import React, { useState } from 'react';
import { CreditCard, TrendingUp, TrendingDown, DollarSign, Calendar, Shield, Zap, ArrowRight, Plus, Eye, EyeOff } from 'lucide-react';

const CreditCardScreen = ({ onBack, user }) => {
  const [showCardNumbers, setShowCardNumbers] = useState(false);
  const [selectedCard, setSelectedCard] = useState(0);

  // Mock credit card data
  const creditCards = [
    {
      id: 1,
      name: 'Chase Freedom Unlimited',
      number: '**** **** **** 5678',
      fullNumber: '4532 1234 5678 9012',
      type: 'Visa',
      balance: 1234.56,
      limit: 15000,
      dueDate: '2024-12-15',
      minPayment: 35,
      apr: 18.99,
      rewards: {
        type: 'Cashback',
        rate: '1.5%',
        categories: ['All purchases'],
        signupBonus: '$200'
      },
      spending: {
        thisMonth: 2340.67,
        lastMonth: 1890.45,
        categories: {
          'Dining': 456.78,
          'Groceries': 234.56,
          'Gas': 89.12,
          'Shopping': 890.45,
          'Utilities': 234.56,
          'Entertainment': 435.20
        }
      }
    },
    {
      id: 2,
      name: 'Amex Gold Card',
      number: '**** **** **** 1234',
      fullNumber: '3782 123456 78901',
      type: 'Amex',
      balance: 0,
      limit: 25000,
      dueDate: '2024-12-20',
      minPayment: 0,
      apr: 0,
      rewards: {
        type: 'Points',
        rate: '4x',
        categories: ['Dining', 'Groceries'],
        signupBonus: '60,000 points'
      },
      spending: {
        thisMonth: 0,
        lastMonth: 0,
        categories: {}
      }
    },
    {
      id: 3,
      name: 'Citi Double Cash',
      number: '**** **** **** 9012',
      fullNumber: '5424 1234 5678 9012',
      type: 'Mastercard',
      balance: 567.89,
      limit: 12000,
      dueDate: '2024-12-10',
      minPayment: 25,
      apr: 16.99,
      rewards: {
        type: 'Cashback',
        rate: '2%',
        categories: ['All purchases'],
        signupBonus: '$150'
      },
      spending: {
        thisMonth: 1234.56,
        lastMonth: 987.65,
        categories: {
          'Online Shopping': 456.78,
          'Bills': 234.56,
          'Transportation': 123.45,
          'Healthcare': 89.67,
          'Other': 330.10
        }
      }
    }
  ];

  const currentCard = creditCards[selectedCard];
  const utilizationRate = (currentCard.balance / currentCard.limit * 100).toFixed(1);
  const daysUntilDue = Math.ceil((new Date(currentCard.dueDate) - new Date()) / (1000 * 60 * 60 * 24));

  const getCardColor = (cardType) => {
    switch (cardType) {
      case 'Visa': return 'from-blue-600 to-blue-800';
      case 'Amex': return 'from-green-600 to-green-800';
      case 'Mastercard': return 'from-orange-600 to-red-600';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getSpendingTrend = (thisMonth, lastMonth) => {
    const change = ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1);
    return {
      value: change,
      isPositive: change > 0,
      trend: change > 0 ? 'up' : 'down'
    };
  };

  const spendingTrend = getSpendingTrend(currentCard.spending.thisMonth, currentCard.spending.lastMonth);

  const getOptimizationTips = () => {
    const tips = [];
    
    if (currentCard.balance > 0) {
      tips.push({
        icon: '💡',
        title: 'Pay in Full',
        description: `Pay your $${currentCard.balance.toFixed(2)} balance before ${currentCard.dueDate} to avoid $${(currentCard.balance * currentCard.apr / 100 / 12).toFixed(2)} in interest.`
      });
    }

    if (utilizationRate > 30) {
      tips.push({
        icon: '⚠️',
        title: 'High Utilization',
        description: `Your ${utilizationRate}% utilization rate may impact your credit score. Aim for under 30%.`
      });
    }

    if (currentCard.rewards.type === 'Cashback' && currentCard.spending.thisMonth > 1000) {
      tips.push({
        icon: '🎯',
        title: 'Rewards Optimization',
        description: `You're earning ${currentCard.rewards.rate} cashback on all purchases. Consider using this card for non-category spending.`
      });
    }

    if (currentCard.rewards.type === 'Points' && currentCard.spending.thisMonth === 0) {
      tips.push({
        icon: '🚀',
        title: 'Activate Card',
        description: `Start using your Amex Gold to earn 4x points on dining and groceries.`
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
            <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
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
              <span className="font-medium">{card.name}</span>
              <div className={`w-3 h-3 rounded-full ${
                card.balance > 0 ? 'bg-red-500' : 'bg-green-500'
              }`}></div>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Card Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Visual */}
            <div className={`bg-gradient-to-r ${getCardColor(currentCard.type)} rounded-2xl p-6 text-white shadow-2xl`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{currentCard.name}</h3>
                    <p className="text-blue-100">{currentCard.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCardNumbers(!showCardNumbers)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  {showCardNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-blue-100 text-sm mb-2">Card Number</p>
                <p className="text-2xl font-mono tracking-wider">
                  {showCardNumbers ? currentCard.fullNumber : currentCard.number}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Cardholder</p>
                  <p className="font-medium">{user?.name || 'Cardholder'}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Expires</p>
                  <p className="font-medium">12/28</p>
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
                    <p className="text-sm text-gray-600">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900">${currentCard.balance.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{utilizationRate}%</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Due</p>
                    <p className="text-2xl font-bold text-gray-900">${currentCard.minPayment}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Due in {daysUntilDue} days ({currentCard.dueDate})
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">${currentCard.spending.thisMonth.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {spendingTrend.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  )}
                  <span className={`text-sm ${
                    spendingTrend.trend === 'up' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {spendingTrend.trend === 'up' ? '+' : ''}{spendingTrend.value}% vs last month
                  </span>
                </div>
              </div>
            </div>

            {/* Spending Categories */}
            {Object.keys(currentCard.spending.categories).length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Spending by Category</h3>
                <div className="space-y-3">
                  {Object.entries(currentCard.spending.categories).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-700">{category}</span>
                      <span className="font-semibold text-gray-900">${amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Rewards Summary */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Rewards Program
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-semibold text-gray-900">{currentCard.rewards.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rate</p>
                  <p className="font-semibold text-gray-900">{currentCard.rewards.rate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Categories</p>
                  <p className="font-semibold text-gray-900">{currentCard.rewards.categories.join(', ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sign-up Bonus</p>
                  <p className="font-semibold text-gray-900">{currentCard.rewards.signupBonus}</p>
                </div>
              </div>
            </div>

            {/* Optimization Tips */}
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

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Make Payment
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                  View Statement
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                  Set Alerts
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardScreen;
