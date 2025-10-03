# Pawnshop Management System - Setup Guide

This guide will help you set up the Pawnshop Management System on a new PC with complete database initialization and sample data.

## Prerequisites

Before running the setup, make sure you have:

1. **PostgreSQL** installed and running
   - Download from: https://www.postgresql.org/download/
   - Make sure PostgreSQL service is running
   - Remember your postgres user password

2. **Node.js** installed (version 14 or higher)
   - Download from: https://nodejs.org/
   - This will also install npm

## Quick Setup (Recommended)

### 1. Run the Setup Script

Double-click `setup.bat` or run it from command prompt:

```batch
setup.bat
```

The setup script will:
- ✅ Check system requirements
- ✅ Install all dependencies  
- ✅ Create database configuration
- ✅ Set up database schema
- ✅ Seed initial data (users, cities, sample transactions)
- ✅ Configure both API and Web applications

### 2. Follow the Prompts

The setup will ask for your PostgreSQL credentials:
- **Database Host**: Usually `localhost`
- **Database Port**: Usually `5432`
- **Database User**: Usually `postgres`
- **Database Password**: Your PostgreSQL password
- **Database Name**: Suggest `pawnshop_db`

### 3. Start the System

After setup completes, you can start the system by:

**Option A: Use the start script**
```batch
start.bat
```

**Option B: Manual start**
```batch
# Terminal 1 - API Server
cd pawn-api
npm start

# Terminal 2 - Web Application  
cd pawn-web
npm start
```

### 4. Access the Application

Open your browser to: **http://localhost:4200**

## Default Login Credentials

| Username     | Password      | Role          | Description     |
|--------------|---------------|---------------|-----------------|
| ⚡ admin      | admin123      | administrator | System Admin    |
| 👔 manager1   | manager123    | manager       | Branch Manager  |
| 💰 cashier1   | cashier123    | cashier       | Senior Cashier  |
| 🔨 auctioneer1| auctioneer123 | auctioneer    | Senior Auctioneer |
| 💎 appraiser1 | appraiser123  | appraiser     | Senior Appraiser |
| 👤 pawner1    | pawner123     | pawner        | Pawner Account  |

## Sample Data Included

The setup includes:

### 🏙️ **Cities & Barangays**
- 35+ Philippine cities (Manila, Quezon City, Makati, etc.)
- 50+ barangays across major cities

### 👥 **Sample Users**
- 6 different user roles: Administrator, Manager, Cashier, Auctioneer, Appraiser, and Pawner
- Pre-configured with different access levels and permissions
- Each role has specific system capabilities and restrictions

### 🏪 **Sample Transactions**
- 5 sample pawn transactions (PT-2024-001 to PT-2024-005)
- Various items (electronics, jewelry, etc.)
- Complete customer information

### 🔍 **Test Transaction Numbers**
You can search for these in the system:
- `PT-2024-001` - Gold jewelry transaction
- `PT-2024-002` - Electronics (laptop, mouse)
- `PT-2024-003` - Mixed items
- `PT-2024-004` - High-value transaction
- `PT-2024-005` - Standard loan

## Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Database Setup
```sql
-- Connect to PostgreSQL and create database
CREATE DATABASE pawnshop_db;
```

### 2. API Setup
```batch
cd pawn-api
npm install
copy .env.example .env
# Edit .env with your database credentials
node database/setup.js
node add-sample-data.js
node create-cities-barangays.js
node add-sample-transactions.js
node fix-address-data.js
```

### 3. Web Setup
```batch
cd pawn-web
npm install
```

## Troubleshooting

### Common Issues:

**"PostgreSQL is not running"**
- Make sure PostgreSQL service is started
- Check if `pg_isready` command works

**"Database connection failed"**
- Verify PostgreSQL credentials
- Check if database server is accessible
- Ensure port 5432 is not blocked

**"Node.js not found"**
- Install Node.js from nodejs.org
- Restart command prompt after installation

**"Permission denied"**
- Run command prompt as Administrator
- Check file permissions in project folder

### Reset Everything:
If you need to start fresh:
```batch
# Drop database and recreate
psql -U postgres -c "DROP DATABASE IF EXISTS pawnshop_db;"
# Then run setup.bat again
```

## Project Structure

```
pawnshop/
├── setup.bat              # Main setup script
├── start.bat              # Quick start script
├── pawn-api/              # Backend API
│   ├── .env               # Database config (created by setup)
│   ├── server.js          # Main server file
│   ├── config/            # Database configuration
│   ├── routes/            # API endpoints
│   └── database/          # Database setup scripts
└── pawn-web/              # Frontend application
    ├── src/               # Angular source code
    └── package.json       # Frontend dependencies
```

## Support

If you encounter any issues:
1. Check the error messages in the console
2. Verify all prerequisites are installed
3. Make sure PostgreSQL is running
4. Try running setup.bat as Administrator

---

🎉 **You're all set!** The Pawnshop Management System should now be running with sample data ready for testing.