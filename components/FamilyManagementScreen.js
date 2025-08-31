import React, { useState } from 'react';
import { Users, UserPlus, Settings, Shield, Eye, EyeOff, CreditCard, TrendingUp, Calendar, DollarSign, ArrowRight, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';

const FamilyManagementScreen = ({ onBack, user }) => {
  const [activeTab, setActiveTab] = useState('members');
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Mock family data
  // Mock transaction data for expense feed
  const [transactions] = useState([
    {
      id: 1,
      familyMember: { name: 'Sarah Johnson', avatar: '👩‍💼' },
      merchant: 'Whole Foods Market',
      amount: 89.67,
      category: 'Groceries',
      date: new Date('2024-12-15T14:30:00'),
      card: { name: 'Chase Freedom', last4: '5678', apr: 18.99, type: 'Visa' },
      familyImpact: 'high'
    },
    {
      id: 2,
      familyMember: { name: 'Mike Johnson', avatar: '👨‍💼' },
      merchant: 'Shell Gas Station',
      amount: 45.23,
      category: 'Gas',
      date: new Date('2024-12-15T12:15:00'),
      card: { name: 'Chase Freedom', last4: '5678', apr: 18.99, type: 'Visa' },
      familyImpact: 'medium'
    },
    {
      id: 3,
      familyMember: { name: 'Emma Johnson', avatar: '👧' },
      merchant: 'Amazon',
      amount: 67.89,
      category: 'Shopping',
      date: new Date('2024-12-15T10:45:00'),
      card: { name: 'Chase Freedom', last4: '5678', apr: 18.99, type: 'Visa' },
      familyImpact: 'medium'
    }
  ]);

  // Mock expense control challenges data
  const [challenges] = useState([
    {
      id: 1,
      name: 'December Expense Control Challenge',
      goal: 3000,
      current: 2753,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-31'),
      reward: 'Family Movie Night + $50 Gift Card',
      status: 'active',
      familyMembers: [
        { name: 'Sarah', spent: 856, target: 1000 },
        { name: 'Mike', spent: 1023, target: 1000 },
        { name: 'Emma', spent: 874, target: 1000 }
      ]
    },
    {
      id: 2,
      name: 'November Spending Limit Challenge',
      goal: 2500,
      current: 2400,
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-11-30'),
      reward: 'Family Pizza Night',
      status: 'completed',
      familyMembers: [
        { name: 'Sarah', spent: 800, target: 800 },
        { name: 'Mike', spent: 900, target: 900 },
        { name: 'Emma', spent: 700, target: 800 }
      ]
    }
  ]);

  // Mock credit cards data
  const [creditCards] = useState([
    {
      id: 1,
      name: 'Chase Freedom',
      type: 'Visa',
      last4: '5678',
      balance: 2340.67,
      limit: 15000,
      apr: 18.99,
      dueDate: new Date('2024-12-25'),
      rewards: '5% on groceries, 1% on everything else',
      familyMember: 'Sarah Johnson',
      status: 'active'
    },
    {
      id: 2,
      name: 'Amex Gold',
      type: 'American Express',
      last4: '1234',
      balance: 1890.45,
      limit: 25000,
      apr: 0,
      dueDate: new Date('2024-12-20'),
      rewards: '4x on dining, 3x on flights',
      familyMember: 'Mike Johnson',
      status: 'active'
    }
  ]);

  const [familyMembers, setFamilyMembers] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'parent',
      email: 'sarah@family.com',
      avatar: '👩‍💼',
      permissions: ['full_access', 'card_management', 'family_coordination'],
      creditCards: ['Chase Freedom', 'Amex Gold'],

      lastActive: '2 hours ago',
      status: 'active'
    },
    {
      id: 2,
      name: 'Mike Johnson',
      role: 'parent',
      email: 'mike@family.com',
      avatar: '👨‍💼',
      permissions: ['full_access', 'card_management', 'family_coordination'],
      creditCards: ['Citi Double Cash', 'Chase Freedom'],

      lastActive: '1 hour ago',
      status: 'active'
    },
    {
      id: 3,
      name: 'Emma Johnson',
      role: 'teen',
      email: 'emma@family.com',
      avatar: '👧',
      permissions: ['view_only', 'spending_visibility'],
      creditCards: ['Chase Freedom (Authorized User)'],

      lastActive: '30 minutes ago',
      status: 'active'
    },
    {
      id: 4,
      name: 'Alex Johnson',
      role: 'teen',
      email: 'alex@family.com',
      avatar: '👦',
      permissions: ['view_only', 'spending_visibility'],
      creditCards: ['Chase Freedom (Authorized User)'],

      lastActive: '15 minutes ago',
      status: 'active'
    }
  ]);

  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'teen',
    permissions: ['view_only']
  });

  const roles = [
    { value: 'parent', label: 'Parent', description: 'Full access to all features' },
    { value: 'teen', label: 'Teen', description: 'Limited access, spending visibility' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access to family overview' }
  ];

  const permissions = [
    { value: 'full_access', label: 'Full Access', description: 'Complete control over family finances' },
    { value: 'card_management', label: 'Card Management', description: 'Add, remove, and manage credit cards' },
    { value: 'family_coordination', label: 'Family Coordination', description: 'Coordinate spending and set family goals' },
    { value: 'spending_visibility', label: 'Spending Visibility', description: 'View family spending patterns' },
    { value: 'view_only', label: 'View Only', description: 'Read-only access to family overview' }
  ];

  const getRoleColor = (role) => {
    switch (role) {
      case 'parent': return 'bg-blue-100 text-blue-800';
      case 'teen': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'full_access': return <Shield className="w-4 h-4" />;
      case 'card_management': return <CreditCard className="w-4 h-4" />;
      case 'family_coordination': return <Users className="w-4 h-4" />;
      case 'spending_visibility': return <TrendingUp className="w-4 h-4" />;
      case 'view_only': return <Eye className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const handleAddMember = () => {
    if (newMember.name && newMember.email) {
      const member = {
        id: Date.now(),
        ...newMember,
        avatar: newMember.role === 'parent' ? '👨‍💼' : '👦',
        creditCards: [],
        lastActive: 'Just added',
        status: 'active'
      };
      setFamilyMembers([...familyMembers, member]);
      setNewMember({ name: '', email: '', role: 'teen', permissions: ['view_only'] });
      setShowAddMember(false);
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setNewMember({ ...member });
    setShowAddMember(true);
  };

  const handleUpdateMember = () => {
    if (editingMember && newMember.name && newMember.email) {
      setFamilyMembers(familyMembers.map(m => 
        m.id === editingMember.id ? { ...m, ...newMember } : m
      ));
      setEditingMember(null);
      setNewMember({ name: '', email: '', role: 'teen', permissions: ['view_only'] });
      setShowAddMember(false);
    }
  };

  const handleDeleteMember = (memberId) => {
    setFamilyMembers(familyMembers.filter(m => m.id !== memberId));
  };
  
  // Spending helpers derived from transactions
  const isSameMonth = (dateA, dateB) => {
    return (
      dateA instanceof Date &&
      dateB instanceof Date &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getFullYear() === dateB.getFullYear()
    );
  };

  const getMemberMonthlySpending = (memberName) => {
    return transactions
      .filter((t) => t.familyMember.name === memberName && isSameMonth(t.date, new Date()))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalFamilyMonthlySpending = () => {
    return transactions
      .filter((t) => isSameMonth(t.date, new Date()))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const totalFamilySpending = getTotalFamilyMonthlySpending();
  const totalCards = familyMembers.reduce((sum, member) => sum + member.creditCards.length, 0);

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
              <h1 className="text-3xl font-bold text-gray-900">Family Management</h1>
              <p className="text-gray-600">Coordinate finances across your household</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600 font-medium">Add Member</span>
            </button>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">V</span>
            </div>
          </div>
        </div>

        {/* Family Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Family Members</p>
                <p className="text-2xl font-bold text-gray-900">{familyMembers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Cards</p>
                <p className="text-2xl font-bold text-gray-900">{totalCards}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">${totalFamilySpending.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-gray-900">{familyMembers.filter(m => m.status === 'active').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'members'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Family Members
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'expenses'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Expense Feed
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'challenges'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Expense Control Challenges
          </button>
          <button
            onClick={() => setActiveTab('creditCards')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'creditCards'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Credit Cards
          </button>
          <button
            onClick={() => setActiveTab('coordination')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'coordination'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Family Coordination
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeTab === 'goals'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Family Goals
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Credit Card Summary */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Credit Card Overview</h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Credit Limit</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${creditCards.reduce((sum, card) => sum + card.limit, 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${creditCards.reduce((sum, card) => sum + card.balance, 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Available Credit</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${creditCards.reduce((sum, card) => sum + (card.limit - card.balance), 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Utilization Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round((creditCards.reduce((sum, card) => sum + card.balance, 0) / creditCards.reduce((sum, card) => sum + card.limit, 0)) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Family Members Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {familyMembers.map((member) => (
                <div key={member.id} className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{member.avatar}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                        <p className="text-gray-600">{member.email}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor(member.role)}`}>
                          {roles.find(r => r.value === member.role)?.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditMember(member)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      {member.role !== 'parent' && (
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Balance</p>
                      <p className="font-semibold text-gray-900">${creditCards
                        .filter(card => card.familyMember === member.name)
                        .reduce((sum, card) => sum + card.balance, 0)
                        .toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Available Credit</p>
                      <p className="font-semibold text-gray-900">${creditCards
                        .filter(card => card.familyMember === member.name)
                        .reduce((sum, card) => sum + (card.limit - card.balance), 0)
                        .toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Credit Cards</p>
                    <div className="flex flex-wrap gap-1">
                      {member.creditCards.map((card, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                          {card}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Permissions</p>
                    <div className="flex flex-wrap gap-1">
                      {member.permissions.map((permission) => (
                        <span key={permission} className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">
                          {getPermissionIcon(permission)}
                          {permissions.find(p => p.value === permission)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Family Expense Feed</h3>
            <p className="text-gray-600">Real-time spending updates with interest risk warnings</p>
            
            {/* Simple Transaction List */}
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{transaction.familyMember.avatar}</div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{transaction.merchant}</h4>
                        <p className="text-sm text-gray-600">{transaction.familyMember.name} • {transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">${transaction.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{transaction.card.name}</p>
                    </div>
                  </div>
                  
                  {/* Interest Warning */}
                  {transaction.card.apr > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        ⚠️ <strong>Interest Risk:</strong> ${(transaction.amount * transaction.card.apr / 100 / 12).toFixed(2)} monthly interest if not paid in full
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Family Expense Control Challenges</h3>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <Plus className="w-4 h-4 mr-2" />
                New Challenge
              </button>
            </div>

            {/* Active Challenge */}
            {challenges.filter(c => c.status === 'active').map((challenge) => (
              <div key={challenge.id} className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">{challenge.name}</h4>
                    <p className="text-gray-600 mb-2">{challenge.reward}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Goal: ${challenge.goal.toLocaleString()}</span>
                      <span>Current: ${challenge.current.toLocaleString()}</span>
                      <span>Ends: {challenge.endDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>

                {/* Overall Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Family Spending Progress</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${challenge.current.toLocaleString()} / ${challenge.goal.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        (challenge.current / challenge.goal) > 0.9 ? 'bg-red-500' : 
                        (challenge.current / challenge.goal) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((challenge.current / challenge.goal) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {Math.round((challenge.current / challenge.goal) * 100)}% of budget used • ${challenge.goal - challenge.current} remaining
                  </p>
                </div>

                {/* Family Members Progress */}
                <div className="grid md:grid-cols-3 gap-4">
                  {challenge.familyMembers.map((member, index) => (
                    <div key={index} className={`text-center p-4 rounded-lg ${
                      (member.spent / member.target) > 0.9 ? 'bg-red-50' : 
                      (member.spent / member.target) > 0.7 ? 'bg-yellow-50' : 'bg-green-50'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        (member.spent / member.target) > 0.9 ? 'bg-red-100' : 
                        (member.spent / member.target) > 0.7 ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        <span className="text-lg">👤</span>
                      </div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className={`text-sm ${
                        (member.spent / member.target) > 0.9 ? 'text-red-600' : 
                        (member.spent / member.target) > 0.7 ? 'text-yellow-600' : 'text-green-600'
                      }`}>${member.spent} / ${member.target}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            (member.spent / member.target) > 0.9 ? 'bg-red-500' : 
                            (member.spent / member.target) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((member.spent / member.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Past Challenges */}
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Past Challenges</h4>
              <div className="space-y-4">
                {challenges.filter(c => c.status === 'completed').map((challenge) => (
                  <div key={challenge.id} className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 mb-1">{challenge.name}</h5>
                        <p className="text-gray-600 mb-2">{challenge.reward}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Budget: ${challenge.goal.toLocaleString()}</span>
                          <span>Spent: ${challenge.current.toLocaleString()}</span>
                          <span>Completed: {challenge.endDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Completed
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {challenge.familyMembers.map((member, index) => (
                        <div key={index} className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-green-600">${member.spent} spent</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'coordination' && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Family Spending Coordination</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Real-time Family Spending</h4>
                <div className="space-y-3">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{member.avatar}</span>
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">${getMemberMonthlySpending(member.name).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Family Alerts</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Emma</strong> made a large purchase: $89.99 at Amazon
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Mike</strong> used Chase Freedom for groceries (5% cashback this quarter)
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Family Goal</strong> achieved: Vacation fund reached $2,000!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'creditCards' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Family Credit Cards</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4 mr-2" />
                Add Card
              </button>
            </div>

            {/* Credit Cards Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {creditCards.map((card) => (
                <div key={card.id} className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">{card.name}</h4>
                      <p className="text-gray-600 mb-2">****{card.last4} • {card.type}</p>
                      <p className="text-sm text-gray-500">Assigned to: {card.familyMember}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      card.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {card.status}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Balance</p>
                      <p className="font-semibold text-gray-900">${card.balance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Credit Limit</p>
                      <p className="font-semibold text-gray-900">${card.limit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">APR</p>
                      <p className={`font-semibold ${card.apr === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {card.apr === 0 ? '0%' : `${card.apr}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Due Date</p>
                      <p className="font-semibold text-gray-900">{card.dueDate.toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Rewards</p>
                    <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded-lg">{card.rewards}</p>
                  </div>

                  {/* Utilization */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Credit Utilization</span>
                      <span className="text-sm font-medium text-gray-900">
                        {Math.round((card.balance / card.limit) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          (card.balance / card.limit) > 0.3 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((card.balance / card.limit) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(card.balance / card.limit) > 0.3 ? 'High utilization - consider paying down' : 'Good utilization rate'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                      View Details
                    </button>
                    <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Card Form */}
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Add New Credit Card</h4>
                <p className="text-gray-600 mb-4">Assign a new credit card to a family member</p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credit Card
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Family Financial Goals</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Active Goals</h4>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-blue-900">Vacation Fund</h5>
                      <span className="text-sm text-blue-700">$2,000 / $3,000</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                    </div>
                    <p className="text-sm text-blue-700 mt-2">Family goal: Save for summer vacation</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-green-900">Emergency Fund</h5>
                      <span className="text-sm text-green-700">$8,500 / $10,000</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-sm text-green-700 mt-2">3 months of expenses covered</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Goal Progress</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Monthly Savings Target</span>
                    <span className="font-semibold text-gray-900">$800</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Credit Card Optimization</span>
                    <span className="font-semibold text-green-600">On Track</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Family Spending Coordination</span>
                    <span className="font-semibold text-green-600">Excellent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingMember ? 'Edit Family Member' : 'Add Family Member'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setEditingMember(null);
                  setNewMember({ name: '', email: '', role: 'teen', permissions: ['view_only'] });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingMember ? handleUpdateMember : handleAddMember}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingMember ? 'Update' : 'Add'} Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyManagementScreen;
