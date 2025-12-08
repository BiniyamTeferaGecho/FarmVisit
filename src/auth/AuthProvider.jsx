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

  return <AuthContext.Provider value={{ user, token, accessToken: token, login, logout, setAuth, fetchWithAuth, loading, isAuthenticated: !!token && !!user }}>{children}</AuthContext.Provider>;
}
