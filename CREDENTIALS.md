# 🔑 Test Accounts & Credentials - millo

All test accounts and demo credentials for the millo platform.

---

## 👑 Admin/Owner Account

**Full platform access with commission tracking**

```
Email: owner@millo.com
Password: admin123
Role: Admin
Access: admin.html
```

**What you can do:**
- View complete platform analytics
- Track all commission earnings (15% of sales)
- Manage all users (activate/suspend/delete)
- Oversee all products
- Monitor all orders
- View subscription revenue
- Access detailed reports

---

## 🏪 Seller Accounts

### Seller 1

```
Email: seller1@example.com
Password: seller123
Role: Seller
Access: dashboard.html
```

**Products owned:**
- Classic Cotton T-Shirt ($29.99)
- Leather Wallet ($49.99)

**Active subscriptions:** 2 products × $25/month = $50/month

---

### Seller 2

```
Email: seller2@example.com
Password: seller123
Role: Seller
Access: dashboard.html
```

**Products owned:**
- Wireless Earbuds ($89.99)
- Yoga Mat ($39.99)

**Active subscriptions:** 2 products × $25/month = $50/month

---

## 🛒 Customer Account

**Customers can sign up on the homepage**

No pre-configured customer accounts. Customers can:
- Browse without login
- Create account during checkout
- Sign up anytime via "Sign Up" button

---

## 💳 Test Payment Cards

For testing Stripe payments:

### Successful Payment
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### Payment Declined
```
Card Number: 4000 0000 0000 0002
Expiry: Any future date
CVC: Any 3 digits
```

### Requires Authentication
```
Card Number: 4000 0027 6000 3184
Expiry: Any future date
CVC: Any 3 digits
```

### Insufficient Funds
```
Card Number: 4000 0000 0000 9995
Expiry: Any future date
CVC: Any 3 digits
```

