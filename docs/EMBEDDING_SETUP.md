# Embedding-Based Intent Detection Setup

This guide walks you through setting up embedding-based intent detection for Vitta's conversational AI.

## Overview

The new system uses:
- **OpenAI Embeddings** (`text-embedding-ada-002`) to convert queries to vectors
- **Supabase pgvector** for fast similarity search
- **Vector search** to match user queries with intents
- **GPT-3.5 fallback** when intent is unclear

## Prerequisites

1. **OpenAI API Key** - Add to `.env.local`:
   ```
   NEXT_PUBLIC_OPENAI_API_KEY=sk-...
   ```

2. **Supabase Project** - Already configured in your app

## Setup Steps

### Step 1: Run Database Migration

Execute the SQL migration in Supabase to create tables and functions:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Run the SQL file: `supabase/migrations/20250119_intent_embeddings.sql`

This creates:
- `intent_embeddings` table (stores vector embeddings)
- `match_intents()` function (similarity search)
- `intent_logs` table (analytics)

### Step 2: Generate Intent Embeddings

Run the setup script to generate and store embeddings for all intents:

```bash
node scripts/setupIntentEmbeddings.js
```

This will:
- Generate embeddings for ~60 example queries across 6 intents
- Store them in Supabase
- Verify the setup
- **Cost**: ~$0.01
- **Time**: ~10 seconds

### Step 3: Update VittaApp to Use New Engine

In `components/VittaApp.js`, replace the conversation engine import:

```javascript
// OLD:
import { processQuery } from '../services/chat/conversationEngine';

// NEW:
import { processQuery } from '../services/chat/conversationEngineV2';
```

### Step 4: Test

Try these queries in chat:
- "what cards do I have" ✅ Should match `query_card_data`
- "add a new credit card" ✅ Should match `add_card`
- "split 1500 between my cards" ✅ Should match `split_payment`

Check console logs to see:
- Embedding generation
- Similarity scores
- Intent detection method (vector/gpt/fallback)

## How It Works

### Query Processing Flow

```
User Query
    ↓
[1] Generate Embedding
    ↓
[2] Vector Similarity Search (Supabase)
    ↓
[3] Check Confidence
    ├─ High (>85%) → Use Intent Directly
    ├─ Medium (70-85%) → Use Intent with Confirmation
    └─ Low (<70%) → GPT Fallback
    ↓
[4] Generate Response
```

### Confidence Thresholds

- **High (≥85%)**: Direct match, trust the intent
- **Medium (70-84%)**: Good match, use intent
- **Low (<70%)**: Unclear, ask GPT for help

### Example Matching

Query: "show me my cards"
```
Top Matches:
1. query_card_data - 0.92 similarity ← HIGH CONFIDENCE
2. add_card - 0.45 similarity
3. help - 0.32 similarity
```
→ Uses `query_card_data` intent

## Intent Examples

Each intent has 6-19 example queries to improve matching:

**query_card_data** (19 examples):
- "what cards do I have"
- "show my balance"
- "which card has lowest APR"
- "best card for groceries"
- etc.

**split_payment** (6 examples):
- "split $1500 between cards"
- "distribute my budget"
- "allocate 2000 across all cards"
- etc.

See `services/embedding/intentEmbeddings.js` for full list.

## Cost Estimation

### One-Time Setup
- Generate 60 embeddings: **$0.01**

### Per Query
- Embedding generation: **$0.0001**
- Vector search: **Free** (Supabase)
- GPT fallback (if needed): **$0.001**

**Average cost per 1000 queries**: ~$0.10-$0.50

### With Caching
- Embedding cache stores last 100 queries
- Reduces cost to ~$0.05/1000 queries

## Monitoring

Check intent detection performance:

```javascript
// In browser console
localStorage.getItem('vitta_conversation_history')
```

Query the analytics table:

```sql
SELECT
  matched_intent,
  detection_method,
  AVG(similarity_score) as avg_similarity,
  COUNT(*) as count
FROM intent_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY matched_intent, detection_method
ORDER BY count DESC;
```

## Troubleshooting

### "No matches found"
- **Cause**: Embeddings table is empty
- **Fix**: Run `node scripts/setupIntentEmbeddings.js`

### "OpenAI API error: 401"
- **Cause**: Invalid API key
- **Fix**: Check `NEXT_PUBLIC_OPENAI_API_KEY` in `.env.local`

### "Function match_intents does not exist"
- **Cause**: Migration not run
- **Fix**: Run the SQL migration in Supabase

### Low similarity scores
- **Cause**: Not enough example queries for intent
- **Fix**: Add more examples to `INTENT_EXAMPLES` in `intentEmbeddings.js`, then re-run setup script

## Adding New Intents

1. Add new intent to `data/intents.js`
2. Add examples to `INTENT_EXAMPLES` in `services/embedding/intentEmbeddings.js`
3. Update response handler in `services/chat/responseGenerator.js`
4. Re-run setup script: `node scripts/setupIntentEmbeddings.js`

## Performance Tips

1. **Caching**: Embeddings are cached in memory (last 100 queries)
2. **Batch Processing**: Setup script generates embeddings with 100ms delay to avoid rate limits
3. **Index Optimization**: `ivfflat` index on embeddings for fast search

## Next Steps (Phase 3)

After Phase 1 & 2 are working:
- Add conversational polish using GPT
- Implement GPT intent classifier for edge cases
- Add keyword rules for critical actions

## Files Created

```
services/
  embedding/
    embeddingService.js      # Core embedding API
    intentEmbeddings.js      # Intent examples & generator
  chat/
    conversationEngineV2.js  # New conversation engine

scripts/
  setupIntentEmbeddings.js   # One-time setup script

supabase/
  migrations/
    20250119_intent_embeddings.sql  # Database schema

EMBEDDING_SETUP.md           # This file
```
