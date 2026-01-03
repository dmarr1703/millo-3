# Adding Products to Millo - Complete Guide

## 🎯 Overview

This guide explains how to successfully add products to the Millo marketplace platform. The product addition process involves uploading images to the server and creating a product entry that requires monthly subscription payment.

## 🚀 Prerequisites

### 1. Server Must Be Running

**CRITICAL:** The Node.js server must be running for product image uploads to work.

**Start the server:**
```bash
cd /home/user/webapp
node server.js
```

The server will start on port 3000 and you'll see:
```
✨ Millo API Server running on http://0.0.0.0:3000
🛍️  Access the storefront at: http://localhost:3000
```

### 2. Seller Account Required

- You must be logged in with a **Seller** account
- Access the dashboard at: `http://localhost:3000/dashboard.html`
- Demo seller credentials:
  - Email: `seller1@example.com`
  - Password: `seller123`

## 📝 Step-by-Step: Adding a Product

### Step 1: Access Dashboard

1. Open your browser and navigate to: `http://localhost:3000/dashboard.html`
2. Log in with your seller credentials
3. Click on the **"My Products"** tab

### Step 2: Click "Add Product"

Click the **"+ Add Product"** button to open the product creation modal.

### Step 3: Fill in Product Details

#### Required Fields:

1. **Product Name** - Enter a descriptive name for your product
2. **Description** - Provide detailed information about the product
3. **Price (CAD)** - Set the product price in Canadian dollars
4. **Stock** - Enter available quantity
5. **Category** - Select from dropdown:
   - Clothing
   - Electronics
   - Accessories
   - Home & Garden
   - Sports
   - Books
   - Other
6. **Colors** - Enter colors separated by commas (e.g., "Red, Blue, Green")
7. **Product Images** - **REQUIRED** - Select one or more images

#### Image Requirements:

- **Formats:** JPG, JPEG, PNG, GIF, WebP
- **Max size:** 10MB per image
- **Multiple images:** You can upload multiple product images
- **Preview:** Images will be previewed before upload

### Step 4: Submit Product

1. Click **"Add Product"** button
2. Images will be uploaded to the server
3. Product will be created with **"Pending"** status
4. E-Transfer payment modal will appear automatically

### Step 5: Complete E-Transfer Payment

#### Payment Details:

- **Amount:** $25 CAD per month
- **Recipient:** `d.marr@live.ca`
- **Payment Method:** Interac e-Transfer

#### Steps:

1. Open your online banking
2. Send e-Transfer of **$25 CAD** to: `d.marr@live.ca`
3. Copy the **e-Transfer reference number** from your bank
4. Return to the Millo dashboard
5. Enter the reference number in the modal
6. Enter the transfer date
7. Click **"Submit Payment"**

### Step 6: Wait for Activation

- Your product is now **pending admin approval**
- Admin will verify your e-Transfer payment
- Typical approval time: **1-24 hours**
- Once approved, your product will be **activated** and visible on the marketplace

## ⚙️ How Product Addition Works (Technical)

### Architecture Overview

The Millo platform uses a **hybrid architecture**:

1. **Frontend:** HTML, JavaScript, Tailwind CSS
2. **Client-side DB:** MilloDB (localStorage-based)
3. **Backend:** Node.js Express server
4. **File Storage:** Local file system (`uploads/` directory)

### Product Addition Flow

```
1. User fills product form
   ↓
2. Frontend validates inputs
   ↓
3. Images uploaded to server (/api/upload-files)
   ↓
4. Server saves files to uploads/ directory
   ↓
5. Server returns file URLs
   ↓
6. Product created in MilloDB (localStorage)
   ↓
7. Product status: "pending"
   ↓
8. E-Transfer modal shown
   ↓
9. User submits payment info
   ↓
10. Admin verifies payment
   ↓
11. Product activated
```

### Key Endpoints

#### File Upload
```javascript
POST /api/upload-files
Content-Type: multipart/form-data
Body: FormData with 'images' field (multiple files)

Response:
{
  "success": true,
  "files": [
    {
      "fileUrl": "/uploads/images-123456.jpg",
      "filename": "images-123456.jpg",
      "originalName": "product.jpg",
      "mimetype": "image/jpeg",
      "size": 45678
    }
  ],
  "count": 1,
  "message": "Successfully uploaded 1 image(s)"
}
```

