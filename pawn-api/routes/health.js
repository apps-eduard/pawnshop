const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

/**
 * System Health Check Endpoint
 * Returns comprehensive health information about backend and frontend
 * Can return JSON or HTML based on Accept header
 */
router.get('/health', async (req, res) => {
  console.log(`🏥 [${new Date().toISOString()}] Health check requested from ${req.ip || req.connection.remoteAddress}`);
  
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW() as current_time, version() as db_version');
    
    // Get data counts
    const employeeCount = await pool.query('SELECT COUNT(*) as count FROM employees WHERE is_active = true');
    const pawnerCount = await pool.query('SELECT COUNT(*) as count FROM pawners WHERE is_active = true');
    const transactionCount = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const itemCount = await pool.query('SELECT COUNT(*) as count FROM pawn_items');
    const cityCount = await pool.query('SELECT COUNT(*) as count FROM cities');
    const barangayCount = await pool.query('SELECT COUNT(*) as count FROM barangays');
    
    // Get system uptime
    const uptime = process.uptime();
    const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: {
        name: 'Pawnshop Management System API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: uptimeFormatted,
        port: process.env.PORT || 3000,
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {
        connected: true,
        type: 'PostgreSQL',
        currentTime: dbResult.rows[0].current_time,
        version: dbResult.rows[0].db_version.split(' ')[0],
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'pawnshop_db'
      },
      data: {
        employees: parseInt(employeeCount.rows[0].count),
        pawners: parseInt(pawnerCount.rows[0].count),
        transactions: parseInt(transactionCount.rows[0].count),
        items: parseInt(itemCount.rows[0].count),
        cities: parseInt(cityCount.rows[0].count),
        barangays: parseInt(barangayCount.rows[0].count)
      },
      configuration: {
        clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
        apiUrl: `http://localhost:${process.env.PORT || 3000}/api`,
        jwtEnabled: !!process.env.JWT_SECRET,
        maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
        corsEnabled: true
      },
      frontend: {
        url: process.env.CLIENT_URL || 'http://localhost:4200',
        apiEndpoint: `http://localhost:${process.env.PORT || 3000}/api`,
        environment: {
          development: 'http://localhost:3000/api',
          production: '/api'
        }
      },
      memory: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
      }
    };
    
    // Check if request explicitly wants JSON (API calls) or HTML (browser viewing)
    // Prioritize JSON for fetch/API calls, HTML only for direct browser access
    const wantsJson = req.get('Accept')?.includes('application/json') || 
                     req.get('Content-Type')?.includes('application/json') ||
                     !req.get('Accept')?.includes('text/html');
    
    if (wantsJson) {
      // Return JSON for API calls (default for fetch)
      res.status(200).json(healthData);
    } else {
      // Return HTML only for direct browser viewing
      const html = generateHealthHTML(healthData);
      res.status(200).send(html);
    }
    
  } catch (error) {
    console.error(`❌ Health check error: ${error.message}`);
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      message: `Server is running but there was an error: ${error.message}`,
      server: {
        name: 'Pawnshop Management System API',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
      },
      database: {
        connected: false,
        error: error.message
      },
      frontend: {
        url: process.env.CLIENT_URL || 'http://localhost:4200',
        apiEndpoint: `http://localhost:${process.env.PORT || 3000}/api`
      }
    };
    
    const wantsJson = req.get('Accept')?.includes('application/json') || 
                     req.get('Content-Type')?.includes('application/json') ||
                     !req.get('Accept')?.includes('text/html');
    
    if (wantsJson) {
      res.status(500).json(errorData);
    } else {
      const html = generateHealthHTML(errorData);
      res.status(500).send(html);
    }
  }
});

