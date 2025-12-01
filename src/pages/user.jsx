import React, { useEffect, useState, useRef } from 'react'
import { Plus, Edit3, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

function getUserId(user) {
  return user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
}

export default function UserPage() {
  const { user, fetchWithAuth } = useAuth()
  const isAdmin = !!(user && ((user.Roles && user.Roles.includes && user.Roles.includes('ROLE_ADMIN' || 'ROLE_SUPER_ADMIN')) || (user.roles && user.roles.some && user.roles.some(r => r === 'ROLE_ADMIN' || r.Name === 'ROLE_ADMIN')) || user.IsAdmin || user.IsAdministrator || user.Role === 'ROLE_ADMIN'))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 25 })

  const [form, setForm] = useState({ Username: '', Email: '', Password: '', PhoneNumber: '', EmployeeID: '', IsActive: true })
  const [validation, setValidation] = useState({ usernameExists: false, emailExists: false, phoneExists: false, checking: false })
  const [saving, setSaving] = useState(false)

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '', processing: false })

  const [employees, setEmployees] = useState([])

  const fetchList = async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth({ url: '/users', method: 'get', params: { page, pageSize: pagination.pageSize }, redirectOnFail: false })
      const payload = res && res.data ? res.data : null
      const body = payload && payload.data ? payload.data : payload
      let list = []
      let total = 0

      if (Array.isArray(body)) {
        list = body
        total = body.length
      } else if (body && Array.isArray(body.items)) {
        list = body.items
        total = (body.pagination && body.pagination.totalCount) || body.totalCount || list.length
      } else if (Array.isArray(payload)) {
        list = payload
        total = payload.length
      } else {
        list = []
        total = 0
      }

      setItems(list)
      setPagination(prev => ({ ...prev, currentPage: page, totalCount: total || prev.totalCount }))
    } catch (err) {
      console.error('fetchUsers error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load users' })
    } finally { setLoading(false) }
  }

  const fetchEmployees = async () => {
    try {
      // Use advisor active endpoint to fetch active employees for dropdowns
      // fetchWithAuth builds the full URL using the API_BASE in AuthProvider
      const res = await fetchWithAuth({ url: '/advisor/active', method: 'get', redirectOnFail: false })
      const payload = res && res.data ? res.data : null
      const body = payload && payload.data ? payload.data : payload
      let list = []
      if (Array.isArray(body)) list = body
      else if (body && Array.isArray(body.items)) list = body.items
      else list = []
      // Normalize employee shape to ensure dropdown shows EmployeeNumber and names
      const normalizeEmp = (e) => {
        const raw = e || {}
        const employeeId = raw.EmployeeID || raw.EmployeeId || raw.employeeId || (raw.raw && (raw.raw.EmployeeID || raw.raw.employeeId)) || raw.UserID || raw.Id || raw.id || ''
        const employeeNumber = raw.EmployeeNumber || raw.EmployeeNo || raw.Employee_Num || (raw.raw && (raw.raw.EmployeeNumber || raw.raw.EmployeeNo)) || ''
        const firstName = raw.FirstName || raw.firstName || (raw.raw && (raw.raw.FirstName || raw.raw.firstName)) || ''
        const fatherName = raw.FatherName || raw.fatherName || (raw.raw && (raw.raw.FatherName || raw.raw.fatherName)) || ''
        const fullName = raw.FullName || raw.Name || raw.DisplayName || `${firstName} ${fatherName}`.trim() || ''
        return { EmployeeID: employeeId, EmployeeNumber: employeeNumber, FirstName: firstName, FatherName: fatherName, FullName: fullName, raw: raw }
      }

      const normalized = list.map(normalizeEmp)
      console.debug('fetchEmployees: normalized sample', normalized[0] || null)
      setEmployees(normalized)
    } catch (err) {
      console.warn('fetchEmployees', err)
    }
  }

  // Fetch basic user info for a selected employee and populate the form fields
  const fetchEmployeeBasicInfo = async (employeeId, target = 'new') => {
    if (!employeeId) return
    try {
      console.debug('fetchEmployeeBasicInfo: requesting', employeeId)
      const res = await fetchWithAuth({ url: `/employees/${encodeURIComponent(employeeId)}/basic`, method: 'get', redirectOnFail: false })

      // normalize response shape whether fetchWithAuth returns axios-like wrapper or parsed JSON
      const payload = (res && res.data !== undefined) ? res.data : res
      const data = (payload && payload.data !== undefined) ? payload.data : payload
      console.debug('fetchEmployeeBasicInfo: response', { res, payload, data })

      if (data) {
        if (target === 'new') {
          setForm(f => ({ ...f, Username: data.Username || '', Email: data.Email || '', PhoneNumber: data.PhoneNumber || '' }))
          // Run identifier check for prefilled values
          checkIdentifiers({ Username: data.Username || '', Email: data.Email || '', PhoneNumber: data.PhoneNumber || '' })
        } else if (target === 'edit') {
          setEditModal(s => ({ ...s, form: { ...s.form, Username: data.Username || '', Email: data.Email || '', PhoneNumber: data.PhoneNumber || '' } }))
          checkIdentifiers({ Username: data.Username || '', Email: data.Email || '', PhoneNumber: data.PhoneNumber || '' }, editModal.id)
        }
      } else {
        // Not found or no user account for this employee - clear user fields so creation can proceed
        if (target === 'new') setForm(f => ({ ...f, Username: '', Email: '', PhoneNumber: '' }))
        else setEditModal(s => ({ ...s, form: { ...s.form, Username: '', Email: '', PhoneNumber: '' } }))
      }
    } catch (err) {
      const status = err?.response?.status || err?.status || null
      if (status === 404) {
        if (target === 'new') setForm(f => ({ ...f, Username: '', Email: '', PhoneNumber: '' }))
        else setEditModal(s => ({ ...s, form: { ...s.form, Username: '', Email: '', PhoneNumber: '' } }))
        return
      }
      console.error('fetchEmployeeBasicInfo error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load employee info' })
    }
  }

  // Debounced identifier checker to call POST /auth/check-identifier
  const checkTimeoutRef = useRef(null)
  const checkIdentifiers = async (payload = {}, excludeUserId = null) => {
    // Cancel previous
    try { if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current) } catch (e) {}
    checkTimeoutRef.current = setTimeout(async () => {
      const p = { Username: payload.Username || form.Username || '', Email: payload.Email || form.Email || '', PhoneNumber: payload.PhoneNumber || form.PhoneNumber || '' }
      if (!p.Username && !p.Email && !p.PhoneNumber) return setValidation({ usernameExists: false, emailExists: false, phoneExists: false, checking: false })
      setValidation(v => ({ ...v, checking: true }))
      try {
        const body = { Username: p.Username || null, Email: p.Email || null, PhoneNumber: p.PhoneNumber || null }
        if (excludeUserId) body.ExcludeUserID = excludeUserId
        const res = await fetchWithAuth({ url: '/auth/check-identifier', method: 'post', data: body, redirectOnFail: false })
        const payloadRes = (res && res.data !== undefined) ? res.data : res
        const details = payloadRes && payloadRes.details ? payloadRes.details : (Array.isArray(payloadRes) ? payloadRes : [])
        // Determine conflicts by matching returned rows
        let usernameExists = false, emailExists = false, phoneExists = false
        if (Array.isArray(details) && details.length > 0) {
          for (const d of details) {
            const u = (d.Username || d.username || '').toString().toLowerCase()
            const e = (d.Email || d.email || '').toString().toLowerCase()
            const pnum = (d.PhoneNumber || d.phoneNumber || d.phone || '').toString()
            if (p.Username && u && p.Username.toLowerCase() === u) usernameExists = true
            if (p.Email && e && p.Email.toLowerCase() === e) emailExists = true
            if (p.PhoneNumber && pnum && p.PhoneNumber === pnum) phoneExists = true
          }
        }
        setValidation({ usernameExists, emailExists, phoneExists, checking: false })
      } catch (err) {
        console.debug('checkIdentifiers failed', err)
        setValidation(v => ({ ...v, checking: false }))
      }
    }, 350)
  }

  useEffect(() => { fetchList(1); fetchEmployees() }, [])

  const resetForm = () => { setForm({ Username: '', Email: '', Password: '', PhoneNumber: '', EmployeeID: '', IsActive: true }); setValidation({ usernameExists: false, emailExists: false, phoneExists: false, checking: false }) }

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.Username || !form.Email || !form.Password) { setMessage({ type: 'error', text: 'Username, Email and Password are required' }); return }
    if (!form.EmployeeID) { setMessage({ type: 'error', text: 'Employee selection is required' }); return }
    const CreatedBy = getUserId(user) || null
    setSaving(true)
    try {
      const payload = {
        Username: form.Username,
        Email: form.Email,
        Password: form.Password,
        PhoneNumber: form.PhoneNumber || null,
        EmployeeID: form.EmployeeID || null,
        CreatedBy
      }
      await fetchWithAuth({ url: '/users', method: 'post', data: payload, redirectOnFail: false })
      setMessage({ type: 'success', text: 'User created' })
      resetForm()
      await fetchList(1)
    } catch (err) {
      console.error('createUser error', err)
      const status = err?.response?.status
      const dbMsg = err?.response?.data?.message || err?.response?.data || err.message || ''
      // Map server responses from the stored procedure to friendly messages
      if (status === 400) {
        setMessage({ type: 'error', text: dbMsg || 'Invalid request (check password policy and inputs).' })
      } else if (status === 404) {
        setMessage({ type: 'error', text: dbMsg || 'Employee not found or not active.' })
      } else if (status === 409) {
        // Conflict can be: username exists, email exists, or employee already has account
        if (typeof dbMsg === 'string' && dbMsg.toLowerCase().includes('employee')) {
          setMessage({ type: 'error', text: 'Selected employee already has a user account.' })
        } else if (typeof dbMsg === 'string' && dbMsg.toLowerCase().includes('username')) {
          setMessage({ type: 'error', text: 'Username already exists.' })
        } else if (typeof dbMsg === 'string' && dbMsg.toLowerCase().includes('email')) {
          setMessage({ type: 'error', text: 'Email already exists.' })
        } else {
          setMessage({ type: 'error', text: dbMsg || 'Conflict creating user.' })
        }
      } else {
        setMessage({ type: 'error', text: dbMsg || 'Failed to create user' })
      }
    } finally { setSaving(false) }
  }

  const openEdit = (u) => setEditModal({ open: true, id: u.UserID || u.id || null, form: { Username: u.Username || '', Email: u.Email || '', PhoneNumber: u.PhoneNumber || '', EmployeeID: u.EmployeeID || u.EmployeeId || '', IsActive: !!u.IsActive }, saving: false })
  // If admin, fetch user's roles when opening the edit modal
  const fetchUserRoles = async (userId) => {
    if (!userId) return
    try {
      const res = await fetchWithAuth({ url: `/users/${encodeURIComponent(userId)}/roles`, method: 'get', redirectOnFail: false })
      const payload = res && res.data !== undefined ? res.data : res
      const data = payload && payload.data !== undefined ? payload.data : payload
      const roles = Array.isArray(data) ? data : (data && data.items ? data.items : [])
      setEditModal(s => ({ ...s, roles }))
    } catch (err) {
      console.warn('fetchUserRoles failed', err)
      setEditModal(s => ({ ...s, roles: [] }))
    }
  }

  // ensure roles are loaded when modal opens for admins
  useEffect(() => {
    if (editModal.open && editModal.id && isAdmin) {
      fetchUserRoles(editModal.id)
    }
  }, [editModal.open, editModal.id, isAdmin])
  // Run identifier validation when opening edit modal
  useEffect(() => {
    if (editModal.open && editModal.form) {
      checkIdentifiers({ Username: editModal.form.Username || '', Email: editModal.form.Email || '', PhoneNumber: editModal.form.PhoneNumber || '' }, editModal.id)
    } else if (!editModal.open) {
      // clear validation when modal closed
      setValidation({ usernameExists: false, emailExists: false, phoneExists: false, checking: false })
    }
  }, [editModal.open])

  const submitEdit = async () => {
    const { id, form: f } = editModal
    if (!id) return
    const UpdatedBy = getUserId(user)
    setEditModal(s => ({ ...s, saving: true }))
    try {
      const payload = { UserID: id, Username: f.Username, Email: f.Email, PhoneNumber: f.PhoneNumber || null, EmployeeID: f.EmployeeID || null, IsActive: f.IsActive ? 1 : 0, UpdatedBy }
      await fetchWithAuth({ url: '/users/profile', method: 'put', data: payload })
      setMessage({ type: 'success', text: 'User updated' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('updateUser error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = (u) => setConfirm({ open: true, id: u.UserID || u.id || null, title: 'Delete user', message: `Soft-delete user ${u.Username || u.Email || ''}?`, processing: false })

  // Admin: deactivate/reactivate user
  const handleToggleActive = (u) => {
    const id = u.UserID || u.id || null
    if (!id) return
    const willDeactivate = !!u.IsActive
    setConfirm({ open: true, id, title: willDeactivate ? 'Deactivate user' : 'Reactivate user', message: `${willDeactivate ? 'Deactivate' : 'Reactivate'} user ${u.Username || u.Email || ''}?`, processing: false, action: 'toggleActive', target: willDeactivate ? 'deactivate' : 'reactivate' })
  }

  const confirmExecute = async () => {
    if (!confirm.open) return
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const actor = getUserId(user)
      if (!actor) throw new Error('You must be signed in to perform this action.')

      // Toggle active (deactivate/reactivate)
      if (confirm.action === 'toggleActive' && confirm.target) {
        const url = `/users/${confirm.target}` // expects /users/deactivate or /users/reactivate
        await fetchWithAuth({ url, method: 'post', data: { UserID: confirm.id, UpdatedBy: actor } })
        setMessage({ type: 'success', text: `${confirm.target === 'deactivate' ? 'User deactivated' : 'User reactivated'}` })
        await fetchList(pagination.currentPage)
        return
      }

      // Default: delete
      if (confirm.action === 'delete' || !confirm.action) {
        await fetchWithAuth({ url: '/users', method: 'delete', data: { UserID: confirm.id, DeletedBy: actor } })
        setMessage({ type: 'success', text: 'User deleted' })
        await fetchList(pagination.currentPage)
        return
      }
    } catch (err) {
      console.error('confirm action error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to perform action' })
    } finally {
      setConfirm({ open: false, id: null, title: '', message: '', processing: false })
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500">Create and manage user accounts.</p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4">New User</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Username</label>
              <input value={form.Username} onChange={(e) => { const v = e.target.value; setForm(f => ({ ...f, Username: v })); checkIdentifiers({ Username: v, Email: form.Email, PhoneNumber: form.PhoneNumber }) }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
              {validation.usernameExists && <div className="text-xs text-red-600 mt-1">Username already exists.</div>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
              <input value={form.Email} onChange={(e) => { const v = e.target.value; setForm(f => ({ ...f, Email: v })); checkIdentifiers({ Username: form.Username, Email: v, PhoneNumber: form.PhoneNumber }) }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
              {validation.emailExists && <div className="text-xs text-red-600 mt-1">Email already exists.</div>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
              <input type="password" value={form.Password} onChange={(e) => setForm(f => ({ ...f, Password: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Phone</label>
              <input value={form.PhoneNumber} onChange={(e) => { const v = e.target.value; setForm(f => ({ ...f, PhoneNumber: v })); checkIdentifiers({ Username: form.Username, Email: form.Email, PhoneNumber: v }) }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
              {validation.phoneExists && <div className="text-xs text-red-600 mt-1">Phone number already exists.</div>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Employee</label>
              <select
                value={form.EmployeeID || ''}
                onChange={async (e) => {
                  const val = e.target.value
                  setForm(f => ({ ...f, EmployeeID: val }))
                  if (val) await fetchEmployeeBasicInfo(val, 'new')
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">-- Select employee --</option>
                {(Array.isArray(employees) ? employees : []).map((emp, idx) => {
                  // Prefer employee-specific fields. Display EmployeeNumber - FirstName FatherName when present.
                  const id = emp.EmployeeID ?? emp.EmployeeId ?? emp.employeeId ?? emp.Id ?? emp.id ?? ''
                  const empNo = (emp.EmployeeNumber || emp.EmployeeNo || emp.Employee_Num || '').toString().trim()
                  const first = (emp.FirstName || '').toString().trim()
                  const father = (emp.FatherName || '').toString().trim()
                  const person = [first, father].filter(Boolean).join(' ').trim()
                  const fallbackParts = [emp.GrandFatherName, emp.FullName, emp.Name, emp.DisplayName].filter(Boolean)
                  const namePart = person || (fallbackParts.length ? fallbackParts.join(' ') : (emp.FirstName || id))
                  // Format exactly as: EmployeeNumber, FirstName, FatherName when available
                  const label = empNo ? (first || father ? `${empNo}, ${first}${first && father ? ', ' : ''}${father}` : empNo) : namePart
                  const optKey = id || empNo || namePart || String(idx)
                  return <option key={optKey} value={id}>{label}</option>
                })}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.IsActive} onChange={(e) => setForm(f => ({ ...f, IsActive: e.target.checked }))} className="form-checkbox" /> Active</label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving || !form.Username || !form.Email || !form.Password || !form.EmployeeID || validation.usernameExists || validation.emailExists || validation.phoneExists}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md"
              >
                <Plus className="h-4 w-4"/> Create
              </button>
              <button type="button" onClick={resetForm} className="px-3 py-2 border rounded-md">Reset</button>
            </div>
            {message && (<div className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>)}
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm overflow-auto text-left">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">All Users</h3>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${pagination.totalCount || items.length || 0} users`}</div>
          </div>

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Username</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(items) && items.length === 0) && (<tr><td colSpan={5} className="p-3 text-slate-500">No users found.</td></tr>)}
                {(Array.isArray(items) ? items : []).map(u => (
                  <tr key={u.UserID || u.Id} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{u.Username}</td>
                    <td className="p-3 align-top text-slate-600">{u.Email}</td>
                    <td className="p-3 align-top text-slate-600">{u.PhoneNumber || '-'}</td>
                    <td className="p-3 align-top">{u.IsActive ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Edit3 className="h-4 w-4"/></button>
                        <button onClick={() => handleDelete(u)} className="p-2 rounded-md hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4"/></button>
                        {isAdmin && (
                          <button onClick={() => handleToggleActive(u)} className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200" title={u.IsActive ? 'Deactivate' : 'Reactivate'}>{u.IsActive ? 'Deactivate' : 'Reactivate'}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.id ? 'Edit User' : 'Create User'}>
        {editModal.form && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Username</label>
              <input value={editModal.form.Username} onChange={(e) => { const v = e.target.value; setEditModal(s => ({ ...s, form: { ...s.form, Username: v } })); checkIdentifiers({ Username: v, Email: editModal.form.Email, PhoneNumber: editModal.form.PhoneNumber }, editModal.id) }} className="w-full px-3 py-2 border rounded" />
              {validation.usernameExists && <div className="text-xs text-red-600 mt-1">Username already exists.</div>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
              <input value={editModal.form.Email} onChange={(e) => { const v = e.target.value; setEditModal(s => ({ ...s, form: { ...s.form, Email: v } })); checkIdentifiers({ Username: editModal.form.Username, Email: v, PhoneNumber: editModal.form.PhoneNumber }, editModal.id) }} className="w-full px-3 py-2 border rounded" />
              {validation.emailExists && <div className="text-xs text-red-600 mt-1">Email already exists.</div>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Phone</label>
              <input value={editModal.form.PhoneNumber} onChange={(e) => { const v = e.target.value; setEditModal(s => ({ ...s, form: { ...s.form, PhoneNumber: v } })); checkIdentifiers({ Username: editModal.form.Username, Email: editModal.form.Email, PhoneNumber: v }, editModal.id) }} className="w-full px-3 py-2 border rounded" />
              {validation.phoneExists && <div className="text-xs text-red-600 mt-1">Phone number already exists.</div>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Employee</label>
              <select
                value={editModal.form.EmployeeID || ''}
                onChange={async (e) => {
                  const val = e.target.value
                  setEditModal(s => ({ ...s, form: { ...s.form, EmployeeID: val } }))
                  if (val) await fetchEmployeeBasicInfo(val, 'edit')
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">-- Select employee --</option>
                {(Array.isArray(employees) ? employees : []).map((emp, idx) => {
                  const id = emp.EmployeeID ?? emp.EmployeeId ?? emp.employeeId ?? emp.Id ?? emp.id ?? ''
                  const empNo = (emp.EmployeeNumber || emp.EmployeeNo || emp.Employee_Num || '').toString().trim()
                  const first = (emp.FirstName || '').toString().trim()
                  const father = (emp.FatherName || '').toString().trim()
                  const person = [first, father].filter(Boolean).join(' ').trim()
                  const fallbackParts = [emp.GrandFatherName, emp.FullName, emp.Name, emp.DisplayName].filter(Boolean)
                  const namePart = person || (fallbackParts.length ? fallbackParts.join(' ') : (emp.FirstName || id))
                  const label = empNo ? (first || father ? `${empNo}, ${first}${first && father ? ', ' : ''}${father}` : empNo) : namePart
                  const optKey = id || empNo || namePart || String(idx)
                  return <option key={optKey} value={id}>{label}</option>
                })}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editModal.form.IsActive} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, IsActive: e.target.checked } }))} className="form-checkbox" /> Active</label>
            </div>
            {isAdmin && editModal.id && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Roles</h4>
                  <button onClick={() => fetchUserRoles(editModal.id)} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Refresh</button>
                </div>
                <div className="text-sm text-slate-700">
                  {(Array.isArray(editModal.roles) && editModal.roles.length > 0) ? (
                    <ul className="list-disc pl-5">
                      {editModal.roles.map((r, idx) => <li key={idx}>{r.RoleName || r.Name || r.Role || (typeof r === 'string' ? r : JSON.stringify(r))}</li>)}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-500">No roles assigned.</div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal({ open: false, id: null, form: null })} className="px-4 py-2 rounded border">Cancel</button>
              {editModal.id ? (
                <button onClick={submitEdit} disabled={editModal.saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{editModal.saving ? 'Saving...' : 'Update'}</button>
              ) : (
                <button onClick={async () => {
                  // Create from modal
                  setEditModal(s => ({ ...s, saving: true }))
                  try {
                    const f = editModal.form || {}
                    if (!f.Username || !f.Email || !f.Password || !f.EmployeeID) {
                      setMessage({ type: 'error', text: 'Username, Email, Password and Employee are required.' })
                      setEditModal(s => ({ ...s, saving: false }))
                      return
                    }
                    const CreatedBy = getUserId(user) || null
                    const payload = { Username: f.Username, Email: f.Email, Password: f.Password, PhoneNumber: f.PhoneNumber || null, EmployeeID: f.EmployeeID || null, CreatedBy }
                    await fetchWithAuth({ url: '/users', method: 'post', data: payload, redirectOnFail: false })
                    setMessage({ type: 'success', text: 'User created' })
                    setEditModal({ open: false, id: null, form: null, saving: false })
                    await fetchList(1)
                  } catch (err) {
                    console.error('modal create user error', err)
                    const status = err?.response?.status
                    const dbMsg = err?.response?.data?.message || err?.response?.data || err.message || ''
                    if (status === 409) {
                      if (typeof dbMsg === 'string' && dbMsg.toLowerCase().includes('employee')) setMessage({ type: 'error', text: 'Selected employee already has a user account.' })
                      else if (typeof dbMsg === 'string' && dbMsg.toLowerCase().includes('username')) setMessage({ type: 'error', text: 'Username already exists.' })
                      else if (typeof dbMsg === 'string' && dbMsg.toLowerCase().includes('email')) setMessage({ type: 'error', text: 'Email already exists.' })
                      else setMessage({ type: 'error', text: dbMsg || 'Conflict creating user.' })
                    } else if (status === 400) setMessage({ type: 'error', text: dbMsg || 'Invalid request (check password policy and inputs).' })
                    else setMessage({ type: 'error', text: dbMsg || 'Failed to create user' })
                    setEditModal(s => ({ ...s, saving: false }))
                  }
                }} disabled={editModal.saving || validation.usernameExists || validation.emailExists || validation.phoneExists} className="px-4 py-2 bg-indigo-600 text-white rounded">{editModal.saving ? 'Saving...' : 'Create'}</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, id: null, title: '', message: '', processing: false })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
