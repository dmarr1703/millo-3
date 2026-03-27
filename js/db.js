/**
 * MilloDB — API client
 * All data is stored on the server (millo-database.json via REST API).
 * Auth tokens are kept in sessionStorage so they are cleared on tab close.
 */
const MilloDB = {

    // ── Token helpers ────────────────────────────────────────────────────────

    getToken() {
        return sessionStorage.getItem('milloToken');
    },

    setToken(token) {
        sessionStorage.setItem('milloToken', token);
    },

    clearToken() {
        sessionStorage.removeItem('milloToken');
    },

    authHeaders() {
        const token = this.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    },

    // ── Auth ─────────────────────────────────────────────────────────────────

    async login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        this.setToken(data.token);
        localStorage.setItem('milloUser', JSON.stringify(data.user));
        return data.user;
    },

    async signup(email, password, full_name, role) {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        this.setToken(data.token);
        localStorage.setItem('milloUser', JSON.stringify(data.user));
        return data.user;
    },

    logout() {
        this.clearToken();
        localStorage.removeItem('milloUser');
    },

    getCurrentUser() {
        const raw = localStorage.getItem('milloUser');
        return raw ? JSON.parse(raw) : null;
    },

    // ── REST helpers ─────────────────────────────────────────────────────────

    async getAll(table, params = {}) {
        const qs = new URLSearchParams({ limit: 1000, ...params }).toString();
        const res = await fetch(`/tables/${table}?${qs}`, { headers: this.authHeaders() });
        if (!res.ok) throw new Error(`Failed to load ${table}`);
        const data = await res.json();
        return data.data || data;
    },

    async getById(table, id) {
        const res = await fetch(`/tables/${table}/${id}`, { headers: this.authHeaders() });
        if (!res.ok) return null;
        return res.json();
    },

    async find(table, criteria) {
        const all = await this.getAll(table);
        return all.filter(item =>
            Object.entries(criteria).every(([k, v]) => item[k] === v)
        );
    },

    async findOne(table, criteria) {
        const all = await this.getAll(table);
        return all.find(item =>
            Object.entries(criteria).every(([k, v]) => item[k] === v)
        ) || null;
    },

    async create(table, record) {
        const res = await fetch(`/tables/${table}`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify(record)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `Failed to create ${table} record`);
        }
        return res.json();
    },

    async update(table, id, updates) {
        const res = await fetch(`/tables/${table}/${id}`, {
            method: 'PATCH',
            headers: this.authHeaders(),
            body: JSON.stringify(updates)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `Failed to update ${table} record`);
        }
        return res.json();
    },

    async delete(table, id) {
        const res = await fetch(`/tables/${table}/${id}`, {
            method: 'DELETE',
            headers: this.authHeaders()
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `Failed to delete ${table} record`);
        }
        return res.json();
    },

    async count(table) {
        const res = await fetch(`/tables/${table}?limit=1`, { headers: this.authHeaders() });
        if (!res.ok) return 0;
        const data = await res.json();
        return data.total || 0;
    }
};

window.MilloDB = MilloDB;
