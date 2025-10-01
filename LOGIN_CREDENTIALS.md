# 🔐 PAWNSHOP LOGIN CREDENTIALS

## ✅ **WORKING USER ACCOUNTS**

| Username      | Password        | Role          | Purpose                    |
|--------------|-----------------|---------------|----------------------------|
| `admin`      | `admin123`      | Administrator | System administration      |
| `manager1`   | `manager123`    | Manager       | Branch management          |
| `cashier1`   | `cashier123`    | Cashier       | Transaction processing     |
| `auctioneer1`| `auctioneer123` | Auctioneer    | Auction management         |
| `appraiser1` | `appraiser123`  | Appraiser     | Item appraisal             |

## ❌ **NON-LOGIN ACCOUNTS**

- **Pawners**: These are **customers**, not system users
  - Stored in `pawners` table, not `users` table  
  - Managed by staff users (cashier, appraiser, etc.)
  - No login credentials - they are served by staff

## 🔧 **PASSWORD RESET CONFIRMED**

All passwords have been reset to the pattern: `{username}123`

Examples:
- cashier1 → cashier123
- manager1 → manager123
- etc.

## 🎯 **READY TO USE**

You can now login with any of the 5 user accounts above. The cashier1 account specifically works for testing the pending appraisals dashboard we just implemented.