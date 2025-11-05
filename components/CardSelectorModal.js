import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, Filter, ChevronRight, AlertCircle, CreditCard as CreditCardIcon } from 'lucide-react';
import { searchCards, getTopCards, getCardsByCategory } from '../services/cardDatabase/cardCatalogService';
import { getOwnedCatalogIds } from '../services/cardService';

/**
 * Card Selector Modal - Allows users to search and select cards from catalog
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onSelect - Card selection callback (catalogCard) => void
 * @param {Function} props.onManualEntry - Manual entry callback
 * @param {string} props.userId - User ID to filter owned cards
 */
const CardSelectorModal = ({ isOpen, onClose, onSelect, onManualEntry, userId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [ownedCatalogIds, setOwnedCatalogIds] = useState([]);

  const categories = [
    { id: 'all', label: 'All Cards' },
    { id: 'travel', label: 'Travel' },
    { id: 'cashback', label: 'Cashback' },
    { id: 'dining', label: 'Dining' },
    { id: 'no-fee', label: 'No Annual Fee' }
  ];

  // Load initial cards and owned cards
  useEffect(() => {
    if (isOpen) {
      loadInitialCards();
      loadOwnedCards();
    }
  }, [isOpen, userId]);

  // Filter cards when search or category changes
  useEffect(() => {
    filterCards();
  }, [searchQuery, selectedCategory, cards, ownedCatalogIds]);

  const loadInitialCards = async () => {
    setIsLoading(true);
    try {
      const popularCards = await getTopCards(20);
      setCards(popularCards);
    } catch (error) {
      console.error('[CardSelector] Error loading cards:', error);
    }
    setIsLoading(false);
  };

  const loadOwnedCards = async () => {
    if (!userId) return;
    try {
      const owned = await getOwnedCatalogIds(userId);
      setOwnedCatalogIds(owned);
    } catch (error) {
      console.error('[CardSelector] Error loading owned cards:', error);
    }
  };

  const filterCards = async () => {
    let filtered = [...cards];

    // Apply search
    if (searchQuery.trim().length >= 2) {
      const searchResults = await searchCards(searchQuery);
      filtered = searchResults;
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'no-fee') {
        filtered = filtered.filter(card => (card.annual_fee || 0) === 0);
      } else {
        filtered = filtered.filter(card =>
          card.category && card.category.includes(selectedCategory)
        );
      }
    }

    setFilteredCards(filtered);
  };

  const handleCardSelect = (card) => {
    // Check if already owned
    if (ownedCatalogIds.includes(card.id)) {
      alert('You already have this card in your wallet!');
      return;
    }

    onSelect(card);
    handleClose();
  };

  const handleManualEntry = () => {
    onManualEntry();
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setFilteredCards([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Credit Card</h2>
            <p className="text-sm text-gray-600 mt-1">Select from popular cards or enter manually</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by card name or issuer (e.g., Chase Sapphire, Amex Gold)"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No cards found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? `No cards match "${searchQuery}"` : 'No cards available in this category'}
              </p>
              <button
                onClick={handleManualEntry}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Enter card details manually instead →
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredCards.map((card) => (
                <CardOption
                  key={card.id}
                  card={card}
                  isOwned={ownedCatalogIds.includes(card.id)}
                  onSelect={() => handleCardSelect(card)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Can't find your card in the list?
            </div>
            <button
              onClick={handleManualEntry}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
            >
              <span>Enter Manually</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual Card Option Component
const CardOption = ({ card, isOwned, onSelect }) => {
  const getRewardHighlights = () => {
    if (!card.reward_structure) return null;

    const entries = Object.entries(card.reward_structure)
      .filter(([key]) => key !== 'default')
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2);

    return entries.map(([category, multiplier]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      multiplier
    }));
  };

  const rewards = getRewardHighlights();

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all ${
        isOwned
          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
          : 'border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
      }`}
      onClick={isOwned ? undefined : onSelect}
    >
      {isOwned && (
        <div className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
          Already Owned
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center flex-shrink-0">
          <CreditCardIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{card.card_name}</h3>
          <p className="text-sm text-gray-600">{card.issuer}</p>
        </div>
      </div>

      {/* Rewards */}
      {rewards && rewards.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {rewards.map((reward, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full"
            >
              <Sparkles className="w-3 h-3" />
              {reward.multiplier}x {reward.category}
            </span>
          ))}
        </div>
      )}

      {/* Sign-up Bonus */}
      {card.sign_up_bonus && card.sign_up_bonus.value_estimate && (
        <div className="mb-3 text-sm">
          <span className="text-green-600 font-medium">
            ${card.sign_up_bonus.value_estimate} sign-up bonus
          </span>
        </div>
      )}

      {/* Details */}
      <div className="flex items-center justify-between text-sm">
        <div>
          {card.annual_fee > 0 ? (
            <span className="text-gray-600">${card.annual_fee}/yr fee</span>
          ) : (
            <span className="text-green-600 font-medium">No annual fee</span>
          )}
        </div>
        <div className="text-gray-500">
          APR: {card.apr_min}%{card.apr_max && card.apr_max !== card.apr_min ? `-${card.apr_max}%` : ''}
        </div>
      </div>
    </div>
  );
};

export default CardSelectorModal;
