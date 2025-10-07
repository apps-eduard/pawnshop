# 🔄 Quick Database Reset Guide

## When to Use This

Use this guide when you need to:
- Start fresh with a clean database
- Reset after testing/development
- Fix corrupted data
- Deploy to a new environment

---

## ⚡ ONE-COMMAND RESET

### Option 1: Using Existing Database

If the database already exists:

```powershell
cd pawn-api
npm run reset-db
```

This will:
1. ✅ Rollback all migrations (drops all 24 tables)
2. ✅ Re-run all migrations (recreates all tables)
3. ✅ Re-run all seeds (reinserts all default data)

---

### Option 2: Fresh Database (Delete & Recreate)

If you want to completely delete and recreate the database:

**Step 1: Drop and Create Database**

```powershell
# Using psql
psql -U postgres -c "DROP DATABASE IF EXISTS pawnshop_db;"
psql -U postgres -c "CREATE DATABASE pawnshop_db;"
```

**Step 2: Run Setup**

```powershell
cd pawn-api
npm run setup-db
```

---

## 📊 What Gets Created

After running `npm run setup-db` or `npm run reset-db`, you'll have:

### Database Structure
- ✅ **24 tables** (admin, core, payment/config)
- ✅ **2 Knex tracking tables** (knex_migrations, knex_migrations_lock)

### Default Data
- ✅ **7 Demo Users:**
  - admin / password123
  - cashier1 / password123
  - cashier2 / password123
  - manager1 / password123
  - appraiser1 / password123
  - appraiser2 / password123
  - auctioneer1 / password123

- ✅ **27 Cities** (Butuan, Cebu, Davao, Iloilo, Mandaue, etc.)
- ✅ **301 Barangays** (Butuan City: 83 barangays, others distributed)
- ✅ **66 Item Descriptions:**
  - 25 Jewelry items (Gold Ring, Diamond Necklace, etc.)
  - 41 Appliances (Smartphone, Laptop, TV, etc.)

- ✅ **3 Branches:**
  - Main Branch (Cebu)
  - BR02 (Davao)
  - BR03 (Iloilo)

- ✅ **2 Categories:**
  - Jewelry (3% interest)
  - Appliances (6% interest)

- ✅ **Penalty Config:** 2% monthly rate
- ✅ **Service Charge Config:** 5 brackets (₱1-199 up to ₱500+)

---

## 🎯 Quick Commands Reference

```powershell
# Check if migrations are applied
npm run db:migrate:status

# Apply pending migrations only
npm run db:migrate

# Rollback last batch
npm run db:migrate:rollback

# Run seeds only (no migration)
npm run db:seed

# Full setup (migrations + seeds)
npm run setup-db

# Full reset (rollback + migrate + seed)
npm run reset-db
```

---

## ✅ Verify Setup

After running setup/reset, verify everything is correct:

```powershell
# Check migration status
npm run db:migrate:status

# Count tables (should show 26 total)
node -e "const knex = require('knex')(require('./knexfile').development); knex.raw('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\'').then(r => { console.log('Total tables:', r.rows[0].count); return knex.destroy(); });"

# Check demo users (should show 7)
node -e "const knex = require('knex')(require('./knexfile').development); knex('employees').count().then(r => { console.log('Demo users:', r[0].count); return knex.destroy(); });"

# Check cities (should show 27)
node -e "const knex = require('knex')(require('./knexfile').development); knex('cities').count().then(r => { console.log('Cities:', r[0].count); return knex.destroy(); });"

# Check barangays (should show 301)
node -e "const knex = require('knex')(require('./knexfile').development); knex('barangays').count().then(r => { console.log('Barangays:', r[0].count); return knex.destroy(); });"

# Check descriptions (should show 66)
node -e "const knex = require('knex')(require('./knexfile').development); knex('descriptions').count().then(r => { console.log('Descriptions:', r[0].count); return knex.destroy(); });"
```

---

## 🚨 Troubleshooting

### Issue: "Migration table already exists"
**Solution:**
```powershell
# Manually drop the tracking tables
psql -U postgres -d pawnshop_db -c "DROP TABLE IF EXISTS knex_migrations, knex_migrations_lock CASCADE;"
# Then run setup again
npm run setup-db
```

### Issue: "Seed data already exists"
**Solution:** Seeds are designed to check and skip existing data. If you want fresh data:
```powershell
npm run reset-db  # This rolls back and reinserts everything
```

### Issue: "Cannot connect to database"
**Solution:** Check your `.env` file and ensure PostgreSQL is running

---

## ⚠️ Production Warning

**Never run these commands on production databases!**

These commands will **DELETE ALL DATA**:
- `npm run reset-db`
- `npm run db:migrate:rollback`

For production:
- Only run `npm run db:migrate` (applies new migrations)
- Never rollback unless absolutely necessary
- Always backup before any migration

---

## 📝 Summary

**Most Common Use Case:**

```powershell
# Delete database and start completely fresh
psql -U postgres -c "DROP DATABASE IF EXISTS pawnshop_db;"
psql -U postgres -c "CREATE DATABASE pawnshop_db;"
cd pawn-api
npm run setup-db
```

**Time Required:** ~10-15 seconds  
**Result:** Fully functional database with all demo data ready to use!

---

**Last Updated:** October 7, 2025
