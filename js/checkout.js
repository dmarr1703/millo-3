// Checkout Page
let stripe;
let cardElement;
let paymentRequest;

document.addEventListener('DOMContentLoaded', async function() {
    // Check if cart is empty
    if (cart.length === 0) {
        alert('Your cart is empty');
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize Stripe with key from server - SECURE METHOD
    try {
        // Fetch Stripe publishable key from server
        const configResponse = await fetch('/api/stripe/config');
        const config = await configResponse.json();
        
        if (!config.publishableKey || config.publishableKey === 'pk_test_placeholder') {
            throw new Error('Stripe not configured on server');
        }
        
        // Initialize Stripe with the key from server
        stripe = Stripe(config.publishableKey);
        console.log('✅ Stripe initialized successfully (REAL PAYMENT MODE)');
    } catch (error) {
        console.error('Stripe initialization failed:', error);
        alert('Payment system not configured. Please configure Stripe keys in .env file on server.');
        return;
    }
    
    // Initialize Apple Pay if available
    await initializeApplePay();
    
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

// Initialize Apple Pay
async function initializeApplePay() {
    try {
        // Calculate total with tax
        const subtotal = getCartTotal();
        const tax = subtotal * 0.13; // 13% HST for Canada
        const total = subtotal + tax;
        
        // Create payment request
        paymentRequest = stripe.paymentRequest({
            country: 'CA',
            currency: 'cad',
            total: {
                label: 'millo Purchase',
                amount: Math.round(total * 100), // Convert to cents
            },
            requestPayerName: true,
            requestPayerEmail: true,
            requestShipping: true,
            shippingOptions: [
                {
                    id: 'free-shipping',
                    label: 'Free Shipping',
                    detail: 'Arrives in 5-7 business days',
                    amount: 0,
                }
            ],
        });
        
        // Check if Apple Pay / Google Pay is available
        const result = await paymentRequest.canMakePayment();
        
        if (result) {
            // Show Apple Pay button
            const applePayButton = document.getElementById('apple-pay-button');
            const paymentDivider = document.getElementById('payment-divider');
            
            applePayButton.classList.remove('hidden');
            paymentDivider.classList.remove('hidden');
            
            // Create and mount Apple Pay button
            const elements = stripe.elements();
            const prButton = elements.create('paymentRequestButton', {
                paymentRequest: paymentRequest,
                style: {
                    paymentRequestButton: {
                        type: 'buy', // or 'default', 'book', 'donate'
                        theme: 'dark', // or 'light', 'light-outline'
                        height: '48px',
                    },
                },
            });
            
            // Check the availability of the Payment Request API
            prButton.mount('#apple-pay-button');
            
            // Handle payment method received
            paymentRequest.on('paymentmethod', async (ev) => {
                await handleApplePayPayment(ev);
            });
            
            console.log('✅ Apple Pay initialized successfully');
        } else {
            console.log('ℹ️ Apple Pay not available on this device/browser');
        }
    } catch (error) {
        console.error('Apple Pay initialization error:', error);
        // Don't show error to user - just silently disable Apple Pay
    }
}

// Handle Apple Pay payment
async function handleApplePayPayment(ev) {
    try {
        // Get shipping information from Apple Pay
        const shippingAddress = ev.shippingAddress;
        const customerName = ev.payerName || shippingAddress.recipient || 'Apple Pay Customer';
        const customerEmail = ev.payerEmail || currentUser?.email || 'applepay@customer.com';
        
        // Format shipping address
        const addressParts = [
            shippingAddress.addressLine?.[0] || '',
            shippingAddress.city || '',
            shippingAddress.region || '',
            shippingAddress.postalCode || '',
            shippingAddress.country || 'CA'
        ].filter(part => part);
        const formattedAddress = addressParts.join(', ');
        
        // Calculate total with tax
        const subtotal = getCartTotal();
        const tax = subtotal * 0.13; // 13% HST for Canada
        const total = subtotal + tax;
        
        // Create Payment Intent on the server
        const paymentIntentResponse = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: total,
                currency: 'cad',
                payment_method_types: ['card'],
                metadata: {
                    customer_name: customerName,
                    customer_email: customerEmail,
                    shipping_address: formattedAddress,
                    order_count: cart.length,
                    payment_method: 'apple_pay'
                }
            })
        });
        
        if (!paymentIntentResponse.ok) {
            const errorData = await paymentIntentResponse.json();
            ev.complete('fail');
            throw new Error(errorData.error || 'Failed to create payment intent');
        }
        
        const { clientSecret, paymentIntentId } = await paymentIntentResponse.json();
        
        // Confirm the payment with Stripe
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
        );
        
        if (confirmError) {
            ev.complete('fail');
            throw new Error(confirmError.message);
        }
        
        // Verify payment was successful
        if (paymentIntent.status !== 'succeeded') {
            ev.complete('fail');
            throw new Error('Payment was not successful. Status: ' + paymentIntent.status);
        }
        
        // Payment successful! Complete Apple Pay UI
        ev.complete('success');
        
        // Process orders
        await processOrders(customerName, customerEmail, formattedAddress, paymentIntentId);
        
        // Clear cart
        clearCart();
        
        // Show success and redirect
        showNotification('Apple Pay payment successful! Order placed.', 'success');
        setTimeout(() => {
            window.location.href = 'order-success.html';
        }, 1500);
        
    } catch (error) {
        console.error('Apple Pay payment error:', error);
        ev.complete('fail');
        alert('Payment failed: ' + error.message);
    }
}

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