#### Product Creation
```javascript
POST /tables/products
Content-Type: application/json
Body: {
  "id": "prod-1234567890",
  "seller_id": "user-seller-1",
  "name": "Product Name",
  "description": "Product description",
  "price": 29.99,
  "colors": ["Red", "Blue"],
  "images": ["/uploads/images-123456.jpg"],
  "image_url": "/uploads/images-123456.jpg",
  "category": "Clothing",
  "stock": 50,
  "status": "pending",
  "subscription_status": "pending",
  "payment_confirmed": false,
  "stripe_buy_button_id": "buy_btn_1ShurIRwc1RkBb2PfGHUskTz",
  "created_at": "2024-01-03T12:00:00.000Z"
}

Response: Created product object
```

#### E-Transfer Submission
```javascript
POST /api/etransfer/submit
Content-Type: application/json
Body: {
  "seller_id": "user-seller-1",
  "seller_email": "seller@example.com",
  "product_id": "prod-1234567890",
  "product_name": "Product Name",
  "reference_number": "ABC123XYZ",
  "amount": 25,
  "transfer_date": "2024-01-03"
}

Response: {
  "success": true,
  "message": "E-Transfer payment submitted for verification"
}
```

## 🐛 Troubleshooting

### Issue: "Failed to upload images"

**Cause:** Server is not running or not accessible

**Solution:**
1. Check if server is running: Look for process on port 3000
2. Start server: `node server.js`
3. Check server logs for errors
4. Verify uploads directory exists and is writable

### Issue: "Please select at least one product image"

**Cause:** No image files selected

**Solution:**
1. Click on the file input
2. Select one or more images
3. Verify they are valid image formats (JPG, PNG, GIF, WebP)
4. Check file size is under 10MB per file

### Issue: "Invalid file type"

**Cause:** Unsupported file format

**Solution:**
- Only use: JPG, JPEG, PNG, GIF, or WebP files
- Do not use: BMP, TIFF, SVG, or other formats

### Issue: "File too large"

**Cause:** Image exceeds 10MB limit

**Solution:**
1. Compress the image using online tools
2. Resize image to smaller dimensions
3. Reduce image quality slightly
4. Use JPG format instead of PNG for photos

### Issue: Product stays "Pending" forever

**Cause:** Admin hasn't verified e-Transfer payment yet

**Solution:**
1. Wait up to 24 hours for verification
2. Check your e-Transfer was sent to correct email: `d.marr@live.ca`
3. Verify reference number was entered correctly
4. Contact admin if issue persists

## 📊 Product Status Explained

### Status Values:

1. **Pending** - Product created, awaiting payment verification
2. **Active** - Payment confirmed, product visible on marketplace
3. **Inactive** - Product temporarily disabled by seller
4. **Expired** - Subscription payment not received (product hidden)

### Subscription Status:

1. **Pending** - Awaiting first payment verification
2. **Active** - Monthly subscription active
3. **Expired** - Payment overdue (grace period may apply)
4. **Cancelled** - Seller cancelled subscription

## 💰 Subscription & Pricing

### Monthly Subscription Fee

- **Cost:** $25 CAD per product per month
- **Payment Method:** Interac e-Transfer to `d.marr@live.ca`
- **Billing:** Monthly recurring
- **Same Product Rule:** Different colors of the same product = 1 subscription

### Example Scenarios:

**Scenario 1:**
- T-Shirt in Red, Blue, Green = $25/month (1 product)

**Scenario 2:**
- T-Shirt + Jeans = $50/month (2 products)

**Scenario 3:**
- T-Shirt (3 colors) + Headphones (2 colors) + Wallet = $75/month (3 products)

### Commission Structure

When a customer purchases your product:
- **Platform commission:** 15%
- **Your earnings:** 85%

**Example:**
- Product sells for $100
- Platform keeps: $15
- You receive: $85

## 🔄 Managing Existing Products

### Edit Product (Coming Soon)

Currently, you cannot edit existing products. To change a product:
1. Delete the old product
2. Create a new product with updated information

### Toggle Product Status

- Click the toggle icon to activate/deactivate a product
- Inactive products are not shown on marketplace
- Subscription still charged for inactive products

### Delete Product

- Click the trash icon to delete a product
- This will also cancel the associated subscription
- **Warning:** This action cannot be undone

## 📱 Mobile Considerations

The dashboard is fully responsive and works on mobile devices:
- Touch-friendly interface
- Mobile-optimized file picker
- Responsive tables and modals

## 🔐 Security Notes

- All file uploads are validated server-side
- File types and sizes are checked
- Files are stored securely on the server
- Only sellers can add products to their own account

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Verify server is running
3. Check browser console for errors
4. Contact platform admin at: `owner@millo.com`

---

**Happy Selling! 🛍️**

*Last Updated: 2024-01-03*
