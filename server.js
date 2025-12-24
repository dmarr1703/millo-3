// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept PDFs and images
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit per file
    }
});

// Multiple file upload middleware (up to 10 images)
const multipleUpload = upload.array('images', 10);

// Stripe configuration - using environment variable for security
// Set your Stripe secret key as environment variable: STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key_here';
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Email configuration - stored in database
let emailTransporter = null;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

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
    withdrawals: [], // Track owner withdrawals
    etransfer_payments: [], // Track e-transfer payments
    settings: {
        email: {
            service: 'gmail',
            host: '',
            port: 587,
            secure: false,
            auth: {
                user: '',
                pass: ''
            },
            from: 'noreply@millo.com'
        },
        etransfer: {
            email: 'd.marr@live.ca',
            amount: 25,
            currency: 'CAD',
            frequency: 'monthly'
        }
    }
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

// Initialize email transporter
function initializeEmailTransporter() {
    if (!db.settings || !db.settings.email || !db.settings.email.auth.user) {
        console.log('⚠️  Email not configured - notifications disabled');
        return;
    }
    
    try {
        const config = db.settings.email;
        emailTransporter = nodemailer.createTransport({
            service: config.service === 'gmail' ? 'gmail' : undefined,
            host: config.service === 'gmail' ? undefined : config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.auth.user,
                pass: config.auth.pass
            }
        });
        console.log('📧 Email transporter initialized');
    } catch (error) {
        console.error('Email transporter initialization error:', error);
    }
}

// Initialize email transporter on startup
initializeEmailTransporter();

