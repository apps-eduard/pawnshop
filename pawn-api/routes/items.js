const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all items
router.get('/', async (req, res) => {
  try {
    console.log(`🔍 [${new Date().toISOString()}] Fetching items - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pi.id, pi.item_type, pi.brand, pi.model, pi.description, 
             pi.estimated_value, pi.condition_notes, pi.serial_number, 
             pi.weight, pi.karat, pi.created_at,
             pt.ticket_number, pt.principal_amount, pt.status as ticket_status,
             p.first_name, p.last_name, p.contact_number
      FROM pawn_items pi
      LEFT JOIN pawn_tickets pt ON pi.ticket_id = pt.id
      LEFT JOIN pawners p ON pt.pawner_id = p.id
      ORDER BY pi.created_at DESC
    `);
    
    const items = result.rows.map(row => ({
      id: row.id,
      itemType: row.item_type,
      brand: row.brand,
      model: row.model,
      description: row.description,
      estimatedValue: parseFloat(row.estimated_value),
      conditionNotes: row.condition_notes,
      serialNumber: row.serial_number,
      weight: row.weight ? parseFloat(row.weight) : null,
      karat: row.karat,
      createdAt: row.created_at,
      ticketNumber: row.ticket_number,
      principalAmount: row.principal_amount ? parseFloat(row.principal_amount) : null,
      ticketStatus: row.ticket_status,
      pawnerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
      pawnerContact: row.contact_number
    }));
    
    console.log(`✅ Found ${items.length} items`);
    
    res.json({
      success: true,
      message: 'Items retrieved successfully',
      data: items
    });
    
  } catch (error) {
    console.error('❌ Error fetching items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message
    });
  }
});

// Get single item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 [${new Date().toISOString()}] Fetching item ${id} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pi.id, pi.ticket_id, pi.item_type, pi.brand, pi.model, pi.description, 
             pi.estimated_value, pi.condition_notes, pi.serial_number, 
             pi.weight, pi.karat, pi.created_at,
             pt.ticket_number, pt.principal_amount, pt.status as ticket_status,
             p.id as pawner_id, p.first_name, p.last_name, p.contact_number
      FROM pawn_items pi
      LEFT JOIN pawn_tickets pt ON pi.ticket_id = pt.id
      LEFT JOIN pawners p ON pt.pawner_id = p.id
      WHERE pi.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    const row = result.rows[0];
    const item = {
      id: row.id,
      ticketId: row.ticket_id,
      itemType: row.item_type,
      brand: row.brand,
      model: row.model,
      description: row.description,
      estimatedValue: parseFloat(row.estimated_value),
      conditionNotes: row.condition_notes,
      serialNumber: row.serial_number,
      weight: row.weight ? parseFloat(row.weight) : null,
      karat: row.karat,
      createdAt: row.created_at,
      ticketNumber: row.ticket_number,
      principalAmount: row.principal_amount ? parseFloat(row.principal_amount) : null,
      ticketStatus: row.ticket_status,
      pawnerId: row.pawner_id,
      pawnerName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null,
      pawnerContact: row.contact_number
    };
    
    res.json({
      success: true,
      message: 'Item retrieved successfully',
      data: item
    });
    
  } catch (error) {
    console.error('❌ Error fetching item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error.message
    });
  }
});

// Create new item
router.post('/', authorizeRoles(['admin', 'manager']), async (req, res) => {
  try {
    const {
      ticketId,
      itemType,
      brand,
      model,
      description,
      estimatedValue,
      conditionNotes,
      serialNumber,
      weight,
      karat
    } = req.body;
    
    console.log(`📦 [${new Date().toISOString()}] Creating item for ticket ${ticketId} - User: ${req.user.username}`);
    
    // Validate required fields
    if (!ticketId || !itemType || !description || !estimatedValue) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ticketId, itemType, description, estimatedValue'
      });
    }
    
    // Verify ticket exists
    const ticketCheck = await pool.query('SELECT id FROM pawn_tickets WHERE id = $1', [ticketId]);
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pawn ticket not found'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO pawn_items (
        ticket_id, item_type, brand, model, description, 
        estimated_value, condition_notes, serial_number, weight, karat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      ticketId, itemType, brand, model, description,
      estimatedValue, conditionNotes, serialNumber, weight, karat
    ]);
    
    const newItem = {
      id: result.rows[0].id,
      ticketId: result.rows[0].ticket_id,
      itemType: result.rows[0].item_type,
      brand: result.rows[0].brand,
      model: result.rows[0].model,
      description: result.rows[0].description,
      estimatedValue: parseFloat(result.rows[0].estimated_value),
      conditionNotes: result.rows[0].condition_notes,
      serialNumber: result.rows[0].serial_number,
      weight: result.rows[0].weight ? parseFloat(result.rows[0].weight) : null,
      karat: result.rows[0].karat,
      createdAt: result.rows[0].created_at
    };
    
    console.log(`✅ Created item ${newItem.id} for ticket ${ticketId}`);
    
    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: newItem
    });
    
  } catch (error) {
    console.error('❌ Error creating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item',
      error: error.message
    });
  }
});

