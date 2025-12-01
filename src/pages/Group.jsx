import React, { useEffect, useState } from 'react'
import { Plus, Edit3, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const GROUP_TYPES = ['SYSTEM', 'PROJECT', 'FUNCTIONAL', 'ORGANIZATIONAL', 'SECURITY']

function getUserId(user) {
  return user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
}

export default function Group() {
  const { user, fetchWithAuth } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 25 })

  const [parentOptions, setParentOptions] = useState([])
  const [roles, setRoles] = useState([])

  const [form, setForm] = useState({ GroupName: '', GroupNameAmharic: '', GroupDescription: '', GroupType: 'SECURITY', ParentGroupID: null, IsSystemGroup: false, CanHaveMembers: true, DefaultRoleID: null, IsActive: true })
  const [saving, setSaving] = useState(false)

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '', processing: false })

  const fetchList = async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth({ url: '/groups', method: 'get', params: { page, pageSize: pagination.pageSize, SearchTerm: undefined } })
      const data = res.data && res.data.data ? res.data.data : res.data || { items: [] }
      setItems(data.items || [])
      setPagination(data.pagination || { totalCount: data.items.length || 0, currentPage: page, pageSize: pagination.pageSize })
    } catch (err) {
      console.error('fetchGroups error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load groups' })
    } finally {
      setLoading(false)
    }
  }

  const fetchParents = async () => {
    try {
      const res = await fetchWithAuth({ url: '/groups', method: 'get', params: { page: 1, pageSize: 1000 } })
      const data = res.data && res.data.data ? res.data.data : res.data || { items: [] }
      setParentOptions(data.items || [])
    } catch (err) {
      console.warn('fetchParents', err)
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

  useEffect(() => { fetchList(pagination.currentPage); fetchParents(); fetchRoles() }, [])

  const resetForm = () => setForm({ GroupName: '', GroupNameAmharic: '', GroupDescription: '', GroupType: 'SECURITY', ParentGroupID: null, IsSystemGroup: false, CanHaveMembers: true, DefaultRoleID: null, IsActive: true })

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.GroupName) { setMessage({ type: 'error', text: 'Group name is required' }); return }
    const CreatedBy = getUserId(user)
    if (!CreatedBy) { setMessage({ type: 'error', text: 'You must be signed in to create groups.' }); return }
    setSaving(true)
    try {
      const payload = {
        GroupName: form.GroupName.trim(),
        GroupNameAmharic: form.GroupNameAmharic || null,
        GroupDescription: form.GroupDescription || null,
        GroupType: form.GroupType || null,
        ParentGroupID: form.ParentGroupID || null,
        IsSystemGroup: form.IsSystemGroup ? 1 : 0,
        CanHaveMembers: form.CanHaveMembers ? 1 : 0,
        DefaultRoleID: form.DefaultRoleID || null,
        IsActive: form.IsActive ? 1 : 0,
        CreatedBy,
      }
      await fetchWithAuth({ url: '/groups', method: 'post', data: payload })
      setMessage({ type: 'success', text: 'Group created' })
      resetForm()
      await fetchList(1)
    } catch (err) {
      console.error('createGroup error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create group' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (g) => setEditModal({ open: true, id: g.GroupID, form: { GroupName: g.GroupName, GroupNameAmharic: g.GroupNameAmharic || '', GroupDescription: g.GroupDescription || '', GroupType: g.GroupType || 'SECURITY', ParentGroupID: g.ParentGroupID || null, IsSystemGroup: !!g.IsSystemGroup, CanHaveMembers: !!g.CanHaveMembers, DefaultRoleID: g.DefaultRoleID || null, IsActive: !!g.IsActive }, saving: false })

  const submitEdit = async () => {
    const { id, form: f } = editModal
    if (!f.GroupName) { setMessage({ type: 'error', text: 'Group name is required' }); return }
    const UpdatedBy = getUserId(user)
    if (!UpdatedBy) { setMessage({ type: 'error', text: 'You must be signed in to update groups.' }); return }
    setEditModal(s => ({ ...s, saving: true }))
    try {
      const payload = {
        GroupName: f.GroupName.trim(),
        GroupNameAmharic: f.GroupNameAmharic || null,
        GroupDescription: f.GroupDescription || null,
        GroupType: f.GroupType || null,
        ParentGroupID: f.ParentGroupID || null,
        CanHaveMembers: typeof f.CanHaveMembers === 'undefined' ? null : (f.CanHaveMembers ? 1 : 0),
        DefaultRoleID: f.DefaultRoleID || null,
        IsActive: f.IsActive ? 1 : 0,
        UpdatedBy,
      }
      await fetchWithAuth({ url: `/groups/${id}`, method: 'patch', data: payload })
      setMessage({ type: 'success', text: 'Group updated' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('updateGroup error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update group' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = (g) => setConfirm({ open: true, id: g.GroupID, title: `Delete ${g.GroupName}`, message: 'Soft-delete this group?', processing: false })

  const confirmExecute = async () => {
    if (!confirm.open) return
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const DeletedBy = getUserId(user)
      if (!DeletedBy) throw new Error('You must be signed in to delete groups.')
      await fetchWithAuth({ url: `/groups/${confirm.id}/delete`, method: 'post', data: { DeletedBy } })
      setMessage({ type: 'success', text: 'Group deleted' })
      await fetchList(pagination.currentPage)
    } catch (err) {
      console.error('deleteGroup error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to delete group' })
    } finally {
      setConfirm({ open: false, id: null, title: '', message: '', processing: false })
    }
  }

  const checkNameExists = async (name, excludeId = null) => {
    if (!name) return false
    try {
      const res = await fetchWithAuth({ url: '/groups/check-name', method: 'get', params: { GroupName: name, ExcludeGroupID: excludeId } })
      return res?.data?.data?.exists || false
    } catch (err) {
      return false
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Groups</h2>
          <p className="text-sm text-slate-500">Create and manage application groups and hierarchies.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditModal({ open: true, id: null, form: { ...form }, saving: false })} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm"> <Plus className="h-4 w-4"/> New</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4">New Group</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Group Name</label>
              <input value={form.GroupName} onChange={(e) => setForm({ ...form, GroupName: e.target.value })} onBlur={async (e) => {
                const exists = await checkNameExists(e.target.value || '')
                if (exists) setMessage({ type: 'error', text: 'Group name already exists' })
              }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Name (Amharic)</label>
              <input value={form.GroupNameAmharic} onChange={(e) => setForm({ ...form, GroupNameAmharic: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={form.GroupDescription} onChange={(e) => setForm({ ...form, GroupDescription: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Type</label>
              <select value={form.GroupType} onChange={(e) => setForm({ ...form, GroupType: e.target.value })} className="w-full px-3 py-2 border rounded">
                {GROUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Parent Group</label>
              <select value={form.ParentGroupID || ''} onChange={(e) => setForm({ ...form, ParentGroupID: e.target.value || null })} className="w-full px-3 py-2 border rounded">
                <option value="">-- None --</option>
                {parentOptions.map(p => <option key={p.GroupID} value={p.GroupID}>{p.GroupName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Default Role</label>
              <select value={form.DefaultRoleID || ''} onChange={(e) => setForm({ ...form, DefaultRoleID: e.target.value || null })} className="w-full px-3 py-2 border rounded">
                <option value="">-- None --</option>
                {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.IsSystemGroup} onChange={(e) => setForm({ ...form, IsSystemGroup: e.target.checked })} className="form-checkbox h-4 w-4" />
                <span>System Group</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.CanHaveMembers} onChange={(e) => setForm({ ...form, CanHaveMembers: e.target.checked })} className="form-checkbox h-4 w-4" />
                <span>Can Have Members</span>
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
            <h3 className="text-lg font-medium">All Groups</h3>
            <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${pagination.totalCount || items.length || 0} groups`}</div>
          </div>

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Parent</th>
                  <th className="p-3">Members</th>
                  <th className="p-3">Default Role</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items && items.length === 0 && (<tr><td colSpan={7} className="p-3 text-slate-500">No groups found.</td></tr>)}
                {items && items.map(g => (
                  <tr key={g.GroupID} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{g.GroupName}</td>
                    <td className="p-3 align-top text-slate-600">{g.GroupType || '-'}</td>
                    <td className="p-3 align-top text-slate-600">{g.ParentGroupName || '-'}</td>
                    <td className="p-3 align-top text-slate-600">{g.CanHaveMembers ? 'Yes' : 'No'}</td>
                    <td className="p-3 align-top text-slate-600">{g.DefaultRoleName || '-'}</td>
                    <td className="p-3 align-top">{g.IsActive ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(g)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Edit3 className="h-4 w-4"/></button>
                        <button onClick={() => handleDelete(g)} className="p-2 rounded-md hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit: ${editModal.form.GroupName}` : 'Edit Group'}>
        {editModal.form && (
          <div className="space-y-4">
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Group Name</label>
              <input value={editModal.form.GroupName} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, GroupName: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Name (Amharic)</label>
              <input value={editModal.form.GroupNameAmharic} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, GroupNameAmharic: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={editModal.form.GroupDescription} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, GroupDescription: e.target.value } }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Type</label>
              <select value={editModal.form.GroupType} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, GroupType: e.target.value } }))} className="w-full px-3 py-2 border rounded">
                {GROUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Parent Group</label>
              <select value={editModal.form.ParentGroupID || ''} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, ParentGroupID: e.target.value || null } }))} className="w-full px-3 py-2 border rounded">
                <option value="">-- None --</option>
                {parentOptions.map(p => <option key={p.GroupID} value={p.GroupID}>{p.GroupName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Default Role</label>
              <select value={editModal.form.DefaultRoleID || ''} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, DefaultRoleID: e.target.value || null } }))} className="w-full px-3 py-2 border rounded">
                <option value="">-- None --</option>
                {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editModal.form.IsSystemGroup} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, IsSystemGroup: e.target.checked } }))} className="form-checkbox h-4 w-4" />
                <span>System Group</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editModal.form.CanHaveMembers} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, CanHaveMembers: e.target.checked } }))} className="form-checkbox h-4 w-4" />
                <span>Can Have Members</span>
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
            {message && (<div className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>)}
          </div>
        )}
      </Modal>

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, id: null, title: '', message: '', processing: false })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
