/**
 * PlaidLinkButton Component
 *
 * Initializes and opens Plaid Link UI for bank account linking.
 * Handles onSuccess (with public_token exchange), onExit (user cancelled),
 * and error cases.
 *
 * Props:
 *  - user: { id, email, name }
 *  - onSuccess: (response) => {} - Called after exchange-token succeeds
 *                                  { plaid_item_id, accounts[] }
 *  - onError: (error) => {} - Called on error
 *                             { status: 400|409|500, error: string, message: string }
 *  - onExit: () => {} - Called when user cancels Plaid Link
 *  - institutionId: string (optional) - Pre-select specific institution
 *  - disabled: boolean (optional) - Disable button
 *  - label: string (optional) - Button text
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link as LinkIcon, AlertCircle } from 'lucide-react';

const PlaidLinkButton = ({
  user,
  onSuccess,
  onError,
  onExit,
  institutionId = null,
  disabled = false,
  label = 'Connect Bank Account',
}) => {
  const [linkReady, setLinkReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkToken, setLinkToken] = useState(null);

  // Load Plaid SDK and fetch link token
  useEffect(() => {
    const initPlaidLink = async () => {
      try {
        // Ensure Plaid SDK is loaded
        if (!window.Plaid) {
          console.log('[PlaidLinkButton] Loading Plaid SDK...');

          // Load Plaid script dynamically if not already loaded
          const script = document.createElement('script');
          script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
          script.async = true;
          script.onload = () => {
            console.log('[PlaidLinkButton] Plaid SDK loaded');
          };
          script.onerror = () => {
            console.error('[PlaidLinkButton] Failed to load Plaid SDK');
            setError('Failed to load Plaid SDK');
          };
          document.body.appendChild(script);
        }

        // Fetch link token from backend
        console.log('[PlaidLinkButton] Fetching link token...');
        const response = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create link token');
        }

        const { link_token, env } = await response.json();
        setLinkToken(link_token);
        // Store env in window for use in handleClick
        window.plaidEnv = env;
        setLinkReady(true);
        setError(null);

        console.log('[PlaidLinkButton] Link token obtained, ready to open Plaid Link');
      } catch (err) {
        console.error('[PlaidLinkButton] Error initializing:', err);
        setError(err.message || 'Failed to initialize Plaid Link');
        setError(err.message);
        if (onError) {
          onError({
            status: 500,
            error: 'INITIALIZATION_FAILED',
            message: err.message,
          });
        }
      }
    };

    if (user?.id) {
      initPlaidLink();
    }
  }, [user?.id, onError]);

  // Handle successful token exchange
  const handlePlaidSuccess = useCallback(
    async (publicToken, metadata) => {
      console.log('[PlaidLinkButton] Plaid Link success. Exchanging token...');
      setIsLoading(true);
      setError(null);

      try {
        // Exchange public token for access token on backend
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            user_id: user.id,
          }),
        });

        const data = await response.json();

        // Handle 409 Conflict (duplicate bank link)
        if (response.status === 409) {
          console.log('[PlaidLinkButton] Bank already linked (409)');
          setError(data.message);
          if (onError) {
            onError({
              status: 409,
              error: data.error,
              message: data.message,
              suggestion: data.suggestion,
              plaid_item_id: data.plaid_item_id,
            });
          }
          setIsLoading(false);
          return;
        }

        // Handle other errors
        if (!response.ok) {
          console.error('[PlaidLinkButton] Exchange token failed:', data);
          setError(data.message || 'Failed to exchange token');
          if (onError) {
            onError({
              status: response.status,
              error: data.error,
              message: data.message,
            });
          }
          setIsLoading(false);
          return;
        }

        // Success!
        console.log('[PlaidLinkButton] Token exchanged successfully');
        if (onSuccess) {
          onSuccess(data);
        }
      } catch (err) {
        console.error('[PlaidLinkButton] Error exchanging token:', err);
        setError(err.message);
        if (onError) {
          onError({
            status: 500,
            error: 'EXCHANGE_ERROR',
            message: err.message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, onSuccess, onError]
  );

  // Handle user exit from Plaid Link
  const handlePlaidExit = useCallback(
    (err, metadata) => {
      console.log('[PlaidLinkButton] Plaid Link closed');
      if (err) {
        console.error('[PlaidLinkButton] Plaid error:', err);
        setError(err.display_message || 'Plaid Link error');
        if (onError) {
          onError({
            status: 400,
            error: err.error_code,
            message: err.display_message,
          });
        }
      } else if (onExit) {
        onExit();
      }
    },
    [onError, onExit]
  );

  // Open Plaid Link
  const handleClick = useCallback(() => {
    if (!linkReady || !linkToken) {
      console.warn('[PlaidLinkButton] Plaid Link not ready');
      setError('Plaid Link is not ready. Please wait a moment and try again.');
      return;
    }

    if (!window.Plaid) {
      console.error('[PlaidLinkButton] Plaid SDK not loaded');
      setError('Plaid SDK failed to load');
      return;
    }

    console.log('[PlaidLinkButton] Opening Plaid Link...');

    const config = {
      token: linkToken,
      clientName: 'Vitta',
      env: window.plaidEnv || 'tartan', // Default to tartan (sandbox)
      onSuccess: handlePlaidSuccess,
      onExit: handlePlaidExit,
    };

    // Pre-select institution if provided
    if (institutionId) {
      config.institutionId = institutionId;
    }

    try {
      window.Plaid.create(config).open();
    } catch (err) {
      console.error('[PlaidLinkButton] Error opening Plaid Link:', err);
      setError('Failed to open Plaid Link');
      if (onError) {
        onError({
          status: 500,
          error: 'PLAID_OPEN_FAILED',
          message: err.message,
        });
      }
    }
  }, [linkReady, linkToken, institutionId, handlePlaidSuccess, handlePlaidExit, onError]);

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleClick}
          disabled={!linkReady || isLoading || disabled}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          <LinkIcon className="w-5 h-5" />
          <span>{isLoading ? 'Connecting...' : label}</span>
        </button>
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg max-w-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!linkReady || isLoading || disabled}
      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
    >
      <LinkIcon className="w-5 h-5" />
      <span>{isLoading ? 'Connecting...' : label}</span>
    </button>
  );
};

export default PlaidLinkButton;
