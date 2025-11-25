// Checkout Page
let stripe;
let cardElement;

document.addEventListener('DOMContentLoaded', function() {
    // Check if cart is empty
    if (cart.length === 0) {
        alert('Your cart is empty');
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize Stripe
    // IMPORTANT: Replace with your actual Stripe publishable key from dashboard.stripe.com
    // Get your key at: https://dashboard.stripe.com/apikeys
    // This is a LIVE key - real payments will be processed
    try {
        stripe = Stripe('pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK');
    } catch (error) {
        console.error('Stripe initialization failed:', error);
        alert('Payment system not configured. Please add your Stripe publishable key in js/checkout.js');
        return;
    }
    
    // Create Stripe card element
    const elements = stripe.elements();
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#32325d',
                fontFamily: 'Poppins, sans-serif',
                '::placeholder': {
                    color: '#aab7c4'
                }
            }
        }
    });
    cardElement.mount('#card-element');
    
    // Handle card errors
    cardElement.on('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });
    
    // Load order summary
    displayOrderSummary();
    
    // Pre-fill customer info if logged in
    if (currentUser) {
        document.getElementById('customerName').value = currentUser.full_name || '';
        document.getElementById('customerEmail').value = currentUser.email || '';
    }
    
    // Setup form submission
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
});

// Display order summary
function displayOrderSummary() {
    const orderItems = document.getElementById('orderItems');
    
    orderItems.innerHTML = cart.map(item => `
        <div class="flex items-center space-x-3">
            <img src="${item.product.image_url}" alt="${item.product.name}" class="w-16 h-16 object-cover rounded">
            <div class="flex-1">
                <h4 class="font-semibold text-sm">${item.product.name}</h4>
                <p class="text-xs text-gray-500">Color: ${item.color}</p>
                <p class="text-xs text-gray-500">Qty: ${item.quantity}</p>
            </div>
            <span class="font-semibold">$${(item.product.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    // Calculate totals
    const subtotal = getCartTotal();
    const tax = subtotal * 0.13; // 13% HST for Canada
    const total = subtotal + tax;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)} CAD`;
    document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
}

// Handle checkout form submission
async function handleCheckout(event) {
    event.preventDefault();
    
    const submitButton = document.getElementById('submitButton');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    
    try {
        // Get form data
        const customerName = document.getElementById('customerName').value;
        const customerEmail = document.getElementById('customerEmail').value;
        const address = document.getElementById('address').value;
        const city = document.getElementById('city').value;
        const province = document.getElementById('province').value;
        const postalCode = document.getElementById('postalCode').value;
        
        const shippingAddress = `${address}, ${city}, ${province} ${postalCode}`;
        
        // Create payment method with Stripe
        const {paymentMethod, error} = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
                name: customerName,
                email: customerEmail
            }
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        // Process orders
        await processOrders(customerName, customerEmail, shippingAddress);
        
        // Clear cart
        clearCart();
        
        // Show success and redirect
        showNotification('Order placed successfully!', 'success');
        setTimeout(() => {
            window.location.href = 'order-success.html';
        }, 1500);
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Payment failed: ' + error.message);
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-lock mr-2"></i>Place Order - <span id="checkoutTotal">' + 
                                document.getElementById('checkoutTotal').textContent + '</span> CAD';
    }
}

// Process orders
async function processOrders(customerName, customerEmail, shippingAddress) {
    const orderPromises = cart.map(async item => {
        const subtotal = item.product.price * item.quantity;
        const commission = subtotal * 0.15; // 15% commission
        const sellerAmount = subtotal * 0.85; // 85% for seller
        
        const order = {
            customer_email: customerEmail,
            customer_name: customerName,
            product_id: item.product.id,
            product_name: item.product.name,
            color: item.color,
            quantity: item.quantity,
            price: item.product.price,
            total: subtotal,
            seller_id: item.product.seller_id,
            commission: commission,
            seller_amount: sellerAmount,
            status: 'pending',
            shipping_address: shippingAddress
        };
        
        // Save order to localStorage database
        const createdOrder = MilloDB.create('orders', order);
        
        // Update product stock
        const updatedStock = item.product.stock - item.quantity;
        MilloDB.update('products', item.product.id, { stock: updatedStock });
        
        return createdOrder;
    });
    
    await Promise.all(orderPromises);
}
