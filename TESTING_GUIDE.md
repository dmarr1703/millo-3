# Product Addition Testing Guide

## 🧪 How to Test Product Addition

This guide walks you through testing the product addition feature to verify it's working correctly.

## Prerequisites

1. **Server must be running**
   ```bash
   ./start-server.sh
   # or
   node server.js
   ```

2. **Browser open to**: http://localhost:3000

## Test Scenario 1: Add Product with Single Image

### Step 1: Login as Seller
1. Navigate to: http://localhost:3000/dashboard.html
2. If not logged in, you'll be redirected to login
3. Use demo seller credentials:
   - Email: `seller1@example.com`
   - Password: `seller123`
4. Click "Login"

### Step 2: Navigate to Products
1. You should see the dashboard
2. Click on **"My Products"** tab
3. You'll see any existing products (may be empty)

### Step 3: Open Add Product Modal
1. Click the **"+ Add Product"** button
2. A modal should appear with the product form

### Step 4: Fill in Product Details
Fill in the following test data:

```
Product Name: Test T-Shirt
Description: High quality cotton t-shirt for testing
Price: 29.99
Stock: 100
Category: Clothing
Colors: Red, Blue, Green
```

### Step 5: Prepare Test Image
You need at least one image file. You can:

**Option A: Use an existing image from your computer**
- Any JPG, PNG, GIF, or WebP file
- Maximum size: 10MB

**Option B: Download a test image**
- Go to: https://picsum.photos/800/600
- Right-click → Save Image As... → save as `test-product.jpg`

### Step 6: Upload Image
1. Click on the file input field under "Product Images"
2. Select your test image
3. You should see a preview of the image appear
4. Check that the preview shows:
   - The image thumbnail
   - File size in KB
   - Green checkmark (✓)

### Step 7: Submit Product
1. Click **"Add Product"** button at bottom of form
2. You should see:
   - "📤 Uploading 1 image(s)..." notification
   - "✅ Images uploaded successfully!" notification
   - "✅ Product created! Now complete the payment to activate it." notification
3. The modal should close
4. A new modal should appear: **"Complete Payment to Activate Product"**

### Step 8: E-Transfer Payment Modal
The e-transfer modal should show:
- Product name: "Test T-Shirt"
- Amount: $25.00 CAD
- Recipient email: d.marr@live.ca
- Fields for reference number and date

For testing, you can:
- **Skip**: Click "Cancel" (product will remain pending)
- **Simulate**: Enter fake reference number like "TEST123" and today's date

### Step 9: Verify Product Creation
1. Close the payment modal (or submit test payment)
2. Wait 2-3 seconds
3. The products table should refresh
4. You should see your new product with:
   - Name: "Test T-Shirt"
   - Image thumbnail (uploaded image)
   - Price: $29.99
   - Stock: 100
   - Colors: Red, Blue, Green (showing 3 badges)
   - Status: "pending" (orange badge)

### ✅ Test Pass Criteria
- [x] Modal opens correctly
- [x] All form fields are editable
- [x] Image preview shows after selection
- [x] Upload progress notifications appear
- [x] Product appears in products table
- [x] Image displays correctly in table
- [x] Status is "pending"
- [x] E-Transfer modal appears

## Test Scenario 2: Add Product with Multiple Images

### Steps
Same as Scenario 1, but in Step 6:
1. Select **multiple images** (e.g., 3 different images)
2. Preview should show all 3 images
3. Counter should show "3 image(s) selected"
4. After upload: "✅ Images uploaded successfully!" for 3 files
5. In products table, you should see "+2 more" indicator

## Test Scenario 3: Upload Validation

### Test Invalid File Type
1. Try to upload a `.txt` file or `.pdf`
2. Preview should show: "❌ Invalid type"
3. Submit should show error: "Invalid file type for..."

### Test Large File
1. Try to upload an image > 10MB
2. Preview should show: "❌ Too large (XX.X MB)"
3. Submit should show error: "File too large..."

## Test Scenario 4: Server Down

### Simulate Server Failure
1. Stop the server (Ctrl+C in terminal)
2. Try to add a product with image
3. Should see error: "❌ Image upload failed: Failed to fetch"

This confirms the frontend properly handles server errors.

## Test Scenario 5: Form Validation

### Test Empty Fields
Try submitting with:
- Empty product name → Should show browser validation error
- Empty description → Should show browser validation error
- Price = 0 or negative → Should show validation error
- No colors → Should show: "❌ Please fill in all required fields"
- No image selected → Should show: "❌ Please select at least one product image"

## Test Scenario 6: Product Management

### Toggle Status
1. Find your test product in the table
2. Click the toggle icon (🔘)
3. Status should change from "pending" to "inactive" or vice versa
4. Background color should change

