# Enhanced Card Recommendation Engine - Implementation Checklist

## 📋 Project Overview

**Objective:** Support 14 merchant categories + intelligent merchant classification
**Timeline:** 6 weeks (Phase 1: Foundation, Phase 2: Integration, Phase 3: Deployment)
**Test Coverage Target:** >92%
**Status:** Ready for Phase 1

---

## Phase 1: Foundation (Weeks 1-2)

### ✅ Task 1: Category Definitions System
- [ ] Create `/services/categories/categoryDefinitions.js`
  - [ ] Define all 14 categories with full metadata
  - [ ] Include: id, name, icon, description, keywords, MCC codes, subcategories, aliases
  - [ ] Add validation: all 14 categories present
  - [ ] Add utility functions: `getCategoryById()`, `findByKeyword()`, `getAllCategories()`
  - [ ] Export as singleton for application-wide use
- [ ] Unit tests for categoryDefinitions
  - [ ] Verify 14 categories exist
  - [ ] Test keyword matching
  - [ ] Test alias resolution
  - [ ] Test MCC code lookups
- [ ] Code review
- **Estimated Time:** 1 day
- **Acceptance Criteria:**
  - ✅ All 14 categories defined with complete metadata
  - ✅ 100% test coverage
  - ✅ Can resolve category by multiple methods (keyword, MCC, alias)

---

### ✅ Task 2: Merchant Classifier Service
- [ ] Create `/services/merchantClassification/merchantClassifier.js`
  - [ ] Implement `MerchantClassifier` class
  - [ ] Method: `classifyMerchant(name, mccCode, context)`
  - [ ] Implement classification pipeline:
    - [ ] Step 1: Check LRU cache (1000 items)
    - [ ] Step 2: MCC code lookup (if provided)
    - [ ] Step 3: Database lookup for known merchants
    - [ ] Step 4: Keyword matching against all 14 categories
    - [ ] Step 5: Return with confidence score
  - [ ] Return format: `{ category, confidence, reasoning, source }`
  - [ ] Implement caching with TTL (24 hours)
  - [ ] Add logging for debugging
- [ ] Create `/services/merchantClassification/mccCodeMapper.js`
  - [ ] Build MCC → category mapping table
  - [ ] Map MCC ranges to categories
  - [ ] Test with common MCCs
  - [ ] Examples: 5812→dining, 5411→groceries, 4899→streaming
- [ ] Create `/services/merchantClassification/merchantDatabase.js`
  - [ ] Interface to known merchant database
  - [ ] Support lookups: exact match, fuzzy match
  - [ ] Cache results in memory
  - [ ] Interface for adding new merchants
- [ ] Unit tests for merchantClassifier
  - [ ] Test classification accuracy (target: >90%)
  - [ ] Test all 14 categories
  - [ ] Test MCC code priority
  - [ ] Test keyword matching
  - [ ] Test confidence scoring
  - [ ] Test cache hits
  - [ ] Test fallback to default
  - [ ] Test edge cases: null input, empty strings, special characters
- [ ] Code review
- **Estimated Time:** 3 days
- **Acceptance Criteria:**
  - ✅ Classify correctly: Whole Foods→groceries, Netflix→streaming, etc.
  - ✅ >90% accuracy on test merchants
  - ✅ <100ms latency per classification
  - ✅ >80% cache hit rate for repeat merchants
  - ✅ 95% unit test coverage

---

### ✅ Task 3: Category Matcher Service
- [ ] Create `/services/recommendations/categoryMatcher.js`
  - [ ] Implement `CategoryMatcher` class
  - [ ] Method: `findRewardMultiplier(card, category, subcategory)`
  - [ ] Implement matching logic:
    - [ ] Exact match: `reward_structure[category]`
    - [ ] Alias match: check `categoryDef.reward_aliases`
    - [ ] Parent category: check parent-child relationships
    - [ ] Rotating categories: check active categories
    - [ ] Default: `reward_structure.default`
  - [ ] Return: `{ multiplier, source, confidence, explanation }`
  - [ ] Handle complex structures: objects with notes, rotating categories
  - [ ] Support subcategory hints for better matching
- [ ] Unit tests for categoryMatcher
  - [ ] Test exact match
  - [ ] Test alias resolution (dining ≈ restaurants)
  - [ ] Test parent category fallback
  - [ ] Test rotating categories (Chase Freedom)
  - [ ] Test cards with notes/conditions
  - [ ] Test default fallback
  - [ ] Test all 14 categories
  - [ ] Test edge cases: null card, missing structure
