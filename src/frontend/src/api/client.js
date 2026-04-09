/**
 * Thin fetch wrapper that attaches the JWT token and handles JSON.
 */

function getToken() {
  return localStorage.getItem('medilog_token');
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('medilog_token');
    localStorage.removeItem('medilog_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:    (url, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(url + qs);
  },
  post:   (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put:    (url, body) => request(url, { method: 'PUT',  body: JSON.stringify(body) }),
  delete: (url)       => request(url, { method: 'DELETE' }),
};
