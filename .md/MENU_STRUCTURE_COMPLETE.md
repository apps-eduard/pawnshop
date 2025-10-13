# Complete Menu Structure & Role Permissions

## Overview
This document describes the complete menu hierarchy, routes, and role-based permissions for the Pawnshop Management System.

---

## Menu Hierarchy

### 1. Management (Parent Menu)
**Icon:** 📁  
**Route:** N/A (Parent only)

#### Children:
1. **User** 
   - Route: `/management/user`
   - Icon: 👥
   - Description: Manage system users and employees

2. **Pawner**
   - Route: `/management/pawner`
   - Icon: 🧑‍🤝‍🧑
   - Description: Manage pawner/customer records

3. **Address**
   - Route: `/management/address`
   - Icon: 🏠
   - Description: Manage address data (cities, barangays)

4. **Item**
   - Route: `/management/item`
   - Icon: 📦
   - Description: Manage pawn items and categories

5. **Vouchers**
   - Route: `/management/vouchers`
   - Icon: 🎟️
   - Description: Manage pawn vouchers

6. **Transactions**
   - Route: `/transactions`
   - Icon: 📋
   - Description: View and manage all transactions

---

### 2. Transactions (Parent Menu)
**Icon:** 💰  
**Route:** N/A (Parent only)

#### Children:
1. **Appraisal**
   - Route: `/transactions/appraisal`
   - Icon: 💎
   - Description: Item appraisal and evaluation

2. **New Loan**
   - Route: `/transactions/new-loan`
   - Icon: ➕
   - Description: Create new pawn loan

3. **Additional**
   - Route: `/transactions/additional-loan`
   - Icon: 💵
   - Description: Additional loan on existing pawn

4. **Partial Payment**
   - Route: `/transactions/partial-payment`
   - Icon: 💳
   - Description: Process partial payments

5. **Redeem**
   - Route: `/transactions/redeem`
   - Icon: 🎁
   - Description: Redeem pawned items

6. **Renew**
   - Route: `/transactions/renew`
   - Icon: 🔄
   - Description: Renew existing pawn loans

7. **Auction**
   - Route: `/transactions/auction-items`
   - Icon: 🔨
   - Description: Manage auction items and sales

---

### 3. Standalone Menus

#### Reports
- Route: `/reports`
- Icon: 📈
- Description: Financial and operational reports

#### RBAC
- Route: `/rbac`
- Icon: 🔐
- Description: Role-based access control management

#### Menu Config
- Route: `/management/menu-config`
- Icon: ⚙️
- Description: Configure dynamic menu structure

#### Settings
- Route: `/settings/admin`
- Icon: ⚙️
- Description: System settings and configurations

---

## Role-Based Permissions

### 👑 Administrator (Full Access)
**All menus with full CRUD permissions**

#### Management:
- ✅ User (Full CRUD)
- ✅ Pawner (Full CRUD)
- ✅ Address (Full CRUD)
- ✅ Item (Full CRUD)
- ✅ Vouchers (Full CRUD)
- ✅ Transactions (Full CRUD)

#### Transactions:
- ✅ Appraisal (Full CRUD)
- ✅ New Loan (Full CRUD)
- ✅ Additional (Full CRUD)
- ✅ Partial Payment (Full CRUD)
- ✅ Redeem (Full CRUD)
- ✅ Renew (Full CRUD)
- ✅ Auction (Full CRUD)

#### Standalone:
- ✅ Reports (Full CRUD)
- ✅ RBAC (Full CRUD)
- ✅ Menu Config (Full CRUD)
- ✅ Settings (Full CRUD)

---

### 👨‍💼 Manager
**Management oversight capabilities**

#### Management:
- ✅ Item (Full CRUD)
- ✅ Vouchers (Full CRUD)
- ✅ Transactions (Full CRUD)

---

### 💵 Cashier
**All transaction processing**

#### Transactions:
- ✅ Appraisal (Create, Edit, View)
- ✅ New Loan (Create, Edit, View)
- ✅ Additional (Create, Edit, View)
- ✅ Partial Payment (Create, Edit, View)
- ✅ Redeem (Create, Edit, View)
- ✅ Renew (Create, Edit, View)
- ✅ Auction (Create, Edit, View)

---

### 🔨 Auctioneer
**Auction management only**

#### Transactions:
- ✅ Auction (Create, Edit, View)

---

### 💎 Appraiser
**Item appraisal only**

#### Transactions:
- ✅ Appraisal (Create, Edit, View)

---

## Implementation Notes

### Database Tables
- `menu_items` - Stores all menu items with parent-child relationships
- `roles` - Stores role definitions
- `role_menu_permissions` - Maps roles to menu items with CRUD permissions
- `employee_roles` - Assigns roles to employees (many-to-many)

### Seeding Order
1. Create parent menus (Management, Transactions)
2. Create child menus for each parent
3. Create standalone menus
4. Assign administrator role permissions
5. Assign manager role permissions
6. Assign cashier role permissions
7. Assign auctioneer role permissions
8. Assign appraiser role permissions

### Route Configuration
All routes are configured in:
- `app.routes.ts` - Main routing file
- `transaction.routes.ts` - Transaction feature routes
- `management.routes.ts` - Management feature routes
- `settings.routes.ts` - Settings feature routes
- `dashboard.routes.ts` - Dashboard feature routes

---

## Testing Credentials

After running setup:
- **Username:** admin, manager1, cashier1, auctioneer1, appraiser1
- **Password:** password123

---

## Troubleshooting

### Menu Not Appearing
1. Check if role has permission in `role_menu_permissions` table
2. Verify user has role assigned in `employee_roles` table
3. Check menu item is active (`is_active = true`)

### Routing Not Working
1. Verify route matches exactly in `menu_items.route` and Angular routing files
2. Check for typos in route paths
3. Ensure component is properly imported and configured

### Permissions Not Working
1. Verify role assignment in database
2. Check permission flags (can_view, can_create, can_edit, can_delete)
3. Ensure auth middleware is properly checking permissions

---

## Update History
- **2025-10-13:** Complete menu restructure with proper routing and role permissions
- **2025-10-13:** Added Settings menu and Menu Config
- **2025-10-13:** Fixed route paths to match Angular routing configuration
