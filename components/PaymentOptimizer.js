import React, { useEffect, useMemo, useState } from 'react';

const readPersistedCards = () => {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.localStorage.getItem('vitta_cards');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

const defaultCards = [
  { id: 1, name: 'Chase Freedom', balance: 2340.67, apr: 18.99, min: 35 },
  { id: 2, name: 'Amex Gold', balance: 1890.45, apr: 0.0, min: 0 },
  { id: 3, name: 'Citi Double Cash', balance: 1245.10, apr: 21.99, min: 30 }
];

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const computePlan = (cards, budget) => {
  const sanitized = cards.map(c => ({
    ...c,
    balance: Math.max(0, toNumber(c.balance)),
    apr: Math.max(0, toNumber(c.apr)),
    min: Math.max(0, toNumber(c.min))
  }));

  const totalMin = sanitized.reduce((s, c) => s + Math.min(c.min, c.balance), 0);
  const remaining = Math.max(0, toNumber(budget) - totalMin);

  // Weight by APR for the remaining distribution, only for cards with remaining balance after min
  const targets = sanitized.map(c => ({
    ...c,
    remainingAfterMin: Math.max(0, c.balance - Math.min(c.min, c.balance))
  })).filter(c => c.remainingAfterMin > 0);

  const totalApr = targets.reduce((s, c) => s + c.apr, 0) || 1;

  const allocations = sanitized.map(c => ({ id: c.id, name: c.name, pay: Math.min(c.min, c.balance) }));
  if (remaining > 0 && targets.length > 0) {
    targets.forEach(t => {
      const share = (t.apr / totalApr) * remaining;
      const extra = Math.min(share, t.remainingAfterMin);
      const idx = allocations.findIndex(a => a.id === t.id);
      allocations[idx].pay += extra;
    });
  }

  // Estimated monthly interest comparison (simple: balance * apr/12)
  const monthlyRate = (apr) => (Math.max(0, apr) / 100) / 12;
  const interestIfMin = sanitized.reduce((s, c) => {
    const newBal = Math.max(0, c.balance - Math.min(c.min, c.balance));
    return s + newBal * monthlyRate(c.apr);
  }, 0);
  const interestIfPlan = sanitized.reduce((s, c) => {
    const pay = allocations.find(a => a.id === c.id)?.pay || 0;
    const newBal = Math.max(0, c.balance - pay);
    return s + newBal * monthlyRate(c.apr);
  }, 0);

  const saved = Math.max(0, interestIfMin - interestIfPlan);

  return { allocations, interestIfMin, interestIfPlan, saved, totalMin, remainingBudget: Math.max(0, remaining) };
};

const PaymentOptimizer = ({ cards: propCards, isDemoMode = false }) => {
  // Transform cards from DB format to optimizer format
  const transformedCards = useMemo(() => {
    // For demo mode, always use default cards
    if (isDemoMode) {
      return defaultCards;
    }

    // For Google login users, use their actual cards from DB
    if (!propCards || propCards.length === 0) {
      return [];
    }
    return propCards.map(card => ({
      id: card.id,
      name: card.card_name || card.card_type,
      balance: card.current_balance || 0,
      apr: card.apr || 0,
      min: card.amount_to_pay || 0
    }));
  }, [propCards, isDemoMode]);

  const [cards, setCards] = useState(transformedCards);
  const [budget, setBudget] = useState(500);

  // Update cards when prop changes (only for non-demo mode)
  useEffect(() => {
    if (!isDemoMode) {
      setCards(transformedCards);
    }
  }, [transformedCards, isDemoMode]);

  useEffect(() => {
    try { if (typeof window !== 'undefined') localStorage.setItem('vitta_cards', JSON.stringify(cards)); } catch {}
  }, [cards]);

  const plan = useMemo(() => computePlan(cards, budget), [cards, budget]);

  const updateCard = (id, field, value) => {
    setCards(cs => cs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addCard = () => {
    setCards(cs => [...cs, { id: Date.now(), name: 'New Card', balance: 0, apr: 0, min: 0 }]);
  };

  const removeCard = (id) => {
    setCards(cs => cs.filter(c => c.id !== id));
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Smart Paydown</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Monthly Budget ($)</span>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-28 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            min="0"
            step="1"
          />
          <button onClick={addCard} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Add Card</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2">Card</th>
              <th className="py-2">Balance</th>
              <th className="py-2">APR %</th>
              <th className="py-2">Min Pay</th>
              <th className="py-2">Recommended</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => {
              const rec = plan.allocations.find(a => a.id === c.id)?.pay || 0;
              return (
                <tr key={c.id} className="border-t">
                  <td className="py-2 pr-3">
                    <input
                      value={c.name}
                      onChange={(e) => updateCard(c.id, 'name', e.target.value)}
                      className="w-44 p-2 border border-gray-200 rounded"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.balance}
                      onChange={(e) => updateCard(c.id, 'balance', Number(e.target.value))}
                      className="w-28 p-2 border border-gray-200 rounded"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.apr}
                      onChange={(e) => updateCard(c.id, 'apr', Number(e.target.value))}
                      className="w-20 p-2 border border-gray-200 rounded"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={c.min}
                      onChange={(e) => updateCard(c.id, 'min', Number(e.target.value))}
                      className="w-20 p-2 border border-gray-200 rounded"
                      min="0"
                      step="1"
                    />
                  </td>
                  <td className="py-2 pr-3 font-semibold">${rec.toFixed(2)}</td>
                  <td className="py-2">
                    <button onClick={() => removeCard(c.id)} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">Minimums Total</p>
          <p className="font-semibold text-gray-900">${plan.totalMin.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-600">Left After Minimums</p>
          <p className="font-semibold text-gray-900">${(Math.max(0, budget - plan.totalMin)).toFixed(2)}</p>
        </div>
        <div className="p-3 bg-green-50 rounded border border-green-200">
          <p className="text-green-700">Estimated Interest Saved (monthly)</p>
          <p className="font-semibold text-green-700">${plan.saved.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentOptimizer;









