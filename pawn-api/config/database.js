const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pawnshop_db',
  password: process.env.DB_PASSWORD || '123',
  port: process.env.DB_PORT || 5432,
  max: 10, // Reduced from 20 to prevent connection overload
  idleTimeoutMillis: 10000, // Reduced idle timeout to free connections faster
  connectionTimeoutMillis: 3000, // Slightly increased timeout for reliability
  allowExitOnIdle: true, // Allow pool to exit when idle
});

// Connection monitoring and error handling
pool.on('connect', (client) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('📄 Database connection established');
  }
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  // Don't exit process, let connection pool recover
});

pool.on('remove', (client) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔌 Database connection removed from pool');
  }
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down database pool...');
  await pool.end();
  process.exit(0);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};