# 🚀 Backend Setup Guide - Millo Marketplace

## Quick Start

Follow these steps to get the Millo payment backend running:

---

## 1️⃣ Prerequisites

Make sure you have:
- ✅ Node.js (v14 or higher) installed
- ✅ npm (comes with Node.js)
- ✅ Stripe account (sign up at https://stripe.com)
- ✅ Text editor (VS Code recommended)

Check your Node.js version:
```bash
node --version
npm --version
```

---

## 2️⃣ Install Dependencies

Navigate to the project directory and install required packages:

```bash
cd /path/to/millo
npm install
```

This installs:
- `express` - Web server
- `cors` - Cross-origin requests
- `stripe` - Payment processing
- `dotenv` - Environment variables

---

## 3️⃣ Get Stripe API Keys

### For Testing (Test Mode):

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Click "Reveal test key token" for **Secret key** (starts with `sk_test_`)

### For Production (Live Mode):

1. Complete Stripe account verification
2. Go to https://dashboard.stripe.com/apikeys
3. Copy your **Publishable key** (starts with `pk_live_`)
4. Click "Reveal live key token" for **Secret key** (starts with `sk_live_`)

⚠️ **IMPORTANT**: Never share your secret key or commit it to Git!

---

## 4️⃣ Create Environment File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` with your actual keys:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK

# Webhook Secret (leave empty for now, will set up later)
STRIPE_WEBHOOK_SECRET=

# Server Configuration
PORT=3000
NODE_ENV=development

# Product Listing Fee
LISTING_FEE_AMOUNT=2500
LISTING_FEE_CURRENCY=cad
```

**Important Notes:**
- Use **test keys** for development (`sk_test_` and `pk_test_`)
- Use **live keys** only in production (`sk_live_` and `pk_live_`)
- The publishable key is already set (from previous step)
- You need to add your **secret key**

---

## 5️⃣ Start the Server

### Development Mode:
```bash
npm start
```

You should see:
```
✨ Millo API Server running on http://0.0.0.0:3000
📊 Database loaded successfully
🛍️  Access the storefront at: http://localhost:3000
💾 Auto-save enabled (every 30 seconds)
```

### Keep Server Running:
The server must be running for payments to work. Keep the terminal window open.

---

## 6️⃣ Test the Payment System

### Option 1: Quick Test

1. Open browser to http://localhost:3000
2. Browse products and add to cart
3. Go to checkout
4. Use test card: `4242 4242 4242 4242`
5. Complete purchase

### Option 2: Test API Directly

Use curl or Postman to test endpoints:

```bash
# Test payment intent creation
curl -X POST http://localhost:3000/api/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "cad",
    "metadata": {
      "customer_name": "Test Customer",
      "customer_email": "test@example.com"
    }
  }'
```

Expected response:
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

---

## 7️⃣ Set Up Webhooks (Optional for Development)

Webhooks allow Stripe to notify your server about events like successful payments.

### For Local Development:

Install Stripe CLI:

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
Download from https://github.com/stripe/stripe-cli/releases

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

Login to Stripe:
```bash
stripe login
```

Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret (starts with `whsec_`) and add to `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### For Production:

See "Production Webhook Setup" section below.

---

## 8️⃣ Verify Everything Works

### Checklist:

- [ ] Server starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can view products on homepage
- [ ] Can add items to cart
- [ ] Checkout page loads
- [ ] Card element displays
- [ ] Test payment succeeds (4242 4242 4242 4242)
- [ ] Order appears in database
- [ ] Stock is updated

### Test with Different Cards:

**Success:**
```
Card: 4242 4242 4242 4242
```

**Declined:**
```
Card: 4000 0000 0000 0002
```

**Requires Authentication:**
```
Card: 4000 0025 0000 3155
```

All test cards:
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any postal code

---

## 🌐 Production Deployment

### Step 1: Set Up Production Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/api/stripe/webhook`
4. Select these events:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.updated`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### Step 2: Update Environment Variables

Update `.env` for production:

```env
# Use LIVE keys
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK

# Add webhook secret from Step 1
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Production settings
PORT=3000
NODE_ENV=production
```

### Step 3: Deploy Server

Deploy to your hosting platform:

**Heroku:**
```bash
git push heroku main
heroku config:set STRIPE_SECRET_KEY=sk_live_xxx
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**AWS/DigitalOcean/VPS:**
1. Copy files to server
2. Create `.env` file with production keys
3. Install dependencies: `npm install`
4. Start with PM2: `pm2 start server.js`

**Cloudflare Workers:**
- Add environment variables in Cloudflare Dashboard
- Deploy using Wrangler

### Step 4: Test Production

1. Make a **small test purchase** (e.g., $1.00)
2. Use a real card (will be charged)
3. Verify order is created
4. Check Stripe Dashboard for payment
5. Verify webhook was received (check server logs)

---

## 🐛 Troubleshooting

### Server Won't Start

**Error:** `Cannot find module 'stripe'`
- **Solution:** Run `npm install`

**Error:** `Port 3000 is already in use`
- **Solution:** Stop other server using port 3000 or change PORT in `.env`

### Payments Failing

**Error:** "No such API key"
- **Solution:** Check `STRIPE_SECRET_KEY` in `.env`
- Verify key starts with `sk_test_` or `sk_live_`

**Error:** "Invalid amount"
- **Solution:** Ensure amount is a positive number
- Check that amount is in dollars (e.g., 100.00 not 10000)

### Webhooks Not Working

**Local Development:**
- Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Copy webhook secret to `.env`
- Restart server

**Production:**
- Verify webhook URL is correct in Stripe Dashboard
- Check server logs for incoming webhook requests
- Ensure server is using HTTPS
- Verify webhook secret matches

### Card Declined in Test Mode

- Use test card: `4242 4242 4242 4242`
- Check you're using test publishable key on frontend
- Verify amount is valid

---

## 📊 Monitoring

### Server Logs

Watch server logs in real-time:
```bash
# If running with npm start
# Logs appear in terminal

# If using PM2
pm2 logs server
```

### Stripe Dashboard

Monitor payments in real-time:
- **Payments:** https://dashboard.stripe.com/payments
- **Subscriptions:** https://dashboard.stripe.com/subscriptions
- **Webhooks:** https://dashboard.stripe.com/webhooks
- **Logs:** https://dashboard.stripe.com/logs

---

## 🔒 Security Checklist

Before going live:

- [ ] `.env` file is in `.gitignore`
- [ ] Never committed secret keys to Git
- [ ] Using HTTPS in production
- [ ] Webhook signature verification enabled
- [ ] Strong secret key (never shared)
- [ ] Server logs don't expose sensitive data
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled (optional but recommended)

---

## 📚 Additional Resources

### Documentation
- **Stripe API Docs:** https://stripe.com/docs/api
- **Payment Intents Guide:** https://stripe.com/docs/payments/payment-intents
- **Webhooks Guide:** https://stripe.com/docs/webhooks
- **Testing Guide:** https://stripe.com/docs/testing

### Support
- **Stripe Support:** https://support.stripe.com
- **Stripe Discord:** https://discord.gg/stripe
- **Millo Documentation:** See `PAYMENT_SYSTEM.md`

---

## ✅ You're All Set!

Your payment backend is now configured and ready to process payments securely.

**Next Steps:**
1. Test thoroughly in test mode
2. Review security checklist
3. Set up webhooks for production
4. Deploy to production
5. Make test purchase with real card
6. Monitor Stripe Dashboard

Need help? Check `PAYMENT_SYSTEM.md` for detailed payment system documentation.

---

**millo** - E-commerce made simple 🛍️