More test cards: [Stripe Test Cards](https://stripe.com/docs/testing)

---

## 📦 Sample Products

### Product 1: Classic Cotton T-Shirt
```
ID: prod-001
Seller: seller1@example.com
Price: $29.99 CAD
Colors: White, Black, Navy, Gray
Stock: 50
Category: Clothing
Status: Active
```

### Product 2: Leather Wallet
```
ID: prod-002
Seller: seller1@example.com
Price: $49.99 CAD
Colors: Brown, Black
Stock: 30
Category: Accessories
Status: Active
```

### Product 3: Wireless Earbuds
```
ID: prod-003
Seller: seller2@example.com
Price: $89.99 CAD
Colors: White, Black, Blue
Stock: 25
Category: Electronics
Status: Active
```

### Product 4: Yoga Mat
```
ID: prod-004
Seller: seller2@example.com
Price: $39.99 CAD
Colors: Purple, Green, Pink, Blue
Stock: 40
Category: Sports
Status: Active
```

---

## 📊 Sample Orders

### Order 1
```
Order ID: order-001
Customer: Alice Johnson (alice@example.com)
Product: Classic Cotton T-Shirt (Black)
Quantity: 2
Total: $59.98
Seller Amount: $50.98 (85%)
Commission: $9.00 (15%)
Status: Completed
```

### Order 2
```
Order ID: order-002
Customer: Bob Smith (bob@example.com)
Product: Wireless Earbuds (White)
Quantity: 1
Total: $89.99
Seller Amount: $76.49 (85%)
Commission: $13.50 (15%)
Status: Shipped
```

---

## 💰 Financial Summary

### Revenue Breakdown

**Total Sales:** $149.97

**Platform Commission (15%):**
- Order 1: $9.00
- Order 2: $13.50
- **Total Commission: $22.50**

**Seller Earnings (85%):**
- Seller 1: $50.98
- Seller 2: $76.49
- **Total Seller Earnings: $127.47**

**Monthly Subscription Revenue:**
- 4 active subscriptions × $25 = **$100/month**

**Total Platform Revenue:**
- Sales Commission: $22.50
- Subscriptions: $100/month
- **Combined Revenue: $122.50**

---

## 🔐 Security Notes

### Important for Production:

⚠️ **These are DEMO credentials only!**

**Before going live:**

1. **Change all passwords** to strong, unique passwords
2. **Delete test accounts** and create real admin account
3. **Hash passwords** using bcrypt or similar
4. **Remove sample data** (products, orders)
5. **Update Stripe keys** to live keys
6. **Enable 2FA** for admin account
7. **Implement password reset** functionality
8. **Add email verification**

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Purchase Flow

1. **Browse as customer:**
   - Visit `index.html`
   - Browse products
   - Click "View Details" on any product

2. **Make purchase:**
   - Select color
   - Add to cart
   - Go to checkout
   - Enter test customer info:
     ```
     Name: Test Customer
     Email: test@example.com
     Address: 123 Test St
     City: Toronto
     Province: ON
     Postal Code: M5H 2N2
     ```
   - Use test card: `4242 4242 4242 4242`
   - Complete order

3. **Verify as seller:**
   - Login as seller1 or seller2
   - Check Orders tab
   - See new order
   - Update status

4. **Verify as admin:**
   - Login as owner
   - Check All Orders
   - Verify commission calculated
   - See updated analytics

---

### Scenario 2: Seller Onboarding

1. **Sign up as new seller:**
   - Click "Sign Up"
   - Choose "Sell Products (Seller)"
   - Enter details
   - Create account

2. **Add first product:**
   - Go to Dashboard
   - Click "Add New Product"
   - Fill all fields:
     ```
     Name: Test Product
     Description: Test description
     Price: 49.99
     Stock: 10
     Category: Other
     Colors: Red, Blue
     Image URL: [any image URL]
     ```
   - Submit (creates $25/month subscription)

3. **Verify subscription:**
   - Check Subscriptions tab
   - See active subscription
   - See next billing date

---

### Scenario 3: Admin Management

1. **Login as admin:**
   - Email: owner@millo.com
   - Password: admin123

2. **Manage users:**
   - Go to Users tab
   - Toggle user status
   - View user details

3. **Monitor platform:**
   - Check total sales
   - View commission earnings
   - Review subscription revenue
   - Analyze seller performance

---

## 📞 Support Contacts

### For Platform Issues:

**Email:** support@millo.com
**Platform:** millo Marketplace

### For Payment Issues:

**Test Mode:** No real charges
**Live Mode:** Contact Stripe support

---

## 🔄 Password Reset (Future Feature)

Currently not implemented. Recommended flow:

1. User clicks "Forgot Password"
2. Enter email
3. Receive reset link
4. Create new password
5. Confirmation email

---

## 📱 Mobile App Credentials

No mobile app yet. Website is fully responsive and works on:
- 📱 Mobile phones
- 📱 Tablets
- 💻 Desktop
- 🖥️ Large screens

---

## 🎯 Quick Access URLs

After deployment:

```
Homepage: /index.html
Login: /index.html (click Login)
Seller Dashboard: /dashboard.html
Admin Dashboard: /admin.html
Product Details: /product.html?id=prod-001
Checkout: /checkout.html
```

---

## 📝 Notes

### Default Behavior:

- **Guest Shopping:** Customers can browse and shop without account
- **Seller Access:** Must be logged in to access dashboard
- **Admin Access:** Only admin role can access admin dashboard
- **Cart Persistence:** Shopping cart saved in browser localStorage
- **Session Duration:** Stays logged in until manual logout

### Data Reset:

To reset demo data:
1. Clear all table data
2. Re-add sample users and products
3. Or start fresh with new accounts

---

## ✅ Credential Checklist

Before sharing with team:

- [ ] All test accounts documented
- [ ] Test payment cards listed
- [ ] Sample data catalogued
- [ ] Access URLs provided
- [ ] Testing scenarios outlined
- [ ] Security warnings included
- [ ] Support contacts added

---

## 🚀 Ready to Test!

You now have everything you need to fully test the millo platform.

**Start Here:**
1. Open `index.html`
2. Try browsing as guest
3. Login with demo accounts
4. Test complete flows

---

**millo** - Test with Confidence 🧪

*All systems ready for testing!* ✅
