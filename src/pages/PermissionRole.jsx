import React, { useEffect, useState } from 'react'
// use authenticated fetch helper from AuthProvider to ensure Authorization header
import { Plus, Edit3, Trash2, Copy, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

// GUID validator
const isGuid = (v) => {
  if (!v || typeof v !== 'string') return false
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)
}

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:80/api'

function getUserId(user) {
  return user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
}

export default function PermissionRole() {
  const { user, fetchWithAuth } = useAuth()
  const [items, setItems] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 25 })

  const [form, setForm] = useState({ RoleID: '', PermissionID: '', CanView: true, CanCreate: false, CanEdit: false, CanDelete: false, CanApprove: false, CanExport: false, IsActive: true })
  const [saving, setSaving] = useState(false)

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '', processing: false })
  const [bulkModal, setBulkModal] = useState({ open: false, RoleID: '', selectedPermissions: [], processing: false })
  const [copyModal, setCopyModal] = useState({ open: false, sourceRoleId: '', targetRoleId: '', processing: false })

  const fetchLists = async () => {
    try {
      const [rRes, pRes] = await Promise.all([
        fetchWithAuth({ url: '/roles', method: 'get', params: { page: 1, pageSize: 1000 }, redirectOnFail: false }),
        fetchWithAuth({ url: '/permissions', method: 'get', params: { page: 1, pageSize: 1000 }, redirectOnFail: false }),
      ])
      const rItems = rRes?.data?.data?.items || rRes?.data?.items || []
      const pItems = pRes?.data?.data?.items || pRes?.data?.items || []
      setRoles(rItems)
      setPermissions(pItems)
    } catch (err) {
      console.error('fetchLists error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load roles/permissions' })
    }
  }

  const fetchItems = async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth({ url: '/role-permissions', method: 'get', params: { page, pageSize: pagination.pageSize } })
      const data = res?.data?.data || res?.data || { items: [] }
      const list = data.items || []
      setItems(list)
      setPagination(data.pagination || { totalCount: list.length || 0, currentPage: page, pageSize: pagination.pageSize })
    } catch (err) {
      console.error('fetchItems error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load role-permissions' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLists(); fetchItems(1) }, [])

  const resetForm = () => setForm({ RoleID: '', PermissionID: '', CanView: true, CanCreate: false, CanEdit: false, CanDelete: false, CanApprove: false, CanExport: false, IsActive: true })

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage(null)
    const createdBy = getUserId(user)
    if (!createdBy) { setMessage({ type: 'error', text: 'You must be signed in to create role-permissions.' }); return }
    if (!form.RoleID || !form.PermissionID) { setMessage({ type: 'error', text: 'Role and Permission are required.' }); return }
    // Validate GUIDs to avoid sending invalid values to backend
    if (!isGuid(form.RoleID)) { setMessage({ type: 'error', text: 'RoleID must be a valid GUID' }); return }
    if (!isGuid(form.PermissionID)) { setMessage({ type: 'error', text: 'PermissionID must be a valid GUID' }); return }
    setSaving(true)
    try {
      const payload = {
        RoleID: form.RoleID,
        PermissionID: form.PermissionID,
        CanView: form.CanView ? 1 : 0,
        CanCreate: form.CanCreate ? 1 : 0,
        CanEdit: form.CanEdit ? 1 : 0,
        CanDelete: form.CanDelete ? 1 : 0,
        CanApprove: form.CanApprove ? 1 : 0,
        CanExport: form.CanExport ? 1 : 0,
        IsActive: form.IsActive ? 1 : 0,
        CreatedBy: createdBy,
      }
      await fetchWithAuth({ url: '/role-permissions', method: 'post', data: payload })
      setMessage({ type: 'success', text: 'Permission assigned to role' })
      resetForm()
      await fetchItems(1)
    } catch (err) {
      console.error('createRolePermission error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to assign permission' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (rp) => {
    setEditModal({ open: true, id: rp.RolePermissionID, form: { CanView: !!rp.CanView, CanCreate: !!rp.CanCreate, CanEdit: !!rp.CanEdit, CanDelete: !!rp.CanDelete, CanApprove: !!rp.CanApprove, CanExport: !!rp.CanExport, IsActive: !!rp.IsActive }, saving: false })
  }

  const submitEdit = async () => {
    const { id, form: f } = editModal
    const updatedBy = getUserId(user)
    if (!updatedBy) { setMessage({ type: 'error', text: 'You must be signed in to update.' }); return }
    setEditModal(s => ({ ...s, saving: true }))
    try {
      const payload = { CanView: f.CanView ? 1 : 0, CanCreate: f.CanCreate ? 1 : 0, CanEdit: f.CanEdit ? 1 : 0, CanDelete: f.CanDelete ? 1 : 0, CanApprove: f.CanApprove ? 1 : 0, CanExport: f.CanExport ? 1 : 0, IsActive: f.IsActive ? 1 : 0, UpdatedBy: updatedBy }
      await fetchWithAuth({ url: `/role-permissions/${id}`, method: 'patch', data: payload })
      setMessage({ type: 'success', text: 'Role-permission updated' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await fetchItems(pagination.currentPage)
    } catch (err) {
      console.error('updateRolePermission error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = (rp) => {
    setConfirm({ open: true, id: rp.RolePermissionID, title: `Delete assignment`, message: `Remove permission ${rp.PermissionCode || ''} from role ${rp.RoleName || ''}?`, processing: false })
  }

  const confirmExecute = async () => {
    if (!confirm.open) return
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const updatedBy = getUserId(user)
      if (!updatedBy) throw new Error('You must be signed in to delete.')
      await fetchWithAuth({ url: `/role-permissions/${confirm.id}`, method: 'delete', data: { UpdatedBy: updatedBy } })
      setMessage({ type: 'success', text: 'Assignment removed' })
      await fetchItems(pagination.currentPage)
    } catch (err) {
      console.error('deleteRolePermission error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to delete' })
    } finally {
      setConfirm({ open: false, id: null, title: '', message: '', processing: false })
    }
  }

  const openBulk = (roleId = '') => setBulkModal({ open: true, RoleID: roleId, selectedPermissions: [], processing: false })

  const submitBulk = async () => {
    if (!bulkModal.RoleID || !bulkModal.selectedPermissions.length) { setMessage({ type: 'error', text: 'Select a role and at least one permission' }); return }
    const createdBy = getUserId(user)
    if (!createdBy) { setMessage({ type: 'error', text: 'You must be signed in' }); return }
    // Validate RoleID and each selected PermissionID
    if (!isGuid(bulkModal.RoleID)) { setMessage({ type: 'error', text: 'RoleID must be a valid GUID' }); return }
    const invalid = bulkModal.selectedPermissions.find(id => !isGuid(id))
    if (invalid) { setMessage({ type: 'error', text: 'One or more selected permissions are invalid' }); return }
    setBulkModal(s => ({ ...s, processing: true }))
    try {
      const payload = { RoleID: bulkModal.RoleID, PermissionIDs: bulkModal.selectedPermissions, CreatedBy: createdBy }
      const res = await fetchWithAuth({ url: '/role-permissions/bulk-assign', method: 'post', data: payload })
      setMessage({ type: 'success', text: `Assigned ${res?.data?.data?.assigned?.length || 0} permissions` })
      setBulkModal({ open: false, RoleID: '', selectedPermissions: [], processing: false })
      await fetchItems(1)
    } catch (err) {
      console.error('bulkAssign error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Bulk assign failed' })
      setBulkModal(s => ({ ...s, processing: false }))
    }
  }

  const openCopy = () => setCopyModal({ open: true, sourceRoleId: '', targetRoleId: '', processing: false })
  const submitCopy = async () => {
    const { sourceRoleId, targetRoleId } = copyModal
    if (!sourceRoleId || !targetRoleId) { setMessage({ type: 'error', text: 'Select both source and target roles' }); return }
    const createdBy = getUserId(user)
    if (!createdBy) { setMessage({ type: 'error', text: 'You must be signed in' }); return }
    setCopyModal(s => ({ ...s, processing: true }))
    try {
      const payload = { SourceRoleID: sourceRoleId, TargetRoleID: targetRoleId, CreatedBy: createdBy }
      const res = await fetchWithAuth({ url: '/role-permissions/copy', method: 'post', data: payload })
      setMessage({ type: 'success', text: `Copied ${res?.data?.data?.copiedCount || 0} permissions` })
      setCopyModal({ open: false, sourceRoleId: '', targetRoleId: '', processing: false })
      await fetchItems(1)
    } catch (err) {
      console.error('copyRolePermissions error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Copy failed' })
      setCopyModal(s => ({ ...s, processing: false }))
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Role - Permission Assignments</h2>
          <p className="text-sm text-slate-500">Assign permissions to roles and manage role-permission flags.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchItems(1)} className="px-3 py-2 bg-white border rounded-md text-sm">Refresh</button>
          <button onClick={() => openBulk('')} className="px-3 py-2 bg-white border rounded-md text-sm">Bulk Assign</button>
          <button onClick={openCopy} className="px-3 py-2 bg-white border rounded-md text-sm">Copy From Role</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4">Assign Permission to Role</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
              <select value={form.RoleID} onChange={(e) => setForm({ ...form, RoleID: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm">
                <option value="">-- Select Role --</option>
                {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Permission</label>
              <select value={form.PermissionID} onChange={(e) => setForm({ ...form, PermissionID: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm">
                <option value="">-- Select Permission --</option>
                {permissions.map(p => <option key={p.PermissionID} value={p.PermissionID}>{p.PermissionCode} — {p.PermissionName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.CanView} onChange={(e) => setForm({ ...form, CanView: e.target.checked })} className="form-checkbox" /> View</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.CanCreate} onChange={(e) => setForm({ ...form, CanCreate: e.target.checked })} className="form-checkbox" /> Create</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.CanEdit} onChange={(e) => setForm({ ...form, CanEdit: e.target.checked })} className="form-checkbox" /> Edit</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.CanDelete} onChange={(e) => setForm({ ...form, CanDelete: e.target.checked })} className="form-checkbox" /> Delete</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.CanApprove} onChange={(e) => setForm({ ...form, CanApprove: e.target.checked })} className="form-checkbox" /> Approve</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.CanExport} onChange={(e) => setForm({ ...form, CanExport: e.target.checked })} className="form-checkbox" /> Export</label>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.IsActive} onChange={(e) => setForm({ ...form, IsActive: e.target.checked })} className="form-checkbox" /> Active</label>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md"> <Plus className="h-4 w-4"/> Assign</button>
              <button type="button" onClick={resetForm} className="px-3 py-2 border rounded-md">Reset</button>
            </div>
            {message && (<div className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>)}
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm overflow-auto text-left">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Assignments</h3>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${pagination.totalCount || 0} assignments`}</div>
          </div>

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Role</th>
                  <th className="p-3">Permission</th>
                  <th className="p-3">Flags</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items && items.length === 0 && (<tr><td colSpan={5} className="p-3 text-slate-500">No assignments found.</td></tr>)}
                {items && items.map(i => (
                  <tr key={i.RolePermissionID} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{i.RoleName}</td>
                    <td className="p-3 align-top text-slate-600">{i.PermissionCode} <div className="text-xs text-slate-500">{i.PermissionName}</div></td>
                    <td className="p-3 align-top text-xs text-slate-600">V:{i.CanView ? 'Y' : 'N'} C:{i.CanCreate ? 'Y' : 'N'} E:{i.CanEdit ? 'Y' : 'N'} D:{i.CanDelete ? 'Y' : 'N'}</td>
                    <td className="p-3 align-top">{i.IsActive ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(i)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Edit3 className="h-4 w-4"/></button>
                        <button onClick={() => handleDelete(i)} className="p-2 rounded-md hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit Assignment` : 'Edit Assignment'}>
        {editModal.form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editModal.form.CanView} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, CanView: e.target.checked } }))} className="form-checkbox" /> View</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editModal.form.CanCreate} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, CanCreate: e.target.checked } }))} className="form-checkbox" /> Create</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editModal.form.CanEdit} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, CanEdit: e.target.checked } }))} className="form-checkbox" /> Edit</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editModal.form.CanDelete} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, CanDelete: e.target.checked } }))} className="form-checkbox" /> Delete</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editModal.form.CanApprove} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, CanApprove: e.target.checked } }))} className="form-checkbox" /> Approve</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editModal.form.CanExport} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, CanExport: e.target.checked } }))} className="form-checkbox" /> Export</label>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editModal.form.IsActive} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, IsActive: e.target.checked } }))} className="form-checkbox" /> Active</label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal({ open: false, id: null, form: null })} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={submitEdit} disabled={editModal.saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{editModal.saving ? 'Saving...' : 'Update'}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={bulkModal.open} onClose={() => setBulkModal({ open: false, RoleID: '', selectedPermissions: [], processing: false })} title={bulkModal.RoleID ? `Bulk assign to role` : 'Bulk assign permissions'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
            <select value={bulkModal.RoleID} onChange={(e) => setBulkModal(s => ({ ...s, RoleID: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm">
              <option value="">-- Select Role --</option>
              {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Permissions</label>
            <div className="max-h-56 overflow-auto border rounded p-2">
              {permissions.map(p => (
                <label key={p.PermissionID} className="flex items-center gap-2 text-sm py-1">
                  <input type="checkbox" checked={bulkModal.selectedPermissions.includes(p.PermissionID)} onChange={(e) => setBulkModal(s => ({ ...s, selectedPermissions: e.target.checked ? [...s.selectedPermissions, p.PermissionID] : s.selectedPermissions.filter(id => id !== p.PermissionID) }))} className="form-checkbox" />
                  <span>{p.PermissionCode} — {p.PermissionName}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setBulkModal({ open: false, RoleID: '', selectedPermissions: [], processing: false })} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={submitBulk} disabled={bulkModal.processing} className="px-4 py-2 bg-indigo-600 text-white rounded">{bulkModal.processing ? 'Processing...' : 'Assign'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={copyModal.open} onClose={() => setCopyModal({ open: false, sourceRoleId: '', targetRoleId: '', processing: false })} title={'Copy Role Permissions'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Source Role</label>
            <select value={copyModal.sourceRoleId} onChange={(e) => setCopyModal(s => ({ ...s, sourceRoleId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm">
              <option value="">-- Source Role --</option>
              {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Target Role</label>
            <select value={copyModal.targetRoleId} onChange={(e) => setCopyModal(s => ({ ...s, targetRoleId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm">
              <option value="">-- Target Role --</option>
              {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCopyModal({ open: false, sourceRoleId: '', targetRoleId: '', processing: false })} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={submitCopy} disabled={copyModal.processing} className="px-4 py-2 bg-indigo-600 text-white rounded">{copyModal.processing ? 'Processing...' : 'Copy'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, id: null, title: '', message: '', processing: false })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
