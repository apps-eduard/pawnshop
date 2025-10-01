# 🏦 Pawnshop Management System - Quick Setup

## One-Command Setup

This repository includes automated setup scripts that will:
- ✅ Install all dependencies (API + Web)
- ✅ Create PostgreSQL database and tables
- ✅ Seed with demo data and user accounts
- ✅ Apply any pending migrations
- ✅ Configure environment files

## Prerequisites

Before running the setup, ensure you have:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
3. **Git** (for cloning) - [Download here](https://git-scm.com/)

## 🚀 Quick Start

### Option 1: Windows Batch File (Recommended for Windows)
```cmd
setup.bat
```

### Option 2: PowerShell (Windows)
```powershell
.\setup.ps1
```

### Option 3: Node.js Script (Cross-platform)
```bash
node setup-complete.js
```

### Option 4: Manual Step-by-Step
```bash
# 1. Install API dependencies
cd pawn-api
npm install

# 2. Install Web dependencies
cd ../pawn-web
npm install

# 3. Setup database (from pawn-api directory)
cd ../pawn-api
npm run setup-db
```

## 🎯 After Setup

Once setup is complete, start the applications:

### Terminal 1 - API Server
```bash
cd pawn-api
npm start
```

### Terminal 2 - Web Application
```bash
cd pawn-web
ng serve
```

Then open your browser to: **http://localhost:4200**

## 🔑 Demo Accounts

| Role          | Username    | Password     |
|---------------|-------------|--------------|
| Administrator | admin       | admin123     |
| Manager       | manager1    | manager123   |
| Cashier       | cashier1    | cashier123   |
| Appraiser     | appraiser1  | appraiser123 |
| Auctioneer    | auctioneer1 | auctioneer123|

## 🔧 Database Configuration

Default database settings (modify in `pawn-api/.env` if needed):
- **Database**: pawnshop_db
- **Host**: localhost
- **Port**: 5432
- **User**: postgres
- **Password**: 123

## 🛠️ Useful Commands

```bash
# Reset entire database
cd pawn-api && npm run reset-db

# Seed data only (database must exist)
cd pawn-api && npm run seed-db

# API development mode (auto-reload)
cd pawn-api && npm run dev

# Web development mode
cd pawn-web && ng serve --open
```

## 🚨 Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL service is running
2. Verify database credentials in `pawn-api/.env`
3. Check if database `pawnshop_db` exists:
   ```sql
   psql -U postgres -c "CREATE DATABASE pawnshop_db;"
   ```

### Permission Issues
- Run setup as Administrator (Windows) or with sudo (Linux/Mac)
- Ensure PostgreSQL user has database creation privileges

### Port Issues
- API runs on port 3000
- Web runs on port 4200
- Ensure these ports are not in use

### Module Issues
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

## 📁 Project Structure

```
pawnshop/
├── pawn-api/          # Backend API (Node.js + Express)
├── pawn-web/          # Frontend Web App (Angular)
├── setup-complete.js  # Main setup script
├── setup.bat          # Windows batch setup
├── setup.ps1          # PowerShell setup
└── README.md          # This file
```

## 🎉 You're Ready!

After successful setup, you can:
- Login with any demo account
- Create new pawn transactions
- Manage items and customers
- Generate reports
- Configure system settings

For detailed documentation, check the individual README files in `pawn-api` and `pawn-web` folders.