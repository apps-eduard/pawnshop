# 📋 Pawnshop System Backend Documentation

## 🏗️ System Architecture Overview

### Database: PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database Name**: pawnshop_db
- **Connection Pool**: Managed by pg library

### API Server: Node.js + Express
- **Port**: 3000
- **Base URL**: http://localhost:3000/api
- **Authentication**: JWT tokens
- **CORS**: Enabled for frontend integration

---

## 🎫 Transaction Number Generation System

### ✅ **CRITICAL: No Duplicate Risk After PC Restart**

The transaction number system is **100% safe** from duplicates even after system restarts because:

1. **Database Persistence**: All sequence counters are stored in PostgreSQL `transaction_sequences` table
2. **Atomic Operations**: Uses SQL `UPDATE ... RETURNING` for thread-safe increments
3. **No Memory Storage**: Zero reliance on server memory or temporary files

### 📊 Table Structure: `transaction_sequences`
```sql
CREATE TABLE transaction_sequences (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL,
  sequence_type VARCHAR(50) NOT NULL,  -- 'TICKET', 'LOAN', 'PAYMENT'
  current_number INTEGER DEFAULT 0,
  prefix VARCHAR(10),
  suffix VARCHAR(10),
  year INTEGER,
  month INTEGER,
  reset_frequency VARCHAR(20) DEFAULT 'yearly',
  last_reset_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 🔧 Configuration Location
- **Frontend Config**: Admin Settings > Transaction Configuration
- **Backend Config**: `system_config` table, key: `transaction_number_format`
- **Utility Functions**: `/utils/transactionUtils.js`

### 📋 Current Format Settings
```javascript
{
  prefix: 'TXN',           // 2-5 characters
  includeYear: true,       // YYYY
  includeMonth: true,      // MM
  includeDay: false,       // DD (optional)
  sequenceDigits: 6,       // Padding digits
  separator: '-'           // Join separator
}
```

### 🎯 Example Generated Numbers
- Format: `TXN-YYYYMM-XXXXXX`
- Examples: `TXN-202510-000014`, `TXN-202510-000015`

---

## 🔐 Authentication System

### User Table: `employees` (NOT `users`)
- **Important**: Frontend calls `/api/users` but backend uses `employees` table
- **Converted Routes**: All user management routes updated to use employees table
- **Default Admin**: username: `admin`, password: `admin123`

### Roles Available:
- `administrator` - Full system access
- `manager` - Branch management
- `cashier` - Transaction processing
- `appraiser` - Item appraisal
- `auctioneer` - Auction management
- `pawner` - Customer role

---

## 🏪 Branch Management

### Current Branches (from database):
1. **Main Branch** (ID: 1)
   - Code: MAIN
   - Address: 123 Main Street, Cebu City, Philippines
   - Phone: +63-32-123-4567

2. **Branch 2** (ID: 2)  
   - Code: BR02
   - Address: 456 Secondary Avenue, Davao City, Philippines
   - Phone: +63-82-987-6543

3. **Branch 3** (ID: 3)
   - Code: BR03
   - Address: 789 Tertiary Road, Iloilo City, Philippines  
   - Phone: +63-33-555-1234

### Branch Configuration
- **Current Branch**: Configurable per installation in Admin Settings
- **API Endpoints**: `/api/branch-config` and `/api/branch-config/current`

---

## 📁 Database Tables (19 total)

### Core Business Tables:
- `pawn_tickets` - Main pawn transactions
- `pawn_items` - Items being pawned
- `pawn_payments` - Payment records
- `pawners` - Customer information
- `transactions` - General transactions
- `appraisals` - Item appraisals

### Configuration Tables:
- `system_config` - System-wide settings
- `transaction_sequences` - Number generators
- `branches` - Branch information  
- `categories` - Item categories
- `descriptions` - Predefined item descriptions (200 items)
- `voucher_types` - Payment voucher types
- `loan_rules` - Loan calculation rules

### Geographic Data:
- `cities` - 65 cities (Visayas & Mindanao)
- `barangays` - 819 barangays
- `employees` - Staff information (6 active users)

### Audit & Logging:
- `audit_logs` - System audit trail
- `audit_trails` - Additional audit data
- `branch_sync_log` - Multi-branch sync records

---

## 🚨 Critical API Issues Fixed

### 1. Items API (`/api/items`)
- **Issue**: Used non-existent `ticket_id` and `contact_number` columns
- **Fix**: Updated to use `transaction_id` and `mobile_number`
- **Status**: ✅ Fixed and working

### 2. Branch Config API (`/api/branch-config/current`)  
- **Issue**: Referenced non-existent `current_branch_info` view
- **Fix**: Added direct query to `branches` table with fallback logic
- **Status**: ✅ Fixed and working

### 3. Users API (`/api/users`)
- **Issue**: Frontend expected `users` table but database has `employees`
- **Fix**: Converted all routes to use `employees` table structure
- **Status**: ✅ Fixed and working

### 4. Category Descriptions API (`/api/categories/:id/descriptions`)
- **Issue**: PostgreSQL parameter type conflict - same parameter used for varchar and text columns
- **Fix**: Added explicit type casting (`$2::varchar`, `$3::text`) in INSERT query
- **Status**: ✅ Fixed and working

---

## 🔧 Key Configuration Files

### Environment Variables (`.env`)
```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pawnshop_db
DB_USER=postgres
DB_PASSWORD=[configured]

