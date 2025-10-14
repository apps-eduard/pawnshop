# Pawnshop Management System - Ubuntu Server Deployment Guide
## Complete Setup from Fresh Ubuntu Installation

---

## Prerequisites

### Server Requirements
- **OS:** Ubuntu 22.04 LTS or 24.04 LTS (fresh installation)
- **RAM:** Minimum 2GB (4GB recommended)
- **Storage:** 20GB minimum
- **Network:** Internet connection required
- **Access:** SSH access with sudo privileges

---

## Part 1: Ubuntu Server Initial Setup

### Step 1: Update System
```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl wget git
```

### Step 2: Install Node.js (v20.x LTS)
```bash
# Install Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

### Step 3: Configure Static IP Address (Ubuntu Server)

#### Option A: Using Netplan (Ubuntu 20.04+)
```bash
# Find your network interface name
ip addr show
# Look for interface like: eth0, ens33, enp0s3, etc.

# Backup current netplan configuration
sudo cp /etc/netplan/00-installer-config.yaml /etc/netplan/00-installer-config.yaml.backup

# Edit netplan configuration
sudo nano /etc/netplan/00-installer-config.yaml
```

Add/modify the configuration:
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:  # Replace with your interface name (e.g., ens33, enp0s3)
      dhcp4: no
      addresses:
        - 192.168.1.100/24  # Your desired static IP/subnet
      routes:
        - to: default
          via: 192.168.1.1  # Your gateway IP
      nameservers:
        addresses:
          - 8.8.8.8         # Google DNS
          - 8.8.4.4         # Google DNS secondary
          - 1.1.1.1         # Cloudflare DNS (optional)
```

Apply the configuration:
```bash
# Test configuration first
sudo netplan try

# If successful, apply permanently
sudo netplan apply

# Verify new IP
ip addr show
```

#### Option B: Using Netplan with DHCP Reservation (Recommended for servers behind router)
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: yes
      dhcp4-overrides:
        use-dns: no
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```
Then configure DHCP reservation on your router using the server's MAC address.

#### Verify Network Configuration
```bash
# Check IP address
ip addr show

# Test internet connectivity
ping -c 4 8.8.8.8

# Test DNS resolution
ping -c 4 google.com

# Check routing
ip route show
```

### Step 4: Install PostgreSQL 18
```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import repository signing key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update package lists
sudo apt update

# Install PostgreSQL 18
sudo apt install -y postgresql-18 postgresql-contrib-18

# Verify installation
sudo systemctl status postgresql

# Check version
sudo -u postgres psql -c "SELECT version();"
```

### Step 5: Configure PostgreSQL
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run these commands:
```

```sql
-- Create database
CREATE DATABASE pawnshop_db;

-- Create user with password
CREATE USER pawnshop_user WITH ENCRYPTED PASSWORD 'YourStrongPassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pawnshop_db TO pawnshop_user;

-- Grant schema privileges (PostgreSQL 15+)
\c pawnshop_db
GRANT ALL ON SCHEMA public TO pawnshop_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pawnshop_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pawnshop_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pawnshop_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pawnshop_user;

-- Exit PostgreSQL
\q
```

### Step 5: Configure PostgreSQL for Remote Access (if needed)
```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Find and modify:
```conf
listen_addresses = '*'  # Change from 'localhost' to '*' for all interfaces
```

Edit pg_hba.conf:
```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Add at the end:
```conf
# Allow connections from any IP (change 0.0.0.0/0 to specific IP for security)
host    all             all             0.0.0.0/0               md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Step 6: Configure Firewall
```bash
# Install UFW if not installed
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow PostgreSQL (if remote access needed)
sudo ufw allow 5432/tcp

# Allow API port
sudo ufw allow 3000/tcp

# Allow Web port (development)
sudo ufw allow 4200/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 7: Install PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Step 8: Install Nginx (for production)
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo systemctl status nginx
```

---

## Part 2: Deploy Application

### Step 1: Create Application User
```bash
# Create dedicated user for application
sudo adduser pawnshop --disabled-password --gecos ""

