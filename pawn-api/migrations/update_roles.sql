-- Update user roles to new 5-role system
-- Migration: Update role constraint and existing user data

-- First, update existing user roles to match new system
UPDATE users SET role = 'admin' WHERE role = 'administrator';
UPDATE users SET role = 'appraiser' WHERE role = 'supervisor';
UPDATE users SET role = 'auctioneer' WHERE role = 'clerk';

-- Then drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with the 5 roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'cashier', 'appraiser', 'auctioneer'));

-- Update usernames to match new system
UPDATE users SET username = 'appraiser1' WHERE username = 'supervisor1';
UPDATE users SET username = 'auctioneer1' WHERE username = 'clerk1';

-- Update positions to match new roles
UPDATE users SET position = 'Senior Appraiser' WHERE role = 'appraiser';
UPDATE users SET position = 'Lead Auctioneer' WHERE role = 'auctioneer';

-- Update contact info for consistency
UPDATE users SET 
    email = 'appraiser@pawnshop.com',
    address = '300 Appraiser Ave, Mid-town'
WHERE role = 'appraiser';

UPDATE users SET 
    email = 'auctioneer@pawnshop.com',
    address = '500 Auctioneer Ct, Suburban Area'
WHERE role = 'auctioneer';

-- Migration completed
COMMIT;