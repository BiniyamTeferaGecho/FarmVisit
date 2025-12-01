import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import api from '../utils/api'
import reactLogo from '../assets/images/AKF Logo.png'
import bgImage from '../assets/images/BackGround.jpg'

export default function Login() {
	const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'register'

	// login fields (identifier can be username, email or phone)
	const [identifier, setIdentifier] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [remember, setRemember] = useState(false)

	// forgot / reset
	const [forgotEmail, setForgotEmail] = useState('')

	// register fields
	const [regUsername, setRegUsername] = useState('')
	const [regEmail, setRegEmail] = useState('')
	const [regPassword, setRegPassword] = useState('')
	const [regPhone, setRegPhone] = useState('')
    const [regEmployeeId, setRegEmployeeId] = useState('')
    const [employees, setEmployees] = useState([])

	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState(null)

	const navigate = useNavigate()
	const auth = useAuth()
	const location = useLocation()
	const from = location.state?.from?.pathname || '/'

	const handleLogin = async (e) => {
		e.preventDefault()
		setLoading(true)
		setMessage(null)
		try {
			// Post credentials directly using the shared axios instance so we have control over payload
			// Post to the auth login endpoint which sets an HttpOnly refresh cookie
			// Debug: log minimal payload info (avoid logging raw password)
			console.debug('Login: sending payload', { username: identifier, passwordPresent: !!password })
			const res = await api.post('/auth/login', { username: identifier, password }, { withCredentials: true })
			const data = res?.data ?? {}
			// backend may return either { accessToken } (auth controller) or { token } (user controller)
			const token = data.accessToken || data.token || data.access_token || null;
			const userObj = data.user || data.user || (data.session && data.session.user) || null;
			if (res.status === 200 && token) {
				// set auth state via provider helper
				auth.setAuth(token, userObj);
				setMessage({ type: 'success', text: 'Signed in successfully' });
				navigate('/dashboard', { replace: true });
			} else {
				setMessage({ type: 'error', text: data.message || 'Login failed' });
			}
		} catch (err) {
			const status = err?.response?.status
			const serverMsg = err?.response?.data?.message || err?.response?.data || err.message
			if (status === 401) setMessage({ type: 'error', text: serverMsg || 'Invalid credentials' })
			else if (status === 423) setMessage({ type: 'error', text: serverMsg || 'Account locked' })
			else setMessage({ type: 'error', text: serverMsg || 'Network error' })
		} finally {
			setLoading(false)
		}
	}

	// helper to normalize list responses
	const normalizeList = (resp) => {
		const body = resp?.data ?? resp
		// Common shapes:
		// - Array directly
		// - { data: [ ... ] }
		// - { data: { items: [ ... ], total } }
		// - { data: { recordset: [ ... ] } }
		// - { rows: [ ... ] }
		if (Array.isArray(body)) return body
		if (Array.isArray(body?.data)) return body.data
		if (Array.isArray(body?.rows)) return body.rows
		if (Array.isArray(body?.data?.items)) return body.data.items
		if (Array.isArray(body?.data?.recordset)) return body.data.recordset
		if (Array.isArray(body?.data?.rows)) return body.data.rows
		// search one level deeper for any array value
		if (body && typeof body === 'object') {
			for (const k of Object.keys(body)) {
				const v = body[k]
				if (Array.isArray(v)) return v
				if (v && typeof v === 'object') {
					for (const kk of Object.keys(v)) {
						if (Array.isArray(v[kk])) return v[kk]
					}
				}
			}
		}
		return []
	}

	useEffect(() => {
		let mounted = true
		const loadEmployees = async () => {
			try {
				const r = await api.get('/employees')
				if (!mounted) return
				setEmployees(normalizeList(r))
			} catch (e) {
				console.error('Failed to load employees for registration dropdown', e)
			}
		}
		loadEmployees()
		return () => { mounted = false }
	}, [])

  // Remove page scrollbar while login page is mounted so the card fits the viewport.
  useEffect(() => {
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody || ''
      document.documentElement.style.overflow = prevHtml || ''
    }
  }, [])

	// Auto-fill registration username/email from selected employee when possible
	useEffect(() => {
		// Immediately clear the registration fields when selection changes so the form
		// doesn't show stale values while we fetch the new employee data.
		setRegUsername('');
		setRegEmail('');
		setRegPhone('');
		setRegPassword('');

		if (!regEmployeeId) return;
		let emp = employees.find(e => (e.EmployeeID ?? e.employeeId ?? e.id) == regEmployeeId);
		let cancelled = false;

		const applyFrom = (src) => {
			try {
				if (!regUsername) {
					let suggestion = src.Username ?? src.username ?? src.Email ?? src.email ?? '';
					if (!suggestion) {
						const fn = (src.FirstName ?? src.firstName ?? '').toString().trim();
						const ln = (src.FatherName ?? src.fatherName ?? '').toString().trim();
						suggestion = `${fn}.${ln}`.replace(/[^a-zA-Z0-9\.]/g, '').toLowerCase();
					}
					if (suggestion) setRegUsername(suggestion);
				}
				if (!regEmail) {
					const email = src.Email ?? src.email ?? src.workEmail ?? src.personalEmail ?? '';
					if (email) setRegEmail(email);
				}
				if (!regPhone) {
					const phone = src.PhoneNumber ?? src.phoneNumber ?? src.workPhone ?? src.personalPhone ?? src.Phone ?? src.mobile ?? '';
					if (phone) setRegPhone(phone);
				}
			} catch (e) { /* ignore */ }
		};

		if (emp && (emp.Email || emp.email || emp.Username || emp.username || emp.PhoneNumber || emp.phoneNumber || emp.workPhone || emp.personalPhone)) {
			applyFrom(emp);
			return () => { cancelled = true };
		}

		// fetch full employee record if dropdown list doesn't include contact fields
		(async () => {
			try {
				const r = await api.get('/employees/' + encodeURIComponent(regEmployeeId));
				if (cancelled) return;
				const payload = r?.data?.data ?? r?.data ?? r;
				if (payload) {
					emp = payload;
					applyFrom(payload);
				}
			} catch (e) { /* ignore */ }
		})();

		return () => { cancelled = true };
	}, [regEmployeeId, employees]);

	return (
		<div className="h-screen flex items-center justify-center p-4 relative overflow-hidden">
				{/* background image */}
				<div className="fixed inset-0 -z-10">
					<div className="absolute inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.75)' }} />
					{/* subtle overlay to improve contrast */}
					<div className="absolute inset-0 bg-black/20" />
				</div>
			<div className="w-full max-w-[950px] bg-white/95 rounded-2xl overflow-auto max-h-[calc(100vh-4rem)] relative z-20 p-6">
				<div className="flex items-center max-md:flex-col w-full gap-y-4 h-full">
				<div className="md:max-w-[420px] w-full h-full flex items-center justify-center">
					<div className="relative w-72 h-72 md:w-96 md:h-96">
						<img
							src={reactLogo}
							className="w-full h-full object-contain transition-transform duration-300 ease-out"
							alt="Logo"
						/>
					</div>
				</div>
				<div className="w-full h-full px-8 lg:px-20 py-8 max-md:-order-1">
					{message && (
						<div className={`mb-4 w-full md:max-w-md mx-auto p-3 rounded ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
							{message.text}
						</div>
					)}
					{mode === 'login' && (
						<form onSubmit={handleLogin} className="md:max-w-md w-full mx-auto">
					<div className="mb-12">
						<h3 className="text-4xl font-bold text-slate-900">Sign in</h3>
					</div>

					<div>
						<div className="relative flex items-center">
							<input
								name="identifier"
								type="text"
								required
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								className="w-full text-sm border-b border-gray-300 focus:border-black pr-8 px-2 py-3 outline-none"
								placeholder="Username, email or phone"
							/>
						</div>
					</div>

					<div className="mt-8">
						<div className="relative flex items-center">
							<input
								name="password"
								type={showPassword ? 'text' : 'password'}
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full text-sm border-b border-gray-300 focus:border-black pr-8 px-2 py-3 outline-none"
								placeholder="Enter password"
							/>
							<button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2 text-sm text-slate-500">{showPassword ? 'Hide' : 'Show'}</button>
						</div>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-4 mt-6">
						<div className="flex items-center">
							<input id="remember-me" name="remember-me" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 shrink-0 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm" />
							<label htmlFor="remember-me" className="text-slate-600 ml-3 block text-sm">Remember me</label>
						</div>
						<div>
							<button type="button" onClick={() => { setMode('forgot'); setMessage(null) }} className="text-blue-600 font-medium text-sm hover:underline">Forgot Password?</button>
						</div>
					</div>

					<div className="mt-4">
						<button disabled={loading} type="submit" className="w-full shadow-xl py-2 px-4 text-[15px] font-medium tracking-wide rounded-md cursor-pointer text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">{loading ? 'Signing in...' : 'Sign in'}</button>
						<p className="text-slate-600 text-sm text-center mt-4">Don't have an account <button type="button" onClick={() => { setMode('register'); setMessage(null) }} className="text-blue-600 font-medium hover:underline ml-1 whitespace-nowrap">Register here</button></p>
						<p className="text-slate-600 text-sm text-center mt-2">Forgot your password? <button type="button" onClick={() => { setMode('forgot'); setMessage(null) }} className="text-blue-600 font-medium hover:underline ml-1 whitespace-nowrap">Reset here</button></p>
					</div>
					</form>
					)}

					{/* Forgot password form */}
					{mode === 'forgot' && (
						<form onSubmit={async (e) => {
							e.preventDefault(); setLoading(true); setMessage(null);
							try {
								const res = await api.post('/api/auth/forgot-password', { email: forgotEmail })
								const data = res?.data ?? {}
								setMessage({ type: res.status === 200 ? 'success' : 'error', text: data.message || 'If an account exists, a reset link was sent' });
							} catch (err) { setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Network error' }) } finally { setLoading(false) }
						}} className="md:max-w-md w-full mx-auto">
							<div className="mb-6">
								<h3 className="text-2xl font-semibold text-slate-900">Reset password</h3>
								<p className="text-sm text-slate-600 mt-2">Enter your email and we'll send a reset link.</p>
							</div>
							<div className="relative flex items-center">
								<input name="forgotEmail" type="email" required value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} className="w-full text-sm border-b border-gray-300 focus:border-black pr-8 px-2 py-3 outline-none" placeholder="Enter email" />
							</div>
							<div className="mt-6">
								<button disabled={loading} type="submit" className="w-full shadow-xl py-2 px-4 text-[15px] font-medium tracking-wide rounded-md cursor-pointer text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">{loading ? 'Sending...' : 'Send reset link'}</button>
							</div>
							<div className="mt-4 text-center">
								<button type="button" onClick={() => { setMode('login'); setMessage(null) }} className="text-sm text-slate-600 hover:underline">Back to sign in</button>
							</div>
						</form>
					)}

					{/* Register form */}
					{mode === 'register' && (
						<form onSubmit={async (e) => {
							e.preventDefault(); setLoading(true); setMessage(null);
							try {
								// employee selection is mandatory as requested
								if (!regEmployeeId) {
									setMessage({ type: 'error', text: 'Please select the employee this account will be linked to.' });
									setLoading(false);
									return;
								}
								// ensure employee id is sent to the users table to link accounts to employees
								const empId = regEmployeeId ? (Number.isNaN(Number(regEmployeeId)) ? regEmployeeId : Number(regEmployeeId)) : null;
								const payload = {
									username: regUsername,
									email: regEmail,
									password: regPassword,
									phoneNumber: regPhone,
									// send both common variants to maximize compatibility with backend shape
									employeeId: empId,
									EmployeeID: empId
								};
								const res = await api.post('/api/users', payload)
								const data = res?.data ?? {}
								if (res.status === 201 || (data && data.success)) {
									setMessage({ type: 'success', text: 'Registration successful' });
									// after successful registration, switch to login and prefill the identifier
									setMode('login');
									// prefer email as login identifier, fallback to username
									const identifierPrefill = regEmail || regUsername || '';
									setIdentifier(identifierPrefill);
									setPassword('');
								} else {
									setMessage({ type: 'error', text: data.message || data.error || 'Registration failed' });
								}
							} catch (err) { setMessage({ type: 'error', text: err.response?.data?.message ?? err.message ?? 'Network error' }) } finally { setLoading(false) }
						}} className="md:max-w-md w-full mx-auto">
							<div className="mb-6">
								<h3 className="text-2xl font-semibold text-slate-900">Create account</h3>
							</div>
							<div className="space-y-4">
								<input name="regUsername" value={regUsername} onChange={(e)=>setRegUsername(e.target.value)} required placeholder="Username" className="w-full text-sm border-b border-gray-300 focus:border-black pr-8 px-2 py-3 outline-none" />
								<input name="regEmail" value={regEmail} onChange={(e)=>setRegEmail(e.target.value)} required type="email" placeholder="Email" className="w-full text-sm border-b border-gray-300 focus:border-black pr-8 px-2 py-3 outline-none" />
								<input name="regPhone" value={regPhone} onChange={(e)=>setRegPhone(e.target.value)} placeholder="Phone (optional)" className="w-full text-sm border-b border-gray-300 focus:border-black pr-8 px-2 py-3 outline-none" />
								<input name="regPassword" value={regPassword} onChange={(e)=>setRegPassword(e.target.value)} required type="password" placeholder="Password" className="w-full text-sm border-b border-gray-300 focus:border-black pr-8 px-2 py-3 outline-none" />
								{/* Employee dropdown (mandatory) */}
								<select name="regEmployeeId" value={regEmployeeId} onChange={(e) => setRegEmployeeId(e.target.value)} required className="w-full text-sm border-b border-gray-300 focus:border-black pr-8 px-2 py-3 outline-none">
									<option value="">-- Select Employee (required) --</option>
									{employees.map(emp => (
										<option key={emp.EmployeeID ?? emp.employeeId ?? emp.id} value={emp.EmployeeID ?? emp.employeeId ?? emp.id}>
											{`${emp.EmployeeNumber ?? emp.employeeNumber ?? ''} - ${emp.FirstName ?? emp.firstName ?? ''} ${emp.FatherName ?? emp.fatherName ?? ''}`}
										</option>
									))}
								</select>
							</div>
							<div className="mt-6">
								<button disabled={loading} type="submit" className="w-full shadow-xl py-2 px-4 text-[15px] font-medium tracking-wide rounded-md cursor-pointer text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">{loading ? 'Creating...' : 'Create account'}</button>
							</div>
							<div className="mt-4 text-center">
								<button type="button" onClick={() => { setMode('login'); setMessage(null) }} className="text-sm text-slate-600 hover:underline">Back to sign in</button>
							</div>
						</form>
					)}
				</div>
				</div>
			</div>
		</div>
	)
}
