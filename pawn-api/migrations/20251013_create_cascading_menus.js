/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Step 1: Create parent menu items (Management and Transactions)
  await knex.raw(`
    INSERT INTO menu_items (name, route, icon, parent_id, order_index, is_active, description, created_at, updated_at)
    VALUES 
      ('Management', '#', '📁', NULL, 2, true, 'Management section', NOW(), NOW()),
      ('Transactions', '#', '💰', NULL, 3, true, 'Transactions section', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  `);

  // Step 2: Get the IDs of the parent menus and update children
  await knex.raw(`
    DO $$
    DECLARE
      management_id INTEGER;
      transactions_id INTEGER;
    BEGIN
      -- Get Management parent ID
      SELECT id INTO management_id FROM menu_items WHERE name = 'Management' AND parent_id IS NULL;
      
      -- Get Transactions parent ID
      SELECT id INTO transactions_id FROM menu_items WHERE name = 'Transactions' AND parent_id IS NULL;
      
      -- Update existing management items to be children of Management parent
      UPDATE menu_items SET parent_id = management_id, order_index = 1, updated_at = NOW() WHERE name = 'User Management';
      UPDATE menu_items SET parent_id = management_id, order_index = 2, updated_at = NOW() WHERE name = 'Pawner Management';
      UPDATE menu_items SET parent_id = management_id, order_index = 3, updated_at = NOW() WHERE name = 'Address Management';
      UPDATE menu_items SET parent_id = management_id, order_index = 4, updated_at = NOW() WHERE name = 'Item Management';
      UPDATE menu_items SET parent_id = management_id, order_index = 5, updated_at = NOW() WHERE route = '/management/vouchers';
      
      -- Update existing transaction items to be children of Transactions parent
      UPDATE menu_items SET parent_id = transactions_id, order_index = 1, updated_at = NOW() WHERE name = 'Appraisal' OR route = '/transactions/appraisal';
      UPDATE menu_items SET parent_id = transactions_id, order_index = 2, updated_at = NOW() WHERE name = 'New Loan' OR route = '/transactions/new-loan';
      UPDATE menu_items SET parent_id = transactions_id, order_index = 3, updated_at = NOW() WHERE name = 'Additional Loan' OR route = '/transactions/additional-loan';
      UPDATE menu_items SET parent_id = transactions_id, order_index = 4, updated_at = NOW() WHERE name = 'Partial Payment' OR route = '/transactions/partial-payment';
      UPDATE menu_items SET parent_id = transactions_id, order_index = 5, updated_at = NOW() WHERE name = 'Redeem' OR route = '/transactions/redeem';
      UPDATE menu_items SET parent_id = transactions_id, order_index = 6, updated_at = NOW() WHERE name = 'Renew' OR route = '/transactions/renew';
      UPDATE menu_items SET parent_id = transactions_id, order_index = 7, updated_at = NOW() WHERE name = 'Auctioned Items' OR route = '/transactions/auctioned-items';
    END $$;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Revert the changes - remove parent_id from children and delete parent items
  await knex.raw(`
    DO $$
    DECLARE
      management_id INTEGER;
      transactions_id INTEGER;
    BEGIN
      -- Get parent IDs
      SELECT id INTO management_id FROM menu_items WHERE name = 'Management' AND parent_id IS NULL;
      SELECT id INTO transactions_id FROM menu_items WHERE name = 'Transactions' AND parent_id IS NULL;
      
      -- Remove parent_id from all children
      UPDATE menu_items SET parent_id = NULL WHERE parent_id = management_id;
      UPDATE menu_items SET parent_id = NULL WHERE parent_id = transactions_id;
      
      -- Delete parent items
      DELETE FROM menu_items WHERE id = management_id;
      DELETE FROM menu_items WHERE id = transactions_id;
    END $$;
  `);
};
