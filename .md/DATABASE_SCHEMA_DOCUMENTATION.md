# Complete Database Schema Documentation

## Overview
This document describes the complete database schema for the Pawnshop Management System, including all tables, relationships, and seeding requirements.

## Setup Process

When running `setup.ps1` on a fresh PC, the following happens:

### 1. Migration Scripts (run-comprehensive-migration.js)
- Creates all database tables from SQL files
- Runs in this order:
  1. `migrations/admin_settings.sql` - Admin and base tables
  2. `migrations/pawn_shop_core_tables.sql` - Core business tables
  3. `create-penalty-config.sql` - Penalty configuration tables
  4. `create-service-charge-config.sql` - Service charge configuration tables

### 2. Seeding Scripts
- `seed-visayas-mindanao-cities-barangays.js` - Philippine locations
- `seed-item-descriptions.js` - Item category descriptions

### 3. Verification (verify-complete-setup.js)
- Checks all required tables exist
- Validates seed data counts
- Verifies demo user accounts

## Database Tables

### Admin & Configuration Tables (admin_settings.sql)

#### 1. categories
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(100) UNIQUE) - "Jewelry", "Appliances", etc.
- description (TEXT)
- interest_rate (DECIMAL(5,2)) - Monthly interest rate
- is_active (BOOLEAN)
- created_at, updated_at

Seeded: 2 default categories (Jewelry: 3%, Appliances: 6%)
```

#### 2. loan_rules
```sql
- id (SERIAL PRIMARY KEY)
- service_charge_rate (DECIMAL(5,4)) - Default 1%
- minimum_service_charge (DECIMAL(10,2)) - Default ₱5
- minimum_loan_for_service (DECIMAL(12,2)) - Default ₱500
- created_at, updated_at

Seeded: 1 default rule
```

#### 3. voucher_types
```sql
- id (SERIAL PRIMARY KEY)
- code (VARCHAR(20) UNIQUE)
- type (VARCHAR(50)) - 'cash', 'cheque'
- description (TEXT)
- is_active (BOOLEAN)
- created_at, updated_at

Seeded: 2 types (CASH, CHEQUE)
```

#### 4. branches
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(100))
- code (VARCHAR(20) UNIQUE)
- address (TEXT)
- phone (VARCHAR(20))
- email (VARCHAR(100))
- manager_name (VARCHAR(100))
- is_active (BOOLEAN)
- created_at, updated_at

Seeded: 3 branches (Main, Branch 2, Branch 3)
```

#### 5. cities
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(100))
- province (VARCHAR(100))
- region (VARCHAR(100))
- is_active (BOOLEAN)
- created_at, updated_at
- UNIQUE(name, province)

Seeded: Philippine cities from seed script
```

#### 6. barangays
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(100))
- city_id (FK to cities)
- is_active (BOOLEAN)
- created_at, updated_at
- UNIQUE(name, city_id)

Seeded: Philippine barangays from seed script
```

#### 7. descriptions
```sql
- id (SERIAL PRIMARY KEY)
- category_id (FK to categories)
- name (VARCHAR(255))
- description (TEXT)
- notes (TEXT)
- is_active (BOOLEAN)
- created_at, updated_at

Seeded: Item descriptions from seed script
```

#### 8. employees
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER UNIQUE)
- username (VARCHAR(50) UNIQUE)
- email (VARCHAR(100) UNIQUE)
- password_hash (VARCHAR(255))
- first_name (VARCHAR(50))
- last_name (VARCHAR(50))
- role (VARCHAR(20)) CHECK: administrator, manager, cashier, auctioneer, appraiser, pawner
- branch_id (FK to branches)
- position (VARCHAR(50))
- contact_number (VARCHAR(20))
- address (TEXT)
- is_active (BOOLEAN)
- created_at, updated_at

Seeded: 6 demo accounts
  - admin / admin123 (administrator)
  - cashier1 / cashier123 (cashier)
  - manager1 / manager123 (manager)
  - auctioneer1 / auctioneer123 (auctioneer)
  - appraiser1 / appraiser123 (appraiser)
  - pawner1 / pawner123 (pawner)
```

#### 9. audit_logs
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER)
- username (VARCHAR(50))
- action (VARCHAR(100))
- table_name (VARCHAR(50))
- record_id (INTEGER)
- old_values (JSONB)
- new_values (JSONB)
- ip_address (INET)
- user_agent (TEXT)
- created_at

Used by: All transaction and user operations
```

