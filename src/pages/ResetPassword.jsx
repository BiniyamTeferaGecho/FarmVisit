import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const pwdRef = useRef(null);

  useEffect(() => {
    const t = searchParams.get('token') || searchParams.get('resetToken') || '';
    const e = searchParams.get('email') || '';
    if (t) setToken(String(t).trim());
    if (e) setEmail(String(e).trim());
    // focus password input when token present for quicker flow
    if (t && pwdRef.current) {
      setTimeout(() => { try { pwdRef.current.focus(); } catch (e) { /* ignore */ } }, 50);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setMessage(null);
    const sendToken = (typeof token === 'string') ? token.trim() : '';
    if (!sendToken || !newPwd) {
      setMessage({ type: 'error', text: 'Please provide the reset token and a new password.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    // normalize compact token (32 hex) to hyphenated GUID form before sending
    const compactRegex = /^[0-9a-fA-F]{32}$/;
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    let normalizedToken = sendToken;
    if (compactRegex.test(sendToken)) {
      normalizedToken = sendToken.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
    } else if (!guidRegex.test(sendToken)) {
      // still attempt to trim and remove surrounding quotes/spaces
      normalizedToken = sendToken.replace(/[^0-9a-fA-F-]/g, '').trim();
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password-with-token', { ResetToken: normalizedToken, NewPassword: newPwd });
      const d = res && res.data ? res.data : {};
      if (d && (d.success === true || d.Status === 'Success' || d.Status === 'Success')) {
        setMessage({ type: 'success', text: d.Message || d.message || 'Password reset successful. You may now sign in.' });
        // Optional: redirect to login after short delay
        setTimeout(() => navigate('/'), 1500);
      } else if (d && (d.success === false || d.Status === 'Error')) {
        setMessage({ type: 'error', text: d.Message || d.message || 'Password reset failed.' });
      } else {
        // fallback
        setMessage({ type: 'success', text: d.message || 'Password reset response received.' });
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      console.error('reset error', err);
      const serverData = err?.response?.data;
      const serverMsg = serverData?.Message || serverData?.message || (serverData ? JSON.stringify(serverData) : null);
      setMessage({ type: 'error', text: serverMsg || err.message || 'Failed to reset password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Reset Password</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Provide the reset token (from your email) and set a new password. If you clicked the email link it should prefill the token.</p>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Reset Token</label>
            <input value={token} onChange={e => setToken(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email (optional)</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">New Password</label>
            <input ref={pwdRef} type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full p-2 border rounded" />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Resetting...' : 'Reset Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
