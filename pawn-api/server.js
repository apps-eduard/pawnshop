const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
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
const pawnerRoutes = require('./routes/pawners');
const appraisalRoutes = require('./routes/appraisals');
const categoryRoutes = require('./routes/categories');
const addressRoutes = require('./routes/addresses');
const branchConfigRoutes = require('./routes/branch-config');
const syncLogsRoutes = require('./routes/sync-logs');
const transactionRoutes = require('./routes/transactions');
const penaltyConfigRoutes = require('./routes/penalty-config');
const serviceChargeConfigRoutes = require('./routes/service-charge-config');
const adminCalculationsRoutes = require('./routes/admin-calculations');
const statisticsRoutes = require('./routes/statistics');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware - Modified for development
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false
}));

// Rate limiting for development - More reasonable limits
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 200, // Increased to 200 requests per minute for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Dashboard rate limiting - More reasonable for development
const dashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increased to 100 dashboard requests per minute
  message: 'Dashboard requests limited, please slow down.'
});

app.use('/api/', limiter);
app.use('/api/dashboard', dashboardLimiter);

// Enhanced CORS configuration - Fixed for proper preflight handling
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Additional CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
});

// Enhanced CORS middleware should handle preflight requests automatically

// Add response header middleware to ensure CORS headers are always present
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Request timeout middleware to prevent hanging connections
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.log(`⏰ Request timeout for ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Add request queueing to prevent overwhelming the server
let activeRequests = 0;
const maxConcurrentRequests = 5;

app.use('/api', (req, res, next) => {
  if (activeRequests >= maxConcurrentRequests) {
    console.log(`🚦 Request queued: ${req.method} ${req.path} (Active: ${activeRequests})`);
    return setTimeout(() => {
      next();
    }, 50); // Small delay to prevent overwhelming
  }
  
  activeRequests++;
  
  const originalEnd = res.end;
  res.end = function(...args) {
    activeRequests--;
    originalEnd.apply(res, args);
  };
  
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple health check endpoint that doesn't require authentication
app.get('/api/health', async (req, res) => {
  console.log(`🏥 [${new Date().toISOString()}] Health check requested from ${req.ip || req.connection.remoteAddress}`);
  
  try {
    // Test database connection
    const { pool } = require('./config/database');
    const dbResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
    
    // Test if cities and barangays exist - important for pawner creation
    const cityCount = await pool.query('SELECT COUNT(*) as count FROM cities');
    const barangayCount = await pool.query('SELECT COUNT(*) as count FROM barangays');
    
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: dbResult.rows[0].current_time,
        version: dbResult.rows[0].db_version
      },
      resources: {
        cities: cityCount.rows[0].count,
        barangays: barangayCount.rows[0].count
      }
    };
    
    res.status(200).json(healthData);
  } catch (error) {
    console.error(`❌ Health check error: ${error.message}`);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: `Server is running but there was an error: ${error.message}`,
      database: {
        connected: false
      }
    });
  }
});

// Request logging middleware - EVERY REQUEST
app.use((req, res, next) => {
  console.log(`\n🌐 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`📋 Headers:`, { 
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? '****' : undefined,
    'user-agent': req.headers['user-agent']
  });
  
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '****';
    if (sanitizedBody.token) sanitizedBody.token = '****';
    console.log(`📦 Body:`, sanitizedBody);
  }
  
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pawners', pawnerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/admin-advanced', adminAdvancedRoutes);
app.use('/api/appraisals', appraisalRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/branch-config', branchConfigRoutes);
app.use('/api/sync-logs', syncLogsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/penalty-config', penaltyConfigRoutes);
app.use('/api/service-charge-config', serviceChargeConfigRoutes);
app.use('/api/admin-calculations', adminCalculationsRoutes);
app.use('/api/statistics', statisticsRoutes);

// Enhanced error handling middleware with CORS support
app.use((err, req, res, next) => {
  console.error(`❌ [${new Date().toISOString()}] Error:`, {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack?.split('\n').slice(0, 3)
  });
  
  // Ensure CORS headers are set even on errors
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle specific known errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token. Please log in again.' 
    });
  }
  
  // Default error response
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'An unexpected error occurred on the server.',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [UNHANDLED REJECTION]', {
    timestamp: new Date().toISOString(),
    reason: reason,
    promise: promise
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 [UNCAUGHT EXCEPTION]', {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack
  });
  // Don't exit the process in development
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║                                               ║
  ║   🏪 Pawnshop Management API                  ║
  ║   🚀 Server running on port ${PORT}              ║
  ║   🕒 Started at ${new Date().toLocaleTimeString()}                   ║
  ║   🌐 http://localhost:${PORT}/api/health          ║
  ║                                               ║
  ╚═══════════════════════════════════════════════╝
  `);
});

// Export for testing
module.exports = app;