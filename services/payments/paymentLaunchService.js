/**
 * PaymentLaunchService
 *
 * Manages the lifecycle of payment launches — the moment Vitta hands the
 * user off to Wise (or another rail) to complete a transfer.
 *
 * Responsibilities:
 *  - Persist a launch record before opening the external app.
 *  - Accept a self-reported status update when the user returns.
 *  - Enforce per-user data isolation: users can only update their own records.
 *
 * Vitta does not move money.  A "launch" is an intent record, not a transfer.
 */

const VALID_RAILS     = ['wise', 'gpay', 'phonepe', 'paytm', 'bank'];
const VALID_PLATFORMS = ['ios', 'android', 'web'];
const VALID_UPI_TYPES = ['p2p', 'p2m', 'unknown'];
const VALID_STATUSES = ['launched', 'completed', 'cancelled', 'failed'];
const UPI_REGEX = /^[\w.-]+@[\w]+$/;

class PaymentLaunchService {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    if (!supabase) {
      throw new Error('[PaymentLaunchService] Supabase client is required');
    }
    this.supabase = supabase;
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /**
   * Persist a new payment launch record.
   * Call this immediately before opening the external payment app so that
   * even if the user never returns, we have a record of the intent.
   *
   * @param {string} userId
   * @param {object} data
   * @param {string}  data.recipientUpiId    - e.g. "amit.kumar@okicici"
   * @param {string}  [data.recipientName]   - display name from QR
   * @param {number}  data.amountInr         - positive INR amount
   * @param {number}  [data.usdEquivalent]   - approximate USD at time of launch
   * @param {number}  [data.exchangeRate]    - USD/INR rate used for display
   * @param {string}  [data.rail='wise']        - one of VALID_RAILS
   * @param {string}  [data.platform]           - 'ios' | 'android' | 'web'
   * @param {string}  [data.upiType]            - 'p2p' | 'p2m' | 'unknown'
   * @param {string}  [data.savedRecipientId]   - beneficiary UUID if already saved
   * @param {string}  [data.note]
   * @returns {Promise<{ success: boolean, launchId?: string, error?: string }>}
   */
  async logLaunch(userId, data) {
    if (!userId) return { success: false, error: 'userId is required' };

    const validation = this._validateLaunchData(data);
    if (!validation.ok) return { success: false, error: validation.error };

    const rail = (data.rail || 'wise').toLowerCase();
    if (!VALID_RAILS.includes(rail)) {
      return { success: false, error: `Invalid rail. Valid values: ${VALID_RAILS.join(', ')}` };
    }

    const platform = data.platform && VALID_PLATFORMS.includes(data.platform)
      ? data.platform : null;
    const upiType = data.upiType && VALID_UPI_TYPES.includes(data.upiType)
      ? data.upiType : null;

    const row = {
      user_id: userId,
      recipient_upi_id: data.recipientUpiId.toLowerCase().trim(),
      recipient_name: data.recipientName?.trim() || null,
      amount_inr: Number(data.amountInr),
      usd_equivalent: data.usdEquivalent != null ? Number(data.usdEquivalent) : null,
      exchange_rate: data.exchangeRate != null ? Number(data.exchangeRate) : null,
      rail,
      status: 'launched',
      platform,
      upi_type: upiType,
      saved_recipient_id: data.savedRecipientId || null,
      note: data.note?.trim() || null,
      launched_at: new Date().toISOString(),
    };

    const { data: record, error } = await this.supabase
      .from('payment_launches')
      .insert([row])
      .select('id')
      .single();

    if (error) {
      console.error('[PaymentLaunchService] DB insert failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[PaymentLaunchService] Launch logged:', record.id, '— rail:', rail);
    return { success: true, launchId: record.id };
  }

  /**
   * Update the status of a launch after the user returns from Wise.
   * Only the owner of the record can update it (enforced by user_id filter).
   * Status 'launched' cannot be re-set — the launch already happened.
   *
   * @param {string} launchId  - UUID of the payment_launches row
   * @param {string} userId    - must match the row's user_id
   * @param {'completed'|'cancelled'|'failed'} status
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async updateStatus(launchId, userId, status) {
    if (!launchId || !userId) {
      return { success: false, error: 'launchId and userId are required' };
    }
    if (!VALID_STATUSES.includes(status)) {
      return { success: false, error: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}` };
    }
    if (status === 'launched') {
      return { success: false, error: "Cannot reset status to 'launched'" };
    }

    const { data: updated, error } = await this.supabase
      .from('payment_launches')
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq('id', launchId)
      .eq('user_id', userId)   // ownership guard — silently returns nothing if mismatch
      .select('id')
      .single();

    if (error || !updated) {
      const msg = error?.message || 'Launch not found or access denied';
      console.error('[PaymentLaunchService] Status update failed:', msg);
      return { success: false, error: msg };
    }

    console.log('[PaymentLaunchService] Status updated:', launchId, '→', status);
    return { success: true };
  }

  // =========================================================================
  // PRIVATE
  // =========================================================================

  /**
   * @private
   * @returns {{ ok: boolean, error?: string }}
   */
  _validateLaunchData(data) {
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'Launch data is required' };
    }
    if (!data.recipientUpiId || typeof data.recipientUpiId !== 'string') {
      return { ok: false, error: 'recipientUpiId is required' };
    }
    if (!UPI_REGEX.test(data.recipientUpiId.trim())) {
      return { ok: false, error: 'recipientUpiId must be a valid UPI address (e.g. name@bank)' };
    }
    const amount = Number(data.amountInr);
    if (!data.amountInr == null || isNaN(amount) || amount <= 0) {
      return { ok: false, error: 'amountInr must be a positive number' };
    }
    return { ok: true };
  }
}

module.exports = PaymentLaunchService;
