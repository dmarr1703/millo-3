// Seller Dashboard
let seller = null;
let sellerProducts = [];
let sellerOrders = [];
let sellerSubscriptions = [];

document.addEventListener('DOMContentLoaded', function() {
    // Require seller authentication
    seller = requireAuth('seller');
    
    if (!seller) return;
    
    // Display seller name
    document.getElementById('sellerName').textContent = seller.full_name;
    
    // Load dashboard data
    loadDashboardData();
});

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

// Handle add product
async function handleAddProduct(event) {
    event.preventDefault();
    
    // Show payment confirmation first
    const confirmPayment = confirm(
        '⚠️ PRODUCT LISTING FEE REQUIRED ⚠️\n\n' +
        'To list this product on millo, you must pay a $25 CAD monthly subscription fee.\n\n' +
        'This fee covers:\n' +
        '• One product with all color variants\n' +
        '• Monthly recurring billing\n' +
        '• Platform hosting and visibility\n\n' +
        'Click OK to proceed to payment, or Cancel to go back.'
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
        const imageUrl = document.getElementById('productImage').value;
        
        const colors = colorsStr.split(',').map(c => c.trim()).filter(c => c);
        
        // Simulate payment processing (In production, integrate with Stripe)
        showNotification('Processing payment...', 'info');
        
        // TODO: Integrate real Stripe payment here
        // For now, we'll simulate payment success after 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const paymentSuccess = confirm(
            '💳 PAYMENT SIMULATION\n\n' +
            'In production, this would charge your card $25 CAD via Stripe.\n\n' +
            'Click OK to simulate successful payment and create product.'
        );
        
        if (!paymentSuccess) {
            showNotification('Payment cancelled', 'error');
            return;
        }
        
        // Create product with pending status until payment confirmed
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
            status: 'active',
            subscription_status: 'active',
            payment_confirmed: true,
            created_at: new Date().toISOString()
        };
        
        // Save product to localStorage database
        MilloDB.create('products', newProduct);
        
        // Create subscription after payment
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        
        const newSubscription = {
            id: 'sub-' + Date.now(),
            seller_id: seller.id,
            product_id: newProduct.id,
            amount: 25,
            status: 'active',
            payment_method: 'stripe', // In production, store actual Stripe payment method ID
            start_date: new Date().toISOString(),
            next_billing_date: nextBillingDate.toISOString(),
            created_at: new Date().toISOString()
        };
        
        // Save subscription to localStorage database
        MilloDB.create('subscriptions', newSubscription);
        
        showNotification('✅ Payment successful! Product added and live on marketplace.', 'success');
        closeAddProductModal();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product: ' + error.message);
    }
}

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
