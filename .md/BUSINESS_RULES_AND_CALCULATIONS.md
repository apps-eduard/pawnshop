# Business Rules and Calculations Documentation

**GoldWin Pawnshop Management System**  
**Last Updated:** October 6, 2025  
**Version:** 1.0

---

## Table of Contents
1. [Loan Calculation Rules](#loan-calculation-rules)
2. [Interest Calculation](#interest-calculation)
3. [Penalty Calculation](#penalty-calculation)
4. [Service Charge Calculation](#service-charge-calculation)
5. [Partial Payment Rules](#partial-payment-rules)
6. [Date Calculation Rules](#date-calculation-rules)
7. [Payment Priority Order](#payment-priority-order)

---

## 1. Loan Calculation Rules

### Basic Loan Formula
```
Total Amount = Principal + Interest + Service Charge
Net Proceeds = Principal - Service Charge
```

### Loan Period
- **Standard Maturity Period:** 1 month (30 days) from grant date
- **Grace Period:** 3 months after maturity (total 4 months from grant date)
- **Expiry Date:** Grant Date + 4 months

### Example
```
Grant Date: September 3, 2025
Maturity Date: October 3, 2025 (1 month)
Expiry Date: January 3, 2026 (4 months)
```

---

## 2. Interest Calculation

### Interest Rate
- **Standard Rate:** 6% per month (configurable)
- **Calculation Method:** Monthly rate / 30 days × number of days

### Interest Rules

#### A. Initial Loan (First 30 Days)
```
Interest = Principal × (Interest Rate / 100)
```

**Example:**
```
Principal: ₱2,700
Interest Rate: 6%
Interest = ₱2,700 × 0.06 = ₱162.00
```

#### B. Partial Payment (Beyond 30 Days)
Interest is calculated ONLY for days AFTER the first 30 prepaid days:

```
Total Days from Grant = Current Date - Grant Date
Additional Days = Total Days - 30 (first 30 days already paid)
Daily Rate = (Interest Rate / 100) / 30
Interest = Principal × Daily Rate × Additional Days
```

**Example:**
```
Grant Date: September 3, 2025
Current Date: October 6, 2025
Total Days: 33 days
Additional Days: 33 - 30 = 3 days

Principal: ₱2,700
Interest Rate: 6%
Daily Rate: 0.06 / 30 = 0.002
Interest = ₱2,700 × 0.002 × 3 = ₱16.20
```

#### C. Interest Discount
Discount represents number of days to waive:

```
Base Interest = Principal × Daily Rate × Additional Days
Discount Amount = Principal × Daily Rate × Discount Days
Final Interest = Base Interest - Discount Amount
```

**Example with 3 Days Discount:**
```
Additional Days: 3 days
Base Interest: ₱16.20
Discount Days: 3
Discount Amount: ₱2,700 × 0.002 × 3 = ₱16.20
Final Interest: ₱16.20 - ₱16.20 = ₱0.00
```

---

## 3. Penalty Calculation

### Penalty Rate
- **Standard Rate:** 2% per month (0.02)
- **Daily Rate:** 2% / 30 = 0.0667% per day

### Penalty Rules

#### A. Days 1-3 Overdue: Daily Penalty
```
Penalty = (Principal × 0.02 / 30) × Days Overdue
```

**Example (2 days overdue):**
```
Principal: ₱2,700
Days Overdue: 2
Daily Penalty Rate: 0.02 / 30 = 0.000667
Penalty = ₱2,700 × 0.000667 × 2 = ₱3.60
```

#### B. Day 4+ Overdue: Full Month Penalty
```
Penalty = Principal × 0.02 (fixed)
```

**Example (5 days overdue):**
```
Principal: ₱2,700
Penalty = ₱2,700 × 0.02 = ₱54.00 (full month)
```

#### C. Penalty Discount (Days 1-3 Only)
For daily penalty (1-3 days), discount can reduce the penalty:

```
Discount Days = min(Discount, Days Overdue)
Penalty Discount = Principal × (0.02 / 30) × Discount Days
Final Penalty = Base Penalty - Penalty Discount
```

**Example (3 days overdue, 3 days discount):**
```
Base Penalty: ₱5.40
Discount: ₱5.40
Final Penalty: ₱0.00
```

**Note:** For 4+ days overdue, discount does NOT apply since penalty is already capped at one month.

---

## 4. Service Charge Calculation

### Service Charge Brackets (Dynamic - Configurable in Admin)

| Principal Amount Range | Service Charge |
|------------------------|----------------|
| ₱1 - ₱199             | ₱1             |
| ₱200 - ₱299           | ₱2             |
| ₱300 - ₱399           | ₱3             |
| ₱400 - ₱499           | ₱4             |
| ₱500 and above        | ₱5             |

### Examples
```
Principal ₱150  → Service Charge = ₱1
Principal ₱250  → Service Charge = ₱2
Principal ₱350  → Service Charge = ₱3
Principal ₱450  → Service Charge = ₱4
Principal ₱2,700 → Service Charge = ₱5
```

### Configuration
Service charges can be modified by administrators through:
- Database table: `service_charge_brackets`
- Admin panel: Settings → Service Charge Configuration

---

## 5. Partial Payment Rules

### Payment Computation Formula
```
Amount Due = Principal + Interest + Penalty
Advance Interest = New Principal × Interest Rate
Advance Service Charge = Service Charge based on New Principal
Net Payment = Partial Pay + Interest + Penalty + Advance Interest + Advance Service Charge
```

### New Principal Calculation
```
New Principal = Current Principal - Partial Payment
```

If partial payment ≥ principal:
```
New Principal = ₱0.00
Excess applied to interest/penalty
```

### Full Payment Example
```
Current Principal: ₱2,700
Partial Payment: ₱2,700
New Principal: ₱0.00

Advance Interest: ₱0.00 (no principal remaining)
Advance Service Charge: ₱1.00 (minimum bracket)
```

---

## 6. Date Calculation Rules

### Date Storage
- **Database:** PostgreSQL DATE and TIMESTAMP types
- **Format:** YYYY-MM-DD (e.g., 2025-09-03)
- **Timezone:** All dates stored in local timezone, formatted to avoid UTC conversion issues

### Date Formatting Rules

#### Frontend to Backend
Dates are sent as strings in YYYY-MM-DD format:
```typescript
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

#### Backend Storage
Dates are stored as YYYY-MM-DD strings to PostgreSQL:
```javascript
const formatDateForDB = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

#### Backend to Frontend
DATE columns require special handling due to timezone conversion:
```javascript
const formatDateForResponse = (date, isDateColumn = false) => {
  if (!date) return null;
  const d = new Date(date);
  
  if (isDateColumn) {
    // Add 12 hours to compensate for timezone shift
    const adjusted = new Date(d.getTime() + (12 * 60 * 60 * 1000));
    const year = adjusted.getUTCFullYear();
    const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
    const day = String(adjusted.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } else {
    // For TIMESTAMP columns use local date parts
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};
```

### Days Calculation
```javascript
// Use Math.floor for complete days only
const days = Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
```

---

## 7. Payment Priority Order

When a customer makes a payment, amounts are applied in this order:

### Priority Sequence
1. **Service Charges** (highest priority)
2. **Penalty**
3. **Interest**
4. **Principal** (lowest priority)

### Example
```
Payment Amount: ₱100
Service Charge Due: ₱5
Penalty Due: ₱54
Interest Due: ₱16.20
Principal Due: ₱2,700

Application:
1. Service Charge: ₱5 (fully paid)
2. Penalty: ₱54 (fully paid)
3. Interest: ₱16.20 (fully paid)
4. Principal: ₱24.80 (partial payment)

Remaining Principal: ₱2,700 - ₱24.80 = ₱2,675.20
```

---

## Database Schema References

### Key Tables

#### `transactions`
- `principal_amount`: NUMERIC - Loan principal
- `interest_rate`: NUMERIC - Interest rate as decimal (0.06 for 6%)
- `interest_amount`: NUMERIC - Calculated interest
- `service_charge`: NUMERIC - Service charge amount
- `penalty_amount`: NUMERIC - Penalty amount
- `total_amount`: NUMERIC - Total amount due
- `balance`: NUMERIC - Remaining balance
- `transaction_date`: TIMESTAMP - Transaction timestamp
- `granted_date`: TIMESTAMP - Loan grant timestamp
- `maturity_date`: DATE - Loan maturity date
- `expiry_date`: DATE - Loan expiry date

#### `service_charge_brackets`
- `min_amount`: NUMERIC - Minimum principal for bracket
- `max_amount`: NUMERIC - Maximum principal (NULL = no limit)
- `service_charge`: NUMERIC - Service charge for bracket
- `is_active`: BOOLEAN - Whether bracket is active
- `display_order`: INTEGER - Display order in admin panel

#### `penalty_config`
- `monthly_penalty_rate`: 0.02 (2% per month)
- `daily_penalty_threshold_days`: 3 (days before full month penalty)
- `grace_period_days`: 0 (no grace period before penalty starts)

---

## Configuration Files

### Frontend
- `penalty-calculator.service.ts`: Penalty calculation logic
- `partial-payment.ts`: Partial payment computation
- `new-loan.ts`: New loan creation and date calculations

### Backend
- `service-charge-config.js`: Service charge API endpoints
- `transactions.js`: Transaction management and calculations
- `create-service-charge-config.sql`: Service charge bracket setup
- `create-penalty-config.sql`: Penalty configuration setup

---

## Testing Scenarios

### Scenario 1: New Loan
```
Input:
- Principal: ₱2,700
- Interest Rate: 6%
- Grant Date: 2025-09-03

Expected Output:
- Interest: ₱162.00
- Service Charge: ₱5.00
- Total: ₱2,867.00
- Net Proceeds: ₱2,533.00
- Maturity Date: 2025-10-03
- Expiry Date: 2026-01-03
```

### Scenario 2: Partial Payment (3 Days After Maturity)
```
Input:
- Principal: ₱2,700
- Grant Date: 2025-09-03
- Maturity Date: 2025-10-03
- Current Date: 2025-10-06
- Discount: 3 days

Expected Output:
- Days from Grant: 33
- Additional Days: 3 (33 - 30)
- Base Interest: ₱16.20
- Interest Discount: ₱16.20
- Final Interest: ₱0.00
- Days Overdue: 3
- Base Penalty: ₱5.40
- Penalty Discount: ₱5.40
- Final Penalty: ₱0.00
```

### Scenario 3: Full Payment After 4 Days Overdue
```
Input:
- Principal: ₱2,700
- Days Overdue: 4
- Discount: 3 days

Expected Output:
- Penalty: ₱54.00 (full month, discount doesn't apply)
- Interest: Calculated based on days
```

---

## Change Log

### Version 1.0 (October 6, 2025)
- Initial documentation
- Service charge brackets updated to: 1-199, 200-299, 300-399, 400-499, 500+
- Date calculation timezone fixes implemented
- Penalty calculation rules documented
- Interest calculation rules documented

---

## Support and Maintenance

For questions or issues related to these calculations:
1. Check this documentation first
2. Review the code files listed in Configuration Files section
3. Test with the scenarios provided above
4. Verify database configuration in `service_charge_brackets` and `penalty_config` tables

---

**End of Documentation**
