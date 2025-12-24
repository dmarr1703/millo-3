// Product Detail Page
let currentProduct = null;
let selectedColor = null;
let stripe = null;
let productPaymentRequest = null;

// Load product on page load
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        await loadProductDetail(productId);
        // Initialize Stripe Buy Button
        await initializeStripeBuyButton();
        // Initialize Apple Pay after product is loaded
        await initializeProductApplePay();
    } else {
        window.location.href = 'index.html';
    }
});

// Load product details
async function loadProductDetail(productId) {
    try {
        const product = await getProductById(productId);
        
        if (!product) {
            alert('Product not found');
            window.location.href = 'index.html';
            return;
        }
        
        currentProduct = product;
        displayProductDetail();
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Error loading product');
    }
}

// Display product details
function displayProductDetail() {
    document.getElementById('productImage').src = currentProduct.image_url;
    document.getElementById('productImage').alt = currentProduct.name;
    document.getElementById('productName').textContent = currentProduct.name;
    document.getElementById('productDescription').textContent = currentProduct.description;
    document.getElementById('productPrice').textContent = `$${currentProduct.price.toFixed(2)}`;
    document.getElementById('productCategory').textContent = currentProduct.category;
    document.getElementById('stockCount').textContent = currentProduct.stock;
    
    // Display color options
    const colorOptions = document.getElementById('colorOptions');
    colorOptions.innerHTML = currentProduct.colors.map((color, index) => `
        <div class="text-center">
            <div class="color-option ${index === 0 ? 'selected' : ''}" 
                 style="background-color: ${getColorHex(color)};"
                 onclick="selectColor('${color}')"
                 title="${color}">
            </div>
            <p class="text-xs mt-1">${color}</p>
        </div>
    `).join('');
    
    // Select first color by default
    if (currentProduct.colors.length > 0) {
        selectedColor = currentProduct.colors[0];
        updateSelectedColorText();
    }
}

// Select color
function selectColor(color) {
    selectedColor = color;
    
    // Update UI
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach((option, index) => {
        if (currentProduct.colors[index] === color) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    updateSelectedColorText();
}

// Update selected color text
function updateSelectedColorText() {
    document.getElementById('selectedColorText').textContent = `Selected: ${selectedColor}`;
}

// Initialize Stripe Buy Button for current product
async function initializeStripeBuyButton() {
    if (!currentProduct) {
        console.error('No product loaded');
        return;
    }
    
    try {
        // Get buy button ID for this product
        const buyButtonId = getProductBuyButtonId(currentProduct);
        
        // Render the buy button
        await renderStripeBuyButton('stripe-buy-button-container', buyButtonId);
        
        console.log('✅ Stripe Buy Button initialized for product:', currentProduct.name);
    } catch (error) {
        console.error('Failed to initialize Stripe Buy Button:', error);
        // The fallback button is already visible
    }
}

// Increase quantity
function increaseQuantity() {
    const quantityInput = document.getElementById('quantity');
    let quantity = parseInt(quantityInput.value);
    
    if (quantity < currentProduct.stock) {
        quantity++;
        quantityInput.value = quantity;
    } else {
        showNotification('Maximum stock reached', 'info');
    }
}

// Decrease quantity
function decreaseQuantity() {
    const quantityInput = document.getElementById('quantity');
    let quantity = parseInt(quantityInput.value);
    
    if (quantity > 1) {
        quantity--;
        quantityInput.value = quantity;
    }
}

// Add product to cart
function addProductToCart() {
    if (!selectedColor) {
        alert('Please select a color');
        return;
    }
    
    const quantity = parseInt(document.getElementById('quantity').value);
    
    if (quantity > currentProduct.stock) {
        alert('Quantity exceeds available stock');
        return;
    }
    
    addToCart(currentProduct, selectedColor, quantity);
    
    // Reset quantity to 1
    document.getElementById('quantity').value = 1;
}

// Initialize Apple Pay for quick buy
async function initializeProductApplePay() {
    try {
        // Initialize Stripe first
        const configResponse = await fetch('/api/stripe/config');
        const config = await configResponse.json();
        
        if (!config.publishableKey || config.publishableKey === 'pk_test_placeholder') {
            console.log('Stripe not configured - Apple Pay disabled');
            return;
        }
        
        stripe = Stripe(config.publishableKey);
        
        // Calculate total with tax
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const subtotal = currentProduct.price * quantity;
        const tax = subtotal * 0.13; // 13% HST for Canada
        const total = subtotal + tax;
        
        // Create payment request for single product
        productPaymentRequest = stripe.paymentRequest({
            country: 'CA',
            currency: 'cad',
            total: {
                label: currentProduct.name,
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
        
        // Check if Apple Pay is available
        const result = await productPaymentRequest.canMakePayment();
        
        if (result) {
            // Show Apple Pay button
            const applePayButton = document.getElementById('apple-pay-quick-buy');
            applePayButton.classList.remove('hidden');
            
            // Create and mount Apple Pay button
            const elements = stripe.elements();
            const prButton = elements.create('paymentRequestButton', {
                paymentRequest: productPaymentRequest,
                style: {
                    paymentRequestButton: {
                        type: 'buy',
                        theme: 'dark',
                        height: '48px',
                    },
                },
            });
            
            prButton.mount('#apple-pay-quick-buy');
            
            // Handle payment method received
            productPaymentRequest.on('paymentmethod', async (ev) => {
                await handleProductApplePayment(ev);
            });
            
            console.log('✅ Product Apple Pay initialized');
        }
    } catch (error) {
        console.error('Product Apple Pay initialization error:', error);
    }
}

// Handle Apple Pay payment for product
async function handleProductApplePayment(ev) {
    try {
        if (!selectedColor) {
            ev.complete('fail');
            alert('Please select a color first');
            return;
        }
        
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
        
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const subtotal = currentProduct.price * quantity;
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
                    product_id: currentProduct.id,
                    product_name: currentProduct.name,
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
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
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
        
        // Create order
        const commission = subtotal * 0.15;
        const sellerAmount = subtotal * 0.85;
        
        const order = {
            customer_email: customerEmail,
            customer_name: customerName,
            product_id: currentProduct.id,
            product_name: currentProduct.name,
            color: selectedColor,
            quantity: quantity,
            price: currentProduct.price,
            total: subtotal,
            seller_id: currentProduct.seller_id,
            commission: commission,
            seller_amount: sellerAmount,
            status: 'pending',
            shipping_address: formattedAddress,
            payment_intent_id: paymentIntentId,
            payment_status: 'paid'
        };
        
        MilloDB.create('orders', order);
        
        // Update stock
        const updatedStock = currentProduct.stock - quantity;
        MilloDB.update('products', currentProduct.id, { stock: updatedStock });
        
        // Send email notifications
        try {
            await fetch('/api/send-order-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ orderId: order.id })
            });
        } catch (emailError) {
            console.error('Failed to send email notifications:', emailError);
        }
        
        // Show success and redirect
        showNotification('Apple Pay payment successful!', 'success');
        setTimeout(() => {
            window.location.href = 'order-success.html';
        }, 1500);
        
    } catch (error) {
        console.error('Product Apple Pay payment error:', error);
        ev.complete('fail');
        alert('Payment failed: ' + error.message);
    }
}
