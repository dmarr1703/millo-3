# Email Notification Setup Guide

## Overview

The millo marketplace now includes automatic email notifications that are sent to both customers and sellers when orders are placed. This guide will help you configure the email system.

## Features

✅ **Customer Notifications**
- Order confirmation with details
- Product information and quantity
- Shipping address confirmation
- Order tracking information

✅ **Seller Notifications**
- New order alerts
- Customer information
- Shipping details
- Earnings breakdown (85% seller amount)

## Email Configuration

### Option 1: Gmail (Recommended for Quick Setup)

1. **Access Admin Settings**
   - Log in as admin (owner@millo.com)
   - Navigate to Admin Dashboard > Settings tab
   
2. **Generate Gmail App Password**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter "millo Marketplace" as the name
   - Click "Generate"
   - Copy the 16-character app password

3. **Configure Email Settings in Admin Dashboard**
   - Email Service: Select "Gmail"
   - Email Address: Your Gmail address (e.g., `youremail@gmail.com`)
   - App Password: Paste the 16-character password (no spaces)
   - From Email: `noreply@millo.com` (or your preferred sender name)
   - Click "Save Email Settings"

4. **Test Configuration**
   - Click "Send Test Email"
   - Enter your email address
   - Check your inbox for the test email

### Option 2: Custom SMTP Server

1. **Access Admin Settings**
   - Log in as admin
   - Navigate to Admin Dashboard > Settings tab

2. **Configure Custom SMTP**
   - Email Service: Select "Custom SMTP"
   - SMTP Host: Your mail server (e.g., `smtp.example.com`)
   - Port: Usually 587 for TLS or 465 for SSL
   - Use SSL: Check if using port 465
   - Email Address: Your SMTP username
   - App Password: Your SMTP password
   - From Email: The sender email address
   - Click "Save Email Settings"

3. **Test Configuration**
   - Click "Send Test Email"
   - Enter your email address
   - Check your inbox for the test email

## Common SMTP Providers

### Gmail
- Host: `smtp.gmail.com`
- Port: `587`
- SSL: No (uses TLS)
- Requires: App Password

### Outlook/Hotmail
- Host: `smtp.office365.com`
- Port: `587`
- SSL: No (uses TLS)
- Requires: Account password

### Yahoo Mail
- Host: `smtp.mail.yahoo.com`
- Port: `587`
- SSL: No (uses TLS)
- Requires: App Password

### SendGrid
- Host: `smtp.sendgrid.net`
- Port: `587`
- SSL: No (uses TLS)
- Requires: API Key as password

### Mailgun
- Host: `smtp.mailgun.org`
- Port: `587`
- SSL: No (uses TLS)
- Requires: SMTP credentials from Mailgun

## Email Templates

### Customer Order Confirmation

The customer receives:
- Professional branded email with millo gradient header
- Order details (ID, product, color, quantity, total)
- Shipping address confirmation
- Next steps information
- Link to track order

### Seller Order Notification

The seller receives:
- New order alert with celebration emoji 🎉
- Order details (ID, product, color, quantity)
- Earnings breakdown (85% of sale)
- Customer information (name, email, shipping address)
- Action required notice
- Link to dashboard for order management

## Troubleshooting

### Email Not Sending

**Check Configuration:**
1. Verify email settings are saved in Admin Dashboard > Settings
2. Ensure App Password is correct (no spaces)
3. For Gmail: Confirm 2-Step Verification is enabled
4. Test with "Send Test Email" button

**Common Issues:**
- **"Invalid credentials"**: Double-check email and password
- **"Connection timeout"**: Verify SMTP host and port
- **"Authentication failed"**: For Gmail, ensure you're using App Password, not regular password
- **No email received**: Check spam/junk folder

### Gmail App Password Issues

If you can't generate an App Password:
1. Ensure 2-Step Verification is enabled
2. Wait a few minutes after enabling 2-Step Verification
3. Use a desktop browser (not mobile)
4. Try signing out and back into Google Account

### Test Email Not Arriving

1. Check spam/junk folder
2. Verify email address is correct
3. Try sending to a different email address
4. Check server console for error messages

## Security Best Practices

⚠️ **Important Security Notes:**

1. **Never Share Credentials**
   - Don't share your App Password with anyone
   - Don't commit passwords to version control

2. **Use App Passwords**
   - Always use App Passwords for Gmail, not your main password
   - Generate unique App Passwords for each application

3. **Rotate Passwords**
   - Change App Passwords periodically
   - Revoke old App Passwords you're no longer using

4. **Environment Variables (Production)**
   - For production deployment, store email credentials as environment variables
   - Don't hardcode credentials in code

## How It Works

### Order Flow with Email Notifications

1. **Customer places order** via checkout page
2. **Order is created** in database with all details
3. **Email notification triggered** automatically
4. **Two emails sent:**
   - Customer: Order confirmation with details
   - Seller: New order alert with customer info
5. **Order status updated** in dashboard
6. **Seller manages order** and updates status

### Email Sending Logic

```javascript
// When order is created in checkout.js
const createdOrder = MilloDB.create('orders', order);

// Automatically send emails
await fetch('/api/send-order-notification', {
    method: 'POST',
    body: JSON.stringify({ orderId: createdOrder.id })
});
```

### Backend Processing

The server (server.js):
1. Receives order notification request
2. Fetches order, seller, and product details from database
3. Generates HTML email templates
4. Sends email to customer's email address
5. Sends email to seller's email address
6. Returns success/failure status

## Technical Details

### Required Packages
- `nodemailer` - Email sending library

### API Endpoints

**GET /api/email-settings**
- Returns current email configuration (without password)
- Response includes `configured` status boolean

**POST /api/email-settings**
- Saves email configuration
- Requires: service, host, port, secure, user, pass, from

**POST /api/test-email**
- Sends test email to specified address
- Requires: to (email address)

**POST /api/send-order-notification**
- Sends order confirmation emails
- Requires: orderId
- Sends to both customer and seller

### Database Storage

Email settings are stored in `millo-database.json` under:
```json
{
  "settings": {
    "email": {
      "service": "gmail",
      "host": "",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "youremail@gmail.com",
        "pass": "your-app-password"
      },
      "from": "noreply@millo.com"
    }
  }
}
```

## Support

If you encounter issues:
1. Check this documentation
2. Review server console logs for errors
3. Test email configuration with "Send Test Email"
4. Verify SMTP credentials with your email provider

## Updates

**Version 3.0 - Email Notifications**
- ✅ Customer order confirmation emails
- ✅ Seller new order notification emails
- ✅ Admin email configuration interface
- ✅ Test email functionality
- ✅ Gmail and custom SMTP support
- ✅ Beautiful HTML email templates

---

**millo Marketplace** - Keeping everyone informed! 📧