# Add to sudo group if needed (optional)
# sudo usermod -aG sudo pawnshop

# Switch to pawnshop user
sudo su - pawnshop
```

### Step 2: Clone Repository
```bash
# Create application directory
mkdir -p ~/apps
cd ~/apps

# Clone from GitHub (replace with your repo)
git clone https://github.com/apps-eduard/pawnshop.git
cd pawnshop

# Or upload files via SCP from local machine
# From your local machine:
# scp -r X:\Programming_2025\pawnshop user@server-ip:~/apps/
```

### Step 3: Configure Backend Environment
```bash
# Navigate to backend
cd ~/apps/pawnshop/pawn-api

# Create .env file
nano .env
```

Add the following configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pawnshop_db
DB_USER=pawnshop_user
DB_PASSWORD=YourStrongPassword123!

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration (adjust for your domain)
ALLOWED_ORIGINS=http://localhost:4200,http://your-domain.com,https://your-domain.com
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 4: Install Backend Dependencies
```bash
# Still in pawn-api directory
npm install

# Install Knex globally (for migrations)
sudo npm install -g knex
```

### Step 5: Setup Database
```bash
# Run migrations
npx knex migrate:latest

# Run seeds
npx knex seed:run

# Fix audit tables
node run-audit-migration.js

# Verify setup
node check-audit-columns.js
```

**Expected Output:**
```
✅ Audit tables migration completed successfully!
📋 Verifying audit_logs columns: (11 columns listed)
📋 Verifying audit_trails columns: (16 columns listed)
```

### Step 6: Test Backend
```bash
# Test API manually
npm start
```

Press Ctrl+C to stop after verifying it starts successfully.

### Step 7: Configure Backend with PM2
```bash
# Still in pawn-api directory
# Create PM2 ecosystem file
nano ecosystem.config.js
```

Add the following:
```javascript
module.exports = {
  apps: [{
    name: 'pawnshop-api',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
```

Start with PM2:
```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Copy and run the command that PM2 outputs

# Check status
pm2 status
pm2 logs pawnshop-api --lines 50
```

### Step 8: Configure Frontend Environment
```bash
# Navigate to frontend
cd ~/apps/pawnshop/pawn-web

# Edit environment file
nano src/environments/environment.ts
```

Update the API URL:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'  // For development
  // apiUrl: 'https://your-domain.com/api'  // For production with domain
};
```

Also update production environment:
```bash
nano src/environments/environment.prod.ts
```

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-domain.com/api'  // Change to your actual domain
};
```

### Step 9: Install Frontend Dependencies
```bash
# Install Angular CLI globally
sudo npm install -g @angular/cli@17

# Install dependencies
npm install
```

### Step 10: Build Frontend for Production
```bash
# Build for production
ng build --configuration=production

# Build output will be in: dist/pawn-web/browser/
```

---

## Part 3: Nginx Configuration for Production

### Step 1: Create Nginx Configuration
```bash
# Exit from pawnshop user back to your admin user
exit

# Create Nginx site configuration
sudo nano /etc/nginx/sites-available/pawnshop
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Change to your domain or IP

    # Frontend static files
    root /home/pawnshop/apps/pawnshop/pawn-web/dist/pawn-web/browser;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Step 2: Enable Site and Restart Nginx
```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/pawnshop /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

### Step 3: Setup SSL with Let's Encrypt (Optional but Recommended)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## Part 4: Environment-Specific Configuration

### For Development Environment
```bash
# Backend (.env)
NODE_ENV=development
PORT=3000

# Frontend (environment.ts)
production: false
apiUrl: 'http://localhost:3000/api'
```

### For Production Environment
```bash
# Backend (.env)
NODE_ENV=production
PORT=3000

# Frontend (environment.prod.ts)
production: true
apiUrl: 'https://your-domain.com/api'
```

---

## Part 5: Security Hardening

### Step 1: Secure PostgreSQL
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Change from:
```conf
host    all             all             0.0.0.0/0               md5
```

To (only allow local connections):
```conf
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Step 2: Configure Firewall (Production)
```bash
# Remove development port
sudo ufw delete allow 4200/tcp

# Remove PostgreSQL if not needed remotely
sudo ufw delete allow 5432/tcp

# Remove API port if using Nginx as proxy
sudo ufw delete allow 3000/tcp

# Allow only HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status numbered
```

### Step 3: Secure API Endpoint
```bash
# Edit server.js to add rate limiting (if not already present)
sudo su - pawnshop
cd ~/apps/pawnshop/pawn-api
nano server.js
```

Add rate limiting middleware (if not present):
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

Install rate limit package:
```bash
npm install express-rate-limit
```

Restart API:
```bash
pm2 restart pawnshop-api
```

---

## Part 6: Monitoring and Maintenance

### View Application Logs
```bash
# API logs
pm2 logs pawnshop-api

# API logs (last 100 lines)
pm2 logs pawnshop-api --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Check Application Status
```bash
# PM2 status
pm2 status

# Check API is responding
curl http://localhost:3000/api/health

# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql
```

### Restart Services
```bash
# Restart API
pm2 restart pawnshop-api

# Restart Nginx
sudo systemctl restart nginx

# Restart PostgreSQL
sudo systemctl restart postgresql

# Restart all
pm2 restart all
sudo systemctl restart nginx postgresql
```

### Update Application
```bash
# Switch to pawnshop user
sudo su - pawnshop

# Navigate to application
cd ~/apps/pawnshop

# Pull latest changes
git pull origin main

# Update backend
cd pawn-api
npm install
npx knex migrate:latest
node run-audit-migration.js
pm2 restart pawnshop-api

# Update frontend
cd ../pawn-web
npm install
ng build --configuration=production

# Exit pawnshop user
exit

# Restart Nginx
sudo systemctl restart nginx
```

---

## Part 7: Backup Strategy

### Database Backup Script
```bash
# Create backup directory
sudo su - pawnshop
mkdir -p ~/backups

# Create backup script
nano ~/backups/backup-db.sh
```

Add the following:
```bash
#!/bin/bash
BACKUP_DIR="/home/pawnshop/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/pawnshop_db_$TIMESTAMP.sql"

# Create backup
PGPASSWORD="YourStrongPassword123!" pg_dump -U pawnshop_user -h localhost pawnshop_db > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "pawnshop_db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Make executable:
```bash
chmod +x ~/backups/backup-db.sh
```

### Setup Automatic Backup with Cron
```bash
# Edit crontab
crontab -e
```

Add the following line (daily backup at 2 AM):
```cron
0 2 * * * /home/pawnshop/backups/backup-db.sh >> /home/pawnshop/backups/backup.log 2>&1
```

### Restore from Backup
```bash
# Decompress backup
gunzip /home/pawnshop/backups/pawnshop_db_20251014_020000.sql.gz

# Restore database
PGPASSWORD="YourStrongPassword123!" psql -U pawnshop_user -h localhost pawnshop_db < /home/pawnshop/backups/pawnshop_db_20251014_020000.sql
```

---

## Part 8: Testing Deployment

### Step 1: Test Database Connection
```bash
PGPASSWORD="YourStrongPassword123!" psql -U pawnshop_user -h localhost -d pawnshop_db -c "SELECT COUNT(*) FROM employees;"
```

Should return employee count.

### Step 2: Test API
```bash
# Health check
curl http://localhost:3000/api/health

# Test with authentication (replace with actual login)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

### Step 3: Test Audit System
```bash
# Check audit tables
sudo su - pawnshop
cd ~/apps/pawnshop/pawn-api
node check-audit-data.js
```

### Step 4: Access Application
```bash
# Open browser and navigate to:
http://your-server-ip
# or
https://your-domain.com

# Login with:
Username: admin
Password: password123

# Test:
1. Navigate to "Audit Logs" menu
2. Create a new loan transaction
3. Go back to Audit Logs → Audit Trails
4. Verify transaction appears
```

---

## Part 9: Troubleshooting

### Issue: Cannot connect to PostgreSQL
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Test connection
sudo -u postgres psql -c "SELECT version();"
```

### Issue: API won't start
```bash
# Check PM2 logs
pm2 logs pawnshop-api --lines 50

# Check if port 3000 is in use
sudo netstat -tulpn | grep 3000

# Kill process if needed
sudo kill -9 $(sudo lsof -t -i:3000)

# Restart API
pm2 restart pawnshop-api
```

### Issue: Nginx not serving files
```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check file permissions
ls -la /home/pawnshop/apps/pawnshop/pawn-web/dist/pawn-web/browser/

# Fix permissions if needed
sudo chmod -R 755 /home/pawnshop/apps/pawnshop/pawn-web/dist/
```

### Issue: Audit logs not appearing
```bash
# Check if migration ran
sudo su - pawnshop
cd ~/apps/pawnshop/pawn-api
node check-audit-columns.js

# Re-run migration if needed
node run-audit-migration.js

# Check for data
node check-audit-data.js
```

---

## Part 10: Production Checklist

### Before Deployment
- [ ] Ubuntu server is updated
- [ ] Node.js v20.x installed
- [ ] PostgreSQL 16 installed and configured
- [ ] Firewall configured
- [ ] Application user created
- [ ] Code deployed to server
- [ ] .env file configured with production settings
- [ ] Database migrated and seeded
- [ ] Audit tables migration ran
- [ ] Frontend built for production
- [ ] Nginx configured
- [ ] SSL certificate installed (optional)
- [ ] PM2 configured for API
- [ ] Backup strategy implemented

### After Deployment
- [ ] API responds to health check
- [ ] Can login to application
- [ ] Audit logs menu appears for admin
- [ ] Can create transactions
- [ ] Audit trails are logged
- [ ] All menu items work
- [ ] Nginx is serving frontend correctly
- [ ] API proxy through Nginx works
- [ ] SSL certificate is valid (if using HTTPS)
- [ ] Logs are being written correctly
- [ ] PM2 auto-restart working
- [ ] Database backup cron job set up

---

## Quick Command Reference

```bash
# System
sudo systemctl status postgresql nginx    # Check services
pm2 status                                 # Check PM2 apps
sudo ufw status                            # Check firewall

# Application
pm2 restart pawnshop-api                  # Restart API
sudo systemctl restart nginx              # Restart Nginx
pm2 logs pawnshop-api                     # View API logs

# Database
psql -U pawnshop_user -d pawnshop_db      # Connect to DB
~/backups/backup-db.sh                    # Manual backup

# Updates
cd ~/apps/pawnshop && git pull            # Pull latest code
npm install && pm2 restart pawnshop-api   # Update API
ng build --prod && sudo systemctl restart nginx  # Update frontend
```

---

## Support Files Location

```
/home/pawnshop/apps/pawnshop/
├── pawn-api/
│   ├── .env                              # Backend configuration
│   ├── ecosystem.config.js               # PM2 configuration
│   ├── logs/                             # Application logs
│   └── check-audit-*.js                  # Audit verification scripts
├── pawn-web/
│   ├── dist/                             # Production build
│   └── src/environments/                 # Environment configs
└── backups/
    ├── backup-db.sh                      # Backup script
    └── *.sql.gz                          # Database backups
```

---

**Deployment Status:** Ready for Production
**Last Updated:** October 14, 2025
**Ubuntu Version:** 22.04 LTS / 24.04 LTS
**Node.js Version:** 20.x LTS
**PostgreSQL Version:** 16
