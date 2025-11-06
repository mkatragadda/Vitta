# Completed Tasks

- [2025-11-06] Fix: intent_logs.user_id was null and caused FK errors during recommendation intent logging. Implemented migration `supabase/migrations/20251106_fix_intent_logs_user_fk.sql` to change FK from `auth.users(id)` to `public.users(id)` with `ON DELETE SET NULL`. Verified that new intent logs persist with a populated `user_id`.

- [2025-11-06] UI: Fixed VittaChatInterface text box overflow. Replaced single-line input with a multiline, wrapping textarea in `components/VittaChatInterface.js`, added auto-resize with a max height to prevent left-shift on long input, and aligned the Send button with the input bottom.

- [2025-11-06] AI: Implemented hierarchical two-stage intent classification (Option A - Zero-shot LLM). Added category classifier (TASK/GUIDANCE/CHAT) as Stage 1, then vector similarity search within category as Stage 2. Created 3 new intents (`debt_guidance`, `money_coaching`, `chit_chat`) with 100+ examples. Added handlers for debt payoff strategies, financial coaching, and casual conversation. Updated `conversationEngineV2.js` with category-aware GPT prompting. Backward compatible - existing intents unchanged. Next step: Generate embeddings via admin page at `/admin/embeddings`.
