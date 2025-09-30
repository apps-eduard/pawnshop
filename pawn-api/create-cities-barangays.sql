-- Create cities and barangays tables
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    province VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barangays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- Insert sample barangays
INSERT INTO barangays (name, city_id) VALUES 
('Ermita', 1), ('Malate', 1), ('Intramuros', 1), ('Binondo', 1), ('Quiapo', 1),
('Bago Bantay', 2), ('Bagong Pag-asa', 2), ('Balingasa', 2), ('Cubao', 2), ('Diliman', 2),
('Poblacion', 3), ('Bel-Air', 3), ('Salcedo Village', 3), ('Legazpi Village', 3), ('San Lorenzo', 3),
('Fort Bonifacio', 4), ('Bagumbayan', 4), ('Central Bicutan', 4), ('Bambang', 4), ('Ususan', 4),
('Bagong Ilog', 5), ('Kapitolyo', 5), ('Oranbo', 5), ('Pinagbuhatan', 5), ('Rosario', 5)
ON CONFLICT DO NOTHING;