// Handle checkout form submission - REAL PAYMENT PROCESSING
async function handleCheckout(event) {
    event.preventDefault();
    
    const submitButton = document.getElementById('submitButton');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing Payment...';
    
    try {
        // Get form data
        const customerName = document.getElementById('customerName').value;
        const customerEmail = document.getElementById('customerEmail').value;
        const address = document.getElementById('address').value;
        const city = document.getElementById('city').value;
        const province = document.getElementById('province').value;
        const postalCode = document.getElementById('postalCode').value;
        
        const shippingAddress = `${address}, ${city}, ${province} ${postalCode}`;
        
        // Calculate total with tax
        const subtotal = getCartTotal();
        const tax = subtotal * 0.13; // 13% HST for Canada
        const total = subtotal + tax;
        
        // Create Payment Intent on the server
        const paymentIntentResponse = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: total,
                currency: 'cad',
                metadata: {
                    customer_name: customerName,
                    customer_email: customerEmail,
                    shipping_address: shippingAddress,
                    order_count: cart.length
                }
            })
        });
        
        if (!paymentIntentResponse.ok) {
            const errorData = await paymentIntentResponse.json();
            throw new Error(errorData.error || 'Failed to create payment intent');
        }
        
        const { clientSecret, paymentIntentId } = await paymentIntentResponse.json();
        
        // Confirm the payment with Stripe - THIS CHARGES THE CARD
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: customerName,
                    email: customerEmail
                }
            }
        });
        
        if (confirmError) {
            throw new Error(confirmError.message);
        }
        
        // Verify payment was successful
        if (paymentIntent.status !== 'succeeded') {
            throw new Error('Payment was not successful. Status: ' + paymentIntent.status);
        }
        
        // Payment successful! Now create orders
        await processOrders(customerName, customerEmail, shippingAddress, paymentIntentId);
        
        // Clear cart
        clearCart();
        
        // Show success and redirect
        showNotification('Payment successful! Order placed.', 'success');
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

// Process orders - only called after successful payment
async function processOrders(customerName, customerEmail, shippingAddress, paymentIntentId) {
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
            shipping_address: shippingAddress,
            payment_intent_id: paymentIntentId,
            payment_status: 'paid'
        };
        
        // Save order to localStorage database
        const createdOrder = MilloDB.create('orders', order);
        
        // Update product stock
        const updatedStock = item.product.stock - item.quantity;
        MilloDB.update('products', item.product.id, { stock: updatedStock });
        
        // Send email notifications (to both customer and seller)
        try {
            await fetch('/api/send-order-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderId: createdOrder.id })
            });
            console.log('Email notifications sent for order:', createdOrder.id);
        } catch (emailError) {
            console.error('Failed to send email notifications:', emailError);
            // Don't fail the order if email fails
        }
        
        return createdOrder;
    });
    
    await Promise.all(orderPromises);
}
