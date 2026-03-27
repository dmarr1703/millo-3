// Admin Dashboard
let admin = null;
let allUsers = [];
let allProducts = [];
let allOrders = [];
let allSubscriptions = [];

document.addEventListener('DOMContentLoaded', async function () {
    admin = requireAuth('admin');
    if (!admin) return;
    await loadAdminData();
});

// Tab click handlers
document.addEventListener('DOMContentLoaded', function () {
    const etransfersTab = document.getElementById('etransfersTab');
    if (etransfersTab) etransfersTab.addEventListener('click', loadETransfers);

    const withdrawalsTab = document.getElementById('withdrawalsTab');
    if (withdrawalsTab) withdrawalsTab.addEventListener('click', loadOwnerEarnings);
});

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadAdminData() {
    try {
        await Promise.all([loadUsers(), loadProducts(), loadOrders(), loadSubscriptions()]);
        updateAnalytics();
        renderCommissionChart();
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

async function loadUsers() {
    allUsers = await MilloDB.getAll('users');
    displayUsers();
}

async function loadProducts() {
    allProducts = await MilloDB.getAll('products');
    displayAllProducts();
}

async function loadOrders() {
    allOrders = await MilloDB.getAll('orders');
    displayAllOrders();
    displayCommissions();
}

async function loadSubscriptions() {
    allSubscriptions = await MilloDB.getAll('subscriptions');
}

// ── Analytics ─────────────────────────────────────────────────────────────────

function updateAnalytics() {
    document.getElementById('totalUsers').textContent = allUsers.length;
    document.getElementById('totalSellers').textContent = allUsers.filter(u => u.role === 'seller').length;
    document.getElementById('totalProducts').textContent = allProducts.length;
    document.getElementById('activeProducts').textContent = allProducts.filter(p => p.status === 'active').length;
    document.getElementById('totalOrders').textContent = allOrders.length;

    const totalCommission = allOrders.reduce((s, o) => s + (o.commission || 0), 0);
    document.getElementById('totalCommission').textContent = `$${totalCommission.toFixed(2)}`;

    const activeSubs = allSubscriptions.filter(s => s.status === 'active');
    document.getElementById('activeSubscriptionsCount').textContent = activeSubs.length;
    document.getElementById('monthlySubscriptionRevenue').textContent = `$${(activeSubs.length * 25).toFixed(2)}`;

    const totalRevenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('avgOrderValue').textContent = `$${(allOrders.length ? totalRevenue / allOrders.length : 0).toFixed(2)}`;
}

function renderCommissionChart() {
    const ctx = document.getElementById('commissionChart');
    if (!ctx) return;
    const last7Days = [], commissionData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        last7Days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        commissionData.push(allOrders.filter(o => o.created_at?.startsWith(ds)).reduce((s, o) => s + (o.commission || 0), 0));
    }
    new Chart(ctx, {
        type: 'bar',
        data: { labels: last7Days, datasets: [{ label: 'Commission Revenue (CAD)', data: commissionData, backgroundColor: 'rgba(102,126,234,0.8)', borderColor: '#667eea', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v } } } }
    });
}

// ── Display tables ────────────────────────────────────────────────────────────

