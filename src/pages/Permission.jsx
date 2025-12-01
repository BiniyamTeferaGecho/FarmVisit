import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Plus, Edit3, Trash2, Eye } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:3000/api'

const MODULE_OPTIONS = ['System', 'Reports', 'Employee', 'RoleManagement', 'UserManagement']

function getUserId(user) {
  return user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
}

// GUID validator
const isGuid = (v) => {
  if (!v || typeof v !== 'string') return false
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)
}

export default function Permission() {
  const { user } = useAuth()
  const { fetchWithAuth } = useAuth()
  const [permissions, setPermissions] = useState([])
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 25 })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [subModuleFilter, setSubModuleFilter] = useState('')

  const [form, setForm] = useState({ PermissionCode: '', PermissionName: '', PermissionDescription: '', Module: '', SubModule: '', IsActive: true })
  const [saving, setSaving] = useState(false)

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [viewModal, setViewModal] = useState({ open: false, id: null, data: null })
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '', processing: false })

  const fetchPermissions = async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, pageSize: pagination.pageSize, q: search }
      if (moduleFilter) params.module = moduleFilter
      if (subModuleFilter) params.subModule = subModuleFilter
      const res = await fetchWithAuth({ url: '/permissions', method: 'get', params })
      const data = res.data && res.data.data ? res.data.data : res.data || { items: [] }
      const rawItems = data.items || []
      // Normalize PermissionID from commonly used keys to avoid missing/invalid id issues
      const mapped = rawItems.map(it => {
        const pid = it.PermissionID || it.permissionID || it.PermissionId || it.permissionId || it.id || it.Id || null
        return { ...it, PermissionID: pid }
      })
      // Debug: log any items missing a PermissionID
      const missing = mapped.filter(i => !i.PermissionID)
      if (missing.length) console.warn('fetchPermissions: items missing PermissionID', missing.slice(0,5))
      console.debug('fetchPermissions: loaded PermissionIDs', mapped.slice(0,5).map(i => i.PermissionID))
      setPermissions(mapped)
      setPagination(data.pagination || { totalCount: data.items.length || 0, currentPage: page, pageSize: pagination.pageSize })
    } catch (err) {
      console.error('fetchPermissions error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load permissions' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPermissions(pagination.currentPage) }, [])

  const resetForm = () => setForm({ PermissionCode: '', PermissionName: '', PermissionDescription: '', Module: '', SubModule: '', IsActive: true })

  const checkCodeExists = async (code, excludeId = null) => {
    if (!code) return false
    try {
      const params = { PermissionCode: code }
      if (excludeId && isGuid(excludeId)) params.ExcludePermissionID = excludeId
      const res = await fetchWithAuth({ url: '/permissions/check-code', method: 'get', params, redirectOnFail: false })
      return res?.data?.data?.exists || false
    } catch (err) {
      return false
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.PermissionCode || !form.PermissionName || !form.Module) { setMessage({ type: 'error', text: 'Code, Name and Module are required' }); return }
    const createdBy = getUserId(user)
    if (!createdBy) { setMessage({ type: 'error', text: 'You must be signed in to create permissions.' }); return }
    setSaving(true)
    try {
      const exists = await checkCodeExists(form.PermissionCode)
      if (exists) { setMessage({ type: 'error', text: 'Permission code already exists' }); setSaving(false); return }
      const payload = {
        PermissionCode: form.PermissionCode.trim(),
        PermissionName: form.PermissionName.trim(),
        PermissionDescription: form.PermissionDescription || null,
        Module: form.Module,
        SubModule: form.SubModule || null,
        IsActive: form.IsActive ? 1 : 0,
        CreatedBy: createdBy,
      }
      await fetchWithAuth({ url: '/permissions', method: 'post', data: payload })
      setMessage({ type: 'success', text: 'Permission created' })
      resetForm()
      await fetchPermissions(1)
    } catch (err) {
      console.error('createPermission error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create permission' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (p) => {
    setEditModal({ open: true, id: p.PermissionID, form: { PermissionCode: p.PermissionCode, PermissionName: p.PermissionName || '', PermissionDescription: p.PermissionDescription || '', Module: p.Module || '', SubModule: p.SubModule || '', IsActive: !!p.IsActive }, saving: false })
  }

  const submitEdit = async () => {
    const { id, form: f } = editModal
    if (!f.PermissionName || !f.Module) { setMessage({ type: 'error', text: 'Name and Module are required' }); return }
    if (!id || !isGuid(id)) { setMessage({ type: 'error', text: 'Invalid PermissionID for update' }); return }
    const updatedBy = getUserId(user)
    if (!updatedBy) { setMessage({ type: 'error', text: 'You must be signed in to update permissions.' }); return }
    setEditModal(s => ({ ...s, saving: true }))
    try {
      // if code changed, check exists
      if (f.PermissionCode) {
        const exists = await checkCodeExists(f.PermissionCode, id)
        if (exists) { setMessage({ type: 'error', text: 'Permission code already exists' }); setEditModal(s => ({ ...s, saving: false })); return }
      }
      const payload = { PermissionCode: f.PermissionCode ? f.PermissionCode.trim() : undefined, PermissionName: f.PermissionName.trim(), PermissionDescription: f.PermissionDescription || null, Module: f.Module || null, SubModule: f.SubModule || null, IsActive: f.IsActive ? 1 : 0, UpdatedBy: updatedBy }
      await fetchWithAuth({ url: `/permissions/${id}`, method: 'patch', data: payload })
      setMessage({ type: 'success', text: 'Permission updated' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await fetchPermissions(pagination.currentPage)
    } catch (err) {
      console.error('updatePermission error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update permission' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = (p) => {
    setConfirm({ open: true, id: p.PermissionID, title: `Delete ${p.PermissionCode}`, message: 'Soft-delete this permission?', processing: false })
  }

  const confirmExecute = async () => {
    if (!confirm.open) return
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const deletedBy = getUserId(user)
      if (!deletedBy) throw new Error('You must be signed in to delete permissions.')
      if (!confirm.id || !isGuid(confirm.id)) throw new Error('Invalid PermissionID for delete')
      await fetchWithAuth({ url: `/permissions/${confirm.id}/delete`, method: 'post', data: { UpdatedBy: deletedBy } })
      setMessage({ type: 'success', text: 'Permission deleted' })
      await fetchPermissions(pagination.currentPage)
    } catch (err) {
      console.error('deletePermission error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to delete permission' })
    } finally {
      setConfirm({ open: false, id: null, title: '', message: '', processing: false })
    }
  }

  const openView = async (p) => {
    try {
      if (!p.PermissionID || !isGuid(p.PermissionID)) { setMessage({ type: 'error', text: 'Invalid PermissionID for view' }); return }
      const res = await fetchWithAuth({ url: `/permissions/${p.PermissionID}/roles`, method: 'get' })
      setViewModal({ open: true, id: p.PermissionID, data: res?.data?.data || null })
    } catch (err) {
      console.error('viewPermission error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load permission details' })
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Permissions</h2>
          <p className="text-sm text-slate-500">Manage permissions and their role assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border rounded" />
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">All Modules</option>
            {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input placeholder="SubModule" value={subModuleFilter} onChange={(e) => setSubModuleFilter(e.target.value)} className="px-3 py-2 border rounded" />
          <button onClick={() => fetchPermissions(1)} className="px-3 py-2 bg-white border rounded-md text-sm">Search</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4">New Permission</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Code</label>
              <input value={form.PermissionCode} onChange={(e) => setForm({ ...form, PermissionCode: e.target.value })} onBlur={async (e) => { if (e.target.value) { const exists = await checkCodeExists(e.target.value); if (exists) setMessage({ type: 'error', text: 'Permission code already exists' }) } }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
              <div className="text-xs text-slate-500 mt-1">Format: PERM_XX_XXXX (XX uppercase letters)</div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Name</label>
              <input value={form.PermissionName} onChange={(e) => setForm({ ...form, PermissionName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Module</label>
              <select value={form.Module} onChange={(e) => setForm({ ...form, Module: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm">
                <option value="">-- Select Module --</option>
                {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">SubModule</label>
              <input value={form.SubModule} onChange={(e) => setForm({ ...form, SubModule: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={form.PermissionDescription} onChange={(e) => setForm({ ...form, PermissionDescription: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div className="flex items-center gap-3">
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
            <h3 className="text-lg font-medium">Permissions</h3>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${pagination.totalCount || 0} permissions`}</div>
          </div>

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {permissions && permissions.length === 0 && (<tr><td colSpan={5} className="p-3 text-slate-500">No permissions found.</td></tr>)}
                {permissions && permissions.map(p => (
                  <tr key={p.PermissionID} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{p.PermissionCode}</td>
                    <td className="p-3 align-top text-slate-600">{p.PermissionName || '-'}</td>
                    <td className="p-3 align-top text-slate-500">{p.Module || '-'}</td>
                    <td className="p-3 align-top">{p.IsActive ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openView(p)} className="p-2 rounded-md hover:bg-gray-100" title="View"><Eye className="h-4 w-4"/></button>
                        <button onClick={() => openEdit(p)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Edit3 className="h-4 w-4"/></button>
                        <button onClick={() => handleDelete(p)} className="p-2 rounded-md hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit: ${editModal.form.PermissionCode}` : 'Edit Permission'}>
        {editModal.form && (
          <div className="space-y-4">
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Code</label>
              <input value={editModal.form.PermissionCode} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, PermissionCode: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Name</label>
              <input value={editModal.form.PermissionName} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, PermissionName: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Module</label>
              <select value={editModal.form.Module} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, Module: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm">
                <option value="">-- Select Module --</option>
                {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">SubModule</label>
              <input value={editModal.form.SubModule} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, SubModule: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={editModal.form.PermissionDescription} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, PermissionDescription: e.target.value } }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
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
          </div>
        )}
      </Modal>

      <Modal open={viewModal.open} onClose={() => setViewModal({ open: false, id: null, data: null })} title={viewModal.data && viewModal.data.permission ? `Permission: ${viewModal.data.permission.PermissionCode}` : 'Permission'}>
        {viewModal.data && (
          <div className="space-y-4">
            <div className="text-sm">
              <div><strong>Code:</strong> {viewModal.data.permission.PermissionCode}</div>
              <div><strong>Name:</strong> {viewModal.data.permission.PermissionName}</div>
              <div><strong>Module:</strong> {viewModal.data.permission.Module}</div>
              <div><strong>SubModule:</strong> {viewModal.data.permission.SubModule || '-'}</div>
              <div><strong>Description:</strong> {viewModal.data.permission.PermissionDescription || '-'}</div>
            </div>
            <div>
              <h4 className="font-medium">Assigned Roles</h4>
              <div className="mt-2 max-h-56 overflow-auto">
                {viewModal.data.roles && viewModal.data.roles.length === 0 && <div className="text-sm text-slate-500">No role assignments.</div>}
                {viewModal.data.roles && viewModal.data.roles.map(r => (
                  <div key={r.RolePermissionID} className="flex items-center justify-between border-b py-2">
                    <div>
                      <div className="font-medium">{r.RoleName}</div>
                      <div className="text-xs text-slate-500">{r.RoleDescription || ''}</div>
                    </div>
                    <div className="text-xs text-slate-600">View:{r.CanView ? 'Y' : 'N'} Create:{r.CanCreate ? 'Y' : 'N'} Edit:{r.CanEdit ? 'Y' : 'N'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, id: null, title: '', message: '', processing: false })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
