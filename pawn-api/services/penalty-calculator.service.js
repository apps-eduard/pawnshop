const { pool } = require('../config/database');

/**
 * Dynamic Penalty Calculator Service
 * Supports configurable penalty calculation rules
 */
class PenaltyCalculatorService {
  constructor() {
    this.configCache = new Map();
    this.cacheExpiry = Date.now() + (5 * 60 * 1000); // Cache for 5 minutes
  }

  /**
   * Get penalty configuration from database with caching
   */
  async getPenaltyConfig() {
    // Check if cache is still valid
    if (this.configCache.size > 0 && Date.now() < this.cacheExpiry) {
      return Object.fromEntries(this.configCache);
    }

    try {
      const result = await pool.query(`
        SELECT config_key, config_value 
        FROM penalty_config 
        WHERE is_active = TRUE 
        AND (effective_date IS NULL OR effective_date <= CURRENT_DATE)
      `);

      // Update cache
      this.configCache.clear();
      result.rows.forEach(row => {
        this.configCache.set(row.config_key, parseFloat(row.config_value));
      });
      this.cacheExpiry = Date.now() + (5 * 60 * 1000);

      return Object.fromEntries(this.configCache);
    } catch (error) {
      console.error('Error fetching penalty config:', error);
      // Return default config if database fails
      return this.getDefaultConfig();
    }
  }

  /**
   * Default penalty configuration (fallback)
   */
  getDefaultConfig() {
    return {
      monthly_penalty_rate: 0.02,
      daily_penalty_threshold_days: 3,
      grace_period_days: 0,
      penalty_compounding: 0,
      max_penalty_multiplier: 12
    };
  }

  /**
   * Calculate penalty amount based on current configuration
   * @param {number} principalAmount - The principal loan amount
   * @param {Date} maturityDate - The maturity date of the loan
   * @param {Date} currentDate - Current date (optional, defaults to now)
   * @param {number} userId - User ID for logging (optional)
   * @returns {Object} Penalty calculation details
   */
  async calculatePenalty(principalAmount, maturityDate, currentDate = new Date(), userId = null) {
    try {
      const config = await this.getPenaltyConfig();
      const maturity = new Date(maturityDate);
      const current = new Date(currentDate);

      // Calculate days overdue
      const timeDiff = current.getTime() - maturity.getTime();
      const totalDaysOverdue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // Apply grace period
      const effectiveDaysOverdue = Math.max(0, totalDaysOverdue - config.grace_period_days);

      if (effectiveDaysOverdue <= 0) {
        return {
          penaltyAmount: 0,
          daysOverdue: totalDaysOverdue,
          effectiveDaysOverdue: 0,
          penaltyRate: config.monthly_penalty_rate,
          calculationMethod: 'none',
          isPenaltyApplicable: false,
          principalAmount: parseFloat(principalAmount),
          config: config
        };
      }

      let penaltyAmount = 0;
      let calculationMethod = '';

      // Determine calculation method based on days overdue
      if (effectiveDaysOverdue < config.daily_penalty_threshold_days) {
        // Daily penalty calculation
        const dailyRate = config.monthly_penalty_rate / 30;
        penaltyAmount = principalAmount * dailyRate * effectiveDaysOverdue;
        calculationMethod = 'daily';
      } else {
        // Monthly penalty calculation (full month penalty)
        penaltyAmount = principalAmount * config.monthly_penalty_rate;
        calculationMethod = 'monthly';

        // Apply compounding if enabled
        if (config.penalty_compounding === 1) {
          const monthsOverdue = Math.ceil(effectiveDaysOverdue / 30);
          const cappedMonths = Math.min(monthsOverdue, config.max_penalty_multiplier);
          penaltyAmount = principalAmount * config.monthly_penalty_rate * cappedMonths;
          calculationMethod = 'monthly_compound';
        }
      }

      // Apply maximum penalty cap
      const maxPenalty = principalAmount * config.monthly_penalty_rate * config.max_penalty_multiplier;
      penaltyAmount = Math.min(penaltyAmount, maxPenalty);

      // Round to 2 decimal places
      penaltyAmount = Math.round(penaltyAmount * 100) / 100;

      const result = {
        penaltyAmount,
        daysOverdue: totalDaysOverdue,
        effectiveDaysOverdue,
        penaltyRate: config.monthly_penalty_rate,
        calculationMethod,
        isPenaltyApplicable: true,
        principalAmount: parseFloat(principalAmount),
        config: config,
        gracePeriodDays: config.grace_period_days,
        thresholdDays: config.daily_penalty_threshold_days
      };

      // Log the calculation if userId is provided
      if (userId && result.penaltyAmount > 0) {
        await this.logPenaltyCalculation(principalAmount, maturity, result, userId);
      }

      return result;

    } catch (error) {
      console.error('Error calculating penalty:', error);
      throw new Error(`Penalty calculation failed: ${error.message}`);
    }
  }

