const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Stripe configuration - using environment variable for security
// Set your Stripe secret key as environment variable: STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key_here';
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Database file path
const DB_FILE = path.join(__dirname, 'millo-database.json');

// Initialize database with only admin account
let db = {
    users: [
        {
            id: 'user-admin-1',
            email: 'owner@millo.com',
            password: 'admin123',
            full_name: 'Admin Owner',
            role: 'admin',
            status: 'active',
            created_at: '2024-01-01T00:00:00.000Z'
        }
    ],
    products: [], // No demo products
    orders: [], // No demo orders
    subscriptions: [], // No demo subscriptions
    withdrawals: [] // Track owner withdrawals
};

// Load database from file if exists
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            db = JSON.parse(data);
            console.log('📦 Database loaded from file');
        } else {
            console.log('🆕 Starting with fresh database');
            saveDatabase();
        }
    } catch (error) {
        console.error('Error loading database:', error);
    }
}

// Save database to file
function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        console.log('💾 Database saved to file');
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

// Auto-save database every 30 seconds
setInterval(saveDatabase, 30000);

// Load database on startup
loadDatabase();

// Helper function to generate unique IDs
function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// RESTful API Routes

// GET /tables/:table - List all records with pagination
app.get('/tables/:table', (req, res) => {
    const { table } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    if (!db[table]) {
        return res.status(404).json({ error: 'Table not found' });
    }
    
    const data = db[table];
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    
    res.json({
        data: data.slice(start, end),
        total: data.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
});

// GET /tables/:table/:id - Get single record by ID
app.get('/tables/:table/:id', (req, res) => {
    const { table, id } = req.params;
    
    if (!db[table]) {
        return res.status(404).json({ error: 'Table not found' });
    }
    
    const item = db[table].find(item => item.id === id);
    
    if (!item) {
        return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(item);
});

// POST /tables/:table - Create new record
app.post('/tables/:table', (req, res) => {
    const { table } = req.params;
    const data = req.body;
    
    if (!db[table]) {
        return res.status(404).json({ error: 'Table not found' });
    }
    
    // Generate ID if not provided
    if (!data.id) {
        const prefix = table.slice(0, -1); // Remove 's' from table name
        data.id = generateId(prefix);
    }
    
    // Add timestamp if not provided
    if (!data.created_at) {
        data.created_at = new Date().toISOString();
    }
    
    db[table].push(data);
    saveDatabase(); // Auto-save after create
    res.status(201).json(data);
});

// PUT /tables/:table/:id - Full update of record
app.put('/tables/:table/:id', (req, res) => {
    const { table, id } = req.params;
    const data = req.body;
    
    if (!db[table]) {
        return res.status(404).json({ error: 'Table not found' });
    }
    
    const index = db[table].findIndex(item => item.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Record not found' });
    }
    
    // Preserve ID and created_at
    data.id = id;
    if (db[table][index].created_at) {
        data.created_at = db[table][index].created_at;
    }
    
    db[table][index] = data;
    saveDatabase(); // Auto-save after update
    res.json(data);
});

// PATCH /tables/:table/:id - Partial update of record
app.patch('/tables/:table/:id', (req, res) => {
    const { table, id } = req.params;
    const updates = req.body;
    
    if (!db[table]) {
        return res.status(404).json({ error: 'Table not found' });
    }
    
    const index = db[table].findIndex(item => item.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Record not found' });
    }
    
    // Merge updates with existing data
    db[table][index] = {
        ...db[table][index],
        ...updates,
        id: id, // Ensure ID is not changed
        created_at: db[table][index].created_at // Preserve created_at
    };
    
    saveDatabase(); // Auto-save after patch
    res.json(db[table][index]);
});

// DELETE /tables/:table/:id - Delete record
app.delete('/tables/:table/:id', (req, res) => {
    const { table, id } = req.params;
    
    if (!db[table]) {
        return res.status(404).json({ error: 'Table not found' });
    }
    
    const index = db[table].findIndex(item => item.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Record not found' });
    }
    
    const deleted = db[table].splice(index, 1)[0];
    saveDatabase(); // Auto-save after delete
    res.json({ message: 'Record deleted', data: deleted });
});

// Stripe payment intent endpoint
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'cad', metadata } = req.body;
        
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase(),
            metadata: metadata || {},
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Stripe payment intent error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stripe subscription endpoint for sellers
app.post('/api/create-subscription', async (req, res) => {
    try {
        const { seller_id, product_id, amount = 25 } = req.body;
        
        // Create a PaymentIntent for subscription fee
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency: 'cad',
            metadata: {
                seller_id,
                product_id,
                type: 'subscription'
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Stripe subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Owner withdrawal endpoint
app.post('/api/withdraw', (req, res) => {
    const { amount, admin_id } = req.body;
    
    // Verify admin
    const admin = db.users.find(u => u.id === admin_id && u.role === 'admin');
    if (!admin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Calculate available balance
    const totalCommissions = db.orders.reduce((sum, o) => sum + (o.commission || 0), 0);
    const totalSubscriptions = db.subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + s.amount, 0);
    const totalWithdrawals = db.withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const availableBalance = totalCommissions + totalSubscriptions - totalWithdrawals;
    
    if (amount > availableBalance) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create withdrawal record
    const withdrawal = {
        id: generateId('withdrawal'),
        admin_id,
        amount,
        status: 'completed',
        created_at: new Date().toISOString()
    };
    
    db.withdrawals.push(withdrawal);
    saveDatabase();
    
    res.json({
        withdrawal,
        new_balance: availableBalance - amount
    });
});

// Get owner earnings
app.get('/api/owner-earnings', (req, res) => {
    const totalCommissions = db.orders.reduce((sum, o) => sum + (o.commission || 0), 0);
    const totalSubscriptions = db.subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + s.amount, 0);
    const totalWithdrawals = db.withdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    res.json({
        total_commissions: totalCommissions,
        subscription_revenue: totalSubscriptions,
        total_withdrawals: totalWithdrawals,
        available_balance: totalCommissions + totalSubscriptions - totalWithdrawals
    });
});

// Database backup endpoint
app.get('/api/backup', (req, res) => {
    const backupFile = path.join(__dirname, `millo-backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(db, null, 2), 'utf8');
    res.download(backupFile, `millo-backup-${new Date().toISOString().split('T')[0]}.json`, (err) => {
        if (!err) {
            fs.unlinkSync(backupFile); // Delete temp file after download
        }
    });
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Graceful shutdown - save database on exit
process.on('SIGINT', () => {
    console.log('\\n💾 Saving database before shutdown...');
    saveDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\\n💾 Saving database before shutdown...');
    saveDatabase();
    process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Millo API Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Database loaded successfully`);
    console.log(`🛍️  Access the storefront at: http://localhost:${PORT}`);
    console.log(`💾 Auto-save enabled (every 30 seconds)`);
});
