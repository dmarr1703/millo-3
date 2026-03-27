// Shopping Cart Management
let cart = [];
let cartStripe = null;

document.addEventListener('DOMContentLoaded', async function () {
    loadCart();
    updateCartUI();
    // Initialize Apple Pay only if cart has items
    if (cart.length > 0) {
        await initializeCartApplePay();
    }
});

// ── Persistence ───────────────────────────────────────────────────────────────

function loadCart() {
    const saved = localStorage.getItem('milloCart');
    if (saved) {
        try { cart = JSON.parse(saved); } catch (_) { cart = []; }
    }
}

function saveCart() {
    localStorage.setItem('milloCart', JSON.stringify(cart));
}

// ── Cart operations ───────────────────────────────────────────────────────────

function addToCart(product, color, quantity = 1) {
    const existing = cart.find(item => item.product.id === product.id && item.color === color);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ product, color, quantity });
    }
    saveCart();
    updateCartUI();
    showNotification('Added to cart!', 'success');
}

function removeFromCart(productId, color) {
    cart = cart.filter(item => !(item.product.id === productId && item.color === color));
    saveCart();
    updateCartUI();
}

function updateCartQuantity(productId, color, quantity) {
    const item = cart.find(item => item.product.id === productId && item.color === color);
    if (item) {
        if (quantity <= 0) removeFromCart(productId, color);
        else { item.quantity = quantity; saveCart(); updateCartUI(); }
    }
}

function getCartTotal() {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
}

// ── UI ────────────────────────────────────────────────────────────────────────

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }

    const cartItems = document.getElementById('cartItems');
    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="text-center text-gray-400 py-8">Your cart is empty</div>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="flex items-center space-x-4 border-b border-gray-800 pb-4">
                    <img src="${item.product.image_url || (item.product.images && item.product.images[0])}"
                         alt="${item.product.name}" class="w-16 h-16 object-cover rounded border border-gray-800"
                         onerror="this.src='https://via.placeholder.com/64?text=?'">
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm text-white">${item.product.name}</h4>
                        <p class="text-xs text-gray-400">Color: ${item.color}</p>
                        <p class="text-sm font-bold text-yellow-400">$${item.product.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="updateCartQuantity('${item.product.id}','${item.color}',${item.quantity - 1})"
                            class="w-6 h-6 bg-gray-800 text-white rounded hover:bg-gray-700">-</button>
                        <span class="w-8 text-center text-white">${item.quantity}</span>
                        <button onclick="updateCartQuantity('${item.product.id}','${item.color}',${item.quantity + 1})"
                            class="w-6 h-6 bg-gray-800 text-white rounded hover:bg-gray-700">+</button>
                    </div>
                    <button onclick="removeFromCart('${item.product.id}','${item.color}')" class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`).join('');
        }
    }

    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) cartTotal.textContent = `$${getCartTotal().toFixed(2)} CAD`;
}

function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) sidebar.classList.toggle('translate-x-full');
}

function goToCheckout() {
    if (cart.length === 0) { alert('Your cart is empty'); return; }
    window.location.href = 'checkout.html';
}

// ── Apple Pay (cart sidebar) ──────────────────────────────────────────────────

async function initializeCartApplePay() {
    try {
        const configRes = await fetch('/api/stripe/config');
        const config = await configRes.json();
        if (!config.configured || !config.publishableKey) return;

        cartStripe = Stripe(config.publishableKey);
        const subtotal = getCartTotal();
        const total = subtotal + subtotal * 0.13;

        const cartPaymentRequest = cartStripe.paymentRequest({
            country: 'CA', currency: 'cad',
            total: { label: 'Cart Total', amount: Math.round(total * 100) },
            requestPayerName: true, requestPayerEmail: true, requestShipping: true,
            shippingOptions: [{ id: 'free', label: 'Free Shipping', detail: '5–7 business days', amount: 0 }]
        });

        const canPay = await cartPaymentRequest.canMakePayment();
        if (!canPay) return;

        const btn = document.getElementById('cart-apple-pay-button');
        if (!btn) return;
        btn.classList.remove('hidden');

        const elements = cartStripe.elements();
        const prButton = elements.create('paymentRequestButton', {
            paymentRequest: cartPaymentRequest,
            style: { paymentRequestButton: { type: 'buy', theme: 'dark', height: '48px' } }
        });
        prButton.mount('#cart-apple-pay-button');

        cartPaymentRequest.on('paymentmethod', async (ev) => {
            await handleCartApplePayment(ev);
        });
    } catch (error) {
        console.error('Cart Apple Pay error:', error);
    }
}

async function handleCartApplePayment(ev) {
    try {
        const addr = ev.shippingAddress;
        const customerName = ev.payerName || addr.recipient || 'Apple Pay Customer';
        const customerEmail = ev.payerEmail || MilloDB.getCurrentUser()?.email || '';
        const formattedAddress = [addr.addressLine?.[0], addr.city, addr.region, addr.postalCode, addr.country || 'CA'].filter(Boolean).join(', ');

        const subtotal = getCartTotal();
        const total = subtotal + subtotal * 0.13;

        const piRes = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total, currency: 'cad', metadata: { customer_name: customerName, customer_email: customerEmail, order_count: cart.length, payment_method: 'apple_pay' } })
        });

        if (!piRes.ok) { ev.complete('fail'); throw new Error((await piRes.json()).error); }
        const { clientSecret, paymentIntentId } = await piRes.json();

        const { error: confirmError, paymentIntent } = await cartStripe.confirmCardPayment(clientSecret, { payment_method: ev.paymentMethod.id }, { handleActions: false });
        if (confirmError || paymentIntent.status !== 'succeeded') { ev.complete('fail'); throw new Error(confirmError?.message || 'Payment failed'); }

        ev.complete('success');
        await processCartOrders(customerName, customerEmail, formattedAddress, paymentIntentId);
        clearCart();
        showNotification('Apple Pay payment successful!', 'success');
        setTimeout(() => window.location.href = 'order-success.html', 1500);

    } catch (error) {
        console.error('Cart Apple Pay error:', error);
        ev.complete('fail');
        alert('Payment failed: ' + error.message);
    }
}

async function processCartOrders(customerName, customerEmail, shippingAddress, paymentIntentId) {
    await Promise.all(cart.map(async item => {
        const subtotal = item.product.price * item.quantity;
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
            commission: subtotal * 0.15,
            seller_amount: subtotal * 0.85,
            status: 'pending',
            shipping_address: shippingAddress,
            payment_intent_id: paymentIntentId,
            payment_status: 'paid'
        };
        const created = await MilloDB.create('orders', order);
        await MilloDB.update('products', item.product.id, { stock: item.product.stock - item.quantity });
        try {
            await fetch('/api/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: created.id })
            });
        } catch (_) { /* email failure is non-fatal */ }
        return created;
    }));
}
