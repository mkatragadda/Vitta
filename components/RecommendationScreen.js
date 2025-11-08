import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, ArrowRight, Info, AlertTriangle } from 'lucide-react';
import { getAllStrategies } from '../services/recommendations/recommendationStrategies';
import { getStrategyInfo } from '../services/recommendations/recommendationEngine';
import { STRATEGY_TYPES } from '../services/userBehavior/behaviorAnalyzer';
import { calculateUtilization } from '../services/cardService';

const STRATEGY_SEQUENCE = [
  STRATEGY_TYPES.REWARDS_MAXIMIZER,
  STRATEGY_TYPES.APR_MINIMIZER,
  STRATEGY_TYPES.CASHFLOW_OPTIMIZER
];

const RecommendationScreen = ({ onBack, user, userCards }) => {
  const [activeStrategy, setActiveStrategy] = useState(STRATEGY_SEQUENCE[0]);

  const strategyData = useMemo(() => {
    if (!userCards || userCards.length === 0) {
      return {};
    }

    const DEFAULT_AMOUNT = 1000;
    const results = getAllStrategies(userCards, 'general', DEFAULT_AMOUNT);

    return {
      [STRATEGY_TYPES.REWARDS_MAXIMIZER]: {
        info: getStrategyInfo(STRATEGY_TYPES.REWARDS_MAXIMIZER),
        cards: results.rewards || []
      },
      [STRATEGY_TYPES.APR_MINIMIZER]: {
        info: getStrategyInfo(STRATEGY_TYPES.APR_MINIMIZER),
        cards: results.apr || []
      },
      [STRATEGY_TYPES.CASHFLOW_OPTIMIZER]: {
        info: getStrategyInfo(STRATEGY_TYPES.CASHFLOW_OPTIMIZER),
        cards: results.gracePeriod || []
      }
    };
  }, [userCards]);

  useEffect(() => {
    if (!strategyData[activeStrategy]) {
      const fallback = STRATEGY_SEQUENCE.find(strategy => strategyData[strategy]);
      if (fallback) {
        setActiveStrategy(fallback);
      }
    }
  }, [activeStrategy, strategyData]);

  const hasCards = userCards && userCards.length > 0;
  const activeData = strategyData[activeStrategy];

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Card Discovery
            </h1>
            <p className="text-gray-600 mt-1">
              Understand how your cards perform across Vittas strategies.
            </p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
            <span>Back</span>
          </button>
        </header>

        {!hasCards && (
          <EmptyState onBack={onBack} />
        )}

        {hasCards && (
          <>
            <StrategySelector
              activeStrategy={activeStrategy}
              onSelect={setActiveStrategy}
              strategyData={strategyData}
            />

            <TopCardHighlight
              strategy={activeStrategy}
              data={activeData}
            />

            <StrategyCardList
              strategy={activeStrategy}
              data={activeData}
            />
          </>
        )}
      </div>
    </div>
  );
};

const StrategySelector = ({ activeStrategy, onSelect, strategyData }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg">
    <div className="flex items-center gap-2 mb-4">
      <h3 className="font-semibold text-gray-900">Optimization Strategy</h3>
      <Info className="w-4 h-4 text-gray-400" />
    </div>
    <div className="grid md:grid-cols-3 gap-4">
      {STRATEGY_SEQUENCE.map(strategy => (
        <StrategyCard
          key={strategy}
          strategyType={strategy}
          selected={strategy === activeStrategy}
          onClick={() => onSelect(strategy)}
          count={strategyData[strategy]?.cards?.length || 0}
        />
      ))}
    </div>
  </div>
);