- [ ] Code review
- **Estimated Time:** 2 days
- **Acceptance Criteria:**
  - ✅ Find correct multiplier for any card-category combo
  - ✅ 98% unit test coverage (deterministic logic)
  - ✅ Handle all reward_structure variants
  - ✅ Provide clear explanations

---

### ✅ Task 4: Test Suite for Phase 1
- [ ] Create `/__tests__/unit/categoryDefinitions.test.js`
  - [ ] Verify schema completeness
  - [ ] Test all 14 categories loadable
  - [ ] Test utility functions
- [ ] Create `/__tests__/unit/merchantClassifier.test.js`
  - [ ] Test 20+ merchants across all 14 categories
  - [ ] Test MCC code paths
  - [ ] Test accuracy metrics
  - [ ] Test confidence calibration
  - [ ] Test cache behavior
  - [ ] Test edge cases
  - **Target:** 95% coverage
- [ ] Create `/__tests__/unit/categoryMatcher.test.js`
  - [ ] Test matching logic for all paths
  - [ ] Test with various card structures
  - [ ] Test complex reward structures
  - [ ] **Target:** 98% coverage
- [ ] Create test fixtures
  - [ ] Sample merchants
  - [ ] Sample cards (old & new format)
  - [ ] Sample classifications
- [ ] Set up test runner
  - [ ] Configure Jest
  - [ ] Add code coverage reporting
  - [ ] Add CI/CD integration if applicable
- **Estimated Time:** 2 days
- **Acceptance Criteria:**
  - ✅ All tests passing
  - ✅ >95% code coverage
  - ✅ Test execution <30 seconds

---

### ✅ Task 5: Documentation for Phase 1
- [ ] Create `/docs/CATEGORY_SYSTEM.md`
  - [ ] Explain all 14 categories
  - [ ] Show usage examples
  - [ ] Document APIs
- [ ] Update main design doc with Phase 1 completion
- [ ] Code comments in all services
- **Estimated Time:** 1 day
- **Acceptance Criteria:**
  - ✅ Clear documentation for developers
  - ✅ Usage examples provided

---

### Phase 1 Deliverables
- ✅ `categoryDefinitions.js` (centralized category system)
- ✅ `merchantClassifier.js` (merchant → category)
- ✅ `categoryMatcher.js` (card → reward multiplier)
- ✅ Comprehensive unit tests (>95% coverage)
- ✅ Documentation

**Phase 1 Completion Criteria:**
- All code written, tested, and reviewed
- All tests passing with >92% coverage
- Ready for integration in Phase 2

---

## Phase 2: Integration (Weeks 3-4)

### ✅ Task 1: Enhanced Recommendation Engine
- [ ] Create `/services/recommendations/enhancedRecommendationEngine.js`
  - [ ] Implement `EnhancedRecommendationEngine` class
  - [ ] Orchestrate: classify → match → score → rank
  - [ ] Method: `getRecommendation(userId, context)`
  - [ ] Accept: merchant name, MCC code, amount, date
  - [ ] Return: primary + alternatives with explanations
  - [ ] Integrate with scoring strategies
  - [ ] Generate human-readable explanations
  - [ ] Include confidence scores
- [ ] Integration tests
  - [ ] E2E: user query → recommendation
  - [ ] Test all 14 categories
  - [ ] Test edge cases
  - [ ] Test performance
  - **Target:** 90% coverage
- [ ] Code review
- **Estimated Time:** 3 days
- **Acceptance Criteria:**
  - ✅ Correct recommendation for any merchant
  - ✅ Confidence scores calibrated correctly
  - ✅ Explanations clear and accurate

---

### ✅ Task 2: Integration with Existing System
- [ ] Update `/services/recommendations/recommendationEngine.js`
  - [ ] Import EnhancedRecommendationEngine
  - [ ] Add feature flag: `USE_ENHANCED_CLASSIFICATION`
  - [ ] Route to old or new engine based on flag
  - [ ] Implement fallback logic
  - [ ] Add logging for both paths
  - [ ] Test backward compatibility
- [ ] Update `/services/recommendations/recommendationStrategies.js`
  - [ ] Ensure all strategies work with 14 categories
  - [ ] Update scoring logic if needed
  - [ ] Test with new categories
- [ ] Update `/services/cardAnalyzer.js`
  - [ ] Replace `MERCHANT_REWARDS` with category system
  - [ ] Use CategoryDefinitions
  - [ ] Test all existing queries still work
