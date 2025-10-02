const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📊 [Categories API] Getting all categories');
    
    const result = await pool.query(`
      SELECT * FROM categories 
      WHERE is_active = true 
      ORDER BY name
    `);

    res.json({
      success: true,
      data: result.rows.map(category => ({
        ...category,
        displayName: `${category.name} ${category.interest_rate}%`,
        interest_rate: parseFloat(category.interest_rate)
      })),
      message: 'Categories retrieved successfully'
    });

  } catch (error) {
    console.error('❌ [Categories API] Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving categories',
      error: error.message
    });
  }
});

// Get category descriptions by category ID
router.get('/:categoryId/descriptions', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log(`📊 [Categories API] Getting descriptions for category ${categoryId}`);
    
    const result = await pool.query(`
      SELECT cd.*, c.name as category_name
      FROM category_descriptions cd
      JOIN categories c ON cd.category_id = c.id
      WHERE cd.category_id = $1 AND cd.is_active = true
      ORDER BY cd.description
    `, [categoryId]);

    res.json({
      success: true,
      data: result.rows,
      message: 'Category descriptions retrieved successfully'
    });

  } catch (error) {
    console.error('❌ [Categories API] Error getting category descriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving category descriptions',
      error: error.message
    });
  }
});

// Create new category description
router.post('/:categoryId/descriptions', authenticateToken, async (req, res) => {
  // Check role authorization (same as cities/barangays)
  if (!['administrator', 'manager', 'cashier'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin, manager, or cashier access required'
    });
  }

  try {
    const { categoryId } = req.params;
    const { description } = req.body;
    
    console.log(`📊 [Categories API] Creating new description for category ${categoryId}:`, description);

    if (!description || description.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    // Check if category exists
    const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check for duplicate description within the same category (case-insensitive)
    const duplicateCheck = await pool.query(
      'SELECT id FROM category_descriptions WHERE LOWER(description) = LOWER($1) AND category_id = $2',
      [description.trim(), categoryId]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This description already exists for this category'
      });
    }

    // Insert new category description
    const result = await pool.query(`
      INSERT INTO category_descriptions (category_id, description)
      VALUES ($1, $2)
      RETURNING *
    `, [categoryId, description.trim()]);

    console.log('✅ [Categories API] Category description created:', result.rows[0]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Category description created successfully'
    });

  } catch (error) {
    console.error('❌ [Categories API] Error creating category description:', error);
    
    // Handle database constraint errors as fallback
    if (error.constraint === 'category_descriptions_category_id_description_key') {
      return res.status(409).json({
        success: false,
        message: 'This description already exists for this category'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating category description',
      error: error.message
    });
  }
});

// Get all categories with their descriptions
router.get('/with-descriptions', authenticateToken, async (req, res) => {
  try {
    console.log('📊 [Categories API] Getting all categories with descriptions');
    
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.interest_rate,
        c.notes,
        json_agg(
          json_build_object(
            'id', cd.id,
            'description', cd.description
          ) ORDER BY cd.description
        ) FILTER (WHERE cd.id IS NOT NULL) as descriptions
      FROM categories c
      LEFT JOIN category_descriptions cd ON c.id = cd.category_id AND cd.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.interest_rate, c.notes
      ORDER BY c.name
    `);

    res.json({
      success: true,
      data: result.rows.map(category => ({
        ...category,
        displayName: `${category.name} ${category.interest_rate}%`,
        interest_rate: parseFloat(category.interest_rate)
      })),
      message: 'Categories with descriptions retrieved successfully'
    });

  } catch (error) {
    console.error('❌ [Categories API] Error getting categories with descriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving categories with descriptions',
      error: error.message
    });
  }
});

module.exports = router;