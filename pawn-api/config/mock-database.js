// Mock database for development - replace with real database later
const bcrypt = require('bcryptjs');

// Pre-hashed passwords for demo users (password: admin123, cashier123, etc.)
const mockUsers = [
  {
    id: '1',
    username: 'admin@pawnshop.com',
    email: 'admin@pawnshop.com',
    password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
    first_name: 'System',
    last_name: 'Administrator',
    role: 'ADMIN',
    branch_id: '1',
    branch_name: 'Main Branch',
    is_active: true,
    position: 'System Administrator',
    contact_number: '+63-917-123-4567',
    address: 'Quezon City, Metro Manila'
  },
  {
    id: '2',
    username: 'cashier@pawnshop.com',
    email: 'cashier@pawnshop.com',
    password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // cashier123
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    role: 'CASHIER',
    branch_id: '1',
    branch_name: 'Main Branch',
    is_active: true,
    position: 'Senior Cashier',
    contact_number: '+63-917-234-5678',
    address: 'Makati City, Metro Manila'
  },
  {
    id: '3',
    username: 'manager@pawnshop.com',
    email: 'manager@pawnshop.com',
    password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // manager123
    first_name: 'Maria',
    last_name: 'Santos',
    role: 'MANAGER',
    branch_id: '1',
    branch_name: 'Main Branch',
    is_active: true,
    position: 'Branch Manager',
    contact_number: '+63-917-345-6789',
    address: 'Pasig City, Metro Manila'
  },
  {
    id: '4',
    username: 'appraiser@pawnshop.com',
    email: 'appraiser@pawnshop.com',
    password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // appraiser123
    first_name: 'Pedro',
    last_name: 'Rodriguez',
    role: 'APPRAISER',
    branch_id: '1',
    branch_name: 'Main Branch',
    is_active: true,
    position: 'Senior Appraiser',
    contact_number: '+63-917-456-7890',
    address: 'Taguig City, Metro Manila'
  },
  {
    id: '5',
    username: 'auctioneer@pawnshop.com',
    email: 'auctioneer@pawnshop.com',
    password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // auctioneer123
    first_name: 'Anna',
    last_name: 'Garcia',
    role: 'AUCTIONEER',
    branch_id: '1',
    branch_name: 'Main Branch',
    is_active: true,
    position: 'Chief Auctioneer',
    contact_number: '+63-917-567-8901',
    address: 'Mandaluyong City, Metro Manila'
  }
];

class MockDatabase {
  async query(queryText, values = []) {
    console.log('🔍 Mock DB Query:', queryText.substring(0, 100) + '...');
    
    // Mock user authentication queries
    if (queryText.includes('FROM users') && queryText.includes('WHERE u.username')) {
      const username = values[0];
      const user = mockUsers.find(u => u.username === username || u.email === username);
      
      if (user) {
        return {
          rows: [user],
          rowCount: 1
        };
      } else {
        return {
          rows: [],
          rowCount: 0
        };
      }
    }
    
    // Mock other queries with empty results
    return {
      rows: [],
      rowCount: 0
    };
  }
  
  async connect() {
    console.log('📄 Connected to Mock Database');
    return {
      query: this.query.bind(this),
      release: () => console.log('🔌 Mock DB connection released')
    };
  }
  
  end() {
    console.log('🔚 Mock DB connection ended');
  }
}

// Create singleton instance
const mockDb = new MockDatabase();

// Add event emitter methods for compatibility
mockDb.on = (event, callback) => {
  if (event === 'connect') {
    setTimeout(callback, 100); // Simulate connection delay
  } else if (event === 'error') {
    // Store error callback for potential use
    mockDb._errorCallback = callback;
  }
};

module.exports = mockDb;