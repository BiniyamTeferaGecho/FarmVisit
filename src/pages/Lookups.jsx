import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Edit3, Zap } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import AlertModal from '../components/AlertModal'

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:80/api'

function useFetchLookupTypes(reloadKey, fetchWithAuth) {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setTypesError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    try {
      if (typeof setTypesError === 'function') setTypesError(null)
    } catch (e) {
      console.warn('setTypesError is not callable on mount', e)
    }
    (async () => {
      try {
        const res = fetchWithAuth ? await fetchWithAuth({ url: '/lookup-types', method: 'get' }) : await axios.get(`${API_BASE}/lookup-types`)
        if (mounted) setTypes(res.data && res.data.data ? res.data.data : res.data || [])
      } catch (err) {
        console.error(err)
        try {
          if (mounted && typeof setTypesError === 'function') setTypesError(err?.response?.data?.message || err.message || 'Failed to load types')
        } catch (e) {
          console.warn('setTypesError is not callable when handling error', e)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [reloadKey, fetchWithAuth])

  return { types, loading, error, setTypes }
}

function useFetchLookups(reloadKey, lookupTypeId, fetchWithAuth) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setLookupsError] = useState(null)

  useEffect(() => {
    if (!lookupTypeId) { setData([]); return }
    let mounted = true
  setLoading(true)
  try {
    if (typeof setLookupsError === 'function') setLookupsError(null)
  } catch (e) {
    console.warn('setLookupsError is not callable on mount', e)
  }
    (async () => {
      try {
        const res = fetchWithAuth ? await fetchWithAuth({ url: `/lookup-types/${lookupTypeId}/lookups`, method: 'get' }) : await axios.get(`${API_BASE}/lookup-types/${lookupTypeId}/lookups`)
        if (mounted) setData(res.data && res.data.data ? res.data.data : res.data || [])
      } catch (err) {
        console.error(err)
        try {
          if (mounted && typeof setLookupsError === 'function') setLookupsError(err?.response?.data?.message || err.message || 'Failed to load lookups')
        } catch (e) {
          console.warn('setLookupsError is not callable when handling error', e)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [reloadKey, lookupTypeId])

  return { data, loading, error, setData }
}

export default function Lookups({ reloadKey }) {
  const { user, fetchWithAuth } = useAuth()
  const { types, loading: typesLoading, error: typesError } = useFetchLookupTypes(reloadKey || 0, fetchWithAuth)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [selectedType, setSelectedType] = useState(types && types[0] ? types[0].LookupTypeID : null)

  useEffect(() => {
    if (types && types.length && !selectedType) setSelectedType(types[0].LookupTypeID)
  }, [types])

  // Listen for global changes so other parts of the app can request a refresh
  useEffect(() => {
    const handler = (e) => {
      // if event provides a LookupTypeID, only refresh when it matches selectedType
      const typeId = e?.detail?.LookupTypeID || e?.detail?.lookupTypeId || null
      if (!typeId || typeId === selectedType) {
        refresh()
      }
    }
    window.addEventListener('lookups:changed', handler)
    return () => window.removeEventListener('lookups:changed', handler)
  }, [selectedType])

  const { data: lookups, loading, error, setData } = useFetchLookups(reloadKey || 0, selectedType, fetchWithAuth)

  const [form, setForm] = useState({ LookupValue: '', LookupDescription: '', SortOrder: 0, IsActive: true, ParentLookupID: null, CustomField1: '', CustomField2: '', CustomField3: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // auto-open error modal for types/list errors
  useEffect(() => {
    if (typesError || error || (message && message.type === 'error')) setShowErrorModal(true)
  }, [typesError, error, message])

  const resetForm = () => setForm({ LookupValue: '', LookupDescription: '', SortOrder: 0, IsActive: true, ParentLookupID: null, CustomField1: '', CustomField2: '', CustomField3: '' })

  const refresh = async () => {
    if (!selectedType) {
      console.warn('Lookups.refresh: no selectedType, nothing to refresh')
      return
    }
    console.debug('Lookups.refresh: fetching lookups for', selectedType)
    try {
      const res = fetchWithAuth ? await fetchWithAuth({ url: `/lookup-types/${selectedType}/lookups`, method: 'get' }) : await axios.get(`${API_BASE}/lookup-types/${selectedType}/lookups`)
      const payload = res.data && res.data.data ? res.data.data : res.data || []
      try {
        if (typeof setData === 'function') setData(payload)
        else console.warn('Lookups.refresh: setData is not a function', typeof setData)
      } catch (e) {
        console.warn('Lookups.refresh: failed to set data', e)
      }
      // notify any listeners
      try { window.dispatchEvent(new CustomEvent('lookups:changed', { detail: { LookupTypeID: selectedType, action: 'refresh' } })) } catch (e) {}
    } catch (err) {
      console.error('Lookups.refresh error', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedType) { setMessage({ type: 'error', text: 'Select a lookup type first' }); return }
    if (!form.LookupValue) { setMessage({ type: 'error', text: 'Value is required' }); return }
    const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
    if (!userId) { setMessage({ type: 'error', text: 'You must be signed in to create lookups.' }); return }
    setSaving(true); setMessage(null)
    try {
      const payload = {
        LookupTypeID: selectedType,
        LookupValue: form.LookupValue.trim(),
        LookupDescription: form.LookupDescription || null,
        SortOrder: form.SortOrder ?? 0,
        IsActive: form.IsActive ? 1 : 0,
        ParentLookupID: form.ParentLookupID || null,
        CustomField1: form.CustomField1 || null,
        CustomField2: form.CustomField2 || null,
        CustomField3: form.CustomField3 || null,
        CreatedBy: userId,
      }
      const res = await fetchWithAuth({ url: '/lookups', method: 'post', data: payload })
      // show generated code if returned by server
      const returned = res?.data?.data || {}
      const genCode = returned.LookupCode || returned.lookupCode || (Array.isArray(returned) && returned[0] && (returned[0].LookupCode || returned[0].lookupCode)) || null
      setMessage({ type: 'success', text: genCode ? `Lookup created — Code: ${genCode}` : 'Lookup created' })
      resetForm()
      // notify listeners and refresh (include returned data if available)
      try { window.dispatchEvent(new CustomEvent('lookups:changed', { detail: { LookupTypeID: selectedType, action: 'create', lookup: returned } })) } catch (e) { /* ignore */ }
      await refresh()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create' })
    } finally {
      setSaving(false)
    }
  }

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, type: null, id: null, title: '', message: '' })

  const openEdit = (l) => {
    setEditModal({ open: true, id: l.LookupID, form: { LookupCode: l.LookupCode, LookupValue: l.LookupValue, LookupDescription: l.LookupDescription || '', SortOrder: l.SortOrder || 0, IsActive: !!l.IsActive, ParentLookupID: l.ParentLookupID || null, CustomField1: l.CustomField1 || '', CustomField2: l.CustomField2 || '', CustomField3: l.CustomField3 || '' }, saving: false })
  }

  const submitEdit = async () => {
    const { id, form } = editModal
    if (!form.LookupValue) { setMessage({ type: 'error', text: 'Value is required' }); return }
    setEditModal(s => ({ ...s, saving: true }))
    try {
      const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
      if (!userId) { setMessage({ type: 'error', text: 'You must be signed in to update lookups.' }); setEditModal(s => ({ ...s, saving: false })); return }
      const payload = {
        LookupID: id,
        LookupValue: form.LookupValue.trim(),
        LookupDescription: form.LookupDescription || null,
        SortOrder: form.SortOrder ?? 0,
        IsActive: form.IsActive ? 1 : 0,
        ParentLookupID: form.ParentLookupID || null,
        CustomField1: form.CustomField1 || null,
        CustomField2: form.CustomField2 || null,
        CustomField3: form.CustomField3 || null,
        UpdatedBy: userId,
      }
      await fetchWithAuth({ url: `/lookups/${id}`, method: 'put', data: payload })
  setMessage({ type: 'success', text: 'Updated successfully' })
  setEditModal({ open: false, id: null, form: null, saving: false })
  try { window.dispatchEvent(new CustomEvent('lookups:changed', { detail: { LookupTypeID: selectedType, action: 'update', lookupId: id } })) } catch (e) {}
  await refresh()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = async (id) => {
    setConfirm({ open: true, type: 'delete', id, title: 'Delete lookup', message: 'Soft-delete this lookup?' })
  }

  const confirmExecute = async () => {
    if (!confirm.open) return
    const { type, id } = confirm
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
      if (!userId) throw new Error('You must be signed in to perform this action')

      if (type === 'delete') {
  await fetchWithAuth({ url: `/lookups/${id}/soft-delete`, method: 'post', data: { DeletedBy: userId } })
  setMessage({ type: 'success', text: 'Deleted' })
  try { window.dispatchEvent(new CustomEvent('lookups:changed', { detail: { LookupTypeID: selectedType, action: 'delete', lookupId: id } })) } catch (e) {}
      }
      await refresh()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Operation failed' })
    } finally {
      setConfirm({ open: false, type: null, id: null, title: '', message: '' })
    }
  }

  const handleReorder = async () => {
    if (!selectedType) { setMessage({ type: 'error', text: 'Select a lookup type first' }); return }
    try {
      const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
      if (!userId) { setMessage({ type: 'error', text: 'You must be signed in to reorder.' }); return }
      await fetchWithAuth({ url: '/lookups/reorder', method: 'post', data: { LookupTypeID: selectedType, UpdatedBy: userId } })
  setMessage({ type: 'success', text: 'Reordered' })
  try { window.dispatchEvent(new CustomEvent('lookups:changed', { detail: { LookupTypeID: selectedType, action: 'reorder' } })) } catch (e) {}
  await refresh()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Reorder failed' })
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Lookups</h2>
          <p className="text-sm text-slate-500">Manage lookup items for selected lookup types.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedType || ''} onChange={(e) => setSelectedType(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">-- Select Lookup Type --</option>
            {types && types.map(t => <option key={t.LookupTypeID} value={t.LookupTypeID}>{t.TypeName}</option>)}
          </select>
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm hover:bg-gray-50"><Zap className="h-4 w-4 text-slate-600"/> Refresh</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm text-left">
          <h3 className="text-lg font-medium mb-4 text-slate-800 dark:text-slate-100">New Lookup</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1 text-left">Code</label>
              <div className="text-sm text-slate-500">Code will be generated automatically by the server on create.</div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1 text-left">Value</label>
              <input value={form.LookupValue} onChange={(e) => setForm({ ...form, LookupValue: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1 text-left">Description</label>
              <textarea value={form.LookupDescription} onChange={(e) => setForm({ ...form, LookupDescription: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div className="flex items-center gap-3 text-left">
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

  <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm overflow-auto text-left">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Lookups for selected type</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleReorder} className="px-3 py-2 border rounded text-sm">Reorder</button>
            </div>
          </div>

          {loading && <div className="text-sm text-slate-500">Loading...</div>}
          { (typesError || error) ? <div className="text-sm text-red-500">An error occurred. Please try again.</div> : null }
          <AlertModal open={showErrorModal} title="Error" message={"An unexpected error occurred. Please try again or contact support."} details={typesError || error || (message && message.type === 'error' ? message.text : null)} onClose={() => { setShowErrorModal(false); try { if (typeof setData === 'function') setData([]) } catch(e){}; try { if (typeof setMessage === 'function') setMessage(null) } catch(e){}; }} />

          <div className="w-full overflow-auto">
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Code</th>
                  <th className="p-3">Value</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Parent</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lookups && lookups.length === 0 && (<tr><td colSpan={5} className="p-3 text-slate-500">No lookups found for this type.</td></tr>)}
                {lookups && lookups.map(l => (
                  <tr key={l.LookupID} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{l.LookupCode}</td>
                    <td className="p-3 align-top text-slate-600">{l.LookupValue}</td>
                    <td className="p-3 align-top">{l.IsActive ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                    <td className="p-3 align-top text-slate-500">{l.ParentLookupID || '-'}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(l)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Edit3 className="h-4 w-4"/></button>
                        <button onClick={() => handleDelete(l.LookupID)} className="p-2 rounded-md hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit: ${editModal.form.LookupCode}` : 'Edit Lookup'}>
        {editModal.form && (
          <div className="space-y-4">
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Code</label>
              <input value={editModal.form.LookupCode} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-100" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Value</label>
              <input value={editModal.form.LookupValue} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, LookupValue: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={editModal.form.LookupDescription} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, LookupDescription: e.target.value } }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
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

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, type: null, id: null, title: '', message: '' })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