- [ ] Backward compatibility tests
  - [ ] Old cards (5 categories) still work
  - [ ] Old queries still work
  - [ ] Graceful fallback on errors
- **Estimated Time:** 2 days
- **Acceptance Criteria:**
  - ✅ All existing tests still pass
  - ✅ Feature flag works correctly
  - ✅ No breaking changes

---

### ✅ Task 3: Update Card Data
- [ ] Update `/services/cardService.js` - Demo cards
  - [ ] Update 3 demo cards with new reward_structure
  - [ ] Add multipliers for all 14 categories
  - [ ] Test that cards still work correctly
  - [ ] Verify reward matching still works
- [ ] Create migration helper
  - [ ] Function to upgrade old cards to new format
  - [ ] Intelligent defaults for missing categories
  - [ ] Test on sample cards
  - [ ] Verify no data loss
- [ ] Test card updates
  - [ ] Existing user cards still work
  - [ ] New categories accessible on demo cards
  - [ ] Backward compatibility maintained
- **Estimated Time:** 1 day
- **Acceptance Criteria:**
  - ✅ Demo cards updated with all 14 categories
  - ✅ All cards (old & new) working correctly

---

### ✅ Task 4: Chat Integration
- [ ] Update `/services/chat/cardDataQueryHandler.js`
  - [ ] Add handlers for new categories
  - [ ] Update category queries
  - [ ] Test natural language understanding
- [ ] Update `/config/intentDefinitions.js`
  - [ ] Add intents for 14 categories
  - [ ] Test intent detection
  - [ ] Example: "Best card for Netflix?" → streaming intent
- [ ] Update `/services/chat/recommendationChatHandler.js`
  - [ ] Integrate with enhanced engine
  - [ ] Test conversational flows
  - [ ] Verify explanations clear
- [ ] Chat tests
  - [ ] Test queries for each category
  - [ ] Test multi-turn conversations
  - [ ] Test edge cases
- **Estimated Time:** 2 days
- **Acceptance Criteria:**
  - ✅ Chat can recommend for all 14 categories
  - ✅ Natural language understanding works
  - ✅ Explanations clear and helpful

---

### ✅ Task 5: Integration Tests
- [ ] Create `/__tests__/integration/enhancedFlow.test.js`
  - [ ] E2E: User query → merchant classified → recommendation provided
  - [ ] Test all 14 categories (integration)
  - [ ] Test multiple cards scenarios
  - [ ] Test edge cases
  - [ ] Test performance
  - **Target:** 85% coverage
- [ ] Create `/__tests__/integration/backwardCompatibility.test.js`
  - [ ] Test old cards still work
  - [ ] Test old queries still work
  - [ ] Test graceful degradation
  - [ ] Test feature flag behavior
- [ ] Performance tests
  - [ ] Measure latency: <500ms end-to-end
  - [ ] Measure cache effectiveness
  - [ ] Identify bottlenecks
- **Estimated Time:** 2 days
- **Acceptance Criteria:**
  - ✅ All integration tests passing
  - ✅ >85% coverage
  - ✅ Performance within budget

---

### ✅ Task 6: Documentation for Phase 2
- [ ] Update `/docs/ENHANCED_RECOMMENDATIONS.md`
  - [ ] System architecture
  - [ ] Integration points
  - [ ] Usage examples
- [ ] Update README if needed
- [ ] Add code examples to docstrings
- [ ] Create troubleshooting guide
- **Estimated Time:** 1 day
- **Acceptance Criteria:**
  - ✅ Documentation complete and clear
  - ✅ Developers can understand system

---

### Phase 2 Deliverables
- ✅ `enhancedRecommendationEngine.js` (orchestrator)
- ✅ Integrated with existing recommendation system
- ✅ Updated card data (all 14 categories)
- ✅ Chat integration working
- ✅ Comprehensive integration tests
- ✅ Complete documentation
- ✅ Feature flag for gradual rollout

**Phase 2 Completion Criteria:**
- All code written, tested, and reviewed
- All tests passing (>92% coverage)
- Documentation complete
- Ready for deployment in Phase 3

---

## Phase 3: Deployment (Weeks 5-6)

### ✅ Task 1: Pre-Deployment Validation
- [ ] Code review
  - [ ] All changes reviewed and approved
  - [ ] No security vulnerabilities
  - [ ] No performance regressions
- [ ] Test in staging environment
  - [ ] Run full test suite
  - [ ] Test with production-like data volume
  - [ ] Test load testing (concurrent requests)
  - [ ] Test error scenarios
