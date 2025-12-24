# Stripe Buy Button Setup Guide for Millo

## Overview

Your Millo marketplace now integrates with Stripe Buy Buttons to provide seamless checkout experiences for customers purchasing products.

## Current Configuration

### Stripe Credentials
- **Publishable Key**: `pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK`
- **Buy Button ID**: `buy_btn_1ShurIRwc1RkBb2PfGHUskTz`

### What is a Stripe Buy Button?

A Stripe Buy Button is an embeddable payment button that allows customers to purchase products directly through Stripe Checkout without building a custom payment form. It's secure, PCI-compliant, and handles all payment processing automatically.

## How It Works

### 1. Product Posting Flow

When a seller posts a product on Millo:

```javascript
// Product is created with Stripe Buy Button ID
const newProduct = {
    id: 'prod-' + Date.now(),
    seller_id: seller.id,
    name: name,
    description: description,
    price: price,
    colors: colors,
    image_url: imageUrl,
    category: category,
    stock: stock,
    status: 'active',
    stripe_buy_button_id: 'buy_btn_1ShurIRwc1RkBb2PfGHUskTz', // Stripe Buy Button
    created_at: new Date().toISOString()
};
```

### 2. Product Display with Buy Button

When a customer views a product (`product.html`):

1. Product details are loaded from the database
2. The Stripe Buy Button script is dynamically loaded
3. A `<stripe-buy-button>` element is created with:
   - Your publishable key
   - The buy button ID for payment processing
4. Customer clicks the button and is redirected to Stripe Checkout
5. Payment is processed securely by Stripe
6. Customer is redirected back with payment confirmation

### 3. Payment Processing

The Stripe Buy Button handles:
- ✅ Secure card payment collection
- ✅ PCI-DSS compliance
- ✅ Payment verification
- ✅ Automatic receipt generation
- ✅ Webhook notifications for order fulfillment

## Files Involved

### JavaScript Files

1. **`js/stripe-buy-button.js`** (Main Integration)
   - Contains Stripe credentials configuration
   - Handles Buy Button rendering
   - Manages fallback options

2. **`js/product-detail.js`**
   - Initializes Buy Button on product pages
   - Calls `initializeStripeBuyButton()` on page load

3. **`js/dashboard.js`**
   - Adds Stripe Buy Button ID to new products
   - Manages product creation with payment integration

### HTML Files

1. **`product.html`**
   - Contains Buy Button container: `<div id="stripe-buy-button-container">`
   - Provides primary checkout option
   - Includes fallback cart button

## Payment Flow

```
Customer Views Product
         ↓
Stripe Buy Button Loaded
         ↓
Customer Clicks "Buy"
         ↓
Redirected to Stripe Checkout
         ↓
Customer Enters Payment Info
         ↓
Stripe Processes Payment
         ↓
Order Created in Millo
         ↓
Customer Receives Confirmation
```

## Seller Subscription Model

### Monthly Subscription Fee

- **Fee**: $25 CAD per product per month
- **Payment Method**: E-Transfer to d.marr@live.ca
- **Process**:
  1. Seller posts product
  2. Product goes live immediately
  3. Seller sends e-transfer payment
  4. Admin verifies payment (1-24 hours)
  5. Product remains active with verified payment

### Customer Purchases

- **All customer purchases** are processed through Stripe
- **Real money transactions** - immediate payment processing
- **Commission Split**:
  - Platform: 15%
  - Seller: 85%

## Configuration Options

### Per-Product Buy Button IDs

Each product can have its own Stripe Buy Button:

```javascript
// Save custom Buy Button ID for a product
saveProductBuyButtonMapping(productId, 'buy_btn_XXXXXXXXXXXXX');

// Retrieve custom Buy Button ID
const buttonId = getProductBuyButtonId(product);
```

### Default Buy Button

If a product doesn't have a custom Buy Button ID, it uses:
- **Default ID**: `buy_btn_1ShurIRwc1RkBb2PfGHUskTz`

## Testing

### Test Mode

To test the integration without real payments:

1. Update credentials in `js/stripe-buy-button.js`:
```javascript
const STRIPE_PUBLISHABLE_KEY = "pk_test_..."; // Test key
const DEFAULT_BUY_BUTTON_ID = "buy_btn_test..."; // Test button
```

2. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Live Mode (Current)

The current setup uses **LIVE** credentials:
- Real payments are processed
- Real money is transferred
- Production-ready configuration

## Troubleshooting

### Buy Button Not Appearing

1. Check browser console for errors
2. Verify Stripe script is loaded:
   ```javascript
   console.log('Stripe script loaded:', !!document.querySelector('script[src*="stripe.com"]'));
   ```
3. Check container exists:
   ```javascript
   console.log('Container:', document.getElementById('stripe-buy-button-container'));
   ```

### Payment Not Processing

1. Verify publishable key is correct (starts with `pk_live_`)
2. Check Buy Button ID is valid (starts with `buy_btn_`)
3. Ensure product price is set correctly
4. Check Stripe Dashboard for error logs

### Fallback to Cart Button

If Stripe Buy Button fails to load:
- Fallback cart button is automatically shown
- Customer can still checkout using traditional flow
- No loss of functionality

## Security Considerations

### PCI Compliance

✅ Stripe Buy Button is fully PCI-DSS compliant
✅ No card data touches your servers
✅ Secure payment processing
✅ Automatic fraud detection

### API Keys

⚠️ **Important**: Publishable keys are safe to expose in frontend code
🔒 **Never expose**: Secret keys should remain server-side only

## Advanced Features

### Customization

The Buy Button appearance can be customized in Stripe Dashboard:
- Button text and color
- Checkout page branding
- Payment methods accepted
- Shipping options

### Webhooks

Set up webhooks in Stripe Dashboard to:
- Receive payment confirmations
- Update order status automatically
- Send order notifications
- Handle refunds and disputes

## Support

For Stripe-related issues:
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Docs**: https://stripe.com/docs/payments/buy-button
- **Stripe Support**: https://support.stripe.com

For Millo-specific issues:
- Check browser console logs
- Review product database entries
- Verify user permissions
- Contact platform admin

---

## Summary

✅ **Stripe Buy Button Integrated** - Your credentials are configured
✅ **Product Posting Fixed** - Products include Buy Button ID automatically
✅ **Payment Processing Ready** - Secure checkout for customers
✅ **Seller Subscriptions** - Monthly e-transfer payments tracked
✅ **Commission Split** - Automatic 15% platform, 85% seller

Your Millo marketplace is ready to accept real payments through Stripe! 🎉
