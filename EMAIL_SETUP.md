# Email Notification Setup Guide

## Overview

The Millo marketplace now includes automatic email notifications for orders. When a customer completes a purchase:

1. **Customer receives:** Order confirmation with all order details and shipping information
2. **Seller receives:** New order notification with customer details, shipping address, and earnings breakdown

## Features

✅ **Automatic Order Notifications**
- Sent immediately after successful payment
- Professional HTML email templates
- Complete order details included
- Seller earnings breakdown (85/15 split)

✅ **Customer Email Includes:**
- Order confirmation
- Product details (name, color, quantity, price)
- Total amount paid
- Shipping address
- Order ID for tracking

✅ **Seller Email Includes:**
- New order alert
- Product and quantity sold
- Customer name and email
- Full shipping address
- Earnings breakdown (your 85%, platform 15%)
- Link to dashboard to process order

## Setup Instructions

### Option 1: Using Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication on your Gmail account**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate an App Password**
   - Visit https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password generated

3. **Create a `.env` file** in the project root:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` and add your credentials:**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_16_char_app_password
   EMAIL_FROM=Millo Marketplace <your_email@gmail.com>
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

You should see: `📧 Email notifications enabled`

### Option 2: Using Other SMTP Services

#### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=Millo Marketplace <noreply@yourdomain.com>
```

#### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=postmaster@yourdomain.mailgun.org
EMAIL_PASSWORD=your_mailgun_password
EMAIL_FROM=Millo Marketplace <noreply@yourdomain.com>
```

#### AWS SES
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_aws_smtp_username
EMAIL_PASSWORD=your_aws_smtp_password
EMAIL_FROM=Millo Marketplace <noreply@yourdomain.com>
```

#### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@outlook.com
EMAIL_PASSWORD=your_password
EMAIL_FROM=Millo Marketplace <your_email@outlook.com>
```

## Testing Email Notifications

### 1. Configure Email Settings
Make sure your `.env` file has valid email credentials.

### 2. Start the Server
```bash
npm start
```

Look for the confirmation message:
```
📧 Email notifications enabled
```

### 3. Create a Test Order
1. Browse to http://localhost:3000
2. Add a product to cart
3. Go to checkout
4. Fill in customer information (use your email to receive the buyer notification)
5. Complete the payment (use Stripe test card: 4242 4242 4242 4242)

### 4. Check Email Delivery
- **Buyer email:** Should arrive at the customer email address entered
- **Seller email:** Should arrive at the seller's email (check user database)

Check the server console for confirmation:
```
✉️  Email sent: <message-id>
📧 Order notifications sent for order: order-xxx-xxx
```

## Troubleshooting

### Emails Not Sending

**Check 1: Configuration**
```bash
# Make sure .env file exists and has correct values
cat .env
```

**Check 2: Server Console**
Look for error messages in the server console when an order is placed.

**Check 3: Gmail App Password**
- Must use App Password, not regular Gmail password
- App Passwords only work with 2FA enabled
- Generate a new one if needed

**Check 4: Firewall/Port**
- Port 587 must be open for SMTP
- Some networks block SMTP ports
- Try port 465 with `EMAIL_SECURE=true` if 587 doesn't work

### Emails Going to Spam

1. **Use a verified sending domain** (not gmail.com in production)
2. **Set up SPF, DKIM, and DMARC records** for your domain
3. **Use a professional email service** (SendGrid, Mailgun, AWS SES)
4. **Warm up your sending reputation** gradually

### Common Errors

**"Invalid login"**
- Check username/password are correct
- For Gmail, ensure you're using App Password, not regular password
- Check 2FA is enabled for Gmail

**"Connection timeout"**
- Port might be blocked
- Try different port (465 with SECURE=true)
- Check firewall settings

**"Email not sent - transporter not configured"**
- `.env` file missing or not loaded
- EMAIL_USER or EMAIL_PASSWORD not set
- Server needs restart after .env changes

## Production Recommendations

### 1. Use a Professional Email Service
Don't use personal Gmail for production. Use:
- **SendGrid** - 100 emails/day free
- **Mailgun** - 1,000 emails/month free  
- **AWS SES** - 62,000 emails/month free (with EC2)
- **Postmark** - 100 emails/month free

### 2. Set Up a Custom Domain
```env
EMAIL_FROM=Millo <noreply@yourdomain.com>
```

### 3. Configure DNS Records
Set up proper email authentication:
- **SPF Record** - Authorize sending servers
- **DKIM Record** - Sign your emails
- **DMARC Record** - Set policy for failed emails

### 4. Monitor Email Delivery
- Set up bounce handling
- Track delivery rates
- Monitor spam complaints
- Log email sending status

### 5. Add Unsubscribe Links (for marketing emails)
For transactional emails (order confirmations), this is optional but good practice.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_HOST` | Yes | smtp.gmail.com | SMTP server hostname |
| `EMAIL_PORT` | Yes | 587 | SMTP server port |
| `EMAIL_SECURE` | No | false | Use TLS (true for port 465) |
| `EMAIL_USER` | Yes | - | SMTP username/email |
| `EMAIL_PASSWORD` | Yes | - | SMTP password/API key |
| `EMAIL_FROM` | No | Millo Marketplace | Sender name and email |
| `APP_URL` | No | http://localhost:3000 | App URL for links in emails |

## Email Templates

The system includes two professionally designed HTML email templates:

### 1. Buyer Confirmation Email
- Purple gradient header with Millo branding
- Complete order details in a clean table
- Shipping address clearly displayed
- What's next section
- Professional footer

### 2. Seller Notification Email
- Attention-grabbing new order header
- Complete order and customer information
- Earnings breakdown (85/15 split)
- Formatted shipping address ready to print/copy
- Call-to-action button to dashboard
- Professional footer

Both templates are mobile-responsive and work across all major email clients.

## API Endpoint

### POST /api/send-order-notification

Send email notifications for an order.

**Request Body:**
```json
{
  "order_id": "order-123-abc"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications sent",
  "results": {
    "buyer": {
      "success": true,
      "messageId": "<message-id>"
    },
    "seller": {
      "success": true,
      "messageId": "<message-id>"
    }
  }
}
```

**Usage in Code:**
```javascript
const response = await fetch('/api/send-order-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: 'order-123-abc' })
});

const result = await response.json();
console.log(result);
```

## Customizing Email Templates

Email templates are defined in `server.js`:
- `generateBuyerEmail()` - Customer confirmation template
- `generateSellerEmail()` - Seller notification template

To customize:
1. Open `server.js`
2. Find the template functions (around line 50-200)
3. Modify the HTML as needed
4. Restart the server

## Support

For issues with email notifications:
1. Check server console logs
2. Verify `.env` configuration
3. Test SMTP credentials manually
4. Check email provider documentation
5. Review troubleshooting section above

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to version control
- Use App Passwords for Gmail (never regular password)
- Rotate credentials periodically
- Use environment-specific credentials (dev/staging/production)
- Enable 2FA on email accounts
- Monitor for suspicious sending activity

---

**Need Help?** Check the main README.md for general setup or open an issue on GitHub.
