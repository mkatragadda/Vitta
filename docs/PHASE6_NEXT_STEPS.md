# Phase 6 Next Steps

## 🎯 Immediate Next Steps (Required)

### 1. Run Database Migration ⚠️ **CRITICAL**

**Action**: Execute the Phase 6 migration in Supabase

```sql
-- Run this file in Supabase SQL Editor:
supabase/migrations/20251207_phase6_learning_system.sql
```

**What it creates**:
- `query_patterns` table (stores learned patterns)
- Extended `intent_logs` table (with Phase 6 fields)
- `query_feedback` table (for feedback collection)
- `match_patterns` RPC function (for pattern matching)
- Analytics views and triggers

**Verification**:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('query_patterns', 'query_feedback');

-- Should return both tables
```

### 2. Update Test Files ⚠️ **REQUIRED**

**Issue**: `decompose()` method is now async, but tests call it synchronously

**Files to update**:
- `__tests__/unit/query/queryDecomposer.test.js`
- `__tests__/unit/query/queryExecutor.test.js`
- `__tests__/unit/query/phase3Integration.test.js`

**Fix pattern**:
```javascript
// Before:
const structured = decomposer.decompose(query, entities, 'query_card_data');

// After:
const structured = await decomposer.decompose(query, entities, 'query_card_data');

// And make test function async:
test('decomposes distinct issuers query', async () => {
  // ...
});
```

**Run tests**:
```bash
npm test -- __tests__/unit/query/
```

### 3. Verify Intent Embeddings ✅ **VERIFY**

**Check if existing intent embeddings are set up**:

```sql
SELECT COUNT(*) FROM intent_embeddings;
-- Should return > 0
```

**If count is 0, run**:
```bash
node scripts/setupIntentEmbeddings.js
```

## 🧪 Testing Phase 6 (Recommended)

### 4. Test Pattern Learning

**Test queries to try**:
1. "what are the different issuers" → Should learn pattern
2. "what networks do I have" → Should match learned pattern
3. "list all visa cards" → Should learn new pattern
4. "show me my mastercard cards" → Should match pattern

**Check patterns learned**:
```sql
SELECT natural_query, intent, usage_count, confidence 
FROM query_patterns 
ORDER BY created_at DESC 
LIMIT 10;
```

### 5. Test Query Analytics

**Check query tracking**:
```sql
SELECT 
  matched_intent,
  decomposition_method,
  COUNT(*) as count,
  AVG(response_time_ms) as avg_time
FROM intent_logs
WHERE created_at >= now() - interval '1 day'
GROUP BY matched_intent, decomposition_method;
```

### 6. Create Unit Tests

**Priority order**:
1. **PatternLearner tests** (`__tests__/unit/learning/patternLearner.test.js`)
   - Test pattern learning
   - Test pattern matching
   - Test pattern evolution

2. **QueryAnalytics tests** (`__tests__/unit/learning/queryAnalytics.test.js`)
   - Test query tracking
   - Test statistics generation
   - Test user analytics

3. **FeedbackLoop tests** (`__tests__/unit/learning/feedbackLoop.test.js`)
   - Test implicit feedback
   - Test explicit feedback
   - Test feedback processing

## 🔍 Verification Checklist

### Pre-Production
- [ ] Database migration executed successfully
- [ ] All test files updated for async `decompose()`
- [ ] All existing tests passing
- [ ] Intent embeddings verified
- [ ] Pattern learning tested with sample queries
- [ ] Query analytics tracking verified

### Production Monitoring
- [ ] Monitor pattern learning (check `query_patterns` table growth)
- [ ] Monitor query analytics (check `intent_logs` table)
- [ ] Check for any errors in logs related to Phase 6
- [ ] Verify pattern matching is working (check `decomposition_method = 'pattern_match'`)

## 🚀 Optional Enhancements

### 7. Analytics Dashboard (Future)

Build a dashboard using `QueryAnalytics`:
- Query statistics
- Pattern performance
- User behavior

### 8. Feedback UI (Future)

Implement UI for explicit feedback:
- Thumbs up/down buttons
- Rating system
- Correction input

## 📊 Expected Behavior

### Pattern Learning Timeline

**Week 1**:
- Patterns start being learned
- `query_patterns` table grows
- Most queries use `decomposition_method = 'direct'`

**Week 2-4**:
- More patterns learned
- Some queries start using `decomposition_method = 'pattern_match'`
- Pattern confidence improves

**Month 2+**:
- Significant pattern library
- Most common queries use pattern matching
- System becomes faster and more accurate

## 🐛 Troubleshooting

### Patterns not learning?
- Check if `enablePatternLearning` is true in QueryDecomposer
- Check console logs for PatternLearner errors
- Verify database connection

### Pattern matching not working?
- Check if `query_patterns` table has data
- Verify `match_patterns` RPC function exists
- Check similarity thresholds (default: 0.85)

### Analytics not tracking?
- Check if `enableTracking` is true in QueryExecutor
- Verify `intent_logs` table has Phase 6 columns
- Check console logs for QueryAnalytics errors

## 📚 Related Documentation

- `docs/PHASE6_INTEGRATION_COMPLETE.md` - Integration details
- `docs/PHASE6_IMPLEMENTATION_PLAN.md` - Full implementation plan
- `docs/PHASE6_EMBEDDINGS_CHECK.md` - Embeddings information