- [ ] Documentation review
  - [ ] All docs updated
  - [ ] Runbooks created for common issues
  - [ ] Rollback procedure documented
- [ ] Team training
  - [ ] Engineering team trained
  - [ ] Support team trained on new categories
  - [ ] Documentation available
- **Estimated Time:** 2 days
- **Acceptance Criteria:**
  - ✅ All code approved
  - ✅ Staging tests passing
  - ✅ Team trained and ready

---

### ✅ Task 2: Feature Flag Setup
- [ ] Implement feature flag: `ENHANCED_CLASSIFICATION_V1`
  - [ ] Gradual rollout capability
  - [ ] Environment-based defaults
  - [ ] User segment targeting (optional)
  - [ ] Monitoring integrations
- [ ] Test flag behavior
  - [ ] Enable for 100% in staging
  - [ ] Test both old and new paths
  - [ ] Test flag transitions
- **Estimated Time:** 1 day
- **Acceptance Criteria:**
  - ✅ Feature flag implemented
  - ✅ Can enable/disable without deploy
  - ✅ Monitoring integrated

---

### ✅ Task 3: Monitoring & Alerts
- [ ] Set up monitoring for:
  - [ ] Classification accuracy (should be >90%)
  - [ ] Classification latency (should be <100ms)
  - [ ] Cache hit rate (should be >80%)
  - [ ] Error rates
  - [ ] API response times
  - [ ] Recommendation acceptance rate (proxy for quality)
- [ ] Create alerts for:
  - [ ] Accuracy drops below 85%
  - [ ] Latency exceeds 200ms
  - [ ] Error rate exceeds 1%
  - [ ] Any exceptions
- [ ] Create dashboards
  - [ ] Real-time system health
  - [ ] Accuracy metrics by category
  - [ ] Performance metrics
  - [ ] User engagement metrics
- **Estimated Time:** 2 days
- **Acceptance Criteria:**
  - ✅ Monitoring in place
  - ✅ Alerts configured
  - ✅ Dashboards accessible

---

### ✅ Task 4: Canary Deployment (10% Users)
- [ ] Deploy to staging/test environment
  - [ ] Feature flag: OFF (0% users)
  - [ ] Run smoke tests
  - [ ] Verify system stability
- [ ] Gradual rollout to production
  - [ ] Enable for 1% users (fire and forget test)
  - [ ] Monitor for 1 hour
  - [ ] Check: accuracy, latency, errors, user feedback
- [ ] If stable, increase to 10%
  - [ ] Enable for 10% users
  - [ ] Monitor for 4 hours
  - [ ] Check all metrics
- [ ] If issues detected
  - [ ] Immediately disable feature flag
  - [ ] Investigate root cause
  - [ ] Fix in code
  - [ ] Restart rollout
- **Estimated Time:** 1 day
- **Acceptance Criteria:**
  - ✅ 10% of users using new system
  - ✅ All metrics within targets
  - ✅ No increase in error rates
  - ✅ User feedback positive (if collected)

---

### ✅ Task 5: Full Rollout (100% Users)
- [ ] Monitor canary for 24 hours
  - [ ] Check all metrics
  - [ ] Review user feedback
  - [ ] Verify no regressions
- [ ] If canary stable, enable for 50% users
  - [ ] Monitor for 4 hours
  - [ ] Check metrics again
- [ ] If 50% stable, enable for 100% users
  - [ ] Monitor for 24 hours
  - [ ] Continue monitoring for 1 week
- [ ] Performance tuning
  - [ ] Optimize any slow paths
  - [ ] Increase cache size if needed
  - [ ] Add database indexes
- **Estimated Time:** 3 days
- **Acceptance Criteria:**
  - ✅ All users using new system
  - ✅ All metrics meeting targets
  - ✅ System stable for 1+ week

---

### ✅ Task 6: Deprecation of Old System
- [ ] After 2 weeks of full rollout (stable)
  - [ ] Remove feature flag code
  - [ ] Remove old classification paths
  - [ ] Update documentation
  - [ ] Update code comments
- [ ] Archive old code
  - [ ] Move to branches/archive
  - [ ] Keep for reference
- [ ] Final cleanup
  - [ ] Update error handling
  - [ ] Optimize imports
  - [ ] Clean up test fixtures
- **Estimated Time:** 1 day
- **Acceptance Criteria:**
  - ✅ Old system removed
  - ✅ Code cleaned up
  - ✅ Documentation updated

---

