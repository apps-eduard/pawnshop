const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all menu items with hierarchy
router.get('/menu-items', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM menu_items WHERE parent_id = m.id) as children_count
      FROM menu_items m
      LEFT JOIN menu_items p ON m.parent_id = p.id
      ORDER BY COALESCE(m.parent_id, m.id), m.order_index
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get parent menus only (for dropdown selection)
router.get('/parent-menus', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, icon, route
      FROM menu_items 
      WHERE parent_id IS NULL 
      AND is_active = true
      ORDER BY order_index
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching parent menus:', error);
    res.status(500).json({ error: 'Failed to fetch parent menus' });
  }
});

// Get single menu item
router.get('/menu-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        m.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM menu_items WHERE parent_id = m.id) as children_count
      FROM menu_items m
      LEFT JOIN menu_items p ON m.parent_id = p.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Create new menu item
router.post('/menu-items', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, route, icon, parent_id, order_index, description, is_active = true } = req.body;

    // Validate required fields
    if (!name || !route || !icon) {
      return res.status(400).json({ error: 'Name, route, and icon are required' });
    }

    await client.query('BEGIN');

    // Get the next order_index if not provided
    let finalOrderIndex = order_index;
    if (!finalOrderIndex) {
      const result = await client.query(`
        SELECT COALESCE(MAX(order_index), 0) + 1 as next_order
        FROM menu_items 
        WHERE COALESCE(parent_id, 0) = COALESCE($1, 0)
      `, [parent_id]);
      finalOrderIndex = result.rows[0].next_order;
    }

    const insertResult = await client.query(`
      INSERT INTO menu_items (name, route, icon, parent_id, order_index, description, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, route, icon, parent_id || null, finalOrderIndex, description || null, is_active]);

    await client.query('COMMIT');
    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  } finally {
    client.release();
  }
});

// Update menu item
router.put('/menu-items/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, route, icon, parent_id, order_index, description, is_active } = req.body;

    await client.query('BEGIN');

    // Check if menu item exists
    const checkResult = await client.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Prevent circular references (menu can't be its own parent)
    if (parent_id && parseInt(parent_id) === parseInt(id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Menu item cannot be its own parent' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (route !== undefined) {
      updates.push(`route = $${paramCount++}`);
      values.push(route);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramCount++}`);
      values.push(icon);
    }
    if (parent_id !== undefined) {
      updates.push(`parent_id = $${paramCount++}`);
      values.push(parent_id || null);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(order_index);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateResult = await client.query(`
      UPDATE menu_items 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  } finally {
    client.release();
  }
});

// Delete menu item
router.delete('/menu-items/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if menu has children
    const childrenResult = await client.query(
      'SELECT COUNT(*) as count FROM menu_items WHERE parent_id = $1',
      [id]
    );

    if (parseInt(childrenResult.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot delete menu item with children. Please reassign or delete children first.' 
      });
    }

    const deleteResult = await client.query(
      'DELETE FROM menu_items WHERE id = $1 RETURNING *',
      [id]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Menu item deleted successfully', deleted: deleteResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  } finally {
    client.release();
  }
});

// Reorder menu items
router.put('/menu-items/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const { items } = req.body; // Array of { id, order_index }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    await client.query('BEGIN');

    for (const item of items) {
      await client.query(
        'UPDATE menu_items SET order_index = $1, updated_at = NOW() WHERE id = $2',
        [item.order_index, item.id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Menu items reordered successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering menu items:', error);
    res.status(500).json({ error: 'Failed to reorder menu items' });
  } finally {
    client.release();
  }
});

module.exports = router;
