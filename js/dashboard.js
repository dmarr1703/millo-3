// Seller Dashboard
let seller = null;
let sellerProducts = [];
let sellerOrders = [];
let sellerSubscriptions = [];
let stripePublishableKey = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Require seller authentication
    seller = requireAuth('seller');
    
    if (!seller) return;
    
    // Display seller name
    document.getElementById('sellerName').textContent = seller.full_name;
    
    // Load Stripe publishable key from API
    await loadStripeConfig();
    
    // Load dashboard data
    loadDashboardData();
});

// Load Stripe configuration from server
async function loadStripeConfig() {
    try {
        const response = await fetch('/api/stripe/config');
        if (response.ok) {
            const config = await response.json();
            stripePublishableKey = config.publishableKey;
            console.log('Stripe configuration loaded successfully');
        } else {
            console.error('Failed to load Stripe configuration');
        }
    } catch (error) {
        console.error('Error loading Stripe configuration:', error);
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadSellerProducts(),
            loadSellerOrders(),
            loadSellerSubscriptions()
        ]);
        
        updateOverviewStats();
        renderSalesChart();
        displayRecentOrders();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load seller products
async function loadSellerProducts() {
    const products = MilloDB.getAll('products');
    sellerProducts = products.filter(p => p.seller_id === seller.id);
    displayProducts();
}

// Load seller orders
async function loadSellerOrders() {
    const orders = MilloDB.getAll('orders');
    sellerOrders = orders.filter(o => o.seller_id === seller.id);
    displayOrders();
}

// Load seller subscriptions
async function loadSellerSubscriptions() {
    const subscriptions = MilloDB.getAll('subscriptions');
    sellerSubscriptions = subscriptions.filter(s => s.seller_id === seller.id);
    displaySubscriptions();
}

// Update overview statistics
function updateOverviewStats() {
    document.getElementById('totalProducts').textContent = sellerProducts.length;
    document.getElementById('totalOrders').textContent = sellerOrders.length;
    
    const totalEarnings = sellerOrders.reduce((sum, order) => sum + (order.seller_amount || 0), 0);
    document.getElementById('totalEarnings').textContent = `$${totalEarnings.toFixed(2)}`;
    
    const activeSubscriptions = sellerSubscriptions.filter(s => s.status === 'active').length;
    document.getElementById('activeSubscriptions').textContent = activeSubscriptions;
}

// Render sales chart
function renderSalesChart() {
    const ctx = document.getElementById('salesChart');
    
    if (!ctx) return;
    
    // Prepare chart data
    const last7Days = [];
    const salesData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const daySales = sellerOrders
            .filter(o => o.created_at && o.created_at.startsWith(dateStr))
            .reduce((sum, o) => sum + (o.seller_amount || 0), 0);
        
        salesData.push(daySales);
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Earnings (CAD)',
                data: salesData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Display recent orders
function displayRecentOrders() {
    const recentOrders = sellerOrders.slice(0, 5);
    const container = document.getElementById('recentOrders');
    
    if (!container) return;
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No orders yet</p>';
        return;
    }
    
    container.innerHTML = recentOrders.map(order => `
        <div class="flex justify-between items-center border-b pb-2">
            <div>
                <p class="font-semibold">${order.product_name}</p>
                <p class="text-sm text-gray-500">${order.customer_name}</p>
            </div>
            <div class="text-right">
                <p class="font-semibold text-purple-600">$${order.seller_amount.toFixed(2)}</p>
                <span class="text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}">${order.status}</span>
            </div>
        </div>
    `).join('');
}