  /**
   * Log penalty calculation for audit trail
   */
  async logPenaltyCalculation(principalAmount, maturityDate, calculationResult, userId) {
    try {
      await pool.query(`
        INSERT INTO penalty_calculation_log (
          principal_amount, calculation_date, days_overdue, penalty_rate,
          penalty_amount, calculation_method, config_snapshot, calculated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        principalAmount,
        new Date(),
        calculationResult.effectiveDaysOverdue,
        calculationResult.penaltyRate,
        calculationResult.penaltyAmount,
        calculationResult.calculationMethod,
        JSON.stringify(calculationResult.config),
        userId
      ]);
    } catch (error) {
      console.error('Error logging penalty calculation:', error);
      // Don't throw error here to avoid breaking the main calculation
    }
  }

  /**
   * Update penalty configuration
   * @param {string} configKey - Configuration key to update
   * @param {number} configValue - New configuration value
   * @param {number} userId - User ID making the change
   */
  async updatePenaltyConfig(configKey, configValue, userId) {
    try {
      const result = await pool.query(`
        UPDATE penalty_config 
        SET config_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = $3 AND is_active = TRUE
        RETURNING *
      `, [configValue, userId, configKey]);

      if (result.rows.length === 0) {
        throw new Error(`Configuration key '${configKey}' not found`);
      }

      // Clear cache to force refresh
      this.configCache.clear();

      return result.rows[0];
    } catch (error) {
      console.error('Error updating penalty config:', error);
      throw error;
    }
  }

  /**
   * Get all penalty configuration settings
   */
  async getAllPenaltyConfig() {
    try {
      const result = await pool.query(`
        SELECT * FROM penalty_config 
        WHERE is_active = TRUE 
        ORDER BY config_key
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all penalty config:', error);
      throw error;
    }
  }

  /**
   * Clear configuration cache (useful for testing or immediate updates)
   */
  clearCache() {
    this.configCache.clear();
    this.cacheExpiry = 0;
  }

  /**
   * Format penalty details for display
   */
  formatPenaltyDetails(penaltyCalculation) {
    if (!penaltyCalculation.isPenaltyApplicable) {
      return 'No penalty applicable - loan is not overdue';
    }

    const { daysOverdue, effectiveDaysOverdue, penaltyAmount, calculationMethod, penaltyRate } = penaltyCalculation;
    
    let details = `Days overdue: ${daysOverdue}`;
    if (effectiveDaysOverdue !== daysOverdue) {
      details += ` (effective: ${effectiveDaysOverdue} after grace period)`;
    }
    
    details += `\nPenalty rate: ${(penaltyRate * 100).toFixed(2)}% monthly`;
    details += `\nCalculation method: ${calculationMethod}`;
    details += `\nPenalty amount: ₱${penaltyAmount.toLocaleString()}`;

    return details;
  }
}

module.exports = PenaltyCalculatorService;