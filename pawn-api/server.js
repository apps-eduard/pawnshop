const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const loanRoutes = require('./routes/loans');
const itemRoutes = require('./routes/items');
const voucherRoutes = require('./routes/vouchers');
const auctionRoutes = require('./routes/auctions');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const branchRoutes = require('./routes/branches');
const adminAdvancedRoutes = require('./routes/admin-advanced');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware - EVERY REQUEST
app.use((req, res, next) => {
  console.log(`\n🌐 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`📋 Headers:`, { 
    authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 20)}...` : 'NONE',
    'content-type': req.headers['content-type'],
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  });
  console.log(`📍 IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`🔍 Query:`, req.query);
  console.log(`⏰ Timestamp: ${new Date().toLocaleString()}`);
  next();
});

// Test route for debugging
app.get('/api/test', (req, res) => {
  console.log('🧪 TEST ROUTE HIT!');
  res.json({ success: true, message: 'API server is working!', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/pawners', require('./routes/pawners'));
app.use('/api/appraisals', require('./routes/appraisals'));
app.use('/api/loans', loanRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/admin-advanced', adminAdvancedRoutes);
app.use('/api/categories', require('./routes/categories'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  console.log(`🏥 [${new Date().toISOString()}] Health check requested from ${req.ip || req.connection.remoteAddress}`);
  
  try {
    // Test database connection
    const { pool } = require('./config/database');
    const dbResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
    
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        server_time: dbResult.rows[0].current_time,
        version: dbResult.rows[0].db_version.split(' ')[0] + ' ' + dbResult.rows[0].db_version.split(' ')[1]
      },
      api: {
        version: '1.0.0',
        node_version: process.version,
        memory_usage: process.memoryUsage()
      }
    };
    
    console.log(`✅ Health check passed - DB connected, uptime: ${Math.floor(process.uptime())}s`);
    res.json(healthData);
  } catch (error) {
    console.error(`❌ Health check failed:`, error.message);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Pawnshop API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.CLIENT_URL || 'http://localhost:4200'}`);
});