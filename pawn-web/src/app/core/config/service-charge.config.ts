/**
 * Service Charge Configuration
 * 
 * This file contains the tier-based service charge configuration.
 * You can edit these values directly without needing database changes.
 * Changes will take effect immediately after saving and refreshing the app.
 */

export interface ServiceChargeTier {
  minAmount: number;
  maxAmount: number | null; // null means no upper limit
  serviceCharge: number;
  description: string;
}

export const SERVICE_CHARGE_TIERS: ServiceChargeTier[] = [
  {
    minAmount: 1,
    maxAmount: 100,
    serviceCharge: 1,
    description: '₱1 - ₱100'
  },
  {
    minAmount: 101,
    maxAmount: 299,
    serviceCharge: 2,
    description: '₱101 - ₱299'
  },
  {
    minAmount: 300,
    maxAmount: 399,
    serviceCharge: 3,
    description: '₱300 - ₱399'
  },
  {
    minAmount: 400,
    maxAmount: 499,
    serviceCharge: 4,
    description: '₱400 - ₱499'
  },
  {
    minAmount: 500,
    maxAmount: null, // No upper limit
    serviceCharge: 5,
    description: '₱500 and above'
  }
];

/**
 * Calculate service charge based on configured tiers
 * @param amount - The principal loan amount
 * @returns The calculated service charge
 */
export function calculateServiceCharge(amount: number): number {
  if (amount < 1) return 0;

  for (const tier of SERVICE_CHARGE_TIERS) {
    if (amount >= tier.minAmount) {
      // Check if amount is within this tier's range
      if (tier.maxAmount === null || amount <= tier.maxAmount) {
        return tier.serviceCharge;
      }
    }
  }

  // Fallback: return the last tier's service charge
  return SERVICE_CHARGE_TIERS[SERVICE_CHARGE_TIERS.length - 1].serviceCharge;
}

/**
 * Get the tier information for a given amount
 * @param amount - The principal loan amount
 * @returns The matching tier or null
 */
export function getServiceChargeTier(amount: number): ServiceChargeTier | null {
  if (amount < 1) return null;

  for (const tier of SERVICE_CHARGE_TIERS) {
    if (amount >= tier.minAmount) {
      if (tier.maxAmount === null || amount <= tier.maxAmount) {
        return tier;
      }
    }
  }

  return null;
}
