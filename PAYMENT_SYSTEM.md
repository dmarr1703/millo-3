# 💳 Millo Payment System Documentation

## Overview

The Millo marketplace now includes a complete Stripe payment integration with backend support for secure payment processing, subscription management, and webhook handling.

---

## 🎯 Features

### ✅ Customer Checkout
- **Payment Intents API**: Secure payment processing using Stripe's latest API
- **Card Validation**: Real-time card validation and error handling
- **3D Secure**: Automatic support for SCA (Strong Customer Authentication)
- **Multiple Currencies**: Support for CAD and other currencies
- **Payment Confirmation**: Backend verification of successful payments

### ✅ Seller Subscriptions
- **Monthly Listing Fees**: $25/month per product listing
- **Automatic Billing**: Recurring payments handled by Stripe
- **Subscription Management**: Create, update, and cancel subscriptions
- **Customer Portal**: Sellers can manage their subscriptions

### ✅ Webhook Integration
- **Real-time Updates**: Automatic synchronization with Stripe events
- **Payment Tracking**: Monitor successful and failed payments
- **Subscription Events**: Handle subscription creation, updates, and cancellations
- **Signature Verification**: Secure webhook endpoint with signature validation

### ✅ Admin Features
- **Commission Tracking**: Automatic 15% commission calculation
- **Revenue Monitoring**: Track sales, subscriptions, and total platform revenue
- **Withdrawal System**: Owner can withdraw available balance
- **Transaction History**: Complete audit trail of all payments

---

## 🚀 Getting Started

### 1. Environment Setup

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit the `.env` file with your Stripe credentials:

