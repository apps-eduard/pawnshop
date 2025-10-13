# 🚀 Quick Start Guide - Dynamic RBAC System

## ⚡ Try It Now in 5 Steps!

### Step 1: Access RBAC Page
```
1. Login as admin/administrator
2. Navigate to: /rbac
3. You'll see 4 tabs:
   - 👥 Users & Roles
   - 🎭 Manage Roles
   - 📋 Manage Menus
   - ✅ Permission Matrix
```

---

### Step 2: Assign Multiple Roles with Checkboxes 🎯

**Tab 1: Users & Roles**

1. Find any user in the table
2. Click the **"Edit Roles"** button
3. A modal opens showing all available roles

**Check multiple roles:**
```
☑ Admin
☑ Manager      (⦿ Primary)
☐ Cashier
☑ Auctioneer
☐ Appraiser
```

4. **Select primary role** using radio buttons
5. Click **"Save Roles"**
6. ✅ Done! User now has 3 roles (Admin, Manager, Auctioneer)

**What you'll see:**
- Table updates showing all 3 roles as colored badges
- Primary role marked with ⭐ star

---

### Step 3: Configure Menu Permissions

**Tab 4: Permission Matrix**

You'll see a grid like this:

```
Menu Item          | Admin | Manager | Cashier | Auctioneer
-------------------|-------|---------|---------|------------
Dashboard          |  [✓]  |   [✓]   |   [✓]   |    [✓]
Transactions       |  [✓]  |   [✓]   |   [✓]   |    [ ]
User Management    |  [✓]  |   [ ]   |   [ ]   |    [ ]
Auctions           |  [✓]  |   [✓]   |   [ ]   |    [✓]
Reports            |  [✓]  |   [✓]   |   [ ]   |    [ ]
```

**Try this:**
1. Find "Auctions" row
2. **Uncheck** the checkbox for "Cashier" role
3. ✅ Permission instantly saved!

**Result:** Cashiers can no longer see the Auctions menu!

---

### Step 4: See Dynamic Sidebar Menus

1. **Logout** from admin account
2. **Login** as the user you modified in Step 2
3. **Check the sidebar** - It will show: `Navigation (Dynamic)`
4. **What you'll see:**
   - Combined menus from ALL assigned roles
   - If user has Admin + Manager + Auctioneer:
     - Gets ALL menus from those 3 roles
     - More menus than a user with just one role!

**Console output:**
```
✅ Loaded dynamic menus for user: 5 (array of 12 menus)
```

---

### Step 5: Create Custom Role

**Tab 2: Manage Roles**

1. Click **"Create New Role"** button
2. Fill in the form:
   ```
   Name: custom_auditor
   Display Name: Custom Auditor
   Description: Special role for auditing
   ```
3. Click **"Create"**
4. ✅ New role appears in the grid!

**Now assign menus to this role:**
1. Go to **Tab 4: Permission Matrix**
2. You'll see a new column: "Custom Auditor"
3. Check only the menus you want auditors to access:
   - ☑ Dashboard
   - ☑ Reports
   - ☐ Everything else

**Test it:**
1. Go back to **Tab 1: Users & Roles**
2. Assign "Custom Auditor" role to a user
3. Login as that user
4. They'll only see Dashboard and Reports!

---

## 🎯 Real-World Example

### Scenario: Multi-Branch Manager

**User:** John (Manager of multiple branches)

**Requirements:**
- Needs Manager permissions (staff, reports, approvals)
- Needs Cashier permissions (transactions, loans)
- Needs Auctioneer permissions (auctions, bidders)

**Solution:**
1. Go to RBAC → Users & Roles
2. Click "Edit Roles" for John
3. Check:
   ```
   ☑ Manager     (⦿ Primary)
   ☑ Cashier
   ☑ Auctioneer
   ```
4. Save

**Result:**
John's sidebar now shows:
- Dashboard (all roles have it)
- Transactions (from Cashier)
- Staff (from Manager)
- Reports (from Manager)
- Loans (from Cashier)
- Auctions (from Auctioneer)
- Bidders (from Auctioneer)
- Pawner Management (from Manager + Cashier)

**Total:** ~10-12 menus instead of just 3-4!

---

## 📋 Quick Reference

### Key Endpoints

#### Get User's Dynamic Menus
```javascript
GET /api/rbac-v2/menus/user/:userId

Response: [
  { id: 1, name: "Dashboard", route: "/dashboard", icon: "📊" },
  { id: 2, name: "Transactions", route: "/transactions", icon: "💳" },
  ...
]
```

