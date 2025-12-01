import React, { useEffect, useState, useRef } from 'react'
import { Plus, Edit3, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:3000/api'

function getUserId(user) {
  return user && (user.UserID || user.userId || user.UserId || user.id || user.ID)
}

export default function Forms() {
  const { user, fetchWithAuth } = useAuth()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [parentOptions, setParentOptions] = useState([])
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 25 })
  const [ordering, setOrdering] = useState([])
  const [hasOrderChanges, setHasOrderChanges] = useState(false)

  const [form, setForm] = useState({ FormName: '', FormDescription: '', Path: '', Module: '', ParentFormID: null, IsActive: true })
  const [saving, setSaving] = useState(false)

  const [editModal, setEditModal] = useState({ open: false, id: null, form: null, saving: false })
  const [confirm, setConfirm] = useState({ open: false, id: null, title: '', message: '', processing: false })
  const editNameTimerRef = useRef(null)
  const editPathTimerRef = useRef(null)
  const [editNameStatus, setEditNameStatus] = useState('idle') // idle | validating | valid | invalid
  const [editPathStatus, setEditPathStatus] = useState('idle') // idle | validating | valid | invalid

  const fetchForms = async (page = 1) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth({ url: '/forms', method: 'get', params: { page, pageSize: pagination.pageSize } })
      const data = res.data && (res.data.data || res.data) || []
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : [])
      setForms(items)
      // update pagination if provided by API
      if (data.pagination) setPagination(data.pagination)
      else setPagination(p => ({ ...p, currentPage: page, totalCount: items.length }))
      // initialize ordering for current page
      setOrdering(items.map(f => f.FormID))
      setHasOrderChanges(false)
    } catch (err) {
      console.error('fetchForms error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load forms' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchForms(pagination.currentPage) }, [])

  // cleanup timers when component unmounts
  useEffect(() => {
    return () => {
      try { if (editNameTimerRef.current) clearTimeout(editNameTimerRef.current) } catch (e) {}
      try { if (editPathTimerRef.current) clearTimeout(editPathTimerRef.current) } catch (e) {}
    }
  }, [])

  // reset inline validation state when modal closes
  useEffect(() => {
    if (!editModal.open) {
      if (editNameTimerRef.current) { clearTimeout(editNameTimerRef.current); editNameTimerRef.current = null }
      if (editPathTimerRef.current) { clearTimeout(editPathTimerRef.current); editPathTimerRef.current = null }
      setEditNameStatus('idle')
      setEditPathStatus('idle')
    }
  }, [editModal.open])

  // fetch parent options (load a large page to populate dropdown)
  const fetchParentOptions = async () => {
    try {
      const res = await fetchWithAuth({ url: '/forms', method: 'get', params: { page: 1, pageSize: 1000 } })
      const data = res.data && (res.data.data || res.data) || []
      const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : [])
      setParentOptions(items)
    } catch (err) {
      // ignore; parent dropdown will be empty
      console.warn('fetchParentOptions error', err)
    }
  }

  useEffect(() => { fetchParentOptions() }, [])

  const resetForm = () => setForm({ FormName: '', FormDescription: '', Path: '', Module: '', ParentFormID: null, IsActive: true })

  const handleCreate = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.FormName) { setMessage({ type: 'error', text: 'Form name is required' }); return }
    if (!form.Path || !(form.Path || '').toString().trim()) { setMessage({ type: 'error', text: 'Form path is required' }); return }
    if (!form.Module || !(form.Module || '').toString().trim()) { setMessage({ type: 'error', text: 'Module is required' }); return }
    const createdBy = getUserId(user)
    if (!createdBy) { setMessage({ type: 'error', text: 'You must be signed in to create forms.' }); return }
    setSaving(true)
    try {
      const payload = {
        FormName: form.FormName.trim(),
        FormDescription: (form.FormDescription || '').toString().trim(),
        Path: (form.Path || '').toString().trim(),
        Module: (form.Module || '').toString().trim(),
        ParentFormID: form.ParentFormID || null,
        IsActive: form.IsActive ? 1 : 0,
        CreatedBy: createdBy,
      }
      await fetchWithAuth({ url: '/forms', method: 'post', data: payload })
      setMessage({ type: 'success', text: 'Form created' })
      resetForm()
      await fetchForms()
    } catch (err) {
      console.error('createForm error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create form' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (f) => {
    setEditModal({ open: true, id: f.FormID, form: { FormName: f.FormName, FormDescription: f.FormDescription || '', Path: f.FormPath || f.Path || '', Module: f.Module || '', ParentFormID: f.ParentFormID || null, IsActive: !!f.IsActive }, saving: false })
  }

  const submitEdit = async () => {
    const { id, form: f } = editModal
    if (!f.FormName) { setMessage({ type: 'error', text: 'Form name is required' }); return }
    const updatedBy = getUserId(user)
    if (!updatedBy) { setMessage({ type: 'error', text: 'You must be signed in to update forms.' }); return }
    setEditModal(s => ({ ...s, saving: true }))
    try {
      const payload = { FormName: f.FormName.trim(), FormDescription: (f.FormDescription || '').toString().trim(), Path: f.Path || null, Module: f.Module || null, ParentFormID: f.ParentFormID || null, IsActive: f.IsActive ? 1 : 0, UpdatedBy: updatedBy }
      await fetchWithAuth({ url: `/forms/${id}`, method: 'patch', data: payload })
      setMessage({ type: 'success', text: 'Form updated' })
      setEditModal({ open: false, id: null, form: null, saving: false })
      await fetchForms()
    } catch (err) {
      console.error('updateForm error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to update form' })
      setEditModal(s => ({ ...s, saving: false }))
    }
  }

  const handleDelete = (f) => {
    setConfirm({ open: true, id: f.FormID, title: `Delete ${f.FormName}`, message: 'Soft-delete this form?', processing: false })
  }

  const confirmExecute = async () => {
    if (!confirm.open) return
    setConfirm(c => ({ ...c, processing: true }))
    try {
      const deletedBy = getUserId(user)
      if (!deletedBy) throw new Error('You must be signed in to delete forms.')
      await fetchWithAuth({ url: `/forms/${confirm.id}/delete`, method: 'post', data: { DeletedBy: deletedBy } })
      setMessage({ type: 'success', text: 'Form deleted' })
      await fetchForms()
    } catch (err) {
      console.error('deleteForm error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to delete form' })
    } finally {
      setConfirm({ open: false, id: null, title: '', message: '', processing: false })
    }
  }

  const checkNameExists = async (name, excludeId = null) => {
    if (!name) return false
    try {
      const res = await fetchWithAuth({ url: '/forms/check-name', method: 'get', params: { FormName: name, ExcludeFormID: excludeId } })
      return res?.data?.data?.exists || false
    } catch (err) {
      return false
    }
  }

  const checkPathExists = async (path, excludeId = null) => {
    if (!path) return false
    try {
      const res = await fetchWithAuth({ url: '/forms/check-path', method: 'get', params: { Path: path, ExcludeFormID: excludeId } })
      return res?.data?.data?.exists || false
    } catch (err) {
      return false
    }
  }

  return (
    <div className="space-y-6 h-full">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Forms</h2>
          <p className="text-sm text-slate-500">Manage application forms and navigation paths.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditModal({ open: true, id: null, form: { FormName: '', FormDescription: '', Path: '', Module: '', ParentFormID: null, IsActive: true }, saving: false })} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm"> <Plus className="h-4 w-4"/> New Form</button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-lg shadow-sm overflow-auto h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">All Forms</h3>
          <div className="text-sm text-slate-500">{loading ? 'Loading...' : `${pagination.totalCount || forms.length || 0} forms`}</div>
        </div>

        <div className="w-full overflow-auto">
          {(!forms || forms.length === 0) ? (
            <div className="h-48 flex items-center justify-center">
              <div className="text-slate-500">No forms found.</div>
            </div>
          ) : (
            <table className="w-full text-sm table-auto text-left">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="p-3">Name</th>
                  <th className="p-3">Path</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f, idx) => (
                  <tr key={f.FormID} className="border-t">
                    <td className="p-3 align-top font-medium text-slate-800">{f.FormName}</td>
                      <td className="p-3 align-top text-slate-600">{f.FormPath || f.Path || '-'}</td>
                    <td className="p-3 align-top text-slate-600">{f.Module || '-'}</td>
                    <td className="p-3 align-top">{f.IsActive ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(f)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Edit3 className="h-4 w-4"/></button>
                        <button onClick={() => handleDelete(f)} className="p-2 rounded-md hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col items-center gap-1">
                        <button disabled={idx === 0} onClick={() => { const next = [...forms]; [next[idx-1], next[idx]] = [next[idx], next[idx-1]]; setForms(next); setOrdering(next.map(x => x.FormID)); setHasOrderChanges(true); }} className="p-1 rounded hover:bg-gray-100" title="Move up"><ArrowUp className="h-4 w-4"/></button>
                        <button disabled={idx === forms.length - 1} onClick={() => { const next = [...forms]; [next[idx+1], next[idx]] = [next[idx], next[idx+1]]; setForms(next); setOrdering(next.map(x => x.FormID)); setHasOrderChanges(true); }} className="p-1 rounded hover:bg-gray-100" title="Move down"><ArrowDown className="h-4 w-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button onClick={() => { if (pagination.currentPage > 1) { fetchForms(pagination.currentPage - 1) } }} className="px-3 py-1 border rounded">Prev</button>
            <span className="text-sm text-slate-600">Page {pagination.currentPage} / {Math.max(1, Math.ceil((pagination.totalCount || forms.length) / pagination.pageSize))}</span>
            <button onClick={() => { const max = Math.max(1, Math.ceil((pagination.totalCount || forms.length) / pagination.pageSize)); if (pagination.currentPage < max) { fetchForms(pagination.currentPage + 1) } }} className="px-3 py-1 border rounded">Next</button>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={!hasOrderChanges} onClick={async () => {
              try {
                setLoading(true)
                const payload = { OrderedFormIDs: ordering, UpdatedBy: getUserId(user) }
                await fetchWithAuth({ url: '/forms/reorder', method: 'post', data: payload })
                setMessage({ type: 'success', text: 'Order saved' })
                setHasOrderChanges(false)
                await fetchForms(pagination.currentPage)
              } catch (err) {
                console.error('save order error', err)
                setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to save order' })
              } finally { setLoading(false) }
            }} className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50">Save Order</button>
          </div>
        </div>
      </div>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, id: null, form: null })} title={editModal.form ? `Edit: ${editModal.form.FormName}` : 'New Form'}>
        {editModal.form && (
          <div className="space-y-4">
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Form Name</label>
              <div className="flex items-center gap-2">
                <input value={editModal.form.FormName} onChange={(e) => {
                  const v = e.target.value
                  setEditModal(s => ({ ...s, form: { ...s.form, FormName: v } }))
                  if (editNameTimerRef.current) clearTimeout(editNameTimerRef.current)
                  if (!v || !v.toString().trim()) { setEditNameStatus('idle'); return }
                  setEditNameStatus('validating')
                  editNameTimerRef.current = setTimeout(async () => {
                    try {
                      const exists = await checkNameExists(v.toString().trim(), editModal.id)
                      setEditNameStatus(exists ? 'invalid' : 'valid')
                    } catch (err) {
                      setEditNameStatus('idle')
                    }
                  }, 400)
                }} onBlur={async (e) => {
                  const v = (e.target.value || '').toString().trim()
                  if (!v) return
                  setEditNameStatus('validating')
                  const exists = await checkNameExists(v, editModal.id)
                  setEditNameStatus(exists ? 'invalid' : 'valid')
                  if (exists) setMessage({ type: 'error', text: 'Form name already exists' })
                }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
                <div className="min-w-[90px]">
                  {editNameStatus === 'validating' && <div className="text-sm text-gray-500">Checking...</div>}
                  {editNameStatus === 'valid' && <div className="text-sm text-green-600">Available</div>}
                  {editNameStatus === 'invalid' && <div className="text-sm text-red-600">Taken</div>}
                </div>
              </div>
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Description</label>
              <textarea value={editModal.form.FormDescription} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, FormDescription: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" rows={3} />
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Path</label>
              <div className="flex items-center gap-2">
                <input value={editModal.form.Path} onChange={(e) => {
                  const v = e.target.value
                  setEditModal(s => ({ ...s, form: { ...s.form, Path: v } }))
                  if (editPathTimerRef.current) clearTimeout(editPathTimerRef.current)
                  if (!v || !v.toString().trim()) { setEditPathStatus('idle'); return }
                  setEditPathStatus('validating')
                  editPathTimerRef.current = setTimeout(async () => {
                    try {
                      const exists = await checkPathExists(v.toString().trim(), editModal.id)
                      setEditPathStatus(exists ? 'invalid' : 'valid')
                    } catch (err) {
                      setEditPathStatus('idle')
                    }
                  }, 400)
                }} onBlur={async (e) => {
                  const v = (e.target.value || '').toString().trim()
                  if (!v) return
                  setEditPathStatus('validating')
                  const exists = await checkPathExists(v, editModal.id)
                  setEditPathStatus(exists ? 'invalid' : 'valid')
                  if (exists) setMessage({ type: 'error', text: 'Path already in use' })
                }} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
                <div className="min-w-[90px]">
                  {editPathStatus === 'validating' && <div className="text-sm text-gray-500">Checking...</div>}
                  {editPathStatus === 'valid' && <div className="text-sm text-green-600">Available</div>}
                  {editPathStatus === 'invalid' && <div className="text-sm text-red-600">Taken</div>}
                </div>
              </div>
            </div>
            <div>
              <label className="text-left text-sm font-medium text-slate-700 block mb-1">Module</label>
              <input value={editModal.form.Module} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, Module: e.target.value } }))} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editModal.form.IsActive} onChange={(e) => setEditModal(s => ({ ...s, form: { ...s.form, IsActive: e.target.checked } }))} className="form-checkbox h-4 w-4" />
                <span>Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal({ open: false, id: null, form: null })} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={async () => {
                if (editModal.id) await submitEdit()
                else {
                  // create via form in modal
                  const fakeEvent = { preventDefault: () => {} }
                  await (async () => {
                      const createdBy = getUserId(user)
                      if (!createdBy) { setMessage({ type: 'error', text: 'You must be signed in to create forms.' }); return }
                      // client-side required field validation
                      if (!editModal.form.FormName || !(editModal.form.FormName || '').toString().trim()) { setMessage({ type: 'error', text: 'Form name is required' }); return }
                      if (!editModal.form.Path || !(editModal.form.Path || '').toString().trim()) { setMessage({ type: 'error', text: 'Form path is required' }); return }
                      if (!editModal.form.Module || !(editModal.form.Module || '').toString().trim()) { setMessage({ type: 'error', text: 'Module is required' }); return }
                      const payload = {
                        FormName: (editModal.form.FormName || '').toString().trim(),
                        FormDescription: (editModal.form.FormDescription || '').toString().trim(),
                        Path: (editModal.form.Path || '').toString().trim(),
                        Module: (editModal.form.Module || '').toString().trim(),
                        ParentFormID: editModal.form.ParentFormID || null,
                        IsActive: editModal.form.IsActive ? 1 : 0,
                        CreatedBy: createdBy,
                      }
                    setSaving(true)
                    try {
                      await fetchWithAuth({ url: '/forms', method: 'post', data: payload })
                      setMessage({ type: 'success', text: 'Form created' })
                      setEditModal({ open: false, id: null, form: null })
                      await fetchForms()
                    } catch (err) {
                      console.error('createForm error', err)
                      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create form' })
                    } finally { setSaving(false) }
                  })()
                }
              }} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{saving ? 'Saving...' : (editModal.id ? 'Update' : 'Create')}</button>
            </div>
            {message && (<div className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>)}
          </div>
        )}
      </Modal>

      <ConfirmModal open={confirm.open} title={confirm.title} message={confirm.message} onCancel={() => setConfirm({ open: false, id: null, title: '', message: '', processing: false })} onConfirm={confirmExecute} confirmLabel="Yes" cancelLabel="No" loading={confirm.processing} />
    </div>
  )
}
