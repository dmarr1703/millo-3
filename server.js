// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'millo-jwt-secret-change-in-production';
const SALT_ROUNDS = 10;

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
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB per file
        files: 20                    // max 20 files per request
    },
    fileFilter: function (req, file, cb) {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.`), false);
        }
    }
});

// Support both 'images' and 'image' field names to avoid UNEXPECTED_FIELD errors
const multipleUpload = upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'image',  maxCount: 20 }
]);

// Stripe configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
let stripe = null;
if (STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== 'sk_test_your_secret_key_here') {
    try {
        stripe = require('stripe')(STRIPE_SECRET_KEY);
        console.log('✅ Stripe initialized');
    } catch (e) {
        console.warn('⚠️  Stripe initialization failed:', e.message);
    }
} else {
    console.warn('⚠️  Stripe secret key not configured — payment endpoints disabled');
}

// Email configuration
let emailTransporter = null;

// Middleware
app.use(cors());
// Raw body for Stripe webhooks BEFORE json middleware
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Database ────────────────────────────────────────────────────────────────

const DB_FILE = path.join(__dirname, 'millo-database.json');

const OWNER_EMAIL = 'owner@millo.com';

let db = {
    users: [],
    products: [],
    orders: [],
    subscriptions: [],
    withdrawals: [],
    etransfer_payments: [],
    settings: {
        email: {
            service: 'gmail',
            host: '',
            port: 587,
            secure: false,
            auth: { user: '', pass: '' },
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

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            db = JSON.parse(data);
            console.log('📦 Database loaded from file');
        } else {
            console.log('🆕 Starting with fresh database — creating admin account');
            createDefaultAdmin();
            saveDatabase();
        }
    } catch (error) {
        console.error('Error loading database:', error);
        createDefaultAdmin();
    }
}

async function createDefaultAdmin() {
    // Only add admin if no admin exists
    if (db.users.some(u => u.role === 'admin')) return;
    const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    db.users.push({
        id: 'user-admin-1',
        email: OWNER_EMAIL,
        password: hashedPassword,
        full_name: 'Admin Owner',
        role: 'admin',
        status: 'active',
        is_owner: true,
        payment_exempt: true,
        created_at: '2024-01-01T00:00:00.000Z'
    });
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

setInterval(saveDatabase, 30000);
loadDatabase();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isOwnerAccount(user) {
    return user && (user.email === OWNER_EMAIL || user.is_owner === true || user.role === 'admin');
}

// ─── JWT Auth Middleware ──────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function adminMiddleware(req, res, next) {
    authMiddleware(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
        }

        // Support both plain-text (legacy) and bcrypt passwords
        let passwordMatch = false;
        if (user.password.startsWith('$2')) {
            passwordMatch = await bcrypt.compare(password, user.password);
        } else {
            // Migrate plain-text password to bcrypt on first login
            passwordMatch = (user.password === password);
            if (passwordMatch) {
                const idx = db.users.findIndex(u => u.id === user.id);
                db.users[idx].password = await bcrypt.hash(password, SALT_ROUNDS);
                saveDatabase();
            }
        }

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user without password
        const { password: _pw, ...safeUser } = user;
        res.json({ token, user: safeUser });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, full_name, role } = req.body;
        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Email, password, and full name are required' });
        }

        const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = {
            id: generateId('user'),
            email: email.toLowerCase(),
            password: hashedPassword,
            full_name,
            role: isOwner ? 'admin' : (role || 'customer'),
            status: 'active',
            is_owner: isOwner,
            payment_exempt: isOwner,
            created_at: new Date().toISOString()
        };

        db.users.push(newUser);
        saveDatabase();

        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _pw, ...safeUser } = newUser;
        res.status(201).json({ token, user: safeUser });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

// GET /api/auth/me  — verify token and return current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
});

// ─── Email ────────────────────────────────────────────────────────────────────

function initializeEmailTransporter() {
    if (!db.settings?.email?.auth?.user) {
        console.log('⚠️  Email not configured');
        return;
    }
    try {
        const config = db.settings.email;
        emailTransporter = nodemailer.createTransport({
            service: config.service === 'gmail' ? 'gmail' : undefined,
            host: config.service === 'gmail' ? undefined : config.host,
            port: config.port,
            secure: config.secure,
            auth: { user: config.auth.user, pass: config.auth.pass }
        });
        console.log('📧 Email transporter initialized');
    } catch (error) {
        console.error('Email transporter error:', error);
    }
}

initializeEmailTransporter();

async function sendEmail(to, subject, html) {
    if (!emailTransporter) return { success: false, message: 'Email not configured' };
    try {
        const info = await emailTransporter.sendMail({
            from: db.settings.email.from,
            to, subject, html
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

app.get('/api/email-settings', (req, res) => {
    const settings = db.settings.email || {};
    res.json({
        service: settings.service,
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        from: settings.from,
        configured: !!(settings.auth && settings.auth.user)
    });
});

app.post('/api/email-settings', (req, res) => {
    const { service, host, port, secure, user, pass, from } = req.body;
    if (!db.settings) db.settings = {};
    db.settings.email = {
        service: service || 'gmail',
        host: host || '',
        port: port || 587,
        secure: secure || false,
        auth: { user: user || '', pass: pass || '' },
        from: from || 'noreply@millo.com'
    };
    saveDatabase();
    initializeEmailTransporter();
    res.json({ success: true, message: 'Email settings updated' });
});

app.post('/api/test-email', async (req, res) => {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Email address required' });
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#764ba2">Test Email from millo</h2>
        <p>Your email configuration is working correctly!</p></div>`;
    const result = await sendEmail(to, 'Test Email from millo', html);
    if (result.success) res.json({ success: true });
    else res.status(500).json({ success: false, error: result.error });
});

