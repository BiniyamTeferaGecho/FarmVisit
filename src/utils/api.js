import axios from 'axios';


// Helper: normalize a base (remove trailing slash)
function normalizeBase(u) {
  if (!u) return null;
  return u.replace(/\/$/, '');
}

// Runtime override sources (in priority order):
// 1) window.__API_BASE__ (settable from browser console)
// 2) localStorage 'API_BASE' (persisted by the dashboard controls)
// 3) <meta name="api-base"> in index.html
// 4) import.meta.env.VITE_API_URL (build-time)
// 5) special-case override when hosted on farm-visit.vercel.app -> ngrok (for emergency testing)
// 6) same-origin when hosted (useful when backend is proxied)
// 7) fallback to localhost for local dev

let runtimeBase = null;
if (typeof window !== 'undefined') {
  if (window.__API_BASE__) runtimeBase = String(window.__API_BASE__);
  else if (window.localStorage && window.localStorage.getItem('API_BASE')) runtimeBase = String(window.localStorage.getItem('API_BASE'));
  else {
    const meta = document.querySelector && document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) runtimeBase = String(meta.content);
  }
}

const envURL = import.meta.env && import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL) : null;

let base = null;
if (runtimeBase) base = normalizeBase(runtimeBase);
else if (envURL) base = normalizeBase(envURL);
// Special-case: when served from farm-visit.vercel.app, prefer using the ngrok tunnel for quick testing.
// This is temporary and requires a redeploy to take effect on the live build.
else if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname === 'farm-visit.vercel.app') {
  base = 'https://055a2395cc07.ngrok-free.app';
} else if (typeof window !== 'undefined' && window.location && window.location.hostname && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
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

// Support runtime-specified fallback API bases. Useful when deployed frontend
// accidentally points at an unreachable/same-origin API; set VITE_API_FALLBACKS
// (comma-separated) at build time or window.__API_FALLBACKS__ / localStorage at runtime.
const parseFallbacks = () => {
  const list = [];
  if (import.meta.env && import.meta.env.VITE_API_FALLBACKS) {
    for (const p of String(import.meta.env.VITE_API_FALLBACKS).split(',')) {
      const t = p.trim(); if (t) list.push(normalizeBase(t));
    }
  }
  if (typeof window !== 'undefined' && window.__API_FALLBACKS__) {
    for (const p of String(window.__API_FALLBACKS__).split(',')) {
      const t = p.trim(); if (t) list.push(normalizeBase(t));
    }
  }
  if (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('API_FALLBACKS')) {
    for (const p of String(window.localStorage.getItem('API_FALLBACKS')).split(',')) {
      const t = p.trim(); if (t) list.push(normalizeBase(t));
    }
  }
  return Array.from(new Set(list)).filter(u => u && u !== baseURL);
};

let fallbackBases = parseFallbacks();
let lastUsedFallback = null;

// If a request returns a 404 (or certain network errors) try fallbacks once.
api.interceptors.response.use(
  res => res,
  async (error) => {
    try {
      const origReq = error.config;
      if (!origReq || origReq.__retried) return Promise.reject(error);
      const status = error.response && error.response.status;
      if ((status && status === 404) || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        if (!fallbackBases || fallbackBases.length === 0) return Promise.reject(error);
        const next = fallbackBases.shift();
        if (!next) return Promise.reject(error);
        lastUsedFallback = next;
        console.warn('API base failed, retrying request against fallback:', next);
        origReq.__retried = true;
        const prevBase = api.defaults.baseURL;
        api.defaults.baseURL = next.endsWith('/api') ? next : `${next}/api`;
        try {
          const resp = await api.request(origReq);
          return resp;
        } finally {
          api.defaults.baseURL = prevBase;
        }
      }
    } catch (e) {
      /* swallow */
    }
    return Promise.reject(error);
  }
);

// Runtime helpers for UI/debugging
function getActiveApiBase() {
  return api.defaults.baseURL || baseURL;
}

function getFallbacksList() {
  return Array.isArray(fallbackBases) ? [...fallbackBases] : [];
}

function getLastUsedFallback() {
  return lastUsedFallback;
}

function setRuntimeFallbacks(list) {
  if (!list) return;
  if (typeof list === 'string') list = list.split(',').map(s => s.trim()).filter(Boolean);
  if (!Array.isArray(list)) return;
  fallbackBases = Array.from(new Set(list.map(normalizeBase))).filter(u => u && u !== baseURL);
  if (typeof window !== 'undefined' && window.localStorage) {
    try { window.localStorage.setItem('API_FALLBACKS', fallbackBases.join(',')); } catch (e) { /* ignore */ }
  }
}

function setActiveApiBase(u) {
  if (!u) return;
  const n = normalizeBase(u);
  if (!n) return;
  api.defaults.baseURL = n.endsWith('/api') ? n : `${n}/api`;
  if (typeof window !== 'undefined' && window.localStorage) {
    try { window.localStorage.setItem('API_BASE', n); } catch (e) { /* ignore */ }
  }
  if (typeof window !== 'undefined') window.__API_BASE__ = n;
}

export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export default api;
export { baseURL, getActiveApiBase, getFallbacksList, getLastUsedFallback, setRuntimeFallbacks, setActiveApiBase };
