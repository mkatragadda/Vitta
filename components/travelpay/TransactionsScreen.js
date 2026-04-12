import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';

export default function TransactionsScreen({ userId, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({
    totalUsd: 0,
    count: 0
  });

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // TODO: Fetch real transactions from API
      // Mock data for now
      const mockTransactions = [
        {
          id: 1,
          payeeName: 'Café Coffee Day',
          usdAmount: 5.37,
          inrAmount: 450,
          timestamp: new Date().toISOString(),
          category: 'today'
        },
        {
          id: 2,
          payeeName: 'Auto Rickshaw',
          usdAmount: 2.15,
          inrAmount: 180,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
          category: 'today'
        },
        {
          id: 3,
          payeeName: 'Street Food',
          usdAmount: 1.20,
          inrAmount: 100,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          category: 'yesterday'
        }
      ];

      setTransactions(mockTransactions);

      // Calculate monthly stats
      const totalUsd = mockTransactions.reduce((sum, tx) => sum + tx.usdAmount, 0);
      setMonthlyStats({
        totalUsd,
        count: mockTransactions.length
      });
    } catch (error) {
      console.error('[TransactionsScreen] Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const groupedTransactions = transactions.reduce((groups, tx) => {
    const category = tx.category || 'today';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tx);
    return groups;
  }, {});

  return (
    <div className="h-screen flex flex-col px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Transactions</h1>
          <p className="text-slate-400 text-sm">Your payment history</p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Monthly Stats */}
      <div className="mb-4">
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-slate-400 text-xs mb-1">This Month (USD)</p>
              <p className="text-white font-bold text-xl">
                ${monthlyStats.totalUsd.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Payments</p>
              <p className="text-white font-bold text-xl">{monthlyStats.count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">No transactions yet</p>
              <p className="text-slate-500 text-xs mt-2">
                Start by scanning a UPI QR code to pay
              </p>
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([category, txs]) => (
              <div key={category}>
                <p className="text-slate-400 text-xs font-semibold uppercase mb-2">
                  {category === 'today' ? 'Today' : category === 'yesterday' ? 'Yesterday' : category}
                </p>
                <div className="space-y-2">
                  {txs.map((tx) => (
                    <div
                      key={tx.id}
                      className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-white/5 transition-all"
                    >
                      <div className="flex-1">
                        <p className="text-white text-sm font-semibold">{tx.payeeName}</p>
                        <p className="text-slate-400 text-xs">{formatTime(tx.timestamp)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold text-sm">
                          ${tx.usdAmount.toFixed(2)}
                        </p>
                        <p className="text-slate-400 text-xs">₹{tx.inrAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
