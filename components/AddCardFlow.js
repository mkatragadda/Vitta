import React, { useState } from 'react';
import CardBrowserScreen from './CardBrowserScreen';
import CardDetailsForm from './CardDetailsForm';
import PlaidLinkButton from './PlaidLinkButton';
import PlaidAccountSelector from './PlaidAccountSelector';
import { addCardFromCatalog, addManualCard } from '../services/cardService';
import { Sparkles, CheckCircle } from 'lucide-react';

/**
 * AddCardFlow - Orchestrates the card addition process with multiple pathways
 * Step 1: Browse/Search cards (CardBrowserScreen) - Browse catalog cards or select "Link Bank"
 * Step 2a: Enter details (CardDetailsForm) - For catalog cards
 * Step 2b: Link Bank (PlaidLinkButton) - For Plaid integration
 * Step 3: Select Accounts (PlaidAccountSelector) - Select which accounts to add
 * Step 4: Success - Show success message
 */
const AddCardFlow = ({ user, onComplete, onCancel }) => {
  // Navigation states
  const [step, setStep] = useState('browse'); // 'browse', 'details', 'manual', 'plaid', 'plaid-accounts', 'add-more', 'success'

  // Catalog card flow
  const [selectedCard, setSelectedCard] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedCard, setAddedCard] = useState(null);

  // Plaid flow
  const [plaidItemId, setPlaidItemId] = useState(null);
  const [plaidAccounts, setPlaidAccounts] = useState([]);
  const [plaidItem409Error, setPlaidItem409Error] = useState(null); // For 409 conflict handling
  const [addMorePlaidItemId, setAddMorePlaidItemId] = useState(null); // For add-more flow

  const handleCardSelect = (card) => {
    setSelectedCard(card);
    setStep('details');
  };

  const handleManualEntry = () => {
    setSelectedCard(null); // No catalog card selected
    setStep('manual');
  };

  const handleLinkBank = () => {
    // Navigate to Plaid link flow
    setPlaidItemId(null);
    setPlaidAccounts([]);
    setPlaidItem409Error(null);
    setStep('plaid');
  };

  const handleBack = () => {
    // Determine where to go based on current step
    if (step === 'plaid-accounts' || step === 'add-more') {
      // Go back to plaid linking
      setPlaidAccounts([]);
      setPlaidItemId(null);
      setPlaidItem409Error(null);
      setStep('plaid');
    } else {
      // Go back to browse
      setSelectedCard(null);
      setStep('browse');
    }
  };

  // ============ Plaid Link Handlers ============

  const handlePlaidSuccess = (response) => {
    // response = { plaid_item_id, accounts[] }
    console.log('[AddCardFlow] Plaid success:', response);
    setPlaidItemId(response.plaid_item_id);
    setPlaidAccounts(response.accounts || []);
    setStep('plaid-accounts');
  };

  const handlePlaidError = (error) => {
    // error = { status, error, message, suggestion, plaid_item_id? }
    console.log('[AddCardFlow] Plaid error:', error);

    if (error.status === 409) {
      // Duplicate bank link - offer "Add More Accounts"
      setPlaidItem409Error(error);
      setAddMorePlaidItemId(error.plaid_item_id);
      setStep('add-more');
    } else {
      // Other error - show alert and go back
      alert(`Error linking bank: ${error.message || error.error}`);
      handleBack();
    }
  };

  const handlePlaidExit = () => {
    console.log('[AddCardFlow] User exited Plaid');
    handleBack();
  };

  const handleAccountsConfirmed = (addedCards) => {
    // addedCards is the response from confirm-accounts endpoint
    console.log('[AddCardFlow] Accounts confirmed:', addedCards);
    setAddedCard(addedCards);
    setStep('success');

    // Auto-close success screen after 2 seconds
    setTimeout(() => {
      onComplete(addedCards);
    }, 2000);
  };

  const handleSubmit = async (userDetails) => {
    setIsSubmitting(true);

    try {
      let newCard;

      if (selectedCard) {
        // Add card from catalog
        newCard = await addCardFromCatalog(user.id, selectedCard.id, userDetails);
      } else {
        // Add manual card (when implemented)
        newCard = await addManualCard(user.id, userDetails);
      }

      setAddedCard(newCard);
      setStep('success');

      // Auto-close success screen and refresh after 2 seconds
      setTimeout(() => {
        onComplete(newCard);
      }, 2000);

    } catch (error) {
      console.error('[AddCardFlow] Error adding card:', error);
      alert('Error adding card. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Card Added Successfully!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            {selectedCard?.card_name || 'Your card'} is now in your wallet
          </p>
          <div className="animate-pulse">
            <Sparkles className="w-8 h-8 text-purple-600 mx-auto" />
          </div>
        </div>

        <style jsx>{`
          @keyframes scale-in {
            from {
              transform: scale(0.8);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          .animate-scale-in {
            animation: scale-in 0.5s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Step 1: Browse Cards
  if (step === 'browse') {
    return (
      <CardBrowserScreen
        user={user}
        onCardSelect={handleCardSelect}
        onManualEntry={handleManualEntry}
        onLinkBank={handleLinkBank}
      />
    );
  }

  // Step 2b: Link Bank via Plaid
  if (step === 'plaid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="w-full max-w-md">
          <button
            onClick={handleBack}
            className="mb-4 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            ← Back
          </button>
          <PlaidLinkButton
            user={user}
            onSuccess={handlePlaidSuccess}
            onError={handlePlaidError}
            onExit={handlePlaidExit}
            label="Link Bank accounts via Plaid"
          />
        </div>
      </div>
    );
  }

  // Step 3: Select Accounts from Plaid
  if (step === 'plaid-accounts' && plaidItemId && plaidAccounts.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <PlaidAccountSelector
            user={user}
            plaidItemId={plaidItemId}
            accounts={plaidAccounts}
            onComplete={handleAccountsConfirmed}
            onBack={handleBack}
          />
        </div>
      </div>
    );
  }

  // Step 3b: Handle 409 Conflict - Offer "Add More Accounts"
  if (step === 'add-more' && plaidItem409Error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {plaidItem409Error.error || 'Bank Already Linked'}
            </h2>
            <p className="text-gray-600 mb-6">
              {plaidItem409Error.message || 'This bank account is already connected to your wallet.'}
            </p>
            {plaidItem409Error.suggestion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700">
                  {plaidItem409Error.suggestion}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Try Another Bank
              </button>
              <button
                onClick={() => {
                  setAddMorePlaidItemId(plaidItem409Error.plaid_item_id);
                  setStep('add-more-accounts');
                }}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
              >
                Add More Accounts
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter Details (from catalog)
  if (step === 'details' && selectedCard) {
    return (
      <CardDetailsForm
        selectedCard={selectedCard}
        onBack={handleBack}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Step 3: Manual Entry (no catalog card)
  if (step === 'manual') {
    return (
      <CardDetailsForm
        selectedCard={null}
        onBack={handleBack}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isManualEntry={true}
      />
    );
  }

  // Fallback
  return null;
};

export default AddCardFlow;
