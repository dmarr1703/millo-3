// Shopping Cart Management
let cart = [];
let cartStripe = null;
let cartPaymentRequest = null;

// Load cart from localStorage on page load
document.addEventListener('DOMContentLoaded', async function() {
    loadCart();
    updateCartUI();
    // Initialize cart Apple Pay
    await initializeCartApplePay();
});

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('milloCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('milloCart', JSON.stringify(cart));
}

// Add item to cart
function addToCart(product, color, quantity = 1) {
    // Check if item already exists in cart
    const existingItem = cart.find(item => 
        item.product.id === product.id && item.color === color
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            product: product,
            color: color,
            quantity: quantity
        });
    }
    
    saveCart();
    updateCartUI();
    showNotification('Added to cart!', 'success');
}

// Remove item from cart
function removeFromCart(productId, color) {
    cart = cart.filter(item => 
        !(item.product.id === productId && item.color === color)
    );
    
    saveCart();
    updateCartUI();
}

// Update item quantity
function updateCartQuantity(productId, color, quantity) {
    const item = cart.find(item => 
        item.product.id === productId && item.color === color
    );
    
    if (item) {
        if (quantity <= 0) {
            removeFromCart(productId, color);
        } else {
            item.quantity = quantity;
            saveCart();
            updateCartUI();
        }
    }
}

// Calculate cart total
function getCartTotal() {
    return cart.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
    }, 0);
}

// Update cart UI
function updateCartUI() {
    // Update cart count badge
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    
    // Update cart items display
    const cartItems = document.getElementById('cartItems');
    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="text-center text-gray-400 py-8">Your cart is empty</div>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="flex items-center space-x-4 border-b border-gray-800 pb-4">
                    <img src="${item.product.image_url}" alt="${item.product.name}" class="w-16 h-16 object-cover rounded border border-gray-800">
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm text-white">${item.product.name}</h4>
                        <p class="text-xs text-gray-400">Color: ${item.color}</p>
                        <p class="text-sm font-bold text-yellow-400">$${item.product.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="updateCartQuantity('${item.product.id}', '${item.color}', ${item.quantity - 1})" class="w-6 h-6 bg-gray-800 text-white rounded hover:bg-gray-700">-</button>
                        <span class="w-8 text-center text-white">${item.quantity}</span>
                        <button onclick="updateCartQuantity('${item.product.id}', '${item.color}', ${item.quantity + 1})" class="w-6 h-6 bg-gray-800 text-white rounded hover:bg-gray-700">+</button>
                    </div>
                    <button onclick="removeFromCart('${item.product.id}', '${item.color}')" class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    // Update cart total
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) {
        cartTotal.textContent = `$${getCartTotal().toFixed(2)} CAD`;
    }
}

// Toggle cart sidebar
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('translate-x-full');
    }
}

// Go to checkout
function goToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    window.location.href = 'checkout.html';
}

// Clear cart
function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
}

// Initialize Apple Pay for cart
async function initializeCartApplePay() {
    try {
        // Only initialize if cart has items
        if (cart.length === 0) {
            return;
        }
        
        // Initialize Stripe
        const configResponse = await fetch('/api/stripe/config');
        const config = await configResponse.json();
        
        if (!config.publishableKey || config.publishableKey === 'pk_test_placeholder') {
            console.log('Stripe not configured - Cart Apple Pay disabled');
            return;
        }
        
        cartStripe = Stripe(config.publishableKey);
        
        // Calculate total with tax
        const subtotal = getCartTotal();
        const tax = subtotal * 0.13;
        const total = subtotal + tax;
        
        // Create payment request
        cartPaymentRequest = cartStripe.paymentRequest({
            country: 'CA',
            currency: 'cad',
            total: {
                label: 'Cart Total',
                amount: Math.round(total * 100),
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
        
        // Check if Apple Pay is available
        const result = await cartPaymentRequest.canMakePayment();
        
        if (result) {
            // Show Apple Pay button
            const applePayButton = document.getElementById('cart-apple-pay-button');
            if (applePayButton) {
                applePayButton.classList.remove('hidden');
                
                // Create and mount button
                const elements = cartStripe.elements();
                const prButton = elements.create('paymentRequestButton', {
                    paymentRequest: cartPaymentRequest,
                    style: {
                        paymentRequestButton: {
                            type: 'buy',
                            theme: 'dark',
                            height: '48px',
                        },
                    },
                });
                
                prButton.mount('#cart-apple-pay-button');
                
                // Handle payment
                cartPaymentRequest.on('paymentmethod', async (ev) => {
                    await handleCartApplePayment(ev);
                });
                
                console.log('✅ Cart Apple Pay initialized');
            }
        }
    } catch (error) {
        console.error('Cart Apple Pay initialization error:', error);
    }
}

// Handle Apple Pay payment for cart
async function handleCartApplePayment(ev) {
    try {
        // Get payment details
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
        
        const subtotal = getCartTotal();
        const tax = subtotal * 0.13;
        const total = subtotal + tax;
        
        // Create Payment Intent
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
        
        // Confirm payment
        const { error: confirmError, paymentIntent } = await cartStripe.confirmCardPayment(
            clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
        );
        
        if (confirmError) {
            ev.complete('fail');
            throw new Error(confirmError.message);
        }
        
        if (paymentIntent.status !== 'succeeded') {
            ev.complete('fail');
            throw new Error('Payment failed');
        }
        
        // Complete Apple Pay
        ev.complete('success');
        
        // Process all cart orders
        const orderPromises = cart.map(async item => {
            const itemSubtotal = item.product.price * item.quantity;
            const commission = itemSubtotal * 0.15;
            const sellerAmount = itemSubtotal * 0.85;
            
            const order = {
                customer_email: customerEmail,
                customer_name: customerName,
                product_id: item.product.id,
                product_name: item.product.name,
                color: item.color,
                quantity: item.quantity,
                price: item.product.price,
                total: itemSubtotal,
                seller_id: item.product.seller_id,
                commission: commission,
                seller_amount: sellerAmount,
                status: 'pending',
                shipping_address: formattedAddress,
                payment_intent_id: paymentIntentId,
                payment_status: 'paid'
            };
            
            const createdOrder = MilloDB.create('orders', order);
            
            // Update stock
            const updatedStock = item.product.stock - item.quantity;
            MilloDB.update('products', item.product.id, { stock: updatedStock });
            
            // Send email notifications
            try {
                await fetch('/api/send-order-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ orderId: createdOrder.id })
                });
            } catch (emailError) {
                console.error('Failed to send email notifications:', emailError);
            }
            
            return createdOrder;
        });
        
        await Promise.all(orderPromises);
        
        // Clear cart
        clearCart();
        
        // Show success and redirect
        showNotification('Apple Pay payment successful!', 'success');
        setTimeout(() => {
            window.location.href = 'order-success.html';
        }, 1500);
        
    } catch (error) {
        console.error('Cart Apple Pay payment error:', error);
        ev.complete('fail');
        alert('Payment failed: ' + error.message);
    }
}
