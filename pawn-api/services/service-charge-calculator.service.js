const { pool } = require('../config/database');

/**
 * Dynamic Service Charge Calculator Service
 * Supports configurable service charge calculation rules
 */
class ServiceChargeCalculatorService {
  constructor() {
    this.configCache = new Map();
    this.bracketsCache = [];
    this.cacheExpiry = Date.now() + (5 * 60 * 1000); // Cache for 5 minutes
  }

  /**
   * Get service charge configuration from database with caching
   */
  async getServiceChargeConfig() {
    // Check if cache is still valid
    if (this.configCache.size > 0 && Date.now() < this.cacheExpiry) {
      return {
        config: Object.fromEntries(this.configCache),
        brackets: this.bracketsCache
      };
    }

    try {
      // Get general configuration
      const configResult = await pool.query(`
        SELECT config_key, config_value 
        FROM service_charge_config 
        WHERE is_active = TRUE 
        AND (effective_date IS NULL OR effective_date <= CURRENT_DATE)
      `);

      // Get bracket configuration
      const bracketsResult = await pool.query(`
        SELECT * FROM service_charge_brackets 
        WHERE is_active = TRUE 
        AND (effective_date IS NULL OR effective_date <= CURRENT_DATE)
        ORDER BY display_order, min_amount
      `);

      // Update cache
      this.configCache.clear();
      configResult.rows.forEach(row => {
        this.configCache.set(row.config_key, parseFloat(row.config_value));
      });
      
      this.bracketsCache = bracketsResult.rows.map(row => ({
        id: row.id,
        bracket_name: row.bracket_name,
        min_amount: parseFloat(row.min_amount),
        max_amount: row.max_amount ? parseFloat(row.max_amount) : null,
        service_charge: parseFloat(row.service_charge),
        display_order: row.display_order
      }));

      this.cacheExpiry = Date.now() + (5 * 60 * 1000);

      return {
        config: Object.fromEntries(this.configCache),
        brackets: this.bracketsCache
      };
    } catch (error) {
      console.error('Error fetching service charge config:', error);
      // Return default config if database fails
      return this.getDefaultConfig();
    }
  }

  /**
   * Default service charge configuration (fallback)
   */
  getDefaultConfig() {
    return {
      config: {
        calculation_method: 1, // bracket-based
        percentage_rate: 0.01,
        fixed_amount: 50,
        minimum_service_charge: 1,
        maximum_service_charge: 1000
      },
      brackets: [
        { id: 1, bracket_name: 'Bracket 1-100', min_amount: 1, max_amount: 100, service_charge: 1, display_order: 1 },
        { id: 2, bracket_name: 'Bracket 101-200', min_amount: 101, max_amount: 200, service_charge: 2, display_order: 2 },
        { id: 3, bracket_name: 'Bracket 201-300', min_amount: 201, max_amount: 300, service_charge: 3, display_order: 3 },
        { id: 4, bracket_name: 'Bracket 301-400', min_amount: 301, max_amount: 400, service_charge: 4, display_order: 4 },
        { id: 5, bracket_name: 'Bracket 500+', min_amount: 500, max_amount: null, service_charge: 5, display_order: 5 }
      ]
    };
  }

  /**
   * Calculate service charge based on current configuration
   * @param {number} principalAmount - The principal loan amount
   * @param {number} userId - User ID for logging (optional)
   * @returns {Object} Service charge calculation details
   */
  async calculateServiceCharge(principalAmount, userId = null) {
    try {
      const { config, brackets } = await this.getServiceChargeConfig();
      const amount = parseFloat(principalAmount);

      let serviceChargeAmount = 0;
      let calculationMethod = '';
      let bracketUsed = null;

      // Determine calculation method
      switch (config.calculation_method) {
        case 1: // Bracket-based (default)
          const result = this.calculateBracketBasedServiceCharge(amount, brackets);
          serviceChargeAmount = result.serviceCharge;
          calculationMethod = 'bracket';
          bracketUsed = result.bracket;
          break;

        case 2: // Percentage-based
          serviceChargeAmount = amount * config.percentage_rate;
          calculationMethod = 'percentage';
          break;

        case 3: // Fixed amount
          serviceChargeAmount = config.fixed_amount;
          calculationMethod = 'fixed';
          break;

        default:
          // Fallback to bracket-based
          const fallbackResult = this.calculateBracketBasedServiceCharge(amount, brackets);
          serviceChargeAmount = fallbackResult.serviceCharge;
          calculationMethod = 'bracket';
          bracketUsed = fallbackResult.bracket;
      }

      // Apply minimum and maximum limits
      serviceChargeAmount = Math.max(serviceChargeAmount, config.minimum_service_charge);
      serviceChargeAmount = Math.min(serviceChargeAmount, config.maximum_service_charge);

      // Round to 2 decimal places
      serviceChargeAmount = Math.round(serviceChargeAmount * 100) / 100;

      const calculationResult = {
        serviceChargeAmount,
        principalAmount: amount,
        calculationMethod,
        bracketUsed: bracketUsed ? bracketUsed.bracket_name : null,
        config: config,
        brackets: brackets
      };

      // Log the calculation if userId is provided
      if (userId) {
        await this.logServiceChargeCalculation(amount, calculationResult, userId);
      }

      return calculationResult;

    } catch (error) {
      console.error('Error calculating service charge:', error);
      throw new Error(`Service charge calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate service charge using bracket system
   */
  calculateBracketBasedServiceCharge(amount, brackets) {
    // Find the appropriate bracket
    for (const bracket of brackets) {
      const minAmount = bracket.min_amount;
      const maxAmount = bracket.max_amount;

      if (amount >= minAmount && (maxAmount === null || amount <= maxAmount)) {
        return {
          serviceCharge: bracket.service_charge,
          bracket: bracket
        };
      }
    }

    // If no bracket matches, use the last bracket (highest)
    const lastBracket = brackets[brackets.length - 1];
    return {
      serviceCharge: lastBracket ? lastBracket.service_charge : 1,
      bracket: lastBracket
    };
  }

  /**
   * Log service charge calculation for audit trail
   */
  async logServiceChargeCalculation(principalAmount, calculationResult, userId) {
    try {
      await pool.query(`
        INSERT INTO service_charge_calculation_log (
          principal_amount, calculation_date, service_charge_amount,
          calculation_method, bracket_used, config_snapshot, calculated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        principalAmount,
        new Date(),
        calculationResult.serviceChargeAmount,
        calculationResult.calculationMethod,
        calculationResult.bracketUsed,
        JSON.stringify({
          config: calculationResult.config,
          brackets: calculationResult.brackets
        }),
        userId
      ]);
    } catch (error) {
      console.error('Error logging service charge calculation:', error);
      // Don't throw error here to avoid breaking the main calculation
    }
  }