// Display products table
function displayProducts() {
    const table = document.getElementById('productsTable');
    
    if (!table) return;
    
    if (sellerProducts.length === 0) {
        table.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No products yet. Add your first product!</td></tr>';
        return;
    }
    
    table.innerHTML = sellerProducts.map(product => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                    <img src="${product.image_url}" alt="${product.name}" class="w-12 h-12 object-cover rounded">
                    <div>
                        <p class="font-semibold">${product.name}</p>
                        <p class="text-sm text-gray-500">${product.category}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 font-semibold">$${product.price.toFixed(2)}</td>
            <td class="px-6 py-4">${product.stock}</td>
            <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                    ${product.colors.slice(0, 3).map(color => `
                        <span class="text-xs px-2 py-1 bg-gray-100 rounded">${color}</span>
                    `).join('')}
                    ${product.colors.length > 3 ? `<span class="text-xs px-2 py-1 bg-gray-100 rounded">+${product.colors.length - 3}</span>` : ''}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.status}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="editProduct('${product.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="toggleProductStatus('${product.id}')" class="text-yellow-600 hover:text-yellow-800 mr-2" title="Toggle Status">
                    <i class="fas fa-toggle-on"></i>
                </button>
                <button onclick="deleteProduct('${product.id}')" class="text-red-600 hover:text-red-800" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Display orders table
function displayOrders() {
    const table = document.getElementById('ordersTable');
    
    if (!table) return;
    
    if (sellerOrders.length === 0) {
        table.innerHTML = '<tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">No orders yet</td></tr>';
        return;
    }
    
    table.innerHTML = sellerOrders.map(order => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-mono text-sm">${order.id.substr(-8)}</td>
            <td class="px-6 py-4">
                <div>
                    <p class="font-semibold">${order.customer_name}</p>
                    <p class="text-sm text-gray-500">${order.customer_email}</p>
                </div>
            </td>
            <td class="px-6 py-4">
                <p>${order.product_name}</p>
                <p class="text-sm text-gray-500">Color: ${order.color}</p>
            </td>
            <td class="px-6 py-4">${order.quantity}</td>
            <td class="px-6 py-4 font-semibold">$${order.total.toFixed(2)}</td>
            <td class="px-6 py-4 font-semibold text-green-600">$${order.seller_amount.toFixed(2)}</td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="updateOrderStatus('${order.id}')" class="text-blue-600 hover:text-blue-800" title="Update Status">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Display subscriptions table
function displaySubscriptions() {
    const table = document.getElementById('subscriptionsTable');
    
    if (!table) return;
    
    if (sellerSubscriptions.length === 0) {
        table.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No active subscriptions</td></tr>';
        return;
    }
    
    table.innerHTML = sellerSubscriptions.map(sub => {
        const product = sellerProducts.find(p => p.id === sub.product_id);
        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-4">${product ? product.name : 'Unknown Product'}</td>
                <td class="px-6 py-4 font-semibold">$${sub.amount.toFixed(2)} CAD</td>
                <td class="px-6 py-4">
                    <span class="text-xs px-2 py-1 rounded-full ${sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${sub.status}
                    </span>
                </td>
                <td class="px-6 py-4">${new Date(sub.start_date).toLocaleDateString()}</td>
                <td class="px-6 py-4">${new Date(sub.next_billing_date).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                    <button onclick="cancelSubscription('${sub.id}')" class="text-red-600 hover:text-red-800" title="Cancel">
                        <i class="fas fa-times-circle"></i> Cancel
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Get status color class
function getStatusColor(status) {
    const colors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'processing': 'bg-blue-100 text-blue-800',
        'shipped': 'bg-purple-100 text-purple-800',
        'delivered': 'bg-green-100 text-green-800',
        'completed': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// Switch tabs
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('[id$="Tab"]').forEach(tab => {
        tab.classList.remove('border-purple-600', 'text-purple-600');
        tab.classList.add('border-transparent', 'text-gray-600');
    });
    
    // Show selected tab content
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    
    // Add active class to selected tab
    const activeTab = document.getElementById(tabName + 'Tab');
    activeTab.classList.add('border-purple-600', 'text-purple-600');
    activeTab.classList.remove('border-transparent', 'text-gray-600');
}

// Show add product modal
function showAddProductModal() {
    document.getElementById('addProductModal').classList.remove('hidden');
}

// Close add product modal
function closeAddProductModal() {
    document.getElementById('addProductModal').classList.add('hidden');
    document.getElementById('addProductForm').reset();
}

// Handle add product with e-transfer payment
async function handleAddProduct(event) {
    event.preventDefault();
    
    // Show e-transfer payment information
    const confirmPayment = confirm(
        '⚠️ MONTHLY SUBSCRIPTION REQUIRED ⚠️\n\n' +
        'To post this product on millo, you MUST e-transfer $25 CAD to:\n\n' +
        '📧 Email: d.marr@live.ca\n' +
        '💰 Amount: $25 CAD\n' +
        '📅 Frequency: Monthly\n\n' +
        'This fee covers:\n' +
        '• One product with all color variants\n' +
        '• Monthly platform access\n' +
        '• Product hosting and visibility\n\n' +
        'After sending the e-transfer, you will need to provide the reference number for verification.\n\n' +
        'Click OK to proceed, or Cancel to go back.'
    );
    
    if (!confirmPayment) {
        return;
    }
    
    try {
        const name = document.getElementById('productName').value;
        const description = document.getElementById('productDescription').value;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const category = document.getElementById('productCategory').value;
        const colorsStr = document.getElementById('productColors').value;
        const imageFileInput = document.getElementById('productImage');
        
        const colors = colorsStr.split(',').map(c => c.trim()).filter(c => c);
        
        // Upload file first
        let imageUrl = '';
        if (imageFileInput.files && imageFileInput.files[0]) {
            showNotification('Uploading file...', 'info');
            const formData = new FormData();
            formData.append('file', imageFileInput.files[0]);
            
            const uploadResponse = await fetch('/api/upload-file', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('File upload failed');
            }
            
            const uploadData = await uploadResponse.json();
            imageUrl = uploadData.fileUrl;
        } else {
            throw new Error('Please select a file');
        }
        
        // Create product first (pending payment)
        const newProduct = {
            id: 'prod-' + Date.now(),
            seller_id: seller.id,
            name: name,
            description: description,
            price: price,
            colors: colors,
            image_url: imageUrl,
            category: category,
            stock: stock,
            status: 'pending', // Set to pending until payment confirmed
            subscription_status: 'pending',
            payment_confirmed: false,
            created_at: new Date().toISOString()
        };
        
        // Save product temporarily
        const productData = await fetch('/tables/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
        });
        
        if (!productData.ok) {
            throw new Error('Failed to create product');
        }
        
        const createdProduct = await productData.json();
        
        // Close the add product modal
        closeAddProductModal();
        
        // Show e-transfer payment modal
        showETransferModal(createdProduct);
        
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Failed to add product: ' + error.message, 'error');
    }
}

// Handle payment success on return
document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const subscriptionId = urlParams.get('subscription');
    const productId = urlParams.get('product');
    
    if (paymentStatus === 'success' && subscriptionId && productId) {
        try {
            // Confirm subscription and activate product
            const confirmResponse = await fetch('/api/confirm-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription_id: subscriptionId,
                    product_id: productId
                })
            });
            
            if (confirmResponse.ok) {
                // Update product status to active
                await fetch('/tables/products/' + productId, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'active',
                        subscription_status: 'active',
                        payment_confirmed: true
                    })
                });
                
                showNotification('✅ Payment successful! Your product is now live on the marketplace.', 'success');
                
                // Clean URL
                window.history.replaceState({}, document.title, '/dashboard.html');
                
                // Reload dashboard
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            showNotification('Payment successful but failed to activate product. Please contact support.', 'warning');
        }
    }
});