const TopCardHighlight = ({ strategy, data }) => {
  if (!data || !data.cards || data.cards.length === 0) {
    return null;
  }

  const { info } = data;
  const topEntry = selectTopEntry(strategy, data.cards);
  if (!topEntry) {
    return null;
  }

  const { card } = topEntry;
  const reasoning = deriveReasoning(strategy, topEntry);
  const metrics = buildMetrics(strategy, topEntry).slice(0, 3);
  const cardName = formatCardName(card);
  const scoreDisplay = formatScore(strategy, topEntry);

  return (
    <section className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white rounded-2xl p-6 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70 mb-1">Top performer</p>
          <h2 className="text-2xl font-semibold">{cardName}</h2>
          {card.nickname && card.card_name && (
            <p className="text-sm text-white/70">{card.card_name}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-white/70 uppercase">Strategy score</p>
          <p className="text-3xl font-bold">{scoreDisplay}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-white/80 max-w-3xl leading-relaxed">{info.description}</p>
      {reasoning && (
        <p className="mt-3 text-sm font-medium text-white leading-relaxed">{reasoning}</p>
      )}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {metrics.map(metric => (
          <div key={metric.label} className="bg-white/10 rounded-xl p-4 backdrop-blur">
            <p className="text-xs uppercase text-white/70">{metric.label}</p>
            <p className="text-lg font-semibold">{metric.value}</p>
            {metric.hint && (
              <p className="text-xs text-white/80 mt-1">{metric.hint}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const StrategyCardList = ({ strategy, data }) => {
  if (!data || !data.cards || data.cards.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <p className="text-sm text-gray-600">No cards found for this strategy yet. Add more cards to your wallet to discover insights.</p>
      </div>
    );
  }

  const topEntry = selectTopEntry(strategy, data.cards);
  const remaining = data.cards.filter(entry => entry !== topEntry);

  if (!topEntry || remaining.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <p className="text-sm text-gray-600">You currently have one card that fits this strategy. Add more cards to compare options.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {remaining.map((entry, index) => (
        <StrategyCardItem
          key={entry.card.id || `${entry.card.card_name}-${index}`}
          entry={entry}
          strategy={strategy}
          rank={index + 2}
          topEntry={topEntry}
        />
      ))}
    </div>
  );
};

const StrategyCardItem = ({ entry, strategy, rank, topEntry }) => {
  const { card } = entry;
  const cardName = formatCardName(card);
  const metrics = buildMetrics(strategy, entry);
  const progress = computeFitPercent(strategy, entry, topEntry);
  const warning = deriveWarning(strategy, entry);
  const reasoning = deriveReasoning(strategy, entry);
  const scoreDisplay = formatScore(strategy, entry);

  return (
    <article className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-gray-500">Rank #{rank}</p>
          <h4 className="text-lg font-semibold text-gray-900">{cardName}</h4>
          {card.nickname && card.card_name && (
            <p className="text-sm text-gray-500">{card.card_name}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase">Strategy score</p>
          <p className="text-xl font-bold text-blue-600">{scoreDisplay}</p>
        </div>
      </div>

      {reasoning && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{reasoning}</p>
      )}

      {warning && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <p className="text-sm text-yellow-800 leading-relaxed">{warning}</p>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {metrics.map(metric => (
          <CardMetric key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Fit vs. top card</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </article>
  );
};

const StrategyCard = ({ strategyType, selected, onClick, count }) => {
  const info = getStrategyInfo(strategyType);

  const selectedClasses = selected
    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
    : 'border-gray-200 hover:border-gray-300 text-gray-700';

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all text-left ${selectedClasses}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs uppercase tracking-wide ${selected ? 'text-blue-600' : 'text-gray-400'}`}>
          {info.icon || '⭐️'}
        </div>
        <span className={`text-xs font-semibold ${selected ? 'text-blue-600' : 'text-gray-400'}`}>
          {count} card{count === 1 ? '' : 's'}
        </span>
      </div>
      <h4 className="font-semibold text-gray-900 mb-1">{info.title}</h4>
      <p className="text-sm text-gray-600 leading-relaxed">{info.description}</p>
    </button>
  );
};

const CardMetric = ({ label, value, hint }) => (
  <div>
    <p className="text-xs uppercase text-gray-500">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value}</p>
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

const EmptyState = ({ onBack }) => (
  <div className="bg-white rounded-xl p-8 shadow-lg text-center">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center text-2xl">
      💳
    </div>
    <h2 className="text-xl font-semibold text-gray-900 mb-2">No cards in your wallet yet</h2>
    <p className="text-gray-600 mb-4">Add your cards to unlock personalized strategy insights and recommendations.</p>
    <button
      onClick={onBack}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Go to My Wallet
    </button>
  </div>
);

function formatCardName(card) {
  return card.nickname || card.card_name || card.card_type || 'Card';
}

function buildMetrics(strategy, entry) {
  const { card } = entry;
  const availableCredit = formatCurrency((card.credit_limit || 0) - (card.current_balance || 0));
  const utilization = calculateUtilization(card);

  switch (strategy) {
    case STRATEGY_TYPES.APR_MINIMIZER:
      return [
        { label: 'APR', value: formatPercentage(card.apr) },
        { label: 'Interest on $1000', value: formatCurrency(entry.monthlyInterest), hint: `${formatCurrency(entry.annualInterest)}/year` },
        { label: 'Available credit', value: availableCredit, hint: `Utilization ${utilization}%` }
      ];
    case STRATEGY_TYPES.CASHFLOW_OPTIMIZER: {
      const dueDate = entry.paymentDue || entry.paymentDueDate;
      return [
        { label: 'Float days', value: entry.floatDays ? `${entry.floatDays} days` : '—', hint: dueDate ? `Due ${formatDate(dueDate)}` : undefined },
        { label: 'Available credit', value: availableCredit },
        { label: 'Utilization', value: `${utilization}%`, hint: utilization > 30 ? 'Pay down to regain grace period' : 'Within healthy range' }
      ];
    }
    case STRATEGY_TYPES.REWARDS_MAXIMIZER:
    default:
      return [
        { label: 'Rewards', value: entry.cashback ? `$${entry.cashback.toFixed(2)} back` : getRewardSummary(card) },
        { label: 'Available credit', value: availableCredit },
        { label: 'Utilization', value: `${utilization}%`, hint: utilization > 30 ? 'High utilization reduces rewards value' : 'Great cushioning for new spend' }
      ];
  }
}

function getRewardSummary(card) {
  const rewards = card.reward_structure || {};
  const entries = Object.entries(rewards)
    .filter(([key]) => key !== 'default')
    .sort((a, b) => (b[1] || 0) - (a[1] || 0));

  if (entries.length === 0) {
    return rewards.default ? `${rewards.default}x on everyday purchases` : 'Standard rewards';
  }

  return entries
    .slice(0, 2)
    .map(([key, value]) => `${formatCategoryLabel(key)} • ${value}x`)
    .join(', ');
}

function formatCategoryLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatScore(strategy, entry) {
  switch (strategy) {
    case STRATEGY_TYPES.APR_MINIMIZER:
      return entry.monthlyInterest !== undefined ? `$${entry.monthlyInterest.toFixed(2)}/mo` : Math.round(entry.score);
    case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
      return entry.floatDays ? `${Math.round(entry.floatDays)} days` : Math.round(entry.score);
    case STRATEGY_TYPES.REWARDS_MAXIMIZER:
    default:
      return entry.cashback !== undefined ? `$${entry.cashback.toFixed(2)}` : Math.round(entry.score);
  }
}

function deriveWarning(strategy, entry) {
  if (strategy === STRATEGY_TYPES.CASHFLOW_OPTIMIZER && !entry.canRecommend) {
    return entry.warning || 'This card currently has a balance, so new purchases accrue interest immediately. Pay it down to restore the grace period.';
  }
  if (strategy === STRATEGY_TYPES.REWARDS_MAXIMIZER && !entry.canRecommend) {
    return entry.warning || 'This card has an existing balance, so the rewards value is reduced by interest charges.';
  }
  return null;
}

function deriveReasoning(strategy, entry) {
  if (entry.explanation) {
    return entry.explanation;
  }

  switch (strategy) {
    case STRATEGY_TYPES.APR_MINIMIZER:
      if (entry.monthlyInterest !== undefined) {
        return `Carrying $1,000 costs about $${entry.monthlyInterest.toFixed(2)}/month here.`;
      }
      return null;
    case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
      if (entry.floatDays) {
        const due = entry.paymentDueDate ? `, due ${formatDate(entry.paymentDueDate)}` : '';
        return `You get roughly ${Math.round(entry.floatDays)} days before payment${due}.`;
      }
      return entry.warning || null;
    case STRATEGY_TYPES.REWARDS_MAXIMIZER:
    default:
      if (entry.cashback !== undefined) {
        return `Earn about $${entry.cashback.toFixed(2)} back on a $1,000 purchase.`;
      }
      return null;
  }
}

function selectTopEntry(strategy, entries) {
  if (!entries || entries.length === 0) return null;
  switch (strategy) {
    case STRATEGY_TYPES.REWARDS_MAXIMIZER:
      return entries.find(entry => entry.canRecommend) || entries[0];
    case STRATEGY_TYPES.CASHFLOW_OPTIMIZER:
      return entries.find(entry => entry.canRecommend) || entries[0];
    case STRATEGY_TYPES.APR_MINIMIZER:
    default:
      return entries[0];
  }
}

function computeFitPercent(strategy, entry, topEntry) {
  if (!topEntry) return 100;

  switch (strategy) {
    case STRATEGY_TYPES.APR_MINIMIZER: {
      const topMonthly = topEntry.monthlyInterest || 0;
      const currentMonthly = entry.monthlyInterest || 0;
      if (topMonthly <= 0) return 100;
      if (currentMonthly <= 0) return 100;
      const ratio = topMonthly / currentMonthly;
      return Math.min(100, Math.max(0, Math.round(ratio * 100)));
    }
    case STRATEGY_TYPES.CASHFLOW_OPTIMIZER: {
      const topFloat = topEntry.floatDays || 0;
      const currentFloat = entry.floatDays || 0;
      if (topFloat <= 0) return 50;
      return Math.min(100, Math.max(0, Math.round((currentFloat / topFloat) * 100)));
    }
    case STRATEGY_TYPES.REWARDS_MAXIMIZER:
    default: {
      const topCashback = topEntry.cashback || topEntry.score || 0;
      const currentCashback = entry.cashback || entry.score || 0;
      if (topCashback <= 0) return 100;
      return Math.min(100, Math.max(0, Math.round((currentCashback / topCashback) * 100)));
    }
  }
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatPercentage(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${Number(value).toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) {
    return 'Not set';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }
  return date.toLocaleDateString();
}

export default RecommendationScreen;
