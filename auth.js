// Authentication System
let currentUser = null;
let isLoginMode = true;

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

// Check if user is logged in
function checkAuthStatus() {
    const userData = localStorage.getItem('milloUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUIForLoggedInUser();
    }
}

// Update UI when user is logged in
function updateUIForLoggedInUser() {
    document.getElementById('authButtons').classList.add('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.full_name;
}

// Show login modal
function showLogin() {
    isLoginMode = true;
    document.getElementById('authTitle').textContent = 'Login';
    document.getElementById('nameField').classList.add('hidden');
    document.getElementById('roleField').classList.add('hidden');
    document.getElementById('authButtonText').textContent = 'Login';
    document.getElementById('authToggle').textContent = "Don't have an account? Sign up";
    document.getElementById('authModal').classList.remove('hidden');
}

// Show signup modal
function showSignup() {
    isLoginMode = false;
    document.getElementById('authTitle').textContent = 'Sign Up';
    document.getElementById('nameField').classList.remove('hidden');
    document.getElementById('roleField').classList.remove('hidden');
    document.getElementById('authButtonText').textContent = 'Sign Up';
    document.getElementById('authToggle').textContent = "Already have an account? Login";
    document.getElementById('authModal').classList.remove('hidden');
}

// Show signup as seller
function showSignupAsSeller() {
    closeSellerModal();
    showSignup();
    document.getElementById('role').value = 'seller';
}

// Toggle between login and signup
function toggleAuthMode() {
    if (isLoginMode) {
        showSignup();
    } else {
        showLogin();
    }
}

// Close auth modal
function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('authForm').reset();
}

// Handle authentication (login/signup)
async function handleAuth(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (isLoginMode) {
        await login(email, password);
    } else {
        const fullName = document.getElementById('fullName').value;
        const role = document.getElementById('role').value;
        await signup(email, password, fullName, role);
    }
}

// Login function
async function login(email, password) {
    try {
        // Fetch users from API
        const response = await fetch('tables/users?limit=1000');
        const data = await response.json();
        
        // Find user with matching credentials
        const user = data.data.find(u => u.email === email && u.password === password);
        
        if (user) {
            if (user.status === 'suspended') {
                alert('Your account has been suspended. Please contact support.');
                return;
            }
            
            currentUser = user;
            localStorage.setItem('milloUser', JSON.stringify(user));
            updateUIForLoggedInUser();
            closeAuthModal();
            
            // Show success message
            showNotification('Login successful!', 'success');
            
            // Redirect based on role
            if (user.role === 'admin') {
                setTimeout(() => window.location.href = 'admin.html', 1000);
            } else if (user.role === 'seller') {
                setTimeout(() => window.location.href = 'dashboard.html', 1000);
            }
        } else {
            alert('Invalid email or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Signup function
async function signup(email, password, fullName, role) {
    try {
        // Check if email already exists
        const response = await fetch('tables/users?limit=1000');
        const data = await response.json();
        
        const existingUser = data.data.find(u => u.email === email);
        if (existingUser) {
            alert('Email already exists. Please use a different email or login.');
            return;
        }
        
        // Create new user
        const newUser = {
            id: 'user-' + Date.now(),
            email: email,
            password: password,
            full_name: fullName,
            role: role,
            created_at: new Date().toISOString(),
            status: 'active'
        };
        
        const createResponse = await fetch('tables/users', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newUser)
        });
        
        if (createResponse.ok) {
            const createdUser = await createResponse.json();
            currentUser = createdUser;
            localStorage.setItem('milloUser', JSON.stringify(createdUser));
            updateUIForLoggedInUser();
            closeAuthModal();
            
            showNotification('Account created successfully!', 'success');
            
            // Redirect based on role
            if (role === 'seller') {
                setTimeout(() => window.location.href = 'dashboard.html', 1000);
            }
        } else {
            alert('Signup failed. Please try again.');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed. Please try again.');
    }
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('milloUser');
    document.getElementById('authButtons').classList.remove('hidden');
    document.getElementById('userMenu').classList.add('hidden');
    showNotification('Logged out successfully', 'info');
    
    // Redirect to home if on protected page
    if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('admin')) {
        setTimeout(() => window.location.href = 'index.html', 1000);
    }
}

// Toggle user dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && !userMenu.contains(event.target)) {
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }
});

// Show seller info modal
function showSellerInfo() {
    document.getElementById('sellerModal').classList.remove('hidden');
}

// Close seller modal
function closeSellerModal() {
    document.getElementById('sellerModal').classList.add('hidden');
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Protect pages that require authentication
function requireAuth(requiredRole = null) {
    const userData = localStorage.getItem('milloUser');
    
    if (!userData) {
        window.location.href = 'index.html';
        return null;
    }
    
    const user = JSON.parse(userData);
    
    if (requiredRole && user.role !== requiredRole) {
        window.location.href = 'index.html';
        return null;
    }
    
    return user;
}
