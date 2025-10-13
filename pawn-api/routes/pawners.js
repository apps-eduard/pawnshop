const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================
// PAWNERS MANAGEMENT
// =============================================

// Search pawners (must be before /:id route)
router.get('/search', async (req, res) => {
  console.log(`🔍 [${new Date().toISOString()}] PAWNER SEARCH REQUEST:`, {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 20)}...` : 'MISSING',
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    },
    user: req.user ? { id: req.user.id, username: req.user.username, role: req.user.role } : 'NOT_AUTHENTICATED',
    ip: req.ip || req.connection.remoteAddress
  });

  try {
    const { q } = req.query;
    
    if (!q) {
      console.log(`❌ [${new Date().toISOString()}] Search query missing`);
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    console.log(`🔍 [${new Date().toISOString()}] Searching pawners: "${q}" - User: ${req.user?.username || 'UNKNOWN'}`);
    
    const result = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, p.mobile_number, p.email,
             a.address_details as address, p.id_type, p.id_number, p.birth_date, p.is_active,
             p.created_at, p.updated_at
      FROM pawners p
      LEFT JOIN addresses a ON p.address_id = a.id
      WHERE p.is_active = true
        AND (
          LOWER(p.first_name) LIKE LOWER($1) OR
          LOWER(p.last_name) LIKE LOWER($1) OR
          p.mobile_number LIKE $1 OR
          LOWER(p.email) LIKE LOWER($1)
        )
      ORDER BY p.first_name ASC, p.last_name ASC
      LIMIT 50
    `, [`%${q}%`]);
    
    const mappedResults = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      contactNumber: row.mobile_number,
      email: row.email,
      address: row.address,
      idType: row.id_type,
      idNumber: row.id_number,
      birthDate: row.birth_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    console.log(`✅ [${new Date().toISOString()}] Found ${result.rows.length} pawners matching: "${q}"`);
    console.log(`📊 [${new Date().toISOString()}] Search results:`, mappedResults.map(r => `${r.firstName} ${r.lastName} (ID: ${r.id})`));
    
    const response = {
      success: true,
      message: 'Pawners found successfully',
      data: mappedResults
    };

    console.log(`📤 [${new Date().toISOString()}] Sending response:`, { 
      success: response.success, 
      message: response.message, 
      dataCount: response.data.length 
    });

    res.json(response);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Error searching pawners:`, {
      error: error.message,
      stack: error.stack,
      query: req.query,
      user: req.user?.username || 'UNKNOWN'
    });
    res.status(500).json({
      success: false,
      message: 'Error searching pawners'
    });
  }
});

// Get all pawners
router.get('/', async (req, res) => {
  try {
    console.log(`👤 [${new Date().toISOString()}] Fetching pawners - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, p.mobile_number as contact_number, p.email,
             p.address_id, a.city_id, a.barangay_id, a.address_details, p.is_active,
             p.created_at, p.updated_at,
             c.name as city_name, b.name as barangay_name
      FROM pawners p
      LEFT JOIN addresses a ON p.address_id = a.id
      LEFT JOIN cities c ON a.city_id = c.id
      LEFT JOIN barangays b ON a.barangay_id = b.id
      ORDER BY p.created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} pawners`);
    
    res.json({
      success: true,
      message: 'Pawners retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        contactNumber: row.contact_number,
        email: row.email,
        addressId: row.address_id,
        cityId: row.city_id,
        barangayId: row.barangay_id,
        addressDetails: row.address_details,
        cityName: row.city_name,
        barangayName: row.barangay_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching pawners:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pawners'
    });
  }
});

// Get pawner by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 [${new Date().toISOString()}] Fetching pawner ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, p.mobile_number as contact_number, p.email,
             p.address_id, a.city_id, a.barangay_id, a.address_details, p.is_active,
             p.created_at, p.updated_at,
             c.name as city_name, b.name as barangay_name
      FROM pawners p
      LEFT JOIN addresses a ON p.address_id = a.id
      LEFT JOIN cities c ON a.city_id = c.id
      LEFT JOIN barangays b ON a.barangay_id = b.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pawner not found'
      });
    }
    
    const row = result.rows[0];
    
    res.json({
      success: true,
      message: 'Pawner retrieved successfully',
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        contactNumber: row.contact_number,
        email: row.email,
        addressId: row.address_id,
        cityId: row.city_id,
        barangayId: row.barangay_id,
        addressDetails: row.address_details,
        cityName: row.city_name,
        barangayName: row.barangay_name,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error fetching pawner:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pawner'
    });
  }
});

// Create new pawner
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      contactNumber,
      email,
      cityId,
      barangayId,
      addressDetails,
      isActive = true
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: First name, last name, and contact number are required'
      });
    }
    
    // Use default values for optional fields if not provided
    const safeAddressDetails = addressDetails || 'No address details';
    const safeCityId = cityId || null;
    const safeBarangayId = barangayId || null;
    
    console.log(`➕ [${new Date().toISOString()}] Creating pawner: ${firstName} ${lastName} - User: ${req.user.username}`);
    
    // Log if contact number already exists (but allow it)
    const existingPawner = await pool.query(
      'SELECT id, first_name, last_name FROM pawners WHERE mobile_number = $1',
      [contactNumber]
    );
    
    if (existingPawner.rows.length > 0) {
      const existing = existingPawner.rows[0];
      console.log(`⚠️ Note: Contact number ${contactNumber} already exists for pawner: ${existing.first_name} ${existing.last_name} (ID: ${existing.id}), but creating anyway as requested`);
      // We no longer return an error - allowing duplicate contact numbers
    }
    
    // Get current branch ID
    const branchResult = await pool.query(`
      SELECT config_value as branch_id 
      FROM system_config 
      WHERE config_key = 'current_branch_id'
    `);
    const currentBranchId = branchResult.rows.length > 0 ? parseInt(branchResult.rows[0].branch_id) : 1;

    // Create or find address first (if city and barangay provided)
    let addressId = null;
    if (safeCityId && safeBarangayId) {
      // Try to find existing address
      const existingAddress = await pool.query(`
        SELECT id FROM addresses 
        WHERE city_id = $1 AND barangay_id = $2 AND address_details = $3
      `, [safeCityId, safeBarangayId, safeAddressDetails]);

      if (existingAddress.rows.length > 0) {
        addressId = existingAddress.rows[0].id;
        console.log(`♻️ Using existing address: ${addressId}`);
      } else {
        // Create new address
        const newAddress = await pool.query(`
          INSERT INTO addresses (city_id, barangay_id, address_details)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [safeCityId, safeBarangayId, safeAddressDetails]);
        addressId = newAddress.rows[0].id;
        console.log(`➕ Created new address: ${addressId}`);
      }
    }

    const result = await pool.query(`
      INSERT INTO pawners (first_name, last_name, mobile_number, email, address_id, branch_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, first_name, last_name, mobile_number as contact_number, email, address_id, branch_id, is_active, created_at, updated_at
    `, [firstName, lastName, contactNumber, email, addressId, currentBranchId, isActive]);
    
    const row = result.rows[0];
    
    // Assign 'pawner' role to the newly created pawner
    try {
      const pawnerRoleResult = await pool.query(`SELECT id FROM roles WHERE name = 'pawner'`);
      if (pawnerRoleResult.rows.length > 0) {
        const pawnerRoleId = pawnerRoleResult.rows[0].id;
        await pool.query(`
          INSERT INTO pawner_roles (pawner_id, role_id, assigned_by, is_primary)
          VALUES ($1, $2, $3, true)
        `, [row.id, pawnerRoleId, req.user.id]);
        console.log(`✅ Assigned 'pawner' role to pawner ${row.id}`);
      } else {
        console.warn(`⚠️ Warning: 'pawner' role not found in system. Run migrations to add it.`);
      }
    } catch (roleError) {
      console.error(`⚠️ Error assigning pawner role (non-critical):`, roleError.message);
      // Don't fail the whole operation if role assignment fails
    }
    
    console.log(`✅ Pawner created: ${firstName} ${lastName} (ID: ${row.id})`);
    
    res.status(201).json({
      success: true,
      message: 'Pawner created successfully',
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        contactNumber: row.contact_number,
        email: row.email,
        addressId: row.address_id,
        cityId: safeCityId,
        barangayId: safeBarangayId,
        addressDetails: safeAddressDetails,
        branchId: row.branch_id,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating pawner:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating pawner'
    });
  }
});