app.post('/api/send-order-notification', async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Order ID required' });

    const order = db.orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const seller = db.users.find(u => u.id === order.seller_id);

    const customerHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#764ba2">Order Confirmation — millo</h2>
        <p>Hi ${order.customer_name}, your order <strong>${order.id}</strong> has been placed!</p>
        <p>Product: <strong>${order.product_name}</strong> (${order.color}) × ${order.quantity}</p>
        <p>Total: <strong>$${order.total.toFixed(2)} CAD</strong></p>
        <p>Shipping to: ${order.shipping_address}</p></div>`;

    const sellerHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#764ba2">New Order — millo</h2>
        <p>Hi ${seller ? seller.full_name : 'Seller'}, you have a new order!</p>
        <p>Product: <strong>${order.product_name}</strong> (${order.color}) × ${order.quantity}</p>
        <p>Your earnings: <strong>$${order.seller_amount.toFixed(2)} CAD</strong></p>
        <p>Ship to: ${order.shipping_address}</p></div>`;

    const results = {
        customer: await sendEmail(order.customer_email, `Order Confirmation — ${order.product_name}`, customerHtml),
        seller: seller?.email ? await sendEmail(seller.email, `New Order: ${order.product_name}`, sellerHtml) : null
    };

    res.json({ success: true, results });
});

// ─── File Upload ──────────────────────────────────────────────────────────────

