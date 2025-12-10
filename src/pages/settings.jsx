import React, { useState } from 'react';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../auth/AuthProvider';
import api from '../utils/api';
import { Lock, Key, Save } from 'lucide-react';

const PasswordInputField = ({ icon, label, value, onChange }) => (
    <div>
        <label className="text-left block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                {icon}
            </span>
            <input
                type="password"
                value={value}
                onChange={onChange}
                className="w-full mt-1 p-2 pl-10 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
    </div>
);

export default function Settings({ modal = false }) {
    const { user } = useAuth();
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [pwdStrength, setPwdStrength] = useState(null);
    const [expiryInfo, setExpiryInfo] = useState(null);
    const [resetToken, setResetToken] = useState('');
    const [resetNewPwd, setResetNewPwd] = useState('');
    const [resetConfirmPwd, setResetConfirmPwd] = useState('');
    const [resetSaving, setResetSaving] = useState(false);

    const userId = user?.userId || user?.UserID || user?.id || null;

    const handleChangePassword = async (e) => {
        e && e.preventDefault();
        setMessage(null);
        if (!currentPwd || !newPwd) {
            setMessage({ type: 'error', text: 'Please fill out all password fields.' });
            return;
        }
        if (newPwd !== confirmPwd) {
            setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
            return;
        }
        setSaving(true);
        try {
            // First validate the current password via the new backend SP wrapper
            const identifier = user?.username || user?.email || user?.userName || user?.UserName || userId;
            const validateRes = await api.post('/auth/validate-password', { Username: identifier, Password: currentPwd });
            const v = validateRes && validateRes.data ? validateRes.data : {};
            if (!v.isValid) {
                if (v.isLockedOut) {
                    setMessage({ type: 'error', text: `Account is locked. Try again in ${v.remainingLockoutMinutes || 'some'} minute(s).` });
                } else if (v.mustChangePassword) {
                    setMessage({ type: 'error', text: 'You must change your expired password via the password reset flow.' });
                } else {
                    setMessage({ type: 'error', text: 'Current password is incorrect.' });
                }
                return;
            }

            // Call the privileged endpoint to update the password
            const payload = { UserID: userId, Username: identifier, NewPassword: newPwd, CurrentUserID: userId, IsPasswordReset: 0 };
            const res = await api.post('/auth/password', payload);
            const data = res && res.data ? res.data : {};
            // The SP returns Status/Message or a recordset row; accept either
            if (data && (data.Status === 'Success' || data.status === 'Success' || data.Status === 'Success')) {
                setMessage({ type: 'success', text: data.Message || data.message || 'Password changed successfully!' });
                setCurrentPwd('');
                setNewPwd('');
                setConfirmPwd('');
            } else if (data && data.Status === 'Error') {
                setMessage({ type: 'error', text: data.Message || data.message || 'Failed to change password.' });
            } else {
                // fallback: success if HTTP 200
                setMessage({ type: 'success', text: data.message || 'Password change completed.' });
                setCurrentPwd('');
                setNewPwd('');
                setConfirmPwd('');
            }
        } catch (err) {
            console.error('Change password error', err);
            setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    const computeStrength = (pw) => {
        if (!pw || pw.length < 8) return { score: 0, label: 'Too short' };
        let score = 0;
        if (pw.length >= 8) score += 1;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
        if (/[0-9]/.test(pw)) score += 1;
        if (/[^A-Za-z0-9]/.test(pw)) score += 1;
        const label = score <= 1 ? 'Weak' : score === 2 ? 'Medium' : 'Strong';
        return { score, label };
    };

    const handleNewPwdChange = (e) => {
        const v = e.target.value;
        setNewPwd(v);
        const s = computeStrength(v);
        setPwdStrength(s);
    };

    const handleCheckExpiry = async () => {
        setExpiryInfo(null);
        if (!userId) {
            setMessage({ type: 'error', text: 'User ID unavailable' });
            return;
        }
        try {
            const res = await api.get(`/auth/password-expiry/${userId}`);
            setExpiryInfo(res && res.data ? res.data : { message: 'No data' });
        } catch (err) {
            console.error('check expiry error', err);
            setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to check password expiry.' });
        }
    };

    const handleResetWithToken = async (e) => {
        e && e.preventDefault();
        setMessage(null);
        const token = (typeof resetToken === 'string') ? resetToken.trim() : '';
        if (!token || !resetNewPwd) {
            setMessage({ type: 'error', text: 'Please provide the reset token and a new password.' });
            return;
        }
        // Accept hyphenated GUID or compact 32-hex string; convert compact to hyphenated
        const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        const compactRegex = /^[0-9a-fA-F]{32}$/;
        let sendToken = token;
        if (compactRegex.test(token)) {
            // convert to hyphenated GUID
            sendToken = token.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
        } else if (!guidRegex.test(token)) {
            setMessage({ type: 'error', text: 'Reset token appears invalid. Provide a hyphenated GUID or a 32-character hex token.' });
            return;
        }
        if (resetNewPwd !== resetConfirmPwd) {
            setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
            return;
        }
        setResetSaving(true);
        try {
            const res = await api.post('/auth/reset-password-with-token', { ResetToken: sendToken, NewPassword: resetNewPwd });
            const d = res && res.data ? res.data : {};
            if (d && (d.success === true || d.Success === 1 || d.Status === 'Success')) {
                setMessage({ type: 'success', text: d.Message || d.message || 'Password reset successful.' });
                setResetToken(''); setResetNewPwd(''); setResetConfirmPwd('');
            } else {
                setMessage({ type: 'error', text: d.Message || d.message || 'Password reset failed.' });
            }
        } catch (err) {
            console.error('reset with token error', err);
            const serverData = err?.response?.data;
            const serverMsg = serverData?.Message || serverData?.message || (serverData ? JSON.stringify(serverData) : null);
            setMessage({ type: 'error', text: serverMsg || err.message || 'Failed to reset password.' });
        } finally {
            setResetSaving(false);
        }
    };

    const inner = (
        <div className="max-w-2xl mx-auto">
            <header className="mb-8">
                <h1 className="text-left text-3xl font-bold text-slate-900 dark:text-white">Security Settings</h1>
                <p className="text-left text-md text-slate-600 dark:text-slate-400 mt-1">Update your password to keep your account secure.</p>
            </header>

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 space-y-6">
                <PasswordInputField
                    icon={<Lock size={18} />}
                    label="Current Password"
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                />
                <PasswordInputField
                    icon={<Key size={18} />}
                    label="New Password"
                    value={newPwd}
                    onChange={handleNewPwdChange}
                />
                {pwdStrength && (
                    <div className="text-sm mt-1">
                        <div className="h-2 w-full bg-slate-200 rounded-md overflow-hidden mb-1">
                            <div style={{ width: `${(pwdStrength.score / 4) * 100}%` }} className={`h-2 ${pwdStrength.score <= 1 ? 'bg-red-500' : pwdStrength.score === 2 ? 'bg-yellow-400' : 'bg-green-500'}`} />
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">Strength: {pwdStrength.label}</div>
                    </div>
                )}
                <PasswordInputField
                    icon={<Key size={18} />}
                    label="Confirm New Password"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                />

                <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="submit" disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:bg-blue-400">
                        {saving ? 'Changing...' : <><Save size={18} /> Change Password</>}
                    </button>
                </div>
            </form>

            <div className="mt-6 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-2">Check Password Expiry</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">See when your password will expire.</p>
                    <div className="flex items-center gap-3">
                        <button onClick={handleCheckExpiry} className="px-4 py-2 bg-indigo-600 text-white rounded">Check Expiry</button>
                        {expiryInfo && (<div className="text-sm text-slate-700 dark:text-slate-200">{expiryInfo.ExpiryStatus || expiryInfo.ExpiryStatus || expiryInfo.message || JSON.stringify(expiryInfo)}</div>)}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold mb-2">Reset Password With Token</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">If you received a password reset token, use it here to set a new password.</p>
                    <form onSubmit={handleResetWithToken} className="space-y-3">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Reset Token</label>
                            <input type="text" value={resetToken} onChange={e => setResetToken(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">New Password</label>
                            <input type="password" value={resetNewPwd} onChange={e => setResetNewPwd(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Confirm New Password</label>
                            <input type="password" value={resetConfirmPwd} onChange={e => setResetConfirmPwd(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={resetSaving} className="px-4 py-2 bg-green-600 text-white rounded">{resetSaving ? 'Resetting...' : 'Reset Password'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    if (modal) return inner;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
            <div style={{ height: 70 }} className="fixed top-0 left-0 right-0 z-30">
                <TopNav onToggleSidebar={() => {}} onToggleCollapse={() => {}} />
            </div>
            <div style={{ paddingTop: 70 }} className="flex">
                <Sidebar isOpen={false} isCollapsed={false} active={'dashboard'} onChange={() => {}} onClose={() => {}} width={72} minWidth={64} />

                <main className="flex-1 p-6">{inner}</main>
            </div>
        </div>
    );
}