#### 10. audit_trails
```sql
- id (SERIAL PRIMARY KEY)
- transaction_id (INTEGER)
- loan_number (VARCHAR(20))
- user_id (INTEGER)
- username (VARCHAR(50))
- action_type (VARCHAR(50))
- description (TEXT)
- old_data (JSONB)
- new_data (JSONB)
- amount (DECIMAL(15,2))
- status_before (VARCHAR(20))
- status_after (VARCHAR(20))
- branch_id (FK to branches)
- ip_address (INET)
- created_at
- created_by (FK to employees)

Used by: Transaction tracking and compliance
```

### Core Business Tables (pawn_shop_core_tables.sql)

#### 11. system_config
```sql
- id (SERIAL PRIMARY KEY)
- config_key (VARCHAR(100) UNIQUE)
- config_value (TEXT)
- description (TEXT)
- data_type (VARCHAR(20)) - string, number, boolean, json
- is_editable (BOOLEAN)
- created_at, updated_at

Seeded: 10 default configurations (company name, rates, limits, etc.)
```

#### 12. transaction_sequences
```sql
- id (SERIAL PRIMARY KEY)
- branch_id (FK to branches)
- sequence_type (VARCHAR(50)) - LOAN, PAYMENT, TICKET, APPRAISAL
- current_number (INTEGER)
- prefix (VARCHAR(10))
- suffix (VARCHAR(10))
- year (INTEGER)
- month (INTEGER)
- reset_frequency (VARCHAR(20)) - daily, monthly, yearly, never
- last_reset_date (DATE)
- created_at
- UNIQUE(branch_id, sequence_type, year, month)

Seeded: Sequences for all 3 branches (LOAN, PAYMENT, TICKET, APPRAISAL)
```

#### 13. pawners (customers)
```sql
- id (SERIAL PRIMARY KEY)
- customer_code (VARCHAR(20) UNIQUE)
- first_name, middle_name, last_name, suffix
- birth_date, gender, civil_status, nationality
- mobile_number, email
- house_number, street
- barangay_id (FK), city_id (FK), province, postal_code
- id_type, id_number, id_expiry_date
- occupation, monthly_income
- emergency_contact_name, emergency_contact_number, emergency_contact_relationship
- is_active, is_blacklisted, blacklist_reason, notes
- photo_url, signature_url
- branch_id (FK)
- created_by, updated_by (FK to employees)
- created_at, updated_at
```

#### 14. transactions
```sql
- id (SERIAL PRIMARY KEY)
- transaction_number (VARCHAR(50) UNIQUE) - System generated
- loan_number (VARCHAR(50) UNIQUE)
- pawner_id (FK to pawners)
- branch_id (FK to branches)
- transaction_type CHECK: new_loan, renewal, partial_payment, full_payment, auction, redemption
- status CHECK: active, renewed, redeemed, expired, auctioned, cancelled
- principal_amount (DECIMAL(15,2))
- interest_rate (DECIMAL(5,4)) - Monthly rate (0.03 = 3%)
- interest_amount, penalty_rate, penalty_amount
- service_charge, other_charges, total_amount
- amount_paid, balance
- transaction_date, maturity_date, expiry_date, last_payment_date
- parent_transaction_id (FK to transactions) - For renewals
- is_active, is_expired, days_overdue
- notes, terms_conditions
- created_by, updated_by, approved_by (FK to employees)
- created_at, updated_at

IMPORTANT: This is the main transaction table
Used by: All loan operations (new loan, redeem, renew, partial, additional)
```

#### 15. pawn_tickets
```sql
- id (SERIAL PRIMARY KEY)
- transaction_id (FK to transactions)
- ticket_number (VARCHAR(50) UNIQUE)
- status CHECK: active, redeemed, renewed, expired, cancelled
- print_count (INTEGER)
- last_printed_at
- printed_by (FK to employees)
- ticket_data (JSONB)
- created_at, updated_at

IMPORTANT COLUMNS:
  - id: Primary key
  - transaction_id: Links to transactions table
  - ticket_number: Unique ticket identifier
  - status: Current ticket status
  - print_count, last_printed_at, printed_by: Printing tracking
  - ticket_data: JSONB for flexible data storage
  - created_at, updated_at: Timestamps

USED BY: Redeem, renew, partial payment operations
SCHEMA NOTE: Only these 10 columns exist. Do NOT use:
  - notes (doesn't exist)
  - redeemed_date (doesn't exist)
  - redeem_amount (doesn't exist)
  - redeemed_by (doesn't exist)
```