// Toggle product status
async function toggleProductStatus(productId) {
    const product = sellerProducts.find(p => p.id === productId);
    if (!product) return;
    
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    
    try {
        // Update product status in localStorage database
        MilloDB.update('products', productId, { status: newStatus });
        showNotification('Product status updated', 'success');
        await loadSellerProducts();
    } catch (error) {
        console.error('Error updating product:', error);
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This will also cancel its subscription.')) {
        return;
    }
    
    try {
        // Delete product from localStorage database
        MilloDB.delete('products', productId);
        
        // Cancel associated subscription
        const subscription = sellerSubscriptions.find(s => s.product_id === productId);
        if (subscription) {
            MilloDB.update('subscriptions', subscription.id, { status: 'cancelled' });
        }
        
        showNotification('Product deleted', 'success');
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
    }
}

// Update order status
async function updateOrderStatus(orderId) {
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'completed'];
    const order = sellerOrders.find(o => o.id === orderId);
    
    if (!order) return;
    
    const currentIndex = statuses.indexOf(order.status);
    const newStatus = statuses[Math.min(currentIndex + 1, statuses.length - 1)];
    
    try {
        // Update order status in localStorage database
        MilloDB.update('orders', orderId, { status: newStatus });
        showNotification('Order status updated', 'success');
        await loadSellerOrders();
        displayRecentOrders();
    } catch (error) {
        console.error('Error updating order:', error);
    }
}

