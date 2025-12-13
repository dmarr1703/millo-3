# Product Posting Payment System

## Overview

The millo marketplace now requires sellers to pay a **$25 CAD monthly subscription fee** for each product they post. This is a **recurring monthly charge** that automatically renews until cancelled.

---

## 🎯 Key Features

### ✅ Monthly Recurring Payments
- **$25 CAD per month** for each product posted
- **Automatic renewal** on the same day each month
- **Stripe subscription** - secure and reliable payment processing
- **Instant activation** - products go live immediately after payment

### ✅ Multiple Products Per Seller
- Each product requires its own $25/month subscription
- Sellers can have unlimited products (each charged separately)
- Example: 3 products = $75/month total

### ✅ Color Variants Included
- All color variants of a product count as ONE subscription
- Example: T-shirt in Red, Blue, Green = $25/month (not $75/month)
- No additional charge for multiple colors

### ✅ Secure Payment Processing
- **Stripe Payment Intents API** for secure payments
- **PCI compliant** - card details never touch your server
- **3D Secure (SCA)** support for European cards
- **Strong Customer Authentication** built-in

### ✅ Automatic Subscription Management
- **Webhook integration** - real-time status updates
- **Failed payment handling** - automatic product deactivation
- **Cancellation support** - sellers can cancel anytime
- **Status tracking** - active, past_due, cancelled, expired

---

## 💳 Payment Flow

### 1. Seller Adds Product
1. Seller fills out product form (name, price, description, images, colors, etc.)
2. Seller clicks "Add Product & Subscribe ($25/month)"
3. System shows confirmation dialog about $25/month fee

### 2. Payment Processing
1. Product image/PDF is uploaded to server
2. Product is created with `status: 'pending'` and `payment_confirmed: false`
3. Stripe subscription is created with monthly recurring billing
4. Seller is redirected to Stripe payment page
5. Seller enters card details securely on Stripe

### 3. Payment Confirmation
1. Stripe processes the payment
2. On success, redirects back to dashboard with success parameters
3. System confirms subscription status with Stripe API
4. Product status updated to `active` and `payment_confirmed: true`
5. Product appears live on marketplace immediately

### 4. Recurring Billing
1. Stripe automatically charges card on same day each month
2. Webhook notifies server of successful payment
3. Subscription remains active, product stays live
4. If payment fails:
   - Subscription status → `past_due`
   - Product status → `inactive`
   - Product removed from marketplace until payment succeeds

---

## 🔌 API Endpoints

### Create Subscription
```http
POST /api/create-subscription
Content-Type: application/json

{
  "seller_id": "user-123",
  "seller_email": "seller@example.com",
  "product_id": "prod-456",
  "product_name": "Cool T-Shirt",
  "amount": 25
}
```

**Response:**
```json
{
  "subscriptionId": "subscription-abc-123",
  "stripeSubscriptionId": "sub_1MxYzABC123",
  "clientSecret": "pi_xxx_secret_xxx",
  "status": "incomplete"
}
```

### Confirm Subscription
```http
POST /api/confirm-subscription
Content-Type: application/json

{
  "subscription_id": "subscription-abc-123",
  "product_id": "prod-456"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "subscription-abc-123",
    "status": "active",
    "product_id": "prod-456",
    "current_period_end": "2024-02-15T00:00:00.000Z"
  }
}
```

### Get Stripe Config
```http
GET /api/stripe/config
```

**Response:**
```json
{
  "publishableKey": "pk_live_xxx"
}
```

### Webhook Endpoint
```http
POST /api/stripe/webhook
stripe-signature: xxx
```

Handles these events:
- `invoice.payment_succeeded` - Subscription payment successful
- `invoice.payment_failed` - Subscription payment failed
- `customer.subscription.deleted` - Subscription cancelled
- `customer.subscription.updated` - Subscription modified

---

## 🗄️ Database Schema

### Subscriptions Table
```javascript
{
  id: 'subscription-xxx',
  stripe_subscription_id: 'sub_xxx',
  stripe_customer_id: 'cus_xxx',
  stripe_price_id: 'price_xxx',
  seller_id: 'user-123',
  product_id: 'prod-456',
  amount: 25,
  currency: 'cad',
  status: 'active', // active, past_due, cancelled, expired
  current_period_start: '2024-01-15T00:00:00.000Z',
  current_period_end: '2024-02-15T00:00:00.000Z',
  next_billing_date: '2024-02-15T00:00:00.000Z',
  start_date: '2024-01-15T00:00:00.000Z',
  last_payment_date: '2024-01-15T00:00:00.000Z',
  created_at: '2024-01-15T00:00:00.000Z'
}
```

### Products Table (Updated Fields)
```javascript
{
  id: 'prod-456',
  seller_id: 'user-123',
  name: 'Cool T-Shirt',
  // ... other fields ...
  status: 'active', // active, inactive, pending
  subscription_status: 'active', // active, past_due, cancelled, expired
  payment_confirmed: true,
  created_at: '2024-01-15T00:00:00.000Z'
}
```

---

## 🎨 User Interface Updates

### Dashboard Changes

#### Add Product Modal
- Shows clear "$25/month subscription fee" message
- Upload file button for product images/PDFs
- Confirmation dialog before payment
- Information box explaining the fee includes all color variants

#### Subscriptions Tab
- Lists all active subscriptions
- Shows next billing date
- Cancel subscription button
- Status indicators (active, past_due, cancelled)

