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
  auth:    (pin) => request('POST', '/auth', { pin }),
  state:   ()   => request('GET',  '/state'),
  scratch: (i)  => request('POST', '/scratch', { tileIndex: i }),
  reveal:  ()   => request('POST', '/reveal'),
  reset:   ()   => request('POST', '/reset'),
};
