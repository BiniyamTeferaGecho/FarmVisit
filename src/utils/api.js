import axios from 'axios';

// Determine API base URL with safe fallbacks:
// 1. Vite injected VITE_API_URL (build-time) if provided
// 2. At runtime, when served from a non-localhost origin, assume same origin + /api
// 3. otherwise fall back to localhost (development)
const envURL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : null;
// Ensure envURL points to the API root. If user provided a frontend root (no /api),
// append /api so axios requests like `api.get('/employees')` land at /api/employees.
const normalizedEnvURL = envURL ? (envURL.endsWith('/api') ? envURL : `${envURL}/api`) : null;
let baseURL;
if (normalizedEnvURL) {
  baseURL = normalizedEnvURL;
} else if (typeof window !== 'undefined' && window.location && window.location.hostname && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
  // Running in production-like environment but no VITE_API_URL provided — assume same origin
  baseURL = `${window.location.origin}/api`;
  console.warn(`[frontend] VITE_API_URL not set — falling back to ${baseURL}`);
} else {
  baseURL = 'http://localhost:3000/api';
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export default api;

export { baseURL };