# JWT Settings  
JWT_SECRET=[generated]
JWT_EXPIRES_IN=7d

# Server Settings
PORT=3000
NODE_ENV=development
```

### Package Dependencies
- **express** - Web framework
- **pg** - PostgreSQL client
- **bcryptjs** - Password hashing
- **jsonwebtoken** - Authentication
- **cors** - Cross-origin requests
- **dotenv** - Environment variables

---

## 📡 API Endpoints Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Current user info

### User Management (uses employees table)
- `GET /api/users` - List employees
- `GET /api/users/:id` - Get employee details  
- `POST /api/users` - Create employee
- `PUT /api/users/:id` - Update employee
- `DELETE /api/users/:id` - Delete employee
- `POST /api/users/:id/reset-password` - Reset password

### Transactions
- `GET /api/transactions/search/:ticketNumber` - Find transaction
- `POST /api/transactions/new-loan` - Create new pawn
- `POST /api/transactions/redeem` - Redeem items
- `POST /api/transactions/partial-payment` - Make payment

### Configuration  
- `GET /api/admin/transaction-config` - Get transaction settings
- `PUT /api/admin/transaction-config` - Update transaction settings
- `GET /api/branch-config` - Get branch configuration
- `PUT /api/branch-config` - Update branch configuration

---

## 🛠️ Development Tools

### Testing Scripts
- `test-sequence-safety.js` - Verify sequence number safety
- `test-updated-transaction-numbers.js` - Test transaction generation
- `verify-all-tables.js` - Database structure verification
- `check-branch-view.js` - Branch configuration testing

### Database Scripts
- `reset-all-passwords.js` - Reset user passwords
- `create-database.js` - Initialize database
- `add-sample-data.js` - Insert test data

---

## 🚀 Deployment Notes

### Production Checklist:
1. Update environment variables for production database
2. Change default admin password  
3. Configure proper JWT secrets
4. Set up database backups
5. Configure HTTPS/SSL
6. Set up process manager (PM2)
7. Configure reverse proxy (Nginx)

### Performance Considerations:
- Database connection pooling configured
- JWT tokens cached for performance
- Audit logging may need archival strategy
- Consider read replicas for reporting

---

## 🐛 Known Issues & Solutions

### Issue: Frontend Build Size Warning
- **Problem**: Bundle size exceeds 2MB budget  
- **Impact**: Development warning only
- **Solution**: Optimize imports and lazy loading

### Issue: CSS Inline Styles Lint Warnings
- **Problem**: Some components use inline styles
- **Impact**: Lint warnings, no functional impact
- **Solution**: Migrate to external CSS classes

---

## 📞 Support Information

### Database Access
- Use `psql` or pgAdmin for direct database access
- Connection string available in `.env` file
- Backup scripts located in `/database` folder

### Log Files
- Server logs: Console output (consider log files for production)
- Database logs: PostgreSQL log directory
- Error tracking: Built into API responses

### Monitoring Endpoints
- `GET /api/health` - Server health check
- Database connection status included in health response

---

**Last Updated**: October 4, 2025  
**Version**: 1.0.0  
**Maintainer**: System Administrator

---

## 🔗 Quick Reference Commands

```bash
# Start API Server
cd pawn-api && node server.js

# Test Transaction Numbers
cd pawn-api && node test-updated-transaction-numbers.js

# Verify Database
cd pawn-api && node verify-all-tables.js

# Reset Admin Password  
cd pawn-api && node reset-all-passwords.js

# Check Sequence Safety
cd pawn-api && node test-sequence-safety.js
```