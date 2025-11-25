# 🚀 Quick Start Guide - millo

Get started with millo in under 5 minutes!

## 📦 What You Get

A complete e-commerce marketplace with:
- ✨ Beautiful, responsive design
- 👥 User authentication (Admin, Seller, Customer)
- 🛍️ Full shopping cart & checkout
- 💳 Stripe payment integration
- 📊 Seller & Admin dashboards
- 💰 Automatic 15% commission tracking
- 📱 Mobile-friendly interface

---

## 🎯 Quick Access

### Demo Accounts (Ready to Use!)

**👑 Owner/Admin Access:**
```
Email: owner@millo.com
Password: admin123
URL: admin.html
```

**🏪 Seller Access:**
```
Email: seller1@example.com
Password: seller123
URL: dashboard.html
```

**🛒 Customer:**
- Sign up on the homepage OR
- Just browse and shop as guest!

---

## 🏃 Start in 3 Steps

### Step 1: Open the Website
Simply open `index.html` in your browser!

### Step 2: Explore
- **Browse Products** - See 4 sample products ready to go
- **Try Shopping** - Add items to cart, go to checkout
- **Login** - Try the demo accounts above

### Step 3: Test Features

**As a Seller:**
1. Login with seller account
2. Go to Dashboard
3. Add a new product
4. View your earnings

**As an Admin:**
1. Login with admin account
2. View platform analytics
3. See commission earnings
4. Manage users and products

---

## 💡 Key Features to Try

### 🛍️ Shopping Flow
1. Browse products on homepage
2. Click "View Details" on any product
3. Select a color variant
4. Add to cart
5. Click cart icon (top right)
6. Proceed to checkout
7. Fill in shipping info
8. Complete payment (use test card: 4242 4242 4242 4242)

### 📦 Seller Features
1. Login as seller
2. Dashboard → My Products → Add New Product
3. Fill in product details
4. Add multiple colors (comma-separated)
5. Product is live + $25/month subscription starts!

### 👨‍💼 Admin Features
1. Login as admin
2. View real-time analytics
3. Track 15% commission on all sales
4. Manage users (suspend/activate)
5. Oversee all products and orders

---

## 🎨 Subscription Model

**Simple Pricing:**
- $25 CAD per month per product
- Same product + different colors = 1 product
- Example: T-shirt in Red, Blue, Green = $25/month

**Commission:**
- Platform takes 15% of each sale
- Seller keeps 85%
- Example: $100 sale = $15 commission + $85 to seller

---

## 🔧 Configuration (Optional)

### Add Real Stripe Payments

1. Get your Stripe key from [Stripe Dashboard](https://dashboard.stripe.com)
2. Open `js/checkout.js`
3. Replace line 13:
   ```javascript
   stripe = Stripe('your_actual_stripe_key_here');
   ```

That's it! Your payment processing is live.

---

## 📁 File Structure

```
millo/
├── index.html          ← Start here!
├── product.html        ← Product details
├── checkout.html       ← Checkout page
├── dashboard.html      ← Seller dashboard
├── admin.html          ← Admin dashboard
├── js/
│   ├── auth.js         ← Authentication
│   ├── products.js     ← Product logic
│   ├── cart.js         ← Shopping cart
│   ├── dashboard.js    ← Seller features
│   └── admin.js        ← Admin features
└── README.md          ← Full documentation
```

---

## 🎯 Common Tasks

### Add a Product (as Seller)
1. Login → Dashboard
2. "My Products" tab
3. Click "Add New Product"
4. Fill form (all fields required)
5. Submit → Product goes live!

### Process an Order (as Seller)
1. Dashboard → "Orders" tab
2. Click update icon on any order
3. Status advances automatically
4. Track your earnings in real-time

### View Commission (as Admin)
1. Admin dashboard → "Commissions" tab
2. See today, this month, all-time earnings
3. View breakdown by seller
4. Track subscription revenue

---

## 🌟 Pro Tips

**For Best Results:**
1. Use high-quality product images (external URLs)
2. Write clear, detailed descriptions
3. Set competitive prices
4. Offer multiple color options
5. Update order status promptly

**Testing Payments:**
- Test Card: 4242 4242 4242 4242
- Any future expiry date
- Any 3-digit CVC

---

## 🆘 Need Help?

**Common Issues:**

**Cart not saving?**
→ Enable cookies/localStorage in browser

**Can't login?**
→ Use exact credentials (case-sensitive)

**Products not loading?**
→ Refresh page, check browser console

**Stripe errors?**
→ Use test card 4242 4242 4242 4242

---

## 🚀 Deploy Your Site

### Option 1: Netlify (Easiest)
1. Drag & drop your folder to netlify.com
2. Done! Get instant URL

### Option 2: Vercel
1. Upload to GitHub
2. Connect to Vercel
3. Auto-deploy!

### Option 3: Any Web Host
- Upload files via FTP
- Point domain to index.html
- You're live!

---

## 📱 Mobile Ready

Everything works perfectly on:
- 📱 iPhone & Android phones
- 📱 Tablets
- 💻 Desktop
- 🖥️ Large screens

---

## 🎉 You're All Set!

Your millo marketplace is ready to go. Start selling in minutes!

**Next Steps:**
1. Customize branding (colors, name)
2. Add your Stripe key
3. Upload to hosting
4. Start selling!

---

## 📚 More Information

For detailed documentation, see `README.md`

---

**millo** - Simple, Beautiful, Complete 🛍️

*Happy Selling!* 🎉
