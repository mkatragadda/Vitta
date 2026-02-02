/**
 * Plaid API Route C: Confirm Accounts
 * POST /api/plaid/confirm-accounts
 *
 * User confirms which accounts to add to their wallet.
 * For each account: runs fuzzy catalog matching, computes statement/payment dates,
 * creates user_credit_cards entries with auto-populated fields.
 *
 * Request:  { user_id, plaid_item_id, selected_accounts: [{plaid_account_id, nickname}] }
 * Response: { added_cards: [{vitta_card_id, plaid_account_id, card_name, missing_fields}] }
 */

import { getSupabase, isSupabaseConfigured } from '../../../config/supabase';
import { matchCatalogCard } from '../../../services/plaid/catalogMatcher';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, plaid_item_id, selected_accounts } = req.body;

    if (!user_id || !plaid_item_id || !Array.isArray(selected_accounts)) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, plaid_item_id, selected_accounts[]',
      });
    }

    if (!isSupabaseConfigured()) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const supabase = getSupabase();

      // 1. Fetch all active catalog cards (sorted by popularity for determinism)
      const { data: catalogCards, error: catalogError } = await supabase
        .from('card_catalog')
        .select('*')
        .eq('is_active', true)
        .order('popularity_score', { ascending: false });

      if (catalogError) {
        throw new Error(`Failed to fetch card catalog: ${catalogError.message}`);
      }

      const addedCards = [];

      // 2. Process each selected account
      for (const selectedAccount of selected_accounts) {
        const { plaid_account_id, nickname } = selectedAccount;

        // Fetch plaid_accounts record
        const { data: plaidAccount, error: accountError } = await supabase
          .from('plaid_accounts')
          .select('*')
          .eq('plaid_item_id', plaid_item_id)
          .eq('plaid_account_id', plaid_account_id)
          .single();

        if (accountError || !plaidAccount) {
          console.error(
            `[plaid/confirm-accounts] Account not found: ${plaid_account_id}`,
            accountError
          );
          continue;
        }

        // Fetch plaid_liabilities record (may be null)
        let liability = null;
        if (plaidAccount.account_subtype === 'credit_card') {
          const { data: liabilityData } = await supabase
            .from('plaid_liabilities')
            .select('*')
            .eq('plaid_item_id', plaid_item_id)
            .eq('plaid_account_id', plaid_account_id)
            .single();

          liability = liabilityData;
        }

        // 3. Compute statement/payment dates from liability
        let statementCloseDay = null;
        let paymentDueDay = null;
        let gracePeriodDays = null;

        if (liability && liability.last_statement_date && liability.next_payment_due_date) {
          statementCloseDay = new Date(liability.last_statement_date).getDate();
          paymentDueDay = new Date(liability.next_payment_due_date).getDate();

          // Grace period = days between statement close and payment due
          const stmtDate = new Date(liability.last_statement_date);
          const dueDate = new Date(liability.next_payment_due_date);
          gracePeriodDays = Math.floor((dueDate - stmtDate) / (1000 * 60 * 60 * 24));
        }

        // 4. Run fuzzy catalog matching
        const matchResult = matchCatalogCard(plaidAccount.name, catalogCards || []);
        const matchedCard = matchResult.card;
        const confidence = matchResult.confidence;

        // 5. Build user_credit_cards record
        const cardData = {
          user_id,
          card_name: plaidAccount.name,
          nickname: nickname || null,
          apr: liability?.purchase_apr || 0,
          credit_limit: plaidAccount.credit_limit || 0,
          current_balance: plaidAccount.current_balance || 0,
          amount_to_pay: liability?.minimum_payment_amount || 0,
          statement_close_day: statementCloseDay,
          payment_due_day: paymentDueDay,
          grace_period_days: gracePeriodDays,
          is_manual_entry: false,
        };

        // If catalog matched with HIGH or MEDIUM confidence, populate fields from catalog
        let missingFields = [];
        if (matchedCard && confidence !== 'NONE') {
          cardData.catalog_id = matchedCard.id;
          cardData.issuer = matchedCard.issuer;
          cardData.card_network = matchedCard.card_network;
          cardData.reward_structure = matchedCard.reward_structure;
          cardData.annual_fee = matchedCard.annual_fee;
        } else {
          // No match — user must fill these in
          cardData.catalog_id = null;
          cardData.issuer = null;
          cardData.card_network = null;
          cardData.reward_structure = null;
          cardData.annual_fee = null;
          missingFields = ['reward_structure', 'issuer', 'card_network', 'annual_fee'];
        }

        // 6. INSERT user_credit_cards
        const { data: createdCard, error: cardError } = await supabase
          .from('user_credit_cards')
          .insert([cardData])
          .select()
          .single();

        if (cardError) {
          throw new Error(
            `Failed to create user_credit_cards for ${plaidAccount.name}: ${cardError.message}`
          );
        }

        // 7. UPDATE plaid_accounts to link back to user_credit_cards
        const { error: linkError } = await supabase
          .from('plaid_accounts')
          .update({ vitta_card_id: createdCard.id })
          .eq('id', plaidAccount.id);

        if (linkError) {
          throw new Error(`Failed to link plaid_account to user_credit_cards: ${linkError.message}`);
        }

        // 8. Add to response
        addedCards.push({
          vitta_card_id: createdCard.id,
          plaid_account_id,
          card_name: plaidAccount.name,
          needs_user_input: missingFields.length > 0,
          missing_fields: missingFields,
        });
      }

      clearTimeout(timeoutId);

      return res.status(200).json({ added_cards: addedCards });
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('[plaid/confirm-accounts] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
