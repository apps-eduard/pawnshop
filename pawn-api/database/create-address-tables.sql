-- Create cities table
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    province VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create barangays table
CREATE TABLE IF NOT EXISTS barangays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pawners table
CREATE TABLE IF NOT EXISTS pawners (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    city_id INTEGER NOT NULL REFERENCES cities(id),
    barangay_id INTEGER NOT NULL REFERENCES barangays(id),
    address_details TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_barangays_city_id ON barangays(city_id);
CREATE INDEX IF NOT EXISTS idx_pawners_city_id ON pawners(city_id);
CREATE INDEX IF NOT EXISTS idx_pawners_barangay_id ON pawners(barangay_id);
CREATE INDEX IF NOT EXISTS idx_pawners_contact ON pawners(contact_number);
CREATE INDEX IF NOT EXISTS idx_pawners_email ON pawners(email);
CREATE INDEX IF NOT EXISTS idx_pawners_name ON pawners(first_name, last_name);

-- Insert sample cities
INSERT INTO cities (name, province) VALUES 
('Manila', 'Metro Manila'),
('Quezon City', 'Metro Manila'),
('Makati', 'Metro Manila'),
('Taguig', 'Metro Manila'),
('Pasig', 'Metro Manila'),
('Cebu City', 'Cebu'),
('Davao City', 'Davao del Sur')
ON CONFLICT DO NOTHING;

-- Insert sample barangays for Manila
INSERT INTO barangays (name, city_id) VALUES 
('Ermita', (SELECT id FROM cities WHERE name = 'Manila' LIMIT 1)),
('Malate', (SELECT id FROM cities WHERE name = 'Manila' LIMIT 1)),
('Intramuros', (SELECT id FROM cities WHERE name = 'Manila' LIMIT 1)),
('Binondo', (SELECT id FROM cities WHERE name = 'Manila' LIMIT 1)),
('Quiapo', (SELECT id FROM cities WHERE name = 'Manila' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insert sample barangays for Quezon City
INSERT INTO barangays (name, city_id) VALUES 
('Bago Bantay', (SELECT id FROM cities WHERE name = 'Quezon City' LIMIT 1)),
('Bagong Pag-asa', (SELECT id FROM cities WHERE name = 'Quezon City' LIMIT 1)),
('Balingasa', (SELECT id FROM cities WHERE name = 'Quezon City' LIMIT 1)),
('Cubao', (SELECT id FROM cities WHERE name = 'Quezon City' LIMIT 1)),
('Diliman', (SELECT id FROM cities WHERE name = 'Quezon City' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insert sample barangays for Makati
INSERT INTO barangays (name, city_id) VALUES 
('Poblacion', (SELECT id FROM cities WHERE name = 'Makati' LIMIT 1)),
('Bel-Air', (SELECT id FROM cities WHERE name = 'Makati' LIMIT 1)),
('Salcedo Village', (SELECT id FROM cities WHERE name = 'Makati' LIMIT 1)),
('Legazpi Village', (SELECT id FROM cities WHERE name = 'Makati' LIMIT 1)),
('San Lorenzo', (SELECT id FROM cities WHERE name = 'Makati' LIMIT 1))
ON CONFLICT DO NOTHING;

COMMIT;