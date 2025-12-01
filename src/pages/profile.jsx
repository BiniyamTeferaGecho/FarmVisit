import React, { useEffect, useState, useRef } from 'react';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Clock, Globe, Sun, Moon, Save, LogIn, RefreshCw } from 'lucide-react';

const ProfileInputField = ({ icon, label, value, onChange, type = 'text' }) => (
    <div>
        <label className="text-left block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                {icon}
            </span>
            <input
                type={type}
                value={value}
                onChange={onChange}
                className="w-full mt-1 p-2 pl-10 border rounded-lg bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
    </div>
);

const ProfileSelectField = ({ icon, label, value, onChange, options }) => (
    <div>
        <label className="text-left block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                {icon}
            </span>
            <select
                value={value}
                onChange={onChange}
                className="w-full mt-1 p-2 pl-10 border rounded-lg appearance-none bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    </div>
);

export default function Profile({ modal = false, reloadKey }) {
    const { user, setAuth, accessToken, fetchWithAuth } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState({});
    const [message, setMessage] = useState(null);
    const [sessionExpired, setSessionExpired] = useState(false);
    const isMountedRef = useRef(true);

    const userId = user?.userId || user?.UserID || user?.id || user?.userId || null;

    async function fetchProfile() {
        if (!userId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setSessionExpired(false);
            setMessage(null);
            const res = await fetchWithAuth({ url: `/users/${encodeURIComponent(userId)}/profile`, method: 'get', redirectOnFail: false });
            const payload = res?.data?.data ?? res?.data ?? res;
            if (!isMountedRef.current) return;
            setData(payload || {});
        } catch (err) {
            console.error('Failed to load profile', err);
            const errMsg = err?.response?.data?.message || err.message || 'Failed to load profile';
            if (err?.response?.status === 401 || /invalid|expired|missing refresh/i.test(errMsg)) {
                setSessionExpired(true);
            }
            setMessage({ type: 'error', text: errMsg });
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }

    useEffect(() => {
        isMountedRef.current = true;
        fetchProfile();
        return () => { isMountedRef.current = false };
    }, [userId, fetchWithAuth]);

    const handleChange = (k, v) => setData(d => ({ ...d, [k]: v }));

    const handleSubmit = async (e) => {
        e && e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                UserID: data.UserID || userId,
                Username: data.Username || data.username || data.UserName,
                Email: data.Email || data.email,
                PhoneNumber: data.PhoneNumber || data.phoneNumber,
                Timezone: data.Timezone || data.timezone || null,
                Language: data.Language || data.language || null,
                Theme: data.Theme || data.theme || null,
                UpdatedBy: userId,
            };
            const res = await fetchWithAuth({ url: '/users/profile', method: 'put', data: payload, redirectOnFail: false });
            const updated = res?.data?.data ?? res?.data ?? null;
            setMessage({ type: 'success', text: res?.data?.message || 'Profile updated successfully!' });
            if (updated) {
                setAuth((accessToken && accessToken) || null, updated);
                // Notify other parts of the app (dashboard tabs, sidebars) that profile changed
                try {
                    window.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
                } catch (e) { /* ignore */ }
            }
        } catch (err) {
            console.error('Failed to update profile', err);
            const errMsg = err?.response?.data?.message || err.message || 'Failed to update profile';
            if (err?.response?.status === 401 || /invalid|expired|missing refresh/i.test(errMsg)) {
                setSessionExpired(true);
            }
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setSaving(false);
        }
    };

    const inner = (
        <div className={modal ? 'w-full max-w-2xl mx-auto' : 'max-w-4xl mx-auto'}>
            <header className="mb-8">
                <h1 className="text-left text-3xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
                <p className="text-left text-md text-slate-600 dark:text-slate-400 mt-1">Manage your account details and preferences.</p>
            </header>

            {sessionExpired && (
                <div className="mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
                    <div>Your session has expired. Please sign in again to continue.</div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/login', { state: { from: '/profile' } })} className="px-4 py-2 bg-yellow-600 text-white rounded-lg flex items-center gap-2 hover:bg-yellow-700">
                            <LogIn size={16} /> Sign In
                        </button>
                        <button onClick={() => fetchProfile()} className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700">
                            <RefreshCw size={16} /> Retry
                        </button>
                    </div>
                </div>
            )}

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <div className="text-left p-8">Loading profile...</div>
            ) : (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Personal Information */}
                        <div className="space-y-6">
                            <h3 className="text-left text-xl font-semibold text-slate-800 dark:text-slate-100">Personal Information</h3>
                            <ProfileInputField icon={<User size={18} />} label="Username" value={data.Username ?? data.username ?? ''} onChange={e => handleChange('Username', e.target.value)} />
                            <ProfileInputField icon={<Mail size={18} />} label="Email" type="email" value={data.Email ?? data.email ?? ''} onChange={e => handleChange('Email', e.target.value)} />
                            <ProfileInputField icon={<Phone size={18} />} label="Phone" value={data.PhoneNumber ?? data.phoneNumber ?? ''} onChange={e => handleChange('PhoneNumber', e.target.value)} />
                        </div>

                        {/* Application Settings */}
                        <div className="space-y-6">
                            <h3 className="text-left text-xl font-semibold text-slate-800 dark:text-slate-100">Settings</h3>
                            <ProfileInputField icon={<Clock size={18} />} label="Timezone" value={data.Timezone ?? ''} onChange={e => handleChange('Timezone', e.target.value)} />
                            <ProfileInputField icon={<Globe size={18} />} label="Language" value={data.Language ?? ''} onChange={e => handleChange('Language', e.target.value)} />
                            <ProfileSelectField
                                icon={data.Theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                                label="Theme"
                                value={data.Theme ?? ''}
                                onChange={e => handleChange('Theme', e.target.value)}
                                options={[
                                    { value: '', label: 'System' },
                                    { value: 'light', label: 'Light' },
                                    { value: 'dark', label: 'Dark' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <button type="submit" disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:bg-blue-400">
                            {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );

    if (modal) {
        return inner;
    }

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