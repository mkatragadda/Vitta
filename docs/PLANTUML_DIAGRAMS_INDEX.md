# Rate-Triggered Transfer - PlantUML Diagrams Index

**Status**: All diagrams created and ready for visualization
**Date**: Feb 21, 2026
**Format**: PlantUML (.puml files)

---

## 📊 Available Diagrams

### 1. **State Machine Diagram**
📁 File: `RATE_TRIGGERED_PLANTUML.puml`

**Purpose**: Shows all possible states and transitions in the rate-triggered transfer flow

**Visualizes**:
- ✅ SETUP PHASE: draft → rate_quoted → rate_locked
- ✅ MONITORING PHASE: monitoring → rate_check
- ✅ APPROVAL PHASE: rate_met → notification_sent
- ✅ USER DECISION: pending_approval (approve) vs cancelled (deny)
- ✅ EXECUTION PHASE: payment_initiated → completed/failed

**Key Features**:
- Color-coded states by phase
- Decision points clearly marked
- Notes explaining each state
- State machine logic documented

**Use Case**: Understand overall state flow at a glance

---

### 2. **Sequence Diagram**
📁 File: `RATE_TRIGGERED_SEQUENCE.puml`

**Purpose**: Shows chronological interactions between user, app, backend, cron, and Chimoney

**Visualizes**:
- 👤 User actions (input, approval/denial)
- 📱 Vitta App responses
- ⚙️ Backend API calls
- ⏰ Cron job monitoring
- 🔗 Chimoney API communication
- 💾 Database updates

**Key Features**:
- Numbered sequence steps (autonumber)
- Parallel operations shown
- Webhook callback from Chimoney
- Activity logging at each step
- Timeline from setup to completion

**Use Case**: Understand exact order of operations and system interactions

---

### 3. **Decision Tree Diagram**
📁 File: `RATE_TRIGGERED_DECISIONS.puml`

**Purpose**: Shows all decision points and possible outcomes

**Visualizes**:
- ✅ Input validation (valid setup vs errors)
- ✅ Rate checking loop (continue vs target met)
- ✅ User decision (approve vs deny)
- ✅ Rate tolerance check (within 2% vs changed)
- ✅ API error handling (retry vs fail)
- ✅ Success/failure paths

**Key Features**:
- Diamond decision nodes
- Multiple branches for each decision
- Error handling paths
- Final outcomes clearly marked
- Analytics collection noted

**Use Case**: Test all edge cases and error scenarios

---

### 4. **Immediate vs Rate-Triggered Comparison**
📁 File: `IMMEDIATE_VS_RATE_TRIGGERED.puml`

**Purpose**: Side-by-side comparison of both transfer types

**Visualizes**:
- **Immediate Transfer**: 💨 Fast & simple path
  - User says "send now"
  - Current rate used (83.72)
  - Immediate execution
  - ₹41,860 received

- **Rate-Triggered Transfer**: ⏰ Maximize returns path
  - User says "send when rate is 84.50"
  - Wait for better rate
  - User approval required
  - ₹42,275 received (₹415 MORE!)

**Key Features**:
- Parallel flows side-by-side
- Timeline comparison
- Amount difference highlighted
- User preference factors noted

**Use Case**: Communicate value proposition to users

---

### 5. **Database Schema & Data Flow**
📁 File: `RATE_TRIGGERED_DATABASE.puml`

**Purpose**: Shows database tables, relationships, and data examples

**Visualizes**:
- 🔷 `transfer_requests` table with all fields
- 🔷 `transfer_corridors` configuration
- 🔷 `recipients` verification data
- 📊 `transfer_activity_log` immutable audit trail
- 📊 `chimoney_webhook_logs` webhook tracking
- 📉 `fx_rates` and `fx_rates_hourly` rate management

**Key Features**:
- Field names and data types
- Primary/foreign keys marked
- Sample data with real values
- Key queries documented
- Immutability requirements noted

**Use Case**: Database design and implementation

---

### 6. **API Endpoints Diagram**
📁 File: `RATE_TRIGGERED_APIS.puml`

**Purpose**: Shows all backend API endpoints organized by phase

**Visualizes**:
- 🟦 POST /api/transfers/quote (setup)
- 🟦 POST /api/transfers/lock-rate (setup)
- 🟨 GET /api/cron/check-fx-rates (monitoring)
- 🟨 GET /api/transfers/rates/today/:corridor (rates)
- 🟩 POST /api/transfers/:id/approve (approval)
- 🟩 POST /api/transfers/:id/deny (approval)
- 🟪 POST /api/webhooks/chimoney (webhook)
- 🟦 GET /api/transfers/activity (activity)
- 🟦 GET /api/transfers/:id/status (status)

**Key Features**:
- Request/response examples
- Backend logic explained
- Webhook payload examples
- Error handling documented
- Security measures noted (signatures, idempotency)

**Use Case**: Backend implementation and integration

---

## 🎯 How to Use These Diagrams

### For Design Review
1. Start with **State Machine** to understand flow
2. Review **Decision Tree** for error cases
3. Check **Immediate vs Rate-Triggered** for value prop

### For Implementation
1. Use **Database Schema** for DDL
2. Reference **API Endpoints** for route definitions
3. Follow **Sequence Diagram** for order of operations

### For Testing
1. Use **Decision Tree** to identify test cases
2. Check **Sequence Diagram** for integration points
3. Verify **Database Schema** for data assertions

### For Documentation
1. Include **State Machine** in architecture docs
2. Include **Sequence Diagram** in API docs
3. Include **Immediate vs Rate-Triggered** in user guide

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
plantuml -Tpng RATE_TRIGGERED_PLANTUML.puml

# Generate SVG
plantuml -Tsvg RATE_TRIGGERED_PLANTUML.puml

# Generate PDF
plantuml -Tpdf RATE_TRIGGERED_PLANTUML.puml
```

### VS Code Extension
- Install: "PlantUML" extension
- Right-click `.puml` file → "Preview"

---

## 🔄 Diagram Relationships

```
                    ┌─────────────────────────┐
                    │  State Machine Diagram  │
                    │   (Overall flow)        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
        ┌───────────▼────────────┐  ┌────────▼─────────────┐
        │  Sequence Diagram      │  │  Decision Tree      │
        │  (Interactions)        │  │  (Edge cases)       │
        └───────────┬────────────┘  └────────┬─────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
    ┌───────────▼─────┐ ┌────────▼──────┐ ┌──────▼──────────┐
    │  API Endpoints  │ │  Database     │ │  Comparison    │
    │  (REST calls)   │ │  (Data model) │ │  (User value)  │
    └─────────────────┘ └───────────────┘ └────────────────┘
```

---

## 📋 Quick Reference

| Diagram | Type | Best For | Output |
|---------|------|----------|--------|
| State Machine | State diagram | Understanding flow | State transitions |
| Sequence | Interaction | API integration | Chronological flow |
| Decision Tree | Flowchart | Testing scenarios | All paths |
| Comparison | Activity | User communication | Value prop |
| Database | Class/ER | Schema design | Tables & relationships |
| APIs | Component | Dev reference | Endpoints & payloads |

---

## 🚀 Next Steps

1. **Generate All Diagrams**: Convert `.puml` files to PNG/SVG
2. **Include in Docs**: Add to README and architecture guides
3. **Share with Team**: Use for implementation kickoff
4. **Update for Changes**: Maintain as design evolves

---

**Document Version**: 1.0
**Last Updated**: Feb 21, 2026
**Created by**: Claude Code