#### 16. pawn_items
```sql
- id (SERIAL PRIMARY KEY)
- transaction_id (FK to transactions)
- category_id (FK to categories)
- description_id (FK to descriptions)
- custom_description (TEXT) - Also called appraisal_notes
- brand, model, serial_number, color, size_dimensions, weight
- karat, metal_type, stone_type, stone_count (jewelry specific)
- item_condition CHECK: excellent, very_good, good, fair, poor
- defects, accessories
- appraised_value (DECIMAL(15,2))
- loan_amount (DECIMAL(15,2))
- appraisal_notes (TEXT)
- status CHECK: in_vault, redeemed, sold, auctioned, damaged, lost
- location
- photo_urls (TEXT[])
- appraised_by (FK to employees)
- created_at, updated_at

IMPORTANT FIELD MAPPINGS:
  - descriptionName: description_id → descriptions.name
  - appraisalNotes: custom_description OR appraisal_notes
```

#### 17. item_appraisals
```sql
- id (SERIAL PRIMARY KEY)
- pawner_id (FK to pawners)
- appraiser_id (FK to employees)
- category (VARCHAR(100))
- description (TEXT)
- notes (TEXT)
- estimated_value (DECIMAL(15,2))
- status (VARCHAR(20))
- created_at, updated_at

Used by: Appraiser workflow for quick appraisals
```

#### 18. pawn_payments
```sql
- id (SERIAL PRIMARY KEY)
- transaction_id (FK to transactions)
- payment_number (VARCHAR(50) UNIQUE)
- payment_type CHECK: interest, partial_redemption, full_redemption, penalty, service_charge
- payment_method CHECK: cash, check, bank_transfer, gcash, paymaya, credit_card
- amount (DECIMAL(15,2))
- principal_payment, interest_payment, penalty_payment, service_charge_payment
- period_from, period_to
- reference_number, bank_name
- receipt_number, receipt_printed, receipt_printed_at
- status CHECK: pending, completed, cancelled, refunded
- notes
- branch_id (FK to branches)
- received_by, approved_by (FK to employees)
- created_at, updated_at

Used by: Payment tracking and history
```

#### 19. branch_sync_log
```sql
- id (SERIAL PRIMARY KEY)
- source_branch_id, target_branch_id (FK to branches)
- sync_type, table_name, operation
- record_id, record_data (JSONB)
- status CHECK: pending, success, failed, skipped
- error_message, retry_count
- sync_started_at, sync_completed_at
- sync_batch_id, priority
- created_at

Used by: Multi-branch synchronization
```

### Dynamic Configuration Tables (create-penalty-config.sql)

#### 20. penalty_config
```sql
- id (SERIAL PRIMARY KEY)
- config_key (VARCHAR(100) UNIQUE)
- config_value (NUMERIC)
- description (TEXT)
- is_active (BOOLEAN)
- effective_date (DATE)
- created_by, updated_by (FK to employees)
- created_at, updated_at

Seeded configurations:
  - monthly_penalty_rate: 0.02 (2%)
  - daily_penalty_threshold_days: 3
  - grace_period_days: 0
  - penalty_compounding: 0
  - max_penalty_multiplier: 12

Used by: PenaltyCalculatorService
```

#### 21. penalty_calculation_log
```sql
- id (SERIAL PRIMARY KEY)
- transaction_id (FK to transactions)
- calculation_date (DATE)
- principal_amount (NUMERIC)
- days_overdue (INTEGER)
- penalty_rate (NUMERIC)
- penalty_amount (NUMERIC)
- calculation_method (VARCHAR(50)) - 'daily' or 'monthly'
- config_snapshot (JSONB)
- calculated_by (FK to employees)
- created_at

Used by: Audit trail for penalty calculations
```

### Dynamic Configuration Tables (create-service-charge-config.sql)

#### 22. service_charge_brackets
```sql
- id (SERIAL PRIMARY KEY)
- bracket_name (VARCHAR(100))
- min_amount (NUMERIC)
- max_amount (NUMERIC) - NULL = no upper limit
- service_charge (NUMERIC)
- is_active (BOOLEAN)
- display_order (INTEGER)
- effective_date (DATE)
- created_by, updated_by (FK to employees)
- created_at, updated_at
- UNIQUE(min_amount, max_amount)

Seeded brackets:
  - 1-100: ₱1
  - 101-200: ₱2
  - 201-300: ₱3
  - 301-400: ₱4
  - 500+: ₱5

Used by: Dynamic service charge calculation API
Fallback in frontend:
  - ≤500: ₱10
  - ≤1000: ₱15
  - ≤5000: ₱20
  - ≤10000: ₱30
  - ≤20000: ₱40
  - >20000: ₱50
```

