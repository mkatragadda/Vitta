import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, Upload, FileText, TrendingUp, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
// NOTE: PDF library is dynamically imported on the client when needed

const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  // Strip BOM
  lines[0] = lines[0].replace(/^\uFEFF/, '');
  const splitLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((v) => v.trim());
  };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((line) => splitLine(line));
  return { headers, rows };
};

const inferColumns = (headers) => {
  const find = (...candidates) => {
    const idx = headers.findIndex((h) => candidates.some((c) => h.includes(c)));
    return idx === -1 ? null : idx;
  };
  return {
    dateIdx: find('date', 'transaction date', 'posting date', 'post date'),
    descriptionIdx: find('description', 'merchant', 'details', 'narration', 'name', 'memo'),
    amountIdx: find('amount', 'value', 'transaction amount', 'amount ($)'),
    debitIdx: find('debit', 'withdrawal', 'withdrawals', 'outflow', 'debits'),
    creditIdx: find('credit', 'deposit', 'inflow', 'credits', 'payment'),
    categoryIdx: find('category', 'type'),
  };
};

const normalizeAmount = (raw) => {
  if (raw == null) return 0;
  const hasParens = /\(.*\)/.test(String(raw));
  const s = String(raw).replace(/[$,()]/g, '').trim();
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return hasParens ? -n : n;
};

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const categorize = (description, fallbackCategory) => {
  const text = (description || '').toLowerCase();
  if (/(whole foods|trader joe|kroger|safeway|aldi|costco|walmart).*|grocery/.test(text)) return 'Groceries';
  if (/(mcdonald|starbucks|chipotle|restaurant|dining|ubereats|doordash)/.test(text)) return 'Dining';
  if (/(shell|chevron|exxon|bp|gas|fuel)/.test(text)) return 'Gas';
  if (/(uber|lyft|metro|transit)/.test(text)) return 'Transport';
  if (/(netflix|spotify|hulu|prime|icloud|google storage|subscription)/.test(text)) return 'Subscriptions';
  if (/(amazon|target|best buy|shopping)/.test(text)) return 'Shopping';
  return fallbackCategory || 'Other';
};

const detectSubscriptions = (transactions) => {
  const byMerchant = new Map();
  for (const t of transactions) {
    const key = t.description.toLowerCase();
    if (!byMerchant.has(key)) byMerchant.set(key, []);
    byMerchant.get(key).push(t);
  }
  const subs = [];
  byMerchant.forEach((list, merchant) => {
    if (list.length < 2) return;
    const months = new Set(list.map((t) => monthKey(t.date)));
    const amounts = list.map((t) => Math.abs(t.amount));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / amounts.length;
    if (months.size >= 2 && variance / Math.max(1, avg) < 0.5) {
      subs.push({
        merchant,
        times: list.length,
        avgAmount: Math.round(avg * 100) / 100,
        lastDate: list.map((t) => t.date).sort((a, b) => b - a)[0],
      });
    }
  });
  return subs.sort((a, b) => b.avgAmount - a.avgAmount).slice(0, 6);
};

