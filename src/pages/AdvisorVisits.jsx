import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function AdvisorVisits() {
  const { user, fetchWithAuth } = useAuth()
  const advisorId = user && (user.UserID || user.userId || user.id || user.UserId)

  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('VisitDate')
  const [sortDir, setSortDir] = useState('desc')
  const [statuses, setStatuses] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!advisorId) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('AdvisorID', advisorId)
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        if (q) params.set('q', q)
        if (status) params.set('status', status)
        if (startDate) params.set('StartDate', startDate)
        if (endDate) params.set('EndDate', endDate)
        if (sortBy) params.set('sortBy', sortBy)
        if (sortDir) params.set('sortDir', sortDir)
        const url = `/farm-visit/advisor?${params.toString()}`
        const res = await fetchWithAuth({ url, method: 'get' })
        const data = res?.data
        if (!mounted) return
        if (data && data.success && data.data) {
          setItems(data.data.items || [])
          setTotal(data.data.total || 0)
          // extract status options from returned items for quick filter options
          const uniq = Array.from(new Set((data.data.items || []).map(i => i.VisitStatusName).filter(Boolean)))
          setStatuses(uniq)
        } else if (res && res.data && Array.isArray(res.data)) {
          // fallback if older API shape
          setItems(res.data)
          setTotal(res.data.length)
        }
      } catch (err) {
        console.error('Failed to fetch advisor visits', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [advisorId, fetchWithAuth, page, pageSize, q, status, startDate, endDate, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="text-lg font-medium">My Scheduled Visits</h3>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Search farm or purpose" className="p-1 border rounded text-sm" />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="p-1 border rounded text-sm">
            <option value="">All status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} className="p-1 border rounded text-sm" />
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} className="p-1 border rounded text-sm" />
          <select value={sortBy + '|' + sortDir} onChange={e => { const [sby, sdir] = e.target.value.split('|'); setSortBy(sby); setSortDir(sdir); setPage(1) }} className="p-1 border rounded text-sm">
            <option value="VisitDate|desc">Date (newest)</option>
            <option value="VisitDate|asc">Date (oldest)</option>
            <option value="FarmName|asc">Farm (A→Z)</option>
            <option value="FarmName|desc">Farm (Z→A)</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="px-3 py-2">Farm</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Purpose</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Priority</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-sm text-gray-500">No visits found.</td></tr>
            ) : items.map(it => (
              <tr key={it.VisitID} className="border-t">
                <td className="px-3 py-2">{it.FarmName || it.FarmID}</td>
                <td className="px-3 py-2">{it.VisitDate ? new Date(it.VisitDate).toLocaleString() : '-'}</td>
                <td className="px-3 py-2">{it.VisitPurpose || '-'}</td>
                <td className="px-3 py-2">{it.VisitStatusName || '-'}</td>
                <td className="px-3 py-2">{it.VisitPriority || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div>{total} visits</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 border rounded bg-white">Prev</button>
          <div className="px-2">{page} / {totalPages}</div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 border rounded bg-white">Next</button>
        </div>
      </div>
    </div>
  )
}