// Update pawner
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      contactNumber,
      email,
      cityId,
      barangayId,
      addressDetails,
      isActive
    } = req.body;
    
    console.log(`📝 [${new Date().toISOString()}] Updating pawner ${id} - User: ${req.user.username}`);
    
    // Check if pawner exists
    const existingPawner = await pool.query('SELECT id FROM pawners WHERE id = $1', [id]);
    if (existingPawner.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pawner not found'
      });
    }
    
    // Log if contact number already exists (but allow it)
    if (contactNumber) {
      const conflicts = await pool.query(
        'SELECT id, first_name, last_name FROM pawners WHERE mobile_number = $1 AND id != $2',
        [contactNumber, id]
      );
      
      if (conflicts.rows.length > 0) {
        const existing = conflicts.rows[0];
        console.log(`⚠️ Note: Contact number ${contactNumber} already exists for pawner: ${existing.first_name} ${existing.last_name} (ID: ${existing.id}), but updating anyway as requested`);
        // We no longer return an error - allowing duplicate contact numbers
      }
    }
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (firstName !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (contactNumber !== undefined) {
      fields.push(`mobile_number = $${paramCount++}`);
      values.push(contactNumber);
    }
    if (email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(email);
    }
    
    // Handle address update - update or create address record
    if (cityId !== undefined || barangayId !== undefined || addressDetails !== undefined) {
      // Get current pawner address info
      const currentPawner = await pool.query(
        'SELECT address_id FROM pawners WHERE id = $1',
        [id]
      );
      
      let currentAddressId = currentPawner.rows[0].address_id;
      let finalCityId = cityId;
      let finalBarangayId = barangayId;
      let finalAddressDetails = addressDetails;
      
      // If updating address but some fields not provided, get current values
      if (currentAddressId && (cityId === undefined || barangayId === undefined || addressDetails === undefined)) {
        const currentAddress = await pool.query(
          'SELECT city_id, barangay_id, address_details FROM addresses WHERE id = $1',
          [currentAddressId]
        );
        
        if (currentAddress.rows.length > 0) {
          finalCityId = cityId !== undefined ? cityId : currentAddress.rows[0].city_id;
          finalBarangayId = barangayId !== undefined ? barangayId : currentAddress.rows[0].barangay_id;
          finalAddressDetails = addressDetails !== undefined ? addressDetails : currentAddress.rows[0].address_details;
        }
      }
      
      // Only proceed if we have both city and barangay
      if (finalCityId && finalBarangayId) {
        // Check if address already exists
        const existingAddress = await pool.query(`
          SELECT id FROM addresses 
          WHERE city_id = $1 AND barangay_id = $2 AND address_details = $3
        `, [finalCityId, finalBarangayId, finalAddressDetails || 'No address details']);
        
        let newAddressId;
        if (existingAddress.rows.length > 0) {
          newAddressId = existingAddress.rows[0].id;
          console.log(`♻️ Using existing address: ${newAddressId}`);
        } else {
          // Create new address
          const createdAddress = await pool.query(`
            INSERT INTO addresses (city_id, barangay_id, address_details)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [finalCityId, finalBarangayId, finalAddressDetails || 'No address details']);
          newAddressId = createdAddress.rows[0].id;
          console.log(`➕ Created new address: ${newAddressId}`);
        }
        
        // Update pawner's address_id
        fields.push(`address_id = $${paramCount++}`);
        values.push(newAddressId);
      }
    }
    
    if (isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `UPDATE pawners SET ${fields.join(', ')} WHERE id = $${paramCount}`;
    await pool.query(query, values);
    
    console.log(`✅ Pawner updated: ${id}`);
    
    res.json({
      success: true,
      message: 'Pawner updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating pawner:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating pawner'
    });
  }
});

// Delete pawner (Admin only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access required'
    });
  }

  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Deleting pawner ${id} - User: ${req.user.username}`);
    
    const result = await pool.query('DELETE FROM pawners WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pawner not found'
      });
    }
    
    console.log(`✅ Pawner deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Pawner deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting pawner:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting pawner'
    });
  }
});

module.exports = router;