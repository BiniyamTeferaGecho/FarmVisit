import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Edit3, Copy, Zap } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import AlertModal from '../components/AlertModal'

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:80/api'

function useFetchTypes(reloadKey, fetchWithAuth) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  // use a distinct, local name for the error setter to avoid HMR / naming collisions
  const [error, setErrorState] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    if (typeof setErrorState === 'function') {
      setErrorState(null)
    } else {
      console.warn('setErrorState is not a function on mount', typeof setErrorState)
    }
    (async () => {
      try {
        const res = fetchWithAuth ? await fetchWithAuth({ url: '/lookup-types', method: 'get' }) : await axios.get(`${API_BASE}/lookup-types`)
        if (mounted) setData(res.data && res.data.data ? res.data.data : res.data || [])
      } catch (err) {
        console.error(err)
        const msg = err?.response?.data?.message || err.message || 'Failed to load'
        if (typeof setErrorState === 'function') {
          setErrorState(msg)
        } else {
          console.warn('setErrorState is not a function when handling fetch error', typeof setErrorState, msg)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [reloadKey, fetchWithAuth])

  return { data, loading, error, setData }
}

export default function LookupType({ reloadKey }) {
  const { user, fetchWithAuth } = useAuth()
  const { data: types, loading, error, setData } = useFetchTypes(reloadKey || 0, fetchWithAuth)
  const [form, setForm] = useState({ TypeName: '', TypeDescription: '', IsActive: true })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showErrorModal, setShowErrorModal] = useState(false)

  const resetForm = () => setForm({ TypeName: '', TypeDescription: '', IsActive: true })

  // auto-open error modal when fetch/list errors or message indicates an error
  useEffect(() => {
    if (error || (message && message.type === 'error')) setShowErrorModal(true)
  }, [error, message])

  const refresh = async () => {
    try {
  const res = fetchWithAuth ? await fetchWithAuth({ url: '/lookup-types', method: 'get' }) : await axios.get(`${API_BASE}/lookup-types`)
      setData(res.data && res.data.data ? res.data.data : res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.TypeName || form.TypeName.trim() === '') {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }
    // require logged-in user to provide CreatedBy
    const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
    if (!userId) {
      setMessage({ type: 'error', text: 'You must be signed in to create lookup types.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        TypeName: form.TypeName.trim(),
        TypeDescription: form.TypeDescription || null,
        IsActive: form.IsActive ? 1 : 0,
        CreatedBy: userId,
      }
  const res = await fetchWithAuth({ url: '/lookup-types', method: 'post', data: payload })
      setMessage({ type: 'success', text: 'Lookup type created' })
      resetForm()
      await refresh()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setConfirm({ open: true, type: 'delete', id, title: 'Delete lookup type', message: 'Delete this lookup type? This will soft-delete and may be irreversible.' })
  }

  const handleClone = async (id) => {
    setCloneModal({ open: true, sourceId: id, newName: '' })
  }

  const handleDeactivateCascade = async (id) => {
    setConfirm({ open: true, type: 'deactivate', id, title: 'Deactivate lookup type', message: 'Deactivate this lookup type and all its lookups?' })
  }

  // Modal state
  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, type: null, id: null, title: '', message: '' })
  const [cloneModal, setCloneModal] = useState({ open: false, sourceId: null, newName: '' })

  const openEdit = (t) => {
    setEditModal({ open: true, id: t.LookupTypeID, form: { TypeName: t.TypeName, TypeDescription: t.TypeDescription || '', IsActive: !!t.IsActive }, saving: false })
  }

  const submitEdit = async () => {
    const { id, form } = editModal
    if (!form.TypeName || form.TypeName.trim() === '') {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }
    setEditModal(s => ({ ...s, saving: true }))
    try {
      const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
      if (!userId) {
        setMessage({ type: 'error', text: 'You must be signed in to update lookup types.' })
        setEditModal(s => ({ ...s, saving: false }))
        return
      }
      const payload = {
        LookupTypeID: id,
        TypeName: form.TypeName.trim(),
        TypeDescription: form.TypeDescription || null,
        IsActive: form.IsActive ? 1 : 0,
        UpdatedBy: userId,
      }
  await fetchWithAuth({ url: `/lookup-types/${id}`, method: 'put', data: payload })
      setMessage({ type: 'success', text: 'Updated successfully' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await refresh()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const confirmExecute = async () => {
    if (!confirm.open) return
    const { type, id } = confirm
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
      if (!userId) throw new Error('You must be signed in to perform this action')

      if (type === 'delete') {
        // delete requires DeletedBy; axios.delete accepts { data: {} } as second param
  await fetchWithAuth({ url: `/lookup-types/${id}`, method: 'delete', data: { DeletedBy: userId } })
        setMessage({ type: 'success', text: 'Deleted' })
      } else if (type === 'deactivate') {
  await fetchWithAuth({ url: `/lookup-types/${id}/deactivate-cascade`, method: 'post', data: { UpdatedBy: userId } })
        setMessage({ type: 'success', text: 'Deactivated' })
      }
      await refresh()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Operation failed' })
    } finally {
      setConfirm({ open: false, type: null, id: null, title: '', message: '' })
    }
  }

  const submitClone = async () => {
    if (!cloneModal.newName || cloneModal.newName.trim() === '') {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }
    try {
      const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
      if (!userId) { setMessage({ type: 'error', text: 'You must be signed in to clone lookup types.' }); return }
  await fetchWithAuth({ url: '/lookup-types/clone', method: 'post', data: { SourceLookupTypeID: cloneModal.sourceId, NewTypeName: cloneModal.newName.trim(), CreatedBy: userId } })
      setMessage({ type: 'success', text: 'Cloned successfully' })
      setCloneModal({ open: false, sourceId: null, newName: '' })
      await refresh()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to clone' })
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Lookup Types</h2>
          <p className="text-sm text-slate-500">Create and manage lookup type configurations used across the app.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm hover:bg-gray-50">
            <Zap className="h-4 w-4 text-slate-600" /> Refresh
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* form */}
  <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-slate-100">New Lookup Type</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1 text-left">Name</label>
              <input value={form.TypeName} onChange={(e) => setForm({ ...form, TypeName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="E.g. VisitTypes" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1 text-left">Description</label>
              <textarea value={form.TypeDescription} onChange={(e) => setForm({ ...form, TypeDescription: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Optional description" />
            </div>
            <div className="flex items-center gap-3 text-left">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.IsActive} onChange={(e) => setForm({ ...form, IsActive: e.target.checked })} className="form-checkbox h-4 w-4" />
                <span>Active</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">
                <Plus className="h-4 w-4" /> Create
              </button>
              <button type="button" onClick={resetForm} className="px-3 py-2 border rounded-md text-sm">Reset</button>
            </div>
            {message && (
              <div className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.type === 'error' ? 'An error occurred. Please try again.' : message.text}</div>
            )}
          </form>
        </div>

  {/* list */}
  <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm overflow-auto text-left">
          <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-slate-100">Existing Lookup Types</h3>

          {loading && <div className="text-sm text-slate-500">Loading...</div>}
          {error ? <div className="text-sm text-red-500">An error occurred. Please try again.</div> : null}
          <AlertModal open={showErrorModal} title="Error" message={"An unexpected error occurred. Please try again or contact support."} details={error || (message && message.type === 'error' ? message.text : null)} onClose={() => { setShowErrorModal(false); try { setMessage(null) } catch(e) {} }} />

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Name</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types && types.length === 0 && (
                  <tr><td colSpan={5} className="p-3 text-slate-500">No lookup types found.</td></tr>
                )}
                {types && types.map(t => (
                  <tr key={t.LookupTypeID} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{t.TypeName}</td>
                    <td className="p-3 align-top text-slate-600">{t.TypeDescription}</td>
                    <td className="p-3 align-top">{t.IsActive ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                    <td className="p-3 align-top text-slate-500">{t.CreatedAt ? new Date(t.CreatedAt).toLocaleString() : ''}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(t)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => handleClone(t.LookupTypeID)} className="p-2 rounded-md hover:bg-gray-100" title="Clone"><Copy className="h-4 w-4" /></button>
                        <button onClick={() => handleDeactivateCascade(t.LookupTypeID)} className="p-2 rounded-md hover:bg-gray-100" title="Deactivate"><Zap className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(t.LookupTypeID)} className="p-2 rounded-md hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit: ${editModal.form.TypeName}` : 'Edit Lookup Type'}>
        {editModal.form && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Name</label>
              <input value={editModal.form.TypeName} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, TypeName: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={editModal.form.TypeDescription} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, TypeDescription: e.target.value } }))} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editModal.form.IsActive} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, IsActive: e.target.checked } }))} className="form-checkbox h-4 w-4" />
                <span>Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal({ open: false, id: null, form: null })} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={submitEdit} disabled={editModal.saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{editModal.saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Clone Modal */}
      <Modal open={cloneModal.open} onClose={() => setCloneModal({ open: false, sourceId: null, newName: '' })} title="Clone Lookup Type">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Provide a new name for the cloned lookup type.</p>
          <input value={cloneModal.newName} onChange={(e) => setCloneModal(c => ({ ...c, newName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setCloneModal({ open: false, sourceId: null, newName: '' })} className="px-4 py-2 rounded border">Cancel</button>
            <button onClick={submitClone} className="px-4 py-2 bg-indigo-600 text-white rounded">Clone</button>
          </div>
        </div>
      </Modal>

      {/* Confirm Modal for delete/deactivate */}
      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, type: null, id: null, title: '', message: '' })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