function displayUsers() {
    const table = document.getElementById('usersTable');
    if (!table) return;
    table.innerHTML = allUsers.map(user => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-semibold">${user.full_name}</td>
            <td class="px-6 py-4">${user.email}</td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'seller' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                    ${user.role}
                </span>
            </td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${user.status}
                </span>
            </td>
            <td class="px-6 py-4">${new Date(user.created_at).toLocaleDateString()}</td>
            <td class="px-6 py-4">
                <button onclick="toggleUserStatus('${user.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Toggle Status"><i class="fas fa-toggle-on"></i></button>
                ${user.role !== 'admin' ? `<button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-800" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        </tr>`).join('');
}

function displayAllProducts() {
    const table = document.getElementById('allProductsTable');
    if (!table) return;
    table.innerHTML = allProducts.map(product => {
        const seller = allUsers.find(u => u.id === product.seller_id);
        return `<tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                    <img src="${product.image_url}" alt="${product.name}" class="w-12 h-12 object-cover rounded"
                         onerror="this.src='https://via.placeholder.com/48?text=?'">
                    <div><p class="font-semibold">${product.name}</p><p class="text-sm text-gray-500">${product.category}</p></div>
                </div>
            </td>
            <td class="px-6 py-4">${seller ? seller.full_name : 'Unknown'}</td>
            <td class="px-6 py-4 font-semibold">$${product.price.toFixed(2)}</td>
            <td class="px-6 py-4">${product.stock}</td>
            <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${product.status}</span>
            </td>
            <td class="px-6 py-4">
                <button onclick="viewProduct('${product.id}')" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-eye"></i></button>
                <button onclick="deleteProductAsAdmin('${product.id}')" class="text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function displayAllOrders() {
    const table = document.getElementById('allOrdersTable');
    if (!table) return;
    table.innerHTML = allOrders.map(order => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-mono text-sm">${order.id.substr(-8)}</td>
            <td class="px-6 py-4"><p class="font-semibold">${order.customer_name}</p><p class="text-sm text-gray-500">${order.customer_email}</p></td>
            <td class="px-6 py-4">${order.product_name}</td>
            <td class="px-6 py-4 font-semibold">$${order.total.toFixed(2)}</td>
            <td class="px-6 py-4 font-semibold text-green-600">$${order.commission.toFixed(2)}</td>
            <td class="px-6 py-4"><span class="text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}">${order.status}</span></td>
            <td class="px-6 py-4">${new Date(order.created_at).toLocaleDateString()}</td>
        </tr>`).join('');
}

function displayCommissions() {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substr(0, 7);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('todayCommission', `$${allOrders.filter(o => o.created_at?.startsWith(today)).reduce((s, o) => s + (o.commission || 0), 0).toFixed(2)}`);
    set('monthCommission', `$${allOrders.filter(o => o.created_at?.startsWith(thisMonth)).reduce((s, o) => s + (o.commission || 0), 0).toFixed(2)}`);
    set('allTimeCommission', `$${allOrders.reduce((s, o) => s + (o.commission || 0), 0).toFixed(2)}`);

    const bySeller = {};
    allOrders.forEach(o => {
        if (!bySeller[o.seller_id]) bySeller[o.seller_id] = { totalSales: 0, commission: 0, orders: 0 };
        bySeller[o.seller_id].totalSales += o.total || 0;
        bySeller[o.seller_id].commission += o.commission || 0;
        bySeller[o.seller_id].orders++;
    });

    const table = document.getElementById('commissionBySeller');
    if (table) {
        table.innerHTML = Object.keys(bySeller).map(sid => {
            const s = allUsers.find(u => u.id === sid);
            const d = bySeller[sid];
            return `<tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-semibold">${s ? s.full_name : 'Unknown'}</td>
                <td class="px-6 py-4">$${d.totalSales.toFixed(2)}</td>
                <td class="px-6 py-4 font-semibold text-green-600">$${d.commission.toFixed(2)}</td>
                <td class="px-6 py-4">${d.orders}</td>
            </tr>`;
        }).join('');
    }
}

// ── Status / color helpers ────────────────────────────────────────────────────

function getStatusColor(status) {
    return { pending: 'bg-yellow-100 text-yellow-800', processing: 'bg-blue-100 text-blue-800', shipped: 'bg-purple-100 text-purple-800', delivered: 'bg-green-100 text-green-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' }[status] || 'bg-gray-100 text-gray-800';
}

// ── Tab switching ─────────────────────────────────────────────────────────────

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('[id$="Tab"]').forEach(t => { t.classList.remove('border-purple-600', 'text-purple-600'); t.classList.add('border-transparent', 'text-gray-600'); });
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    const activeTab = document.getElementById(tabName + 'Tab');
    activeTab.classList.add('border-purple-600', 'text-purple-600');
    activeTab.classList.remove('border-transparent', 'text-gray-600');
    if (tabName === 'settings') loadEmailSettings();
}

// ── User actions ──────────────────────────────────────────────────────────────

async function toggleUserStatus(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
        await MilloDB.update('users', userId, { status: newStatus });
        showNotification(`User ${newStatus}`, 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Failed to update user', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
        await MilloDB.delete('users', userId);
        showNotification('User deleted', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user', 'error');
    }
}

// ── Product actions ───────────────────────────────────────────────────────────

async function deleteProductAsAdmin(productId) {
    if (!confirm('Delete this product?')) return;
    try {
        await MilloDB.delete('products', productId);
        showNotification('Product deleted', 'success');
        await loadProducts();
        updateAnalytics();
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Failed to delete product', 'error');
    }
}

function viewProduct(productId) {
    window.open(`product.html?id=${productId}`, '_blank');
}

// ── Withdrawals ───────────────────────────────────────────────────────────────

async function loadOwnerEarnings() {
    try {
        const res = await fetch('/api/owner-earnings');
        const earnings = await res.json();
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('totalEarnings', `$${earnings.available_balance.toFixed(2)}`);
        set('totalWithdrawn', `$${earnings.total_withdrawals.toFixed(2)}`);
        set('subscriptionRevenue', `$${earnings.subscription_revenue.toFixed(2)}`);
        await loadWithdrawalHistory();
    } catch (error) {
        console.error('Error loading earnings:', error);
    }
}

async function loadWithdrawalHistory() {
    try {
        const res = await fetch('/tables/withdrawals');
        const result = await res.json();
        const withdrawals = (result.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const table = document.getElementById('withdrawalHistoryTable');
        if (!table) return;
        table.innerHTML = withdrawals.length === 0
            ? '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No withdrawals yet</td></tr>'
            : withdrawals.map(w => `<tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-4">${new Date(w.created_at).toLocaleString()}</td>
                <td class="px-6 py-4 font-semibold text-green-600">$${w.amount.toFixed(2)} CAD</td>
                <td class="px-6 py-4"><span class="text-xs px-3 py-1 rounded-full bg-green-100 text-green-800">${w.status.toUpperCase()}</span></td>
                <td class="px-6 py-4 font-mono text-sm text-gray-500">${w.id.substr(-12)}</td>
            </tr>`).join('');
    } catch (error) {
        console.error('Error loading withdrawal history:', error);
    }
}

async function withdrawFunds() {
    const amount = parseFloat(prompt('Enter withdrawal amount (CAD):'));
    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount'); return; }
    try {
        const res = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, admin_id: admin.id })
        });
        const result = await res.json();
        if (!res.ok) { alert(result.error || 'Withdrawal failed'); return; }
        showNotification(`Successfully withdrew $${amount.toFixed(2)}`, 'success');
        await loadOwnerEarnings();
        updateAnalytics();
    } catch (error) {
        alert('Failed to process withdrawal');
    }
}

