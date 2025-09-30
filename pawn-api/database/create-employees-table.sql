-- Create employees table if it doesn't exist
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position VARCHAR(100),
    contact_number VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for employees
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Insert existing user data into employees table (if it doesn't exist)
INSERT INTO employees (user_id, position, contact_number, address)
SELECT u.id, 
       CASE 
           WHEN u.role = 'admin' THEN 'System Administrator'
           WHEN u.role = 'manager' THEN 'Branch Manager'
           WHEN u.role = 'cashier' THEN 'Cashier'
           WHEN u.role = 'appraiser' THEN 'Senior Appraiser'
           WHEN u.role = 'auctioneer' THEN 'Auctioneer'
           ELSE 'Staff'
       END as position,
       NULL as contact_number,
       NULL as address
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id);

COMMIT;