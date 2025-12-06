# 🚀 Quick Setup Guide - Millo Payment System

## ⚡ 5-Minute Setup

Get the payment system running in 5 minutes!

---

## Step 1: Get Your Stripe Secret Key (2 min)

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Find the **"Secret key"** section
3. Click **"Reveal test key token"**
4. Copy the key (starts with `sk_test_`)

---

## Step 2: Create .env File (1 min)

Create a file named `.env` in the project root:

```bash
# Copy this and fill in your secret key
STRIPE_SECRET_KEY=sk_test_paste_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK
STRIPE_WEBHOOK_SECRET=
PORT=3000
NODE_ENV=development
LISTING_FEE_AMOUNT=2500
LISTING_FEE_CURRENCY=cad
```

**Replace `sk_test_paste_your_secret_key_here` with your actual secret key!**

---

## Step 3: Install & Start (2 min)

Run these commands:

```bash
# Install dependencies
npm install

# Start the server
npm start
```

You should see:
```
✨ Millo API Server running on http://0.0.0.0:3000
```

---

## Step 4: Test It! (30 seconds)

1. Open browser: http://localhost:3000
2. Add item to cart → Checkout
3. Use test card: **4242 4242 4242 4242**
4. Any future date, any CVC, any ZIP
5. Click "Place Order"

✅ **Success!** You should see the order confirmation.

---

## 🎯 That's It!

Your payment system is now running!

### What You Can Do Now:

✅ Accept payments (test mode)
✅ Process orders
✅ Track commissions
✅ Manage subscriptions

### Next Steps:

- Read `PAYMENT_SYSTEM.md` for full documentation
- Read `SETUP_BACKEND.md` for production deployment
- Set up webhooks for production (see `SETUP_BACKEND.md`)

---

## 🆘 Troubleshooting

### "Cannot find module 'stripe'"
Run: `npm install`

### "Port 3000 is already in use"
Change PORT in `.env` to 3001 or stop other server

### "Invalid API key"
Check your `.env` file has the correct `STRIPE_SECRET_KEY`

### Payment fails
Make sure you're using test card: **4242 4242 4242 4242**

---

## 📚 More Help

- **Full Documentation**: See `PAYMENT_SYSTEM.md`
- **Backend Setup**: See `SETUP_BACKEND.md`
- **Stripe Docs**: https://stripe.com/docs
- **Test Cards**: https://stripe.com/docs/testing

---

**millo** - Payments made easy! 💳✨
