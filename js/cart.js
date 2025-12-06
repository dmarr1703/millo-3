// Shopping Cart Management
let cart = [];

// Load cart from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    updateCartUI();
});

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('milloCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('milloCart', JSON.stringify(cart));
}

// Add item to cart
function addToCart(product, color, quantity = 1) {
    // Check if item already exists in cart
    const existingItem = cart.find(item => 
        item.product.id === product.id && item.color === color
    );
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            product: product,
            color: color,
            quantity: quantity
        });
    }
    
    saveCart();
    updateCartUI();
    showNotification('Added to cart!', 'success');
}

// Remove item from cart
function removeFromCart(productId, color) {
    cart = cart.filter(item => 
        !(item.product.id === productId && item.color === color)
    );
    
    saveCart();
    updateCartUI();
}

// Update item quantity
function updateCartQuantity(productId, color, quantity) {
    const item = cart.find(item => 
        item.product.id === productId && item.color === color
    );
    
    if (item) {
        if (quantity <= 0) {
            removeFromCart(productId, color);
        } else {
            item.quantity = quantity;
            saveCart();
            updateCartUI();
        }
    }
}

// Calculate cart total
function getCartTotal() {
    return cart.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
    }, 0);
}

// Update cart UI
function updateCartUI() {
    // Update cart count badge
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    
    // Update cart items display
    const cartItems = document.getElementById('cartItems');
    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="text-center text-gray-400 py-8">Your cart is empty</div>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="flex items-center space-x-4 border-b border-gray-800 pb-4">
                    <img src="${item.product.image_url}" alt="${item.product.name}" class="w-16 h-16 object-cover rounded border border-gray-800">
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm text-white">${item.product.name}</h4>
                        <p class="text-xs text-gray-400">Color: ${item.color}</p>
                        <p class="text-sm font-bold text-yellow-400">$${item.product.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="updateCartQuantity('${item.product.id}', '${item.color}', ${item.quantity - 1})" class="w-6 h-6 bg-gray-800 text-white rounded hover:bg-gray-700">-</button>
                        <span class="w-8 text-center text-white">${item.quantity}</span>
                        <button onclick="updateCartQuantity('${item.product.id}', '${item.color}', ${item.quantity + 1})" class="w-6 h-6 bg-gray-800 text-white rounded hover:bg-gray-700">+</button>
                    </div>
                    <button onclick="removeFromCart('${item.product.id}', '${item.color}')" class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    // Update cart total
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) {
        cartTotal.textContent = `$${getCartTotal().toFixed(2)} CAD`;
    }
}

// Toggle cart sidebar
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (sidebar) {
        sidebar.classList.toggle('translate-x-full');
    }
}

// Go to checkout
function goToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    window.location.href = 'checkout.html';
}

// Clear cart
function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
}