const StatementAnalyzer = ({ onBack }) => {
  const [fileName, setFileName] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [apr, setApr] = useState(18.99);
  const [dueDate, setDueDate] = useState('');
  const inputRef = useRef(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrorMsg('');
    setStatusMsg('');

    try {
      if (/\.csv$/i.test(file.name)) {
        const text = await file.text();
        const { headers, rows } = parseCsv(text);
        const cols = inferColumns(headers);

        // Infer sign convention when only Amount is present
        let posIsCharge = false;
        if (cols.amountIdx != null && (cols.debitIdx == null && cols.creditIdx == null)) {
          let pos = 0, neg = 0;
          for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const v = rows[i]?.[cols.amountIdx];
            if (v == null) continue;
            const num = normalizeAmount(v);
            if (num > 0) pos++; else if (num < 0) neg++;
          }
          posIsCharge = pos >= neg; // assume positives are charges if most values are positive
        }

        const txs = rows.map((r) => {
          const rawDate = r[cols.dateIdx ?? 0] || '';
          const tryDate = new Date(rawDate || Date.now());
          const date = isNaN(tryDate.getTime()) ? new Date(Date.now()) : tryDate;
          const description = r[cols.descriptionIdx ?? 1] || 'Transaction';
          const rawAmount = r[cols.amountIdx ?? 2];
          const rawDebit = cols.debitIdx != null ? r[cols.debitIdx] : undefined;
          const rawCredit = cols.creditIdx != null ? r[cols.creditIdx] : undefined;
          let amount = 0;
          if (rawDebit != null && String(rawDebit).trim() !== '') {
            // debit column: treat as spend (positive)
            amount = Math.abs(normalizeAmount(rawDebit));
          } else if (rawCredit != null && String(rawCredit).trim() !== '') {
            // credit column: treat as payment/refund (negative)
            amount = -Math.abs(normalizeAmount(rawCredit));
          } else {
            // single Amount column
            const num = normalizeAmount(rawAmount ?? '0');
            if (posIsCharge) {
              amount = num >= 0 ? Math.abs(num) : -Math.abs(num);
            } else {
              amount = num < 0 ? Math.abs(num) : -Math.abs(num);
            }
          }
          const fallbackCategory = r[cols.categoryIdx ?? -1];
          const category = categorize(description, fallbackCategory);
          return { date, description, amount, category };
        }).filter((t) => Number.isFinite(t.amount));
        setTransactions(txs);
        try { if (typeof window !== 'undefined') localStorage.setItem('vitta_transactions', JSON.stringify(txs)); } catch {}
        if (txs.length > 0) {
          setStatusMsg(`Parsed ${txs.length} transactions successfully.`);
        } else {
          setErrorMsg('No transactions found. Ensure your CSV has columns like Date, Description, Amount.');
        }
      } else if (/\.pdf$/i.test(file.name)) {
        const arrayBuffer = await file.arrayBuffer();
        // Dynamically import pdf.js only in the browser
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        // Optional: disable worker for simplicity in this demo
        if (pdfjsLib.GlobalWorkerOptions) {
          // eslint-disable-next-line camelcase
          pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
        }
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
          fullText += '\n' + pageText;
        }
        const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const txs = [];
        const dateRe = /^(\d{4}[-\/]\d{2}[-\/]\d{2})/;
        for (const line of lines) {
          const m = line.match(dateRe);
          if (!m) continue;
          const parts = line.split(/\s{2,}|,\s*/).filter(Boolean);
          if (parts.length < 3) continue;
          const date = new Date(parts[0]);
          const amountPart = parts.slice().reverse().find((p) => /[-+]?\$?\d+[\.,]?\d*/.test(p)) || '0';
          const amount = normalizeAmount(String(amountPart).replace(/[^0-9.-]/g, ''));
          const description = parts.slice(1, -1).join(' ') || 'Transaction';
          const category = categorize(description);
          if (Number.isFinite(amount)) txs.push({ date, description, amount, category });
        }
        setTransactions(txs);
        try { if (typeof window !== 'undefined') localStorage.setItem('vitta_transactions', JSON.stringify(txs)); } catch {}
        if (txs.length > 0) setStatusMsg(`Parsed ${txs.length} transactions from PDF.`);
        else setErrorMsg('Could not detect transactions in the PDF. Try exporting as CSV for best results.');
      } else {
        setErrorMsg('Unsupported file type. Upload a CSV or PDF statement.');
        setTransactions([]);
      }
    } catch (err) {
      setErrorMsg('Failed to parse file. Try a CSV export for best results.');
      setTransactions([]);
    }
  };

  const summary = useMemo(() => {
    if (transactions.length === 0) return { totalSpend: 0, byCategory: {}, byMerchant: {}, balance: 0 };
    const byCategory = {};
    const byMerchant = {};
    let charges = 0;
    let credits = 0;
    for (const t of transactions) {
      if (!byCategory[t.category]) byCategory[t.category] = 0;
      byCategory[t.category] += Math.max(0, t.amount);
      const merchantKey = t.description.split(/[-–|•]/)[0].trim();
      if (!byMerchant[merchantKey]) byMerchant[merchantKey] = 0;
      byMerchant[merchantKey] += Math.max(0, t.amount);
      if (t.amount >= 0) charges += t.amount; else credits += Math.abs(t.amount);
    }
    const balance = Math.max(0, charges - credits);
    return { totalSpend: charges, byCategory, byMerchant, balance };
  }, [transactions]);

  const subscriptions = useMemo(() => detectSubscriptions(transactions), [transactions]);

  const optimization = useMemo(() => {
    const groceries = summary.byCategory['Groceries'] || 0;
    const dining = summary.byCategory['Dining'] || 0;
    const gas = summary.byCategory['Gas'] || 0;
    // Assume user baseline 1% cashback; opportunities: Groceries 5%, Dining 4%, Gas 3%
    const extraGroceries = groceries * (0.05 - 0.01);
    const extraDining = dining * (0.04 - 0.01);
    const extraGas = gas * (0.03 - 0.01);
    const total = Math.round((extraGroceries + extraDining + extraGas) * 100) / 100;
    return { extraGroceries, extraDining, extraGas, total };
  }, [summary]);

  const monthlyInterest = useMemo(() => {
    const rate = Math.max(0, Number(apr) || 0) / 100 / 12;
    return Math.round(summary.balance * rate * 100) / 100;
  }, [apr, summary.balance]);

  const groceriesSpend = useMemo(() => {
    return summary.byCategory['Groceries'] || 0;
  }, [summary]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
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
              <h1 className="text-3xl font-bold text-gray-900">Statement Analyzer</h1>
              <p className="text-gray-600">Upload a CSV statement to get instant savings and risk insights</p>
            </div>
          </div>
        </div>

        {/* KPI Header Strip */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Total Amount Spent</p>
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

        {/* Status / Error Banners */}
        {statusMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload & Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Statement (CSV)</h3>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-3">Drag and drop or select a CSV file</p>
                <input ref={inputRef} type="file" accept=".csv,.pdf" onChange={handleUpload} className="hidden" />
                <button
                  onClick={() => inputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose File
                </button>
                {fileName && (
                  <p className="text-sm text-gray-500 mt-3">Selected: {fileName}</p>
                )}
              </div>
              {transactions.length === 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 font-medium mb-2">Sample CSV format:</p>
                  <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
Date,Description,Amount,Category{"\n"}
2024-12-01,Whole Foods Market,89.67,Groceries{"\n"}
2024-12-02,Shell Gas Station,45.23,Gas{"\n"}
2024-12-03,Amazon,67.89,Shopping
                  </pre>
                  <p className="text-xs text-gray-500 mt-2">Tip: Export statements from your bank/credit card site as CSV and upload here.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">APR & Due Date</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">APR (%)</label>
                  <input
                    type="number"
                    value={apr}
                    onChange={(e) => setApr(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Statement Due Date</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" title="Add calendar reminder">
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Smart Recommendations</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Use category-optimized cards</p>
                    <p className="text-sm text-gray-700">Groceries: 5% card, Dining: 4% card, Gas: 3% card. Estimated extra rewards: ${optimization.total.toLocaleString()} this period.</p>
                  </div>
                </div>
                {subscriptions.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Review recurring subscriptions</p>
                      <p className="text-sm text-gray-700">We detected {subscriptions.length} recurring merchants you may want to review.</p>
                    </div>
                  </div>
                )}
                {monthlyInterest > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Pay before due date to avoid interest</p>
                      <p className="text-sm text-gray-700">Current balance estimated at ${summary.balance.toLocaleString()}. Paying in full before {dueDate || 'the due date'} avoids about ${monthlyInterest.toLocaleString()} in monthly interest at {apr}% APR.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
                <div className="space-y-2">
                  {Object.entries(summary.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{cat}</span>
                        <span className="text-sm font-medium text-gray-900">${amt.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Likely Subscriptions</h3>
                {subscriptions.length === 0 ? (
                  <p className="text-sm text-gray-600">No recurring subscription-like transactions detected.</p>
                ) : (
                  <div className="space-y-2">
                    {subscriptions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{s.merchant}</span>
                        <span className="text-sm font-medium text-gray-900">${s.avgAmount.toLocaleString()} / mo</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatementAnalyzer;