// Cancel subscription
async function cancelSubscription(subscriptionId) {
    if (!confirm('Are you sure you want to cancel this subscription? Your product will be deactivated.')) {
        return;
    }
    
    try {
        const subscription = sellerSubscriptions.find(s => s.id === subscriptionId);
        
        // Cancel subscription in localStorage database
        MilloDB.update('subscriptions', subscriptionId, { status: 'cancelled' });
        
        // Deactivate product
        if (subscription) {
            MilloDB.update('products', subscription.product_id, { 
                subscription_status: 'expired', 
                status: 'inactive' 
            });
        }
        
        showNotification('Subscription cancelled', 'info');
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        alert('Failed to cancel subscription');
    }
}

// Edit product (placeholder for future implementation)
function editProduct(productId) {
    alert('Edit functionality coming soon! Product ID: ' + productId);
}

// Show e-transfer payment modal
function showETransferModal(product) {
    // Store product data temporarily
    sessionStorage.setItem('pendingProduct', JSON.stringify(product));
    
    // Create and show modal
    const modal = document.getElementById('etransferModal');
    if (modal) {
        // Update product name in modal
        document.getElementById('etransferProductName').textContent = product.name;
        modal.classList.remove('hidden');
    }
}

// Close e-transfer modal
function closeETransferModal() {
    const modal = document.getElementById('etransferModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('etransferForm').reset();
    }
}

// Handle e-transfer payment submission
async function handleETransferSubmit(event) {
    event.preventDefault();
    
    const referenceNumber = document.getElementById('etransferReference').value;
    const transferDate = document.getElementById('etransferDate').value;
    
    if (!referenceNumber || !transferDate) {
        showNotification('Please provide reference number and transfer date', 'error');
        return;
    }
    
    try {
        // Get pending product
        const productData = sessionStorage.getItem('pendingProduct');
        if (!productData) {
            throw new Error('Product data not found');
        }
        
        const product = JSON.parse(productData);
        
        // Submit e-transfer payment
        const response = await fetch('/api/etransfer/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                seller_id: seller.id,
                seller_email: seller.email,
                product_id: product.id,
                product_name: product.name,
                reference_number: referenceNumber,
                amount: 25,
                transfer_date: transferDate
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit payment');
        }
        
        const result = await response.json();
        
        // Clear pending product
        sessionStorage.removeItem('pendingProduct');
        
        // Close modal
        closeETransferModal();
        
        // Show success message
        showNotification(
            'Payment submitted successfully! Your product will be activated once the admin verifies your e-transfer.',
            'success'
        );
        
        // Reload dashboard after a delay
        setTimeout(() => {
            window.location.reload();
        }, 3000);
        
    } catch (error) {
        console.error('Error submitting e-transfer:', error);
        showNotification('Failed to submit payment: ' + error.message, 'error');
    }
}

// Cancel e-transfer and delete product
async function cancelETransfer() {
    if (!confirm('Are you sure? This will cancel the product creation.')) {
        return;
    }
    
    try {
        // Get pending product
        const productData = sessionStorage.getItem('pendingProduct');
        if (productData) {
            const product = JSON.parse(productData);
            
            // Delete the pending product
            await fetch('/tables/products/' + product.id, {
                method: 'DELETE'
            });
            
            // Clear session storage
            sessionStorage.removeItem('pendingProduct');
        }
        
        // Close modal
        closeETransferModal();
        
        showNotification('Product creation cancelled', 'info');
        
        // Reload dashboard
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Error cancelling product:', error);
        showNotification('Failed to cancel: ' + error.message, 'error');
    }
}