function generateHealthHTML(data) {
  const statusColor = data.status === 'healthy' ? '#10b981' : '#ef4444';
  const statusIcon = data.status === 'healthy' ? '✓' : '✗';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Health - Pawnshop Management System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .status {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }
        .status-badge {
            background: ${statusColor};
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .timestamp {
            color: #6b7280;
            font-size: 14px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .card-title {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .card-title::before {
            content: '';
            width: 4px;
            height: 24px;
            background: #667eea;
            border-radius: 2px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            color: #6b7280;
            font-weight: 500;
        }
        .value {
            color: #1f2937;
            font-weight: 600;
        }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        .footer {
            text-align: center;
            color: white;
            margin-top: 30px;
            font-size: 14px;
        }
        .copy-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 10px;
        }
        .copy-btn:hover {
            background: #5568d3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="status">
                <div class="status-badge">
                    <span>${statusIcon}</span>
                    <span>${data.status.toUpperCase()}</span>
                </div>
                <h1>${data.server?.name || 'System Health Check'}</h1>
            </div>
            <div class="timestamp">Last checked: ${data.timestamp}</div>
        </div>

        <div class="grid">
            ${data.server ? `
            <div class="card">
                <div class="card-title">🖥️ Server Information</div>
                <div class="info-row">
                    <span class="label">Version</span>
                    <span class="value">${data.server.version}</span>
                </div>
                <div class="info-row">
                    <span class="label">Environment</span>
                    <span class="value">${data.server.environment}</span>
                </div>
                <div class="info-row">
                    <span class="label">Uptime</span>
                    <span class="value">${data.server.uptime}</span>
                </div>
                <div class="info-row">
                    <span class="label">Port</span>
                    <span class="value">${data.server.port}</span>
                </div>
                <div class="info-row">
                    <span class="label">Node Version</span>
                    <span class="value">${data.server.nodeVersion}</span>
                </div>
                <div class="info-row">
                    <span class="label">Platform</span>
                    <span class="value">${data.server.platform}</span>
                </div>
            </div>
            ` : ''}

            ${data.database ? `
            <div class="card">
                <div class="card-title">💾 Database</div>
                <div class="info-row">
                    <span class="label">Status</span>
                    <span class="value ${data.database.connected ? 'success' : 'error'}">
                        ${data.database.connected ? '✓ Connected' : '✗ Disconnected'}
                    </span>
                </div>
                ${data.database.connected ? `
                <div class="info-row">
                    <span class="label">Type</span>
                    <span class="value">${data.database.type}</span>
                </div>
                <div class="info-row">
                    <span class="label">Version</span>
                    <span class="value">${data.database.version}</span>
                </div>
                <div class="info-row">
                    <span class="label">Host</span>
                    <span class="value">${data.database.host}:${data.database.port}</span>
                </div>
                <div class="info-row">
                    <span class="label">Database</span>
                    <span class="value">${data.database.name}</span>
                </div>
                ` : `
                <div class="info-row">
                    <span class="label">Error</span>
                    <span class="value error">${data.database.error}</span>
                </div>
                `}
            </div>
            ` : ''}

            ${data.data ? `
            <div class="card">
                <div class="card-title">📊 Data Statistics</div>
                <div class="info-row">
                    <span class="label">Active Employees</span>
                    <span class="value">${data.data.employees.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Active Pawners</span>
                    <span class="value">${data.data.pawners.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Transactions</span>
                    <span class="value">${data.data.transactions.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Items</span>
                    <span class="value">${data.data.items.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Cities</span>
                    <span class="value">${data.data.cities.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Barangays</span>
                    <span class="value">${data.data.barangays.toLocaleString()}</span>
                </div>
            </div>
            ` : ''}

            ${data.configuration ? `
            <div class="card">
                <div class="card-title">⚙️ Configuration</div>
                <div class="info-row">
                    <span class="label">Client URL</span>
                    <span class="value">${data.configuration.clientUrl}</span>
                </div>
                <div class="info-row">
                    <span class="label">API URL</span>
                    <span class="value">${data.configuration.apiUrl}
                        <button class="copy-btn" onclick="copyToClipboard('${data.configuration.apiUrl}')">Copy</button>
                    </span>
                </div>
                <div class="info-row">
                    <span class="label">JWT Authentication</span>
                    <span class="value ${data.configuration.jwtEnabled ? 'success' : 'error'}">
                        ${data.configuration.jwtEnabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                </div>
                <div class="info-row">
                    <span class="label">CORS</span>
                    <span class="value ${data.configuration.corsEnabled ? 'success' : 'error'}">
                        ${data.configuration.corsEnabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                </div>
                <div class="info-row">
                    <span class="label">Max File Size</span>
                    <span class="value">${data.configuration.maxFileSize}</span>
                </div>
            </div>
            ` : ''}

            ${data.frontend ? `
            <div class="card">
                <div class="card-title">🌐 Frontend Integration</div>
                <div class="info-row">
                    <span class="label">Frontend URL</span>
                    <span class="value">
                        <a href="${data.frontend.url}" target="_blank" style="color: #667eea; text-decoration: none;">
                            ${data.frontend.url}
                        </a>
                    </span>
                </div>
                <div class="info-row">
                    <span class="label">API Endpoint</span>
                    <span class="value">${data.frontend.apiEndpoint}
                        <button class="copy-btn" onclick="copyToClipboard('${data.frontend.apiEndpoint}')">Copy</button>
                    </span>
                </div>
                ${data.frontend.environment ? `
                <div class="info-row">
                    <span class="label">Dev API</span>
                    <span class="value">${data.frontend.environment.development}</span>
                </div>
                <div class="info-row">
                    <span class="label">Prod API</span>
                    <span class="value">${data.frontend.environment.production}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}

            ${data.memory ? `
            <div class="card">
                <div class="card-title">💻 Memory Usage</div>
                <div class="info-row">
                    <span class="label">Heap Used</span>
                    <span class="value">${data.memory.heapUsed}</span>
                </div>
                <div class="info-row">
                    <span class="label">Heap Total</span>
                    <span class="value">${data.memory.heapTotal}</span>
                </div>
                <div class="info-row">
                    <span class="label">RSS</span>
                    <span class="value">${data.memory.rss}</span>
                </div>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>Pawnshop Management System © 2025</p>
            <p style="margin-top: 5px;">
                <a href="/api/health" style="color: white; text-decoration: none;">Refresh</a> | 
                <a href="/api/health?format=json" style="color: white; text-decoration: none;">JSON</a>
            </p>
        </div>
    </div>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied to clipboard: ' + text);
            });
        }
        
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>
  `;
}

module.exports = router;
