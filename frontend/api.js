const BASE = '/api';

let token = localStorage.getItem('token');
let role = localStorage.getItem('role');

export function setAuth(t, r) {
  token = t;
  role = r;
  localStorage.setItem('token', t);
  localStorage.setItem('role', r);
}

export function clearAuth() {
  token = null;
  role = null;
  localStorage.removeItem('token');
  localStorage.removeItem('role');
}

export function getToken() { return token; }
export function getRole() { return role; }

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearAuth();
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth:       (pin) => request('POST', '/auth', { pin }),
  state:      (eventId) => request('GET', '/state' + (eventId ? `?eventId=${eventId}` : '')),
  scratch:    (i)  => request('POST', '/scratch', { tileIndex: i }),
  reveal:     (id) => request('POST', '/reveal', { eventId: id }),
  reset:      (id) => request('POST', '/reset', { eventId: id }),
  events:     ()   => request('GET',  '/events'),
  saveConfig: (c)  => request('POST', '/config', c),
};
