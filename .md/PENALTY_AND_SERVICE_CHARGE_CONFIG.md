# Penalty and Service Charge Configuration

This document describes the default penalty and service charge configurations that are automatically seeded during database setup.

## 📅 Last Updated
October 5, 2025

## 🔢 Penalty Configuration

### Default Settings

The following penalty settings are automatically seeded in the `penalty_config` table:

| Config Key | Value | Description |
|------------|-------|-------------|
| `monthly_penalty_rate` | 0.02 | Monthly penalty rate (2%) |
| `daily_penalty_threshold_days` | 3 | Days threshold for penalty calculation (< 3 days = daily, ≥ 3 days = monthly) |
| `grace_period_days` | 0 | Grace period before penalty starts (no grace period) |
| `penalty_compounding` | 0 | Whether penalty compounds (0 = no, 1 = yes) |
| `max_penalty_multiplier` | 12 | Maximum penalty multiplier (12 months worth) |

### Penalty Calculation Rules

1. **If overdue < 3 days:**
   - Penalty = Principal × (2% ÷ 30) × Days Overdue
   - Example: ₱10,000 principal, 2 days overdue = ₱10,000 × 0.00067 × 2 = ₱13.33

2. **If overdue ≥ 3 days:**
   - Penalty = Principal × 2% × Months Overdue
   - Example: ₱10,000 principal, 45 days overdue = ₱10,000 × 0.02 × 1.5 = ₱300

3. **Maximum Penalty:**
   - Capped at 12 months worth of penalty (24% of principal)

### Related Tables

- `penalty_config` - Stores penalty configuration settings
- `penalty_calculation_log` - Logs all penalty calculations with snapshots

## 💰 Service Charge Configuration

### Default Brackets

The following service charge brackets are automatically seeded in the `service_charge_brackets` table:

| Bracket Name | Min Amount | Max Amount | Service Charge | Display Order |
|--------------|------------|------------|----------------|---------------|
| Bracket 1-100 | ₱1 | ₱100 | ₱1 | 1 |
| Bracket 101-200 | ₱101 | ₱200 | ₱2 | 2 |
| Bracket 201-300 | ₱201 | ₱300 | ₱3 | 3 |
| Bracket 301-400 | ₱301 | ₱400 | ₱4 | 4 |
| Bracket 500+ | ₱500 | No Limit | ₱5 | 5 |

### Default Settings

The following general settings are seeded in the `service_charge_config` table:

| Config Key | Value | Description |
|------------|-------|-------------|
| `calculation_method` | 1 | Calculation method (1=bracket-based, 2=percentage, 3=fixed) |
| `percentage_rate` | 0.01 | Percentage rate for percentage-based (1%) |
| `fixed_amount` | 50 | Fixed service charge amount |
| `minimum_service_charge` | 1 | Minimum service charge |
| `maximum_service_charge` | 1000 | Maximum service charge |

### Service Charge Calculation

Currently using **bracket-based** calculation:
- System finds the bracket where the principal amount falls
- Returns the fixed service charge for that bracket
- Falls back to default brackets if dynamic config fails

**Example:**
- Principal: ₱150 → Falls in Bracket 101-200 → Service Charge: ₱2
- Principal: ₱350 → Falls in Bracket 301-400 → Service Charge: ₱4
- Principal: ₱800 → Falls in Bracket 500+ → Service Charge: ₱5

### Related Tables

- `service_charge_brackets` - Stores service charge brackets
- `service_charge_config` - Stores general service charge settings
- `service_charge_calculation_log` - Logs all service charge calculations

## 🔧 How to Modify

### Modifying Penalty Configuration

1. **Via SQL:**
```sql
UPDATE penalty_config 
SET config_value = 0.025, updated_by = <employee_id>, updated_at = CURRENT_TIMESTAMP
WHERE config_key = 'monthly_penalty_rate';
```

2. **Via API (future):**
   - Admin panel will allow dynamic configuration updates
   - Changes will be logged with effective dates

### Modifying Service Charge Brackets

1. **Via SQL:**
```sql
-- Add a new bracket
INSERT INTO service_charge_brackets 
(bracket_name, min_amount, max_amount, service_charge, display_order, created_by, updated_by)
VALUES ('Bracket 401-500', 401, 500, 4.5, 5, 1, 1);

-- Update existing bracket
UPDATE service_charge_brackets 
SET service_charge = 2.5, updated_by = <employee_id>, updated_at = CURRENT_TIMESTAMP
WHERE bracket_name = 'Bracket 101-200';
```

2. **Via API (future):**
   - Admin panel will allow bracket management
   - Changes will be tracked with effective dates

## 📊 Tracking and Audit

### Penalty Calculation Log
Every penalty calculation is logged in `penalty_calculation_log`:
- Transaction ID
- Calculation date
- Principal amount
- Days overdue
- Penalty rate used
- Penalty amount
- Calculation method (daily/monthly)
- Config snapshot (JSON) - preserves the config used
- Calculated by (employee ID)

### Service Charge Calculation Log
Every service charge calculation is logged in `service_charge_calculation_log`:
- Transaction ID
- Calculation date
- Principal amount
- Bracket used
- Service charge amount
- Calculation method
- Config snapshot (JSON)
- Calculated by (employee ID)

## 🚀 Setup Process

When you run `setup.ps1` or `npm run setup-db`, the system:

1. Creates all database tables
2. Seeds admin settings and categories
3. **Seeds penalty configuration** (Step 3 in migration)
4. **Seeds service charge configuration** (Step 4 in migration)
5. Seeds cities and barangays
6. Seeds item descriptions
7. Verifies all tables and data

## 📝 Notes

- All configuration changes should be done through the admin panel (when available)
- Direct SQL updates should include `updated_by` and `updated_at` fields
- Historical configurations are preserved through effective dates
- Calculation logs provide full audit trail for compliance
- Config snapshots in logs ensure reproducibility of calculations

## 🔗 Related Files

- `create-penalty-config.sql` - Penalty tables and seed data
- `create-service-charge-config.sql` - Service charge tables and seed data
- `run-comprehensive-migration.js` - Runs all migrations including config seeding
- `verify-complete-setup.js` - Verifies penalty and service charge tables exist
- `PenaltyCalculatorService` (Angular) - Frontend penalty calculation
- `/api/service-charge-config/calculate` - Backend service charge calculation

## 📞 Support

If you need to modify penalty or service charge configurations:
1. Check current values in database
2. Test calculations with new values
3. Update via SQL or admin panel
4. Verify calculations work correctly
5. Monitor calculation logs for accuracy
