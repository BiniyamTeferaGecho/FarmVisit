import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Plus, Edit3, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:80/api'

function getUserId(user) {
  return user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
}

export default function Role() {
  const { user, fetchWithAuth } = useAuth()
  const [roles, setRoles] = useState([])
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 25 })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({ RoleName: '', RoleDescription: '', IsActive: true, IsSystemRole: false })
  const [saving, setSaving] = useState(false)

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '', processing: false })

  const fetchRoles = async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth({ url: '/roles', method: 'get', params: { page, pageSize: pagination.pageSize, q: search } })
      const data = res.data && res.data.data ? res.data.data : res.data || { items: [] }
      setRoles(data.items || [])
      setPagination(data.pagination || { totalCount: data.items.length || 0, currentPage: page, pageSize: pagination.pageSize })
    } catch (err) {
      console.error('fetchRoles error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load roles' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoles(pagination.currentPage) }, [])

  const resetForm = () => setForm({ RoleName: '', RoleDescription: '', IsActive: true, IsSystemRole: false })

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.RoleName) { setMessage({ type: 'error', text: 'Role name is required' }); return }
    const createdBy = getUserId(user)
    if (!createdBy) { setMessage({ type: 'error', text: 'You must be signed in to create roles.' }); return }
    setSaving(true)
    try {
      const payload = {
        RoleName: form.RoleName.trim(),
        RoleDescription: form.RoleDescription || null,
        IsSystemRole: form.IsSystemRole ? 1 : 0,
        IsActive: form.IsActive ? 1 : 0,
        CreatedBy: createdBy,
      }
      const res = await fetchWithAuth({ url: '/roles', method: 'post', data: payload })
      setMessage({ type: 'success', text: 'Role created' })
      resetForm()
      await fetchRoles(1)
    } catch (err) {
      console.error('createRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create role' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (r) => {
    setEditModal({ open: true, id: r.RoleID, form: { RoleName: r.RoleName, RoleDescription: r.RoleDescription || '', IsActive: !!r.IsActive, IsSystemRole: !!r.IsSystemRole }, saving: false })
  }

  const submitEdit = async () => {
    const { id, form: f } = editModal
    if (!f.RoleName) { setMessage({ type: 'error', text: 'Role name is required' }); return }
    const updatedBy = getUserId(user)
    if (!updatedBy) { setMessage({ type: 'error', text: 'You must be signed in to update roles.' }); return }
    setEditModal(s => ({ ...s, saving: true }))
    try {
      const payload = { RoleName: f.RoleName.trim(), RoleDescription: f.RoleDescription || null, IsActive: f.IsActive ? 1 : 0, UpdatedBy: updatedBy }
      const res = await fetchWithAuth({ url: `/roles/${id}`, method: 'patch', data: payload })
      setMessage({ type: 'success', text: 'Role updated' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await fetchRoles(pagination.currentPage)
    } catch (err) {
      console.error('updateRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update role' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = (r) => {
    setConfirm({ open: true, id: r.RoleID, title: `Delete ${r.RoleName}`, message: 'Soft-delete this role?', processing: false })
  }

  const confirmExecute = async () => {
    if (!confirm.open) return
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const deletedBy = getUserId(user)
      if (!deletedBy) throw new Error('You must be signed in to delete roles.')
        await fetchWithAuth({ url: `/roles/${confirm.id}/delete`, method: 'post', data: { DeletedBy: deletedBy } })
      setMessage({ type: 'success', text: 'Role deleted' })
      await fetchRoles(pagination.currentPage)
    } catch (err) {
      console.error('deleteRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to delete role' })
    } finally {
      setConfirm({ open: false, id: null, title: '', message: '', processing: false })
    }
  }

  const checkNameExists = async (name, excludeId = null) => {
    if (!name) return false
    try {
      const res = await fetchWithAuth({ url: '/roles/check-name', method: 'get', params: { RoleName: name, ExcludeRoleID: excludeId } })
      return res?.data?.data?.exists || false
    } catch (err) {
      return false
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Roles</h2>
          <p className="text-sm text-slate-500">Create and manage application roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border rounded" />
          <button onClick={() => fetchRoles(1)} className="px-3 py-2 bg-white border rounded-md text-sm">Search</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4">New Role</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Role Name</label>
              <input value={form.RoleName} onChange={(e) => setForm({ ...form, RoleName: e.target.value })} onBlur={async (e) => {
                const exists = await checkNameExists(e.target.value || '')
                if (exists) setMessage({ type: 'error', text: 'Role name already exists' })
              }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={form.RoleDescription} onChange={(e) => setForm({ ...form, RoleDescription: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.IsSystemRole} onChange={(e) => setForm({ ...form, IsSystemRole: e.target.checked })} className="form-checkbox h-4 w-4" />
                <span>System Role</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.IsActive} onChange={(e) => setForm({ ...form, IsActive: e.target.checked })} className="form-checkbox h-4 w-4" />
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
            <h3 className="text-lg font-medium">All Roles</h3>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${pagination.totalCount || 0} roles`}</div>
          </div>

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Name</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">System</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles && roles.length === 0 && (<tr><td colSpan={5} className="p-3 text-slate-500">No roles found.</td></tr>)}
                {roles && roles.map(r => (
                  <tr key={r.RoleID} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{r.RoleName}</td>
                    <td className="p-3 align-top text-slate-600">{r.RoleDescription || '-'}</td>
                    <td className="p-3 align-top">{r.IsSystemRole ? <span className="text-red-600">Yes</span> : <span className="text-green-600">No</span>}</td>
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

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit: ${editModal.form.RoleName}` : 'Edit Role'}>
        {editModal.form && (
          <div className="space-y-4">
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Role Name</label>
              <input value={editModal.form.RoleName} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, RoleName: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={editModal.form.RoleDescription} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, RoleDescription: e.target.value } }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editModal.form.IsSystemRole} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, IsSystemRole: e.target.checked } }))} className="form-checkbox h-4 w-4" />
                <span>System Role</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editModal.form.IsActive} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, IsActive: e.target.checked } }))} className="form-checkbox h-4 w-4" />
                <span>Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal({ open: false, id: null, form: null })} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={submitEdit} disabled={editModal.saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{editModal.saving ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, id: null, title: '', message: '', processing: false })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
