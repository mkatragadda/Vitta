import React, { useState } from 'react';
import QRScanner from './QRScanner';
import TransferProgress from './TransferProgress';
import { Camera, ArrowLeft, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function ScanToPayScreen({ onBack, userData }) {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Transfer execution states
  const [transferInProgress, setTransferInProgress] = useState(false);
  const [transferStep, setTransferStep] = useState(1);
  const [transferResult, setTransferResult] = useState(null);
  const [transferError, setTransferError] = useState(null);

  const handleScan = async (qrResult) => {
    setShowScanner(false);
    setLoading(true);
    setError(null);

    try {
      console.log('[ScanToPayScreen] Processing scan:', qrResult);

      // Step 1: Parse QR code and save to database
      const parseResponse = await fetch('/api/upi/parse-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({ qrData: qrResult.raw }),
      });

      const parseResult = await parseResponse.json();

      if (!parseResult.success) {
        throw new Error(parseResult.error || 'Failed to parse QR code');
      }

      setScannedData(parseResult.data);

      // Step 2: Create quote automatically
      if (parseResult.data.usdEquivalent > 0) {
        await createQuote(parseResult.data);
      }

    } catch (err) {
      console.error('[ScanToPayScreen] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createQuote = async (scanData) => {
    try {
      const quoteResponse = await fetch('/api/wise/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          sourceAmount: scanData.usdEquivalent,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiScanId: scanData.scanId,
        }),
      });

      const quoteResult = await quoteResponse.json();

      if (quoteResult.success) {
        setQuote(quoteResult.data);
      } else {
        throw new Error(quoteResult.error || 'Failed to create quote');
      }
    } catch (err) {
      console.error('[ScanToPayScreen] Quote error:', err);
      setError(err.message);
    }
  };

  // Execute complete transfer using Phase 4 API
  const handleConfirmPayment = async () => {
    setTransferInProgress(true);
    setTransferStep(1);
    setTransferError(null);

    try {
      // Simulate step progression (in real app, this would come from API progress events)
      const progressInterval = setInterval(() => {
        setTransferStep(prev => Math.min(prev + 1, 4));
      }, 1500);

      // Execute complete 4-step transfer
      const transferResponse = await fetch('/api/wise/transfer/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userData.id,
        },
        body: JSON.stringify({
          sourceAmount: quote.sourceAmount,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          upiId: scannedData.upiId,
          payeeName: scannedData.payeeName,
          upiScanId: scannedData.scanId,
          reference: `Vitta payment to ${scannedData.payeeName}`,
        }),
      });

      clearInterval(progressInterval);

      const transferResult = await transferResponse.json();

      if (!transferResult.success) {
        throw new Error(transferResult.error || 'Transfer failed');
      }

      setTransferResult(transferResult.data);
      setTransferStep(4); // Complete

    } catch (err) {
      console.error('[ScanToPayScreen] Transfer error:', err);
      setTransferError(err.message);
    } finally {
      setTransferInProgress(false);
    }
  };

  // Reset to scan again
  const handleScanAgain = () => {
    setScannedData(null);
    setQuote(null);
    setTransferResult(null);
    setTransferError(null);
    setTransferStep(1);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Scan to Pay</h1>
      </div>

      {/* Transfer Progress */}
      {transferInProgress && (
        <TransferProgress
          currentStep={transferStep}
          error={transferError}
        />
      )}

      {/* Transfer Success */}
      {transferResult && !transferInProgress && (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your payment of <span className="font-semibold">${transferResult.totalDebit.toFixed(2)}</span> has been sent
            </p>

            {/* Transfer Details */}
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Recipient</span>
                <span className="font-medium text-gray-900">{scannedData.payeeName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount sent</span>
                <span className="font-medium text-gray-900">₹{transferResult.targetAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Exchange rate</span>
                <span className="font-medium text-gray-900">1 USD = ₹{transferResult.exchangeRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  {transferResult.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transfer ID</span>
                <span className="font-mono text-xs text-gray-600">{transferResult.transferId.substring(0, 8)}...</span>
              </div>
            </div>

            <button
              onClick={handleScanAgain}
              className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Scan Another QR Code
            </button>
          </div>
        </div>
      )}

      {/* Transfer Error */}
      {transferError && !transferInProgress && (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">{transferError}</p>

            <div className="space-y-3">
              <button
                onClick={handleConfirmPayment}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Try Again
              </button>
              <button
                onClick={handleScanAgain}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Scan Different QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan Button */}
      {!scannedData && !loading && !transferInProgress && !transferResult && (
        <div className="flex flex-col items-center justify-center py-20">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-indigo-600 text-white p-8 rounded-full shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105"
          >
            <Camera className="w-16 h-16" />
          </button>
          <p className="mt-6 text-gray-600 text-center text-lg">
            Tap to scan UPI QR code
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Processing...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setScannedData(null);
            }}
            className="mt-2 text-red-600 underline text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Payment Review & Quote */}
      {scannedData && quote && !loading && !transferInProgress && !transferResult && (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Review</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Merchant</span>
              <span className="font-semibold text-gray-900">{scannedData.payeeName || scannedData.upiId}</span>
            </div>

            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Amount (INR)</span>
              <span className="font-semibold text-gray-900">₹{scannedData.amount.toFixed(2)}</span>
            </div>

            {/* Quote Details with Fee Breakdown */}
            <div className="bg-indigo-50 rounded-lg p-4 my-4">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-gray-700 text-lg">You pay</span>
                <span className="text-3xl font-bold text-indigo-600">
                  ${quote.totalDebit.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-sm mt-3 pt-3 border-t border-indigo-200">
                <span className="text-gray-600">Exchange rate</span>
                <span className="text-gray-900">1 USD = ₹{quote.exchangeRate.toFixed(2)}</span>
              </div>

              {/* Fee breakdown showing Wise + Vitta fees separately */}
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Transfer fee</span>
                <span className="text-gray-900">${quote.fees.total.toFixed(2)}</span>
              </div>

              <div className="ml-4 space-y-1 mt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Wise fee</span>
                  <span className="text-gray-600">${quote.fees.wise.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Vitta fee</span>
                  <span className="text-gray-600">${quote.fees.vitta.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center text-xs text-gray-500 mt-3">
                <Clock className="w-3 h-3 mr-1" />
                <span>Rate locked for {Math.floor(quote.expiresIn / 60)} minutes</span>
              </div>
            </div>

            <button
              onClick={handleConfirmPayment}
              className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition shadow-md"
            >
              Confirm & Pay ${quote.totalDebit.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScanSuccess={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
