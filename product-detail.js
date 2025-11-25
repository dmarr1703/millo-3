// Product Detail Page
let currentProduct = null;
let selectedColor = null;

// Load product on page load
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        loadProductDetail(productId);
    } else {
        window.location.href = 'index.html';
    }
});

// Load product details
async function loadProductDetail(productId) {
    try {
        const product = await getProductById(productId);
        
        if (!product) {
            alert('Product not found');
            window.location.href = 'index.html';
            return;
        }
        
        currentProduct = product;
        displayProductDetail();
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Error loading product');
    }
}

// Display product details
function displayProductDetail() {
    document.getElementById('productImage').src = currentProduct.image_url;
    document.getElementById('productImage').alt = currentProduct.name;
    document.getElementById('productName').textContent = currentProduct.name;
    document.getElementById('productDescription').textContent = currentProduct.description;
    document.getElementById('productPrice').textContent = `$${currentProduct.price.toFixed(2)}`;
    document.getElementById('productCategory').textContent = currentProduct.category;
    document.getElementById('stockCount').textContent = currentProduct.stock;
    
    // Display color options
    const colorOptions = document.getElementById('colorOptions');
    colorOptions.innerHTML = currentProduct.colors.map((color, index) => `
        <div class="text-center">
            <div class="color-option ${index === 0 ? 'selected' : ''}" 
                 style="background-color: ${getColorHex(color)};"
                 onclick="selectColor('${color}')"
                 title="${color}">
            </div>
            <p class="text-xs mt-1">${color}</p>
        </div>
    `).join('');
    
    // Select first color by default
    if (currentProduct.colors.length > 0) {
        selectedColor = currentProduct.colors[0];
        updateSelectedColorText();
    }
}

// Select color
function selectColor(color) {
    selectedColor = color;
    
    // Update UI
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach((option, index) => {
        if (currentProduct.colors[index] === color) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    updateSelectedColorText();
}

// Update selected color text
function updateSelectedColorText() {
    document.getElementById('selectedColorText').textContent = `Selected: ${selectedColor}`;
}

// Increase quantity
function increaseQuantity() {
    const quantityInput = document.getElementById('quantity');
    let quantity = parseInt(quantityInput.value);
    
    if (quantity < currentProduct.stock) {
        quantity++;
        quantityInput.value = quantity;
    } else {
        showNotification('Maximum stock reached', 'info');
    }
}

// Decrease quantity
function decreaseQuantity() {
    const quantityInput = document.getElementById('quantity');
    let quantity = parseInt(quantityInput.value);
    
    if (quantity > 1) {
        quantity--;
        quantityInput.value = quantity;
    }
}

// Add product to cart
function addProductToCart() {
    if (!selectedColor) {
        alert('Please select a color');
        return;
    }
    
    const quantity = parseInt(document.getElementById('quantity').value);
    
    if (quantity > currentProduct.stock) {
        alert('Quantity exceeds available stock');
        return;
    }
    
    addToCart(currentProduct, selectedColor, quantity);
    
    // Reset quantity to 1
    document.getElementById('quantity').value = 1;
}
