import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { setAuthToken, baseURL as API_BASE } from '../utils/api';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

// Lightweight JWT payload decoder for browser (no verification)
function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding
    const pad = b64.length % 4;
    const padded = b64 + (pad === 2 ? '==' : pad === 3 ? '=' : pad === 1 ? '===' : '');
    const json = atob(padded);
    try { return JSON.parse(decodeURIComponent(escape(json))); } catch { return JSON.parse(json); }
  } catch (e) {
    return null;
  }
}

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(false);

  const skipDecodeRef = useRef(false);

  // Normalize user object shape so UI components can rely on `username`, `email`, `fullName`, and `employee.fullName`
  function normalizeUser(u) {
    if (!u || typeof u !== 'object') return u;
    const out = { ...u };
    // id
    out.id = out.id || out.UserID || out.userId || out.sub || out.id;
    // username
    out.username = out.username || out.Username || out.UserName || out.userName || out.username;
    // email
    out.email = out.email || out.Email || out.EmailAddress || out.email;
    // fullName
    out.fullName = out.fullName || out.FullName || out.Fullname || (() => {
      const fn = out.FirstName || out.firstName || out.GivenName || out.givenName;
      const ln = out.LastName || out.lastName || out.FamilyName || out.familyName;
      if (fn || ln) return `${fn || ''} ${ln || ''}`.trim();
      return out.fullName;
    })();
    // roles & permissions
    out.roles = out.roles || out.Roles || out.role || [];
    out.permissions = out.permissions || out.Permissions || out.permission || [];
    // formPermissions: accept various shapes and normalize to a lower-cased-key map
    const fpSrc = out.formPermissions || out.FormPermissions || out.formPermission || null;
    if (fpSrc && typeof fpSrc === 'object') {
      try {
        // If it's an array of { FormID/path, ... } convert to map
        if (Array.isArray(fpSrc)) {
          const m = {};
          for (const it of fpSrc) {
            const key = (it.path || it.FormID || it.formId || it.FormKey || it.formKey || '').toString().toLowerCase();
            if (!key) continue;
            m[key] = { ...(m[key] || {}), ...it };
          }
          out.formPermissions = m;
        } else {
          // assume object map already — normalize keys to lower-case
          const m = {};
          for (const k of Object.keys(fpSrc)) {
            const nk = String(k).toLowerCase();
            m[nk] = fpSrc[k];
          }
          out.formPermissions = m;
        }
      } catch (e) {
        out.formPermissions = {};
      }
    } else {
      out.formPermissions = {};
    }
    // employee normalization
    const empSrc = out.employee || out.Employee || out.EmployeeInfo || out.employeeInfo || null;
    if (empSrc && typeof empSrc === 'object') {
      out.employee = out.employee || {};
      out.employee.fullName = out.employee.fullName || empSrc.fullName || empSrc.FullName || `${empSrc.FirstName || empSrc.firstName || ''} ${empSrc.LastName || empSrc.lastName || ''}`.trim() || out.employee.fullName;
      out.employee.id = out.employee.id || empSrc.EmployeeID || empSrc.employeeId || empSrc.id;
      // copy other useful properties if present
      out.employee.Email = out.employee.Email || empSrc.Email || empSrc.email;
    }
    return out;
  }

  useEffect(() => {
    if (token) {
      // If a caller just set auth via `setAuth`, skip decoding once to avoid overwriting
      // the richer `userObj` provided by the server (email/fullName etc).
      if (skipDecodeRef.current) {
        skipDecodeRef.current = false;
        return;
      }
      try {
        const payload = decodeJwt(token);
        if (!payload) throw new Error('invalid token');
        setUser(normalizeUser({ id: payload.sub, username: payload.username, roles: payload.roles || [], permissions: payload.permissions || [] }));
        localStorage.setItem('accessToken', token);
        try { setAuthToken(token); } catch (e) { /* ignore */ }
      } catch (e) {
        setToken(null); setUser(null); localStorage.removeItem('accessToken');
      }
    } else {
      setUser(null);
      localStorage.removeItem('accessToken');
      try { setAuthToken(null); } catch (e) { /* ignore */ }
    }
  }, [token]);

  // On mount, try to obtain an access token via the HttpOnly refresh cookie
  // and request a richer user object (including `formPermissions`) from
  // the server. This ensures the client receives the session-cached
  // access model persisted by the backend.
  useEffect(() => {
    let mounted = true;
    const trySession = async () => {
      setLoading(true);
      try {
        // If we already have a token from localStorage, attempt to fetch /auth/me
        let access = token || null;

        if (!access) {
          try {
            const sess = await api.get('/auth/session', { withCredentials: true });
            access = sess?.data?.accessToken || null;
          } catch (e) {
            access = null;
          }
        }

        if (!access) return;

        // Prefer the server-provided user via /auth/me (includes formPermissions)
        try {
          // Ensure axios uses the token for the call
          setAuthToken(access);
          const me = await api.get('/auth/me', { withCredentials: true });
          if (!mounted) return;
          const userObj = me?.data?.user || me?.data || null;
          if (userObj) {
            skipDecodeRef.current = true;
            setToken(access);
            setUser(normalizeUser(userObj));
            try { localStorage.setItem('accessToken', access); } catch (e) { /* ignore */ }
            try { setAuthToken(access); } catch (e) { /* ignore */ }
          } else {
            // Fallback: set token and let the decode effect populate a minimal user
            skipDecodeRef.current = true;
            setToken(access);
          }
        } catch (e) {
          // If /auth/me fails, fallback to token-only bootstrap
          skipDecodeRef.current = true;
          setToken(access);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    trySession();
    return () => { mounted = false };
  }, []);

  const navigate = useNavigate();

  const login = (accessToken) => setToken(accessToken);
  const logout = async () => {
    // Attempt server-side logout to clear HttpOnly refresh cookie and server session
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch (e) {
      // ignore network errors; proceed to clear client state
    }
    // Clear client-side auth state
    setToken(null);
    setUser(null);
    try { localStorage.removeItem('accessToken'); } catch (e) { /* ignore */ }
    try { setAuthToken(null); } catch (e) { /* ignore */ }
    // Redirect to canonical landing page
    try {
      // Use a full navigation to ensure cookies & auth state reset across origins
      window.location.href = 'https://farm-visit.vercel.app/';
    } catch (e) {
      // Fallback to react-router navigation if window.location is unavailable
      try { navigate('/'); } catch (e2) { /* ignore */ }
    }
  };

  // Backwards-compatible setter used by older code: auth.setAuth(accessToken, userObj)
  const setAuth = (accessToken, userObj) => {
    if (accessToken) {
      // prevent the token-change effect from overwriting the provided userObj
      skipDecodeRef.current = true;
      setToken(accessToken);
      if (userObj && typeof userObj === 'object') {
        setUser(normalizeUser(userObj));
        try { localStorage.setItem('accessToken', accessToken); } catch (e) { /* ignore */ }
      }
      try { setAuthToken(accessToken); } catch (e) { /* ignore */ }
      return;
    }
    // clear
    setToken(null);
    setUser(null);
    try { localStorage.removeItem('accessToken'); } catch (e) { /* ignore */ }
    try { setAuthToken(null); } catch (e) { /* ignore */ }
  };

  const fetchWithAuth = async (opts) => {
    const headers = opts.headers || {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = (opts.url && opts.url.startsWith('http')) ? opts.url : `${API_BASE}${opts.url.startsWith('/') ? '' : '/'}${opts.url}`;
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: opts.data ? JSON.stringify(opts.data) : undefined,
      credentials: 'include'
    });
    if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return res.json();
    }
    // Not JSON (likely an HTML error page) — return the raw text for better debugging
    const text = await res.text();
    const msg = `Expected JSON but received ${res.status} ${res.statusText}: ${text.slice(0, 200)}`;
    const e = new Error(msg);
    e.response = { status: res.status, statusText: res.statusText, data: text };
    throw e;
  };

  // Helper: check for a form-level permission.
  // `formKey` can be a path or form id; `flag` is optional (e.g. 'CanCreate', 'CanEdit').
  const hasFormPermission = (formKey, flag) => {
    if (!formKey) return false;
    const key = String(formKey).toLowerCase();
    const fp = (user && user.formPermissions) ? user.formPermissions[key] : null;
    if (!fp) return false;
    if (!flag) return true;
    // accept flexible flag casing
    const f = String(flag);
    if (Object.prototype.hasOwnProperty.call(fp, f)) return !!fp[f];
    // try camel/pascal variants
    const camel = f.charAt(0).toLowerCase() + f.slice(1);
    if (Object.prototype.hasOwnProperty.call(fp, camel)) return !!fp[camel];
    const pascal = f.charAt(0).toUpperCase() + f.slice(1);
    if (Object.prototype.hasOwnProperty.call(fp, pascal)) return !!fp[pascal];
    return !!fp[f.toLowerCase()];
  };

  return <AuthContext.Provider value={{ user, token, accessToken: token, login, logout, setAuth, fetchWithAuth, loading, isAuthenticated: !!token && !!user, hasFormPermission }}>{children}</AuthContext.Provider>;
}