```env
# Stripe API Keys (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_your_actual_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK

# Stripe Webhook Secret (from https://dashboard.stripe.com/webhooks)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Server Configuration
PORT=3000
NODE_ENV=production

# Product Listing Fee (in cents)
LISTING_FEE_AMOUNT=2500
LISTING_FEE_CURRENCY=cad
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `stripe` - Stripe Node.js SDK
- `dotenv` - Environment variable management

### 3. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

---

## 🔌 API Endpoints

### Payment Endpoints

#### Get Stripe Configuration
```http
GET /api/stripe/config
```

Returns the publishable key for frontend Stripe initialization.

**Response:**
```json
{
  "publishableKey": "pk_live_..."
}
```

---

#### Create Payment Intent
```http
POST /api/stripe/create-payment-intent
```

Creates a payment intent for checkout.

**Request Body:**
```json
{
  "amount": 129.99,
  "currency": "cad",
  "metadata": {
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "shipping_address": "123 Main St, Toronto, ON M5H 2N2",
    "order_count": 2
  }
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

---

#### Create Subscription
```http
POST /api/stripe/create-subscription
```

Creates a monthly subscription for product listing fee.

**Request Body:**
```json
{
  "seller_id": "user-123",
  "seller_email": "seller@example.com",
  "product_id": "prod-456",
  "product_name": "Premium Widget"
}
```

**Response:**
```json
{
  "subscription": {
    "id": "subscription-xxx",
    "stripe_subscription_id": "sub_xxx",
    "seller_id": "user-123",
    "product_id": "prod-456",
    "amount": 25,
    "currency": "cad",
    "status": "active",
    "current_period_start": "2024-01-01T00:00:00.000Z",
    "current_period_end": "2024-02-01T00:00:00.000Z"
  }
}
```

---

#### Cancel Subscription
```http
POST /api/stripe/cancel-subscription
```

Cancels an active subscription.

**Request Body:**
```json
{
  "subscription_id": "subscription-xxx"
}
```

**Response:**
```json
{
  "subscription": {
    "id": "subscription-xxx",
    "status": "canceled",
    "canceled_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

#### Webhook Endpoint
```http
POST /api/stripe/webhook
```

Receives and processes Stripe webhook events.

**Headers Required:**
- `stripe-signature`: Webhook signature for verification

**Supported Events:**
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `invoice.payment_succeeded` - Subscription payment succeeded
- `invoice.payment_failed` - Subscription payment failed
- `customer.subscription.deleted` - Subscription canceled
- `customer.subscription.updated` - Subscription modified

---

## 🔐 Security Best Practices

### ✅ DO:

1. **Keep Secret Key Private**
   - Never commit `.env` file to Git
   - Store `STRIPE_SECRET_KEY` on backend only
   - Use environment variables in production

2. **Verify Webhook Signatures**
   - Always validate `stripe-signature` header
   - Use `STRIPE_WEBHOOK_SECRET` for verification
   - Reject requests with invalid signatures

3. **Validate Payment Amounts**
   - Verify amounts on backend before creating Payment Intent
   - Don't trust client-side calculations
   - Check against actual product prices

4. **Use HTTPS in Production**
   - Stripe requires HTTPS for webhooks
   - Use SSL/TLS certificates
   - Redirect HTTP to HTTPS

5. **Log Transactions**
   - Keep audit trail of all payments
   - Log webhook events
   - Monitor for suspicious activity

### ❌ DON'T:

1. **Don't expose Secret Key**
   - Never include `sk_live_` or `sk_test_` in frontend code
   - Don't log secret keys
   - Don't share in version control

2. **Don't trust client input**
   - Always validate on backend
   - Recalculate totals server-side
   - Verify user permissions

3. **Don't skip webhook verification**
   - Attackers can send fake webhook requests
   - Always verify signature
   - Use Stripe's SDK for verification

---

## 🧪 Testing

### Test Mode

Use Stripe test keys for development:

```env
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
```

### Test Cards

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any postal code
```

**Payment Declined:**
```
Card: 4000 0000 0000 0002
```

**Requires Authentication (3D Secure):**
```
Card: 4000 0025 0000 3155
```

More test cards: https://stripe.com/docs/testing

### Testing Webhooks Locally

Use Stripe CLI to forward webhooks to localhost:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger invoice.payment_succeeded
```

---

## 🌐 Production Deployment

### 1. Set Up Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copy the webhook signing secret
6. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### 2. Update Environment Variables

Replace test keys with live keys:

```env
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NODE_ENV=production
```

### 3. Enable HTTPS

Stripe webhooks require HTTPS. Options:

- **Cloudflare Pages**: Automatic HTTPS
- **Heroku**: Automatic HTTPS
- **Custom Server**: Use Let's Encrypt or similar

### 4. Test in Production

1. Make a small real purchase to test payment flow
2. Verify webhook events are received
3. Check Stripe Dashboard for transaction
4. Confirm order appears in database

---

## 📊 Payment Flow Diagrams

### Customer Checkout Flow

```
Customer → Add to Cart → Proceed to Checkout
                ↓
        Fill Shipping Info → Enter Card Details
                ↓
    Frontend → Create Payment Intent (Backend)
                ↓
        Backend → Stripe API (Create PaymentIntent)
                ↓
        Stripe → Return client_secret
                ↓
    Frontend → Confirm Payment (Stripe.js)
                ↓
        Stripe → Process Payment → 3D Secure (if needed)
                ↓
    Payment Success → Save Order → Update Stock → Redirect
                ↓
        Stripe → Webhook (payment_intent.succeeded)
                ↓
        Backend → Log Event → Update Database
```

### Subscription Flow

```
Seller → Add Product → Subscribe to Listing Fee
                ↓
    Frontend → Create Subscription (Backend)
                ↓
    Backend → Find/Create Stripe Customer
                ↓
    Backend → Create Price (if needed)
                ↓
    Backend → Create Subscription
                ↓
        Stripe → Charge First Payment
                ↓
    Backend → Save Subscription → Return Success
                ↓
    Monthly: Stripe → Charge Renewal
                ↓
        Stripe → Webhook (invoice.payment_succeeded)
                ↓
    Backend → Update Subscription Status
```

---

## 🐛 Troubleshooting

### Payment Intent Creation Fails

**Error:** "Invalid amount"
- **Solution:** Ensure amount is a positive number
- Check that amount is in dollars (will be converted to cents)

**Error:** "No such API key"
- **Solution:** Verify `STRIPE_SECRET_KEY` in `.env` file
- Ensure key matches the mode (test/live)

### Webhook Not Receiving Events

**Issue:** Webhooks not working in production
- **Solution 1:** Verify webhook URL is correct and accessible
- **Solution 2:** Check that server is using HTTPS
- **Solution 3:** Verify webhook secret matches Stripe Dashboard
- **Solution 4:** Check server logs for errors

### Card Declined

**Issue:** Test card being declined
- **Solution:** Use correct test card: 4242 4242 4242 4242
- Ensure using test publishable key on frontend
- Check Stripe Dashboard for declined reason

---

## 📈 Monitoring & Analytics

### Stripe Dashboard

Monitor your payments in real-time:
- https://dashboard.stripe.com/payments
- https://dashboard.stripe.com/subscriptions
- https://dashboard.stripe.com/webhooks

### Key Metrics to Track

1. **Payment Success Rate**
   - Monitor declined payments
   - Track authentication failures
   - Identify problematic cards

2. **Subscription Metrics**
   - Active subscriptions
   - Churn rate
   - Monthly recurring revenue (MRR)

3. **Revenue**
   - Total sales
   - Platform commission (15%)
   - Subscription revenue ($25/product)

---

## 🆘 Support

### Stripe Resources

- **Documentation**: https://stripe.com/docs
- **API Reference**: https://stripe.com/docs/api
- **Support**: https://support.stripe.com

### millo Support

- **Technical Issues**: Check server logs
- **Payment Issues**: Verify Stripe Dashboard
- **Webhook Issues**: Use Stripe CLI for local testing

---

## 📝 Change Log

### Version 1.0.0 (Current)

- ✅ Payment Intents API integration
- ✅ Subscription management
- ✅ Webhook handling
- ✅ Customer checkout flow
- ✅ Commission tracking
- ✅ Test mode support

### Planned Features

- 🔄 Refund processing
- 🔄 Partial refunds
- 🔄 Dispute handling
- 🔄 Multi-currency support
- 🔄 Payment method management
- 🔄 Customer portal integration

---

## ✅ Checklist for Going Live

- [ ] Stripe account fully verified
- [ ] Live API keys obtained
- [ ] Environment variables updated with live keys
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook secret added to `.env`
- [ ] HTTPS enabled on server
- [ ] Test payment completed successfully
- [ ] Webhook events confirmed working
- [ ] Error logging configured
- [ ] Backup system in place
- [ ] Customer support prepared for payment issues

---

**millo** - Powered by Stripe 💳

*Secure, reliable, and scalable payment processing*
