const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Stripe with secret key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe configuration - using environment variable for security
// Set your Stripe secret key as environment variable: STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key_here';
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Middleware
app.use(cors());

// Stripe webhook needs raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON middleware for all other routes
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

// ====================================
// STRIPE PAYMENT ENDPOINTS
// ====================================

// Get Stripe publishable key
app.get('/api/stripe/config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// Create Payment Intent for checkout
app.post('/api/stripe/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'cad', metadata = {} } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: metadata
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create subscription for product listing fee
app.post('/api/stripe/create-subscription', async (req, res) => {
    try {
        const { seller_id, seller_email, product_id, product_name } = req.body;

        if (!seller_email) {
            return res.status(400).json({ error: 'Seller email is required' });
        }

        // Find or create Stripe customer
        let customer;
        const existingCustomers = await stripe.customers.list({
            email: seller_email,
            limit: 1
        });

        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
        } else {
            customer = await stripe.customers.create({
                email: seller_email,
                metadata: {
                    seller_id: seller_id
                }
            });
        }

        // Create a price for the listing fee (if not exists)
        const listingFeeAmount = parseInt(process.env.LISTING_FEE_AMOUNT) || 2500; // $25 in cents
        const listingFeeCurrency = process.env.LISTING_FEE_CURRENCY || 'cad';

        // For simplicity, create a new price each time
        // In production, you should reuse existing prices
        const price = await stripe.prices.create({
            unit_amount: listingFeeAmount,
            currency: listingFeeCurrency,
            recurring: {
                interval: 'month',
            },
            product_data: {
                name: 'Product Listing Fee',
                description: `Monthly fee for listing: ${product_name || 'Product'}`,
            },
            metadata: {
                product_id: product_id,
                seller_id: seller_id
            }
        });

        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
            metadata: {
                seller_id: seller_id,
                product_id: product_id,
                product_name: product_name
            }
        });

        // Save subscription to database
        const subscriptionRecord = {
            id: generateId('subscription'),
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customer.id,
            seller_id: seller_id,
            product_id: product_id,
            product_name: product_name,
            amount: listingFeeAmount / 100, // Convert to dollars
            currency: listingFeeCurrency,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString()
        };

        db.subscriptions.push(subscriptionRecord);
        saveDatabase();

        res.json({
            subscription: subscriptionRecord,
            stripe_subscription: subscription
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancel subscription
app.post('/api/stripe/cancel-subscription', async (req, res) => {
    try {
        const { subscription_id } = req.body;

        if (!subscription_id) {
            return res.status(400).json({ error: 'Subscription ID is required' });
        }

        // Find subscription in database
        const subscription = db.subscriptions.find(s => s.id === subscription_id);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Cancel in Stripe
        const canceledSubscription = await stripe.subscriptions.cancel(
            subscription.stripe_subscription_id
        );

        // Update in database
        const index = db.subscriptions.findIndex(s => s.id === subscription_id);
        db.subscriptions[index].status = 'canceled';
        db.subscriptions[index].canceled_at = new Date().toISOString();
        saveDatabase();

        res.json({
            subscription: db.subscriptions[index],
            stripe_subscription: canceledSubscription
        });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stripe Webhook Handler
app.post('/api/stripe/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    console.log(`Received event: ${event.type}`);

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('PaymentIntent succeeded:', paymentIntent.id);
                // Payment successful - order should already be created
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                console.log('PaymentIntent failed:', failedPayment.id);
                // Handle failed payment
                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                console.log('Invoice payment succeeded:', invoice.id);
                // Update subscription status if needed
                const subscription = db.subscriptions.find(
                    s => s.stripe_subscription_id === invoice.subscription
                );
                if (subscription) {
                    const index = db.subscriptions.findIndex(
                        s => s.id === subscription.id
                    );
                    db.subscriptions[index].status = 'active';
                    db.subscriptions[index].last_payment = new Date().toISOString();
                    saveDatabase();
                }
                break;

            case 'invoice.payment_failed':
                const failedInvoice = event.data.object;
                console.log('Invoice payment failed:', failedInvoice.id);
                // Handle failed subscription payment
                const failedSubscription = db.subscriptions.find(
                    s => s.stripe_subscription_id === failedInvoice.subscription
                );
                if (failedSubscription) {
                    const index = db.subscriptions.findIndex(
                        s => s.id === failedSubscription.id
                    );
                    db.subscriptions[index].status = 'past_due';
                    saveDatabase();
                }
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object;
                console.log('Subscription deleted:', deletedSubscription.id);
                // Update subscription status
                const deletedSub = db.subscriptions.find(
                    s => s.stripe_subscription_id === deletedSubscription.id
                );
                if (deletedSub) {
                    const index = db.subscriptions.findIndex(
                        s => s.id === deletedSub.id
                    );
                    db.subscriptions[index].status = 'canceled';
                    db.subscriptions[index].canceled_at = new Date().toISOString();
                    saveDatabase();
                }
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object;
                console.log('Subscription updated:', updatedSubscription.id);
                // Update subscription details
                const updatedSub = db.subscriptions.find(
                    s => s.stripe_subscription_id === updatedSubscription.id
                );
                if (updatedSub) {
                    const index = db.subscriptions.findIndex(
                        s => s.id === updatedSub.id
                    );
                    db.subscriptions[index].status = updatedSubscription.status;
                    db.subscriptions[index].current_period_start = new Date(
                        updatedSubscription.current_period_start * 1000
                    ).toISOString();
                    db.subscriptions[index].current_period_end = new Date(
                        updatedSubscription.current_period_end * 1000
                    ).toISOString();
                    saveDatabase();
                }
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: error.message });
    }
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
