# Stripe Buy Button Integration Guide for millo

## 🎯 Overview

This guide explains how to integrate Stripe Buy Buttons across the millo marketplace platform. The Buy Button provides a seamless, one-click purchase experience for customers, bypassing the traditional cart/checkout flow.

## ✨ Features

- **One-Click Purchase**: Customers can buy products directly without going through cart
- **Stripe-Hosted Checkout**: Secure, PCI-compliant checkout hosted by Stripe
- **Automatic Payment Processing**: Real-time payment processing with instant confirmation
- **Fallback Support**: Traditional cart checkout remains available
- **Per-Product Configuration**: Each product can have its own Buy Button
- **Easy Integration**: Simple JavaScript API for rendering buttons

## 📦 What's Included

### Files Created

1. **`js/stripe-buy-button.js`** - Core Buy Button integration library
2. **`STRIPE_BUY_BUTTON_GUIDE.md`** - This documentation file

### Files Modified

1. **`product.html`** - Added Buy Button container and fallback buttons
2. **`js/product-detail.js`** - Added Buy Button initialization
3. **`index.html`** - Added Buy Button script reference

## 🚀 Quick Start

### Step 1: Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** > **+ Add Product**
3. Fill in product details:
   - Name
   - Description
   - Price
   - Images
4. Click **Save Product**

### Step 2: Create Buy Button for Product

1. In the product page, scroll to **Buy Button** section
2. Click **Create Buy Button**
3. Configure button settings:
   - **Button text**: "Buy now", "Purchase", etc.
   - **Quantity**: Allow/disallow quantity selection
   - **Payment methods**: Card, Apple Pay, Google Pay
4. Copy the **Buy Button ID** (e.g., `buy_btn_1ShurIRwc1RkBb2PfGHUskTz`)

### Step 3: Configure Buy Button in millo

#### Option A: Set Default Buy Button (All Products)

Edit `js/stripe-buy-button.js`:

```javascript
// Update these constants at the top of the file
const STRIPE_PUBLISHABLE_KEY = "pk_live_YOUR_KEY_HERE";
const DEFAULT_BUY_BUTTON_ID = "buy_btn_YOUR_BUTTON_ID_HERE";
```

#### Option B: Set Per-Product Buy Button

When creating/editing a product in the seller dashboard, add a field for `stripe_buy_button_id`:

```javascript
const product = {
    name: "Product Name",
    price: 29.99,
    stripe_buy_button_id: "buy_btn_PRODUCT_SPECIFIC_ID",
    // ... other fields
};
```

#### Option C: Use JavaScript API

```javascript
// Save mapping for specific product
saveProductBuyButtonMapping(productId, 'buy_btn_YOUR_ID');

// Render button manually
await renderStripeBuyButton('container-id', 'buy_btn_YOUR_ID');
```

## 💻 Usage Examples

### Basic Integration (Product Page)

The Buy Button is automatically rendered on product detail pages:

```html
<!-- Container for Buy Button -->
<div id="stripe-buy-button-container"></div>

<!-- Script automatically initializes the button -->
<script src="js/stripe-buy-button.js"></script>
<script src="js/product-detail.js"></script>
```

### Custom Implementation

Render a Buy Button anywhere in your application:

```javascript
// Initialize the script (only needed once)
await initializeStripeBuyButtonScript();

// Render button in a specific container
await renderStripeBuyButton(
    'my-container-id',           // Container ID
    'buy_btn_YOUR_BUTTON_ID',    // Buy Button ID
    'pk_live_YOUR_KEY'           // Publishable Key (optional)
);
```

### Multiple Products Grid

For product listings with multiple Buy Buttons:

```html
<!-- Product card with Buy Button -->
<div class="product-card">
    <h3>Product Name</h3>
    <p>$29.99</p>
    <div id="buy-button-product-1" 
         data-stripe-buy-button 
         data-product-id="product-1"
         data-buy-button-id="buy_btn_SPECIFIC_ID">
    </div>
</div>

<script>
// Initialize all Buy Buttons on the page
await initializeAllBuyButtons();
</script>
```

### Dynamic HTML Generation

Create Buy Button HTML dynamically:

```javascript
const buttonHTML = createBuyButtonHTML(
    'buy_btn_YOUR_ID',
    'pk_live_YOUR_KEY'
);

document.getElementById('container').innerHTML = buttonHTML;
```

## 🔧 Configuration Options