// Update item
router.put('/:id', authorizeRoles(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      itemType,
      brand,
      model,
      description,
      estimatedValue,
      conditionNotes,
      serialNumber,
      weight,
      karat
    } = req.body;
    
    console.log(`📝 [${new Date().toISOString()}] Updating item ${id} - User: ${req.user.username}`);
    
    // Check if item exists
    const checkItem = await pool.query('SELECT id FROM pawn_items WHERE id = $1', [id]);
    if (checkItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    const result = await pool.query(`
      UPDATE pawn_items 
      SET item_type = $1, brand = $2, model = $3, description = $4,
          estimated_value = $5, condition_notes = $6, serial_number = $7,
          weight = $8, karat = $9
      WHERE id = $10
      RETURNING *
    `, [
      itemType, brand, model, description, estimatedValue,
      conditionNotes, serialNumber, weight, karat, id
    ]);
    
    const updatedItem = {
      id: result.rows[0].id,
      ticketId: result.rows[0].ticket_id,
      itemType: result.rows[0].item_type,
      brand: result.rows[0].brand,
      model: result.rows[0].model,
      description: result.rows[0].description,
      estimatedValue: parseFloat(result.rows[0].estimated_value),
      conditionNotes: result.rows[0].condition_notes,
      serialNumber: result.rows[0].serial_number,
      weight: result.rows[0].weight ? parseFloat(result.rows[0].weight) : null,
      karat: result.rows[0].karat,
      createdAt: result.rows[0].created_at
    };
    
    console.log(`✅ Updated item ${id}`);
    
    res.json({
      success: true,
      message: 'Item updated successfully',
      data: updatedItem
    });
    
  } catch (error) {
    console.error('❌ Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error.message
    });
  }
});

// Delete item
router.delete('/:id', authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [${new Date().toISOString()}] Deleting item ${id} - User: ${req.user.username}`);
    
    const result = await pool.query('DELETE FROM pawn_items WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    console.log(`✅ Deleted item ${id}`);
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error.message
    });
  }
});

// Get items by ticket ID
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    console.log(`🎫 [${new Date().toISOString()}] Fetching items for ticket ${ticketId} - User: ${req.user.username}`);
    
    const result = await pool.query(`
      SELECT pi.id, pi.item_type, pi.brand, pi.model, pi.description, 
             pi.estimated_value, pi.condition_notes, pi.serial_number, 
             pi.weight, pi.karat, pi.created_at
      FROM pawn_items pi
      WHERE pi.ticket_id = $1
      ORDER BY pi.created_at ASC
    `, [ticketId]);
    
    const items = result.rows.map(row => ({
      id: row.id,
      itemType: row.item_type,
      brand: row.brand,
      model: row.model,
      description: row.description,
      estimatedValue: parseFloat(row.estimated_value),
      conditionNotes: row.condition_notes,
      serialNumber: row.serial_number,
      weight: row.weight ? parseFloat(row.weight) : null,
      karat: row.karat,
      createdAt: row.created_at
    }));
    
    console.log(`✅ Found ${items.length} items for ticket ${ticketId}`);
    
    res.json({
      success: true,
      message: 'Items retrieved successfully',
      data: items
    });
    
  } catch (error) {
    console.error('❌ Error fetching items by ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error.message
    });
  }
});

module.exports = router;