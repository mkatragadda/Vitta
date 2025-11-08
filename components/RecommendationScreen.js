import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { TrendingUp, Calendar, CreditCard, Sparkles, ArrowRight, ExternalLink, Info, AlertTriangle, ShoppingBag, Utensils, Plane, Fuel, Star } from 'lucide-react';
import { getRecommendationForPurchase, getStrategyInfo } from '../services/recommendations/recommendationEngine';
import { suggestNewCards } from '../services/recommendations/cardDiscoveryService';
import { STRATEGY_TYPES } from '../services/userBehavior/behaviorAnalyzer';

const RecommendationScreen = ({ onBack, user, userCards }) => {
  const userId = user?.id;
  const [strategy, setStrategy] = useState(STRATEGY_TYPES.REWARDS_MAXIMIZER);
  const [newCardSuggestions, setNewCardSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRecommendations = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    try {
      // Get new card suggestions
      const suggestions = await suggestNewCards(userId, strategy);
      setNewCardSuggestions(suggestions);

      console.log('[RecommendationScreen] Recommendations loaded');
    } catch (error) {
      console.error('[RecommendationScreen] Error loading recommendations:', error);
    }

    setIsLoading(false);
  }, [strategy, userId]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleStrategyChange = (newStrategy) => {
    console.log('[RecommendationScreen] Changing strategy to:', newStrategy);
    setStrategy(newStrategy);
  };

  // Get best cards by category for rewards maximizer
  const getCardsByCategory = () => {
    if (!userCards || userCards.length === 0) return {};

    const categories = {
      dining: { name: 'Dining & Restaurants', icon: Utensils },
      groceries: { name: 'Groceries', icon: ShoppingBag },
      travel: { name: 'Travel', icon: Plane },
      gas: { name: 'Gas & Fuel', icon: Fuel },
      default: { name: 'Everything Else', icon: Star }
    };

    const categoryCards = {};

    Object.keys(categories).forEach(category => {
      // Find best card for this category
      const bestCard = userCards.reduce((best, card) => {
        const cardMultiplier = card.reward_structure?.[category] || card.reward_structure?.default || 1;
        const bestMultiplier = best?.reward_structure?.[category] || best?.reward_structure?.default || 0;
        return cardMultiplier > bestMultiplier ? card : best;
      }, null);

      if (bestCard) {
        const multiplier = bestCard.reward_structure?.[category] || bestCard.reward_structure?.default || 1;
        categoryCards[category] = {
          ...categories[category],
          card: bestCard,
          multiplier: multiplier,
          rewardDescription: multiplier > 1
            ? `${multiplier}x points/cashback`
            : `${multiplier}% cashback`
        };
      }
    });

    return categoryCards;
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Card Discovery
            </h1>
            <p className="text-gray-600 mt-1">Smart suggestions for maximizing your wallet</p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
            <span>Back</span>
          </button>
        </div>

        {/* Strategy Selector */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-gray-900">Optimization Strategy</h3>
            <Info className="w-4 h-4 text-gray-400" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <StrategyCard
              strategyType={STRATEGY_TYPES.REWARDS_MAXIMIZER}
              selected={strategy === STRATEGY_TYPES.REWARDS_MAXIMIZER}
              onClick={() => handleStrategyChange(STRATEGY_TYPES.REWARDS_MAXIMIZER)}
            />
            <StrategyCard
              strategyType={STRATEGY_TYPES.APR_MINIMIZER}
              selected={strategy === STRATEGY_TYPES.APR_MINIMIZER}
              onClick={() => handleStrategyChange(STRATEGY_TYPES.APR_MINIMIZER)}
            />
            <StrategyCard
              strategyType={STRATEGY_TYPES.CASHFLOW_OPTIMIZER}
              selected={strategy === STRATEGY_TYPES.CASHFLOW_OPTIMIZER}
              onClick={() => handleStrategyChange(STRATEGY_TYPES.CASHFLOW_OPTIMIZER)}
            />
          </div>
        </div>

        {/* Grace Period Warning for Cash Flow Strategy */}
        {userCards && userCards.some(card => card.current_balance > 0) && strategy === STRATEGY_TYPES.CASHFLOW_OPTIMIZER && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Grace Period Warning</h4>
                <p className="text-sm text-yellow-800 mb-2">
                  Cards with unpaid balances have <strong>NO grace period</strong>. New purchases accrue interest <strong>immediately</strong> from the purchase date.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => setStrategy(STRATEGY_TYPES.APR_MINIMIZER)}
                    className="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-900 px-3 py-1 rounded transition-colors"
                  >
                    Switch to Minimize Interest
                  </button>
                  <span className="text-xs text-yellow-700 py-1">
                    💡 Tip: Pay off balances to restore grace periods
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Rewards Maximizer: Show Cards by Category */}
            {strategy === STRATEGY_TYPES.REWARDS_MAXIMIZER && userCards && userCards.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Your Best Cards By Category
                </h3>

                <div className="space-y-4">
                  {Object.entries(getCardsByCategory()).map(([category, data]) => (
                    <CategoryCardRow key={category} category={category} data={data} />
                  ))}
                </div>
              </div>
            )}

            {/* APR Minimizer and Cashflow: Show single best card */}
            {(strategy === STRATEGY_TYPES.APR_MINIMIZER || strategy === STRATEGY_TYPES.CASHFLOW_OPTIMIZER) && userCards && userCards.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  {strategy === STRATEGY_TYPES.APR_MINIMIZER ? 'Lowest APR Card' : 'Best Card for Cash Flow'}
                </h3>

                {(() => {
                  const sortedCards = [...userCards].sort((a, b) => {
                    if (strategy === STRATEGY_TYPES.APR_MINIMIZER) {
                      return (a.apr || 20) - (b.apr || 20);
                    } else {
                      // For cashflow, prefer cards with no balance (grace period available)
                      const aScore = (a.current_balance === 0 ? 100 : 0) + (a.grace_period_days || 25);
                      const bScore = (b.current_balance === 0 ? 100 : 0) + (b.grace_period_days || 25);
                      return bScore - aScore;
                    }
                  });

                  const bestCard = sortedCards[0];
                  const reasoning = strategy === STRATEGY_TYPES.APR_MINIMIZER
                    ? `Lowest APR at ${bestCard.apr}% - minimizes interest charges`
                    : bestCard.current_balance === 0
                      ? `Has ${bestCard.grace_period_days || 25}-day grace period - no immediate interest on purchases`
                      : `Best available option - but note: has existing balance so no grace period`;

                  return <RecommendationCard card={bestCard} isPrimary={true} reasoning={reasoning} />;
                })()}
              </div>
            )}

            {/* No Cards Message */}
            {(!userCards || userCards.length === 0) && (
              <div className="bg-white rounded-xl p-8 shadow-lg mb-6 text-center">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cards in Wallet</h3>
                <p className="text-gray-600 mb-4">Add cards to get personalized recommendations</p>
                <button
                  onClick={onBack}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to My Wallet
                </button>
              </div>
            )}

            {/* New Card Suggestions */}
            {newCardSuggestions && newCardSuggestions.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Cards You Might Want to Add
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {newCardSuggestions.slice(0, 6).map((card, idx) => (
                    <NewCardSuggestion key={card.id || idx} card={card} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Category Card Row Component for Rewards Maximizer
const CategoryCardRow = ({ category, data }) => {
  const IconComponent = data.icon;

  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all bg-gradient-to-r from-blue-50 to-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <IconComponent className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{data.name}</h4>
            <p className="text-sm text-gray-600">{data.card.card_name || data.card.card_type}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">{data.rewardDescription}</div>
            <p className="text-xs text-gray-500">Best for this category</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Strategy Card Component
const StrategyCard = ({ strategyType, selected, onClick }) => {
  const info = getStrategyInfo(strategyType);

  const getIcon = () => {
    switch (strategyType) {
      case STRATEGY_TYPES.REWARDS_MAXIMIZER:
        return <Sparkles className="w-6 h-6" />;
      case STRATEGY_TYPES.APR_MINIMIZER:
        return <TrendingUp className="w-6 h-6" />;
      case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
        return <Calendar className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const getColorClasses = () => {
    if (selected) {
      switch (info.color) {
        case 'purple':
          return 'border-purple-500 bg-purple-50 text-purple-600';
        case 'green':
          return 'border-green-500 bg-green-50 text-green-600';
        case 'blue':
          return 'border-blue-500 bg-blue-50 text-blue-600';
        default:
          return 'border-blue-500 bg-blue-50 text-blue-600';
      }
    }
    return 'border-gray-200 hover:border-gray-300';
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all text-left ${getColorClasses()}`}
    >
      <div className={`mb-2 ${selected ? '' : 'text-gray-400'}`}>
        {getIcon()}
      </div>
      <h4 className="font-semibold text-gray-900 mb-1">{info.title}</h4>
      <p className="text-sm text-gray-600">{info.description}</p>
    </button>
  );
};

// Recommendation Card Component
const RecommendationCard = ({ card, isPrimary, reasoning }) => {
  const utilization = card.credit_limit > 0
    ? ((card.current_balance / card.credit_limit) * 100).toFixed(0)
    : 0;

  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      isPrimary
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">
              {card.card_name || card.card_type}
            </h4>
            {isPrimary && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                Best Choice
              </span>
            )}
          </div>
          {reasoning && (
            <p className="text-sm text-gray-600 mb-2">{reasoning}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">APR</p>
          <p className="font-medium text-gray-900">{card.apr}%</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Available</p>
          <p className="font-medium text-gray-900">
            ${(card.credit_limit - card.current_balance).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Utilization</p>
          <p className={`font-medium ${
            utilization < 30 ? 'text-green-600' : utilization < 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {utilization}%
          </p>
        </div>
      </div>
    </div>
  );
};

// New Card Suggestion Component
const NewCardSuggestion = ({ card }) => {
  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{card.card_name}</h4>
          <p className="text-sm text-gray-600">{card.issuer}</p>
        </div>
        {card.image_url && (
          <div className="relative w-12 h-8">
            <Image
              src={card.image_url}
              alt={card.card_name}
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
        )}
      </div>

      {card.recommendationReason && (
        <p className="text-xs text-gray-600 mb-3">{card.recommendationReason}</p>
      )}

      <div className="flex items-center justify-between text-sm">
        <div>
          {card.annual_fee > 0 ? (
            <span className="text-gray-600">${card.annual_fee}/yr fee</span>
          ) : (
            <span className="text-green-600 font-medium">No annual fee</span>
          )}
        </div>
        {card.application_url ? (
          <a
            href={card.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span className="text-xs">Learn More</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-xs text-blue-600">View Details</span>
        )}
      </div>

      {card.sign_up_bonus && card.sign_up_bonus.value_estimate && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-purple-600 font-medium">
            ✨ ${card.sign_up_bonus.value_estimate} sign-up bonus value
          </p>
        </div>
      )}
    </div>
  );
};

export default RecommendationScreen;
