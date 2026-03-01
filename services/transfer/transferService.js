/**
 * Transfer Service
 * Orchestrates international transfers with smart rate logic
 *
 * Smart Rate Decision Tree:
 * - Rate improves → Accept silently ✅
 * - Rate worsens <1% → Accept silently ✅
 * - Rate worsens >1% → Alert user ⚠️
 */

/**
 * Handle exchange rate changes with smart logic
 * @param {number} originalRate - Original rate (1 USD = X INR)
 * @param {number} currentRate - Current rate
 * @param {number} sourceAmount - Amount in USD
 * @returns {Object} Decision { action, reason, changePercent, loss/benefit }
 */
function handleRateChange(originalRate, currentRate, sourceAmount) {
  if (!originalRate || !currentRate || sourceAmount <= 0) {
    throw new Error('Invalid rate parameters');
  }

  const originalAmount_INR = sourceAmount * originalRate;
  const newAmount_INR = sourceAmount * currentRate;
  const changePct = ((currentRate - originalRate) / originalRate) * 100;

  // SCENARIO 1: Rate improves (user gets MORE money)
  if (currentRate > originalRate) {
    return {
      action: 'ACCEPT_SILENTLY',
      reason: 'favorable',
      old_amount: originalAmount_INR,
      new_amount: newAmount_INR,
      benefit: newAmount_INR - originalAmount_INR,
      change_percent: changePct.toFixed(3),
    };
  }

  // SCENARIO 2 & 3: Rate worsened (user gets LESS money)
  if (currentRate <= originalRate) {
    const pctChange = Math.abs(changePct);

    // SCENARIO 2: Rate worsens <1% (negligible)
    if (pctChange <= 1.0) {
      return {
        action: 'ACCEPT_SILENTLY',
        reason: 'negligible_change',
        old_amount: originalAmount_INR,
        new_amount: newAmount_INR,
        loss: originalAmount_INR - newAmount_INR,
        change_percent: changePct.toFixed(3),
      };
    }

    // SCENARIO 3: Rate worsens >1% (significant)
    if (pctChange > 1.0) {
      return {
        action: 'ALERT_USER',
        reason: 'significant_loss',
        old_amount: originalAmount_INR,
        new_amount: newAmount_INR,
        loss: originalAmount_INR - newAmount_INR,
        change_percent: pctChange.toFixed(2),
        requires_confirmation: true,
      };
    }
  }
}

/**
 * Get exchange rate from Chimoney
 * @param {Object} chimoney - Chimoney API client
 * @param {string} sourceCountry - 'US'
 * @param {string} targetCountry - 'IN'
 * @returns {Object} { rate, expiresAt, ... }
 */
async function getExchangeRate(chimoney, sourceCountry = 'US', targetCountry = 'IN') {
  if (!chimoney) {
    throw new Error('Chimoney API client not provided');
  }

  try {
    const rateResponse = await chimoney.rate.get({ countryTo: targetCountry });
    console.log('[transferService] Chimoney rate response:', JSON.stringify(rateResponse, null, 2));

    if (!rateResponse.success || !rateResponse.data) {
      throw new Error(`Chimoney rate API failed: ${rateResponse.error?.message || 'Unknown error'}`);
    }

    // Chimoney response format: { USDINR: 83.25, USDAED: 3.669, ... }
    // Key format: {sourceCountry}{targetCountry}
    const ratesData = rateResponse.data;
    console.log('[transferService] Rates data to parse:', JSON.stringify(ratesData, null, 2));

    const rateKey = `${sourceCountry}${targetCountry}`;
    console.log('[transferService] Looking for rate key:', rateKey);

    const rate = ratesData[rateKey];
    console.log('[transferService] Found rate:', rate);

    if (!rate || rate <= 0) {
      throw new Error(`No rate found for ${sourceCountry} to ${targetCountry}. Available rates: ${Object.keys(ratesData).slice(0, 10).join(', ')}`);
    }

    const parsedRate = parseFloat(rate);

    // Use Chimoney's actual expiry timestamp if provided, otherwise default to 30s
    let expiresAt;
    let validForSeconds = 30; // default fallback

    if (ratesData.expiresAtTimestamp) {
      const now = Date.now();
      const expiresAtMs = ratesData.expiresAtTimestamp;
      const diffMs = expiresAtMs - now;
      const diffSeconds = Math.round(diffMs / 1000);
      validForSeconds = Math.max(0, diffSeconds);

      expiresAt = new Date(expiresAtMs);

      console.log('[transferService] Calculating Chimoney expiry:', {
        currentTimeMs: now,
        currentTimeISO: new Date(now).toISOString(),
        expiresAtTimestampMs: expiresAtMs,
        expiresAtISO: expiresAt.toISOString(),
        diffMs: diffMs,
        diffSeconds: diffSeconds,
        validForSeconds: validForSeconds,
      });
    } else {
      expiresAt = new Date(Date.now() + 30 * 1000);
      console.log('[transferService] Using default 30-second expiry (no Chimoney timestamp provided)');
    }

    return {
      rate: parsedRate,
      expiresAt,
      validForSeconds,
      exchange_rate: parsedRate,
      rate_locked_until: expiresAt,
      is_locked: false,
    };
  } catch (error) {
    throw new Error(`Failed to fetch exchange rate: ${error.message}`);
  }
}

