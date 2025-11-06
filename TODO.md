# TODO: Future Optimizations

## Option B: Logistic Regression Category Classifier (Performance Optimization)

**Status:** Deferred - Implement when latency/cost becomes an issue  
**Priority:** P2 (Nice to have)  
**Estimated Effort:** 2-3 days  
**Current Solution:** Zero-shot LLM classification (Option A) - 100-200ms latency, $0.0001/query

### Why Option B?
- **10x faster**: 10-20ms vs 100-200ms
- **Zero cost**: No API calls vs $0.0001/query
- **Offline**: No external dependencies

### Implementation Steps

#### Phase 1: Data Collection (4-6 hours)
1. Collect 1000+ real user queries from `intent_logs` table
2. Manual labeling:
   - TASK: 400 queries (card_recommendation, query_card_data, split_payment, add_card, remove_card, navigate)
   - GUIDANCE: 300 queries (debt_guidance, money_coaching, help)
   - CHAT: 100 queries (chit_chat, greetings, thanks)
3. Split: 70% train, 15% validation, 15% test
4. Store in `training_data/category_labels.json`

#### Phase 2: Model Training (2-4 hours)
1. Generate embeddings for all labeled queries (use existing OpenAI embeddings)
2. Train logistic regression classifier:
   ```python
   from sklearn.linear_model import LogisticRegression
   import numpy as np
   
   # Load embeddings and labels
   X_train = np.array(train_embeddings)  # Shape: (700, 1536)
   y_train = np.array(train_labels)      # Shape: (700,) - [0=TASK, 1=GUIDANCE, 2=CHAT]
   
   # Train
   clf = LogisticRegression(max_iter=1000, C=1.0)
   clf.fit(X_train, y_train)
   
   # Evaluate
   accuracy = clf.score(X_test, y_test)
   print(f"Accuracy: {accuracy:.2%}")  # Target: >90%
   
   # Export weights
   weights = {
       'coef': clf.coef_.tolist(),      # Shape: (3, 1536)
       'intercept': clf.intercept_.tolist(),  # Shape: (3,)
       'classes': clf.classes_.tolist()
   }
   ```
3. Save model weights to `models/category_classifier.json`

#### Phase 3: JavaScript Inference (2-3 hours)
1. Create `services/ml/categoryClassifier.js`:
   ```javascript
   // Load model weights
   const model = require('../../models/category_classifier.json');
   
   export function predictCategory(embedding) {
       // Logistic regression inference
       // z = X · W^T + b
       const logits = model.coef.map((weights, i) => {
           const dot = weights.reduce((sum, w, j) => sum + w * embedding[j], 0);
           return dot + model.intercept[i];
       });
       
       // Softmax
       const expLogits = logits.map(Math.exp);
       const sumExp = expLogits.reduce((a, b) => a + b, 0);
       const probs = expLogits.map(x => x / sumExp);
       
       // Argmax
       const maxIdx = probs.indexOf(Math.max(...probs));
       const categories = ['TASK', 'GUIDANCE', 'CHAT'];
       
       return {
           category: categories[maxIdx],
           confidence: probs[maxIdx],
           probabilities: {
               TASK: probs[0],
               GUIDANCE: probs[1],
               CHAT: probs[2]
           }
       };
   }
   ```

2. Replace LLM classifier in `conversationEngineV2.js`:
   ```javascript
   // Before (Option A - LLM)
   const category = await classifyCategory(query);
   
   // After (Option B - ML)
   import { predictCategory } from '../ml/categoryClassifier.js';
   const result = predictCategory(queryEmbedding);
   const category = result.category;
   ```

#### Phase 4: A/B Testing (1-2 days)
1. Deploy both classifiers side-by-side
2. Log predictions from both:
   ```javascript
   const llmCategory = await classifyCategory(query);
   const mlCategory = predictCategory(queryEmbedding).category;
   
   // Log disagreements
   if (llmCategory !== mlCategory) {
       logCategoryDisagreement(query, llmCategory, mlCategory);
   }
   ```
3. Analyze disagreements, tune ML model if needed
4. Switch to ML classifier when accuracy >= LLM accuracy

#### Phase 5: Monitoring (Ongoing)
1. Track category prediction accuracy in production
2. Collect edge cases where ML fails
3. Retrain quarterly with new data

### Success Metrics
- **Accuracy:** ≥90% on test set (match or beat LLM)
- **Latency:** <20ms p95
- **Cost:** $0/query
- **Disagreement rate:** <5% vs LLM

### Rollback Plan
If ML model underperforms:
1. Keep LLM classifier as default
2. Use ML classifier only for high-confidence predictions (>0.9)
3. Fall back to LLM for low-confidence cases

### Dependencies
- Python 3.8+ with scikit-learn
- Labeled training data (1000+ queries)
- Embedding generation pipeline

### Notes
- Option A (LLM) is good enough for MVP
- Implement Option B only if:
  - Query volume > 10,000/day (cost becomes significant)
  - P95 latency > 500ms (user experience degrades)
  - Need offline/edge deployment