### Global Configuration

Edit `js/stripe-buy-button.js`:

```javascript
// Stripe publishable key (required)
const STRIPE_PUBLISHABLE_KEY = "pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK";

// Default Buy Button ID (fallback for products without specific IDs)
const DEFAULT_BUY_BUTTON_ID = "buy_btn_1ShurIRwc1RkBb2PfGHUskTz";
```

### Per-Product Configuration

Store Buy Button IDs in product records:

```javascript
// In product database
{
    id: "product-123",
    name: "Product Name",
    price: 29.99,
    stripe_buy_button_id: "buy_btn_SPECIFIC_ID", // Add this field
    // ... other fields
}
```

### localStorage Mapping

Store Buy Button mappings separately:

```javascript
// Save mapping
saveProductBuyButtonMapping('product-123', 'buy_btn_SPECIFIC_ID');

// Retrieve mapping
const buyButtonId = getProductBuyButtonId(product);
```

## 🎨 Customization

### Button Styles

Stripe Buy Buttons inherit styles from your page but can be customized in Stripe Dashboard:

1. Go to **Settings** > **Branding**
2. Set brand colors, fonts, and styling
3. These apply to all Buy Buttons and checkout pages

### Container Styling

Style the container around the Buy Button:

```css
#stripe-buy-button-container {
    margin: 20px 0;
    padding: 10px;
    border-radius: 8px;
    background: rgba(102, 126, 234, 0.1);
}

stripe-buy-button {
    display: block;
    max-width: 400px;
    margin: 0 auto;
}
```

### Loading States

Add loading indicators while Buy Button initializes:

```javascript
const container = document.getElementById('stripe-buy-button-container');

// Show loading
container.innerHTML = '<div class="loading">Loading payment options...</div>';

// Render button
await renderStripeBuyButton('stripe-buy-button-container', buyButtonId);
```

## 🔐 Security Best Practices

### Use Live Keys in Production

Never commit API keys to version control:

```javascript
// ❌ BAD - Hardcoded keys in code
const STRIPE_KEY = "pk_live_hardcoded_key";

// ✅ GOOD - Load from environment or server
const config = await fetch('/api/stripe/config');
const { publishableKey } = await config.json();
```

### Server-Side Validation

Always validate purchases server-side:

1. **Webhook Verification**: Set up Stripe webhooks to verify purchases
2. **Order Validation**: Confirm payment status before fulfilling orders
3. **Inventory Check**: Verify stock availability before processing

### Test Mode vs Live Mode

Use test mode for development:

```javascript
// Test mode key
const TEST_KEY = "pk_test_51Ndm3QRwc1RkBb2P...";

// Live mode key
const LIVE_KEY = "pk_live_51Ndm3QRwc1RkBb2P...";

// Use based on environment
const STRIPE_KEY = process.env.NODE_ENV === 'production' ? LIVE_KEY : TEST_KEY;
```

## 📊 Features Comparison

| Feature | Stripe Buy Button | Traditional Checkout |
|---------|------------------|---------------------|
| **Setup Time** | 5 minutes | 1-2 hours |
| **Checkout Flow** | One-click | Multi-step |
| **Hosting** | Stripe-hosted | Self-hosted |
| **Customization** | Limited | Full control |
| **Payment Methods** | Card, Apple/Google Pay | All supported |
| **Cart Support** | No | Yes |
| **Multi-item** | No | Yes |
| **Best For** | Single-product purchases | Complex checkout flows |

## 🔄 Integration with Existing Checkout

The Buy Button works alongside the traditional checkout:

1. **Primary Option**: Stripe Buy Button for quick purchases
2. **Secondary Option**: "Add to Cart" for traditional checkout
3. **Fallback**: If Buy Button fails, cart button is always available

Product page layout:

```
┌─────────────────────────────────────┐
│  [Stripe Buy Button - One Click]    │  ← Primary
├─────────────────────────────────────┤
│             OR SEPARATOR             │
├─────────────────────────────────────┤
│  [Add to Cart - Traditional]         │  ← Secondary
└─────────────────────────────────────┘
```

## 🐛 Troubleshooting

### Buy Button Not Showing

**Problem**: Button container is empty

**Solutions**:
1. Check browser console for errors
2. Verify Buy Button ID is correct
3. Confirm publishable key is valid
4. Ensure script is loaded: `<script src="js/stripe-buy-button.js"></script>`

