// Seller Dashboard
let seller = null;
let sellerProducts = [];
let sellerOrders = [];
let sellerSubscriptions = [];

document.addEventListener('DOMContentLoaded', async function () {
    // Allow both seller AND admin to access the dashboard
    seller = requireAuth('seller,admin');
    if (!seller) return;

    document.getElementById('sellerName').textContent = seller.full_name;

    // Handle return from Stripe payment redirect
    await handlePaymentReturn();

    await loadDashboardData();
});

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadDashboardData() {
    try {
        await Promise.all([loadSellerProducts(), loadSellerOrders(), loadSellerSubscriptions()]);
        updateOverviewStats();
        renderSalesChart();
        displayRecentOrders();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadSellerProducts() {
    const products = await MilloDB.getAll('products');
    sellerProducts = products.filter(p => p.seller_id === seller.id);
    displayProducts();
}

async function loadSellerOrders() {
    const orders = await MilloDB.getAll('orders');
    sellerOrders = orders.filter(o => o.seller_id === seller.id);
    displayOrders();
}

async function loadSellerSubscriptions() {
    const subs = await MilloDB.getAll('subscriptions');
    sellerSubscriptions = subs.filter(s => s.seller_id === seller.id);
    displaySubscriptions();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function updateOverviewStats() {
    document.getElementById('totalProducts').textContent = sellerProducts.length;
    document.getElementById('totalOrders').textContent = sellerOrders.length;
    const earnings = sellerOrders.reduce((s, o) => s + (o.seller_amount || 0), 0);
    document.getElementById('totalEarnings').textContent = `$${earnings.toFixed(2)}`;
    const activeSubs = sellerSubscriptions.filter(s => s.status === 'active').length;
    document.getElementById('activeSubscriptions').textContent = activeSubs;
}

// ── Charts ────────────────────────────────────────────────────────────────────

function renderSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    const last7Days = [], salesData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        last7Days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        salesData.push(sellerOrders.filter(o => o.created_at?.startsWith(ds)).reduce((s, o) => s + (o.seller_amount || 0), 0));
    }
    new Chart(ctx, {
        type: 'line',
        data: { labels: last7Days, datasets: [{ label: 'Earnings (CAD)', data: salesData, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension: 0.4, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v } } } }
    });
}

// ── Display ───────────────────────────────────────────────────────────────────

