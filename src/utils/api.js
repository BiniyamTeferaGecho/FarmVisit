import axios from 'axios';

// Helper: normalize a base (remove trailing slash)
function normalizeBase(u) {
  if (!u) return null;
  return u.replace(/\/$/, '');
}

// Runtime override sources (in priority order):
// 1) global window.__API_BASE__ (settable from browser console or injected script)
// 2) <meta name="api-base" content="https://..."> in index.html
// 3) VITE_API_URL injected at build time
// 4) same-origin /api when served from a non-localhost host
// 5) localhost:3000/api for local development

let runtimeBase = null;
if (typeof window !== 'undefined') {
  if (window.__API_BASE__) runtimeBase = String(window.__API_BASE__);
  else {
    const meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) runtimeBase = String(meta.content);
  }
}

const envURL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL) : null;

// Pick the best candidate
let base = null;
if (runtimeBase) base = normalizeBase(runtimeBase);
else if (envURL) base = normalizeBase(envURL);
else if (typeof window !== 'undefined' && window.location && window.location.hostname && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
  base = `${window.location.origin}`; // same origin; we'll append /api below
  console.warn(`[frontend] VITE_API_URL not set — defaulting to same origin (${base})`);
} else {
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