#### Assign Multiple Roles
```javascript
POST /api/rbac-v2/users/:userId/roles

Body: {
  "role_ids": [1, 2, 5],
  "primary_role_id": 1,
  "replace": true
}

Response: {
  "message": "Roles assigned successfully",
  "assigned_roles": [...]
}
```

#### Get Permission Matrix
```javascript
GET /api/rbac-v2/permissions/matrix

Response: {
  "menus": [...],
  "roles": [...],
  "permissions": [...]
}
```

---

## 🎨 UI Features

### Checkbox Interface
- **Large clickable area** - Easy to select
- **Hover states** - Visual feedback
- **Disabled states** - System roles protected
- **Color coding** - Primary role highlighted in yellow

### Role Badges
```
Admin (⭐ Primary) | Manager | Auctioneer
     Red              Blue      Purple
```

### Permission Matrix
- **Sticky first column** - Always visible
- **Scrollable columns** - Many roles supported
- **Instant toggle** - No save button needed
- **Visual hierarchy** - Indentation for submenus

---

## ✅ What You Get

### Before (Old System):
```
User: john_doe
Role: cashier (single role)
Menus: Dashboard, Transactions, Loans, Customers (4 menus)
```

### After (New System):
```
User: john_doe
Roles: cashier + manager + auctioneer (⭐ cashier primary)
Menus: Dashboard, Transactions, Loans, Customers, 
       Staff, Reports, Auctions, Bidders, 
       Item Management, Pawner Management (10+ menus!)
```

**Benefit:** Flexible, granular control without creating complex custom roles!

---

## 🔥 Pro Tips

### Tip 1: Bulk Role Assignment
To give many users the same role combination:
1. Create a "template" user with desired roles
2. View their role IDs in the Edit Roles modal
3. Use API to assign same role_ids to multiple users

### Tip 2: Testing Permissions
1. Open two browser windows
2. Window 1: Admin → Edit permissions
3. Window 2: Test user → Refresh sidebar
4. See instant changes!

### Tip 3: Menu Organization
Order menus logically:
1. Go to Tab 3: Manage Menus
2. Edit each menu's "Order Index"
3. Lower numbers appear first
4. Use increments of 10 (10, 20, 30) for easy reordering

### Tip 4: Role Naming
- **Internal name:** lowercase_with_underscores (e.g., `branch_manager`)
- **Display name:** Title Case (e.g., `Branch Manager`)
- **Description:** Clear explanation of role purpose

---

## 🚦 Status Indicators

### Sidebar Header
- `Navigation (Dynamic)` = Menus loaded from database ✅
- `Navigation (Static)` = Using fallback hardcoded menus ⚠️

### If you see "(Static)":
1. Check API is running: `http://localhost:3000/api/health`
2. Open browser console: Look for errors
3. Check database: `SELECT COUNT(*) FROM menu_items;` should return 18
4. Force refresh: Ctrl+Shift+R

---

## 🎉 Success Checklist

After following this guide, you should be able to:

- [ ] Assign multiple roles to a user via checkboxes
- [ ] Designate a primary role
- [ ] See combined roles displayed as badges
- [ ] View dynamic menus in sidebar based on user's roles
- [ ] Toggle menu permissions in the matrix
- [ ] Create custom roles
- [ ] Create custom menus
- [ ] Understand how role permissions combine
- [ ] Login as different users and see different menus

**All checked?** 🎉 You're now an RBAC master! 

---

## 📞 Need Help?

### Common Questions

**Q: Can a user have 10+ roles?**
A: Yes! No limit. But typically 2-4 roles is optimal.

**Q: What happens if I uncheck all roles?**
A: System requires at least 1 role. Modal validation prevents saving with 0 roles.

**Q: Can I delete the Admin role?**
A: No. System roles (is_system_role = true) are protected from deletion.

**Q: How do I remove a role from a user?**
A: Open Edit Roles modal → Uncheck the role → Save.

**Q: Can I have multiple primary roles?**
A: No. Only one role can be primary (default login role).

**Q: Do menus update automatically?**
A: Yes! When you change permissions, logout and login to see updates. Or use Ctrl+Shift+R.

---

## 🚀 Next: Explore Advanced Features

Now that you know the basics, explore:
- Creating role hierarchies
- Setting up field-level permissions
- Configuring time-based access
- Implementing approval workflows
- Adding audit trails

Check `FRONTEND_RBAC_V2_COMPLETE.md` for detailed documentation!

---

**Enjoy your powerful multi-role system!** 🎊
