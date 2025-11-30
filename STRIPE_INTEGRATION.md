# Stripe Payment Integration Guide

This document explains how to set up and use the Stripe payment integration in Millo 3.

## Overview

Millo 3 uses Stripe for secure payment processing with **LIVE API keys** for real transactions.

## Configuration

### Client-Side (Already Configured)
The Stripe publishable key is already set in `js/checkout.js`:
```javascript
stripe = Stripe('pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK');
```

### Server-Side (Environment Variable Required)
The Stripe secret key must be set as an environment variable for security.

#### Quick Setup

**Option 1: Environment Variable (Recommended for Production)**
```bash
# Linux/Mac
export STRIPE_SECRET_KEY="your_secret_key_here"
npm start

# Windows Command Prompt
set STRIPE_SECRET_KEY=your_secret_key_here
npm start

# Windows PowerShell
$env:STRIPE_SECRET_KEY="your_secret_key_here"
npm start
```

**Option 2: .env File (Recommended for Development)**
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Install dotenv package:
   ```bash
   npm install dotenv
   ```

3. Add to the top of `server.js`:
   ```javascript
   require('dotenv').config();
   ```

4. Edit `.env` file with your secret key:
   ```
   STRIPE_SECRET_KEY=your_actual_secret_key_here
   ```

5. Start the server:
   ```bash
   npm start
   ```

**Note:** The actual secret key has been provided separately in `STRIPE_KEYS.md` (not committed to GitHub for security).

## API Endpoints

### Create Payment Intent (Checkout)
```javascript
POST /api/create-payment-intent
Body: {
  "amount": 100.00,  // Amount in dollars
  "currency": "cad",  // Optional, defaults to CAD
  "metadata": {}      // Optional metadata
}

Response: {
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

### Create Subscription Payment (Seller Fee)
```javascript
POST /api/create-subscription
Body: {
  "seller_id": "seller-123",
  "product_id": "product-456",
  "amount": 25  // Monthly subscription fee
}

Response: {
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

## Payment Flow

### Customer Checkout
1. Customer adds products to cart
2. Proceeds to checkout page
3. Enters shipping and payment information
4. Stripe card element collects payment details
5. Frontend creates payment method with Stripe.js
6. Backend processes payment via payment intent
7. Order is created and confirmed

### Seller Subscription
1. Seller adds a new product
2. System creates $25 CAD subscription payment
3. Payment is processed via Stripe
4. Subscription record is created
5. Product becomes active

## Security Features

✅ **Live Mode**: Real payment processing with live keys  
✅ **PCI Compliance**: Stripe Elements handle card data securely  
✅ **Secret Key Protection**: Server-side key stored as environment variable  
✅ **HTTPS Ready**: Use HTTPS in production for secure transmission  
✅ **GitHub Protection**: Secret keys not committed to repository  

## Testing

### Test Cards (Use in Stripe Test Mode)
If you switch to test mode, use these cards:

| Card Number | Result |
|-------------|---------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Card declined |
| 4000 0025 0000 3155 | Requires authentication |

**Note:** Your current keys are for LIVE mode and will process real payments.

## Troubleshooting

### "Stripe is not defined" Error
- Ensure Stripe.js script is loaded in HTML: `<script src="https://js.stripe.com/v3/"></script>`
- Check browser console for loading errors

### "Invalid API Key" Error
- Verify secret key is correctly set as environment variable
- Check for typos or extra spaces in the key
- Ensure you're using the secret key (starts with `sk_`) on server-side

### Payment Intent Creation Fails
- Check server logs for detailed error messages
- Verify Stripe account is in good standing
- Ensure API key has proper permissions

### GitHub Push Blocked
- GitHub will block commits containing secret keys
- Always use environment variables for secrets
- Never commit `.env` files (already in `.gitignore`)

## Production Checklist

Before deploying to production:

- [ ] Set `STRIPE_SECRET_KEY` environment variable on hosting platform
- [ ] Verify HTTPS is enabled (required for payment processing)
- [ ] Test payment flow with real card (small amount)
- [ ] Set up Stripe webhooks for payment confirmations
- [ ] Enable Stripe dashboard notifications
- [ ] Review and accept Stripe's terms of service
- [ ] Verify business information in Stripe account
- [ ] Set up payout schedule in Stripe dashboard

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Security Guide](https://stripe.com/docs/security)

## Support

For Stripe-related issues:
- Check [Stripe Status](https://status.stripe.com)
- Contact [Stripe Support](https://support.stripe.com)
- Review Stripe logs in your dashboard

For Millo 3 integration issues:
- Check application logs in `server.js`
- Review browser console for client-side errors
- Verify API endpoint connectivity
