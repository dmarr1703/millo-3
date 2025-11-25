# Stripe Payment Integration Setup Guide

## Overview
This guide explains how to set up Stripe payments for the millo marketplace platform.

## Prerequisites
1. A Stripe account (sign up at https://stripe.com)
2. Access to your Stripe Dashboard (https://dashboard.stripe.com)

## Step 1: Get Your Stripe API Keys

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Click on "Developers" in the left sidebar
3. Click on "API keys"
4. You'll see two types of keys:
   - **Publishable key** (starts with `pk_test_` for test mode, `pk_live_` for live mode)
   - **Secret key** (starts with `sk_test_` for test mode, `sk_live_` for live mode)

## Step 2: Configure the Frontend (Customer Checkout)

1. Open `js/checkout.js`
2. Find this line:
   ```javascript
   stripe = Stripe('pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY');
   ```
3. Replace `pk_test_REPLACE_WITH_YOUR_STRIPE_PUBLISHABLE_KEY` with your actual Stripe **Publishable Key**
4. Example:
   ```javascript
   stripe = Stripe('pk_test_51234567890abcdefghijklmnop');
   ```

## Step 3: Test Your Integration

### Test Mode (Recommended for Development)
Use these test card numbers in Stripe test mode:

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Requires Authentication:** 4000 0025 0000 3155

**Test Card Details:**
- Any future expiry date (e.g., 12/34)
- Any 3-digit CVC
- Any postal code

### Test the Checkout Flow
1. Browse products on the marketplace
2. Add items to cart
3. Go to checkout
4. Fill in shipping information
5. Enter test card: 4242 4242 4242 4242
6. Complete the purchase
7. Verify order appears in seller dashboard and admin panel

## Step 4: Product Listing Fee Integration

Currently, the product listing fee ($25/month) shows a simulation dialog. To integrate real payments:

1. Create a Stripe Product for "Monthly Product Listing"
2. Set the price to $25 CAD
3. Update `js/dashboard.js` in the `handleAddProduct` function
4. Replace the simulation with actual Stripe Subscription creation:

```javascript
// Instead of simulation, create a Stripe subscription
const {error} = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement,
});

if (error) {
    showNotification('Payment failed: ' + error.message, 'error');
    return;
}

// Send payment method to your backend to create subscription
// This requires a backend endpoint
```

## Step 5: Backend Integration (Required for Production)

⚠️ **IMPORTANT:** For production, you MUST set up a backend server to:

1. Process payments securely using your Stripe Secret Key
2. Create and manage subscriptions
3. Handle webhooks for subscription events
4. Never expose your Secret Key in frontend code

### Recommended Backend Setup:

```javascript
// Backend endpoint example (Node.js/Express)
const stripe = require('stripe')('sk_test_YOUR_SECRET_KEY');

app.post('/create-payment-intent', async (req, res) => {
    const paymentIntent = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: 'cad',
    });
    res.json({clientSecret: paymentIntent.client_secret});
});

app.post('/create-subscription', async (req, res) => {
    const subscription = await stripe.subscriptions.create({
        customer: req.body.customerId,
        items: [{price: 'price_YOUR_PRICE_ID'}],
    });
    res.json(subscription);
});
```

## Step 6: Enable Live Mode

⚠️ Only do this when you're ready for real payments!

1. Complete Stripe account verification
2. Get your **Live** API keys from Stripe Dashboard
3. Replace test keys with live keys:
   - `pk_test_...` → `pk_live_...`
   - `sk_test_...` → `sk_live_...`
4. Test thoroughly in live mode with small amounts first

## Step 7: Set Up Webhooks (Production)

Webhooks notify your system when subscription events occur:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint (e.g., `https://yourdomain.com/webhook`)
3. Select events to listen for:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Add webhook handling in your backend

## Security Best Practices

✅ **DO:**
- Use HTTPS in production
- Keep Secret Key on backend only
- Validate all payments on the server
- Use webhooks to track subscription status
- Log all transactions

❌ **DON'T:**
- Expose Secret Key in frontend code
- Trust client-side payment confirmations
- Skip webhook signature verification
- Store card details yourself

## Testing Checklist

- [ ] Customer can checkout with test card
- [ ] Orders are created correctly
- [ ] Stock is updated after purchase
- [ ] Commission is calculated (15%)
- [ ] Seller receives 85% of sale
- [ ] Product listing fee flow works
- [ ] Subscription is created at $25/month
- [ ] Errors are handled gracefully

## Common Issues

**Issue:** "Stripe is not defined"
- **Solution:** Make sure Stripe.js is loaded before your script

**Issue:** "No such publishable key"
- **Solution:** Check that your API key is correct and matches the mode (test/live)

**Issue:** Payments succeed but orders don't save
- **Solution:** Check browser console for errors, verify database connection

## Support Resources

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe Support: https://support.stripe.com
- millo Support: Contact the platform admin

## Next Steps

1. Set up Stripe account
2. Get API keys
3. Update js/checkout.js with your publishable key
4. Test with test cards
5. Build backend for production
6. Enable webhooks
7. Go live!

---

**millo** - Secure payments powered by Stripe 💳
