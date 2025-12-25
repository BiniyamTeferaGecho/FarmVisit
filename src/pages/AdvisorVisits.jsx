import React, { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import ScheduleList from '../components/schedule/ScheduleList'

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
        // Use the new paginated per-user endpoint for advisors. The backend will derive UserID
        // from the token if not explicitly provided. We still include page and pageSize.
        const params = new URLSearchParams()
        params.set('PageNumber', String(page))
        params.set('PageSize', String(pageSize))
        // Include completed and drafts by default; adjust if filters request exclusion
        params.set('IncludeCompleted', String(1))
        params.set('IncludeDraft', String(1))
        const url = `/farm-visit-schedule/list/user?${params.toString()}`
        const res = await fetchWithAuth({ url, method: 'get' })
        const body = res?.data || res
        if (!mounted) return
        // New endpoint returns { success: true, data: rows, totalCount }
        if (body && body.success && Array.isArray(body.data)) {
          setItems(body.data)
          setTotal(body.totalCount || (body.data && body.data.length) || 0)
          const uniq = Array.from(new Set((body.data || []).map(i => i.VisitStatus || i.VisitStatusName).filter(Boolean)))
          setStatuses(uniq)
        } else if (Array.isArray(body)) {
          // fallback older shapes
          setItems(body)
          setTotal(body.length)
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
        {/* Use the shared ScheduleList component so My Visits matches the main Visit Schedule columns and actions */}
        <ScheduleList
          schedules={items}
          fetchWithAuth={fetchWithAuth}
          pageStartOffset={(page - 1) * pageSize}
          onView={(row) => {
            try {
              const id = row?.ScheduleID || row?.id || row?.ScheduleId;
              if (!id) return;
              const p = new URLSearchParams(window.location.search || '');
              p.set('tab', 'farmvisitschedule');
              p.set('open', 'view');
              p.set('scheduleId', String(id));
              const newUrl = `${window.location.pathname}?${p.toString()}`;
              window.history.pushState({}, '', newUrl);
              // notify Dashboard's useSearchParams to pick up the change
              window.dispatchEvent(new PopStateEvent('popstate'));
            } catch (e) { console.debug('navigate to schedule view failed', e) }
          }}
          onEdit={(row) => {
            try {
              const id = row?.ScheduleID || row?.id || row?.ScheduleId;
              if (!id) return;
              const p = new URLSearchParams(window.location.search || '');
              p.set('tab', 'farmvisitschedule');
              p.set('open', 'edit');
              p.set('scheduleId', String(id));
              const newUrl = `${window.location.pathname}?${p.toString()}`;
              window.history.pushState({}, '', newUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            } catch (e) { console.debug('navigate to schedule edit failed', e) }
          }}
          onDelete={(row) => { console.log('delete', row) }}
          onSubmit={(row) => { console.log('submit', row) }}
          onFill={(row) => {
            try {
              const id = row?.ScheduleID || row?.id || row?.ScheduleId;
              if (!id) return;
              const p = new URLSearchParams(window.location.search || '');
              p.set('tab', 'farmvisitschedule');
              p.set('open', 'fill');
              p.set('scheduleId', String(id));
              const newUrl = `${window.location.pathname}?${p.toString()}`;
              window.history.pushState({}, '', newUrl);
              window.dispatchEvent(new PopStateEvent('popstate'));
            } catch (e) { console.debug('navigate to schedule fill failed', e) }
          }}
          onProcess={(row) => { console.log('process', row) }}
          onComplete={(row) => { console.log('complete', row) }}
          recentlyFilled={{}}
          confirmedFilled={{}}
        />
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