// Helper function to send email
async function sendEmail(to, subject, html) {
    if (!emailTransporter) {
        console.log('Email not configured - skipping notification');
        return { success: false, message: 'Email not configured' };
    }
    
    try {
        const info = await emailTransporter.sendMail({
            from: db.settings.email.from,
            to: to,
            subject: subject,
            html: html
        });
        console.log('📧 Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending error:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to generate unique IDs
function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Email configuration endpoints

// Get email settings
app.get('/api/email-settings', (req, res) => {
    const settings = db.settings.email || {};
    // Don't send password in response
    const safeSettings = {
        service: settings.service,
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        from: settings.from,
        configured: !!(settings.auth && settings.auth.user)
    };
    res.json(safeSettings);
});

// Update email settings (admin only)
app.post('/api/email-settings', (req, res) => {
    const { service, host, port, secure, user, pass, from } = req.body;
    
    if (!db.settings) {
        db.settings = {};
    }
    
    db.settings.email = {
        service: service || 'gmail',
        host: host || '',
        port: port || 587,
        secure: secure || false,
        auth: {
            user: user || '',
            pass: pass || ''
        },
        from: from || 'noreply@millo.com'
    };
    
    saveDatabase();
    initializeEmailTransporter();
    
    res.json({ success: true, message: 'Email settings updated' });
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
    const { to } = req.body;
    
    if (!to) {
        return res.status(400).json({ error: 'Email address required' });
    }
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #764ba2;">Test Email from millo</h2>
            <p>This is a test email to verify your email configuration is working correctly.</p>
            <p>If you received this email, your email settings are configured properly!</p>
        </div>
    `;
    
    const result = await sendEmail(to, 'Test Email from millo', html);
    
    if (result.success) {
        res.json({ success: true, message: 'Test email sent successfully' });
    } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to send email' });
    }
});

// Send order notification emails
app.post('/api/send-order-notification', async (req, res) => {
    const { orderId } = req.body;
    
    if (!orderId) {
        return res.status(400).json({ error: 'Order ID required' });
    }
    
    const order = db.orders.find(o => o.id === orderId);
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }
    
    const seller = db.users.find(u => u.id === order.seller_id);
    const product = db.products.find(p => p.id === order.product_id);
    
    // Email to customer
    const customerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 32px;">millo</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px;">Order Confirmation</p>
            </div>
            
            <div style="background: white; padding: 30px; margin-top: 20px;">
                <h2 style="color: #333; margin-top: 0;">Thank you for your order!</h2>
                <p style="color: #666; line-height: 1.6;">
                    Hi ${order.customer_name},<br><br>
                    Your order has been received and is being processed. Here are the details:
                </p>
                
                <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #764ba2;">
                    <h3 style="margin: 0 0 15px 0; color: #333;">Order Details</h3>
                    <table style="width: 100%; color: #666;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
                            <td style="padding: 8px 0;">${order.id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Product:</strong></td>
                            <td style="padding: 8px 0;">${order.product_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Color:</strong></td>
                            <td style="padding: 8px 0;">${order.color}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Quantity:</strong></td>
                            <td style="padding: 8px 0;">${order.quantity}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Total:</strong></td>
                            <td style="padding: 8px 0; font-size: 18px; color: #764ba2;"><strong>$${order.total.toFixed(2)} CAD</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #333;">Shipping Address</h3>
                    <p style="color: #666; margin: 0; line-height: 1.6;">${order.shipping_address}</p>
                </div>
                
                <p style="color: #666; line-height: 1.6;">
                    You'll receive another email with tracking information once your order ships.
                </p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Track Your Order
                    </a>
                </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>Thank you for shopping with millo!</p>
                <p>&copy; ${new Date().getFullYear()} millo. All rights reserved.</p>
            </div>
        </div>
    `;
    
    // Email to seller
    const sellerHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 32px;">millo</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px;">New Order Alert</p>
            </div>
            
            <div style="background: white; padding: 30px; margin-top: 20px;">
                <h2 style="color: #333; margin-top: 0;">You have a new order! 🎉</h2>
                <p style="color: #666; line-height: 1.6;">
                    Hi ${seller ? seller.full_name : 'Seller'},<br><br>
                    Great news! You've received a new order. Please prepare the item for shipment.
                </p>
                
                <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #764ba2;">
                    <h3 style="margin: 0 0 15px 0; color: #333;">Order Details</h3>
                    <table style="width: 100%; color: #666;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
                            <td style="padding: 8px 0;">${order.id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Product:</strong></td>
                            <td style="padding: 8px 0;">${order.product_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Color:</strong></td>
                            <td style="padding: 8px 0;">${order.color}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Quantity:</strong></td>
                            <td style="padding: 8px 0;">${order.quantity}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Your Earnings:</strong></td>
                            <td style="padding: 8px 0; font-size: 18px; color: #28a745;"><strong>$${order.seller_amount.toFixed(2)} CAD</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #333;">Customer Information</h3>
                    <table style="width: 100%; color: #666;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>Name:</strong></td>
                            <td style="padding: 8px 0;">${order.customer_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Email:</strong></td>
                            <td style="padding: 8px 0;">${order.customer_email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Shipping:</strong></td>
                            <td style="padding: 8px 0;">${order.shipping_address}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>Action Required:</strong> Please log in to your dashboard to update the order status and add tracking information.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Go to Dashboard
                    </a>
                </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>Keep providing excellent service to your customers!</p>
                <p>&copy; ${new Date().getFullYear()} millo. All rights reserved.</p>
            </div>
        </div>
    `;
    
    const results = {
        customer: null,
        seller: null
    };
    
    // Send email to customer
    results.customer = await sendEmail(
        order.customer_email,
        `Order Confirmation - ${order.product_name}`,
        customerHtml
    );
    
    // Send email to seller
    if (seller && seller.email) {
        results.seller = await sendEmail(
            seller.email,
            `New Order: ${order.product_name}`,
            sellerHtml
        );
    }
    
    res.json({
        success: true,
        results: results
    });
});

// Single file upload endpoint for product images/PDFs
app.post('/api/upload-file', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Return the file URL
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            fileUrl: fileUrl,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Multiple file upload endpoint for product images
app.post('/api/upload-files', multipleUpload, (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        // Return array of file URLs
        const fileUrls = req.files.map(file => ({
            fileUrl: `/uploads/${file.filename}`,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size
        }));
        
        res.json({
            success: true,
            files: fileUrls,
            count: req.files.length
        });
    } catch (error) {
        console.error('Multiple file upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

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

// Stripe subscription endpoint for sellers - Monthly recurring payment
app.post('/api/create-subscription', async (req, res) => {
    try {
        const { seller_id, seller_email, product_id, product_name, amount = 25 } = req.body;
        
        if (!seller_id || !seller_email) {
            return res.status(400).json({ error: 'Seller ID and email are required' });
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
        
        // Create a price for monthly subscription
        const price = await stripe.prices.create({
            currency: 'cad',
            unit_amount: amount * 100, // Convert to cents
            recurring: {
                interval: 'month',
                interval_count: 1
            },
            product_data: {
                name: `Product Listing Fee - ${product_name || 'Product'}`,
                description: 'Monthly subscription fee for listing products on millo marketplace'
            },
            metadata: {
                product_id: product_id || 'pending'
            }
        });
        
        // Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: {
                seller_id: seller_id,
                product_id: product_id || 'pending',
                product_name: product_name || 'Product'
            }
        });
        
        // Save subscription to database
        const subscriptionRecord = {
            id: generateId('subscription'),
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customer.id,
            stripe_price_id: price.id,
            seller_id: seller_id,
            product_id: product_id || 'pending',
            amount: amount,
            currency: 'cad',
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
            start_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        
        db.subscriptions.push(subscriptionRecord);
        saveDatabase();
        
        res.json({
            subscriptionId: subscriptionRecord.id,
            stripeSubscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            status: subscription.status
        });
        
    } catch (error) {
        console.error('Stripe subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create invoice-based subscription for sellers - 25 CAD per month per product
app.post('/api/create-invoice-subscription', async (req, res) => {
    try {
        const { seller_id, seller_email, product_id, product_name, amount = 25, days_until_due = 30 } = req.body;
        
        if (!seller_id || !seller_email) {
            return res.status(400).json({ error: 'Seller ID and email are required' });
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
        
        // Create a price for monthly subscription (using existing or create new)
        // For invoice-based subscriptions, we'll create a specific price
        const price = await stripe.prices.create({
            currency: 'cad',
            unit_amount: amount * 100, // Convert to cents
            recurring: {
                interval: 'month',
                interval_count: 1
            },
            product_data: {
                name: `Product Listing Fee - ${product_name || 'Product'}`,
                description: 'Monthly subscription fee for listing products on millo marketplace (Invoice)'
            },
            metadata: {
                product_id: product_id || 'pending',
                billing_type: 'invoice'
            }
        });
        
        // Create invoice-based subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            collection_method: 'send_invoice',
            currency: 'cad',
            days_until_due: days_until_due,
            items: [
                {
                    price: price.id,
                    quantity: 1
                }
            ],
            off_session: true,
            payment_behavior: 'error_if_incomplete',
            proration_behavior: 'none',
            metadata: {
                seller_id: seller_id,
                product_id: product_id || 'pending',
                product_name: product_name || 'Product'
            }
        });
        
        // Save subscription to database
        const subscriptionRecord = {
            id: generateId('subscription'),
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customer.id,
            stripe_price_id: price.id,
            seller_id: seller_id,
            product_id: product_id || 'pending',
            amount: amount,
            currency: 'cad',
            collection_method: 'send_invoice',
            days_until_due: days_until_due,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
            start_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        };
        
        db.subscriptions.push(subscriptionRecord);
        saveDatabase();
        
        res.json({
            success: true,
            subscriptionId: subscriptionRecord.id,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            invoiceUrl: subscription.latest_invoice ? `https://dashboard.stripe.com/invoices/${subscription.latest_invoice}` : null,
            message: 'Invoice subscription created successfully. Invoice will be sent to customer email.'
        });
        
    } catch (error) {
        console.error('Stripe invoice subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Confirm subscription payment and activate product
app.post('/api/confirm-subscription', async (req, res) => {
    try {
        const { subscription_id, product_id } = req.body;
        
        if (!subscription_id) {
            return res.status(400).json({ error: 'Subscription ID required' });
        }
        
        // Find subscription in database
        const subscription = db.subscriptions.find(s => s.id === subscription_id);
        
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Verify subscription status with Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        
        if (stripeSubscription.status === 'active') {
            // Update subscription in database
            const subIndex = db.subscriptions.findIndex(s => s.id === subscription_id);
            db.subscriptions[subIndex].status = 'active';
            db.subscriptions[subIndex].product_id = product_id;
            saveDatabase();
            
            res.json({
                success: true,
                subscription: db.subscriptions[subIndex]
            });
        } else {
            res.status(400).json({ 
                error: 'Subscription not active', 
                status: stripeSubscription.status 
            });
        }
        
    } catch (error) {
        console.error('Subscription confirmation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// E-transfer payment submission endpoint
app.post('/api/etransfer/submit', async (req, res) => {
    try {
        const { 
            seller_id, 
            seller_email, 
            product_id, 
            product_name,
            reference_number,
            amount,
            transfer_date 
        } = req.body;
        
        if (!seller_id || !seller_email || !reference_number) {
            return res.status(400).json({ error: 'Seller ID, email, and reference number are required' });
        }
        
        // Create e-transfer payment record (pending admin approval)
        const etransferPayment = {
            id: generateId('etransfer'),
            seller_id: seller_id,
            seller_email: seller_email,
            product_id: product_id || 'pending',
            product_name: product_name || 'Product',
            reference_number: reference_number,
            amount: amount || 25,
            currency: 'CAD',
            transfer_date: transfer_date || new Date().toISOString(),
            status: 'pending', // pending, approved, rejected
            created_at: new Date().toISOString(),
            approved_at: null,
            approved_by: null
        };
        
        db.etransfer_payments.push(etransferPayment);
        saveDatabase();
        
        res.json({
            success: true,
            payment: etransferPayment,
            message: 'E-transfer payment submitted successfully. Please wait for admin approval.'
        });
        
    } catch (error) {
        console.error('E-transfer submission error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get e-transfer payments for a seller
app.get('/api/etransfer/seller/:seller_id', (req, res) => {
    const { seller_id } = req.params;
    const payments = db.etransfer_payments.filter(p => p.seller_id === seller_id);
    res.json(payments);
});

// Get all e-transfer payments (admin only)
app.get('/api/etransfer/all', (req, res) => {
    res.json(db.etransfer_payments);
});

// Approve e-transfer payment (admin only)
app.post('/api/etransfer/approve', async (req, res) => {
    try {
        const { payment_id, admin_id } = req.body;
        
        // Verify admin
        const admin = db.users.find(u => u.id === admin_id && u.role === 'admin');
        if (!admin) {
            return res.status(403).json({ error: 'Unauthorized - admin access required' });
        }
        
        // Find payment
        const paymentIndex = db.etransfer_payments.findIndex(p => p.id === payment_id);
        if (paymentIndex === -1) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const payment = db.etransfer_payments[paymentIndex];
        
        // Update payment status
        db.etransfer_payments[paymentIndex].status = 'approved';
        db.etransfer_payments[paymentIndex].approved_at = new Date().toISOString();
        db.etransfer_payments[paymentIndex].approved_by = admin_id;
        
        // Activate the product if it exists
        if (payment.product_id && payment.product_id !== 'pending') {
            const productIndex = db.products.findIndex(p => p.id === payment.product_id);
            if (productIndex !== -1) {
                db.products[productIndex].status = 'active';
                db.products[productIndex].subscription_status = 'active';
                db.products[productIndex].payment_confirmed = true;
            }
        }
        
        // Create subscription record
        const subscription = {
            id: generateId('subscription'),
            seller_id: payment.seller_id,
            product_id: payment.product_id,
            amount: payment.amount,
            currency: 'CAD',
            status: 'active',
            payment_method: 'etransfer',
            etransfer_payment_id: payment_id,
            start_date: new Date().toISOString(),
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            created_at: new Date().toISOString()
        };
        
        db.subscriptions.push(subscription);
        saveDatabase();
        
        res.json({
            success: true,
            payment: db.etransfer_payments[paymentIndex],
            subscription: subscription,
            message: 'Payment approved and product activated'
        });
        
    } catch (error) {
        console.error('E-transfer approval error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reject e-transfer payment (admin only)
app.post('/api/etransfer/reject', async (req, res) => {
    try {
        const { payment_id, admin_id, reason } = req.body;
        
        // Verify admin
        const admin = db.users.find(u => u.id === admin_id && u.role === 'admin');
        if (!admin) {
            return res.status(403).json({ error: 'Unauthorized - admin access required' });
        }
        
        // Find payment
        const paymentIndex = db.etransfer_payments.findIndex(p => p.id === payment_id);
        if (paymentIndex === -1) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const payment = db.etransfer_payments[paymentIndex];
        
        // Update payment status
        db.etransfer_payments[paymentIndex].status = 'rejected';
        db.etransfer_payments[paymentIndex].rejected_at = new Date().toISOString();
        db.etransfer_payments[paymentIndex].rejected_by = admin_id;
        db.etransfer_payments[paymentIndex].rejection_reason = reason || 'Payment verification failed';
        
        // Delete the pending product if it exists
        if (payment.product_id && payment.product_id !== 'pending') {
            const productIndex = db.products.findIndex(p => p.id === payment.product_id);
            if (productIndex !== -1) {
                db.products.splice(productIndex, 1);
            }
        }
        
        saveDatabase();
        
        res.json({
            success: true,
            payment: db.etransfer_payments[paymentIndex],
            message: 'Payment rejected and product removed'
        });
        
    } catch (error) {
        console.error('E-transfer rejection error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get e-transfer settings
app.get('/api/etransfer/settings', (req, res) => {
    res.json(db.settings.etransfer || {
        email: 'd.marr@live.ca',
        amount: 25,
        currency: 'CAD',
        frequency: 'monthly'
    });
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

// Stripe webhook endpoint for handling subscription events
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.warn('⚠️  Stripe webhook secret not configured');
        return res.status(400).send('Webhook secret not configured');
    }
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'invoice.payment_succeeded':
            const invoice = event.data.object;
            console.log('💰 Invoice payment succeeded:', invoice.id);
            
            // Update subscription status in database
            const subscription = db.subscriptions.find(s => s.stripe_subscription_id === invoice.subscription);
            if (subscription) {
                const subIndex = db.subscriptions.findIndex(s => s.id === subscription.id);
                db.subscriptions[subIndex].status = 'active';
                db.subscriptions[subIndex].last_payment_date = new Date().toISOString();
                saveDatabase();
            }
            break;
            
        case 'invoice.payment_failed':
            const failedInvoice = event.data.object;
            console.log('❌ Invoice payment failed:', failedInvoice.id);
            
            // Update subscription status
            const failedSub = db.subscriptions.find(s => s.stripe_subscription_id === failedInvoice.subscription);
            if (failedSub) {
                const subIndex = db.subscriptions.findIndex(s => s.id === failedSub.id);
                db.subscriptions[subIndex].status = 'past_due';
                
                // Deactivate associated product
                if (failedSub.product_id) {
                    const productIndex = db.products.findIndex(p => p.id === failedSub.product_id);
                    if (productIndex !== -1) {
                        db.products[productIndex].status = 'inactive';
                        db.products[productIndex].subscription_status = 'past_due';
                    }
                }
                saveDatabase();
            }
            break;
            
        case 'customer.subscription.deleted':
            const deletedSub = event.data.object;
            console.log('🗑️  Subscription deleted:', deletedSub.id);
            
            // Cancel subscription in database
            const cancelledSub = db.subscriptions.find(s => s.stripe_subscription_id === deletedSub.id);
            if (cancelledSub) {
                const subIndex = db.subscriptions.findIndex(s => s.id === cancelledSub.id);
                db.subscriptions[subIndex].status = 'cancelled';
                
                // Deactivate product
                if (cancelledSub.product_id) {
                    const productIndex = db.products.findIndex(p => p.id === cancelledSub.product_id);
                    if (productIndex !== -1) {
                        db.products[productIndex].status = 'inactive';
                        db.products[productIndex].subscription_status = 'cancelled';
                    }
                }
                saveDatabase();
            }
            break;
            
        case 'customer.subscription.updated':
            const updatedSub = event.data.object;
            console.log('🔄 Subscription updated:', updatedSub.id);
            
            // Update subscription in database
            const existingSub = db.subscriptions.find(s => s.stripe_subscription_id === updatedSub.id);
            if (existingSub) {
                const subIndex = db.subscriptions.findIndex(s => s.id === existingSub.id);
                db.subscriptions[subIndex].status = updatedSub.status;
                db.subscriptions[subIndex].current_period_start = new Date(updatedSub.current_period_start * 1000).toISOString();
                db.subscriptions[subIndex].current_period_end = new Date(updatedSub.current_period_end * 1000).toISOString();
                saveDatabase();
            }
            break;
            
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({received: true});
});

// Get Stripe publishable key for frontend
app.get('/api/stripe/config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
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
