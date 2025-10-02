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

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware - Modified for development
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration - Enhanced for development with broader access
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests)
    if(!origin) return callback(null, true);
    // Allow all origins during development
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:8080',
      'http://127.0.0.1:4200',
      'http://127.0.0.1:8080'
    ];
    if(allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins during development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`❌ [${new Date().toISOString()}] Error:`, err);
  
  // Handle specific known errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token. Please log in again.' 
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred on the server.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
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