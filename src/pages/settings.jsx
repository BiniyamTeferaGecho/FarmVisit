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
            const payload = { UserID: userId, CurrentPassword: currentPwd, NewPassword: newPwd, ChangedBy: userId };
            const res = await api.post('/users/change-password', payload);
            if (res?.data?.success) {
                setMessage({ type: 'success', text: res.data.message || 'Password changed successfully!' });
                setCurrentPwd('');
                setNewPwd('');
                setConfirmPwd('');
            } else {
                setMessage({ type: 'error', text: res?.data?.message || 'Failed to change password.' });
            }
        } catch (err) {
            console.error('Change password error', err);
            setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
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
                    onChange={e => setNewPwd(e.target.value)}
                />
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