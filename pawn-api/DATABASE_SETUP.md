# Pawnshop Management System - Database Setup

## Prerequisites
Make sure you have PostgreSQL installed on your system.

### Windows Installation
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember your postgres user password (set in .env file)
4. PostgreSQL service should start automatically

### Quick Setup Commands

1. **Create Database** (run in psql or pgAdmin):
```sql
CREATE DATABASE pawnshop_db;
```

2. **Set Environment Variables** (already configured in .env):
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pawnshop_db
DB_USER=postgres
DB_PASSWORD=123
```

3. **Setup Database Schema and Seed Data**:
```bash
npm run setup-db
```

## Manual Database Setup (if needed)

If the automatic setup doesn't work, you can set up manually:

1. **Connect to PostgreSQL**:
```bash
psql -U postgres -h localhost
```

2. **Create Database**:
```sql
CREATE DATABASE pawnshop_db;
\c pawnshop_db;
```

3. **Run Schema**:
```bash
psql -U postgres -d pawnshop_db -f database/schema.sql
```

4. **Run Seed Data**:
```bash
node database/seed.js
```

## Demo Accounts

After seeding, you can use these demo accounts:

| Role | Username | Password |
|------|----------|----------|
| Administrator | admin | admin123 |
| Manager | manager1 | manager123 |
| Supervisor | supervisor1 | supervisor123 |
| Cashier | cashier1 | cashier123 |
| Clerk | clerk1 | clerk123 |

## Troubleshooting

### Connection Issues
- Make sure PostgreSQL service is running
- Check that the database `pawnshop_db` exists
- Verify credentials in `.env` file match your PostgreSQL setup
- Default PostgreSQL port is 5432

### Permission Issues
- Make sure the postgres user has permission to create databases
- You might need to run commands as administrator/sudo

### Schema Issues
- If you get "relation already exists" errors, the setup script will handle dropping existing tables
- You can manually drop the database and recreate it if needed:
```sql
DROP DATABASE IF EXISTS pawnshop_db;
CREATE DATABASE pawnshop_db;
```

## Useful Commands

```bash
# Setup database and seed data
npm run setup-db

# Only seed data (database must exist)
npm run seed-db

# Reset database (drop and recreate everything)
npm run reset-db

# Start the API server
npm start

# Start with auto-reload for development
npm run dev
```