import axios from 'axios';


// Helper: normalize a base (remove trailing slash)
function normalizeBase(u) {
  if (!u) return null;
  return u.replace(/\/$/, '');
}

// Runtime override sources (in priority order):
// 1) window.__API_BASE__ (settable from browser console)
// 2) <meta name="api-base"> in index.html
// 3) import.meta.env.VITE_API_URL (build-time)
// 4) same-origin when hosted (useful when backend is proxied)
// 5) fallback to localhost for local dev

let runtimeBase = null;
if (typeof window !== 'undefined') {
  if (window.__API_BASE__) runtimeBase = String(window.__API_BASE__);
  else {
    const meta = document.querySelector && document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) runtimeBase = String(meta.content);
  }
}

const envURL = import.meta.env && import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL) : null;

let base = null;
if (runtimeBase) base = normalizeBase(runtimeBase);
else if (envURL) base = normalizeBase(envURL);
else if (typeof window !== 'undefined' && window.location && window.location.hostname && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
  // when served from a host (e.g., Vercel), assume same-origin API path
  base = `${window.location.origin}`;
} else {
  // Local development default
  base = 'http://localhost:3000';
}

// Ensure the returned base points to the API root (append /api if missing)
if (!base.endsWith('/api')) base = `${base}/api`;

const baseURL = base;

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export default api;
export { baseURL };
