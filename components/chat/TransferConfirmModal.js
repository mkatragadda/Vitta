/**
 * TransferConfirmModal Component
 *
 * Shows final transfer confirmation with all details and cost breakdown.
 * Requires user approval before executing the transfer.
 *
 * Props:
 *  - amount: number - Amount in USD
 *  - rate: number - Exchange rate (USD/INR)
 *  - recipient: object - { name, bank, account, ifsc }
 *  - fee: number - Transfer fee in USD
 *  - onApprove: () => void - Callback when user approves transfer
 *  - onDeny: () => void - Callback when user denies transfer
 */

import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const TransferConfirmModal = ({
  amount = 5000,
  rate = 84,
  recipient = {
    name: 'Mom',
    bank: 'HDFC Bank',
    account: '50100123456789',
    ifsc: 'HDFC0001234',
  },
  fee = 5,
  onApprove,
  onDeny,
}) => {
  const amountINR = amount * rate;
  const totalUSD = amount + fee;
  const totalINR = amountINR - fee * rate; // Fee deducted from INR side

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Confirm Transfer</h2>
          <p className="text-blue-100 text-sm mt-1">
            Please review the details carefully before approving
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Recipient Details */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Recipient</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium text-gray-900">{recipient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bank:</span>
                <span className="font-medium text-gray-900">{recipient.bank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account:</span>
                <span className="font-medium text-gray-900 font-mono">
                  {recipient.account.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IFSC:</span>
                <span className="font-medium text-gray-900 font-mono">
                  {recipient.ifsc}
                </span>
              </div>
            </div>
          </div>

          {/* Exchange Rate */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Exchange Rate</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-center text-3xl font-bold text-blue-600">
                $1 = ₹{rate.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Amount Breakdown</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-600">Amount to Send</span>
                <span className="font-medium text-gray-900">${amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-600">Transfer Fee</span>
                <span className="font-medium text-red-600">-${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-600">Total Debit from Account</span>
                <span className="font-bold text-gray-900">${totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-gray-600">Amount Recipient Receives</span>
                <span className="font-bold text-green-600">
                  ₹{totalINR.toLocaleString('en-IN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Verify recipient details</p>
              <p className="text-xs">
                Ensure the recipient information is correct. Transfers cannot be reversed once approved.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Deny
          </button>
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferConfirmModal;
