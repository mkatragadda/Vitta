import React, { useState } from 'react';
import CardBrowserScreen from './CardBrowserScreen';
import CardDetailsForm from './CardDetailsForm';
import { addCardFromCatalog, addManualCard } from '../services/cardService';
import { Sparkles, CheckCircle } from 'lucide-react';

/**
 * AddCardFlow - Orchestrates the two-step card addition process
 * Step 1: Browse/Search cards (CardBrowserScreen)
 * Step 2: Enter personal details (CardDetailsForm)
 */
const AddCardFlow = ({ user, onComplete, onCancel }) => {
  const [step, setStep] = useState('browse'); // 'browse', 'details', 'manual', 'success'
  const [selectedCard, setSelectedCard] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedCard, setAddedCard] = useState(null);

  const handleCardSelect = (card) => {
    setSelectedCard(card);
    setStep('details');
  };

  const handleManualEntry = () => {
    setSelectedCard(null); // No catalog card selected
    setStep('manual');
  };

  const handleBack = () => {
    setSelectedCard(null);
    setStep('browse');
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
      />
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
