/**
 * Stripe Buy Button Integration for millo
 * 
 * This module handles integration of Stripe Buy Buttons across the platform.
 * Each product can have its own Stripe Buy Button ID configured.
 * 
 * Usage:
 * 1. Create Buy Buttons in Stripe Dashboard (https://dashboard.stripe.com/test/products)
 * 2. Store the buy_button_id in product configuration
 * 3. Call renderStripeBuyButton() to display the button
 */

// Stripe publishable key - LIVE KEY (for production use)
const STRIPE_PUBLISHABLE_KEY = "pk_live_51Ndm3QRwc1RkBb2PSIWPn92BbDYkt33NLCly9ZDbrgtlyy57gzC8Q3K0ttC4D95MQOQA95fPPA03D9qGIXpGGkzH00Ih1IrhdK";

// Stripe Buy Button ID - This is the payment buy button that handles purchases
const DEFAULT_BUY_BUTTON_ID = "buy_btn_1ShurIRwc1RkBb2PfGHUskTz";

/**
 * Initialize Stripe Buy Button script if not already loaded
 */
function initializeStripeBuyButtonScript() {
    // Check if script already exists
    if (document.querySelector('script[src*="stripe.com/v3/buy-button.js"]')) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/buy-button.js';
        script.async = true;
        script.onload = () => {
            console.log('✅ Stripe Buy Button script loaded');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ Failed to load Stripe Buy Button script');
            reject(new Error('Failed to load Stripe Buy Button script'));
        };
        document.head.appendChild(script);
    });
}

/**
 * Render a Stripe Buy Button in the specified container
 * 
 * @param {string} containerId - ID of the container element
 * @param {string} buyButtonId - Stripe Buy Button ID (optional, uses default if not provided)
 * @param {string} publishableKey - Stripe publishable key (optional, uses default if not provided)
 * @returns {Promise<void>}
 */
async function renderStripeBuyButton(containerId, buyButtonId = null, publishableKey = null) {
    try {
        // Initialize script if needed
        await initializeStripeBuyButtonScript();

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID "${containerId}" not found`);
            return;
        }

        // Use provided values or defaults
        const buttonId = buyButtonId || DEFAULT_BUY_BUTTON_ID;
        const pubKey = publishableKey || STRIPE_PUBLISHABLE_KEY;

        // Create the Stripe Buy Button element
        const buyButton = document.createElement('stripe-buy-button');
        buyButton.setAttribute('buy-button-id', buttonId);
        buyButton.setAttribute('publishable-key', pubKey);

        // Clear container and add button
        container.innerHTML = '';
        container.appendChild(buyButton);

        console.log(`✅ Stripe Buy Button rendered in #${containerId}`);
    } catch (error) {
        console.error('Error rendering Stripe Buy Button:', error);
        // Fallback: show regular checkout button
        showFallbackCheckoutButton(containerId);
    }
}

/**
 * Show fallback checkout button if Stripe Buy Button fails
 */
function showFallbackCheckoutButton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <button onclick="addProductToCart()" 
                class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition">
            <i class="fas fa-shopping-cart mr-2"></i>
            Add to Cart (Checkout Available)
        </button>
    `;
}

/**
 * Get Buy Button ID for a specific product
 * This checks if the product has a custom buy_button_id stored
 * 
 * @param {Object} product - Product object
 * @returns {string} Buy Button ID
 */
function getProductBuyButtonId(product) {
    // Check if product has custom buy button ID
    if (product.stripe_buy_button_id) {
        return product.stripe_buy_button_id;
    }
    
    // Check if there's a mapping in localStorage
    const buyButtonMappings = JSON.parse(localStorage.getItem('stripe_buy_button_mappings') || '{}');
    if (buyButtonMappings[product.id]) {
        return buyButtonMappings[product.id];
    }
    
    // Return default
    return DEFAULT_BUY_BUTTON_ID;
}

/**
 * Save Buy Button ID mapping for a product
 * 
 * @param {string} productId - Product ID
 * @param {string} buyButtonId - Stripe Buy Button ID
 */
function saveProductBuyButtonMapping(productId, buyButtonId) {
    const buyButtonMappings = JSON.parse(localStorage.getItem('stripe_buy_button_mappings') || '{}');
    buyButtonMappings[productId] = buyButtonId;
    localStorage.setItem('stripe_buy_button_mappings', JSON.stringify(buyButtonMappings));
    console.log(`✅ Saved Buy Button mapping for product ${productId}: ${buyButtonId}`);
}

/**
 * Render Buy Button for product card in listings
 * 
 * @param {string} containerId - Container ID
 * @param {Object} product - Product object
 */
async function renderProductCardBuyButton(containerId, product) {
    const buyButtonId = getProductBuyButtonId(product);
    await renderStripeBuyButton(containerId, buyButtonId);
}

/**
 * Initialize Buy Buttons for all products on the page
 * Call this after products are loaded
 */
async function initializeAllBuyButtons() {
    const buyButtonContainers = document.querySelectorAll('[data-stripe-buy-button]');
    
    for (const container of buyButtonContainers) {
        const productId = container.getAttribute('data-product-id');
        const buyButtonId = container.getAttribute('data-buy-button-id') || DEFAULT_BUY_BUTTON_ID;
        
        try {
            await renderStripeBuyButton(container.id, buyButtonId);
        } catch (error) {
            console.error(`Failed to render buy button for product ${productId}:`, error);
        }
    }
}

/**
 * Create inline Buy Button HTML
 * Use this for dynamic content where you need the HTML string
 * 
 * @param {string} buyButtonId - Buy Button ID
 * @param {string} publishableKey - Publishable key
 * @returns {string} HTML string
 */
function createBuyButtonHTML(buyButtonId = DEFAULT_BUY_BUTTON_ID, publishableKey = STRIPE_PUBLISHABLE_KEY) {
    return `
        <script async src="https://js.stripe.com/v3/buy-button.js"></script>
        <stripe-buy-button
            buy-button-id="${buyButtonId}"
            publishable-key="${publishableKey}">
        </stripe-buy-button>
    `;
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeStripeBuyButtonScript,
        renderStripeBuyButton,
        renderProductCardBuyButton,
        getProductBuyButtonId,
        saveProductBuyButtonMapping,
        initializeAllBuyButtons,
        createBuyButtonHTML,
        STRIPE_PUBLISHABLE_KEY,
        DEFAULT_BUY_BUTTON_ID
    };
}
