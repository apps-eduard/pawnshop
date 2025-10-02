const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/branch-config - Get current branch configuration
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get current branch configuration
    const configResult = await query(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_key IN ('current_branch_id', 'installation_type', 'sync_enabled', 'last_sync_timestamp')
      ORDER BY config_key
    `);

    // Get current branch details
    const branchResult = await query(`
      SELECT * FROM current_branch_info
    `);

    // Get all available branches for selection
    const branchesResult = await query(`
      SELECT id, name, address, is_active 
      FROM branches 
      WHERE is_active = true 
      ORDER BY name
    `);

    // Convert config array to object
    const config = {};
    configResult.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    res.json({
      success: true,
      data: {
        config,
        currentBranch: branchResult.rows[0] || null,
        availableBranches: branchesResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching branch configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch configuration',
      error: error.message
    });
  }
});

// PUT /api/branch-config - Update branch configuration
router.put('/', authenticateToken, authorizeRoles('administrator'), async (req, res) => {
  try {
    const { currentBranchId, installationType, syncEnabled } = req.body;

    // Validate inputs
    if (!currentBranchId || !installationType) {
      return res.status(400).json({
        success: false,
        message: 'Current branch ID and installation type are required'
      });
    }

    // Verify the branch exists
    const branchCheck = await query(
      'SELECT id, name FROM branches WHERE id = $1 AND is_active = true',
      [currentBranchId]
    );

    if (branchCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid branch ID or branch is not active'
      });
    }

    // Update configuration
    await query('BEGIN');

    // Update current branch ID
    await query(`
      INSERT INTO system_config (config_key, config_value, updated_at)
      VALUES ('current_branch_id', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (config_key) 
      DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        updated_at = CURRENT_TIMESTAMP
    `, [currentBranchId.toString()]);

    // Update installation type
    await query(`
      INSERT INTO system_config (config_key, config_value, updated_at)
      VALUES ('installation_type', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (config_key) 
      DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        updated_at = CURRENT_TIMESTAMP
    `, [installationType]);

    // Update sync enabled status
    await query(`
      INSERT INTO system_config (config_key, config_value, updated_at)
      VALUES ('sync_enabled', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (config_key) 
      DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        updated_at = CURRENT_TIMESTAMP
    `, [syncEnabled ? 'true' : 'false']);

    await query('COMMIT');

    // Log the configuration change
    await query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, branch_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      req.user.id,
      'UPDATE_BRANCH_CONFIG',
      'system_config',
      null,
      JSON.stringify({ 
        currentBranchId, 
        installationType, 
        syncEnabled,
        branchName: branchCheck.rows[0].name 
      }),
      currentBranchId
    ]);

    // Get updated configuration to return
    const updatedConfigResult = await query(`
      SELECT config_key, config_value 
      FROM system_config 
      WHERE config_key IN ('current_branch_id', 'installation_type', 'sync_enabled', 'last_sync_timestamp')
      ORDER BY config_key
    `);

    const updatedConfig = {};
    updatedConfigResult.rows.forEach(row => {
      updatedConfig[row.config_key] = row.config_value;
    });

    res.json({
      success: true,
      message: `Branch configuration updated successfully. Current branch: ${branchCheck.rows[0].name}`,
      data: {
        config: updatedConfig,
        branchName: branchCheck.rows[0].name
      }
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error updating branch configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update branch configuration',
      error: error.message
    });
  }
});

// GET /api/branch-config/current - Get just the current branch info
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        b.id,
        b.name,
        b.address,
        b.contact_number,
        sc.config_value as installation_type,
        sc2.config_value as sync_enabled
      FROM branches b
      JOIN system_config sc ON sc.config_key = 'current_branch_id' AND b.id = sc.config_value::integer
      LEFT JOIN system_config sc2 ON sc2.config_key = 'installation_type'
      LEFT JOIN system_config sc3 ON sc3.config_key = 'sync_enabled'
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Current branch not found or not configured'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching current branch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current branch',
      error: error.message
    });
  }
});

// POST /api/branch-config/sync-status - Update last sync timestamp
router.post('/sync-status', authenticateToken, authorizeRoles('administrator'), async (req, res) => {
  try {
    const { syncTimestamp, syncType, recordsCount } = req.body;
    
    // Update last sync timestamp
    await query(`
      INSERT INTO system_config (config_key, config_value, updated_at)
      VALUES ('last_sync_timestamp', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (config_key) 
      DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        updated_at = CURRENT_TIMESTAMP
    `, [syncTimestamp || new Date().toISOString()]);

    // Log sync activity
    const currentBranchResult = await query(`
      SELECT config_value as branch_id 
      FROM system_config 
      WHERE config_key = 'current_branch_id'
    `);

    if (currentBranchResult.rows.length > 0) {
      await query(`
        INSERT INTO branch_sync_log (
          source_branch_id, 
          sync_type, 
          table_name, 
          records_synced, 
          status, 
          completed_at,
          sync_data
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
      `, [
        parseInt(currentBranchResult.rows[0].branch_id),
        syncType || 'manual',
        'multiple',
        recordsCount || 0,
        'completed',
        JSON.stringify({ 
          sync_timestamp: syncTimestamp,
          triggered_by: req.user.id 
        })
      ]);
    }

    res.json({
      success: true,
      message: 'Sync status updated successfully',
      data: {
        syncTimestamp: syncTimestamp || new Date().toISOString(),
        recordsCount: recordsCount || 0
      }
    });

  } catch (error) {
    console.error('Error updating sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sync status',
      error: error.message
    });
  }
});

module.exports = router;