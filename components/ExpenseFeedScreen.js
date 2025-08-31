import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, DollarSign, CreditCard, Users, Filter, Search, Calendar, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

const ExpenseFeedScreen = ({ onBack, user }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // Mock family transaction data with APR information
  const [transactions, setTransactions] = useState([
    {
      id: 1,
      familyMember: {
        name: 'Sarah Johnson',
        avatar: '👩‍💼',
        role: 'parent'
      },
      merchant: 'Whole Foods Market',
      amount: 89.67,
      category: 'Groceries',
      date: new Date('2024-12-15T14:30:00'),
      card: {
        name: 'Chase Freedom Unlimited',
        last4: '5678',
        apr: 18.99,
        type: 'Visa',
        rewards: '1.5% cashback'
      },
      status: 'completed',
      location: 'San Francisco, CA',
      notes: 'Weekly grocery shopping',
      familyImpact: 'high',
      optimization: {
        tip: 'Use Amex Gold for 4x points on groceries',
        savings: 3.59,
        betterCard: 'Amex Gold'
      }
    },
    {
      id: 2,
      familyMember: {
        name: 'Mike Johnson',
        avatar: '👨‍💼',
        role: 'parent'
      },
      merchant: 'Shell Gas Station',
      amount: 45.23,
      category: 'Gas',
      date: new Date('2024-12-15T12:15:00'),
      card: {
        name: 'Chase Freedom Unlimited',
        last4: '5678',
        apr: 18.99,
        type: 'Visa',
        rewards: '1.5% cashback'
      },
      status: 'completed',
      location: 'Oakland, CA',
      notes: 'Fill up before road trip',
      familyImpact: 'medium',
      optimization: {
        tip: 'Use Chase Freedom for 5% cashback on gas this quarter',
        savings: 2.26,
        betterCard: 'Chase Freedom'
      }
    },
    {
      id: 3,
      familyMember: {
        name: 'Emma Johnson',
        avatar: '👧',
        role: 'teen'
      },
      merchant: 'Amazon',
      amount: 67.89,
      category: 'Shopping',
      date: new Date('2024-12-15T10:45:00'),
      card: {
        name: 'Chase Freedom (Authorized User)',
        last4: '5678',
        apr: 18.99,
        type: 'Visa',
        rewards: '1.5% cashback'
      },
      status: 'completed',
      location: 'Online',
      notes: 'Birthday gift for friend',
      familyImpact: 'medium',
      optimization: {
        tip: 'Use Citi Double Cash for 2% cashback on online purchases',
        savings: 0.34,
        betterCard: 'Citi Double Cash'
      }
    },
    {
      id: 4,
      familyMember: {
        name: 'Alex Johnson',
        avatar: '👦',
        role: 'teen'
      },
      merchant: 'Starbucks',
      amount: 12.45,
      category: 'Dining',
      date: new Date('2024-12-15T09:20:00'),
      card: {
        name: 'Chase Freedom (Authorized User)',
        last4: '5678',
        apr: 18.99,
        type: 'Visa',
        rewards: '1.5% cashback'
      },
      status: 'completed',
      location: 'Berkeley, CA',
      notes: 'Morning coffee',
      familyImpact: 'low',
      optimization: {
        tip: 'Use Amex Gold for 4x points on dining',
        savings: 0.37,
        betterCard: 'Amex Gold'
      }
    },
    {
      id: 5,
      familyMember: {
        name: 'Sarah Johnson',
        avatar: '👩‍💼',
        role: 'parent'
      },
      merchant: 'Home Depot',
      amount: 234.56,
      category: 'Home Improvement',
      date: new Date('2024-12-14T16:30:00'),
      card: {
        name: 'Amex Gold Card',
        last4: '1234',
        apr: 0,
        type: 'Amex',
        rewards: '1x points'
      },
      status: 'completed',
      location: 'San Francisco, CA',
      notes: 'Kitchen renovation supplies',
      familyImpact: 'high',
      optimization: {
        tip: 'Use Citi Double Cash for 2% cashback on home improvement',
        savings: 2.35,
        betterCard: 'Citi Double Cash'
      }
    },
    {
      id: 6,
      familyMember: {
        name: 'Mike Johnson',
        avatar: '👨‍💼',
        role: 'parent'
      },
      merchant: 'Netflix',
      amount: 15.99,
      category: 'Entertainment',
      date: new Date('2024-12-14T00:00:00'),
      card: {
        name: 'Citi Double Cash',
        last4: '9012',
        apr: 16.99,
        type: 'Mastercard',
        rewards: '2% cashback'
      },
      status: 'completed',
      location: 'Subscription',
      notes: 'Monthly subscription',
      familyImpact: 'low',
      optimization: {
        tip: 'Already using optimal card for subscriptions',
        savings: 0,
        betterCard: 'Current card'
      }
    }
  ]);

  const [familyMembers] = useState([
    { id: 1, name: 'Sarah Johnson', avatar: '👩‍💼', role: 'parent' },
    { id: 2, name: 'Mike Johnson', avatar: '👨‍💼', role: 'parent' },
    { id: 3, name: 'Emma Johnson', avatar: '👧', role: 'teen' },
    { id: 4, name: 'Alex Johnson', avatar: '👦', role: 'teen' }
  ]);

  const categories = ['all', 'groceries', 'gas', 'shopping', 'dining', 'entertainment', 'home improvement', 'utilities', 'transportation'];

  const getCategoryIcon = (category) => {
    const icons = {
      'groceries': '🛒',
      'gas': '⛽',
      'shopping': '🛍️',
      'dining': '🍽️',
      'entertainment': '🎬',
      'home improvement': '🏠',
      'utilities': '💡',
      'transportation': '🚗'
    };
    return icons[category.toLowerCase()] || '💰';
  };

  const getCardColor = (cardType) => {
    switch (cardType) {
      case 'Visa': return 'from-blue-600 to-blue-800';
      case 'Amex': return 'from-green-600 to-green-800';
      case 'Mastercard': return 'from-orange-600 to-red-600';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getFamilyImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getOptimizationColor = (savings) => {
    if (savings > 2) return 'text-green-600 bg-green-50';
    if (savings > 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      if (activeFilter !== 'all' && transaction.category.toLowerCase() !== activeFilter) return false;
      if (searchQuery && !transaction.merchant.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return b.date - a.date;
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'family') return b.familyImpact === 'high' ? 1 : -1;
      return 0;
    });

  const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
  const potentialSavings = transactions.reduce((sum, t) => sum + t.optimization.savings, 0);
  const todaySpending = transactions.filter(t => 
    t.date.toDateString() === new Date().toDateString()
  ).reduce((sum, t) => sum + t.amount, 0);

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
              <h1 className="text-3xl font-bold text-gray-900">Family Expense Feed</h1>
              <p className="text-gray-600">Real-time spending updates across your household</p>
            </div>
          </div>
          
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">V</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Spending</p>
                <p className="text-2xl font-bold text-gray-900">${totalSpending.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold text-gray-900">${todaySpending.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Potential Savings</p>
                <p className="text-2xl font-bold text-gray-900">${potentialSavings.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Interest Risk</p>
                <p className="text-2xl font-bold text-red-600">${transactions
                  .filter(t => t.card.apr > 0)
                  .reduce((sum, t) => sum + (t.amount * t.card.apr / 100 / 12), 0)
                  .toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-gray-900">{familyMembers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interest Risk Warning Banner */}
        {transactions.filter(t => t.card.apr > 0).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-900">High Interest Risk Alert</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-red-700 mb-1">Total Monthly Interest Risk:</p>
                <p className="text-2xl font-bold text-red-900">
                  ${transactions
                    .filter(t => t.card.apr > 0)
                    .reduce((sum, t) => sum + (t.amount * t.card.apr / 100 / 12), 0)
                    .toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-red-700 mb-1">Total Annual Interest Risk:</p>
                <p className="text-2xl font-bold text-red-900">
                  ${transactions
                    .filter(t => t.card.apr > 0)
                    .reduce((sum, t) => sum + (t.amount * t.card.apr / 100), 0)
                    .toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-red-700 mb-1">Transactions at Risk:</p>
                <p className="text-2xl font-bold text-red-900">
                  {transactions.filter(t => t.card.apr > 0).length}
                </p>
              </div>
            </div>
            <p className="text-sm text-red-700 mt-3">
              💡 <strong>Tip:</strong> Pay off these purchases in full before your credit card statement date to avoid interest charges.
            </p>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveFilter(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search merchants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Most Recent</option>
                <option value="amount">Highest Amount</option>
                <option value="family">Family Impact</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expense Feed */}
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                {/* Family Member Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                    {transaction.familyMember.avatar}
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{transaction.merchant}</h3>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getFamilyImpactColor(transaction.familyImpact)}`}>
                          {transaction.familyImpact} impact
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span>{transaction.familyMember.name}</span>
                        <span>•</span>
                        <span>{getCategoryIcon(transaction.category)} {transaction.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(transaction.date)}
                        </span>
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${transaction.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{transaction.location}</p>
                    </div>
                  </div>

                  {/* Credit Card Information with APR */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 bg-gradient-to-r ${getCardColor(transaction.card.type)} rounded-lg flex items-center justify-center`}>
                          <CreditCard className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.card.name}</p>
                          <p className="text-sm text-gray-600">****{transaction.card.last4} • {transaction.card.rewards}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {transaction.card.apr === 0 ? '0%' : `${transaction.card.apr}%`} APR
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.card.apr === 0 ? 'Promotional Rate' : 'Standard Rate'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interest Warning */}
                  {transaction.card.apr > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900">
                            ⚠️ Interest Warning: Pay in full before statement date
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            If you carry a balance, you'll pay ${(transaction.amount * transaction.card.apr / 100 / 12).toFixed(2)} in interest per month on this purchase
                          </p>
                          <div className="mt-2 text-xs text-red-600">
                            <span className="font-medium">Monthly Interest:</span> ${(transaction.amount * transaction.card.apr / 100 / 12).toFixed(2)} | 
                            <span className="font-medium"> Annual Interest:</span> ${(transaction.amount * transaction.card.apr / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Optimization Tips */}
                  {transaction.optimization.savings > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">
                            💡 Optimization Tip: Use {transaction.optimization.betterCard}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            You could save ${transaction.optimization.savings.toFixed(2)} on this purchase
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getOptimizationColor(transaction.optimization.savings)}`}>
                          Save ${transaction.optimization.savings.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {transaction.notes && (
                    <p className="text-sm text-gray-600 italic">"{transaction.notes}"</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredTransactions.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center shadow-lg">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseFeedScreen;
