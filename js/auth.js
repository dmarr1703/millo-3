// Authentication System
let currentUser = null;
let isLoginMode = true;

// ── Initialise ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    checkAuthStatus();
});

function checkAuthStatus() {
    const userData = localStorage.getItem('milloUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUIForLoggedInUser();
    }
}

function updateUIForLoggedInUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    if (authButtons) authButtons.classList.add('hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    if (userName) userName.textContent = currentUser.full_name;
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

function showLogin() {
    isLoginMode = true;
    document.getElementById('authTitle').textContent = 'Login';
    document.getElementById('nameField').classList.add('hidden');
    document.getElementById('roleField').classList.add('hidden');
    document.getElementById('authButtonText').textContent = 'Login';
    document.getElementById('authToggle').textContent = "Don't have an account? Sign up";
    document.getElementById('authModal').classList.remove('hidden');
}

function showSignup() {
    isLoginMode = false;
    document.getElementById('authTitle').textContent = 'Sign Up';
    document.getElementById('nameField').classList.remove('hidden');
    document.getElementById('roleField').classList.remove('hidden');
    document.getElementById('authButtonText').textContent = 'Sign Up';
    document.getElementById('authToggle').textContent = 'Already have an account? Login';
    document.getElementById('authModal').classList.remove('hidden');
}

function showSignupAsSeller() {
    closeSellerModal();
    showSignup();
    const roleEl = document.getElementById('role');
    if (roleEl) roleEl.value = 'seller';
}

function toggleAuthMode() {
    if (isLoginMode) showSignup(); else showLogin();
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('authForm').reset();
}

// ── Auth handlers ─────────────────────────────────────────────────────────────

async function handleAuth(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (isLoginMode) {
        await login(email, password);
    } else {
        const fullName = document.getElementById('fullName').value.trim();
        const role = document.getElementById('role').value;
        await signup(email, password, fullName, role);
    }
}

async function login(email, password) {
    try {
        const user = await MilloDB.login(email, password);
        currentUser = user;
        updateUIForLoggedInUser();
        closeAuthModal();
        showNotification('Login successful!', 'success');
        if (user.role === 'admin') {
            setTimeout(() => window.location.href = 'admin.html', 1000);
        } else if (user.role === 'seller') {
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message || 'Login failed. Please try again.');
    }
}

async function signup(email, password, fullName, role) {
    try {
        const user = await MilloDB.signup(email, password, fullName, role);
        currentUser = user;
        updateUIForLoggedInUser();
        closeAuthModal();
        showNotification('Account created successfully!', 'success');
        if (user.role === 'admin' || user.role === 'seller') {
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert(error.message || 'Signup failed. Please try again.');
    }
}

function logout() {
    MilloDB.logout();
    currentUser = null;
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    if (authButtons) authButtons.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
    showNotification('Logged out successfully', 'info');
    if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('admin')) {
        setTimeout(() => window.location.href = 'index.html', 1000);
    }
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function (event) {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && !userMenu.contains(event.target) && dropdown) {
        dropdown.classList.add('hidden');
    }
});

// ── Seller modal ──────────────────────────────────────────────────────────────

function showSellerInfo() {
    const m = document.getElementById('sellerModal');
    if (m) m.classList.remove('hidden');
}

function closeSellerModal() {
    const m = document.getElementById('sellerModal');
    if (m) m.classList.add('hidden');
}

// ── Notifications ─────────────────────────────────────────────────────────────

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error'   ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3500);
}

// ── Route guard ───────────────────────────────────────────────────────────────

/**
 * requireAuth — redirect to index.html if user is not logged in.
 * Accepts a comma-separated string of allowed roles, e.g. 'seller,admin'.
 */
function requireAuth(requiredRole = null) {
    const userData = localStorage.getItem('milloUser');
    if (!userData) {
        window.location.href = 'index.html';
        return null;
    }
    const user = JSON.parse(userData);

    if (requiredRole) {
        // Allow multiple roles separated by comma
        const allowed = requiredRole.split(',').map(r => r.trim());
        if (!allowed.includes(user.role)) {
            window.location.href = 'index.html';
            return null;
        }
    }
    return user;
}