### Payment Fails

**Problem**: Customer clicks Buy Button but payment fails

**Solutions**:
1. Verify product is active in Stripe Dashboard
2. Check payment method restrictions
3. Ensure price is set correctly
4. Review Stripe Dashboard logs

### Wrong Product Charged

**Problem**: Customer is charged for different product

**Solutions**:
1. Verify Buy Button ID matches product
2. Check product mapping in localStorage
3. Create unique Buy Button per product in Stripe

### Button Shows Wrong Price

**Problem**: Button displays incorrect price

**Solutions**:
1. Update product price in Stripe Dashboard
2. Buy Button reflects Stripe product price (not millo database)
3. Ensure Buy Button ID matches correct Stripe product

## 📱 Mobile Optimization

Buy Buttons automatically support:
- **Responsive sizing**: Adapts to container width
- **Touch-friendly**: Large tap targets
- **Apple Pay**: Native iOS integration
- **Google Pay**: Native Android integration

No additional mobile configuration needed!

## 🎯 Use Cases

### Single Product Sale
**Best for**: Individual product pages
```javascript
await renderStripeBuyButton('buy-now-container', product.stripe_buy_button_id);
```

### Product Variants
**Best for**: Products with options (size, color)
- Create separate Stripe products for each variant
- Map variant Buy Button IDs to product options

### Subscription Products
**Best for**: Recurring billing
- Create subscription product in Stripe
- Generate Buy Button with subscription settings

### Digital Downloads
**Best for**: E-books, courses, templates
- Create digital product in Stripe
- Configure download delivery in Stripe

## 📝 Example: Complete Product Integration

```javascript
// 1. Product data with Buy Button ID
const product = {
    id: 'prod_001',
    name: 'Premium T-Shirt',
    price: 29.99,
    stripe_buy_button_id: 'buy_btn_1ShurIRwc1RkBb2PfGHUskTz'
};

// 2. Render product page
function renderProductPage(product) {
    return `
        <div class="product-detail">
            <h1>${product.name}</h1>
            <p class="price">$${product.price}</p>
            
            <!-- Primary: Stripe Buy Button -->
            <div id="stripe-buy-button"></div>
            
            <!-- Secondary: Traditional Cart -->
            <button onclick="addToCart('${product.id}')">
                Add to Cart
            </button>
        </div>
    `;
}

// 3. Initialize Buy Button
async function initializeProduct(product) {
    const buyButtonId = getProductBuyButtonId(product);
    await renderStripeBuyButton('stripe-buy-button', buyButtonId);
}

// 4. Load product
document.addEventListener('DOMContentLoaded', async () => {
    const product = await fetchProduct(productId);
    document.body.innerHTML = renderProductPage(product);
    await initializeProduct(product);
});
```

## 🔗 Resources

- **Stripe Buy Buttons**: https://stripe.com/docs/payment-links/buy-button
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Products**: https://dashboard.stripe.com/products
- **Test Cards**: https://stripe.com/docs/testing#cards
- **millo Documentation**: See `README.md` for platform overview

## 💡 Tips & Best Practices

1. **Test Thoroughly**: Use Stripe test mode before going live
2. **Monitor Webhooks**: Set up webhooks to track purchase events
3. **Update Inventory**: Sync Stripe orders with millo inventory
4. **Branded Experience**: Customize Stripe branding to match millo
5. **Clear Pricing**: Ensure Buy Button price matches displayed price
6. **Fast Loading**: Buy Button script is async for performance
7. **Fallback Always**: Keep traditional checkout as backup
8. **Mobile First**: Test Buy Button on mobile devices
9. **Error Handling**: Implement proper error handling and logging
10. **Customer Support**: Provide clear refund/support information

## 🎉 Next Steps

1. ✅ Create products in Stripe Dashboard
2. ✅ Generate Buy Buttons for each product
3. ✅ Update configuration in `js/stripe-buy-button.js`
4. ✅ Test with Stripe test cards
5. ✅ Monitor first purchase in Stripe Dashboard
6. ✅ Switch to live mode for production
7. ✅ Set up webhooks for order confirmation
8. ✅ Train sellers on Buy Button creation

---

**Need Help?**

- Check Stripe Dashboard for payment logs
- Review browser console for JavaScript errors
- Test with Stripe test cards: `4242 4242 4242 4242`
- Contact Stripe support for payment issues

**Happy Selling! 🛍️**
