// Checkout Page
let stripe;
let cardElement;
let paymentRequest;

document.addEventListener('DOMContentLoaded', async function () {
    if (cart.length === 0) {
        alert('Your cart is empty');
        window.location.href = 'index.html';
        return;
    }

    // Load Stripe config from server
    let stripeConfigured = false;
    try {
        const configRes = await fetch('/api/stripe/config');
        const config = await configRes.json();

        if (config.configured && config.publishableKey) {
            stripe = Stripe(config.publishableKey);
            stripeConfigured = true;
            console.log('✅ Stripe initialized');
        } else {
            showStripeUnavailableWarning();
        }
    } catch (error) {
        console.error('Could not reach server for Stripe config:', error);
        showStripeUnavailableWarning();
    }

    if (stripeConfigured) {
        // Initialize Apple Pay
        await initializeApplePay();

        // Create card element
        const elements = stripe.elements();
        cardElement = elements.create('card', {
            style: {
                base: { fontSize: '16px', color: '#32325d', fontFamily: 'Poppins, sans-serif', '::placeholder': { color: '#aab7c4' } }
            }
        });
        cardElement.mount('#card-element');
        cardElement.on('change', function (event) {
            const el = document.getElementById('card-errors');
            if (el) el.textContent = event.error ? event.error.message : '';
        });
    }

    displayOrderSummary();

    // Pre-fill fields if logged in
    const user = MilloDB.getCurrentUser();
    if (user) {
        const nameEl = document.getElementById('customerName');
        const emailEl = document.getElementById('customerEmail');
        if (nameEl) nameEl.value = user.full_name || '';
        if (emailEl) emailEl.value = user.email || '';
    }

    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
});

function showStripeUnavailableWarning() {
    const cardSection = document.getElementById('card-element');
    if (cardSection) {
        cardSection.innerHTML = `<div class="p-4 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-sm">
            <strong>⚠️ Payment system not configured.</strong><br>
            Add your Stripe keys to the <code>.env</code> file on the server to enable card payments.
        </div>`;
    }
    const btn = document.getElementById('submitButton');
    if (btn) { btn.disabled = true; btn.textContent = 'Payment not configured'; }
}

// ── Apple Pay ─────────────────────────────────────────────────────────────────

async function initializeApplePay() {
    try {
        const subtotal = getCartTotal();
        const total = subtotal + subtotal * 0.13;

        paymentRequest = stripe.paymentRequest({
            country: 'CA', currency: 'cad',
            total: { label: 'millo Purchase', amount: Math.round(total * 100) },
            requestPayerName: true, requestPayerEmail: true, requestShipping: true,
            shippingOptions: [{ id: 'free-shipping', label: 'Free Shipping', detail: '5–7 business days', amount: 0 }]
        });

        const result = await paymentRequest.canMakePayment();
        if (result) {
            const applePayButton = document.getElementById('apple-pay-button');
            const paymentDivider = document.getElementById('payment-divider');
            if (applePayButton) applePayButton.classList.remove('hidden');
            if (paymentDivider) paymentDivider.classList.remove('hidden');

            const elements = stripe.elements();
            const prButton = elements.create('paymentRequestButton', {
                paymentRequest,
                style: { paymentRequestButton: { type: 'buy', theme: 'dark', height: '48px' } }
            });
            prButton.mount('#apple-pay-button');

            paymentRequest.on('paymentmethod', async (ev) => handleApplePayPayment(ev));
            console.log('✅ Apple Pay available');
        }
    } catch (error) {
        console.error('Apple Pay init error:', error);
    }
}

async function handleApplePayPayment(ev) {
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

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, { payment_method: ev.paymentMethod.id }, { handleActions: false });
        if (error || paymentIntent.status !== 'succeeded') { ev.complete('fail'); throw new Error(error?.message || 'Payment not completed'); }

        ev.complete('success');
        await processOrders(customerName, customerEmail, formattedAddress, paymentIntentId);
        clearCart();
        showNotification('Apple Pay payment successful!', 'success');
        setTimeout(() => window.location.href = 'order-success.html', 1500);

    } catch (error) {
        ev.complete('fail');
        alert('Payment failed: ' + error.message);
    }
}

// ── Order summary ─────────────────────────────────────────────────────────────

function displayOrderSummary() {
    const orderItems = document.getElementById('orderItems');
    if (orderItems) {
        orderItems.innerHTML = cart.map(item => {
            const img = item.product.images?.[0] || item.product.image_url || '';
            return `<div class="flex items-center space-x-3">
                <img src="${img}" alt="${item.product.name}" class="w-16 h-16 object-cover rounded"
                     onerror="this.src='https://via.placeholder.com/64?text=?'">
                <div class="flex-1">
                    <h4 class="font-semibold text-sm">${item.product.name}</h4>
                    <p class="text-xs text-gray-500">Color: ${item.color}</p>
                    <p class="text-xs text-gray-500">Qty: ${item.quantity}</p>
                </div>
                <span class="font-semibold">$${(item.product.price * item.quantity).toFixed(2)}</span>
            </div>`;
        }).join('');
    }

    const subtotal = getCartTotal();
    const tax = subtotal * 0.13;
    const total = subtotal + tax;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('subtotal', `$${subtotal.toFixed(2)}`);
    set('tax', `$${tax.toFixed(2)}`);
    set('total', `$${total.toFixed(2)} CAD`);
    set('checkoutTotal', `$${total.toFixed(2)}`);
}

// ── Checkout form ─────────────────────────────────────────────────────────────

async function handleCheckout(event) {
    event.preventDefault();
    if (!stripe || !cardElement) {
        alert('Payment system is not configured. Please contact the site owner.');
        return;
    }

    const submitButton = document.getElementById('submitButton');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing Payment...';

    try {
        const customerName = document.getElementById('customerName').value;
        const customerEmail = document.getElementById('customerEmail').value;
        const address = document.getElementById('address').value;
        const city = document.getElementById('city').value;
        const province = document.getElementById('province').value;
        const postalCode = document.getElementById('postalCode').value;
        const shippingAddress = `${address}, ${city}, ${province} ${postalCode}`;

        const subtotal = getCartTotal();
        const total = subtotal + subtotal * 0.13;

        const piRes = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total, currency: 'cad', metadata: { customer_name: customerName, customer_email: customerEmail, shipping_address: shippingAddress, order_count: cart.length } })
        });

        if (!piRes.ok) {
            const err = await piRes.json();
            throw new Error(err.error || 'Could not create payment');
        }

        const { clientSecret, paymentIntentId } = await piRes.json();

        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: { card: cardElement, billing_details: { name: customerName, email: customerEmail } }
        });

        if (error) throw new Error(error.message);
        if (paymentIntent.status !== 'succeeded') throw new Error('Payment not completed. Status: ' + paymentIntent.status);

        await processOrders(customerName, customerEmail, shippingAddress, paymentIntentId);
        clearCart();
        showNotification('Payment successful! Order placed.', 'success');
        setTimeout(() => window.location.href = 'order-success.html', 1500);

    } catch (error) {
        console.error('Checkout error:', error);
        alert('Payment failed: ' + error.message);
        submitButton.disabled = false;
        const total = document.getElementById('checkoutTotal')?.textContent || '';
        submitButton.innerHTML = `<i class="fas fa-lock mr-2"></i>Place Order — $${total} CAD`;
    }
}

// ── Order creation (after payment) ───────────────────────────────────────────

async function processOrders(customerName, customerEmail, shippingAddress, paymentIntentId) {
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
        } catch (_) { /* non-fatal */ }

        return created;
    }));
}
