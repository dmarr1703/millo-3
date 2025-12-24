# Stripe Buy Button - Quick Reference Card

## 🚀 Copy & Paste - Ready to Use!

### Your Pre-Configured Code

```html
<script async src="https://js.stripe.com/v3/buy-button.js"></script>

<stripe-buy-button
  buy-button-id="buy_btn_1ShurIRwc1RkBb2PfGHUskTz"
  publishable-key="pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK">
</stripe-buy-button>
```

**Just paste this anywhere in your HTML and you have a working Buy Button!**

---

## 📋 3 Ways to Use

### Method 1: Direct HTML (Easiest)
```html
<script async src="https://js.stripe.com/v3/buy-button.js"></script>
<stripe-buy-button
  buy-button-id="buy_btn_1ShurIRwc1RkBb2PfGHUskTz"
  publishable-key="pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK">
</stripe-buy-button>
```

### Method 2: millo JavaScript API
```html
<script src="js/stripe-buy-button.js"></script>
<div id="buy-button"></div>
<script>
  renderStripeBuyButton('buy-button');
</script>
```

### Method 3: Per-Product Button IDs
```javascript
// Different button for each product
await renderStripeBuyButton('container-id', 'buy_btn_DIFFERENT_ID');
```

---

## 🎯 Where It's Already Integrated

✅ **Product Detail Pages** (`product.html`)
- Automatically shows on every product page
- No additional setup needed
- Primary checkout option

---

## 🧪 Test Cards

| Card Number | Result |
|------------|--------|
| 4242 4242 4242 4242 | ✅ Success |
| 4000 0000 0000 0002 | ❌ Decline |
| 4000 0025 0000 3155 | 🔐 3D Secure |

**Expiry**: Any future date (e.g., 12/34)  
**CVC**: Any 3 digits (e.g., 123)

---

## 📁 Files to Know

| File | Purpose |
|------|---------|
| `js/stripe-buy-button.js` | Core library |
| `STRIPE_BUY_BUTTON_GUIDE.md` | Full documentation |
| `stripe-buy-button-example.html` | Live examples |
| `product.html` | Already integrated |

---

## 🔧 Configuration Location

**File**: `js/stripe-buy-button.js`  
**Lines**: 15-18

```javascript
const STRIPE_PUBLISHABLE_KEY = "pk_live_51Ndm3Q...";
const DEFAULT_BUY_BUTTON_ID = "buy_btn_1ShurI...";
```

---

## 💡 Quick Tips

1. **For All Products**: Use default button ID (already configured)
2. **For New Products**: Create button in Stripe Dashboard
3. **For Testing**: Use card 4242 4242 4242 4242
4. **For Help**: See `STRIPE_BUY_BUTTON_GUIDE.md`

---

## 🎨 How Customers See It

```
┌────────────────────────┐
│   Product Details      │
├────────────────────────┤
│ [Stripe Buy Button]    │ ← One-Click Purchase
├────────────────────────┤
│        OR              │
├────────────────────────┤
│ [Add to Cart]          │ ← Traditional Flow
└────────────────────────┘
```

---

## ✅ Status

- ✅ Code integrated
- ✅ Configuration set
- ✅ Documentation complete
- ✅ Pushed to GitHub
- ✅ Ready to use!

---

## 🆘 Need Help?

1. Read: `STRIPE_BUY_BUTTON_GUIDE.md`
2. See: `stripe-buy-button-example.html`
3. Test: Use card 4242 4242 4242 4242
4. Check: Stripe Dashboard for payments

---

**That's it! You're ready to accept one-click purchases! 🎉**
