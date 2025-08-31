import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, AlertCircle, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
const PaymentOptimizer = dynamic(() => import('./PaymentOptimizer'), { ssr: false });

const readPersistedTx = () => {
  if (typeof window === 'undefined') return [];
  try {
    const s = window.localStorage.getItem('vitta_transactions');
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
};

const Dashboard = ({ apr = 18.99, onOpenAnalyzer, onOpenCards }) => {
  const [transactions, setTransactions] = useState([]);
  const optimizerRef = useRef(null);

  useEffect(() => {
    setTransactions(readPersistedTx());
  }, []);

  const summary = useMemo(() => {
    if (transactions.length === 0) return { totalSpend: 0, byCategory: {}, balance: 0 };
    const byCategory = {};
    let charges = 0;
    let credits = 0;
    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      if (!byCategory[t.category]) byCategory[t.category] = 0;
      byCategory[t.category] += Math.max(0, amt);
      if (amt >= 0) charges += amt; else credits += Math.abs(amt);
    }
    return { totalSpend: charges, byCategory, balance: Math.max(0, charges - credits) };
  }, [transactions]);

  const monthlyInterest = useMemo(() => {
    const rate = Math.max(0, Number(apr) || 0) / 100 / 12;
    return Math.round(summary.balance * rate * 100) / 100;
  }, [apr, summary.balance]);

  const groceriesSpend = summary.byCategory['Groceries'] || 0;

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600">Total Amount Spent (this Cycle)</p>
          <p className="text-2xl font-bold text-gray-900">${summary.totalSpend.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg text-center">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-sm text-gray-600">Estimated Interest (this cycle)</p>
          <p className="text-2xl font-bold text-red-600">${monthlyInterest.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">Amount Spent on Groceries</p>
          <p className="text-2xl font-bold text-green-600">${groceriesSpend.toLocaleString()}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <button onClick={onOpenAnalyzer} className="bg-white rounded-xl p-6 text-left shadow-lg hover:shadow-xl transition-shadow">
          <p className="text-lg font-semibold text-gray-900 mb-2">Analyze Statement</p>
          <p className="text-gray-600">Upload CSV/PDF to extract spend, interest risk, subscriptions.</p>
        </button>
        <button onClick={() => optimizerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="bg-white rounded-xl p-6 text-left shadow-lg hover:shadow-xl transition-shadow">
          <p className="text-lg font-semibold text-gray-900 mb-2">Smart Paydown</p>
          <p className="text-gray-600">Distribute budget across cards to minimize interest.</p>
        </button>
        <button onClick={onOpenCards} className="bg-white rounded-xl p-6 text-left shadow-lg hover:shadow-xl transition-shadow">
          <p className="text-lg font-semibold text-gray-900 mb-2">Best Card Suggestions</p>
          <p className="text-gray-600">Pick the right card for groceries/dining/gas right now.</p>
        </button>
      </div>

      {/* Payment Optimizer */}
      <div ref={optimizerRef}>
        <PaymentOptimizer />
      </div>
    </div>
  );
};

export default Dashboard;


