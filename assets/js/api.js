/**
 * Fetch wrapper for the single-file backend (api.php?action=...).
 * Attaches the bearer token, parses JSON, redirects to login on 401.
 */
const api = {
  token() { return localStorage.getItem('hrms_token'); },
  setToken(token) { localStorage.setItem('hrms_token', token); },
  clearToken() { localStorage.removeItem('hrms_token'); },
  currentUser() {
    const raw = localStorage.getItem('hrms_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) { localStorage.setItem('hrms_user', JSON.stringify(user)); },

  buildUrl(action, params = {}) {
    const qs = new URLSearchParams(Object.assign({ action }, params));
    return API_BASE_URL + '?' + qs.toString();
  },

  async request(action, options = {}, params = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = this.token();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(this.buildUrl(action, params), {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON response */ }

    if (res.status === 401) {
      this.clearToken();
      window.location.href = 'index.html';
      throw new Error('Session expired');
    }
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong (' + res.status + ')');
    }
    return data;
  },

  get(action, params = {}) {
    return this.request(action, { method: 'GET' }, params);
  },
  post(action, body) {
    return this.request(action, { method: 'POST', body });
  },
};

function guardPage() {
  if (!api.token()) window.location.href = 'index.html';
}

function logout() {
  api.clearToken();
  localStorage.removeItem('hrms_user');
  window.location.href = 'index.html';
}
