/**
 * BeneficiaryManagementScreen Component
 *
 * Container component that orchestrates between beneficiary list and add flow.
 * Manages state for switching between viewing saved beneficiaries and adding new ones.
 *
 * Features:
 * - Display list of saved beneficiaries
 * - Navigate to add beneficiary flow
 * - Handle deletion of beneficiaries
 * - Return to chat after operations
 *
 * @component
 * @example
 * <BeneficiaryManagementScreen
 *   user={user}
 *   onBeneficiarySelected={(ben) => startTransfer(ben)}
 *   onClose={() => setCurrentView('chat')}
 * />
 */

import React, { useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import AddBeneficiaryFlow from './AddBeneficiaryFlow';
import BeneficiariesList from './BeneficiariesList';

const BeneficiaryManagementScreen = ({ user, onBeneficiarySelected, onClose }) => {
  // Local state to manage which view is shown
  const [view, setView] = useState('list'); // 'list' | 'add'
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  /**
   * Handle adding new beneficiary
   * @param {Object} beneficiary - Added beneficiary object
   */
  const handleBeneficiaryAdded = useCallback(
    (beneficiary) => {
      console.log('[BeneficiaryManagementScreen] Beneficiary added:', beneficiary.beneficiaryId);

      // Set as selected for potential transfer
      setSelectedBeneficiary(beneficiary);

      // Return to list view
      setView('list');

      // Notify parent that a beneficiary was selected (for future transfer flow)
      if (onBeneficiarySelected) {
        onBeneficiarySelected(beneficiary);
      }
    },
    [onBeneficiarySelected]
  );

  /**
   * Handle canceling add flow
   */
  const handleAddCancel = useCallback(() => {
    console.log('[BeneficiaryManagementScreen] Add cancelled, returning to list');
    setView('list');
  }, []);

  /**
   * Handle selecting a beneficiary for transfer
   * @param {Object} beneficiary - Selected beneficiary
   */
  const handleSelectBeneficiary = useCallback(
    (beneficiary) => {
      console.log('[BeneficiaryManagementScreen] Beneficiary selected for transfer:', beneficiary.beneficiaryId);
      setSelectedBeneficiary(beneficiary);

      // Notify parent and close
      if (onBeneficiarySelected) {
        onBeneficiarySelected(beneficiary);
      }
    },
    [onBeneficiarySelected]
  );

  /**
   * Handle deleting a beneficiary
   * @param {string} beneficiaryId - ID to delete
   */
  const handleDeleteBeneficiary = useCallback(async (beneficiaryId) => {
    console.log('[BeneficiaryManagementScreen] Deleting beneficiary:', beneficiaryId);

    try {
      const response = await fetch('/api/beneficiaries/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token') || 'demo-token'}`,
          'X-User-Id': user?.id || 'demo-user-id'
        },
        body: JSON.stringify({ beneficiaryId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('[BeneficiaryManagementScreen] Beneficiary deleted successfully');
    } catch (error) {
      console.error('[BeneficiaryManagementScreen] Delete error:', error);
      throw error;
    }
  }, [user?.id]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header with back button */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition"
            title="Return to chat"
          >
            <ArrowLeft size={18} />
            Back to Chat
          </button>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          {view === 'list' ? 'My Beneficiaries' : 'Add New Beneficiary'}
        </h2>
      </div>

      {/* Content area */}
      <div className="p-6">
        {view === 'list' ? (
          <BeneficiariesList
            user={user}
            onAddBeneficiary={() => {
              console.log('[BeneficiaryManagementScreen] Add beneficiary clicked');
              setView('add');
            }}
            onSelectBeneficiary={handleSelectBeneficiary}
            onDeleteBeneficiary={handleDeleteBeneficiary}
          />
        ) : (
          <AddBeneficiaryFlow
            user={user}
            onBeneficiaryAdded={handleBeneficiaryAdded}
            onCancel={handleAddCancel}
          />
        )}
      </div>
    </div>
  );
};

export default BeneficiaryManagementScreen;
