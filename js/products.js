// Products Management
let allProducts = [];
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', function () {
    loadProducts();
    setupFilters();
});

// Load products from server
async function loadProducts() {
    try {
        const products = await MilloDB.getAll('products');
        allProducts = products.filter(p => p.status === 'active' && p.subscription_status === 'active');
        filteredProducts = [...allProducts];
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        const grid = document.getElementById('productsGrid');
        if (grid) grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400">Unable to load products. Make sure the server is running.</div>';
    }
}

function displayProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400">No products found</div>';
        return;
    }

    const currentUser = MilloDB.getCurrentUser() || {};

    grid.innerHTML = filteredProducts.map(product => {
        const isOwner = currentUser.id === product.seller_id;
        const mainImage = (product.images && product.images.length > 0) ? product.images[0] : product.image_url;
        const imageCount = (product.images && product.images.length > 1) ? product.images.length : 0;

        return `
        <div class="product-card rounded-lg shadow-md overflow-hidden relative bg-gray-900">
            <div class="product-image-container relative">
                <img src="${mainImage}" alt="${product.name}" class="product-image" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'">
                <span class="absolute top-2 right-2 px-3 py-1 bg-yellow-500 text-black text-sm rounded-full font-semibold shadow-lg">
                    ${product.category}
                </span>
                ${imageCount > 0 ? `
                <span class="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded-full font-semibold">
                    <i class="fas fa-images"></i> ${imageCount + 1}
                </span>` : ''}
                ${isOwner ? `
                <button onclick="deleteProduct('${product.id}', event)"
                    class="absolute top-2 left-2 w-8 h-8 bg-red-600 text-white rounded-full hover:bg-red-700 transition flex items-center justify-center shadow-lg"
                    title="Delete product">
                    <i class="fas fa-times"></i>
                </button>` : ''}
            </div>
            <div class="p-4">
                <h4 class="text-lg font-semibold text-white mb-2">${product.name}</h4>
                <p class="text-gray-400 text-sm mb-3 line-clamp-2">${product.description}</p>
                <div class="mb-3">
                    <span class="text-xs text-gray-500 mb-1 block">Colors:</span>
                    <div class="flex flex-wrap">
                        ${(product.colors || []).map(color => `
                            <span class="color-dot border border-gray-700" style="background-color:${getColorHex(color)};" title="${color}"></span>
                        `).join('')}
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-2xl font-bold text-yellow-400">$${product.price.toFixed(2)}</span>
                    <button onclick="viewProduct('${product.id}')" class="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition font-semibold">
                        View Details
                    </button>
                </div>
                <div class="mt-2 text-xs text-gray-500"><i class="fas fa-box"></i> Stock: ${product.stock}</div>
            </div>
        </div>`;
    }).join('');
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
}

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

function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

async function getProductById(productId) {
    try {
        return await MilloDB.getById('products', productId);
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

async function deleteProduct(productId, event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }

    const currentUser = MilloDB.getCurrentUser();
    if (!currentUser) { alert('You must be logged in to delete products'); return; }

    const product = await MilloDB.getById('products', productId);
    if (!product) { alert('Product not found'); return; }

    if (product.seller_id !== currentUser.id && currentUser.role !== 'admin') {
        alert('You can only delete your own products');
        return;
    }

    if (!confirm(`Are you sure you want to delete "${product.name}"? This cannot be undone.`)) return;

    try {
        await MilloDB.delete('products', productId);

        // Cancel associated subscription
        try {
            const subs = await MilloDB.find('subscriptions', { product_id: productId });
            for (const sub of subs) {
                await MilloDB.update('subscriptions', sub.id, { status: 'cancelled' });
            }
        } catch (_) { /* subscriptions are optional */ }

        showNotification('Product deleted successfully', 'success');
        await loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
    }
}

function getColorHex(colorName) {
    const colorMap = {
        'White': '#FFFFFF', 'Black': '#000000', 'Red': '#FF0000', 'Blue': '#0000FF',
        'Navy': '#000080', 'Green': '#228B22', 'Yellow': '#FFD700', 'Purple': '#800080',
        'Pink': '#FFC0CB', 'Orange': '#FFA500', 'Brown': '#8B4513', 'Gray': '#808080',
        'Grey': '#808080', 'Beige': '#F5F5DC', 'Teal': '#008080', 'Turquoise': '#40E0D0',
        'Coral': '#FF7F50', 'Mint': '#98FF98'
    };
    return colorMap[colorName] || '#CCCCCC';
}
