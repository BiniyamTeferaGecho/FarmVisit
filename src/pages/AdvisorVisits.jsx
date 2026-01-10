import React, { useEffect, useState, useReducer } from 'react'
import { useAuth } from '../auth/AuthProvider'
import ScheduleList from '../components/schedule/ScheduleList'
import ScheduleHeader from '../components/schedule/ScheduleHeader'
import ScheduleModals from '../components/schedule/ScheduleModals'
import Pagination from '../components/common/Pagination'
import { scheduleReducer, initialState } from '../reducers/scheduleReducer'
import { fetchLookups, createSchedule, fillVisit, getFilledFormByScheduleId, deleteSchedule, submitForApproval, processApproval, approveSchedule, rejectSchedule, completeVisit } from '../services/api'

export default function AdvisorVisits() {
  const { user, fetchWithAuth } = useAuth()
  const advisorId = user && (user.UserID || user.userId || user.id || user.UserId)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [serverTotalPages, setServerTotalPages] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [sortBy, setSortBy] = useState('VisitDate')
  const [sortDir, setSortDir] = useState('desc')
  const [statuses, setStatuses] = useState([])
  // local schedule modal state (so AdvisorVisits can open schedule modal inline)
  const [schState, schDispatch] = useReducer(scheduleReducer, initialState)

  // ensure lookups (advisors, employees, farms, managers) are available for the modal
  useEffect(() => {
    const load = async () => {
      try {
        await fetchLookups(schDispatch, fetchWithAuth)
      } catch (e) { /* ignore */ }
    }
    load()
  }, [fetchWithAuth])

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
        // Include completed depending on page-level toggle
        params.set('IncludeCompleted', String(showCompleted ? 1 : 0))
        params.set('IncludeDraft', String(1))
        if (q) params.set('SearchTerm', String(q))
        if (status) params.set('VisitStatus', String(status))
        if (startDate) params.set('FromDate', String(startDate))
        if (endDate) params.set('ToDate', String(endDate))
        if (sortBy) params.set('SortColumn', String(sortBy))
        if (sortDir) params.set('SortDirection', String(sortDir))
        const url = `/farm-visit-schedule/list/user/v2?${params.toString()}`
        const res = await fetchWithAuth({ url, method: 'get' })
        const body = res?.data || res
        if (!mounted) return
        // New endpoint shapes:
        // - { success: true, data: rows, totalCount }
        // - { success: true, data: rows, pagination: { TotalCount, PageNumber, PageSize } }
        if (body && body.success && Array.isArray(body.data)) {
          setItems(body.data)
          // prefer explicit totals returned by the API
          const totalFromTop = body.totalCount || body.TotalCount || body.total
          const totalFromPagination = body.pagination && (body.pagination.TotalCount || body.pagination.totalCount || body.pagination.TotalRecords)
          // Prefer explicit totals from the API. Avoid clobbering the existing `total` state
          // with the current page's row count when the API did not provide a total --
          // this prevents the pager from disappearing immediately after changing pageSize.
          let resolvedTotal = total
          if (totalFromTop) resolvedTotal = totalFromTop
          else if (totalFromPagination) resolvedTotal = totalFromPagination
          else if (!total || total === 0) resolvedTotal = (body.data && body.data.length) || 0
          setTotal(resolvedTotal)
          // if server returned pagination page info, sync local page and serverTotalPages
          if (body.pagination) {
            const pn = parseInt(body.pagination.CurrentPage || body.pagination.PageNumber || body.pagination.pageNumber || body.pagination.Page || page, 10) || page
            const ps = parseInt(body.pagination.PageSize || body.pagination.pageSize || body.pagination.Size || pageSize, 10) || pageSize
            if (pn !== page) setPage(pn)
            // don't override client-side pageSize automatically, but capture server's total pages
            const tp = parseInt(body.pagination.TotalPages || body.pagination.totalPages || body.pagination.Total || null, 10) || null
            setServerTotalPages(tp)
          } else {
            setServerTotalPages(null)
          }
          const uniq = Array.from(new Set((body.data || []).map(i => i.VisitStatus || i.VisitStatusName).filter(Boolean)))
          setStatuses(uniq)
        } else if (body && Array.isArray(body)) {
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
  }, [advisorId, fetchWithAuth, page, pageSize, q, status, startDate, endDate, sortBy, sortDir, showCompleted])

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))

  return (
    <div className="w-full">
      <div className="mb-3">
        <ScheduleHeader
          onNew={() => {
            try {
              schDispatch({ type: 'OPEN_FORM', payload: advisorId ? { AdvisorID: String(advisorId) } : null })
            } catch (e) { console.debug('failed to open new schedule inline', e) }
          }}
          onRefresh={() => { setPage(1) }}
          q={q}
          onQueryChange={(v) => { setQ(v); setPage(1) }}
          status={status}
          onStatusChange={(v) => { setStatus(v); setPage(1) }}
          statuses={statuses}
          startDate={startDate}
          endDate={endDate}
          onDateChange={(from, to) => { setStartDate(from || ''); setEndDate(to || ''); setPage(1) }}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(sby, sdir) => { setSortBy(sby || 'VisitDate'); setSortDir(sdir || 'desc'); setPage(1) }}
          showCompleted={showCompleted}
          onShowCompletedChange={(v) => { setShowCompleted(Boolean(v)); setPage(1) }}
          onClear={() => {
            setQ(''); setStatus(''); setStartDate(''); setEndDate(''); setSortBy('VisitDate'); setSortDir('desc'); setShowCompleted(false); setPage(1)
          }}
        />
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        {/* Use the shared ScheduleList component so My Visits matches the main Visit Schedule columns and actions */}
        <ScheduleList
          schedules={items}
          fetchWithAuth={fetchWithAuth}
          pageStartOffset={(page - 1) * pageSize}
          onView={(row) => {
            (async () => {
              try {
                const id = row?.ScheduleID || row?.id || row?.ScheduleId;
                if (!id) return;
                // indicate loading for modal operations
                schDispatch({ type: 'SET_LOADING', payload: true });

                // Attempt to fetch filled-form data for this schedule (if available)
                let payload = null;
                try {
                  payload = await getFilledFormByScheduleId(schDispatch, id, fetchWithAuth);
                } catch (e) {
                  // If fetching filled form fails, continue with basic schedule row
                  console.debug('getFilledFormByScheduleId failed, opening read-only schedule with row only', e);
                  payload = null;
                }

                const schedule = (payload && payload.schedule) ? payload.schedule : (payload && payload.data) ? payload.data : row;

                // set selected schedule so other parts of the UI can reference it
                schDispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });

                // If filled form data exists, populate layer/dairy form in reducer so read-only forms show values
                if (payload && payload.form) {
                  // payload.form expected to contain layerForm/dairyForm or similar shape
                  schDispatch({ type: 'SET_FILL_VISIT_FORM_DATA', payload: payload.form });
                }

                // Open the schedule modal in read-only mode
                schDispatch({ type: 'OPEN_FORM', payload: { ...schedule, __readOnly: true } });
              } catch (e) {
                console.error('Failed to open schedule view inline', e);
                schDispatch({ type: 'SET_MESSAGE', payload: e?.response?.data?.message || e?.message || 'Failed to load schedule' });
              } finally {
                schDispatch({ type: 'SET_LOADING', payload: false });
              }
            })();
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
          onDelete={(row) => { schDispatch({ type: 'OPEN_DELETE_MODAL', payload: row }) }}
          onSubmit={(row) => { schDispatch({ type: 'OPEN_SUBMIT_MODAL', payload: row }) }}
          onFill={(row) => {
            try {
              if (!row) return;
              // mark the selected schedule so modal and other parts of reducer can reference it
              schDispatch({ type: 'SET_SELECTED_SCHEDULE', payload: row });

              // Prefill minimal visit form data depending on farm type,
              // and include VisitPurpose + ProposedDate when available.
              const farmType = (row.FarmType || row.FarmTypeCode || row.FarmTypeName || row.FarmTypeName || '').toString().toUpperCase();
              const base = {
                FarmID: row.FarmID || row.FarmId || (row.Farm && (row.Farm.FarmID || row.Farm.id)) || null,
                FarmName: row.FarmName || (row.Farm && (row.Farm.FarmName || row.Farm.Name)) || null,
                ScheduleID: row.ScheduleID || row.id || row.ScheduleId || null,
                // Do not prefill Location from the Farms table or schedule row — prefer modal-provided coordinates
                Location: null,
              };

              // Derive VisitPurpose from multiple possible fields
              const visitPurpose = row.VisitPurpose || row.VisitType || row.VisitPurposeName || row.VisitCodeName || row.VisitPurposeName || '';

              // Format ProposedDate for datetime-local input (local time)
              let proposedDate = '';
              try {
                const raw = row.ProposedDate || row.ProposedDateTime || row.Proposed || row.VisitDate || row.VisitDateTime || row.ProposedDateLocal;
                if (raw) {
                  const d = new Date(raw);
                  if (!isNaN(d.getTime())) {
                    const tzOffset = d.getTimezoneOffset();
                    const local = new Date(d.getTime() - tzOffset * 60000);
                    proposedDate = local.toISOString().slice(0, 16);
                  }
                }
              } catch (e) { /* ignore date parse errors */ }

              const fillPayload = {};
              if (farmType === 'LAYER') {
                fillPayload.layerForm = { ...base, FarmType: 'LAYER', VisitPurpose: visitPurpose || undefined, ProposedDate: proposedDate || undefined };
                fillPayload.dairyForm = null;
              } else if (farmType === 'DAIRY') {
                fillPayload.dairyForm = { ...base, FarmType: 'DAIRY', VisitPurpose: visitPurpose || undefined, ProposedDate: proposedDate || undefined };
                fillPayload.layerForm = null;
              } else {
                // unknown farm type: still open modal with selected schedule but no specific form prefilled
                fillPayload.layerForm = null;
                fillPayload.dairyForm = null;
              }

              schDispatch({ type: 'SET_FILL_VISIT_FORM_DATA', payload: fillPayload });
              schDispatch({ type: 'OPEN_FILL_MODAL', payload: row });
            } catch (e) {
              console.debug('open fill modal inline failed', e);
            }
          }}
          onProcess={(row) => { schDispatch({ type: 'OPEN_APPROVAL_MODAL', payload: row }) }}
          onComplete={(row) => { schDispatch({ type: 'OPEN_COMPLETE_MODAL', payload: row }) }}
          recentlyFilled={{}}
          confirmedFilled={{}}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm text-gray-600">Show</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => { const v = Number(e.target.value); setPageSize(v); setPage(1); }}
            className="border rounded px-2 py-1 text-sm bg-white"
            aria-label="Select page size"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>

        <Pagination page={page} setPage={setPage} total={total} pageSize={pageSize} maxButtons={7} />
      </div>
      {/* Inline Schedule modal rendered locally so Advisor can create without navigating tabs */}
      <ScheduleModals
        state={schState}
        dispatch={schDispatch}
        fetchWithAuth={fetchWithAuth}
        closeModal={(which) => {
          try {
            switch ((which || '').toString()) {
              case 'schedule':
                schDispatch({ type: 'CLOSE_FORM' });
                break;
              case 'delete':
                schDispatch({ type: 'CLOSE_DELETE_MODAL' });
                break;
              case 'submit':
                schDispatch({ type: 'CLOSE_SUBMIT_MODAL' });
                break;
              case 'process':
                schDispatch({ type: 'CLOSE_APPROVAL_MODAL' });
                break;
              case 'complete':
                schDispatch({ type: 'CLOSE_COMPLETE_MODAL' });
                break;
              case 'bulkUpload':
                schDispatch({ type: 'CLOSE_BULK_MODAL' });
                break;
              case 'fillVisit':
                schDispatch({ type: 'CLOSE_FILL_MODAL' });
                break;
              default:
                schDispatch({ type: 'CLOSE_FORM' });
            }
          } catch (e) {
            console.debug('closeModal dispatch failed', e);
          }
        }}
        onSave={async () => {
          try {
            // Basic client-side validation to avoid sending requests that will 400
            const f = schState.form || {}
            const missing = []
            if (!f.AdvisorID) missing.push('Advisor')
            if (!f.FarmID) missing.push('Farm')
            if (!f.ProposedDate) missing.push('Proposed Date')
            if (!f.FarmType) missing.push('Farm Type')
            if (missing.length > 0) {
              schDispatch({ type: 'SET_MESSAGE', payload: `Please complete required fields: ${missing.join(', ')}` })
              return
            }

            // Ensure CreatedBy is present and is an EmployeeID (backend requires EmployeeID)
            let payload = { ...schState.form }
            if (!payload.CreatedBy) {
              const currentUserId = user && (user.UserID || user.userId || user.id || user.UserId)
              let matched = null
              try {
                // schState.employees comes from fetchLookups called earlier
                const emps = schState.employees || []
                if (Array.isArray(emps) && emps.length > 0 && currentUserId) {
                  matched = emps.find(e => {
                    const uids = [e.UserID, e.userId, e.UserId, e.id, e.UserName, e.username].filter(Boolean)
                    return uids.map(String).some(x => String(x).toLowerCase() === String(currentUserId).toLowerCase())
                  })
                }
              } catch (e) {
                // ignore lookup errors here
              }

              if (matched && (matched.EmployeeID || matched.EmployeeId || matched.id)) {
                payload.CreatedBy = matched.EmployeeID || matched.EmployeeId || matched.id
              } else {
                // If we cannot resolve an EmployeeID, inform the user rather than sending a bad request
                schDispatch({ type: 'SET_MESSAGE', payload: 'Unable to determine your EmployeeID. Make sure your account is linked to an employee record.' })
                return
              }
            }

            await createSchedule(schDispatch, payload, fetchWithAuth)
            // close modal and refresh list by resetting page (effect will reload)
            schDispatch({ type: 'CLOSE_FORM' })
            setPage(1)
          } catch (e) {
            console.error('Failed to create schedule inline', e)
            // surface a friendly message in the modal
            schDispatch({ type: 'SET_MESSAGE', payload: e?.response?.data?.message || e?.message || 'Failed to create schedule' })
          }
        }}
        // Provide setters and data objects so modal code doesn't access undefined
        approvalData={schState.approvalData || {}}
        processData={schState.processData || {}}
        completeData={schState.completeData || {}}
        setApprovalData={(payload) => schDispatch({ type: 'SET_APPROVAL_DATA', payload })}
        setProcessData={(payload) => schDispatch({ type: 'SET_PROCESS_DATA', payload })}
        setCompleteData={(payload) => schDispatch({ type: 'SET_COMPLETE_DATA', payload })}
        onDeleteConfirm={async () => {
          try {
            const target = schState.deleteTarget || schState.selectedSchedule;
            const id = target && (target.ScheduleID || target.id || target.ScheduleId);
            if (!id) return schDispatch({ type: 'SET_MESSAGE', payload: 'No schedule selected to delete.' });
            await deleteSchedule(schDispatch, id, fetchWithAuth);
            schDispatch({ type: 'CLOSE_DELETE_MODAL' });
            setPage(1);
          } catch (e) {
            console.error('Failed to delete schedule', e);
          }
        }}
        onSubmitApproval={async () => {
          try {
            const target = schState.submitTarget || schState.selectedSchedule;
            const id = target && (target.ScheduleID || target.id || target.ScheduleId);
            if (!id) return schDispatch({ type: 'SET_MESSAGE', payload: 'No schedule selected to submit.' });
            // submitManagerId may be stored in reducer.submitManagerId
            const managerId = schState.submitManagerId || null;
            await submitForApproval(schDispatch, id, managerId, fetchWithAuth);
            schDispatch({ type: 'CLOSE_SUBMIT_MODAL' });
            setPage(1);
          } catch (e) {
            console.error('Failed to submit schedule', e);
          }
        }}
        onProcessApproval={async () => {
          try {
            const target = schState.approvalTarget || schState.selectedSchedule;
            const id = target && (target.ScheduleID || target.id || target.ScheduleId);
            if (!id) return schDispatch({ type: 'SET_MESSAGE', payload: 'No schedule selected to process.' });
            const approvalData = schState.approvalData || {};
            await processApproval(schDispatch, id, approvalData, fetchWithAuth);
            schDispatch({ type: 'CLOSE_APPROVAL_MODAL' });
            setPage(1);
          } catch (e) {
            console.error('Failed to process approval', e);
          }
        }}
        onCompleteVisit={async () => {
          try {
            const target = schState.completeTarget || schState.selectedSchedule;
            const id = target && (target.ScheduleID || target.id || target.ScheduleId);
            if (!id) return schDispatch({ type: 'SET_MESSAGE', payload: 'No schedule selected to complete.' });
            const completeData = schState.completeData || {};
            await completeVisit(schDispatch, id, completeData, fetchWithAuth);
            schDispatch({ type: 'CLOSE_COMPLETE_MODAL' });
            setPage(1);
          } catch (e) {
            console.error('Failed to complete visit', e);
          }
        }}
        onBulkUpload={() => {}}
        onFillVisitSave={async (payload) => {
            try {
              // dispatch loading state to reducer so modal shows any spinner
              schDispatch({ type: 'SET_FILL_LOADING', payload: true });
              await fillVisit(schDispatch, payload, fetchWithAuth);
              // close fill modal and refresh list
              schDispatch({ type: 'CLOSE_FILL_MODAL' });
              setPage(1);
            } catch (e) {
              // errors are handled inside fillVisit (and re-thrown). Surface a console debug here.
              console.error('Failed to save filled visit', e);
            } finally {
              schDispatch({ type: 'SET_FILL_LOADING', payload: false });
            }
        }}
        setFillVisitFormData={(payload) => schDispatch({ type: 'SET_FILL_VISIT_FORM_DATA', payload })}
        setFormData={(updater) => {
          if (typeof updater === 'function') {
            const newForm = updater(schState.form)
            schDispatch({ type: 'SET_FORM_DATA', payload: newForm })
          } else {
            schDispatch({ type: 'SET_FORM_DATA', payload: updater })
          }
        }}
        isAdvisor={!!advisorId}
        currentUserId={advisorId}
      />
    </div>
  )
}
