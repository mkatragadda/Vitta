# Recipient Addition - PlantUML Diagrams Index

**Status**: All diagrams created and ready for visualization
**Date**: Feb 21, 2026
**Format**: PlantUML (.puml files)

---

## 📊 Available Diagrams

### 1. **Sequence Diagram**
📁 File: `RECIPIENT_ADDITION_PLANTUML.puml`

**Purpose**: Shows chronological interactions during recipient addition and Chimoney verification

**Visualizes**:
- ✅ PHASE 1: RECIPIENT DETAILS INPUT - User selects payment method and enters details
- ✅ PHASE 2: SEND TO BACKEND - Form submission with validation
- ✅ PHASE 3: CHIMONEY VERIFICATION - Backend API call and response handling
- ✅ PHASE 4: COMPLETION - Success with database insertion OR failure with retry/cancel options

**Key Features**:
- Numbered sequence steps (autonumber)
- Both UPI and Bank Account field examples shown
- Verification request/response payloads documented
- Error handling paths with retry capability
- Database logging for audit trail
- Chimoney response examples

**Use Case**: Understand the complete flow of recipient addition from user input to database storage

---

### 2. **State Machine Diagram**
📁 File: `RECIPIENT_ADDITION_PLANTUML_STATE_MACHINE.puml`

**Purpose**: Shows all possible states and transitions in the recipient addition flow

**Visualizes**:
- ✅ DRAFT: Initial state when user clicks "Add Recipient"
- ✅ FORM_FILLED: User has entered recipient details
- ✅ VALIDATING: Client-side validation of input
- ✅ CHIMONEY_VERIFICATION: Backend calling Chimoney API
- ✅ VERIFIED: Successfully added recipient ready for use
- ✅ VERIFICATION_FAILED: Chimoney returned an error
- ✅ CANCELLED: User cancelled the process

**Key Features**:
- Color-coded states by phase
- Transition conditions clearly marked
- Error retry path documented
- Notes explaining each state
- Validation rules listed

**Use Case**: Understand overall state flow and possible paths through recipient addition

---

### 3. **Decision Tree Diagram**
📁 File: `RECIPIENT_ADDITION_PLANTUML_DECISIONS.puml`

**Purpose**: Shows all decision points and possible outcomes during verification

**Visualizes**:
- ✅ Input validation decisions (name, phone, format)
- ✅ Payment method branching (UPI vs Bank Account)
- ✅ Format validation (UPI format, account number, IFSC)
- ✅ Chimoney API success/failure paths
- ✅ Specific error code handling (8 different error scenarios)
- ✅ Retry logic and cancellation paths
- ✅ Database insertion on success

**Key Features**:
- Diamond decision nodes for all branching
- Multiple error paths with specific handling
- Rate limiting logic documented (max 3 attempts/day)
- Encryption of sensitive fields shown
- Database record structure documented
- Verification audit trail logging

**Use Case**: Test all edge cases and error scenarios, implement verification logic

---

## 🎯 How to Use These Diagrams

### For Design Review
1. Start with **Sequence Diagram** to understand end-to-end flow
2. Review **State Machine** for state transitions and paths
3. Check **Decision Tree** for all error cases

### For Implementation
1. Use **Sequence Diagram** for API call order and payload structure
2. Reference **Decision Tree** for verification logic implementation
3. Follow **State Machine** for state management in frontend

### For Testing
1. Use **Decision Tree** to identify all test cases
2. Check **Sequence Diagram** for integration points
3. Verify **State Machine** for all state transitions

### For Documentation
1. Include **Sequence Diagram** in API documentation
2. Include **State Machine** in architecture documentation
3. Include **Decision Tree** in testing/QA documentation

---

## 📋 Diagram Summary Table

| Diagram | Type | Best For | Scope |
|---------|------|----------|-------|
| Sequence | Interaction | API integration | Full flow: input → storage |
| State Machine | State diagram | State management | State transitions & paths |
| Decision Tree | Flowchart | Error handling | All decision points & branches |

---

## 🔗 Related Documentation

- **[RECIPIENT_ADDITION_VERIFICATION_DESIGN.md](RECIPIENT_ADDITION_VERIFICATION_DESIGN.md)** - Comprehensive design document
- **[RATE_TRIGGERED_PLANTUML_DIAGRAMS_INDEX.md](PLANTUML_DIAGRAMS_INDEX.md)** - Rate-triggered transfer diagrams

---

## 📈 Generating Diagrams

### Online Viewers
- **PlantUML Online**: https://www.plantuml.com/plantuml/uml/
- Upload any `.puml` file to visualize

### Local Tools
```bash
# Install PlantUML
brew install plantuml

# Generate PNG
plantuml -Tpng RECIPIENT_ADDITION_PLANTUML.puml

# Generate SVG
plantuml -Tsvg RECIPIENT_ADDITION_PLANTUML.puml

# Generate all recipient diagrams
plantuml -Tpng RECIPIENT_ADDITION_*.puml
```

### VS Code Extension
- Install: "PlantUML" extension
- Right-click `.puml` file → "Preview"

---

## 🔄 Diagram Relationships

```
                ┌──────────────────────────┐
                │  Sequence Diagram        │
                │  (Full flow overview)    │
                └───────────┬──────────────┘
                            │
                ┌───────────┴──────────────┐
                │                          │
    ┌───────────▼────────────┐  ┌─────────▼──────────┐
    │  State Machine         │  │  Decision Tree     │
    │  (State transitions)   │  │  (Error handling)  │
    └────────────────────────┘  └────────────────────┘
```

---

## 📋 Implementation Checklist

Using these diagrams, implement in this order:

### Phase 1: Database & Backend Setup
- [ ] Create `recipients` table (schema from RECIPIENT_ADDITION_VERIFICATION_DESIGN.md)
- [ ] Create `verification_logs` table for audit trail
- [ ] Implement `recipientService.js` with `addRecipient()` method
- [ ] Integrate Chimoney API client

### Phase 2: API Endpoints
- [ ] POST `/api/transfers/recipients/add` - Recipient verification & creation
- [ ] GET `/api/transfers/recipients` - List user's recipients
- [ ] DELETE `/api/transfers/recipients/:id` - Delete recipient
- [ ] GET `/api/transfers/recipients/:id` - Get recipient details

### Phase 3: Frontend Components
- [ ] Create `RecipientForm` component (payment method selector + input fields)
- [ ] Create `RecipientReview` screen (review before submission)
- [ ] Create `RecipientList` component (display user's recipients)
- [ ] Add error handling UI for verification failures

### Phase 4: Testing
- [ ] Unit tests for verification decision logic
- [ ] Integration tests for Chimoney API calls
- [ ] E2E tests for complete recipient addition flow
- [ ] Test all error scenarios (invalid format, API errors, rate limiting)

---

## 🚀 Next Steps

1. **Review Diagrams**: Validate diagrams with design stakeholders
2. **Convert to Images**: Generate PNG/SVG versions for documentation
3. **Implementation**: Start with database schema and backend service
4. **Frontend**: Build React components using sequence diagram as spec
5. **Testing**: Verify all decision paths work correctly

---

**Document Version**: 1.0
**Last Updated**: Feb 21, 2026
**Created by**: Claude Code
