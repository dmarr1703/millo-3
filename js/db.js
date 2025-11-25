// LocalStorage Database Manager for Millo 3
// This provides a database-like interface using browser localStorage
// Perfect for GitHub Pages deployment without backend server

const MilloDB = {
    // Initialize database with default data if not exists
    init: function() {
        if (!localStorage.getItem('millo_initialized')) {
            this.initializeDefaultData();
            localStorage.setItem('millo_initialized', 'true');
            console.log('✅ Millo database initialized with default data');
        }
    },

    // Initialize default data (demo users, products, etc.)
    initializeDefaultData: function() {
        const defaultData = {
            users: [
                {
                    id: 'user-admin-1',
                    email: 'owner@millo.com',
                    password: 'admin123',
                    full_name: 'Admin Owner',
                    role: 'admin',
                    status: 'active',
                    created_at: '2024-01-01T00:00:00.000Z'
                },
                {
                    id: 'user-seller-1',
                    email: 'seller1@example.com',
                    password: 'seller123',
                    full_name: 'John Seller',
                    role: 'seller',
                    status: 'active',
                    created_at: '2024-01-15T00:00:00.000Z'
                },
                {
                    id: 'user-seller-2',
                    email: 'seller2@example.com',
                    password: 'seller123',
                    full_name: 'Jane Merchant',
                    role: 'seller',
                    status: 'active',
                    created_at: '2024-01-20T00:00:00.000Z'
                }
            ],
            products: [
                {
                    id: 'prod-1',
                    seller_id: 'user-seller-1',
                    name: 'Classic Cotton T-Shirt',
                    description: 'Comfortable 100% cotton t-shirt perfect for everyday wear. Soft fabric, durable stitching.',
                    price: 29.99,
                    colors: ['White', 'Black', 'Navy', 'Red'],
                    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
                    category: 'Clothing',
                    stock: 50,
                    status: 'active',
                    subscription_status: 'active',
                    created_at: '2024-02-01T00:00:00.000Z'
                },
                {
                    id: 'prod-2',
                    seller_id: 'user-seller-1',
                    name: 'Wireless Bluetooth Headphones',
                    description: 'Premium sound quality with noise cancellation. 30-hour battery life and comfortable design.',
                    price: 89.99,
                    colors: ['Black', 'White', 'Blue'],
                    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
                    category: 'Electronics',
                    stock: 25,
                    status: 'active',
                    subscription_status: 'active',
                    created_at: '2024-02-05T00:00:00.000Z'
                },
                {
                    id: 'prod-3',
                    seller_id: 'user-seller-2',
                    name: 'Leather Wallet',
                    description: 'Genuine leather wallet with multiple card slots and bill compartment. Compact and stylish.',
                    price: 39.99,
                    colors: ['Brown', 'Black', 'Tan'],
                    image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500',
                    category: 'Accessories',
                    stock: 35,
                    status: 'active',
                    subscription_status: 'active',
                    created_at: '2024-02-10T00:00:00.000Z'
                },
                {
                    id: 'prod-4',
                    seller_id: 'user-seller-2',
                    name: 'Yoga Mat Pro',
                    description: 'Non-slip, eco-friendly yoga mat. Extra thick for comfort during workouts and yoga sessions.',
                    price: 49.99,
                    colors: ['Purple', 'Green', 'Blue', 'Pink'],
                    image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500',
                    category: 'Sports',
                    stock: 40,
                    status: 'active',
                    subscription_status: 'active',
                    created_at: '2024-02-15T00:00:00.000Z'
                }
            ],
            orders: [
                {
                    id: 'order-1',
                    customer_email: 'customer@example.com',
                    customer_name: 'Sarah Customer',
                    product_id: 'prod-1',
                    product_name: 'Classic Cotton T-Shirt',
                    color: 'White',
                    quantity: 2,
                    price: 29.99,
                    total: 59.98,
                    seller_id: 'user-seller-1',
                    commission: 8.997,
                    seller_amount: 50.983,
                    status: 'delivered',
                    shipping_address: '123 Main St, Toronto, ON M5H 2N2',
                    created_at: '2024-03-01T10:30:00.000Z'
                },
                {
                    id: 'order-2',
                    customer_email: 'john@example.com',
                    customer_name: 'John Doe',
                    product_id: 'prod-2',
                    product_name: 'Wireless Bluetooth Headphones',
                    color: 'Black',
                    quantity: 1,
                    price: 89.99,
                    total: 89.99,
                    seller_id: 'user-seller-1',
                    commission: 13.4985,
                    seller_amount: 76.4915,
                    status: 'processing',
                    shipping_address: '456 Oak Ave, Vancouver, BC V6B 1A1',
                    created_at: '2024-03-05T14:15:00.000Z'
                }
            ],
            subscriptions: [
                {
                    id: 'sub-1',
                    seller_id: 'user-seller-1',
                    product_id: 'prod-1',
                    amount: 25,
                    status: 'active',
                    start_date: '2024-02-01T00:00:00.000Z',
                    next_billing_date: '2024-04-01T00:00:00.000Z',
                    created_at: '2024-02-01T00:00:00.000Z'
                },
                {
                    id: 'sub-2',
                    seller_id: 'user-seller-1',
                    product_id: 'prod-2',
                    amount: 25,
                    status: 'active',
                    start_date: '2024-02-05T00:00:00.000Z',
                    next_billing_date: '2024-04-05T00:00:00.000Z',
                    created_at: '2024-02-05T00:00:00.000Z'
                },
                {
                    id: 'sub-3',
                    seller_id: 'user-seller-2',
                    product_id: 'prod-3',
                    amount: 25,
                    status: 'active',
                    start_date: '2024-02-10T00:00:00.000Z',
                    next_billing_date: '2024-04-10T00:00:00.000Z',
                    created_at: '2024-02-10T00:00:00.000Z'
                },
                {
                    id: 'sub-4',
                    seller_id: 'user-seller-2',
                    product_id: 'prod-4',
                    amount: 25,
                    status: 'active',
                    start_date: '2024-02-15T00:00:00.000Z',
                    next_billing_date: '2024-04-15T00:00:00.000Z',
                    created_at: '2024-02-15T00:00:00.000Z'
                }
            ]
        };

        // Save each table to localStorage
        for (const [table, data] of Object.entries(defaultData)) {
            localStorage.setItem(`millo_${table}`, JSON.stringify(data));
        }
    },

    // Get all records from a table
    getAll: function(table) {
        const data = localStorage.getItem(`millo_${table}`);
        return data ? JSON.parse(data) : [];
    },

    // Get a single record by ID
    getById: function(table, id) {
        const data = this.getAll(table);
        return data.find(item => item.id === id);
    },

    // Find records matching criteria
    find: function(table, criteria) {
        const data = this.getAll(table);
        return data.filter(item => {
            for (const [key, value] of Object.entries(criteria)) {
                if (item[key] !== value) return false;
            }
            return true;
        });
    },

    // Find one record matching criteria
    findOne: function(table, criteria) {
        const data = this.getAll(table);
        return data.find(item => {
            for (const [key, value] of Object.entries(criteria)) {
                if (item[key] !== value) return false;
            }
            return true;
        });
    },

    // Create a new record
    create: function(table, record) {
        const data = this.getAll(table);
        
        // Generate ID if not provided
        if (!record.id) {
            const prefix = table.slice(0, -1); // Remove 's' from table name
            record.id = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add timestamp if not provided
        if (!record.created_at) {
            record.created_at = new Date().toISOString();
        }
        
        data.push(record);
        localStorage.setItem(`millo_${table}`, JSON.stringify(data));
        return record;
    },

    // Update a record by ID
    update: function(table, id, updates) {
        const data = this.getAll(table);
        const index = data.findIndex(item => item.id === id);
        
        if (index === -1) {
            throw new Error('Record not found');
        }
        
        // Merge updates with existing data
        data[index] = {
            ...data[index],
            ...updates,
            id: id, // Ensure ID is not changed
            created_at: data[index].created_at // Preserve created_at
        };
        
        localStorage.setItem(`millo_${table}`, JSON.stringify(data));
        return data[index];
    },

    // Delete a record by ID
    delete: function(table, id) {
        const data = this.getAll(table);
        const index = data.findIndex(item => item.id === id);
        
        if (index === -1) {
            throw new Error('Record not found');
        }
        
        const deleted = data.splice(index, 1)[0];
        localStorage.setItem(`millo_${table}`, JSON.stringify(data));
        return deleted;
    },

    // Count records in a table
    count: function(table) {
        return this.getAll(table).length;
    },

    // Clear all data (use with caution!)
    clearAll: function() {
        const tables = ['users', 'products', 'orders', 'subscriptions'];
        tables.forEach(table => {
            localStorage.removeItem(`millo_${table}`);
        });
        localStorage.removeItem('millo_initialized');
        console.log('🗑️ All Millo data cleared');
    },

    // Reset database to default data
    reset: function() {
        this.clearAll();
        this.init();
        console.log('🔄 Millo database reset to defaults');
    }
};

// Initialize database on script load
MilloDB.init();

// Make it available globally
window.MilloDB = MilloDB;
