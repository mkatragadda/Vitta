# Database Fields Mapping Reference

## Complete List of Database Fields

### Table: `user_credit_cards`

Based on the schema analysis, here are all queryable fields:

#### Identity Fields
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `catalog_id` (UUID, nullable) - Foreign key to card_catalog
- `card_name` (TEXT) - Official card name
- `nickname` (TEXT, nullable) - User-friendly name
- `card_type` (TEXT, nullable) - Legacy field (often stores card_network)
- `issuer` (TEXT) - Card issuer (Chase, Citi, American Express, etc.)
- `card_network` (TEXT) - Network type (Visa, Mastercard, Amex, Discover)

#### Financial Fields
- `apr` (NUMERIC) - Annual Percentage Rate
- `credit_limit` (NUMERIC) - Total credit limit
- `current_balance` (NUMERIC) - Current outstanding balance
- `amount_to_pay` (NUMERIC) - Planned payment amount
- `annual_fee` (NUMERIC) - Annual fee in dollars

#### Reward Fields
- `reward_structure` (JSONB) - Reward multipliers by category

#### Date/Time Fields
- `statement_close_day` (INTEGER) - Day of month statement closes (1-31)
- `payment_due_day` (INTEGER) - Day of month payment is due (1-31)
- `grace_period_days` (INTEGER) - Grace period in days
- `payment_due_date` (DATE, nullable) - Next payment due date
- `statement_cycle_start` (DATE, nullable) - Current statement cycle start
- `statement_cycle_end` (DATE, nullable) - Current statement cycle end
- `due_date` (DATE) - DEPRECATED, use payment_due_day instead

#### Metadata Fields
- `is_manual_entry` (BOOLEAN) - TRUE if manually entered
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

#### Computed Fields (not in DB, but queryable)
- `utilization` - Calculated as (current_balance / credit_limit) * 100
- `available_credit` - Calculated as credit_limit - current_balance
- `days_until_due` - Calculated days until payment due date
- `days_until_statement_close` - Calculated days until statement closes

## Natural Language → Database Field Mapping

### Current FIELD_MAP Coverage

#### Identity Fields
| Natural Language | Database Field |
|-----------------|----------------|
| issuer, issuers, bank, banks | `issuer` |
| network, networks, card_network | `card_network` |
| type, types, card_type | `card_type` |
| card_name, name | `card_name` |
| nickname | `nickname` |

#### Financial Fields
| Natural Language | Database Field |
|-----------------|----------------|
| balance, balances, debt, owed | `current_balance` |
| apr, interest_rate, rate | `apr` |
| credit_limit, limit | `credit_limit` |
| annual_fee, fee | `annual_fee` |
| amount_to_pay, payment_amount | `amount_to_pay` |

#### Date Fields
| Natural Language | Database Field |
|-----------------|----------------|
| due_date, payment_due, due | `due_date` / `payment_due_day` |
| statement_close, statement_end | `statement_cycle_end` |
| statement_start | `statement_cycle_start` |
| grace_period, grace | `grace_period_days` |

#### Computed Fields
| Natural Language | Database Field |
|-----------------|----------------|
| utilization, usage | `utilization` (computed) |
| available, available_credit | `available_credit` (computed) |

## extractAttribute Coverage

Current patterns in `extractAttribute`:
- ✅ apr / interest / rate → `apr`
- ✅ balance / debt / owe → `balance`
- ✅ due date / payment date → `due_date`
- ✅ credit limit / limit → `credit_limit`
- ✅ available / can spend → `available_credit`
- ✅ utilization / usage → `utilization`
- ✅ rewards / points / cashback → `rewards`
- ✅ payment amount / how much pay → `payment_amount`

### Missing Fields to Add:
- ❌ annual_fee / fee
- ❌ statement_close / statement_end
- ❌ statement_start
- ❌ grace_period / grace
- ❌ card_name / name
- ❌ nickname
- ❌ issuer / bank (should be handled via distinct queries)
- ❌ card_network / network (should be handled via distinct queries)
- ❌ card_type

## Test Coverage Requirements

For each field, we need tests for:
1. **Natural language extraction** - Can extractAttribute detect it?
2. **Field mapping** - Does FIELD_MAP correctly map to DB field?
3. **Query building** - Can QueryBuilder filter/aggregate by this field?
4. **End-to-end query** - Can a natural language query successfully retrieve results?

