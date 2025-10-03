# � Pawnshop Management System - Quick Setup

## 🚀 One-Command Setup (New & Improved!)

This repository includes **fully automated setup scripts** that will:
- ✅ Install all dependencies (API + Web)
- ✅ Create PostgreSQL database and all tables
- ✅ Seed with 6 user accounts and demo data
- ✅ Add Philippine cities and barangays (17 cities, 67 barangays)
- ✅ Create sample pawners for testing
- ✅ Configure environment files automatically
- ✅ **Ready to use immediately after setup!**

## Prerequisites

Before running the setup, ensure you have:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **PostgreSQL** (any version) - [Download here](https://www.postgresql.org/download/)

## 🎯 Two-Step Process

### Step 1: First Time Setup (Run Once)
```cmd
setup.bat
```
**What it does:**
- Complete installation and database setup
- Creates all user accounts automatically
- Seeds all demo data
- **Takes 2-3 minutes, then you're ready to go!**

### Step 2: Daily Development (Run Every Time You Work)
```cmd
start.bat
```
**What it does:**
- Starts API server (http://localhost:3000)
- Starts Web app (http://localhost:4200)
- Opens both in separate terminal windows
- **Takes 10 seconds, ready for development!**

## 🌐 Access Your System

After running `start.bat`, open your browser to: **http://localhost:4200**

## 🔑 Login Credentials (Auto-Created During Setup)

| Emoji | Username      | Password      | Role          |
|-------|---------------|---------------|---------------|
| ⚡     | admin         | admin123      | Administrator |
| 👔     | manager1      | manager123    | Manager       |
| 💰     | cashier1      | cashier123    | Cashier       |
| 🔨     | auctioneer1   | auctioneer123 | Auctioneer    |
| 💎     | appraiser1    | appraiser123  | Appraiser     |
| 👤     | pawner1       | pawner123     | Pawner        |

**Note:** These accounts are automatically created during `setup.bat` - no manual setup required!

## 🔧 Database Configuration

The setup script will prompt you for database credentials, but defaults are:
- **Database**: pawnshop_db
- **Host**: localhost
- **Port**: 5432
- **User**: postgres
- **Password**: (you'll be prompted)

The `.env` file is automatically created with your settings.

## 🛠️ Development Commands

```bash
# Daily development (both servers)
start.bat

# Manual server startup:
# Terminal 1 - API Server
cd pawn-api
node server.js

# Terminal 2 - Web Application  
cd pawn-web
npm start

# Check current database state
cd pawn-api
node test-fresh-install.js

# Kill all Node processes (if needed)
taskkill /F /IM node.exe
```

## 🚨 Troubleshooting

### ❌ Setup Issues
**Problem:** `setup.bat` fails
**Solutions:**
1. Ensure PostgreSQL is running: `pg_isready`
2. Ensure Node.js is installed: `node --version`
3. Run as Administrator if permission errors occur
4. Check PostgreSQL password is correct

### ❌ Database Connection Issues
**Problem:** API can't connect to database
**Solutions:**
1. Verify PostgreSQL service is running
2. Check credentials in `pawn-api/.env` file
3. Test connection: `psql -U postgres -d pawnshop_db -c "SELECT 1;"`

### ❌ Port Issues
**Problem:** Servers won't start
**Solutions:**
- API runs on port **3000**, Web on port **4200**
- Kill existing processes: `taskkill /F /IM node.exe`
- Check what's using ports: `netstat -ano | findstr :3000`

### ❌ Login Issues
**Problem:** Can't login after setup
**Solutions:**
1. Run `node test-fresh-install.js` to verify users were created
2. Use exact credentials from the table above
3. Check browser console for errors
4. Verify API server is running on http://localhost:3000

## 📁 Project Structure

```
pawnshop/
├── pawn-api/                    # Backend API (Node.js + Express)
│   ├── server.js               # Main API server
│   ├── add-sample-data.js      # Seeds user accounts & demo data
│   ├── create-cities-barangays.js  # Philippine location data
│   ├── test-fresh-install.js   # Verify setup completion
│   └── routes/                 # API endpoints
├── pawn-web/                   # Frontend Web App (Angular 20.3.x)
│   ├── src/app/               # Angular application
│   └── src/pages/             # Dashboard pages for each role
├── setup.bat                  # 🚀 Complete setup script
├── start.bat                  # ⚡ Daily development script
└── NEW_PC_SETUP_GUIDE.md      # Transfer to new PC guide
```

## 🎉 You're Ready!

After successful setup, you can:
- ✅ **Login with any of the 6 demo accounts**
- ✅ **Create new pawn transactions** (loans, redemptions)
- ✅ **Manage items and pawners** with full CRUD operations
- ✅ **Search and filter** transactions by multiple criteria
- ✅ **Role-based access** (admin, manager, cashier, etc.)
- ✅ **Philippine address system** (cities & barangays)
- ✅ **Audit trail** for all system activities

## 🔗 Quick Links

- **API Health Check:** http://localhost:3000/api/health
- **Web Application:** http://localhost:4200  
- **Database Migration Guide:** [Database schema uses `employees` table]
- **New PC Setup:** See `NEW_PC_SETUP_GUIDE.md`

## 💡 Pro Tips

1. **First time?** Run `setup.bat` once, then use `start.bat` daily
2. **Moving to new PC?** Just copy folder + run `setup.bat`
3. **Development?** Use `start.bat` to start both servers quickly
4. **Testing?** Use `node test-fresh-install.js` to verify system state
5. **Database issues?** Check `pawn-api/.env` for connection settings