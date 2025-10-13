-- Create hierarchical menu structure with Management and Transactions parents

-- Step 1: Create parent menu items (Management and Transactions)
INSERT INTO menu_items (name, route, icon, parent_id, order_index, is_active, description, created_at, updated_at)
VALUES 
  ('Management', '#', '📁', NULL, 2, true, 'Management section', NOW(), NOW()),
  ('Transactions', '#', '💰', NULL, 3, true, 'Transactions section', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Step 2: Get the IDs of the parent menus
DO $$
DECLARE
  management_id INTEGER;
  transactions_id INTEGER;
BEGIN
  -- Get Management parent ID
  SELECT id INTO management_id FROM menu_items WHERE name = 'Management' AND parent_id IS NULL;
  
  -- Get Transactions parent ID
  SELECT id INTO transactions_id FROM menu_items WHERE name = 'Transactions' AND parent_id IS NULL;
  
  -- Step 3: Update existing management items to be children of Management parent
  UPDATE menu_items SET parent_id = management_id, order_index = 1 WHERE name = 'User Management';
  UPDATE menu_items SET parent_id = management_id, order_index = 2 WHERE name = 'Pawner Management';
  UPDATE menu_items SET parent_id = management_id, order_index = 3 WHERE name = 'Address Management';
  UPDATE menu_items SET parent_id = management_id, order_index = 4 WHERE name = 'Item Management';
  UPDATE menu_items SET parent_id = management_id, order_index = 5 WHERE route = '/management/vouchers';
  
  -- Step 4: Update existing transaction items to be children of Transactions parent
  UPDATE menu_items SET parent_id = transactions_id, order_index = 1 WHERE name = 'Appraisal';
  UPDATE menu_items SET parent_id = transactions_id, order_index = 2 WHERE name = 'New Loan';
  UPDATE menu_items SET parent_id = transactions_id, order_index = 3 WHERE name = 'Additional Loan';
  UPDATE menu_items SET parent_id = transactions_id, order_index = 4 WHERE name = 'Partial Payment';
  UPDATE menu_items SET parent_id = transactions_id, order_index = 5 WHERE name = 'Redeem';
  UPDATE menu_items SET parent_id = transactions_id, order_index = 6 WHERE name = 'Renew';
  UPDATE menu_items SET parent_id = transactions_id, order_index = 7 WHERE name = 'Auctioned Items';
END $$;

-- Step 5: Verify the structure
SELECT 
  m1.id,
  m1.name,
  m1.route,
  m1.icon,
  m1.parent_id,
  m2.name as parent_name,
  m1.order_index
FROM menu_items m1
LEFT JOIN menu_items m2 ON m1.parent_id = m2.id
ORDER BY COALESCE(m1.parent_id, m1.id), m1.order_index;