app.post('/api/upload-file', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({
        success: true,
        fileUrl: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
});

app.post('/api/upload-files', (req, res) => {
    multipleUpload(req, res, function (err) {
        if (err) {
            if (err instanceof multer.MulterError) {
                // Give a friendly message for the most common multer errors
                let msg = err.message;
                if (err.code === 'LIMIT_FILE_SIZE')  msg = 'File too large — maximum size is 10 MB per file.';
                if (err.code === 'LIMIT_FILE_COUNT') msg = 'Too many files — maximum is 20 files per request.';
                if (err.code === 'LIMIT_UNEXPECTED_FILE') msg = 'Unexpected file field. Use the field name "images".';
                return res.status(400).json({ error: msg });
            }
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }

        // req.files is an object when using upload.fields(): { images: [...], image: [...] }
        const allFiles = [
            ...(req.files?.images || []),
            ...(req.files?.image  || [])
        ];

        if (allFiles.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const fileUrls = allFiles.map(file => ({
            fileUrl: `/uploads/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        }));
        res.json({ success: true, files: fileUrls, count: allFiles.length });
    });
});

// ─── REST Table API ───────────────────────────────────────────────────────────

// Allowed public read tables (no auth needed for GET)
const PUBLIC_READ_TABLES = ['products'];
// Tables that require auth for all operations
const PROTECTED_TABLES = ['users', 'orders', 'subscriptions', 'withdrawals', 'etransfer_payments'];

app.get('/tables/:table', (req, res) => {
    const { table } = req.params;
    if (!db[table]) return res.status(404).json({ error: 'Table not found' });
    const { limit = 100, offset = 0 } = req.query;
    let data = db[table];
    // Never expose password hashes to the client
    if (table === 'users') {
        data = data.map(({ password, ...u }) => u);
    }
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    res.json({ data: data.slice(start, end), total: data.length, limit: parseInt(limit), offset: parseInt(offset) });
});

app.get('/tables/:table/:id', (req, res) => {
    const { table, id } = req.params;
    if (!db[table]) return res.status(404).json({ error: 'Table not found' });
    const item = db[table].find(item => item.id === id);
    if (!item) return res.status(404).json({ error: 'Record not found' });
    // Never expose password hashes
    if (table === 'users') {
        const { password, ...safeItem } = item;
        return res.json(safeItem);
    }
    res.json(item);
});

app.post('/tables/:table', (req, res) => {
    const { table } = req.params;
    if (!db[table]) return res.status(404).json({ error: 'Table not found' });
    // Users must be created via /api/auth/signup
    if (table === 'users') return res.status(403).json({ error: 'Use /api/auth/signup to create users' });
    const data = req.body;
    if (!data.id) {
        const prefix = table.replace(/s$/, '');
        data.id = generateId(prefix);
    }
    if (!data.created_at) data.created_at = new Date().toISOString();
    db[table].push(data);
    saveDatabase();
    res.status(201).json(data);
});

app.put('/tables/:table/:id', (req, res) => {
    const { table, id } = req.params;
    if (!db[table]) return res.status(404).json({ error: 'Table not found' });
    const index = db[table].findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Record not found' });
    const data = req.body;
    data.id = id;
    if (db[table][index].created_at) data.created_at = db[table][index].created_at;
    db[table][index] = data;
    saveDatabase();
    res.json(data);
});

app.patch('/tables/:table/:id', (req, res) => {
    const { table, id } = req.params;
    if (!db[table]) return res.status(404).json({ error: 'Table not found' });
    const index = db[table].findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Record not found' });
    // Prevent overwriting password via generic PATCH
    const updates = { ...req.body };
    if (table === 'users') delete updates.password;
    db[table][index] = {
        ...db[table][index],
        ...updates,
        id,
        created_at: db[table][index].created_at
    };
    saveDatabase();
    // Return safe user (no password)
    if (table === 'users') {
        const { password, ...safeItem } = db[table][index];
        return res.json(safeItem);
    }
    res.json(db[table][index]);
});

app.delete('/tables/:table/:id', (req, res) => {
    const { table, id } = req.params;
    if (!db[table]) return res.status(404).json({ error: 'Table not found' });
    const index = db[table].findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Record not found' });
    const deleted = db[table].splice(index, 1)[0];
    saveDatabase();
    res.json({ message: 'Record deleted', data: deleted });
});

// ─── Stripe ───────────────────────────────────────────────────────────────────

app.get('/api/stripe/config', (req, res) => {
    const key = process.env.STRIPE_PUBLISHABLE_KEY || '';
    const configured = key && key !== 'pk_test_your_publishable_key_here';
    res.json({
        publishableKey: configured ? key : null,
        configured
    });
});

app.post('/api/create-payment-intent', async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Stripe is not configured on this server. Please set STRIPE_SECRET_KEY in .env' });
    try {
        const { amount, currency = 'cad', metadata } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            metadata: metadata || {},
            automatic_payment_methods: { enabled: true }
        });
        res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (error) {
        console.error('Stripe payment intent error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/create-subscription', async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' });
    try {
        const { seller_id, seller_email, product_id, product_name, amount = 25 } = req.body;
        if (!seller_id || !seller_email) return res.status(400).json({ error: 'Seller ID and email required' });

        let customer;
        const existing = await stripe.customers.list({ email: seller_email, limit: 1 });
        customer = existing.data.length > 0 ? existing.data[0] : await stripe.customers.create({ email: seller_email, metadata: { seller_id } });

        const price = await stripe.prices.create({
            currency: 'cad',
            unit_amount: amount * 100,
            recurring: { interval: 'month' },
            product_data: { name: `Listing Fee — ${product_name || 'Product'}` },
            metadata: { product_id: product_id || 'pending' }
        });

        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.payment_intent'],
            metadata: { seller_id, product_id: product_id || 'pending', product_name: product_name || 'Product' }
        });

        const subRecord = {
            id: generateId('subscription'),
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customer.id,
            seller_id, product_id: product_id || 'pending',
            amount, currency: 'cad', status: subscription.status,
            start_date: new Date().toISOString(),
            next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
            created_at: new Date().toISOString()
        };
        db.subscriptions.push(subRecord);
        saveDatabase();

        res.json({
            subscriptionId: subRecord.id,
            stripeSubscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            status: subscription.status
        });
    } catch (error) {
        console.error('Stripe subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/confirm-subscription', async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' });
    try {
        const { subscription_id, product_id } = req.body;
        const sub = db.subscriptions.find(s => s.id === subscription_id);
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });

        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        if (stripeSub.status === 'active') {
            const idx = db.subscriptions.findIndex(s => s.id === subscription_id);
            db.subscriptions[idx].status = 'active';
            db.subscriptions[idx].product_id = product_id;
            saveDatabase();
            res.json({ success: true, subscription: db.subscriptions[idx] });
        } else {
            res.status(400).json({ error: 'Subscription not active', status: stripeSub.status });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stripe webhook
app.post('/api/stripe/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(400).send('Webhook secret not configured');
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'invoice.payment_succeeded': {
            const inv = event.data.object;
            const sub = db.subscriptions.find(s => s.stripe_subscription_id === inv.subscription);
            if (sub) {
                const idx = db.subscriptions.findIndex(s => s.id === sub.id);
                db.subscriptions[idx].status = 'active';
                db.subscriptions[idx].last_payment_date = new Date().toISOString();
                saveDatabase();
            }
            break;
        }
        case 'invoice.payment_failed': {
            const inv = event.data.object;
            const sub = db.subscriptions.find(s => s.stripe_subscription_id === inv.subscription);
            if (sub) {
                const idx = db.subscriptions.findIndex(s => s.id === sub.id);
                db.subscriptions[idx].status = 'past_due';
                if (sub.product_id) {
                    const pi = db.products.findIndex(p => p.id === sub.product_id);
                    if (pi !== -1) { db.products[pi].status = 'inactive'; db.products[pi].subscription_status = 'past_due'; }
                }
                saveDatabase();
            }
            break;
        }
        case 'customer.subscription.deleted': {
            const del = event.data.object;
            const sub = db.subscriptions.find(s => s.stripe_subscription_id === del.id);
            if (sub) {
                const idx = db.subscriptions.findIndex(s => s.id === sub.id);
                db.subscriptions[idx].status = 'cancelled';
                if (sub.product_id) {
                    const pi = db.products.findIndex(p => p.id === sub.product_id);
                    if (pi !== -1) { db.products[pi].status = 'inactive'; db.products[pi].subscription_status = 'cancelled'; }
                }
                saveDatabase();
            }
            break;
        }
    }
    res.json({ received: true });
});

// ─── E-Transfer ───────────────────────────────────────────────────────────────

app.post('/api/etransfer/submit', async (req, res) => {
    try {
        const { seller_id, seller_email, product_id, product_name, reference_number, amount, transfer_date } = req.body;
        if (!seller_id || !seller_email) return res.status(400).json({ error: 'Seller ID and email required' });

        const sellerUser = db.users.find(u => u.id === seller_id);
        const isOwner = sellerUser && (sellerUser.is_owner || sellerUser.payment_exempt || sellerUser.role === 'admin');
        const now = new Date().toISOString();

        const payment = {
            id: generateId('etransfer'),
            seller_id, seller_email,
            product_id: product_id || 'pending',
            product_name: product_name || 'Product',
            reference_number: reference_number || 'OWNER-FREE',
            amount: isOwner ? 0 : (amount || 25),
            currency: 'CAD',
            transfer_date: transfer_date || now,
            status: isOwner ? 'approved' : 'pending',
            created_at: now,
            approved_at: isOwner ? now : null,
            approved_by: isOwner ? 'system-owner-exempt' : null,
            payment_exempt: isOwner
        };

        db.etransfer_payments.push(payment);

        if (isOwner && product_id) {
            const pi = db.products.findIndex(p => p.id === product_id);
            if (pi !== -1) {
                db.products[pi] = { ...db.products[pi], status: 'active', subscription_status: 'active', payment_confirmed: true, payment_exempt: true };
            }
        }

        saveDatabase();
        res.json({
            success: true, payment,
            message: isOwner ? 'Owner account — product activated instantly.' : 'Payment submitted. Awaiting admin approval.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/etransfer/seller/:seller_id', (req, res) => {
    res.json(db.etransfer_payments.filter(p => p.seller_id === req.params.seller_id));
});

app.get('/api/etransfer/all', (req, res) => {
    res.json(db.etransfer_payments);
});

app.post('/api/etransfer/approve', async (req, res) => {
    try {
        const { payment_id, admin_id } = req.body;
        const admin = db.users.find(u => u.id === admin_id && u.role === 'admin');
        if (!admin) return res.status(403).json({ error: 'Admin access required' });

        const pi = db.etransfer_payments.findIndex(p => p.id === payment_id);
        if (pi === -1) return res.status(404).json({ error: 'Payment not found' });

        const payment = db.etransfer_payments[pi];
        db.etransfer_payments[pi] = { ...payment, status: 'approved', approved_at: new Date().toISOString(), approved_by: admin_id };

        if (payment.product_id && payment.product_id !== 'pending') {
            const prodIdx = db.products.findIndex(p => p.id === payment.product_id);
            if (prodIdx !== -1) {
                db.products[prodIdx].status = 'active';
                db.products[prodIdx].subscription_status = 'active';
                db.products[prodIdx].payment_confirmed = true;
            }
        }

        const sub = {
            id: generateId('subscription'),
            seller_id: payment.seller_id,
            product_id: payment.product_id,
            amount: payment.amount,
            currency: 'CAD',
            status: 'active',
            payment_method: 'etransfer',
            etransfer_payment_id: payment_id,
            start_date: new Date().toISOString(),
            next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
        };
        db.subscriptions.push(sub);
        saveDatabase();

        res.json({ success: true, payment: db.etransfer_payments[pi], subscription: sub });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/etransfer/reject', async (req, res) => {
    try {
        const { payment_id, admin_id, reason } = req.body;
        const admin = db.users.find(u => u.id === admin_id && u.role === 'admin');
        if (!admin) return res.status(403).json({ error: 'Admin access required' });

        const pi = db.etransfer_payments.findIndex(p => p.id === payment_id);
        if (pi === -1) return res.status(404).json({ error: 'Payment not found' });

        const payment = db.etransfer_payments[pi];
        db.etransfer_payments[pi] = {
            ...payment, status: 'rejected',
            rejected_at: new Date().toISOString(), rejected_by: admin_id,
            rejection_reason: reason || 'Payment verification failed'
        };

        if (payment.product_id && payment.product_id !== 'pending') {
            const prodIdx = db.products.findIndex(p => p.id === payment.product_id);
            if (prodIdx !== -1) db.products.splice(prodIdx, 1);
        }

        saveDatabase();
        res.json({ success: true, payment: db.etransfer_payments[pi] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/etransfer/settings', (req, res) => {
    res.json(db.settings.etransfer || { email: 'd.marr@live.ca', amount: 25, currency: 'CAD', frequency: 'monthly' });
});

// ─── Owner / Withdrawals ──────────────────────────────────────────────────────

app.get('/api/owner-earnings', (req, res) => {
    const totalCommissions = db.orders.reduce((sum, o) => sum + (o.commission || 0), 0);
    const totalSubscriptions = db.subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalWithdrawals = db.withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    res.json({
        total_commissions: totalCommissions,
        subscription_revenue: totalSubscriptions,
        total_withdrawals: totalWithdrawals,
        available_balance: totalCommissions + totalSubscriptions - totalWithdrawals
    });
});

app.post('/api/withdraw', (req, res) => {
    const { amount, admin_id } = req.body;
    const admin = db.users.find(u => u.id === admin_id && u.role === 'admin');
    if (!admin) return res.status(403).json({ error: 'Unauthorized' });

    const totalCommissions = db.orders.reduce((sum, o) => sum + (o.commission || 0), 0);
    const totalSubscriptions = db.subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalWithdrawals = db.withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    const available = totalCommissions + totalSubscriptions - totalWithdrawals;

    if (amount > available) return res.status(400).json({ error: 'Insufficient balance' });

    const withdrawal = { id: generateId('withdrawal'), admin_id, amount, status: 'completed', created_at: new Date().toISOString() };
    db.withdrawals.push(withdrawal);
    saveDatabase();
    res.json({ withdrawal, new_balance: available - amount });
});

// ─── Backup ───────────────────────────────────────────────────────────────────

app.get('/api/backup', (req, res) => {
    const filename = `millo-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    // Strip passwords from backup
    const safeDb = {
        ...db,
        users: db.users.map(({ password, ...u }) => u)
    };
    res.send(JSON.stringify(safeDb, null, 2));
});

// ─── Static files ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ─── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGINT', () => { saveDatabase(); process.exit(0); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(0); });

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Millo server running on http://0.0.0.0:${PORT}`);
    console.log(`🛍️  Storefront: http://localhost:${PORT}`);
    console.log(`💾 Auto-save enabled (every 30 seconds)`);
});
