Great question. We need a consistent strategy so the assistant handles messy inputs gracefully—without frustrating users. Here’s a design that balances accuracy, user experience, and future scalability.

---

## Guiding Principles

1. **Don’t guess when the risk is high.** For any action that schedules a reminder or changes a memory, unclear details should be clarified explicitly.
2. **Do offer help when recall is fuzzy.** When the user is just asking, “What did I say about X?”, leverage what we have and explain the confidence level or missing fields.
3. **Track the confidence of each extracted field.** Entity extraction should return `{value, confidence, source}` for date, amount, tags, etc. We then apply rules per intent.

---

## Intent-specific Behavior

### 1. “Remember” / “Create Reminder”
| Field | Rule |
| --- | --- |
| **Date / time** | If missing or low confidence → ask. “When should I remind you?” or “Do you mean Nov 5th or Sep 5th?” |
| **Recurrence** | If user says “every month,” but day missing → ask. |
| **Trigger text** | Optional, but if nothing is supplied we fallback to the natural text the user provided. |
| **Tags** | Optional; if not provided we store an empty array. |

**Examples**
- User: “Remind me to pay Amex soon.”  
  → Bot: “Got it! When should I remind you? You can say a specific date or ‘2 days before due date’.”
- User: “Remember I paid Bob $120 last month.”  
  If “last month” resolves to a date with medium confidence, we can reply:  
  “Sure — I recorded $120 to Bob on Oct 1 (estimated). Correct me if that date’s wrong.”

### 2. “Recall” / “Search Memory”
- If missing filters, we answer with the best relevant entries and mention assumptions.  
  “I found three entries tagged ‘gifts’ this year (using the current year). Want a different timeframe?”
- If the query is ambiguous — “What reminders do I have?” → we can list all, sorted by upcoming.
- For recall, we rarely ask clarifying questions unless the user’s past data is massive. Instead, the response surfaces the results plus interactive follow-ups (“Filter by a specific month?”). This keeps the conversation fluid.

### 3. “Update” or “Cancel”
- Require identifiers: either a memory ID (hidden to user but we can show card-like options) or a recent context (“Cancel the reminder you set for Citi last week”). If multiple matches, show options.  
  “I see two Citi reminders: one due Nov 10 and another recurring on the 15th. Which one should I cancel?”

---

## Confidence & Clarification Flow

1. **Entity extraction returns confidence levels** (`high > 0.8`, `medium 0.5-0.8`, `low < 0.5`).
2. **Critical fields** (date/time for reminders; amount/date for transaction memories):
   - High → proceed silently.
   - Medium → confirm inline (“You said next Tuesday, so I’ll use Nov 12 — OK?”) or auto set with an “estimated” flag.
   - Low/missing → ask a follow-up question. The conversation engine should route this as a slot-filling state.
3. **Optional fields** (tags, description) → store as provided; no clarification needed.

---

## Best Practices snapshot

- **For actions** (create/update reminders): ask clarifying questions if uncertain. No “best effort” guessing.
- **For recall**: respond with what we have, explain assumptions, and suggest filters (“Want the last 30 days or a different tag?”).
- **Log clarifications**: the memory service should store a flag (`requires_review`). Later we can surface “memories to confirm” on dashboard.
- **Timezones**: detect user timezone; if missing, ask once and store at the profile level.

---

## Future Enhancements

- **Auto-resolve common phrases** (“next Friday”) using a library like Chrono. If library confidence is low, we fallback to clarification.
- **Learning from corrections**: if the user says “No, I said Nov 13,” we overwrite the memory and boost the extractor for similar phrases.
- **Summary prompts**: when assumptions were made, we can send a quick summary message (“I saved it for Nov 12. Change to a different date?”). Helps the user fix errors without typing.

---

**Bottom line:**  
- **Reminders & “remember” = clarify if uncertain** (safety-first).  
- **Recall/search = answer with best match + transparently note assumptions.**  
- Confidence metadata + slot-filling support make this scalable as we add more memory types.