  /**
   * Update service charge bracket
   */
  async updateServiceChargeBracket(bracketId, updates, userId) {
    try {
      const setClause = [];
      const values = [];
      let valueIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (['bracket_name', 'min_amount', 'max_amount', 'service_charge', 'display_order'].includes(key)) {
          setClause.push(`${key} = $${valueIndex}`);
          values.push(value);
          valueIndex++;
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push(`updated_by = $${valueIndex}`);
      values.push(userId);
      valueIndex++;

      setClause.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(bracketId);

      const result = await pool.query(`
        UPDATE service_charge_brackets 
        SET ${setClause.join(', ')}
        WHERE id = $${valueIndex} AND is_active = TRUE
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error(`Service charge bracket with ID ${bracketId} not found`);
      }

      // Clear cache to force refresh
      this.clearCache();

      return result.rows[0];
    } catch (error) {
      console.error('Error updating service charge bracket:', error);
      throw error;
    }
  }

  /**
   * Add new service charge bracket
   */
  async addServiceChargeBracket(bracketData, userId) {
    try {
      const result = await pool.query(`
        INSERT INTO service_charge_brackets (
          bracket_name, min_amount, max_amount, service_charge, 
          display_order, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        bracketData.bracket_name,
        bracketData.min_amount,
        bracketData.max_amount,
        bracketData.service_charge,
        bracketData.display_order || 999,
        userId,
        userId
      ]);

      // Clear cache to force refresh
      this.clearCache();

      return result.rows[0];
    } catch (error) {
      console.error('Error adding service charge bracket:', error);
      throw error;
    }
  }

  /**
   * Update service charge configuration
   */
  async updateServiceChargeConfig(configKey, configValue, userId) {
    try {
      const result = await pool.query(`
        UPDATE service_charge_config 
        SET config_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = $3 AND is_active = TRUE
        RETURNING *
      `, [configValue, userId, configKey]);

      if (result.rows.length === 0) {
        throw new Error(`Configuration key '${configKey}' not found`);
      }

      // Clear cache to force refresh
      this.clearCache();

      return result.rows[0];
    } catch (error) {
      console.error('Error updating service charge config:', error);
      throw error;
    }
  }

  /**
   * Get all service charge configuration settings
   */
  async getAllServiceChargeConfig() {
    try {
      const [configResult, bracketsResult] = await Promise.all([
        pool.query(`
          SELECT * FROM service_charge_config 
          WHERE is_active = TRUE 
          ORDER BY config_key
        `),
        pool.query(`
          SELECT * FROM service_charge_brackets 
          WHERE is_active = TRUE 
          ORDER BY display_order, min_amount
        `)
      ]);

      return {
        config: configResult.rows,
        brackets: bracketsResult.rows
      };
    } catch (error) {
      console.error('Error fetching all service charge config:', error);
      throw error;
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache() {
    this.configCache.clear();
    this.bracketsCache = [];
    this.cacheExpiry = 0;
  }

  /**
   * Format service charge details for display
   */
  formatServiceChargeDetails(serviceChargeCalculation) {
    const { serviceChargeAmount, principalAmount, calculationMethod, bracketUsed } = serviceChargeCalculation;
    
    let details = `Principal amount: ₱${principalAmount.toLocaleString()}`;
    details += `\nCalculation method: ${calculationMethod}`;
    
    if (bracketUsed) {
      details += `\nBracket used: ${bracketUsed}`;
    }
    
    details += `\nService charge: ₱${serviceChargeAmount.toLocaleString()}`;

    return details;
  }
}

module.exports = ServiceChargeCalculatorService;