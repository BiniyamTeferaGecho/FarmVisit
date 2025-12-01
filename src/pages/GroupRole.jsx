import React, { useEffect, useState } from 'react'
import { Plus, Edit3, Trash2, Copy } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

function getUserId(user) {
  return user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
}

export default function GroupRole() {
  const { user, fetchWithAuth } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 25 })

  const [groups, setGroups] = useState([])
  const [roles, setRoles] = useState([])

  const [form, setForm] = useState({ GroupID: '', RoleID: '', IsActive: true })
  const [saving, setSaving] = useState(false)

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '', processing: false })

  const [bulkModal, setBulkModal] = useState({ open: false, GroupID: '', RoleIDs: [], processing: false })
  const [copyModal, setCopyModal] = useState({ open: false, SourceGroupID: '', TargetGroupID: '', processing: false })

  const fetchList = async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth({ url: '/group-roles', method: 'get', params: { page, pageSize: pagination.pageSize } })
      const data = res.data && res.data.data ? res.data.data : res.data || []
      setItems(data.items || res.data || data || [])
      setPagination(prev => ({ ...prev, currentPage: page, totalCount: (res.data && res.data.totalCount) || (data.totalCount || (data.length || 0)) }))
    } catch (err) {
      console.error('fetchGroupRoles error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load group roles' })
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const res = await fetchWithAuth({ url: '/groups', method: 'get', params: { page: 1, pageSize: 1000 } })
      const data = res.data && res.data.data ? res.data.data : res.data || { items: [] }
      setGroups(data.items || [])
    } catch (err) {
      console.warn('fetchGroups', err)
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

  useEffect(() => { fetchList(1); fetchGroups(); fetchRoles() }, [])

  const resetForm = () => setForm({ GroupID: '', RoleID: '', IsActive: true })

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.GroupID || !form.RoleID) { setMessage({ type: 'error', text: 'Group and Role are required' }); return }
    const CreatedBy = getUserId(user)
    if (!CreatedBy) { setMessage({ type: 'error', text: 'You must be signed in to assign roles.' }); return }
    setSaving(true)
    try {
      const payload = { GroupID: form.GroupID, RoleID: form.RoleID, IsActive: form.IsActive ? 1 : 0, CreatedBy }
      await fetchWithAuth({ url: '/group-roles', method: 'post', data: payload })
      setMessage({ type: 'success', text: 'Role assigned to group' })
      resetForm()
      await fetchList(1)
    } catch (err) {
      console.error('createGroupRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to assign role' })
    } finally { setSaving(false) }
  }

  const openEdit = (r) => setEditModal({ open: true, id: r.GroupRoleID || r.Id || null, form: { IsActive: !!r.IsActive }, saving: false })

  const submitEdit = async () => {
    const { id, form: f } = editModal
    if (!id) return
    const UpdatedBy = getUserId(user)
    setEditModal(s => ({ ...s, saving: true }))
    try {
      await fetchWithAuth({ url: `/group-roles/${id}`, method: 'put', data: { IsActive: f.IsActive ? 1 : 0, UpdatedBy } })
      setMessage({ type: 'success', text: 'Updated' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('updateGroupRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = (r) => setConfirm({ open: true, id: r.GroupRoleID || r.Id || null, title: 'Delete role assignment', message: 'Remove this role from the group?', processing: false })

  const confirmExecute = async () => {
    if (!confirm.open) return
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const DeletedBy = getUserId(user)
      if (!DeletedBy) throw new Error('You must be signed in to remove roles.')
      await fetchWithAuth({ url: `/group-roles/${confirm.id}`, method: 'delete' })
      setMessage({ type: 'success', text: 'Removed' })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('deleteGroupRole error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to remove role' })
    } finally { setConfirm({ open: false, id: null, title: '', message: '', processing: false }) }
  }

  const submitBulk = async () => {
    const b = bulkModal
    if (!b.GroupID || !Array.isArray(b.RoleIDs) || b.RoleIDs.length === 0) { setMessage({ type: 'error', text: 'Select a group and at least one role' }); return }
    setBulkModal(s => ({ ...s, processing: true }))
    try {
      const CreatedBy = getUserId(user)
      await fetchWithAuth({ url: '/group-roles/bulk-assign', method: 'post', data: { GroupID: b.GroupID, RoleIDs: b.RoleIDs, CreatedBy } })
      setMessage({ type: 'success', text: 'Roles assigned' })
      setBulkModal({ open: false, GroupID: '', RoleIDs: [], processing: false })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('bulkAssign error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to assign roles' })
      setBulkModal(s => ({ ...s, processing: false }))
    }
  }

  const submitCopy = async () => {
    const c = copyModal
    if (!c.SourceGroupID || !c.TargetGroupID) { setMessage({ type: 'error', text: 'Select source and target group' }); return }
    setCopyModal(s => ({ ...s, processing: true }))
    try {
      const CreatedBy = getUserId(user)
      await fetchWithAuth({ url: '/group-roles/copy', method: 'post', data: { SourceGroupID: c.SourceGroupID, TargetGroupID: c.TargetGroupID, CreatedBy } })
      setMessage({ type: 'success', text: 'Copied roles' })
      setCopyModal({ open: false, SourceGroupID: '', TargetGroupID: '', processing: false })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('copyGroupRoles error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to copy roles' })
      setCopyModal(s => ({ ...s, processing: false }))
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Group Roles</h2>
          <p className="text-sm text-slate-500">Assign roles to groups and manage group-role assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkModal(b => ({ ...b, open: true }))} className="px-3 py-2 border rounded">Bulk Assign</button>
          <button onClick={() => setCopyModal(c => ({ ...c, open: true }))} className="px-3 py-2 border rounded">Copy Roles</button>
          <button onClick={() => setEditModal({ open: true, id: null, form: { ...form }, saving: false })} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm"> <Plus className="h-4 w-4"/> New</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4">Assign Role</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Group</label>
              <select value={form.GroupID || ''} onChange={(e) => setForm(f => ({ ...f, GroupID: e.target.value }))} className="w-full px-3 py-2 border rounded">
                <option value="">-- Select group --</option>
                {groups.map(g => <option key={g.GroupID} value={g.GroupID}>{g.GroupName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
              <select value={form.RoleID || ''} onChange={(e) => setForm(f => ({ ...f, RoleID: e.target.value }))} className="w-full px-3 py-2 border rounded">
                <option value="">-- Select role --</option>
                {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
              </select>
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
            <h3 className="text-lg font-medium">All Group Roles</h3>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${pagination.totalCount || items.length || 0} assignments`}</div>
          </div>

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Group</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items && items.length === 0 && (<tr><td colSpan={4} className="p-3 text-slate-500">No assignments found.</td></tr>)}
                {items && items.map(r => (
                  <tr key={r.GroupRoleID || r.Id || `${r.GroupID}-${r.RoleID}`} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{r.GroupName || r.Group || '-'}</td>
                    <td className="p-3 align-top text-slate-600">{r.RoleName || r.Role || '-'}</td>
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

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit` : 'Edit Group Role'}>
        {editModal.form && (
          <div className="space-y-4">
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

      <Modal open={bulkModal.open} onClose={() => setBulkModal({ open: false, GroupID: '', RoleIDs: [], processing: false })} title="Bulk Assign Roles">
        <div className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Group</label>
            <select value={bulkModal.GroupID || ''} onChange={(e) => setBulkModal(b => ({ ...b, GroupID: e.target.value }))} className="w-full px-3 py-2 border rounded">
              <option value="">-- Select group --</option>
              {groups.map(g => <option key={g.GroupID} value={g.GroupID}>{g.GroupName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Roles</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border p-2 rounded">
              {roles.map(r => (
                <label key={r.RoleID} className="flex items-center gap-2"><input type="checkbox" checked={bulkModal.RoleIDs.includes(r.RoleID)} onChange={(e) => setBulkModal(b => ({ ...b, RoleIDs: e.target.checked ? [...b.RoleIDs, r.RoleID] : b.RoleIDs.filter(x => x !== r.RoleID) }))} />{r.RoleName}</label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setBulkModal({ open: false, GroupID: '', RoleIDs: [], processing: false })} className="px-3 py-2 border rounded">Cancel</button>
            <button onClick={submitBulk} disabled={bulkModal.processing} className="px-3 py-2 bg-indigo-600 text-white rounded">{bulkModal.processing ? 'Processing...' : 'Assign'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={copyModal.open} onClose={() => setCopyModal({ open: false, SourceGroupID: '', TargetGroupID: '', processing: false })} title="Copy Roles Between Groups">
        <div className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Source Group</label>
            <select value={copyModal.SourceGroupID || ''} onChange={(e) => setCopyModal(c => ({ ...c, SourceGroupID: e.target.value }))} className="w-full px-3 py-2 border rounded">
              <option value="">-- Select source --</option>
              {groups.map(g => <option key={g.GroupID} value={g.GroupID}>{g.GroupName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Target Group</label>
            <select value={copyModal.TargetGroupID || ''} onChange={(e) => setCopyModal(c => ({ ...c, TargetGroupID: e.target.value }))} className="w-full px-3 py-2 border rounded">
              <option value="">-- Select target --</option>
              {groups.map(g => <option key={g.GroupID} value={g.GroupID}>{g.GroupName}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCopyModal({ open: false, SourceGroupID: '', TargetGroupID: '', processing: false })} className="px-3 py-2 border rounded">Cancel</button>
            <button onClick={submitCopy} disabled={copyModal.processing} className="px-3 py-2 bg-indigo-600 text-white rounded">{copyModal.processing ? 'Processing...' : 'Copy'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, id: null, title: '', message: '', processing: false })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
