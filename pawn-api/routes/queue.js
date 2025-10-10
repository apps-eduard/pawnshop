const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// =============================================
// PAWNER QUEUE MANAGEMENT
// =============================================

/**
 * GET /api/queue
 * Get queue list (filtered by branch and status)
 * Accessible by: all employees, pawners (see only own entry)
 */
router.get('/', async (req, res) => {
  try {
    const { status, branch_id } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    console.log(`📋 [${new Date().toISOString()}] Fetching queue - User: ${req.user.username}, Role: ${userRole}`);

    let query = `
      SELECT 
        pq.id, pq.queue_number, pq.status, pq.is_new_pawner, pq.service_type,
        pq.joined_at, pq.called_at, pq.completed_at, pq.wait_time_minutes,
        pq.service_time_minutes, pq.notes,
        p.id as pawner_id, p.first_name, p.last_name, p.mobile_number, p.email,
        p.house_number as address, p.city_id, p.barangay_id,
        b.name as branch_name,
        e.username as processed_by_username,
        e.first_name as processed_by_first_name,
        e.last_name as processed_by_last_name
      FROM pawner_queue pq
      INNER JOIN pawners p ON pq.pawner_id = p.id
      LEFT JOIN branches b ON pq.branch_id = b.id
      LEFT JOIN employees e ON pq.processed_by = e.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // If pawner role, only show their own queue entries
    if (userRole === 'pawner') {
      query += ` AND pq.pawner_id = $${paramCount++}`;
      params.push(userId);
    }

    // Filter by status
    if (status) {
      query += ` AND pq.status = $${paramCount++}`;
      params.push(status);
    }

    // Filter by branch
    if (branch_id) {
      query += ` AND pq.branch_id = $${paramCount++}`;
      params.push(branch_id);
    } else if (req.user.branch_id && userRole !== 'administrator' && userRole !== 'pawner') {
      // Non-admin employees see their own branch
      query += ` AND pq.branch_id = $${paramCount++}`;
      params.push(req.user.branch_id);
    }

    query += ` ORDER BY pq.joined_at ASC`;

    const result = await pool.query(query, params);

    console.log(`✅ Found ${result.rows.length} queue entries`);

    res.json({
      success: true,
      message: 'Queue retrieved successfully',
      data: result.rows.map(row => ({
        id: row.id,
        queueNumber: row.queue_number,
        status: row.status,
        isNewPawner: row.is_new_pawner,
        serviceType: row.service_type,
        joinedAt: row.joined_at,
        calledAt: row.called_at,
        completedAt: row.completed_at,
        waitTimeMinutes: row.wait_time_minutes,
        serviceTimeMinutes: row.service_time_minutes,
        notes: row.notes,
        pawner: {
          id: row.pawner_id,
          firstName: row.first_name,
          lastName: row.last_name,
          mobileNumber: row.mobile_number,
          email: row.email,
          address: row.address,
          cityId: row.city_id,
          barangayId: row.barangay_id
        },
        branchName: row.branch_name,
        processedBy: row.processed_by_username ? {
          username: row.processed_by_username,
          firstName: row.processed_by_first_name,
          lastName: row.processed_by_last_name
        } : null
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching queue:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching queue'
    });
  }
});

/**
 * POST /api/queue
 * Join the queue (create new queue entry)
 * Accessible by: pawners, cashiers, appraisers
 */
router.post('/', async (req, res) => {
  try {
    const {
      pawnerId,
      serviceType,
      isNewPawner = false,
      notes
    } = req.body;

    // Validation
    if (!pawnerId || !serviceType) {
      return res.status(400).json({
        success: false,
        message: 'Pawner ID and service type are required'
      });
    }

    const validServiceTypes = ['new_loan', 'renew', 'redeem', 'additional_loan', 'inquiry'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type'
      });
    }

    console.log(`🎫 [${new Date().toISOString()}] Adding pawner ${pawnerId} to queue - Service: ${serviceType}`);

    const branchId = req.user.branch_id || 1; // Default to main branch

    // Generate queue number (e.g., Q001, Q002)
    const queueCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM pawner_queue WHERE branch_id = $1 AND DATE(joined_at) = CURRENT_DATE',
      [branchId]
    );
    const queueCount = parseInt(queueCountResult.rows[0].count) + 1;
    const queueNumber = `Q${String(queueCount).padStart(3, '0')}`;

    // Insert queue entry
    const result = await pool.query(`
      INSERT INTO pawner_queue (
        pawner_id, branch_id, queue_number, status, is_new_pawner, service_type, notes
      )
      VALUES ($1, $2, $3, 'waiting', $4, $5, $6)
      RETURNING *
    `, [pawnerId, branchId, queueNumber, isNewPawner, serviceType, notes]);

    console.log(`✅ Pawner added to queue: ${queueNumber}`);

    res.status(201).json({
      success: true,
      message: 'Successfully joined the queue',
      data: {
        id: result.rows[0].id,
        queueNumber: result.rows[0].queue_number,
        status: result.rows[0].status,
        isNewPawner: result.rows[0].is_new_pawner,
        serviceType: result.rows[0].service_type,
        joinedAt: result.rows[0].joined_at
      }
    });
  } catch (error) {
    console.error('❌ Error joining queue:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining queue'
    });
  }
});

/**
 * PUT /api/queue/:id/status
 * Update queue entry status
 * Accessible by: cashiers, appraisers, administrators
 */
router.put('/:id/status', authorizeRoles('admin', 'administrator', 'cashier', 'appraiser'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['waiting', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    console.log(`🔄 [${new Date().toISOString()}] Updating queue ${id} status to: ${status}`);

    const currentQueueResult = await pool.query('SELECT * FROM pawner_queue WHERE id = $1', [id]);
    if (currentQueueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const currentQueue = currentQueueResult.rows[0];
    const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status, id];
    let paramCount = 3;

    // Set called_at when status changes to processing
    if (status === 'processing' && !currentQueue.called_at) {
      updates.push(`called_at = CURRENT_TIMESTAMP`);
      updates.push(`processed_by = $${paramCount++}`);
      params.splice(2, 0, req.user.id);
    }

    // Set completed_at and calculate times when status changes to completed
    if (status === 'completed' && !currentQueue.completed_at) {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
      updates.push(`wait_time_minutes = EXTRACT(EPOCH FROM (called_at - joined_at)) / 60`);
      updates.push(`service_time_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - called_at)) / 60`);
    }

    const query = `UPDATE pawner_queue SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, params);

    console.log(`✅ Queue status updated: ${id} → ${status}`);

    res.json({
      success: true,
      message: 'Queue status updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating queue status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating queue status'
    });
  }
});

/**
 * DELETE /api/queue/:id
 * Remove entry from queue (cancel)
 * Accessible by: administrators, the pawner themselves
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ [${new Date().toISOString()}] Removing queue entry ${id}`);

    // Check if entry exists and user has permission
    const queueEntry = await pool.query('SELECT * FROM pawner_queue WHERE id = $1', [id]);
    if (queueEntry.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    // Pawners can only remove their own entries
    if (req.user.role === 'pawner' && queueEntry.rows[0].pawner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove your own queue entries'
      });
    }

    await pool.query('DELETE FROM pawner_queue WHERE id = $1', [id]);

    console.log(`✅ Queue entry removed: ${id}`);

    res.json({
      success: true,
      message: 'Queue entry removed successfully'
    });
  } catch (error) {
    console.error('❌ Error removing queue entry:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing queue entry'
    });
  }
});

module.exports = router;
