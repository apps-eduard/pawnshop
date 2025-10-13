# Knex Migration Implementation Guide

## ✅ Completed

### Migration 1: Admin Settings Tables
**File**: `20251007072227_create_admin_settings_tables.js`

**Tables Created**:
1. ✅ categories
2. ✅ loan_rules
3. ✅ voucher_types
4. ✅ branches
5. ✅ cities
6. ✅ barangays
7. ✅ descriptions

**Seed**: `01_admin_settings_seeds.js`
- Default categories (Jewelry, Appliances)
- Default loan rules
- Default voucher types (CASH, CHEQUE)
- 3 branches (Main, BR02, BR03)

## 🚧 In Progress

### Migration 2: Core Pawnshop Tables
**File**: `20251007072721_create_core_pawnshop_tables.js`

**Tables to Create**:
1. ⏳ employees (required by other tables)
2. ⏳ pawners (customers)
3. ⏳ transactions (main table with granted_date + partial payment fields)
4. ⏳ pawn_tickets
5. ⏳ pawn_items
6. ⏳ item_appraisals
7. ⏳ pawn_payments
8. ⏳ audit_logs
9. ⏳ audit_trails
10. ⏳ system_config
11. ⏳ transaction_sequences

## 📋 Migration Scripts Added to package.json

```json
"db:migrate": "knex migrate:latest",
"db:migrate:make": "knex migrate:make",
"db:migrate:rollback": "knex migrate:rollback",
"db:migrate:status": "knex migrate:status",
"db:seed": "knex seed:run",
"db:seed:make": "knex seed:make",
"setup-db": "npm run db:migrate && npm run db:seed"
```

## 🎯 Next Steps

1. Complete Migration 2 (core tables)
2. Create seed file for demo employees
3. Create seed file for penalty config
4. Create seed file for service charge config
5. Create seed files for cities/barangays data
6. Create seed file for item descriptions
7. Update setup.ps1 to use Knex commands
8. Clean up old migration files
9. Document new workflow
10. Test complete setup on fresh database

## 📝 Usage

### Fresh Setup
```bash
npm run db:migrate  # Create all tables
npm run db:seed     # Insert default data
```

### Create New Migration
```bash
npm run db:migrate:make migration_name
```

### Check Status
```bash
npm run db:migrate:status
```

### Rollback Last Migration
```bash
npm run db:migrate:rollback
```

## 🗂️ File Structure

```
pawn-api/
├── knexfile.js                    # Knex configuration
├── migrations_knex/               # New Knex migrations
│   ├── 20251007072227_create_admin_settings_tables.js
│   └── 20251007072721_create_core_pawnshop_tables.js
├── seeds/                         # Seed files
│   └── 01_admin_settings_seeds.js
└── migrations/                    # OLD SQL files (to be archived)
    ├── admin_settings.sql
    └── pawn_shop_core_tables.sql
```
