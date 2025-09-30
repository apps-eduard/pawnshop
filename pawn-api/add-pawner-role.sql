-- Add pawner role to the database
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('administrator', 'manager', 'cashier', 'auctioneer', 'appraiser', 'pawner'));

-- Insert test pawner user
INSERT INTO users (username, email, password_hash, first_name, last_name, role, branch_id, position, contact_number, address) 
VALUES ('pawner1', 'pawner@pawnshop.com', '$2b$10$MlHsGQg7rQnCr1fe28sVBuas4fdsjiDtagXNnG5vbtvoTtlGQabDy', 'Maria', 'Santos', 'pawner', 1, 'Customer', '+1-555-2001', '1001 Customer St, City Center');