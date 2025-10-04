const { pool } = require('../config/database');

/**
 * Generate transaction number based on configuration
 * @param {Object} config - Transaction number configuration
 * @param {number} sequenceNumber - The sequence number for this transaction
 * @returns {string} - Generated transaction number
 */
function generateTransactionNumber(config, sequenceNumber) {
  const now = new Date();
  const parts = [];
  
  // Add prefix
  if (config.prefix) {
    parts.push(config.prefix);
  }
  
  // Build date part (concatenated without separators)
  let datePart = '';
  if (config.includeYear) {
    datePart += now.getFullYear().toString();
  }
  if (config.includeMonth) {
    datePart += String(now.getMonth() + 1).padStart(2, '0');
  }
  if (config.includeDay) {
    datePart += String(now.getDate()).padStart(2, '0');
  }
  
  // Add date part if any date components are enabled
  if (datePart) {
    parts.push(datePart);
  }
  
  // Add sequence number
  const digits = config.sequenceDigits || 6;
  parts.push(String(sequenceNumber).padStart(digits, '0'));
  
  // Join with separator
  const separator = config.separator || '-';
  return parts.join(separator);
}

/**
 * Get transaction configuration from database
 * @returns {Object} - Transaction configuration object
 */
async function getTransactionConfig() {
  try {
    const result = await pool.query(`
      SELECT config_value 
      FROM system_config 
      WHERE config_key = 'transaction_number_format'
      LIMIT 1
    `);
    
    // Default configuration
    let config = {
      prefix: 'TXN',
      includeYear: true,
      includeMonth: true,
      includeDay: false,
      sequenceDigits: 6,
      separator: '-'
    };
    
    // Override with database config if exists
    if (result.rows.length > 0) {
      const dbConfig = JSON.parse(result.rows[0].config_value);
      config = { ...config, ...dbConfig };
    }
    
    return config;
  } catch (error) {
    console.error('Error fetching transaction config:', error);
    // Return default config on error
    return {
      prefix: 'TXN',
      includeYear: true,
      includeMonth: true,
      includeDay: false,
      sequenceDigits: 6,
      separator: '-'
    };
  }
}

/**
 * Get next sequence number from the existing transaction_sequences table
 * @param {string} sequenceType - Type of sequence (e.g., 'TICKET', 'LOAN', 'PAYMENT')
 * @param {number} branchId - Branch ID
 * @returns {number} - Next sequence number
 */
async function getNextSequenceNumber(sequenceType = 'TICKET', branchId = 1) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Check if sequence exists for this branch, type, and year
    const existingSeq = await pool.query(`
      SELECT id, current_number, reset_frequency, last_reset_date 
      FROM transaction_sequences 
      WHERE branch_id = $1 AND sequence_type = $2 AND year = $3
    `, [branchId, sequenceType, currentYear]);
    
    let sequenceId;
    let currentNumber = 0;
    
    if (existingSeq.rows.length === 0) {
      // Create new sequence for this year
      const newSeq = await pool.query(`
        INSERT INTO transaction_sequences (
          branch_id, sequence_type, current_number, prefix, suffix, 
          year, month, reset_frequency, last_reset_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, current_number
      `, [branchId, sequenceType, 1, 'PT', '', currentYear, currentMonth, 'yearly', new Date()]);
      
      sequenceId = newSeq.rows[0].id;
      currentNumber = newSeq.rows[0].current_number;
    } else {
      // Check if reset is needed based on reset frequency
      const seq = existingSeq.rows[0];
      const lastResetDate = new Date(seq.last_reset_date);
      let shouldReset = false;
      
      if (seq.reset_frequency === 'yearly' && lastResetDate.getFullYear() < currentYear) {
        shouldReset = true;
      } else if (seq.reset_frequency === 'monthly' && 
                (lastResetDate.getFullYear() < currentYear || lastResetDate.getMonth() + 1 < currentMonth)) {
        shouldReset = true;
      }
      
      if (shouldReset) {
        // Reset sequence
        const resetSeq = await pool.query(`
          UPDATE transaction_sequences 
          SET current_number = 1, last_reset_date = $1, month = $2
          WHERE id = $3
          RETURNING current_number
        `, [new Date(), currentMonth, seq.id]);
        currentNumber = resetSeq.rows[0].current_number;
      } else {
        // Increment sequence
        const incSeq = await pool.query(`
          UPDATE transaction_sequences 
          SET current_number = current_number + 1 
          WHERE id = $1
          RETURNING current_number
        `, [seq.id]);
        currentNumber = incSeq.rows[0].current_number;
      }
    }
    
    return currentNumber;
  } catch (error) {
    console.error('Error getting sequence number:', error);
    // Fallback to timestamp-based number
    return Date.now() % 1000000;
  }
}

/**
 * Generate a complete transaction number
 * @param {string} sequenceType - Type of sequence (e.g., 'TICKET', 'LOAN', 'PAYMENT')
 * @param {number} branchId - Branch ID
 * @returns {string} - Generated transaction number
 */
async function generateCompleteTransactionNumber(sequenceType = 'TICKET', branchId = 1) {
  try {
    const config = await getTransactionConfig();
    const sequenceNumber = await getNextSequenceNumber(sequenceType, branchId);
    return generateTransactionNumber(config, sequenceNumber);
  } catch (error) {
    console.error('Error generating transaction number:', error);
    // Fallback generation
    const now = new Date();
    const fallbackNumber = `PT${now.getFullYear()}-${String(Date.now() % 1000000).padStart(6, '0')}`;
    return fallbackNumber;
  }
}

/**
 * Generate ticket number specifically for pawn transactions
 * @param {number} branchId - Branch ID
 * @returns {string} - Generated ticket number
 */
async function generateTicketNumber(branchId = 1) {
  return generateCompleteTransactionNumber('TICKET', branchId);
}

module.exports = {
  generateTransactionNumber,
  getTransactionConfig,
  getNextSequenceNumber,
  generateCompleteTransactionNumber,
  generateTicketNumber
};