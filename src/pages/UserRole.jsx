import React, { useEffect, useState } from 'react'
import { Plus, Edit3, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

function getUserId(user) {
  return user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
}

export default function UserRole() {
  const { user, fetchWithAuth } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 25 })

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])

  const [form, setForm] = useState({ UserID: '', RoleID: '', EffectiveFrom: '', EffectiveTo: '', IsActive: true })
  const [saving, setSaving] = useState(false)

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '', processing: false })

  const [bulkModal, setBulkModal] = useState({ open: false, UserID: '', RoleAssignments: [], processing: false })

  const fetchList = async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth({ url: '/user-roles', method: 'get', params: { page, pageSize: pagination.pageSize } })
      const data = res.data && res.data.data ? res.data.data : res.data || []
      setItems(data.items || res.data || data || [])
      setPagination(prev => ({ ...prev, currentPage: page, totalCount: (res.data && res.data.totalCount) || (data.totalCount || (data.length || 0)) }))
    } catch (err) {
      console.error('fetchUserRoles error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load user roles' })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth({ url: '/users', method: 'get', params: { page: 1, pageSize: 1000 } })
      // Backend may return either { success:true, data: [...] } or a paginated shape { data: { items: [...] } }
      // or simply an array. Normalize these shapes to an array of users.
      const payload = res && res.data ? res.data : null
      let list = []
      if (!payload) list = []
      else if (Array.isArray(payload)) list = payload
      else if (payload.data && Array.isArray(payload.data)) list = payload.data
      else if (payload.data && payload.data.items && Array.isArray(payload.data.items)) list = payload.data.items
      else if (payload.items && Array.isArray(payload.items)) list = payload.items
      else list = []
      setUsers(list)
    } catch (err) {
      console.warn('fetchUsers', err)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await fetchWithAuth({ url: '/roles', method: 'get', params: { page: 1, pageSize: 1000 } })
      const data = res.data && res.data.data ? res.data.data : res.data || { items: [] }
      setRoles(data.items || [])
    } catch (err) {
      console.warn('fetchRoles', err)
    }
  }

  useEffect(() => { fetchList(1); fetchUsers(); fetchRoles() }, [])

  const resetForm = () => setForm({ UserID: '', RoleID: '', EffectiveFrom: '', EffectiveTo: '', IsActive: true })

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.UserID || !form.RoleID) { setMessage({ type: 'error', text: 'User and Role are required' }); return }
    const CreatedBy = getUserId(user)
    if (!CreatedBy) { setMessage({ type: 'error', text: 'You must be signed in to assign roles.' }); return }
    setSaving(true)
    try {
      const payload = { UserID: form.UserID, RoleID: form.RoleID, EffectiveFrom: form.EffectiveFrom || null, EffectiveTo: form.EffectiveTo || null, IsActive: form.IsActive ? 1 : 0, CreatedBy }
      await fetchWithAuth({ url: '/user-roles', method: 'post', data: payload })
      setMessage({ type: 'success', text: 'Role assigned to user' })
      resetForm()
      await fetchList(1)
    } catch (err) {
      console.error('createUserRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to assign role' })
    } finally { setSaving(false) }
  }

  const openEdit = (r) => setEditModal({ open: true, id: r.UserRoleID || r.Id || null, form: { EffectiveFrom: r.EffectiveFrom || '', EffectiveTo: r.EffectiveTo || '', IsActive: !!r.IsActive }, saving: false })

  const submitEdit = async () => {
    const { id, form: f } = editModal
    if (!id) return
    const UpdatedBy = getUserId(user)
    setEditModal(s => ({ ...s, saving: true }))
    try {
      await fetchWithAuth({ url: `/user-roles/${id}`, method: 'put', data: { EffectiveFrom: f.EffectiveFrom || null, EffectiveTo: f.EffectiveTo || null, IsActive: f.IsActive ? 1 : 0, UpdatedBy } })
      setMessage({ type: 'success', text: 'Updated' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('updateUserRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = (r) => setConfirm({ open: true, id: r.UserRoleID || r.Id || null, title: 'Delete role assignment', message: 'Remove this role from the user?', processing: false })

  const confirmExecute = async () => {
    if (!confirm.open) return
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const DeletedBy = getUserId(user)
      if (!DeletedBy) throw new Error('You must be signed in to remove roles.')
      await fetchWithAuth({ url: `/user-roles/${confirm.id}`, method: 'delete' })
      setMessage({ type: 'success', text: 'Removed' })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('deleteUserRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to remove role' })
    } finally { setConfirm({ open: false, id: null, title: '', message: '', processing: false }) }
  }

  const submitBulk = async () => {
    const b = bulkModal
    if (!b.UserID || !Array.isArray(b.RoleAssignments) || b.RoleAssignments.length === 0) { setMessage({ type: 'error', text: 'Select a user and at least one role' }); return }
    setBulkModal(s => ({ ...s, processing: true }))
    try {
      const CreatedBy = getUserId(user)
      await fetchWithAuth({ url: '/user-roles/bulk-assign', method: 'post', data: { UserID: b.UserID, RoleAssignments: b.RoleAssignments, CreatedBy } })
      setMessage({ type: 'success', text: 'Roles assigned' })
      setBulkModal({ open: false, UserID: '', RoleAssignments: [], processing: false })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('bulkAssign error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to assign roles' })
      setBulkModal(s => ({ ...s, processing: false }))
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">User Roles</h2>
          <p className="text-sm text-slate-500">Assign roles to users and manage user-role assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkModal(b => ({ ...b, open: true }))} className="px-3 py-2 border rounded">Bulk Assign</button>
          <button onClick={() => setEditModal({ open: true, id: null, form: { ...form }, saving: false })} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm"> <Plus className="h-4 w-4"/> New</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4">Assign Role</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">User</label>
              <select value={form.UserID || ''} onChange={(e) => setForm(f => ({ ...f, UserID: e.target.value }))} className="w-full px-3 py-2 border rounded">
                <option value="">-- Select user --</option>
                {users.map(u => <option key={u.UserID} value={u.UserID}>{u.Username || u.Email || u.username}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
              <select value={form.RoleID || ''} onChange={(e) => setForm(f => ({ ...f, RoleID: e.target.value }))} className="w-full px-3 py-2 border rounded">
                <option value="">-- Select role --</option>
                {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm block mb-1">Effective From</label>
              <input type="date" value={form.EffectiveFrom || ''} onChange={(e) => setForm(f => ({ ...f, EffectiveFrom: e.target.value }))} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="text-sm block mb-1">Effective To</label>
              <input type="date" value={form.EffectiveTo || ''} onChange={(e) => setForm(f => ({ ...f, EffectiveTo: e.target.value }))} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.IsActive} onChange={(e) => setForm(f => ({ ...f, IsActive: e.target.checked }))} className="form-checkbox h-4 w-4" />
                <span>Active</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md"> <Plus className="h-4 w-4"/> Create</button>
              <button type="button" onClick={resetForm} className="px-3 py-2 border rounded-md">Reset</button>
            </div>
            {message && (<div className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>)}
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm overflow-auto text-left">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">All User Roles</h3>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${pagination.totalCount || items.length || 0} assignments`}</div>
          </div>

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Effective From</th>
                  <th className="p-3">Effective To</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items && items.length === 0 && (<tr><td colSpan={6} className="p-3 text-slate-500">No assignments found.</td></tr>)}
                {items && items.map(r => (
                  <tr key={r.UserRoleID || r.Id || `${r.UserID}-${r.RoleID}`} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{r.Username || r.Email || r.User}</td>
                    <td className="p-3 align-top text-slate-600">{r.RoleName || r.Role}</td>
                    <td className="p-3 align-top">{r.EffectiveFrom || '-'}</td>
                    <td className="p-3 align-top">{r.EffectiveTo || '-'}</td>
                    <td className="p-3 align-top">{r.IsActive ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Edit3 className="h-4 w-4"/></button>
                        <button onClick={() => handleDelete(r)} className="p-2 rounded-md hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit` : 'Edit User Role'}>
        {editModal.form && (
          <div className="space-y-4">
            <div>
              <label className="text-sm block mb-1">Effective From</label>
              <input type="date" value={editModal.form.EffectiveFrom || ''} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, EffectiveFrom: e.target.value } }))} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="text-sm block mb-1">Effective To</label>
              <input type="date" value={editModal.form.EffectiveTo || ''} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, EffectiveTo: e.target.value } }))} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editModal.form.IsActive} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, IsActive: e.target.checked } }))} className="form-checkbox h-4 w-4" />
                <span>Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal({ open: false, id: null, form: null })} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={submitEdit} disabled={editModal.saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{editModal.saving ? 'Saving...' : 'Update'}</button>
            </div>
            {message && (<div className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>)}
          </div>
        )}
      </Modal>

      <Modal open={bulkModal.open} onClose={() => setBulkModal({ open: false, UserID: '', RoleAssignments: [], processing: false })} title="Bulk Assign Roles">
        <div className="space-y-4">
          <div>
            <label className="text-sm block mb-1">User</label>
            <select value={bulkModal.UserID || ''} onChange={(e) => setBulkModal(b => ({ ...b, UserID: e.target.value }))} className="w-full px-3 py-2 border rounded">
              <option value="">-- Select user --</option>
              {users.map(u => <option key={u.UserID} value={u.UserID}>{u.Username || u.Email}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Roles</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border p-2 rounded">
              {roles.map(r => (
                <label key={r.RoleID} className="flex items-center gap-2"><input type="checkbox" checked={bulkModal.RoleAssignments.some(x => x.RoleID === r.RoleID)} onChange={(e) => setBulkModal(b => ({ ...b, RoleAssignments: e.target.checked ? [...b.RoleAssignments, { RoleID: r.RoleID }] : b.RoleAssignments.filter(x => x.RoleID !== r.RoleID) }))} />{r.RoleName}</label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setBulkModal({ open: false, UserID: '', RoleAssignments: [], processing: false })} className="px-3 py-2 border rounded">Cancel</button>
            <button onClick={submitBulk} disabled={bulkModal.processing} className="px-3 py-2 bg-indigo-600 text-white rounded">{bulkModal.processing ? 'Processing...' : 'Assign'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, id: null, title: '', message: '', processing: false })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