#### Payment Success Handling
- URL parameters: `?payment=success&subscription=xxx&product=xxx`
- Automatic confirmation and product activation
- Success notification shown to seller
- Dashboard reloads to show new product

---

## 🔐 Security Considerations

### ✅ Implemented Security Features

1. **Stripe Signature Verification**
   - All webhook requests verified using `stripe-signature` header
   - Prevents fake webhook attacks

2. **Client Secret Protection**
   - Client secrets only valid for one payment
   - Automatically expires after use

3. **Server-Side Validation**
   - Subscription status verified with Stripe API
   - Product only activated after payment confirmed

4. **PCI Compliance**
   - Card details never touch your server
   - All sensitive data handled by Stripe

5. **HTTPS Required**
   - Webhook endpoint requires HTTPS in production
   - Payment page uses secure connection

### 🔒 Best Practices

1. **Never Commit Secrets**
   - `.env` file in `.gitignore`
   - Secret keys only on server
   - Use environment variables

2. **Validate on Backend**
   - Don't trust client-side data
   - Verify amounts and product details
   - Check subscription status with Stripe

3. **Monitor Failed Payments**
   - Log all webhook events
   - Alert on failed payments
   - Deactivate products automatically

---

## 🧪 Testing

### Test Mode Setup

1. Use Stripe test keys:
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

2. Test with test cards:

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

**Requires 3D Secure:**
```
Card: 4000 0025 0000 3155
```

### Testing Webhooks Locally

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

---

## 📊 Business Metrics

### Revenue Tracking

**Subscription Revenue Formula:**
```
Monthly Subscription Revenue = Active Subscriptions × $25
```

**Per-Product Revenue:**
- Platform earns: $25/month per product
- Seller pays: $25/month per product
- Commission: 15% of each sale (separate from subscription)

**Example:**
- 100 active products
- Subscription revenue: $2,500/month
- Sales commission (separate): 15% of all sales

### Key Performance Indicators (KPIs)

1. **Active Subscriptions** - Total products with active subscriptions
2. **Monthly Recurring Revenue (MRR)** - Active subscriptions × $25
3. **Churn Rate** - Cancelled subscriptions / total subscriptions
4. **Payment Success Rate** - Successful payments / total attempts
5. **Average Products per Seller** - Total products / total sellers

---

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Update `.env` with live Stripe keys
- [ ] Configure webhook endpoint in Stripe Dashboard
- [ ] Add webhook signing secret to `.env`
- [ ] Enable HTTPS on server
- [ ] Test payment flow end-to-end
- [ ] Verify webhook events work correctly
- [ ] Set up monitoring for failed payments
- [ ] Configure email notifications
- [ ] Test subscription cancellation
- [ ] Document customer support procedures

### Webhook Setup (Production)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copy signing secret
6. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## 🐛 Troubleshooting

### Payment Not Going Through

**Problem:** Subscription creation fails
**Solution:**
1. Check Stripe secret key is correct
2. Verify test mode vs live mode keys match
3. Check browser console for errors
4. Ensure amount is positive number

### Product Not Activating After Payment

**Problem:** Product stays in "pending" status
**Solution:**
1. Check return URL parameters are correct
2. Verify `/api/confirm-subscription` endpoint works
3. Check Stripe subscription status in dashboard
4. Look for errors in server logs

### Webhook Not Receiving Events

**Problem:** Subscriptions not updating automatically
**Solution:**
1. Verify webhook URL is correct and accessible
2. Check HTTPS is enabled (required by Stripe)
3. Confirm webhook secret matches Stripe Dashboard
4. Check webhook signature verification logic
5. Look for errors in webhook logs

### Failed Recurring Payments

**Problem:** Subscription payment fails after first month
**Solution:**
1. Check if card has expired
2. Verify customer has sufficient funds
3. Check if 3D Secure is required
4. Review Stripe Dashboard for decline reason
5. Contact customer to update payment method

---

## 📞 Support

### For Sellers

**Payment Issues:**
- Email: support@millo.com
- Check Stripe Dashboard for payment status
- Update payment method in subscription settings

**Cancellation:**
- Cancel from dashboard "Subscriptions" tab
- Subscription ends at end of billing period
- Product automatically deactivated

### For Administrators

**Monitoring:**
- Stripe Dashboard: https://dashboard.stripe.com
- Server logs for webhook events
- Database subscriptions table for status

**Common Admin Tasks:**
1. Refund subscription payment
2. Cancel subscription manually
3. Reactivate failed subscription
4. Update subscription amount

---

## 📝 Summary

### What Changed

✅ **Added Real Stripe Integration**
- Monthly recurring subscriptions
- Stripe Payment Intents API
- Webhook event handling

✅ **Payment Required for Product Posting**
- $25/month per product
- Immediate payment before product goes live
- Automatic renewal every month

✅ **Enhanced Product Management**
- Payment confirmation required
- Status tracking (pending, active, inactive)
- Subscription status monitoring

✅ **Improved Seller Dashboard**
- Stripe Checkout integration
- Payment success handling
- Subscription management UI

### Revenue Model

**Platform Earnings:**
1. **Subscription Fees:** $25/month per product posted
2. **Sales Commission:** 15% of each product sale (existing)
3. **Total Revenue:** Subscriptions + Commissions

**Example with 100 Products:**
- Subscription revenue: $2,500/month
- If $50,000 in sales: $7,500 commission (15%)
- Total monthly revenue: $10,000

---

**Made with ❤️ for millo marketplace**

*Secure, reliable, and scalable payment processing powered by Stripe*
