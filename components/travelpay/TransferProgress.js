import React from 'react';
import { CheckCircle, Circle, Loader } from 'lucide-react';

/**
 * Transfer Progress Indicator
 * Shows the 4 steps of Wise transfer flow
 */
export default function TransferProgress({ currentStep, steps, error }) {
  const defaultSteps = [
    { id: 1, label: 'Creating quote', description: 'Locking exchange rate' },
    { id: 2, label: 'Setting up recipient', description: 'Preparing payment details' },
    { id: 3, label: 'Creating transfer', description: 'Initiating transaction' },
    { id: 4, label: 'Funding transfer', description: 'Completing payment' },
  ];

  const stepList = steps || defaultSteps;

  const getStepStatus = (stepId) => {
    if (error && stepId === currentStep) return 'error';
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'in_progress';
    return 'pending';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
        Processing Payment
      </h3>

      <div className="space-y-4">
        {stepList.map((step) => {
          const status = getStepStatus(step.id);

          return (
            <div key={step.id} className="flex items-start">
              {/* Icon */}
              <div className="flex-shrink-0 mr-4">
                {status === 'completed' && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
                {status === 'in_progress' && (
                  <Loader className="w-6 h-6 text-indigo-600 animate-spin" />
                )}
                {status === 'error' && (
                  <Circle className="w-6 h-6 text-red-500 fill-current" />
                )}
                {status === 'pending' && (
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
              </div>

              {/* Content */}
              <div className="flex-grow">
                <p className={`font-medium ${
                  status === 'completed' ? 'text-green-700' :
                  status === 'in_progress' ? 'text-indigo-700' :
                  status === 'error' ? 'text-red-700' :
                  'text-gray-400'
                }`}>
                  {step.label}
                </p>
                <p className="text-sm text-gray-500">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
