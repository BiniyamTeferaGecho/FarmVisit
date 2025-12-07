import React, { useEffect, useState, useCallback } from 'react'
import api from '../utils/api'
import { useAuth } from '../auth/AuthProvider'

export default function FarmType() {
  const { user } = useAuth()
  const isAdmin = !!(user && Array.isArray(user.roles) && (user.roles.includes('ROLE_ADMIN') || user.roles.includes('ROLE_SUPER_ADMIN')))

  const [, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('') // '', '1', '0'

  const [, setActiveLookup] = useState([])

  // form state
  const emptyForm = { FarmTypeID: '', TypeName: '', TypeCode: '', Description: '', IsActive: true, SortOrder: null }
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [formError, setFormError] = useState(null)

  const loadActiveLookup = useCallback(async () => {
    try {
      const res = await api.get('/farm-types/views/active')
      const data = res?.data?.data ?? res?.data ?? []
      setActiveLookup(Array.isArray(data) ? data : [])
    } catch (err) {
      console.warn('Failed to load active farm types', err)
      setActiveLookup([])
    }
  }, [])

  const loadPaged = useCallback(async (p = page, size = pageSize, q = search, isActive = isActiveFilter) => {
    setLoading(true)
    try {
      const params = { page: p, pageSize: size }
      if (q) params.q = q
      if (isActive !== '') params.isActive = isActive
      const res = await api.get('/farm-types', { params })
      const body = res?.data?.data ?? res?.data ?? {}
      const items = body.items || body || []
      const total = body.total || (items && items.length) || 0
      setItems(Array.isArray(items) ? items : [])
      setTotal(Number(total) || 0)
      setPage(p)
      setPageSize(size)
    } catch (err) {
      console.error('Failed to load farm types', err)
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, isActiveFilter])

  useEffect(() => { loadActiveLookup(); }, [loadActiveLookup])
  useEffect(() => { loadPaged(1, pageSize, search, isActiveFilter) }, [loadPaged, pageSize, search, isActiveFilter])

  const resetForm = () => { setForm(emptyForm); setEditing(false); setFormError(null) }

  const handleEdit = async (id) => {
    try {
      setLoading(true)
      const res = await api.get(`/farm-types/${id}`)
      const data = res?.data?.data ?? res?.data ?? null
      if (!data) { alert('Not found'); return }
      setForm({
        FarmTypeID: data.FarmTypeID,
        TypeName: data.TypeName || '',
        TypeCode: data.TypeCode || '',
        Description: data.Description || '',
        IsActive: data.IsActive === 1 || data.IsActive === true,
        SortOrder: data.SortOrder || null,
      })
      setEditing(true)
    } catch (err) {
      console.error('Failed to load farm type', err)
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.TypeName || !form.TypeCode) { setFormError('TypeName and TypeCode are required'); return }
    if (!isAdmin) { setFormError('You need admin role to perform this action'); return }

    try {
      setLoading(true)
      const payload = {
        TypeName: form.TypeName,
        TypeCode: form.TypeCode,
        Description: form.Description,
        IsActive: form.IsActive ? 1 : 0,
        SortOrder: form.SortOrder === null ? null : Number(form.SortOrder),
      }
      if (editing) {
        // UpdatedBy from auth if available
        payload.UpdatedBy = user?.id || user?.sub || null
        await api.put(`/farm-types/${form.FarmTypeID}`, payload)
        await loadPaged(1, pageSize, search, isActiveFilter)
        resetForm()
      } else {
  payload.CreatedBy = user?.id || user?.sub || null
  await api.post('/farm-types', payload)
        // on success, reload list and lookup
        await loadPaged(1, pageSize, search, isActiveFilter)
        await loadActiveLookup()
        resetForm()
      }
    } catch (err) {
      console.error('Save failed', err)
      setFormError(err?.response?.data?.message || err.message || String(err))
    } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!isAdmin) { alert('Admin only'); return }
    if (!confirm('Mark this farm type as deleted?')) return
    try {
      setLoading(true)
      const body = { DeletedBy: user?.id || user?.sub || null }
      await api.delete(`/farm-types/${id}`, { data: body })
      await loadPaged(1, pageSize, search, isActiveFilter)
      await loadActiveLookup()
    } catch (err) {
      console.error('Delete failed', err)
      alert(err?.response?.data?.message || err.message || 'Delete failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Farm Types</h1>
        <div className="text-sm text-gray-600">Total: {total}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      

        <div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">{editing ? 'Edit Farm Type' : 'Create Farm Type'}</h3>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <label className="text-sm block">TypeName</label>
                <input value={form.TypeName} onChange={(e)=>setForm({...form, TypeName: e.target.value})} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="text-sm block">TypeCode</label>
                <input value={form.TypeCode} onChange={(e)=>setForm({...form, TypeCode: e.target.value})} className="w-full px-2 py-1 border rounded" />
              </div>
              <div>
                <label className="text-sm block">Description</label>
                <textarea value={form.Description} onChange={(e)=>setForm({...form, Description: e.target.value})} className="w-full px-2 py-1 border rounded" rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.IsActive} onChange={(e)=>setForm({...form, IsActive: e.target.checked})} /> Active</label>
                <label className="text-sm">SortOrder</label>
                <input type="number" value={form.SortOrder || ''} onChange={(e)=>setForm({...form, SortOrder: e.target.value ? Number(e.target.value) : null})} className="px-2 py-1 border rounded w-24" />
              </div>
              {formError && <div className="text-sm text-red-500">{formError}</div>}
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">{editing ? 'Save' : 'Create'}</button>
                <button type="button" onClick={resetForm} className="px-3 py-1 border rounded">Reset</button>
              </div>
            </form>
          </div>
        </div>
          <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <input placeholder="Search" value={search} onChange={(e)=>setSearch(e.target.value)} className="px-2 py-1 border rounded w-64" />
            <select value={isActiveFilter} onChange={(e)=>setIsActiveFilter(e.target.value)} className="px-2 py-1 border rounded">
              <option value="">All</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
            <button onClick={()=>loadPaged(1, pageSize, search, isActiveFilter)} className="px-3 py-1 bg-blue-600 text-white rounded">Apply</button>
          </div>

          <div className="overflow-auto bg-white dark:bg-gray-800 rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-left">TypeName</th>
                  <th className="px-3 py-2 text-left">TypeCode</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Active</th>
                  <th className="px-3 py-2 text-left">Sort</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.FarmTypeID} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-3 py-2">{it.TypeName}</td>
                    <td className="px-3 py-2">{it.TypeCode}</td>
                    <td className="px-3 py-2">{it.Description}</td>
                    <td className="px-3 py-2">{it.IsActive ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">{it.SortOrder}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={()=>handleEdit(it.FarmTypeID)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Edit</button>
                        <button onClick={()=>handleDelete(it.FarmTypeID)} className="px-2 py-1 bg-red-600 text-white rounded text-xs" disabled={!isAdmin}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-sm">Page {page}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>loadPaged(Math.max(1, page-1), pageSize, search, isActiveFilter)} disabled={page<=1} className="px-3 py-1 border rounded">Prev</button>
              <button onClick={()=>loadPaged(page+1, pageSize, search, isActiveFilter)} disabled={(page*pageSize)>=total} className="px-3 py-1 border rounded">Next</button>
              <select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); loadPaged(1, Number(e.target.value), search, isActiveFilter) }} className="px-2 py-1 border rounded">
                {[10,20,50,100].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
