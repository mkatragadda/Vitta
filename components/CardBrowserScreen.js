import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Search, Sparkles, CreditCard as CreditCardIcon, TrendingUp, DollarSign, Gift, ArrowRight, Zap } from 'lucide-react';
import { searchCards, getTopCards } from '../services/cardDatabase/cardCatalogService';
import { getOwnedCatalogIds } from '../services/cardService';

/**
 * Step 1: Card Browser - Search and select a card from catalog
 */
const CardBrowserScreen = ({ user, onCardSelect, onManualEntry, onLinkBank }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [isLoading, setIsLoading] = useState(true);
  const [ownedCatalogIds, setOwnedCatalogIds] = useState([]);

  const categories = [
    { id: 'popular', label: 'Popular', icon: TrendingUp },
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'cashback', label: 'Cashback', icon: DollarSign },
    { id: 'dining', label: 'Dining', icon: '🍽️' },
    { id: 'no-fee', label: 'No Annual Fee', icon: Gift }
  ];

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const popularCards = await getTopCards(30);
      setCards(popularCards);
      setFilteredCards(popularCards);
    } catch (error) {
      console.error('[CardBrowser] Error loading cards:', error);
    }
    setIsLoading(false);
  }, []);

  const loadOwnedCards = useCallback(async () => {
    if (!user?.id) return;
    try {
      const owned = await getOwnedCatalogIds(user.id);
      setOwnedCatalogIds(owned);
    } catch (error) {
      console.error('[CardBrowser] Error loading owned cards:', error);
    }
  }, [user?.id]);

  const filterCards = useCallback(async () => {
    let filtered = [...cards];

    // Apply search
    if (searchQuery.trim().length >= 2) {
      const searchResults = await searchCards(searchQuery);
      filtered = searchResults;
    }

    // Apply category filter
    if (selectedCategory !== 'popular') {
      if (selectedCategory === 'no-fee') {
        filtered = filtered.filter(card => (card.annual_fee || 0) === 0);
      } else {
        filtered = filtered.filter(card =>
          card.category && card.category.includes(selectedCategory)
        );
      }
    }

    setFilteredCards(filtered);
  }, [cards, searchQuery, selectedCategory]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    loadOwnedCards();
  }, [loadOwnedCards]);

  useEffect(() => {
    filterCards();
  }, [filterCards]);

  const handleCardClick = (card) => {
    if (ownedCatalogIds.includes(card.id)) {
      alert('You already have this card in your wallet!');
      return;
    }
    onCardSelect(card);
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Add Your First Card
          </h1>
          <p className="text-lg text-gray-600">
            Let&apos;s start building your smart wallet
          </p>
        </div>

        {/* Quick Action: Link Bank */}
        {onLinkBank && (
          <div className="mb-8 max-w-2xl mx-auto">
            <button
              onClick={onLinkBank}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl py-4 px-6 font-semibold text-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span>🏦</span>
              Link Bank accounts via Plaid
            </button>
            <p className="text-sm text-gray-600 text-center mt-3">
              Connect your bank to automatically sync account information
            </p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for your card (e.g., Chase Sapphire, Amex Gold...)"
              className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all shadow-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-center gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map(category => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
                }`}
              >
                {typeof IconComponent === 'string' ? (
                  <span className="text-lg">{IconComponent}</span>
                ) : (
                  <IconComponent className="w-4 h-4" />
                )}
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-20">
            <CreditCardIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No cards found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? `No cards match "${searchQuery}"` : 'No cards available in this category'}
            </p>
            <button
              onClick={onManualEntry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
            >
              <span>Enter Card Details Manually</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {filteredCards.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  isOwned={ownedCatalogIds.includes(card.id)}
                  onClick={() => handleCardClick(card)}
                />
              ))}
            </div>

            {/* Manual Entry Footer */}
            <div className="mt-12 text-center">
              <div className="inline-block bg-white rounded-2xl shadow-lg p-6 max-w-md">
                <p className="text-gray-700 mb-4">
                  Can&apos;t find your card in the list?
                </p>
                <button
                  onClick={onManualEntry}
                  className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-semibold shadow-md"
                >
                  <span>Enter Card Details Manually</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Card Tile Component
const CardTile = ({ card, isOwned, onClick }) => {
  const [imageError, setImageError] = useState(false);

  const getRewardHighlights = () => {
    if (!card.reward_structure) return [];

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
      onClick={isOwned ? undefined : onClick}
      className={`relative group rounded-2xl p-6 transition-all duration-300 ${
        isOwned
          ? 'bg-gray-100 border-2 border-gray-200 opacity-60 cursor-not-allowed'
          : 'bg-white border-2 border-gray-200 hover:border-blue-400 hover:shadow-2xl hover:scale-105 cursor-pointer'
      }`}
    >
      {/* Owned Badge */}
      {isOwned && (
        <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold">
          ✓ Owned
        </div>
      )}

      {/* Card Visual */}
      <div className="mb-4">
        {card.image_url && !imageError ? (
          <div className="relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden shadow-lg">
            <Image
              src={card.image_url}
              alt={card.card_name}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover"
              onError={() => setImageError(true)}
              priority={false}
            />
          </div>
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <CreditCardIcon className="w-12 h-12 text-white opacity-90" />
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="mb-3">
        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
          {card.card_name}
        </h3>
        <p className="text-sm text-gray-600">{card.issuer}</p>
      </div>

      {/* Rewards */}
      {rewards.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {rewards.map((reward, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-lg font-semibold"
            >
              <Zap className="w-3 h-3" />
              {reward.multiplier}x {reward.category}
            </span>
          ))}
        </div>
      )}

      {/* Sign-up Bonus */}
      {card.sign_up_bonus?.value_estimate && (
        <div className="mb-3 text-sm">
          <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
            <Gift className="w-4 h-4" />
            ${card.sign_up_bonus.value_estimate} bonus
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
        <div>
          {card.annual_fee > 0 ? (
            <span className="text-gray-600">${card.annual_fee}/yr</span>
          ) : (
            <span className="text-green-600 font-semibold">No fee</span>
          )}
        </div>
        <div className="text-gray-500">
          APR: {card.apr_min}%
        </div>
      </div>

      {/* Hover Effect */}
      {!isOwned && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity pointer-events-none"></div>
      )}
    </div>
  );
};

export default CardBrowserScreen;