### Delete Product
1. Click the trash icon (🗑️)
2. Confirm deletion dialog should appear
3. Click OK
4. Product should disappear from table
5. Associated subscription should be cancelled

## Checking Upload Files

### Verify Files on Server
```bash
# Check uploads directory
ls -lh uploads/

# Should see something like:
# -rw-r--r-- 1 user user 45K Jan  3 12:34 images-1704283440123-abc123def.jpg
```

### Verify File URLs
Check browser console after upload:
```javascript
// Should see logged URLs like:
"/uploads/images-1704283440123-abc123def.jpg"
```

## Database Verification

### Check localStorage
Open browser console and run:
```javascript
// Get all products
const products = JSON.parse(localStorage.getItem('millo_products'));
console.log(products);

// Should show your test product with:
// - images: ["/uploads/images-...jpg"]
// - status: "pending"
// - subscription_status: "pending"
```

### Check Server Database
```bash
# View server database
cat millo-database.json | jq '.products'

# Should show products including your test product
```

## API Endpoint Testing

### Test Upload Endpoint Directly
```bash
# Create a test upload
curl -X POST http://localhost:3000/api/upload-files \
  -F "images=@test-image.jpg" \
  -F "images=@test-image2.jpg"

# Expected response:
{
  "success": true,
  "files": [
    {
      "fileUrl": "/uploads/images-...",
      "filename": "images-...",
      "originalName": "test-image.jpg",
      "mimetype": "image/jpeg",
      "size": 45678
    }
  ],
  "count": 2,
  "message": "Successfully uploaded 2 image(s)"
}
```

### Test Product Creation
```bash
# Create product via API
curl -X POST http://localhost:3000/tables/products \
  -H "Content-Type: application/json" \
  -d '{
    "seller_id": "user-seller-1",
    "name": "API Test Product",
    "description": "Testing via curl",
    "price": 19.99,
    "colors": ["Black", "White"],
    "images": ["/uploads/test.jpg"],
    "image_url": "/uploads/test.jpg",
    "category": "Electronics",
    "stock": 50,
    "status": "pending"
  }'
```

## Expected Results Summary

| Test | Expected Result | Status |
|------|----------------|--------|
| Single image upload | Image uploaded, preview shown, product created | ✅ |
| Multiple image upload | All images uploaded, "+X more" shown | ✅ |
| Invalid file type | Error shown, upload prevented | ✅ |
| Large file | Error shown, upload prevented | ✅ |
| Server down | Fetch error shown gracefully | ✅ |
| Empty required fields | Validation errors shown | ✅ |
| Toggle status | Status changes, UI updates | ✅ |
| Delete product | Product removed, subscription cancelled | ✅ |

## Troubleshooting Test Failures

### Images not uploading
1. **Check server logs** in terminal where server is running
2. **Check browser console** (F12) for JavaScript errors
3. **Verify uploads directory** exists and is writable
4. **Check file permissions** on uploads/

### Product not appearing
1. **Check browser localStorage**: Open DevTools → Application → Local Storage
2. **Look for `millo_products`** key
3. **Verify product is there** with status "pending"

### No notifications showing
1. **Check if showNotification function exists** in auth.js
2. **Verify notification container** is in dashboard.html
3. **Check browser console** for JavaScript errors

### Server errors
1. **Check server terminal** for error messages
2. **Verify all dependencies** are installed: `npm install`
3. **Check port 3000** is not already in use
4. **Restart server** if needed

## Clean Up After Testing

### Remove Test Products
```javascript
// In browser console:
const products = JSON.parse(localStorage.getItem('millo_products'));
const filtered = products.filter(p => !p.name.includes('Test'));
localStorage.setItem('millo_products', JSON.stringify(filtered));
window.location.reload();
```

### Remove Test Files
```bash
# Remove all uploaded test files
rm uploads/images-*
# Keep .gitkeep
touch uploads/.gitkeep
```

### Reset Database
```javascript
// Complete reset (careful!)
MilloDB.reset();
```

## Automated Testing (Future)

For production, consider:
- Cypress or Playwright for E2E testing
- Jest for unit testing
- Postman collections for API testing

## Success Checklist

✅ Server starts without errors  
✅ Dashboard accessible at localhost:3000/dashboard.html  
✅ Seller can login successfully  
✅ Add Product modal opens  
✅ Form validation works  
✅ Image preview displays  
✅ Single image uploads successfully  
✅ Multiple images upload successfully  
✅ Product appears in table with correct data  
✅ Uploaded images display as thumbnails  
✅ E-Transfer modal appears after creation  
✅ Product status is "pending"  
✅ Toggle status works  
✅ Delete product works  
✅ Files saved in uploads/ directory  

---

**Testing Date:** 2026-01-03  
**Status:** All core features working ✅  
**Next:** Configure Stripe for real payments