function downloadBackup() {
    window.location.href = '/api/backup';
    showNotification('Database backup downloading…', 'success');
}

// ── Email settings ────────────────────────────────────────────────────────────

async function loadEmailSettings() {
    try {
        const res = await fetch('/api/email-settings');
        const settings = await res.json();
        const statusDiv = document.getElementById('emailConfigStatus');
        if (statusDiv) {
            statusDiv.className = settings.configured ? 'mb-4 p-3 bg-green-100 rounded-lg' : 'mb-4 p-3 bg-yellow-100 rounded-lg';
            statusDiv.innerHTML = settings.configured
                ? '<p class="text-green-800"><i class="fas fa-check-circle mr-2"></i>Email notifications are configured</p>'
                : '<p class="text-yellow-800"><i class="fas fa-exclamation-triangle mr-2"></i>Email notifications are not configured</p>';
        }
        if (settings.configured) {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            set('emailService', settings.service || 'gmail');
            set('emailHost', settings.host || '');
            set('emailPort', settings.port || 587);
            set('emailFrom', settings.from || '');
            if (settings.service !== 'gmail') {
                const el = document.getElementById('customSmtpFields');
                if (el) el.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading email settings:', error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const emailServiceSelect = document.getElementById('emailService');
    if (emailServiceSelect) {
        emailServiceSelect.addEventListener('change', function () {
            const cf = document.getElementById('customSmtpFields');
            if (cf) cf.classList.toggle('hidden', this.value !== 'custom');
        });
    }
});

async function saveEmailSettings() {
    const g = id => document.getElementById(id);
    const user = g('emailUser')?.value; const pass = g('emailPass')?.value;
    if (!user) { alert('Enter an email address'); return; }
    if (!pass) { alert('Enter an app password'); return; }
    try {
        const res = await fetch('/api/email-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service: g('emailService')?.value,
                host: g('emailHost')?.value,
                port: parseInt(g('emailPort')?.value),
                secure: g('emailSecure')?.checked,
                user, pass,
                from: g('emailFrom')?.value
            })
        });
        const result = await res.json();
        if (result.success) { showNotification('Email settings saved!', 'success'); loadEmailSettings(); }
        else alert('Failed to save email settings');
    } catch (error) {
        alert('Failed to save email settings');
    }
}