#### 23. service_charge_config
```sql
- id (SERIAL PRIMARY KEY)
- config_key (VARCHAR(100) UNIQUE)
- config_value (NUMERIC)
- description (TEXT)
- is_active (BOOLEAN)
- effective_date (DATE)
- created_by, updated_by (FK to employees)
- created_at, updated_at

Seeded configurations:
  - calculation_method: 1 (bracket-based)
  - percentage_rate: 0.01 (1%)
  - fixed_amount: 50
  - minimum_service_charge: 1
  - maximum_service_charge: 1000

Used by: Service charge API configuration
```

#### 24. service_charge_calculation_log
```sql
- id (SERIAL PRIMARY KEY)
- transaction_id (FK to transactions)
- calculation_date (DATE)
- loan_amount (NUMERIC)
- service_charge (NUMERIC)
- calculation_method (VARCHAR(50))
- bracket_id (FK to service_charge_brackets) - If bracket-based
- config_snapshot (JSONB)
- calculated_by (FK to employees)
- created_at

Used by: Audit trail for service charge calculations
```

## Key Relationships

```
branches (1) → (N) employees
branches (1) → (N) pawners
branches (1) → (N) transactions

pawners (1) → (N) transactions
pawners (1) → (N) item_appraisals

transactions (1) → (N) pawn_items
transactions (1) → (N) pawn_payments
transactions (1) → (1) pawn_tickets

categories (1) → (N) pawn_items
categories (1) → (N) descriptions
descriptions (1) → (N) pawn_items

cities (1) → (N) barangays
cities (1) → (N) pawners
barangays (1) → (N) pawners

employees (1) → (N) audit_logs
employees (1) → (N) audit_trails
```

## Critical Schema Notes for Developers

### 1. Transactions Table
- Use `id` (integer) for API calls, NOT `transaction_number` (string)
- `status` field values: active, renewed, redeemed, expired, auctioned, cancelled
- `transaction_type` field values: new_loan, renewal, partial_payment, full_payment, auction, redemption

### 2. Pawn Tickets Table
**ONLY THESE COLUMNS EXIST:**
- id, transaction_id, ticket_number, status
- print_count, last_printed_at, printed_by
- ticket_data, created_at, updated_at

**DO NOT USE (they don't exist):**
- notes, redeemed_date, redeem_amount, redeemed_by

### 3. Pawn Items Table
**Field Mappings for Frontend:**
- `description` → Use description_id to join with descriptions.name
- `descriptionName` → descriptions.name (from join)
- `appraisalNotes` → custom_description OR appraisal_notes

### 4. Interest Rate Storage
- Stored as decimal: 0.03 = 3%, 0.035 = 3.5%
- Display as percentage: multiply by 100

### 5. Penalty Calculation
- Grace period: 0-3 days use daily penalty
- 4+ days use full month penalty
- Monthly penalty rate: 2% (0.02)
- Calculation: See PenaltyCalculatorService

## Verification Checklist

After running `setup.ps1`:

- [ ] All 24 tables created
- [ ] At least 2 categories seeded
- [ ] At least 3 branches seeded
- [ ] 6 demo user accounts created
- [ ] At least 10 cities seeded
- [ ] At least 10 barangays seeded
- [ ] At least 5 item descriptions seeded
- [ ] At least 3 penalty config entries
- [ ] At least 3 service charge brackets
- [ ] All indexes created
- [ ] All foreign key constraints in place

## Common Setup Issues

### Issue 1: Missing Tables
**Solution:** Run `npm run setup-db` in pawn-api folder

### Issue 2: Empty Seed Data
**Solution:** Check seed scripts ran successfully
```bash
cd pawn-api
node seed-visayas-mindanao-cities-barangays.js
node seed-item-descriptions.js
```

### Issue 3: Demo Accounts Not Working
**Solution:** Verify employees table has 6 users
```sql
SELECT username, role FROM employees;
```

### Issue 4: Foreign Key Violations
**Solution:** Check table creation order in migration scripts

## Backup and Restore

### Backup
```bash
pg_dump -U postgres -d pawnshop_db > backup.sql
```

### Restore
```bash
psql -U postgres -d pawnshop_db < backup.sql
```

## Environment Configuration

Required in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pawnshop_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
PORT=3000
```

## Migration History

- v1.0: Initial schema (admin_settings.sql, pawn_shop_core_tables.sql)
- v1.1: Added penalty_config and service_charge tables
- v1.2: Fixed pawn_tickets schema (removed non-existent columns)
- v1.3: Added comprehensive verification script

## Support

For setup issues, check:
1. PostgreSQL service is running
2. Database credentials in .env are correct
3. Node.js version >= 18.0.0
4. All npm packages installed

Run verification: `npm run verify-tables`