function displayRecentOrders() {
    const container = document.getElementById('recentOrders');
    if (!container) return;
    const recent = sellerOrders.slice(0, 5);
    if (recent.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-4">No orders yet</p>'; return; }
    container.innerHTML = recent.map(o => `
        <div class="flex justify-between items-center border-b pb-2">
            <div><p class="font-semibold">${o.product_name}</p><p class="text-sm text-gray-500">${o.customer_name}</p></div>
            <div class="text-right">
                <p class="font-semibold text-purple-600">$${o.seller_amount.toFixed(2)}</p>
                <span class="text-xs px-2 py-1 rounded-full ${getStatusColor(o.status)}">${o.status}</span>
            </div>
        </div>`).join('');
}

function displayProducts() {
    const table = document.getElementById('productsTable');
    if (!table) return;
    if (sellerProducts.length === 0) { table.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No products yet. Add your first product!</td></tr>'; return; }
    table.innerHTML = sellerProducts.map(product => {
        const mainImage = (product.images?.length > 0) ? product.images[0] : product.image_url;
        const statusBadge = product.status === 'active'
            ? '<span class="text-xs px-2 py-1 rounded-full bg-green-900 text-green-300">active</span>'
            : product.status === 'pending'
                ? '<span class="text-xs px-2 py-1 rounded-full bg-yellow-900 text-yellow-300">pending payment</span>'
                : '<span class="text-xs px-2 py-1 rounded-full bg-red-900 text-red-300">inactive</span>';
        return `<tr class="border-b border-gray-700 hover:bg-gray-800">
            <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                    <img src="${mainImage}" alt="${product.name}" class="w-12 h-12 object-cover rounded"
                         onerror="this.src='https://via.placeholder.com/48?text=?'">
                    <div>
                        <p class="font-semibold text-gray-200">${product.name}</p>
                        <p class="text-sm text-gray-400">${product.category}</p>
                        ${product.images?.length > 1 ? `<p class="text-xs text-purple-400">+${product.images.length - 1} more photos</p>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 font-semibold text-gray-200">$${product.price.toFixed(2)}</td>
            <td class="px-6 py-4 text-gray-300">${product.stock}</td>
            <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                    ${product.colors.slice(0, 3).map(c => `<span class="text-xs px-2 py-1 bg-gray-700 text-gray-200 rounded">${c}</span>`).join('')}
                    ${product.colors.length > 3 ? `<span class="text-xs px-2 py-1 bg-gray-700 text-gray-200 rounded">+${product.colors.length - 3}</span>` : ''}
                </div>
            </td>
            <td class="px-6 py-4">${statusBadge}</td>
            <td class="px-6 py-4">
                <button onclick="editProduct('${product.id}')" class="text-blue-400 hover:text-blue-300 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                <button onclick="toggleProductStatus('${product.id}')" class="text-yellow-400 hover:text-yellow-300 mr-2" title="Toggle Status"><i class="fas fa-toggle-on"></i></button>
                <button onclick="deleteProduct('${product.id}')" class="text-red-400 hover:text-red-300" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function displayOrders() {
    const table = document.getElementById('ordersTable');
    if (!table) return;
    if (sellerOrders.length === 0) { table.innerHTML = '<tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">No orders yet</td></tr>'; return; }
    table.innerHTML = sellerOrders.map(o => `
        <tr class="border-b border-gray-700 hover:bg-gray-800">
            <td class="px-6 py-4 font-mono text-sm text-gray-300">${o.id.substr(-8)}</td>
            <td class="px-6 py-4"><p class="font-semibold text-gray-200">${o.customer_name}</p><p class="text-sm text-gray-400">${o.customer_email}</p></td>
            <td class="px-6 py-4"><p class="text-gray-200">${o.product_name}</p><p class="text-sm text-gray-400">Color: ${o.color}</p></td>
            <td class="px-6 py-4 text-gray-300">${o.quantity}</td>
            <td class="px-6 py-4 font-semibold text-gray-200">$${o.total.toFixed(2)}</td>
            <td class="px-6 py-4 font-semibold text-green-400">$${o.seller_amount.toFixed(2)}</td>
            <td class="px-6 py-4"><span class="text-xs px-2 py-1 rounded-full ${getStatusColor(o.status)}">${o.status}</span></td>
            <td class="px-6 py-4"><button onclick="updateOrderStatus('${o.id}')" class="text-blue-400 hover:text-blue-300" title="Update Status"><i class="fas fa-edit"></i></button></td>
        </tr>`).join('');
}

function displaySubscriptions() {
    const table = document.getElementById('subscriptionsTable');
    if (!table) return;
    if (sellerSubscriptions.length === 0) { table.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No active subscriptions</td></tr>'; return; }
    table.innerHTML = sellerSubscriptions.map(sub => {
        const product = sellerProducts.find(p => p.id === sub.product_id);
        return `<tr class="border-b border-gray-700 hover:bg-gray-800">
            <td class="px-6 py-4 text-gray-200">${product ? product.name : 'Unknown Product'}</td>
            <td class="px-6 py-4 font-semibold text-gray-200">$${sub.amount.toFixed(2)} CAD</td>
            <td class="px-6 py-4"><span class="text-xs px-2 py-1 rounded-full ${sub.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">${sub.status}</span></td>
            <td class="px-6 py-4 text-gray-300">${new Date(sub.start_date).toLocaleDateString()}</td>
            <td class="px-6 py-4 text-gray-300">${new Date(sub.next_billing_date).toLocaleDateString()}</td>
            <td class="px-6 py-4"><button onclick="cancelSubscription('${sub.id}')" class="text-red-400 hover:text-red-300"><i class="fas fa-times-circle"></i> Cancel</button></td>
        </tr>`;
    }).join('');
}

// ── Actions ───────────────────────────────────────────────────────────────────

function getStatusColor(status) {
    return { pending: 'bg-yellow-900 text-yellow-300', processing: 'bg-blue-900 text-blue-300', shipped: 'bg-purple-900 text-purple-300', delivered: 'bg-green-900 text-green-300', completed: 'bg-green-900 text-green-300', cancelled: 'bg-red-900 text-red-300' }[status] || 'bg-gray-800 text-gray-300';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('[id$="Tab"]').forEach(t => { t.classList.remove('border-purple-600', 'text-purple-600'); t.classList.add('border-transparent', 'text-gray-400'); });
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    const activeTab = document.getElementById(tabName + 'Tab');
    activeTab.classList.add('border-purple-600', 'text-purple-600');
    activeTab.classList.remove('border-transparent', 'text-gray-400');
}

// ── Add product ───────────────────────────────────────────────────────────────

function showAddProductModal() {
    document.getElementById('addProductModal').classList.remove('hidden');
}

function closeAddProductModal() {
    document.getElementById('addProductModal').classList.add('hidden');
    document.getElementById('addProductForm').reset();
    const preview = document.getElementById('imagePreview');
    if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
}

function previewImages(input) {
    const container = document.getElementById('imagePreview');
    if (!container) return;
    container.innerHTML = '';
    if (!input.files?.length) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    Array.from(input.files).forEach(file => {
        const div = document.createElement('div');
        div.className = 'relative rounded-lg overflow-hidden border-2 border-gray-700';
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.createElement('img');
            img.src = e.target.result; img.className = 'w-full h-24 object-cover';
            div.appendChild(img);
            const info = document.createElement('div');
            info.className = 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 text-xs text-white';
            const valid = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'].includes(file.type) && file.size <= 10*1024*1024;
            info.innerHTML = valid ? `<i class="fas fa-check-circle text-green-400 mr-1"></i>${(file.size/1024).toFixed(0)}KB` : '<i class="fas fa-exclamation-triangle mr-1"></i>Invalid';
            if (!valid) info.className += ' bg-red-600';
            div.appendChild(info);
        };
        reader.readAsDataURL(file);
        container.appendChild(div);
    });
    const count = document.createElement('div');
    count.className = 'col-span-3 text-center text-sm text-gray-400 mt-2';
    count.innerHTML = `<i class="fas fa-images text-purple-400 mr-2"></i>${input.files.length} image(s) selected`;
    container.appendChild(count);
}

async function handleAddProduct(event) {
    event.preventDefault();
    try {
        const name = document.getElementById('productName').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        const priceRaw = document.getElementById('productPrice').value.trim();
        const stockRaw = document.getElementById('productStock').value.trim();
        const price = parseFloat(priceRaw);
        const stock = parseInt(stockRaw, 10);
        const category = document.getElementById('productCategory').value;
        const colorsStr = document.getElementById('productColors').value.trim();
        const colors = colorsStr.split(',').map(c => c.trim()).filter(Boolean);
        const imageInput = document.getElementById('productImages');

        if (!name) { showNotification('❌ Product name is required', 'error'); return; }
        if (!description) { showNotification('❌ Product description is required', 'error'); return; }
        if (!priceRaw || isNaN(price) || price <= 0) { showNotification('❌ Please enter a valid price greater than 0', 'error'); return; }
        if (stockRaw === '' || isNaN(stock) || stock < 0) { showNotification('❌ Please enter a valid stock quantity (0 or more)', 'error'); return; }
        if (!category) { showNotification('❌ Category is required', 'error'); return; }
        if (colors.length === 0) { showNotification('❌ At least one color is required', 'error'); return; }
        if (!imageInput.files?.length) { showNotification('❌ Please select at least one product image', 'error'); return; }

        // Validate files
        const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
        for (const file of imageInput.files) {
            if (!allowed.includes(file.type)) { showNotification(`❌ Invalid file type: ${file.name}`, 'error'); return; }
            if (file.size > 10*1024*1024) { showNotification(`❌ File too large: ${file.name}`, 'error'); return; }
        }

        // Upload images
        showNotification(`📤 Uploading ${imageInput.files.length} image(s)…`, 'info');
        const formData = new FormData();
        for (const file of imageInput.files) formData.append('images', file);

        // Pass auth headers for upload (but NOT Content-Type — browser sets multipart boundary)
        const uploadRes = await fetch('/api/upload-files', {
            method: 'POST',
            headers: MilloDB.authHeadersForUpload(),
            body: formData
        });
        if (!uploadRes.ok) { const e = await uploadRes.json(); throw new Error(e.error || 'Upload failed'); }
        const uploadData = await uploadRes.json();
        if (!uploadData.files?.length) throw new Error('No files uploaded');

        const imageUrls = uploadData.files.map(f => f.fileUrl);
        showNotification('✅ Images uploaded!', 'success');

        // Build product — owner/admin gets immediate activation
        const isFree = seller.is_owner || seller.payment_exempt || seller.role === 'admin';
        const newProduct = {
            seller_id: seller.id,
            name, description, price, colors,
            images: imageUrls,
            image_url: imageUrls[0],
            category, stock,
            status: isFree ? 'active' : 'pending',
            subscription_status: isFree ? 'active' : 'pending',
            payment_confirmed: isFree,
            payment_exempt: isFree
        };

        const created = await MilloDB.create('products', newProduct);
        closeAddProductModal();

        if (isFree) {
            showNotification('✅ Product created and activated!', 'success');
        } else {
            showNotification('✅ Product created! Complete the payment to activate it.', 'success');
            showETransferModal(created);
        }

        setTimeout(() => loadDashboardData(), 1000);

    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Failed to add product: ' + error.message, 'error');
    }
}

// ── Edit product ──────────────────────────────────────────────────────────────

function editProduct(productId) {
    const product = sellerProducts.find(p => p.id === productId);
    if (!product) return;

    // Populate edit modal fields
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductDescription').value = product.description;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductStock').value = product.stock;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductColors').value = product.colors.join(', ');

    document.getElementById('editProductModal').classList.remove('hidden');
}

function closeEditProductModal() {
    document.getElementById('editProductModal').classList.add('hidden');
    document.getElementById('editProductForm').reset();
}

async function handleEditProduct(event) {
    event.preventDefault();
    try {
        const id = document.getElementById('editProductId').value;
        const name = document.getElementById('editProductName').value.trim();
        const description = document.getElementById('editProductDescription').value.trim();
        const priceRaw = document.getElementById('editProductPrice').value.trim();
        const stockRaw = document.getElementById('editProductStock').value.trim();
        const price = parseFloat(priceRaw);
        const stock = parseInt(stockRaw, 10);
        const category = document.getElementById('editProductCategory').value;
        const colors = document.getElementById('editProductColors').value.split(',').map(c => c.trim()).filter(Boolean);

        if (!name) { showNotification('❌ Product name is required', 'error'); return; }
        if (!description) { showNotification('❌ Description is required', 'error'); return; }
        if (!priceRaw || isNaN(price) || price <= 0) { showNotification('❌ Please enter a valid price greater than 0', 'error'); return; }
        if (stockRaw === '' || isNaN(stock) || stock < 0) { showNotification('❌ Please enter a valid stock quantity (0 or more)', 'error'); return; }
        if (!category) { showNotification('❌ Category is required', 'error'); return; }
        if (colors.length === 0) { showNotification('❌ At least one color is required', 'error'); return; }

        await MilloDB.update('products', id, { name, description, price, stock, category, colors });
        closeEditProductModal();
        showNotification('✅ Product updated successfully', 'success');
        await loadSellerProducts();

    } catch (error) {
        console.error('Error editing product:', error);
        showNotification('Failed to update product: ' + error.message, 'error');
    }
}

// ── Toggle / Delete / Cancel ──────────────────────────────────────────────────

async function toggleProductStatus(productId) {
    const product = sellerProducts.find(p => p.id === productId);
    if (!product) return;
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
        await MilloDB.update('products', productId, { status: newStatus });
        showNotification('Product status updated', 'success');
        await loadSellerProducts();
    } catch (error) {
        console.error('Error updating product:', error);
        showNotification('Failed to update status', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product? This will also cancel its subscription.')) return;
    try {
        await MilloDB.delete('products', productId);
        const sub = sellerSubscriptions.find(s => s.product_id === productId);
        if (sub) await MilloDB.update('subscriptions', sub.id, { status: 'cancelled' });
        showNotification('Product deleted', 'success');
        await loadDashboardData();
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Failed to delete product', 'error');
    }
}

async function updateOrderStatus(orderId) {
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'completed'];
    const order = sellerOrders.find(o => o.id === orderId);
    if (!order) return;
    const nextStatus = statuses[Math.min(statuses.indexOf(order.status) + 1, statuses.length - 1)];
    try {
        await MilloDB.update('orders', orderId, { status: nextStatus });
        showNotification(`Order status → ${nextStatus}`, 'success');
        await loadSellerOrders();
        displayRecentOrders();
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Failed to update order', 'error');
    }
}

async function cancelSubscription(subscriptionId) {
    if (!confirm('Cancel this subscription? Your product will be deactivated.')) return;
    try {
        const sub = sellerSubscriptions.find(s => s.id === subscriptionId);
        await MilloDB.update('subscriptions', subscriptionId, { status: 'cancelled' });
        if (sub) await MilloDB.update('products', sub.product_id, { subscription_status: 'expired', status: 'inactive' });
        showNotification('Subscription cancelled', 'info');
        await loadDashboardData();
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        showNotification('Failed to cancel subscription', 'error');
    }
}

// ── E-Transfer modal ──────────────────────────────────────────────────────────

function showETransferModal(product) {
    sessionStorage.setItem('pendingProduct', JSON.stringify(product));
    const modal = document.getElementById('etransferModal');
    if (modal) {
        const nameEl = document.getElementById('etransferProductName');
        if (nameEl) nameEl.textContent = product.name;
        modal.classList.remove('hidden');
    }
}

function closeETransferModal() {
    const modal = document.getElementById('etransferModal');
    if (modal) { modal.classList.add('hidden'); }
    const form = document.getElementById('etransferForm');
    if (form) form.reset();
}

async function handleETransferSubmit(event) {
    event.preventDefault();
    const referenceNumber = document.getElementById('etransferReference').value;
    const transferDate = document.getElementById('etransferDate').value;
    if (!referenceNumber || !transferDate) { showNotification('Please provide reference number and date', 'error'); return; }

    try {
        const product = JSON.parse(sessionStorage.getItem('pendingProduct') || '{}');
        if (!product.id) throw new Error('Product data not found');

        const res = await fetch('/api/etransfer/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seller_id: seller.id, seller_email: seller.email, product_id: product.id, product_name: product.name, reference_number: referenceNumber, amount: 25, transfer_date: transferDate })
        });

        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Submission failed'); }

        sessionStorage.removeItem('pendingProduct');
        closeETransferModal();
        showNotification('Payment submitted! Product will be activated after admin approval.', 'success');
        setTimeout(() => loadDashboardData(), 2000);

    } catch (error) {
        console.error('E-transfer error:', error);
        showNotification('Failed: ' + error.message, 'error');
    }
}

async function cancelETransfer() {
    if (!confirm('Cancel? This will delete the product.')) return;
    try {
        const product = JSON.parse(sessionStorage.getItem('pendingProduct') || '{}');
        if (product.id) {
            await MilloDB.delete('products', product.id);
            sessionStorage.removeItem('pendingProduct');
        }
        closeETransferModal();
        showNotification('Product creation cancelled', 'info');
        setTimeout(() => loadDashboardData(), 1000);
    } catch (error) {
        showNotification('Failed to cancel: ' + error.message, 'error');
    }
}

// ── Payment return handler ────────────────────────────────────────────────────

async function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const subscriptionId = params.get('subscription');
    const productId = params.get('product');

    if (paymentStatus === 'success' && subscriptionId && productId) {
        try {
            const res = await fetch('/api/confirm-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription_id: subscriptionId, product_id: productId })
            });
            if (res.ok) {
                await MilloDB.update('products', productId, { status: 'active', subscription_status: 'active', payment_confirmed: true });
                showNotification('✅ Payment confirmed! Your product is now live.', 'success');
                window.history.replaceState({}, document.title, '/dashboard.html');
            }
        } catch (error) {
            console.error('Payment confirmation error:', error);
        }
    }
}
