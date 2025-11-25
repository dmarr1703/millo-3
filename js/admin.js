// Admin Dashboard
let admin = null;
let allUsers = [];
let allProducts = [];
let allOrders = [];
let allSubscriptions = [];

document.addEventListener('DOMContentLoaded', function() {
    // Require admin authentication
    admin = requireAuth('admin');
    
    if (!admin) return;
    
    // Load dashboard data
    loadAdminData();
});

// Load all admin data
async function loadAdminData() {
    try {
        await Promise.all([
            loadUsers(),
            loadProducts(),
            loadOrders(),
            loadSubscriptions()
        ]);
        
        updateAnalytics();
        renderCommissionChart();
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// Load all users
async function loadUsers() {
    allUsers = MilloDB.getAll('users');
    displayUsers();
}

// Load all products
async function loadProducts() {
    allProducts = MilloDB.getAll('products');
    displayAllProducts();
}

// Load all orders
async function loadOrders() {
    allOrders = MilloDB.getAll('orders');
    displayAllOrders();
    displayCommissions();
}

// Load all subscriptions
async function loadSubscriptions() {
    allSubscriptions = MilloDB.getAll('subscriptions');
}

// Update analytics
function updateAnalytics() {
    // User stats
    document.getElementById('totalUsers').textContent = allUsers.length;
    const sellers = allUsers.filter(u => u.role === 'seller');
    document.getElementById('totalSellers').textContent = sellers.length;
    
    // Product stats
    document.getElementById('totalProducts').textContent = allProducts.length;
    const activeProducts = allProducts.filter(p => p.status === 'active');
    document.getElementById('activeProducts').textContent = activeProducts.length;
    
    // Order stats
    document.getElementById('totalOrders').textContent = allOrders.length;
    
    // Commission stats
    const totalCommission = allOrders.reduce((sum, order) => sum + (order.commission || 0), 0);
    document.getElementById('totalCommission').textContent = `$${totalCommission.toFixed(2)}`;
    
    // Subscription revenue
    const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active');
    document.getElementById('activeSubscriptionsCount').textContent = activeSubscriptions.length;
    const monthlyRevenue = activeSubscriptions.length * 25;
    document.getElementById('monthlySubscriptionRevenue').textContent = `$${monthlyRevenue.toFixed(2)}`;
    
    // Platform statistics
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    
    const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
    document.getElementById('avgOrderValue').textContent = `$${avgOrderValue.toFixed(2)}`;
}

// Render commission chart
function renderCommissionChart() {
    const ctx = document.getElementById('commissionChart');
    
    if (!ctx) return;
    
    // Prepare chart data for last 7 days
    const last7Days = [];
    const commissionData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const dayCommission = allOrders
            .filter(o => o.created_at && o.created_at.startsWith(dateStr))
            .reduce((sum, o) => sum + (o.commission || 0), 0);
        
        commissionData.push(dayCommission);
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Commission Revenue (CAD)',
                data: commissionData,
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: '#667eea',
                borderWidth: 1
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

// Display users table
function displayUsers() {
    const table = document.getElementById('usersTable');
    
    if (!table) return;
    
    table.innerHTML = allUsers.map(user => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-semibold">${user.full_name}</td>
            <td class="px-6 py-4">${user.email}</td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                }">
                    ${user.role}
                </span>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${user.status}
                </span>
            </td>
            <td class="px-6 py-4">${new Date(user.created_at).toLocaleDateString()}</td>
            <td class="px-6 py-4">
                <button onclick="toggleUserStatus('${user.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Toggle Status">
                    <i class="fas fa-toggle-on"></i>
                </button>
                ${user.role !== 'admin' ? `
                    <button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-800" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// Display all products table
function displayAllProducts() {
    const table = document.getElementById('allProductsTable');
    
    if (!table) return;
    
    table.innerHTML = allProducts.map(product => {
        const seller = allUsers.find(u => u.id === product.seller_id);
        return `
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
                <td class="px-6 py-4">${seller ? seller.full_name : 'Unknown'}</td>
                <td class="px-6 py-4 font-semibold">$${product.price.toFixed(2)}</td>
                <td class="px-6 py-4">${product.stock}</td>
                <td class="px-6 py-4">
                    <span class="text-xs px-2 py-1 rounded-full ${
                        product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }">
                        ${product.status}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <button onclick="viewProduct('${product.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="deleteProductAsAdmin('${product.id}')" class="text-red-600 hover:text-red-800" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Display all orders table
function displayAllOrders() {
    const table = document.getElementById('allOrdersTable');
    
    if (!table) return;
    
    table.innerHTML = allOrders.map(order => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-mono text-sm">${order.id.substr(-8)}</td>
            <td class="px-6 py-4">
                <div>
                    <p class="font-semibold">${order.customer_name}</p>
                    <p class="text-sm text-gray-500">${order.customer_email}</p>
                </div>
            </td>
            <td class="px-6 py-4">${order.product_name}</td>
            <td class="px-6 py-4 font-semibold">$${order.total.toFixed(2)}</td>
            <td class="px-6 py-4 font-semibold text-green-600">$${order.commission.toFixed(2)}</td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td class="px-6 py-4">${new Date(order.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// Display commission tracking
function displayCommissions() {
    // Today's commission
    const today = new Date().toISOString().split('T')[0];
    const todayCommission = allOrders
        .filter(o => o.created_at && o.created_at.startsWith(today))
        .reduce((sum, o) => sum + (o.commission || 0), 0);
    document.getElementById('todayCommission').textContent = `$${todayCommission.toFixed(2)}`;
    
    // This month's commission
    const thisMonth = new Date().toISOString().substr(0, 7);
    const monthCommission = allOrders
        .filter(o => o.created_at && o.created_at.startsWith(thisMonth))
        .reduce((sum, o) => sum + (o.commission || 0), 0);
    document.getElementById('monthCommission').textContent = `$${monthCommission.toFixed(2)}`;
    
    // All time commission
    const allTimeCommission = allOrders.reduce((sum, o) => sum + (o.commission || 0), 0);
    document.getElementById('allTimeCommission').textContent = `$${allTimeCommission.toFixed(2)}`;
    
    // Commission by seller
    const commissionBySeller = {};
    allOrders.forEach(order => {
        if (!commissionBySeller[order.seller_id]) {
            commissionBySeller[order.seller_id] = {
                totalSales: 0,
                commission: 0,
                orders: 0
            };
        }
        commissionBySeller[order.seller_id].totalSales += order.total || 0;
        commissionBySeller[order.seller_id].commission += order.commission || 0;
        commissionBySeller[order.seller_id].orders++;
    });
    
    const table = document.getElementById('commissionBySeller');
    if (table) {
        table.innerHTML = Object.keys(commissionBySeller).map(sellerId => {
            const seller = allUsers.find(u => u.id === sellerId);
            const data = commissionBySeller[sellerId];
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-6 py-4 font-semibold">${seller ? seller.full_name : 'Unknown'}</td>
                    <td class="px-6 py-4">$${data.totalSales.toFixed(2)}</td>
                    <td class="px-6 py-4 font-semibold text-green-600">$${data.commission.toFixed(2)}</td>
                    <td class="px-6 py-4">${data.orders}</td>
                </tr>
            `;
        }).join('');
    }
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

// Toggle user status
async function toggleUserStatus(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    
    try {
        // Update user status in localStorage database
        MilloDB.update('users', userId, { status: newStatus });
        showNotification(`User ${newStatus}`, 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Failed to update user status');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        // Delete user from localStorage database
        MilloDB.delete('users', userId);
        showNotification('User deleted', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
    }
}

// Delete product as admin
async function deleteProductAsAdmin(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        // Delete product from localStorage database
        MilloDB.delete('products', productId);
        showNotification('Product deleted', 'success');
        await loadProducts();
        await updateAnalytics();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
    }
}

// View product
function viewProduct(productId) {
    window.open(`product.html?id=${productId}`, '_blank');
}
