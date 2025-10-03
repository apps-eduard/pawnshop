// Transaction Configuration Endpoints
// =============================================

// Get transaction configuration
router.get('/transaction-config', async (req, res) => {
  try {
    console.log(`📋 [${new Date().toISOString()}] Admin fetching transaction config - User: ${req.user?.username || 'Unauthenticated'}`);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access transaction configuration'
      });
    }
    
    const result = await pool.query(`
      SELECT config_value 
      FROM system_config 
      WHERE config_key = 'transaction_number_format'
      LIMIT 1
    `);
    
    let config = {
      prefix: 'TXN',
      includeYear: true,
      includeMonth: true,
      includeDay: true,
      sequenceDigits: 2,
      branchCodePrefix: true,
      separator: '-'
    };
    
    if (result.rows.length > 0) {
      config = { ...config, ...JSON.parse(result.rows[0].config_value) };
    }
    
    console.log('✅ Transaction config retrieved:', config);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ Error fetching transaction configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction configuration'
    });
  }
});

// Update transaction configuration
router.put('/transaction-config', async (req, res) => {
  try {
    console.log(`⚙️ [${new Date().toISOString()}] Admin updating transaction config - User: ${req.user?.username || 'Unauthenticated'}`);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to update transaction configuration'
      });
    }
    
    const {
      prefix,
      includeYear,
      includeMonth,
      includeDay,
      sequenceDigits,
      branchCodePrefix,
      separator
    } = req.body;
    
    // Validate required fields
    if (!prefix || typeof sequenceDigits !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid configuration data'
      });
    }
    
    const config = {
      prefix: prefix.toUpperCase(),
      includeYear: !!includeYear,
      includeMonth: !!includeMonth,
      includeDay: !!includeDay,
      sequenceDigits: parseInt(sequenceDigits),
      branchCodePrefix: !!branchCodePrefix,
      separator: separator || '-'
    };
    
    // Insert or update configuration
    await pool.query(`
      INSERT INTO system_config (config_key, config_value, created_at, updated_at)
      VALUES ('transaction_number_format', $1, NOW(), NOW())
      ON CONFLICT (config_key)
      DO UPDATE SET 
        config_value = $1,
        updated_at = NOW()
    `, [JSON.stringify(config)]);
    
    console.log('✅ Transaction configuration updated:', config);
    
    res.json({
      success: true,
      message: 'Transaction configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('❌ Error updating transaction configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction configuration'
    });
  }
});

module.exports = router;