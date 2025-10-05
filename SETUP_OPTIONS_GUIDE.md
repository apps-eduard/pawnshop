# Setup Options Guide

## 📝 Overview

There are multiple ways to run the setup for the Pawnshop Management System. Choose the method that works best for you.

## 🚀 Recommended Methods

### Method 1: Using run-setup.cmd (EASIEST - Double-click)
**✅ Recommended for most users**

Simply **double-click** `run-setup.cmd` in the root folder.

**What it does:**
- Runs the PowerShell setup script
- Keeps the window open so you can see the results
- No need to open terminal manually

**Pros:**
- ✅ Easiest to use - just double-click
- ✅ Window stays open automatically
- ✅ See all progress and results

---

### Method 2: Using setup.bat (Traditional Batch)
**✅ Good for users who prefer .bat files**

Double-click `setup.bat` in the root folder.

**What it does:**
- Full setup with detailed error checking
- Shows progress for each step
- Traditional Windows batch file

**Pros:**
- ✅ Works on all Windows versions
- ✅ Detailed progress messages
- ✅ Well-tested and reliable

---

### Method 3: Using setup.ps1 (PowerShell)
**✅ Best for PowerShell users**

Right-click `setup.ps1` → **Run with PowerShell**

Or open PowerShell terminal and run:
```powershell
cd C:\Users\speed\Desktop\pawnshop
.\setup.ps1
```

**What it does:**
- Modern PowerShell implementation
- Includes penalty & service charge seeding info
- Enhanced error handling

**Pros:**
- ✅ Modern PowerShell features
- ✅ Better error messages
- ✅ Shows what's being seeded

**Note:** If you double-click the .ps1 file, it might open in an editor instead of running. Use `run-setup.cmd` or run from PowerShell terminal instead.

---

## 📊 Comparison Table

| Method | Double-Click | Window Stays Open | Modern UI | Best For |
|--------|--------------|-------------------|-----------|----------|
| **run-setup.cmd** | ✅ Yes | ✅ Yes | ✅ Yes | Most users |
| **setup.bat** | ✅ Yes | ✅ Yes | ⚠️ Basic | Traditional users |
| **setup.ps1** | ⚠️ Maybe | ✅ Yes | ✅ Yes | PowerShell users |

---

## 🎯 Which One Should I Use?

### Use `run-setup.cmd` if:
- You want the simplest method
- You want to just double-click and go
- You're not comfortable with command line

### Use `setup.bat` if:
- You prefer traditional batch files
- You've used it before and it works
- You want maximum compatibility

### Use `setup.ps1` if:
- You're running from PowerShell terminal
- You want modern PowerShell features
- You want detailed seeding information

---

## ✨ What Gets Installed?

All methods install the same components:

### 1. Backend (pawn-api)
- ✅ Node.js dependencies
- ✅ Database tables (24 tables)
- ✅ Admin settings & categories
- ✅ **Penalty configuration** (2% monthly, 3-day threshold)
- ✅ **Service charge brackets** (₱1-₱5)
- ✅ Cities & barangays data
- ✅ Item descriptions
- ✅ Demo user accounts

### 2. Frontend (pawn-web)
- ✅ Angular dependencies
- ✅ UI components
- ✅ Build configuration

---

## 🔧 Prerequisites

Before running any setup method, ensure:

1. **✅ Node.js installed** (v18.x or v20.x)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **✅ PostgreSQL installed and running**
   - Download: https://www.postgresql.org/download/windows/
   - Verify: `psql --version`
   - Check service is running in Services (services.msc)

3. **✅ Database configuration**
   - File: `pawn-api/.env`
   - Contains correct PostgreSQL credentials

---

## ❌ Troubleshooting

### Problem: Script closes immediately

**Solution 1:** Use `run-setup.cmd` instead of double-clicking .ps1 file

**Solution 2:** Run from PowerShell terminal:
```powershell
cd C:\Users\speed\Desktop\pawnshop
.\setup.ps1
```

### Problem: "Execution policy" error with PowerShell

**Solution:** Run as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Problem: "psql not found" error

**Solution:** 
1. Install PostgreSQL
2. Add PostgreSQL bin folder to PATH
3. Restart terminal

### Problem: Database connection failed

**Solution:**
1. Check PostgreSQL service is running
2. Verify credentials in `pawn-api/.env`
3. Test connection: `psql -U postgres`

---

## 📁 Can I Delete setup.bat?

**Answer:** No, keep both files!

**Why keep both?**
- `setup.bat` - Works on all systems, well-tested
- `setup.ps1` - Modern features, better messages
- `run-setup.cmd` - Easy launcher for PowerShell script

Different users prefer different methods, so having options is good.

**If you must delete one:**
- Keep `setup.bat` (most compatible)
- Keep `run-setup.cmd` (if you prefer PowerShell)
- Or keep all three for maximum flexibility

---

## 🔄 Running Setup Again

You can run setup multiple times safely. It will:
- Reinstall dependencies
- Recreate database tables (drops and recreates)
- Reseed all data
- Verify everything is working

**When to run again:**
- After pulling new code from repository
- When database schema changes
- If setup failed halfway
- Starting fresh on a new PC

---

## 📞 Still Having Issues?

1. Check that all prerequisites are installed
2. Run setup from PowerShell terminal to see full error messages
3. Check the error message for specific guidance
4. Verify `pawn-api/.env` has correct database credentials
5. Make sure PostgreSQL service is running

---

## 🎉 After Successful Setup

You'll see:
```
✓ 24 database tables created
✓ Categories and loan rules seeded
✓ Penalty configuration seeded (2% monthly rate, 3-day threshold)
✓ Service charge brackets seeded (₱1-₱5 based on amount)
✓ Cities and barangays data seeded
✓ Item descriptions seeded
✓ Demo accounts created
```

**Next steps:**
1. Terminal 1: `cd pawn-api && npm start`
2. Terminal 2: `cd pawn-web && ng serve`
3. Browser: http://localhost:4200

**Demo accounts ready to use!**
