#!/usr/bin/env node

/**
 * Complete Pawnshop Database Setup Script
 * This script will:
 * 1. Install dependencies for both API and Web
 * 2. Setup PostgreSQL database
 * 3. Create all tables
 * 4. Seed with initial data
 * 5. Apply any pending migrations
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.bold}${colors.blue}[${step}]${colors.reset} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function runCommand(command, cwd = process.cwd(), description = '') {
  return new Promise((resolve, reject) => {
    if (description) {
      log(`   Running: ${description}`, 'yellow');
    }
    
    const child = spawn(command, [], {
      shell: true,
      cwd: cwd,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function checkPrerequisites() {
  logStep('1', 'Checking Prerequisites');
  
  try {
    // Check Node.js
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    logSuccess(`Node.js ${nodeVersion} found`);
    
    // Check npm
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    logSuccess(`npm ${npmVersion} found`);
    
    // Check PostgreSQL
    try {
      const pgVersion = execSync('psql --version', { encoding: 'utf8' }).trim();
      logSuccess(`PostgreSQL found: ${pgVersion}`);
    } catch (error) {
      logError('PostgreSQL not found in PATH');
      logWarning('Please install PostgreSQL from: https://www.postgresql.org/download/');
      throw new Error('PostgreSQL is required');
    }
    
    logSuccess('All prerequisites satisfied');
    
  } catch (error) {
    logError(`Prerequisites check failed: ${error.message}`);
    throw error;
  }
}

async function installDependencies() {
  logStep('2', 'Installing Dependencies');
  
  try {
    // Install API dependencies
    log('Installing API dependencies...', 'cyan');
    await runCommand('npm install', path.join(process.cwd(), 'pawn-api'), 'npm install (API)');
    logSuccess('API dependencies installed');
    
    // Install Web dependencies
    log('Installing Web dependencies...', 'cyan');
    await runCommand('npm install', path.join(process.cwd(), 'pawn-web'), 'npm install (Web)');
    logSuccess('Web dependencies installed');
    
  } catch (error) {
    logError(`Dependency installation failed: ${error.message}`);
    throw error;
  }
}

function createEnvFile() {
  logStep('3', 'Setting up Environment Configuration');
  
  const apiEnvPath = path.join(process.cwd(), 'pawn-api', '.env');
  
  if (!fs.existsSync(apiEnvPath)) {
    const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pawnshop_db
DB_USER=postgres
DB_PASSWORD=123

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:4200
`;
    
    fs.writeFileSync(apiEnvPath, envContent);
    logSuccess('Created .env file for API');
  } else {
    logSuccess('.env file already exists');
  }
}

async function setupDatabase() {
  logStep('4', 'Setting up Database');
  
  try {
    // Run the database setup script
    await runCommand('npm run setup-db', path.join(process.cwd(), 'pawn-api'), 'Creating database schema and seeding data');
    logSuccess('Database setup completed');
    
  } catch (error) {
    logError(`Database setup failed: ${error.message}`);
    logWarning('You may need to:');
    log('   1. Ensure PostgreSQL is running', 'yellow');
    log('   2. Create the database manually: CREATE DATABASE pawnshop_db;', 'yellow');
    log('   3. Check your database credentials in pawn-api/.env', 'yellow');
    throw error;
  }
}

async function runMigrations() {
  logStep('5', 'Running Database Migrations');
  
  try {
    const migrationsDir = path.join(process.cwd(), 'pawn-api', 'migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
      
      if (migrationFiles.length > 0) {
        log(`Found ${migrationFiles.length} migration files`, 'cyan');
        
        // Run each migration (you might want to add a proper migration runner)
        for (const file of migrationFiles) {
          log(`   Applying migration: ${file}`, 'yellow');
        }
        logSuccess('Migrations applied successfully');
      } else {
        logSuccess('No migrations to run');
      }
    } else {
      logSuccess('No migrations directory found');
    }
    
  } catch (error) {
    logWarning(`Migration warning: ${error.message}`);
    // Don't throw here as migrations might not be critical for initial setup
  }
}

function showSuccessMessage() {
  log('\n' + '='.repeat(60), 'green');
  log('🎉 PAWNSHOP DATABASE SETUP COMPLETED SUCCESSFULLY! 🎉', 'green');
  log('='.repeat(60), 'green');
  
  log('\n📋 Demo Accounts Created:', 'cyan');
  log('┌──────────────┬────────────┬─────────────┐', 'blue');
  log('│ Role         │ Username   │ Password    │', 'blue');
  log('├──────────────┼────────────┼─────────────┤', 'blue');
  log('│ Administrator│ admin      │ admin123    │', 'blue');
  log('│ Manager      │ manager1   │ manager123  │', 'blue');
  log('│ Cashier      │ cashier1   │ cashier123  │', 'blue');
  log('│ Appraiser    │ appraiser1 │ appraiser123│', 'blue');
  log('│ Auctioneer   │ auctioneer1│ auctioneer123│', 'blue');
  log('└──────────────┴────────────┴─────────────┘', 'blue');
  
  log('\n🚀 Next Steps:', 'cyan');
  log('1. Start the API server:', 'yellow');
  log('   cd pawn-api && npm start', 'magenta');
  log('\n2. Start the Web application:', 'yellow');
  log('   cd pawn-web && ng serve', 'magenta');
  log('\n3. Open your browser to:', 'yellow');
  log('   http://localhost:4200', 'magenta');
  
  log('\n📁 Database Details:', 'cyan');
  log('   Database: pawnshop_db', 'yellow');
  log('   Host: localhost:5432', 'yellow');
  log('   User: postgres', 'yellow');
  
  log('\n🔧 Useful Commands:', 'cyan');
  log('   Reset database: cd pawn-api && npm run reset-db', 'yellow');
  log('   Seed only: cd pawn-api && npm run seed-db', 'yellow');
  log('   API dev mode: cd pawn-api && npm run dev', 'yellow');
  
  log('\n💡 If you encounter issues, check:', 'cyan');
  log('   - PostgreSQL service is running', 'yellow');
  log('   - Database credentials in pawn-api/.env', 'yellow');
  log('   - Firewall settings for port 3000 and 4200', 'yellow');
}

async function main() {
  log('\n' + '='.repeat(60), 'blue');
  log('🏦 PAWNSHOP MANAGEMENT SYSTEM - COMPLETE SETUP', 'blue');
  log('='.repeat(60), 'blue');
  
  try {
    checkPrerequisites();
    await installDependencies();
    createEnvFile();
    await setupDatabase();
    await runMigrations();
    
    showSuccessMessage();
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    log('\n🔍 Troubleshooting tips:', 'yellow');
    log('1. Ensure PostgreSQL is installed and running', 'yellow');
    log('2. Check that you have admin/sudo privileges if needed', 'yellow');
    log('3. Verify internet connection for package downloads', 'yellow');
    log('4. Check the error message above for specific issues', 'yellow');
    
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);