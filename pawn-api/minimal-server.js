const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3001; // Use different port

// Basic middleware
app.use(cors());
app.use(express.json());

// Add basic logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Minimal server running' });
});

// Only load appraisals routes
try {
    const appraisalRoutes = require('./routes/appraisals');
    app.use('/api/appraisals', appraisalRoutes);
    console.log('✅ Appraisals routes loaded');
} catch (error) {
    console.error('❌ Error loading appraisals routes:', error.message);
}

// Error handling
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error.message);
    res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
    });
});

app.listen(PORT, () => {
    console.log(`🔬 Minimal test server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down minimal server...');
    process.exit(0);
});