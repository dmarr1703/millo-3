// Products Management
let allProducts = [];
let filteredProducts = [];

// Load products on page load
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupFilters();
});

// Load products from localStorage database
async function loadProducts() {
    try {
        // Get products from localStorage database
        const products = MilloDB.getAll('products');
        
        // Filter only active products with active subscriptions
        allProducts = products.filter(p => p.status === 'active' && p.subscription_status === 'active');
        filteredProducts = [...allProducts];
        
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Display products in grid
function displayProducts() {
    const grid = document.getElementById('productsGrid');
    
    if (!grid) return;
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400">No products found</div>';
        return;
    }
    
    // Get current user to check ownership
    const currentUser = JSON.parse(localStorage.getItem('milloUser') || '{}');
    
    grid.innerHTML = filteredProducts.map(product => {
        const isOwner = currentUser.id === product.seller_id;
        
        return `
        <div class="product-card rounded-lg shadow-md overflow-hidden relative">
            <div class="relative h-64 bg-gray-900">
                <img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover">
                <span class="absolute top-2 right-2 px-3 py-1 bg-yellow-500 text-black text-sm rounded-full font-semibold">
                    ${product.category}
                </span>
                ${isOwner ? `
                <button 
                    onclick="deleteProduct('${product.id}', event)" 
                    class="absolute top-2 left-2 w-8 h-8 bg-red-600 text-white rounded-full hover:bg-red-700 transition flex items-center justify-center shadow-lg"
                    title="Delete product"
                >
                    <i class="fas fa-times"></i>
                </button>
                ` : ''}
            </div>
            <div class="p-4">
                <h4 class="text-lg font-semibold text-white mb-2">${product.name}</h4>
                <p class="text-gray-400 text-sm mb-3 line-clamp-2">${product.description}</p>
                <div class="mb-3">
                    <span class="text-xs text-gray-500 mb-1 block">Colors:</span>
                    <div class="flex flex-wrap">
                        ${product.colors.map(color => `
                            <span class="color-dot border border-gray-700" style="background-color: ${getColorHex(color)};" title="${color}"></span>
                        `).join('')}
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-2xl font-bold text-yellow-400">$${product.price.toFixed(2)}</span>
                    <button onclick="viewProduct('${product.id}')" class="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition font-semibold">
                        View Details
                    </button>
                </div>
                <div class="mt-2 text-xs text-gray-500">
                    <i class="fas fa-box"></i> Stock: ${product.stock}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Setup search and filter functionality
function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.description.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || product.category === category;
        
        return matchesSearch && matchesCategory;
    });
    
    displayProducts();
}

// View product details
function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// Get color hex code from color name
function getColorHex(colorName) {
    const colorMap = {
        'White': '#FFFFFF',
        'Black': '#000000',
        'Red': '#FF0000',
        'Blue': '#0000FF',
        'Navy': '#000080',
        'Green': '#00FF00',
        'Yellow': '#FFFF00',
        'Purple': '#800080',
        'Pink': '#FFC0CB',
        'Orange': '#FFA500',
        'Brown': '#8B4513',
        'Gray': '#808080',
        'Grey': '#808080',
        'Beige': '#F5F5DC',
        'Teal': '#008080',
        'Turquoise': '#40E0D0',
        'Coral': '#FF7F50',
        'Mint': '#98FF98'
    };
    
    return colorMap[colorName] || '#CCCCCC';
}

// Get product by ID
function getProductById(productId) {
    try {
        // Get product from localStorage database
        return MilloDB.getById('products', productId);
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

// Delete product (only for product owner)
async function deleteProduct(productId, event) {
    event.stopPropagation();
    event.preventDefault();
    
    const currentUser = JSON.parse(localStorage.getItem('milloUser') || '{}');
    
    if (!currentUser.id) {
        alert('You must be logged in to delete products');
        return;
    }
    
    const product = MilloDB.getById('products', productId);
    
    if (!product) {
        alert('Product not found');
        return;
    }
    
    if (product.seller_id !== currentUser.id && currentUser.role !== 'admin') {
        alert('You can only delete your own products');
        return;
    }
    
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
        try {
            // Delete the product
            MilloDB.delete('products', productId);
            
            // Delete associated subscription
            const subscriptions = MilloDB.getAll('subscriptions');
            const productSubscription = subscriptions.find(s => s.product_id === productId);
            if (productSubscription) {
                MilloDB.delete('subscriptions', productSubscription.id);
            }
            
            // Show success notification
            showNotification('Product deleted successfully', 'success');
            
            // Reload products
            await loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product. Please try again.');
        }
    }
}
