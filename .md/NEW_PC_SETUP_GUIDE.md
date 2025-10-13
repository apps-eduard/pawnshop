# 🖥️ New PC Setup Guide - Pawnshop System

Complete guide for setting up the pawnshop system on a fresh PC.

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
3. **Git** - [Download](https://git-scm.com/)
4. **Angular CLI** (for web app) - `npm install -g @angular/cli`

---

## ⚡ TL;DR - One Command Setup

If you already have PostgreSQL and Node.js installed:

```powershell
# 1. Create database
psql -U postgres -c "CREATE DATABASE pawnshop_db;"

# 2. Clone and setup
git clone <repo-url>
cd pawnshop/pawn-api
npm install
# Create .env file with your database credentials
npm run setup-db  # This creates all 24 tables + inserts all seed data!
```

**That's it!** Your database is now ready with:
- ✅ 24 tables created
- ✅ 7 demo users (admin, cashiers, manager, appraisers, auctioneer)
- ✅ 27 cities with 301 barangays
- ✅ 66 item descriptions
- ✅ Penalty & service charge configurations

🔄 **Need to start fresh?** Drop the database, create it again, and run `npm run setup-db` - done!

---

## 🚀 Quick Setup (4 Steps)

### Step 1: Clone Repository

```powershell
git clone <your-repo-url>
cd pawnshop
```

### Step 2: Install Dependencies

```powershell
# Install API dependencies
cd pawn-api
npm install

# Install Web dependencies (optional)
cd ../pawn-web
npm install
```

### Step 3: Configure Environment

Create a `.env` file in the `pawn-api/` folder:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=pawnshop_db

# API Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (generate your own)
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=24h
```

### Step 4: Create Database & Run Setup

**4.1. Create Database (using pgAdmin or psql):**

```sql
CREATE DATABASE pawnshop_db;
```

**4.2. Run Automated Setup (ONE COMMAND):**

```powershell
cd pawn-api
npm run setup-db
```

✅ **Done!** This single command will:
- Run all 3 migrations (creates all 24 tables automatically)
- Run all 5 seed files (inserts default data)
- Set up 7 demo user accounts
- Populate 27 cities with 301 barangays
- Add 66 item descriptions (Jewelry & Appliances)
- Configure penalty and service charge settings

🔄 **Fresh Start:** If you delete the database and recreate it, just run `npm run setup-db` again!

---

## 👥 Demo User Accounts (Ready to Use)

After running `npm run setup-db`, you'll have these accounts:

| Username     | Password     | Role       | Branch      |
|--------------|--------------|------------|-------------|
| `admin`      | password123  | Admin      | Main Branch |
| `cashier1`   | password123  | Cashier    | Main Branch |
| `cashier2`   | password123  | Cashier    | BR02 Davao  |
| `manager1`   | password123  | Manager    | Main Branch |
| `appraiser1` | password123  | Appraiser  | Main Branch |
| `appraiser2` | password123  | Appraiser  | BR03 Iloilo |
| `auctioneer1`| password123  | Auctioneer | Main Branch |

⚠️ **Security Note:** Change these passwords in production!

---

## 🗄️ Database Details

### Tables Created (24 Total)

**Admin/Configuration Tables (7):**
- `categories` - Item categories with interest rates
- `loan_rules` - Service charge rules
- `voucher_types` - Payment voucher types
- `branches` - Branch locations (3 branches seeded)
- `cities` - City master data
- `barangays` - Barangay master data
- `descriptions` - Item description templates

**Core Operational Tables (8):**
- `employees` - User accounts (7 demo users seeded)
- `pawners` - Customer information
- `transactions` - Main transaction table (with granted_date & partial payment fields)
- `pawn_tickets` - Ticket information
- `pawn_items` - Pawned item details
- `item_appraisals` - Appraisal workflow
- `audit_logs` - System activity tracking
- `audit_trails` - Transaction history

**Payment & Config Tables (9):**
- `system_config` - System-wide settings
- `transaction_sequences` - Transaction number generators
- `pawn_payments` - Payment transactions
- `penalty_config` - Penalty settings (2% monthly rate seeded)
- `penalty_calculation_log` - Penalty audit trail
- `service_charge_brackets` - Service charge brackets (5 brackets seeded)
- `service_charge_config` - Service charge settings
- `service_charge_calculation_log` - Service charge audit trail
- `branch_sync_log` - Branch synchronization tracking

### Default Data Seeded

✅ **Categories:** Jewelry (3%), Appliances (6%)  
✅ **Branches:** Main (Cebu), BR02 (Davao), BR03 (Iloilo)  
✅ **Loan Rules:** 1% service charge, ₱5 minimum  
✅ **Voucher Types:** CASH, CHEQUE  
✅ **Penalty Config:** 2% monthly rate, grace period settings  
✅ **Service Charge Brackets:** ₱1-199, ₱200-299, ₱300-399, ₱400-499, ₱500+  
✅ **Cities:** 27 Philippine cities (Butuan, Cebu, Davao, Iloilo, Mandaue, Bacolod, Cagayan de Oro, General Santos, Zamboanga, Tacloban, etc.)  
✅ **Barangays:** 301 barangays across all cities (Butuan City: 83, Cebu: 80+, all cities have at least 1)  
✅ **Item Descriptions:** 66 descriptions (25 Jewelry: Gold Ring, Diamond Necklace, etc.; 41 Appliances: Smartphone, Laptop, TV, etc.)  

---

## 🛠️ Useful NPM Commands

### Migration Commands
```powershell
npm run db:migrate              # Apply all pending migrations
npm run db:migrate:make <name>  # Create a new migration file
npm run db:migrate:rollback     # Undo the last migration batch
npm run db:migrate:status       # Check migration status
```

### Seed Commands
```powershell
npm run db:seed                 # Run all seed files
npm run db:seed:make <name>     # Create a new seed file
```

### Combined Commands
```powershell
npm run setup-db                # Fresh setup (migrate + seed)
npm run reset-db                # Reset database (rollback + migrate + seed)
```

### Development Commands
```powershell
# Start API server (in pawn-api folder)
npm start

# Start Angular web app (in pawn-web folder)
ng serve
```

---

## 🔄 Reset Database (If Needed)

If you need to start fresh:

```powershell
cd pawn-api
npm run reset-db
```

This will:
1. Rollback all migrations (drop all tables)
2. Re-run all migrations (recreate tables)
3. Re-run all seeds (reinsert default data)

---

## ✅ Verify Setup

### Check Migration Status
```powershell
npm run db:migrate:status
```

**Expected Output:**
```
Found 3 Completed Migration file/files.
20251007072227_create_admin_settings_tables.js
20251007072721_create_core_pawnshop_tables.js
20251007073726_create_payment_penalty_config_tables.js
No Pending Migration files Found.
```

### Check Database Tables
Use pgAdmin or run:
```powershell
node -e "const knex = require('knex')(require('./knexfile').development); knex.raw('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name').then(result => { console.log('Tables:', result.rows.length); result.rows.forEach(r => console.log('  ✅', r.table_name)); return knex.destroy(); });"
```

Should show 24 tables + 2 Knex tracking tables = **26 tables total**

---

## 🐛 Troubleshooting

### Issue: "Database does not exist"
**Solution:** Create the database first:
```sql
CREATE DATABASE pawnshop_db;
```

### Issue: "Connection refused"
**Solution:** Check if PostgreSQL is running and credentials are correct in `.env`

### Issue: "Migration already exists"
**Solution:** Check status: `npm run db:migrate:status`

### Issue: "Cannot find module 'knex'"
**Solution:** Run `npm install` in pawn-api folder

---

## 📦 Project Structure

```
pawnshop/
├── pawn-api/                   # Backend API (Node.js + Express)
│   ├── .env                    # Environment configuration (create this)
│   ├── knexfile.js            # Knex configuration
│   ├── package.json           # Dependencies & scripts
│   ├── migrations_knex/       # Database migrations (3 files)
│   │   ├── 20251007072227_create_admin_settings_tables.js
│   │   ├── 20251007072721_create_core_pawnshop_tables.js
│   │   └── 20251007073726_create_payment_penalty_config_tables.js
│   ├── seeds/                 # Seed data (5 files)
│   │   ├── 01_admin_settings_seeds.js
│   │   ├── 02_demo_employees.js
│   │   ├── 03_penalty_service_charge_seeds.js
│   │   ├── 04_cities_barangays_seeds.js
│   │   └── 05_item_descriptions_seeds.js
│   └── src/                   # API source code
│
└── pawn-web/                   # Frontend Web App (Angular)
    ├── src/
    ├── angular.json
    └── package.json
```

---

## 🎯 Next Steps After Setup

1. **Test Login:** Use `admin` / `password123`
2. **Start API:** `cd pawn-api && npm start`
3. **Start Web:** `cd pawn-web && ng serve`
4. **Access App:** Open browser to `http://localhost:4200`
5. **Change Passwords:** Update demo account passwords
6. **Add Real Data:** Add actual branches, employees, customers

---

## 📚 Additional Documentation

- **KNEX_MIGRATION_COMPLETE.md** - Complete migration system documentation
- **BUSINESS_RULES_AND_CALCULATIONS.md** - Business logic documentation
- **DATABASE_SCHEMA_DOCUMENTATION.md** - Database schema details
- **API_DOCUMENTATION.md** - API endpoints documentation (if exists)

---

## 🔐 Security Reminders

Before going to production:

- [ ] Change all demo account passwords
- [ ] Generate strong JWT_SECRET in .env
- [ ] Update database credentials
- [ ] Enable SSL for database connections
- [ ] Set NODE_ENV=production
- [ ] Review and restrict CORS settings
- [ ] Enable rate limiting
- [ ] Set up regular database backups

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review error messages in terminal
3. Check PostgreSQL logs
4. Verify .env configuration
5. Ensure all prerequisites are installed

---

**Setup Time:** ~5-10 minutes  
**Difficulty:** Easy ⭐⭐☆☆☆  
**Last Updated:** October 7, 2025

✅ **Ready to go!** Your pawnshop system is now fully set up and ready for development or production use.
