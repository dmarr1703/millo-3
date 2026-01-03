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
    
    table.innerHTML = sellerProducts.map(product => {
        const mainImage = product.images && product.images.length > 0 
            ? product.images[0] 
            : product.image_url;
        return `
        <tr class="border-b border-gray-700 hover:bg-gray-800">
            <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                    <img src="${mainImage}" alt="${product.name}" class="w-12 h-12 object-cover rounded">
                    <div>
                        <p class="font-semibold text-gray-200">${product.name}</p>
                        <p class="text-sm text-gray-400">${product.category}</p>
                        ${product.images && product.images.length > 1 ? `<p class="text-xs text-purple-400">+${product.images.length - 1} more</p>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 font-semibold text-gray-200">$${product.price.toFixed(2)}</td>
            <td class="px-6 py-4 text-gray-300">${product.stock}</td>
            <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                    ${product.colors.slice(0, 3).map(color => `
                        <span class="text-xs px-2 py-1 bg-gray-700 text-gray-200 rounded">${color}</span>
                    `).join('')}
                    ${product.colors.length > 3 ? `<span class="text-xs px-2 py-1 bg-gray-700 text-gray-200 rounded">+${product.colors.length - 3}</span>` : ''}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${product.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
                    ${product.status}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="editProduct('${product.id}')" class="text-blue-400 hover:text-blue-300 mr-2" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="toggleProductStatus('${product.id}')" class="text-yellow-400 hover:text-yellow-300 mr-2" title="Toggle Status">
                    <i class="fas fa-toggle-on"></i>
                </button>
                <button onclick="deleteProduct('${product.id}')" class="text-red-400 hover:text-red-300" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');
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
        <tr class="border-b border-gray-700 hover:bg-gray-800">
            <td class="px-6 py-4 font-mono text-sm text-gray-300">${order.id.substr(-8)}</td>
            <td class="px-6 py-4">
                <div>
                    <p class="font-semibold text-gray-200">${order.customer_name}</p>
                    <p class="text-sm text-gray-400">${order.customer_email}</p>
                </div>
            </td>
            <td class="px-6 py-4">
                <p class="text-gray-200">${order.product_name}</p>
                <p class="text-sm text-gray-400">Color: ${order.color}</p>
            </td>
            <td class="px-6 py-4 text-gray-300">${order.quantity}</td>
            <td class="px-6 py-4 font-semibold text-gray-200">$${order.total.toFixed(2)}</td>
            <td class="px-6 py-4 font-semibold text-green-400">$${order.seller_amount.toFixed(2)}</td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="updateOrderStatus('${order.id}')" class="text-blue-400 hover:text-blue-300" title="Update Status">
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
            <tr class="border-b border-gray-700 hover:bg-gray-800">
                <td class="px-6 py-4 text-gray-200">${product ? product.name : 'Unknown Product'}</td>
                <td class="px-6 py-4 font-semibold text-gray-200">$${sub.amount.toFixed(2)} CAD</td>
                <td class="px-6 py-4">
                    <span class="text-xs px-2 py-1 rounded-full ${sub.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
                        ${sub.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-gray-300">${new Date(sub.start_date).toLocaleDateString()}</td>
                <td class="px-6 py-4 text-gray-300">${new Date(sub.next_billing_date).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                    <button onclick="cancelSubscription('${sub.id}')" class="text-red-400 hover:text-red-300" title="Cancel">
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
        'pending': 'bg-yellow-900 text-yellow-300',
        'processing': 'bg-blue-900 text-blue-300',
        'shipped': 'bg-purple-900 text-purple-300',
        'delivered': 'bg-green-900 text-green-300',
        'completed': 'bg-green-900 text-green-300',
        'cancelled': 'bg-red-900 text-red-300'
    };
    return colors[status] || 'bg-gray-800 text-gray-300';
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
        tab.classList.add('border-transparent', 'text-gray-400');
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
    // Clear image preview
    const previewContainer = document.getElementById('imagePreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.classList.add('hidden');
    }
}

// Preview selected images before upload
function previewImages(input) {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;
    
    // Clear previous previews
    previewContainer.innerHTML = '';
    
    if (input.files && input.files.length > 0) {
        previewContainer.classList.remove('hidden');
        
        // Validate and preview each file
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        Array.from(input.files).forEach((file, index) => {
            const reader = new FileReader();
            
            // Create preview element
            const previewDiv = document.createElement('div');
            previewDiv.className = 'relative rounded-lg overflow-hidden border-2 border-gray-700';
            
            // Check file validity
            const isValidType = allowedTypes.includes(file.type);
            const isValidSize = file.size <= maxFileSize;
            
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-24 object-cover';
                previewDiv.appendChild(img);
                
                // Add file info overlay
                const infoDiv = document.createElement('div');
                infoDiv.className = 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 text-xs text-white';
                
                if (!isValidType) {
                    infoDiv.className += ' bg-red-600';
                    infoDiv.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i>Invalid type';
                } else if (!isValidSize) {
                    infoDiv.className += ' bg-red-600';
                    infoDiv.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i>Too large (' + (file.size / 1024 / 1024).toFixed(1) + 'MB)';
                } else {
                    infoDiv.innerHTML = '<i class="fas fa-check-circle text-green-400 mr-1"></i>' + (file.size / 1024).toFixed(0) + 'KB';
                }
                
                previewDiv.appendChild(infoDiv);
            };
            
            reader.readAsDataURL(file);
            previewContainer.appendChild(previewDiv);
        });
        
        // Show count
        const countDiv = document.createElement('div');
        countDiv.className = 'col-span-3 text-center text-sm text-gray-400 mt-2';
        countDiv.innerHTML = '<i class="fas fa-images text-purple-400 mr-2"></i>' + input.files.length + ' image(s) selected';
        previewContainer.appendChild(countDiv);
    } else {
        previewContainer.classList.add('hidden');
    }
}

// Handle add product with automatic Stripe subscription
async function handleAddProduct(event) {
    event.preventDefault();
    
    try {
        const name = document.getElementById('productName').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const category = document.getElementById('productCategory').value;
        const colorsStr = document.getElementById('productColors').value.trim();
        const imageFileInput = document.getElementById('productImages'); // Changed to support multiple
        
        const colors = colorsStr.split(',').map(c => c.trim()).filter(c => c);
        
        // Validate inputs with detailed error messages
        if (!name) {
            showNotification('❌ Product name is required', 'error');
            return;
        }
        if (!description) {
            showNotification('❌ Product description is required', 'error');
            return;
        }
        if (!price || isNaN(price) || price <= 0) {
            showNotification('❌ Valid price is required (must be greater than 0)', 'error');
            return;
        }
        if (!stock || isNaN(stock) || stock < 0) {
            showNotification('❌ Valid stock quantity is required (must be 0 or greater)', 'error');
            return;
        }
        if (!category) {
            showNotification('❌ Product category is required', 'error');
            return;
        }
        if (colors.length === 0) {
            showNotification('❌ At least one color is required', 'error');
            return;
        }
        
        // Validate images are selected
        if (!imageFileInput.files || imageFileInput.files.length === 0) {
            showNotification('❌ Please select at least one product image', 'error');
            return;
        }
        
        // Validate file types and sizes
        const maxFileSize = 10 * 1024 * 1024; // 10MB per file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        for (let i = 0; i < imageFileInput.files.length; i++) {
            const file = imageFileInput.files[i];
            
            // Check file type
            if (!allowedTypes.includes(file.type)) {
                showNotification(`❌ Invalid file type for "${file.name}". Please use JPG, PNG, GIF, or WebP images.`, 'error');
                return;
            }
            
            // Check file size
            if (file.size > maxFileSize) {
                showNotification(`❌ File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB per file.`, 'error');
                return;
            }
        }
        
        // Upload multiple files
        let imageUrls = [];
        try {
            showNotification('📤 Uploading ' + imageFileInput.files.length + ' image(s)...', 'info');
            const formData = new FormData();
            
            // Add all files to FormData
            for (let i = 0; i < imageFileInput.files.length; i++) {
                formData.append('images', imageFileInput.files[i]);
            }
            
            const uploadResponse = await fetch('/api/upload-files', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }));
                throw new Error(errorData.error || 'File upload failed. Please try again.');
            }
            
            const uploadData = await uploadResponse.json();
            
            if (!uploadData.files || uploadData.files.length === 0) {
                throw new Error('No files were uploaded. Please try again.');
            }
            
            imageUrls = uploadData.files.map(f => f.fileUrl);
            showNotification('✅ Images uploaded successfully!', 'success');
            
        } catch (uploadError) {
            console.error('Image upload error:', uploadError);
            showNotification('❌ Image upload failed: ' + uploadError.message, 'error');
            return;
        }
        
        // Create product with all required information
        const newProduct = {
            id: 'prod-' + Date.now(),
            seller_id: seller.id,
            name: name,
            description: description,
            price: price,
            colors: colors,
            images: imageUrls, // Array of image URLs
            image_url: imageUrls[0], // Keep backward compatibility
            category: category,
            stock: stock,
            status: 'pending', // Pending until subscription payment
            subscription_status: 'pending',
            payment_confirmed: false,
            stripe_buy_button_id: 'buy_btn_1ShurIRwc1RkBb2PfGHUskTz', // Default Stripe Buy Button ID
            created_at: new Date().toISOString()
        };
        
        // Log product details for verification
        console.log('Creating new product with details:', {
            name: newProduct.name,
            description: newProduct.description,
            price: newProduct.price,
            category: newProduct.category,
            stock: newProduct.stock,
            colors: newProduct.colors,
            imageCount: newProduct.images.length
        });
        
        // Save product
        const productResponse = await fetch('/tables/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
        });
        
        if (!productResponse.ok) {
            throw new Error('Failed to create product');
        }
        
        const createdProduct = await productResponse.json();
        
        // Close add product modal
        closeAddProductModal();
        
        // Show e-transfer payment modal
        showNotification('✅ Product created! Now complete the payment to activate it.', 'success');
        showETransferModal(createdProduct);
        
        // Reload dashboard immediately to show the new product
        setTimeout(() => {
            loadDashboardData();
        }, 1500);
        
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
