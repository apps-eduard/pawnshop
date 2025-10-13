-- Update voucher menu item route from /vouchers to /management/vouchers
UPDATE menu_items 
SET route = '/management/vouchers' 
WHERE route = '/vouchers' OR name = 'Vouchers';

-- Verify the update
SELECT id, name, route, icon, order_index 
FROM menu_items 
WHERE name = 'Vouchers';