async function testEmail() {
    const to = prompt('Enter email address for test:');
    if (!to) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { alert('Invalid email address'); return; }
    try {
        showNotification('Sending test email…', 'info');
        const res = await fetch('/api/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) });
        const result = await res.json();
        if (result.success) showNotification('Test email sent!', 'success');
        else alert('Failed: ' + (result.error || 'Unknown error'));
    } catch (error) {
        alert('Failed to send test email');
    }
}

// ── E-Transfer management ─────────────────────────────────────────────────────

async function loadETransfers() {
    try {
        const res = await fetch('/api/etransfer/all');
        const payments = await res.json();
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('pendingETransfers', payments.filter(p => p.status === 'pending').length);
        set('approvedETransfers', payments.filter(p => p.status === 'approved').length);
        set('rejectedETransfers', payments.filter(p => p.status === 'rejected').length);
        displayETransfers(payments);
    } catch (error) {
        console.error('Error loading e-transfers:', error);
    }
}

function displayETransfers(payments) {
    const table = document.getElementById('etransfersTable');
    if (!table) return;
    if (payments.length === 0) { table.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No e-transfer payments yet</td></tr>'; return; }
    payments.sort((a, b) => { if (a.status === 'pending' && b.status !== 'pending') return -1; if (a.status !== 'pending' && b.status === 'pending') return 1; return new Date(b.created_at) - new Date(a.created_at); });
    const statusColors = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
    table.innerHTML = payments.map(p => `
        <tr class="border-b border-gray-700 hover:bg-gray-800">
            <td class="px-6 py-4 text-sm">${new Date(p.created_at).toLocaleDateString()}</td>
            <td class="px-6 py-4"><p class="font-semibold">${p.seller_email}</p></td>
            <td class="px-6 py-4"><p class="font-medium">${p.product_name || 'N/A'}</p></td>
            <td class="px-6 py-4"><code class="bg-gray-800 px-2 py-1 rounded text-xs text-purple-400">${p.reference_number}</code></td>
            <td class="px-6 py-4 font-semibold text-green-400">$${p.amount.toFixed(2)} ${p.currency}</td>
            <td class="px-6 py-4"><span class="text-xs px-3 py-1 rounded-full ${statusColors[p.status] || 'bg-gray-100 text-gray-800'}">${p.status.toUpperCase()}</span></td>
            <td class="px-6 py-4">
                ${p.status === 'pending' ? `
                    <div class="flex gap-2">
                        <button onclick="approveETransfer('${p.id}')" class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"><i class="fas fa-check"></i></button>
                        <button onclick="rejectETransfer('${p.id}')" class="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"><i class="fas fa-times"></i></button>
                    </div>` :
                p.status === 'approved' ? `<span class="text-xs text-green-400"><i class="fas fa-check-circle mr-1"></i>Approved</span>` :
                `<span class="text-xs text-red-400"><i class="fas fa-times-circle mr-1"></i>${p.rejection_reason || 'Rejected'}</span>`}
            </td>
        </tr>`).join('');
}

async function approveETransfer(paymentId) {
    if (!confirm('Approve this payment? The product will be activated.')) return;
    try {
        const res = await fetch('/api/etransfer/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId, admin_id: admin.id })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        showNotification('Payment approved! Product activated.', 'success');
        await loadETransfers();
        await loadAdminData();
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

async function rejectETransfer(paymentId) {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return;
    if (!confirm('Reject this payment? The product will be removed.')) return;
    try {
        const res = await fetch('/api/etransfer/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId, admin_id: admin.id, reason: reason || 'Payment verification failed' })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        showNotification('Payment rejected.', 'info');
        await loadETransfers();
        await loadAdminData();
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}