/**
 * Calculate transfer amounts and fees
 * @param {number} sourceAmount - USD amount
 * @param {number} exchangeRate - Exchange rate
 * @param {number} feePercentage - Fee percentage (default 0.5)
 * @returns {Object} Breakdown { sourceAmount, targetAmount, feeAmount, finalAmount }
 */
function calculateTransferAmounts(sourceAmount, exchangeRate, feePercentage = 0.5) {
  if (sourceAmount <= 0 || exchangeRate <= 0 || feePercentage < 0) {
    throw new Error('Invalid transfer parameters');
  }

  const targetAmount = sourceAmount * exchangeRate;
  const feeAmount = (sourceAmount * feePercentage) / 100;
  const finalAmount = targetAmount - feeAmount;

  return {
    source_amount: parseFloat(sourceAmount.toFixed(2)),
    source_currency: 'USD',
    target_amount: parseFloat(targetAmount.toFixed(2)),
    target_currency: 'INR',
    exchange_rate: parseFloat(exchangeRate.toFixed(4)),
    fee_amount: parseFloat(feeAmount.toFixed(2)),
    fee_percentage: parseFloat(feePercentage.toFixed(3)),
    final_amount: parseFloat(finalAmount.toFixed(2)),
  };
}

/**
 * Validate transfer parameters
 * @param {Object} transfer - Transfer object
 * @param {Object} plaidTransferAccount - Transfer account
 * @param {Object} beneficiary - Beneficiary
 * @returns {Object} { valid: boolean, errors: [] }
 */
function validateTransfer(transfer, plaidTransferAccount, beneficiary) {
  const errors = [];

  if (!plaidTransferAccount?.can_transfer_out) {
    errors.push('Account is not enabled for transfers');
  }

  if (!plaidTransferAccount?.is_verified_for_transfer) {
    errors.push('Account transfer verification pending');
  }

  if (transfer.source_amount > (plaidTransferAccount?.transaction_limit || 50000)) {
    errors.push(
      `Amount exceeds transaction limit of ${plaidTransferAccount?.transaction_limit || 50000}`
    );
  }

  if (transfer.source_amount > (plaidTransferAccount?.daily_transfer_limit || 5000)) {
    errors.push(
      `Amount exceeds daily limit of ${plaidTransferAccount?.daily_transfer_limit || 5000}`
    );
  }

  if (beneficiary?.verification_status !== 'verified') {
    errors.push('Beneficiary is not verified');
  }

  if (!beneficiary?.is_active) {
    errors.push('Beneficiary is inactive');
  }

  if (transfer.source_amount < 1) {
    errors.push('Transfer amount must be at least $1');
  }

  if (transfer.source_amount > 999999) {
    errors.push('Transfer amount exceeds maximum limit');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create status log entry for audit trail
 * @param {Object} transfer - Transfer object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} reason - Reason for change
 * @param {Object} metadata - Additional data
 * @returns {Object} Status log entry
 */
function createStatusLogEntry(transfer, oldStatus, newStatus, reason, metadata = {}) {
  return {
    transfer_id: transfer.id,
    old_status: oldStatus,
    new_status: newStatus,
    reason,
    metadata,
    created_at: new Date(),
  };
}

/**
 * Format rate change message for user
 * @param {Object} rateDecision - Rate decision from handleRateChange()
 * @param {number} finalRate - Final exchange rate
 * @param {number} originalRate - Original exchange rate
 * @returns {string} User-friendly message
 */
function formatRateChangeMessage(rateDecision, finalRate, originalRate) {
  if (finalRate > originalRate) {
    const benefit = rateDecision.benefit || 0;
    return `Great news! Exchange rate improved to ₹${finalRate}. Recipient gets ₹${Math.round(benefit)} more!`;
  }

  if (finalRate < originalRate) {
    const loss = rateDecision.loss || 0;
    return `Exchange rate changed to ₹${finalRate}. Recipient gets ₹${Math.round(loss)} less.`;
  }

  return 'Exchange rate remained the same';
}

module.exports = {
  handleRateChange,
  getExchangeRate,
  calculateTransferAmounts,
  validateTransfer,
  createStatusLogEntry,
  formatRateChangeMessage,
};