### Phase 3 Deliverables
- ✅ Feature flag implemented
- ✅ Monitoring & alerts in place
- ✅ Canary deployment successful
- ✅ Full rollout completed
- ✅ Old system deprecated
- ✅ Documentation finalized

**Phase 3 Completion Criteria:**
- ✅ System deployed to 100% of users
- ✅ All metrics meeting targets
- ✅ Zero regressions
- ✅ System stable for 1+ week
- ✅ Ready for production support

---

## Success Metrics (Post-Deployment)

### Accuracy Metrics
- [ ] Classification accuracy >90% (measure by comparing to real merchant categories)
- [ ] Confidence calibration (80% of recommendations with "high" confidence should be correct)
- [ ] False positive rate <5%

### Performance Metrics
- [ ] Classification latency <100ms (p95)
- [ ] End-to-end recommendation <500ms (p95)
- [ ] Cache hit rate >80%
- [ ] API uptime >99.9%

### User Engagement Metrics
- [ ] Recommendation acceptance rate >85% (users choose recommended card)
- [ ] User satisfaction rating >4.5/5 (if surveyed)
- [ ] No increase in support tickets

### Business Metrics
- [ ] Coverage: 14 categories (vs previous 5)
- [ ] New recommendations enabled for previously unsupported merchants
- [ ] Estimated revenue impact: better rewards for users → higher engagement

---

## Risk Tracking

### Critical Risks
1. **Classification Accuracy Below 85%**
   - Impact: High (bad recommendations)
   - Mitigation: Extensive testing + ML models + user feedback loop
   - Trigger: accuracy <85% in canary

2. **Performance Degradation >100ms**
   - Impact: High (slow UI)
   - Mitigation: Aggressive caching + database optimization
   - Trigger: latency >200ms in canary

3. **Data Loss During Migration**
   - Impact: High
   - Mitigation: Backward compatibility + no destructive changes
   - Trigger: Test migrations thoroughly

### Medium Risks
4. **Merchant Ambiguity** (e.g., Whole Foods Market = grocery + organic)
   - Impact: Medium (may pick secondary category)
   - Mitigation: Confidence scoring + user feedback
   - Trigger: Confidence <70%

5. **New Bug in Integration**
   - Impact: Medium
   - Mitigation: Comprehensive integration tests
   - Trigger: Unexpected failures in canary

6. **Incomplete Category Coverage**
   - Impact: Low
   - Mitigation: Add missing categories + user education
   - Trigger: User feedback on missing categories

---

## Dependencies

### External Dependencies
- [ ] Supabase database (for merchant lookup table)
- [ ] MCC code database (external or internal)
- [ ] Feature flag system (LaunchDarkly, custom, etc.)
- [ ] Monitoring system (Datadog, New Relic, custom, etc.)

### Internal Dependencies
- [ ] CardService (existing)
- [ ] RecommendationEngine v1 (existing)
- [ ] Chat handlers (existing)
- [ ] Test infrastructure

### Team Dependencies
- [ ] Backend engineers (2-3 people)
- [ ] QA engineer (1 person)
- [ ] DevOps/SRE (feature flag + monitoring)
- [ ] Product manager (requirements + metrics)
- [ ] Design/UX (explanations + user experience)

---

## Estimate Summary

| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 1 (Foundation) | 2 weeks | 40 hours |
| Phase 2 (Integration) | 2 weeks | 50 hours |
| Phase 3 (Deployment) | 2 weeks | 30 hours |
| **Total** | **6 weeks** | **120 hours** |

**Team Size:** 2-3 engineers
**Critical Path:** Phase 1 → Phase 2 → Phase 3 (sequential)

---

## Next Steps

### Immediate (This Week)
1. Review and approve design document
2. Clarify any questions (see Design doc Section 11)
3. Set up development environment
4. Assign team members

### Next Week (Phase 1 Start)
1. Create category definitions
2. Implement merchant classifier
3. Implement category matcher
4. Write comprehensive tests
5. First code review

---

## Sign-Off

- [ ] Design approved by: _______________
- [ ] Product approved by: _______________
- [ ] Engineering approved by: _______________
- [ ] Phase 1 started: _______________
- [ ] Phase 1 completed: _______________
- [ ] Phase 2 completed: _______________
- [ ] Phase 3 completed: _______________

---

## Document Version

- **Version:** 1.0
- **Created:** November 2024
- **Last Updated:** November 2024
- **Status:** Ready for Implementation
- **Related Docs:** `ENHANCED_RECOMMENDATION_DESIGN.md`, `RECOMMENDATION_ENHANCEMENT_SUMMARY.md`
