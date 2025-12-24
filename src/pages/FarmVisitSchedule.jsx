import React, { useEffect, useReducer, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { showToast } from '../utils/toast';
import { scheduleReducer, initialState } from '../reducers/scheduleReducer';
import ScheduleHeader from '../components/schedule/ScheduleHeader';
import ScheduleList from '../components/schedule/ScheduleList';
import ScheduleModals from '../components/schedule/ScheduleModals';
import api from '../services/api';
import apiClient from '../utils/api';
import { validateCompleteRequirements } from '../utils/visitValidation';
import { CalendarIcon } from '@heroicons/react/24/outline';

// Provide a local API_BASE derived from the shared axios client so
// files constructing full URLs can reuse the centralized baseURL.
const API_BASE = apiClient.defaults?.baseURL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : 'http://localhost:80/api');



const Spinner = () => (
    <div className="flex justify-center items-center py-10">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const FarmVisitSchedule = () => {
  const [state, dispatch] = useReducer(scheduleReducer, initialState);
  const auth = useAuth();

  // Backwards-compat safe aliases: some reducers use different keys (list vs schedules, form vs formData)
  const schedules = state.schedules ?? state.list ?? [];
  const formData = state.formData ?? state.form ?? {};
  const fillVisitFormData = state.fillVisitFormData ?? state.fillData ?? {};
  const selectedSchedule = state.selectedSchedule ?? state.deleteTarget ?? state.submitTarget ?? state.approvalTarget ?? state.completeTarget ?? null;
  const [localApprovalData, setLocalApprovalData] = useState({ managerId: state.submitManagerId || '' });
  const [localProcessData, setLocalProcessData] = useState({});
  const [localCompleteData, setLocalCompleteData] = useState({});
  const [localFillData, setLocalFillData] = useState({});
  const [isFillReadOnly, setIsFillReadOnly] = useState(false);
  const [externalErrors, setExternalErrors] = useState({});
  const [recentlyFilled, setRecentlyFilled] = useState({});

  // Initial data loading: use the AuthProvider's fetchWithAuth for authenticated calls
  const [reloadKey, setReloadKey] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const refresh = async () => {
      try {
        // Load lookups directly using fetchWithAuth
        try {
          const [employeesRes, farmsRes, managersRes] = await Promise.all([
            auth.fetchWithAuth({ url: '/employees', method: 'GET', params: { pageSize: 1000 } }),
            auth.fetchWithAuth({ url: '/farms/active', method: 'GET', params: { pageSize: 1000 } }),
            auth.fetchWithAuth({ url: '/advisor/managers', method: 'GET' }),
          ]);
          const extract = (r) => {
            if (!r) return [];
            const body = r.data !== undefined ? r.data : r;
            if (!body) return [];
            if (Array.isArray(body)) return body;
            if (Array.isArray(body.data)) return body.data;
            if (body.data && Array.isArray(body.data.items)) return body.data.items;
            return [];
          };
          const empItems = extract(employeesRes);
          const farmItems = extract(farmsRes);
          const mgrItems = extract(managersRes);
          const mappedEmployees = empItems.map(it => ({ id: it.EmployeeID || it.EmployeeId || it.id || it.UserID || it.UserId, name: `${it.FirstName || ''} ${it.LastName || it.FatherName || ''}`.trim(), raw: it }));
          const mappedFarms = farmItems;
          const mappedManagers = mgrItems.map(it => ({ id: it.EmployeeID || it.EmployeeId || it.id, name: `${it.FirstName || ''} ${it.LastName || it.FatherName || ''}`.trim(), raw: it }));
          dispatch({ type: 'SET_LOOKUP_DATA', payload: { employees: mappedEmployees, farms: mappedFarms, managers: mappedManagers } });
        } catch (e) {
          console.warn('refresh: failed to load lookups directly', e);
        }

        await Promise.all([
          api.fetchStats(dispatch, auth.fetchWithAuth),
          api.fetchAllSchedules(dispatch, auth.fetchWithAuth, { IncludeDeleted: false, PageNumber: state.schedulePage || 1, PageSize: state.schedulePageSize || 20 }),
        ]);
      } catch (err) {
        console.error('refresh error', err);
      }
    };
    
    // initial load
    refresh();

    const handler = (e) => {
      const type = e?.detail?.action || e?.detail?.actionType || null;
      if (!type || ['create','update','delete','refresh','reorder'].includes(type)) {
        setReloadKey(k => (k || 0) + 1);
        refresh();
      }
    };
    window.addEventListener('farmvisit:changed', handler);
    window.addEventListener('lookups:changed', handler);
    return () => {
      window.removeEventListener('farmvisit:changed', handler);
      window.removeEventListener('lookups:changed', handler);
    };
  }, []);

  const handleSearch = (extraFilters = {}) => {
    // Build options for paged list endpoint using current page/size and any provided filters
    const opts = {
      IncludeDeleted: extraFilters?.IncludeDeleted ?? 0,
      PageNumber: extraFilters?.PageNumber || state.schedulePage || 1,
      PageSize: extraFilters?.PageSize || state.schedulePageSize || 20,
      ...extraFilters,
    };

    // Normalize frontend filter keys to the backend's expected parameter names
    const params = { ...opts };
    // farmType -> FarmType
    if (params.farmType !== undefined) {
      params.FarmType = params.farmType;
      delete params.farmType;
    }
    // selectedFarmId -> FarmID
    if (params.selectedFarmId !== undefined) {
      params.FarmID = params.selectedFarmId;
      delete params.selectedFarmId;
    }
    // advisorId -> AdvisorID
    if (params.advisorId !== undefined) {
      params.AdvisorID = params.advisorId;
      delete params.advisorId;
    }
    // visitStatus/approvalStatus -> VisitStatus/ApprovalStatus
    if (params.visitStatus !== undefined) {
      params.VisitStatus = params.visitStatus;
      delete params.visitStatus;
    }
    if (params.approvalStatus !== undefined) {
      params.ApprovalStatus = params.approvalStatus;
      delete params.approvalStatus;
    }
    // dateRange -> DateFrom / DateTo (accepts object with startDate/endDate, from/to or start/end)
    if (params.dateRange) {
      const dr = params.dateRange || {};
      const from = dr.startDate || dr.from || dr.start || dr.DateFrom || dr.dateFrom || null;
      const to = dr.endDate || dr.to || dr.end || dr.DateTo || dr.dateTo || null;
      if (from) params.DateFrom = from;
      if (to) params.DateTo = to;
      delete params.dateRange;
    }

    // Helpful debug in development to inspect outgoing filter params
    try {
      if (import.meta.env && import.meta.env.MODE === 'development') {
        // eslint-disable-next-line no-console
        console.debug('fetchAllSchedules -> params', params);
      }
    } catch (e) {
      // ignore
    }

    // Clear transient recently-filled flags when performing a fresh search
    setRecentlyFilled({});
    api.fetchAllSchedules(dispatch, auth.fetchWithAuth, params);
  };

  const handleReset = () => {
    dispatch({ type: 'SET_DATE_RANGE', payload: initialState.dateRange });
    dispatch({ type: 'SET_FARM_TYPE', payload: '' });
    dispatch({ type: 'SET_SELECTED_FARM_ID', payload: null });
    handleSearch({ dateRange: initialState.dateRange, farmType: '', selectedFarmId: null, PageNumber: 1 });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    dispatch({
      type: 'SET_FORM_DATA',
      payload: { ...state.formData, [name]: type === 'checkbox' ? checked : value },
    });
  };

  const setFormData = (updater) => {
    const newFormData = typeof updater === 'function' ? updater(formData) : updater;
    dispatch({ type: 'SET_FORM_DATA', payload: newFormData });
  };

  const handleDateChange = (selection) => {
    // DateRangePicker passes the selection object directly
    dispatch({ type: 'SET_DATE_RANGE', payload: selection });
    handleSearch({ dateRange: selection });
  };

  const handleFilterChange = (payload = {}) => {
    if (payload.dateRange) dispatch({ type: 'SET_DATE_RANGE', payload: payload.dateRange });
    if (payload.farmType !== undefined) dispatch({ type: 'SET_FARM_TYPE', payload: payload.farmType });
    if (payload.selectedFarmId !== undefined) dispatch({ type: 'SET_SELECTED_FARM_ID', payload: payload.selectedFarmId });
    const filters = {
      dateRange: payload.dateRange ?? state.dateRange,
      farmType: payload.farmType ?? state.farmType,
      selectedFarmId: payload.selectedFarmId ?? state.selectedFarmId,
    };
    handleSearch(filters);
  };

  // ... other handlers for modals and actions ...
  // These handlers will call the API functions and dispatch results.

  const openModal = (modalName, data = null) => {
    switch (modalName) {
      case 'schedule':
        dispatch({ type: 'OPEN_FORM', payload: data });
        break;
      case 'delete':
        dispatch({ type: 'OPEN_DELETE_MODAL', payload: data });
        break;
      case 'submit':
        dispatch({ type: 'OPEN_SUBMIT_MODAL', payload: data });
        break;
      case 'process':
        dispatch({ type: 'OPEN_APPROVAL_MODAL', payload: data });
        break;
      case 'complete':
        dispatch({ type: 'OPEN_COMPLETE_MODAL', payload: data });
        break;
      case 'fillVisit':
        // Prefill the fill modal with friendly farm name in the layer form's FarmID textbox when possible
        try {
          // attempt to find farm in preloaded lookups
          const farmList = state.farms || [];
          const findId = (d) => (d && (d.FarmID || d.FarmId || d.farmId || d.id || d.farmId));
          const targetId = String(findId(data) || '');
          const local = farmList.find(f => String(f.FarmID || f.FarmId || f.id || '') === targetId);
          if (local) {
            // Keep FarmID as the GUID; set a human-friendly FarmName for the form display instead
            setLocalFillData({ layerForm: { ...(data || {}), FarmName: (local.FarmName || local.Name || local.name || '') } });
          } else {
            // async fetch the farm record and set the local fill data when available
            (async () => {
              try {
                if (auth && typeof auth.fetchWithAuth === 'function' && targetId) {
                  const res = await auth.fetchWithAuth({ url: `/farms/${encodeURIComponent(targetId)}`, method: 'GET' });
                  const body = res?.data?.data || res?.data || res;
                  const rec = Array.isArray(body) ? body[0] : (body && body.recordset ? body.recordset[0] : body);
                  const name = rec?.FarmName || rec?.Name || rec?.name || '';
                  // Use FarmName for display; do not overwrite FarmID (must remain GUID)
                  setLocalFillData({ layerForm: { ...(data || {}), FarmName: name } });
                }
              } catch (e) {
                // ignore fetch errors, leave layer form as-is
              }
            })();
            // meanwhile set minimal fill data so modal opens with schedule info
            setLocalFillData({ layerForm: { ...(data || {}) } });
          }
        } catch (e) {
          // fallback: still open modal without prefill
          setLocalFillData({ layerForm: { ...(data || {}) } });
        }
        dispatch({ type: 'OPEN_FILL_MODAL', payload: data });
        break;
      default:
        // fallback for unknown modal names
        dispatch({ type: `OPEN_${modalName.toUpperCase()}_MODAL`, payload: data });
    }
  };

  // Auto-open modal when dashboard navigation includes `?open=create`.
  useEffect(() => {
    try {
      const p = new URLSearchParams(location.search || window.location.search);
      if (p.get('open') === 'create') {
        openModal('schedule');
        // remove the flag from URL so repeated navigation doesn't re-open modal
        p.delete('open');
        const next = p.toString();
        const newUrl = next ? `${window.location.pathname}?${next}` : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } catch (e) {
      // ignore
    }
  }, [location.search]);

  const closeModal = (modalName) => {
    switch (modalName) {
      case 'schedule':
        dispatch({ type: 'CLOSE_FORM' });
        break;
      case 'delete':
        dispatch({ type: 'CLOSE_DELETE_MODAL' });
        break;
      case 'submit':
        dispatch({ type: 'CLOSE_SUBMIT_MODAL' });
        break;
      case 'process':
        dispatch({ type: 'CLOSE_APPROVAL_MODAL' });
        break;
      case 'complete':
        dispatch({ type: 'CLOSE_COMPLETE_MODAL' });
        break;
      case 'fillVisit':
        dispatch({ type: 'CLOSE_FILL_MODAL' });
        setIsFillReadOnly(false);
        break;
      default:
        dispatch({ type: `CLOSE_${modalName.toUpperCase()}_MODAL` });
    }
  };

  // Example:
  const onSave = async () => {
    try {
      // Resolve the EmployeeID to use as CreatedBy/UpdatedBy. Prefer a match from loaded lookups.
      const resolveEmployeeIdAsync = async () => {
        const u = auth?.user || {};
        const employees = state.employees || [];

        const candidates = [u.EmployeeID, u.employeeId, u.UserID, u.userId, u.id, u.sub].filter(Boolean);
        for (const c of candidates) {
          const found = (employees || []).find(it => {
            const id = it.id || (it.EmployeeID || it.EmployeeId || it.employeeId || (it.raw && (it.raw.EmployeeID || it.raw.employeeId)));
            if (!id) return false;
            return String(id).toLowerCase() === String(c).toLowerCase();
          });
          if (found) return found.id || (found.EmployeeID || found.EmployeeId || null);
        }

        // Try matching by email in local lookup
        const email = (u.email || u.mail || u.upn || u.preferred_username || u.preferredUsername || '').toString().toLowerCase();
        if (email) {
          const found = (employees || []).find(it => {
            const e = (it.raw && (it.raw.Email || it.raw.email)) || (it.Email || it.email);
            return e && String(e).toLowerCase() === email;
          });
          if (found) return found.id || (found.EmployeeID || found.EmployeeId || null);
        }

        // If not found in local lookups, try fetching employees from the API and search there
        try {
          if (typeof auth.fetchWithAuth === 'function') {
            const res = await auth.fetchWithAuth({ url: '/employees', method: 'GET', params: { pageSize: 2000 } });
            const body = res && res.data !== undefined ? res.data : res;
            const items = Array.isArray(body) ? body : (Array.isArray(body.data) ? body.data : (body.data && Array.isArray(body.data.items) ? body.data.items : []));
            if (Array.isArray(items) && items.length) {
              for (const c of candidates) {
                const found = items.find(it => {
                  const id = it.EmployeeID || it.EmployeeId || it.id || it.UserID || it.UserId;
                  if (!id) return false;
                  return String(id).toLowerCase() === String(c).toLowerCase();
                });
                if (found) return found.EmployeeID || found.EmployeeId || found.id;
              }
              if (email) {
                const found = items.find(it => {
                  const e = it.Email || it.email || (it.raw && (it.raw.Email || it.raw.email));
                  return e && String(e).toLowerCase() === email;
                });
                if (found) return found.EmployeeID || found.EmployeeId || found.id;
              }
            }
          }
        } catch (e) {
          console.debug('resolveEmployeeIdAsync: failed to fetch employees', e);
        }

        return null;
      };

      const userEmployeeId = await resolveEmployeeIdAsync();
      console.debug('onSave: resolved userEmployeeId ->', userEmployeeId);
      // Enforce authentication for creating/updating schedules so backend has CreatedBy/UpdatedBy.
      if (!userEmployeeId) {
        dispatch({ type: 'SET_MESSAGE', payload: 'Unable to determine your EmployeeID. Make sure your account is linked to an employee record.' });
        return;
      }

      // Basic client-side validation for required fields on create
      if (!formData.AdvisorID || !formData.FarmID || !formData.ProposedDate || !formData.FarmType) {
        dispatch({ type: 'SET_MESSAGE', payload: 'Advisor, Farm, Proposed Date and Farm Type are required.' });
        return;
      }

      if (formData.id || formData.ScheduleID) {
        const payload = { ...formData, UpdatedBy: userEmployeeId }
        await api.updateSchedule(dispatch, payload, auth.fetchWithAuth);
      } else {
        const payload = { ...formData, CreatedBy: userEmployeeId }
        await api.createSchedule(dispatch, payload, auth.fetchWithAuth);
      }
      // Clear any prior messages on success and close modal
      dispatch({ type: 'SET_MESSAGE', payload: null });
      closeModal('schedule');
      handleSearch();
    } catch (err) {
      console.error('onSave error', err)
      dispatch({ type: 'SET_MESSAGE', payload: err?.response?.data?.message || err.message || 'Failed to save schedule' });
    }
  };

  const onUpdate = async () => {
    try {
      // Resolve the EmployeeID to use as UpdatedBy.
      const resolveEmployeeId = () => {
        const u = auth?.user || {};
        const employees = state.employees || [];
        if (!employees || employees.length === 0) return null;

        const candidates = [u.EmployeeID, u.employeeId, u.UserID, u.userId, u.id, u.sub].filter(Boolean);
        for (const c of candidates) {
          const found = employees.find(it => {
            const id = it.id || (it.EmployeeID || it.EmployeeId || it.employeeId || (it.raw && (it.raw.EmployeeID || it.raw.employeeId)));
            if (!id) return false;
            return String(id).toLowerCase() === String(c).toLowerCase();
          });
          if (found) return found.EmployeeID || found.EmployeeId || found.id || (found.raw && (found.raw.EmployeeID || found.raw.employeeId));
        }

        const email = (u.email || u.mail || u.upn || u.preferred_username || u.preferredUsername || '').toString().toLowerCase();
        if (email) {
          const found = employees.find(it => {
            const e = (it.raw && (it.raw.Email || it.raw.email)) || (it.Email || it.email);
            return e && String(e).toLowerCase() === email;
          });
          if (found) return found.EmployeeID || found.EmployeeId || found.id || (found.raw && (found.raw.EmployeeID || found.raw.employeeId));
        }

        return null;
      };

      const userEmployeeId = resolveEmployeeId();
      if (!userEmployeeId) {
        dispatch({ type: 'SET_MESSAGE', payload: 'Unable to determine your EmployeeID. Make sure your account is linked to an employee record.' });
        return;
      }

      // Ensure we have an id to update
      const id = formData.id ?? formData.ScheduleID ?? formData.ScheduleId;
      if (!id) {
        dispatch({ type: 'SET_MESSAGE', payload: 'No Schedule ID present to update.' });
        return;
      }

      const payload = { ...formData, UpdatedBy: userEmployeeId };

      // Call PATCH directly to retrieve the updated row for optimistic update
      const res = await api.callWithAuthOrApi(auth.fetchWithAuth, { url: `/farm-visit-schedule/${id}`, method: 'PATCH', data: payload });
      const returned = res && res.data ? (res.data.data || res.data) : res;

      if (returned) {
        // Update selected schedule and list optimistically
        dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: returned });
        try {
          const updated = (schedules || []).map(s => {
            const sid = s.ScheduleID || s.id || null;
            const rid = returned.ScheduleID || returned.id || null;
            if (!sid || !rid) return s;
            if (String(sid).toLowerCase() === String(rid).toLowerCase()) return { ...s, ...returned };
            return s;
          });
          dispatch({ type: 'SET_LIST', payload: updated });
        } catch (e) {
          // fallback to re-fetch if local update fails
          await api.fetchAllSchedules(dispatch, auth.fetchWithAuth, { IncludeDeleted: false, PageNumber: state.schedulePage || 1, PageSize: state.schedulePageSize || 20 });
        }

        dispatch({ type: 'SET_MESSAGE', payload: null });
        closeModal('schedule');
      } else {
        // fallback: trigger a refresh
        await api.fetchAllSchedules(dispatch, auth.fetchWithAuth, { IncludeDeleted: false, PageNumber: state.schedulePage || 1, PageSize: state.schedulePageSize || 20 });
        closeModal('schedule');
      }
    } catch (err) {
      console.error('onUpdate error', err);
      dispatch({ type: 'SET_MESSAGE', payload: err?.response?.data?.message || err.message || 'Failed to update schedule' });
    }
  };

  const onDeleteConfirm = async () => {
    if (!selectedSchedule) return;
    await api.deleteSchedule(dispatch, selectedSchedule.id ?? selectedSchedule.ScheduleID ?? selectedSchedule.ScheduleID, auth.fetchWithAuth);
    closeModal('delete');
    handleSearch();
  };
  
  const onFillVisitSave = async (payload = null) => {
    try {
      const data = payload || localFillData;
      // Ensure ScheduleID is present. If backend returned only ScheduleID, use that as ScheduleID.
      const visitKey = data && (data.ScheduleID || data.ScheduleID || data.ScheduleID || data.ScheduleID || data.ScheduleID || data.ScheduleId || data.scheduleId || null);
      if (visitKey && !data.ScheduleID) {
        data.ScheduleID = visitKey;
        data.ScheduleId = visitKey;
      }

      const userId = auth?.user?.UserID || auth?.user?.userId || auth?.user?.id || null;
      // ensure CreatedBy/UpdatedBy when available
      if (userId && !data.CreatedBy) data.CreatedBy = userId;
      if (userId && !data.UpdatedBy) data.UpdatedBy = userId;
      // Ensure ScheduleID is present for dairy visit creation (backend SP expects @ScheduleID)
      const scheduleKey = data && (data.ScheduleID || data.ScheduleId || data.scheduleId || data.ScheduleId || null) || (selectedSchedule && (selectedSchedule.ScheduleID || selectedSchedule.ScheduleId || selectedSchedule.id || selectedSchedule.ScheduleID || selectedSchedule.ScheduleId || null));
      if (scheduleKey && !data.ScheduleID) {
        data.ScheduleID = scheduleKey;
        data.ScheduleId = scheduleKey;
      }

      // Validate required fields at submit-time: Location is required for creating/updating a visit
      const hasLocation = data && (data.Location || data.location) || (selectedSchedule && (selectedSchedule.Location || selectedSchedule.location));
      if (!hasLocation) {
        showToast('Location is required before saving the visit. Please add a Location to the schedule or visit form.', 'error');
        return; // keep the fill modal open so user can add Location
      }

      // If the schedule is still in 'scheduled' status, start it first (server requires start to transition to InProgress)
      try {
        const scheduleId = data.ScheduleID || data.ScheduleId || data.scheduleId || (selectedSchedule && (selectedSchedule.ScheduleID || selectedSchedule.ScheduleId || selectedSchedule.id));
        const statusRaw = (selectedSchedule && (selectedSchedule.VisitStatus || selectedSchedule.Status || selectedSchedule.visitStatus || selectedSchedule.status)) || (data.VisitStatus || data.Status || data.visitStatus || data.status) || '';
        const lowered = String(statusRaw || '').trim().toLowerCase();
        const isScheduled = lowered === 'scheduled';
          if (isScheduled && scheduleId) {
          // Resolve StartedBy similar to other handlers
          const u = auth?.user || {};
          const employees = state.employees || [];
          const candidates = [u.EmployeeID, u.employeeId, u.UserID, u.userId, u.id, u.sub].filter(Boolean);
          let startedBy = null;
          for (const c of candidates) {
            const found = (employees || []).find(it => {
              const id = it.id || (it.EmployeeID || it.EmployeeId || (it.raw && (it.raw.EmployeeID || it.raw.employeeId)));
              if (!id) return false;
              return String(id).toLowerCase() === String(c).toLowerCase();
            });
            if (found) { startedBy = found.EmployeeID || found.EmployeeId || found.id; break; }
          }
          // fallback to a basic identifier if employee lookup failed
          if (!startedBy) startedBy = u.EmployeeID || u.employeeId || u.UserID || u.userId || u.id || null;

          if (!startedBy) {
            // If we cannot resolve a StartedBy, warn but still attempt to start with minimal payload (server may accept)
            console.warn('Could not resolve StartedBy; attempting start with minimal payload');
          }

          try {
            // If the schedule record itself is missing a Location but the visit form provides one,
            // patch the schedule before attempting to start it. The server's start endpoint
            // may require the schedule row to have a Location set.
            const scheduleHasLocation = selectedSchedule && (selectedSchedule.Location || selectedSchedule.location);
            const visitProvidesLocation = data && (data.Location || data.location);
            if (!scheduleHasLocation && visitProvidesLocation) {
              try {
                const patchPayload = { ScheduleID: scheduleId, Location: data.Location || data.location, UpdatedBy: startedBy };
                const patchedRes = await api.callWithAuthOrApi(auth.fetchWithAuth, { url: `/farm-visit-schedule/${scheduleId}`, method: 'PATCH', data: patchPayload });
                const patched = patchedRes && patchedRes.data ? (patchedRes.data.data || patchedRes.data) : patchedRes;
                if (patched) {
                  // update local selected schedule so subsequent logic sees the Location
                  dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: patched });
                }
              } catch (patchErr) {
                // Non-fatal: log and continue; start may still fail and be handled below.
                console.warn('Failed to patch schedule Location before start', patchErr);
              }
            }

            const started = await api.startFarmVisit(dispatch, scheduleId, startedBy, auth.fetchWithAuth);
            if (started) {
              // Update selected schedule locally
              dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: started });
            }
          } catch (err) {
            const msg = err?.response?.data?.message || err.message || '';
            // If server enforces Location, surface a friendly message and keep modal open
            if (/missing required field \"Location\"/i.test(msg) || /missing required field\s+location/i.test(msg)) {
              showToast(msg || 'Cannot start visit: Location is required. Please add Location.', 'error');
              return;
            }
            // Otherwise rethrow to be handled below
            throw err;
          }
        }
      } catch (err) {
        console.error('Failed during startFarmVisit at submit:', err);
        // Let fill operation proceed only if start was not required or successful; if start failed critically, show a message
        if (err && err.response && err.response.data && err.response.data.message) {
          showToast(err.response.data.message, 'error');
          return;
        }
      }

      // clear previous external errors for the form
      setExternalErrors({});
      await api.fillVisit(dispatch, data, auth.fetchWithAuth);
      // mark this schedule as recently filled so UI disables relevant actions immediately
      try {
        const sid = data.ScheduleID || data.ScheduleId || data.scheduleId || (selectedSchedule && (selectedSchedule.ScheduleID || selectedSchedule.ScheduleId || selectedSchedule.id));
        if (sid) {
          setRecentlyFilled(prev => ({ ...(prev || {}), [sid]: true }));
          // auto-clear after 12s to allow server refresh to update authoritative state
          setTimeout(() => setRecentlyFilled(prev => { const copy = { ...(prev || {}) }; delete copy[sid]; return copy; }), 12000);
        }
      } catch (e) { /* ignore */ }
      // clear any external errors on success
      setExternalErrors({});
    } catch (err) {
      console.error('onFillVisitSave error', err);
      // If server returned validation details, map them to externalErrors so modal forms can display inline messages
      const payload = payload || localFillData || {};
      const farmType = (payload.FarmType || payload.FarmTypeCode || '').toString().toUpperCase() || (selectedSchedule && (selectedSchedule.FarmType || selectedSchedule.FarmTypeCode || '')).toString().toUpperCase();
      const resp = err && err.response && err.response.data ? err.response.data : null;
      // Common shapes: { success:false, message:'', details: { field: 'msg' } } or { errors: { field: 'msg' } }
      const fieldErrs = (resp && (resp.details || resp.fieldErrors || resp.errors || resp.validationErrors)) || {};
      if (farmType === 'LAYER') setExternalErrors(prev => ({ ...(prev || {}), layerForm: fieldErrs }));
      else setExternalErrors(prev => ({ ...(prev || {}), dairyForm: fieldErrs }));
    }
    closeModal('fillVisit');
    handleSearch();
  };

  const onSubmitApproval = async () => {
    if (!selectedSchedule) return;
    await api.submitForApproval(dispatch, selectedSchedule.id ?? selectedSchedule.ScheduleID ?? selectedSchedule.ScheduleID, localApprovalData.managerId, auth.fetchWithAuth);
    closeModal('submit');
    handleSearch();
  };

  const onProcessApproval = async () => {
    if (!selectedSchedule) return;
    try {
      // Resolve current user to an EmployeeID (same logic as onSave)
      const resolveEmployeeId = () => {
        const u = auth?.user || {};
        const employees = state.employees || [];
        if (!employees || employees.length === 0) return null;
        const candidates = [u.EmployeeID, u.employeeId, u.UserID, u.userId, u.id, u.sub].filter(Boolean);
        for (const c of candidates) {
          const found = employees.find(it => {
            const id = it.id || (it.EmployeeID || it.EmployeeId || it.employeeId || it.raw && (it.raw.EmployeeID || it.raw.employeeId));
            if (!id) return false;
            return String(id).toLowerCase() === String(c).toLowerCase();
          });
          if (found) return found.EmployeeID || found.EmployeeId || found.id || (found.raw && (found.raw.EmployeeID || found.raw.employeeId));
        }
        const email = (u.email || u.mail || u.upn || u.preferred_username || u.preferredUsername || '').toString().toLowerCase();
        if (email) {
          const found = employees.find(it => {
            const e = (it.raw && (it.raw.Email || it.raw.email)) || (it.Email || it.email);
            return e && String(e).toLowerCase() === email;
          });
          if (found) return found.EmployeeID || found.EmployeeId || found.id || (found.raw && (found.raw.EmployeeID || found.raw.employeeId));
        }
        return null;
      };

      const userEmployeeId = resolveEmployeeId();
      if (!userEmployeeId) {
        dispatch({ type: 'SET_MESSAGE', payload: 'Unable to determine your EmployeeID. Make sure your account is linked to an employee record.' });
        return;
      }

      const normalize = (s) => {
        if (!s) return ''
        const v = String(s).trim().toLowerCase()
        if (v === 'approved' || v === 'approve' || v === 'approved_by' || v === 'approvedstatus') return 'Approved'
        if (v === 'rejected' || v === 'reject' || v === 'rejected_by') return 'Rejected'
        if (v === 'postponed' || v === 'postpone' || v === 'rescheduled') return 'Postponed'
        return String(s)
      }

      const normalizedStatus = normalize(localProcessData.status)

      // Build payload to call unified processApproval controller
      const actionMap = { 'Approved': 'Approve', 'Rejected': 'Reject', 'Postponed': 'Postpone' }
      const action = actionMap[normalizedStatus] || normalizedStatus || 'Approve'

      const payload = {
        Action: action,
        ApprovedBy: userEmployeeId,
        Reason: localProcessData.reason || localProcessData.rejectionReason || null,
        PostponedDate: localProcessData.postponedDate || null,
        AdditionalComments: localProcessData.comments || null
      }

      const result = await api.processApproval(dispatch, selectedSchedule.id ?? selectedSchedule.ScheduleID ?? selectedSchedule.ScheduleID, payload, auth.fetchWithAuth)
      // `api.processApproval` returns `res.data` from the server which has shape { success, data }
      // Normalize returned payload so we can update local state regardless of exact shape
      let returned = null
      if (result) {
        if (result.data !== undefined) returned = result.data
        else if (Array.isArray(result) && result.length) returned = result[0]
        else returned = result
      }
      if (returned) {
        // Update selected schedule and list locally to reflect change immediately
        dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: returned })
        try {
          const updated = (schedules || []).map(s => {
            const sid = s.ScheduleID || s.id || s.ScheduleID || null
            const rid = returned.ScheduleID || returned.id || returned.ScheduleID || null
            if (!sid || !rid) return s
            if (String(sid).toLowerCase() === String(rid).toLowerCase()) return { ...s, ...returned }
            return s
          })
          dispatch({ type: 'SET_LIST', payload: updated })
        } catch (e) {
          // fallback: re-fetch list and stats if local update fails
          await api.fetchSchedules(dispatch, {}, auth.fetchWithAuth)
        }
        // refresh stats independently
        try { await api.fetchStats(dispatch, auth.fetchWithAuth) } catch (e) { /* ignore */ }
        if (action === 'Approve') dispatch({ type: 'SET_MESSAGE', payload: 'Schedule approved.' })
        else if (action === 'Reject') dispatch({ type: 'SET_MESSAGE', payload: 'Schedule rejected.' })
        else if (action === 'Postpone') dispatch({ type: 'SET_MESSAGE', payload: 'Schedule postponed.' })
        else dispatch({ type: 'SET_MESSAGE', payload: 'Approval processed successfully.' })
      } else {
        // If no returned data, fall back to a full refresh
        await api.fetchSchedules(dispatch, {}, auth.fetchWithAuth)
      }
    } catch (err) {
      console.error('onProcessApproval error', err);
      dispatch({ type: 'SET_MESSAGE', payload: err?.response?.data?.message || err.message || 'Failed to process approval' });
    } finally {
      closeModal('process');
      handleSearch();
    }
  };

  const onCompleteVisit = async () => {
    if (!selectedSchedule) return;
    try {
      // Resolve EmployeeID similar to other handlers
      const resolveEmployeeId = () => {
        const u = auth?.user || {};
        const employees = state.employees || [];
        if (!employees || employees.length === 0) return null;

        const candidates = [u.EmployeeID, u.employeeId, u.UserID, u.userId, u.id, u.sub].filter(Boolean);
        for (const c of candidates) {
          const found = employees.find(it => {
            const id = it.id || (it.EmployeeID || it.EmployeeId || it.employeeId || (it.raw && (it.raw.EmployeeID || it.raw.employeeId)));
            if (!id) return false;
            return String(id).toLowerCase() === String(c).toLowerCase();
          });
          if (found) return found.EmployeeID || found.EmployeeId || found.id || (found.raw && (found.raw.EmployeeID || found.raw.employeeId));
        }

        // Try matching by email
        const email = (u.email || u.mail || u.upn || u.preferred_username || u.preferredUsername || '').toString().toLowerCase();
        if (email) {
          const found = employees.find(it => {
            const e = (it.raw && (it.raw.Email || it.raw.email)) || (it.Email || it.email);
            return e && String(e).toLowerCase() === email;
          });
          if (found) return found.EmployeeID || found.EmployeeId || found.id || (found.raw && (found.raw.EmployeeID || found.raw.employeeId));
        }

        return null;
      };

      const userEmployeeId = resolveEmployeeId();
      if (!userEmployeeId) {
        dispatch({ type: 'SET_MESSAGE', payload: 'Unable to determine your EmployeeID. Make sure your account is linked to an employee record.' });
        return;
      }

      // Client-side guard: validate using shared helper before attempting to complete
      const { ready: readyToComplete, reasons } = validateCompleteRequirements(selectedSchedule || {}, localCompleteData || {});
      if (!readyToComplete) {
        showToast(reasons.join('; ') || 'Visit cannot be completed yet', 'error')
        closeModal('complete');
        return;
      }

      // Ensure ScheduleID is passed in URL param by api.completeVisit; include CompletedBy in body
      const id = selectedSchedule.id ?? selectedSchedule.ScheduleID ?? selectedSchedule.ScheduleID;

      // Fetch latest schedule from server to avoid races and validate required fields
      try {
        const latestRes = await api.callWithAuthOrApi(auth.fetchWithAuth, { url: `/farm-visit-schedule/${id}`, method: 'GET' });
        const latest = latestRes && latestRes.data ? (latestRes.data.data || latestRes.data) : null;
        if (latest) {
          const statusRawLatest = latest.VisitStatus || latest.Status || latest.visitStatus || latest.status || '';
          const normalizeStatus = (s) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          if (normalizeStatus(statusRawLatest) !== 'inprogress') {
            showToast('Only visits in progress can be completed', 'error')
            closeModal('complete');
            return;
          }

          // Ensure ActualVisitDate exists on the latest schedule
          const actualVisit = latest.ActualVisitDate || latest.actualVisitDate || null;
          if (!actualVisit) {
            showToast('Actual visit date must be set before completing the visit.', 'error')
            return; // keep modal open so user can set actual date / visit report
          } 
        }
      } catch (e) {
        // If fetching latest failed, log and continue with client-side data (server will validate too)
        console.error('Failed to fetch latest schedule before complete:', e);
      }

      // Map localCompleteData to backend expected fields; require VisitSummary non-empty
      const summary = (localCompleteData.visitSummary || localCompleteData.VisitSummary || localCompleteData.followUpNotes || '').toString().trim();
      if (!summary) {
        showToast('Visit summary is required to complete the visit.', 'error')
        return; // keep modal open so user can enter summary
      }

      const payload = {
        CompletedBy: userEmployeeId,
        VisitSummary: summary,
        NextFollowUpDate: localCompleteData.actualDateTime || localCompleteData.NextFollowUpDate || null,
        FollowUpNote: localCompleteData.followUpNotes || localCompleteData.FollowUpNote || null,
      };

      await api.completeVisit(dispatch, id, payload, auth.fetchWithAuth);
    } catch (err) {
      console.error('onCompleteVisit error', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to complete visit', 'error')
    } finally {
      closeModal('complete');
      handleSearch();
    }
  };

  const onBulkUpload = async (file) => {
    await api.uploadBulk(dispatch, file, auth.fetchWithAuth);
    closeModal('bulkUpload');
    handleSearch();
  };


  return (
    <div className="w-full mx-auto  px-4 sm:px-6 md:px-8 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Farm Visit Schedule</h1>
        {/* Floating action on larger screens becomes a small button in the header */}
        {/* <button
          onClick={() => openModal('schedule')}
          className="inline-flex items-center gap-2 bg-teal-600 text-white text-sm sm:text-base px-3 py-2 rounded shadow hover:bg-teal-700 transition"
        >
          New
        </button> */}
      </div>
      <ScheduleHeader
        stats={state.stats}
        dateRange={state.dateRange}
        lookups={state.lookups}
        onDateChange={handleDateChange}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
        onRefresh={() => handleSearch()}
        onNew={() => openModal('schedule')}
        onShowDrafts={() => api.fetchDrafts(dispatch, auth.fetchWithAuth).then(() => dispatch({ type: 'OPEN_DRAFTS_MODAL' }))}
        onBulkUpload={() => openModal('bulkUpload')}
        onDownloadTemplate={api.downloadCsvTemplate}
        farmType={state.farmType}
        onFarmTypeChange={(e) => { const v = e.target ? e.target.value : e; dispatch({ type: 'SET_FARM_TYPE', payload: v }); handleSearch({ farmType: v }); }}
        farms={state.farms}
        selectedFarmId={state.selectedFarmId}
        onFarmSelect={(id) => { dispatch({ type: 'SET_SELECTED_FARM_ID', payload: id }); handleSearch({ selectedFarmId: id }); }}
        showDatePicker={state.showDatePicker}
        onToggleDatePicker={() => dispatch({ type: 'TOGGLE_DATE_PICKER' })}
      />

      {state.loading ? (
        <Spinner />
      ) : schedules.length === 0 ? (
        <div className="text-center py-16">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules</h3>
          <p className="mt-1 text-sm text-gray-500">No schedules found for the selected criteria.</p>
        </div>
      ) : (
        <div className="mt-6">
          <ScheduleList
            schedules={schedules}
            fetchWithAuth={auth.fetchWithAuth}
            recentlyFilled={recentlyFilled}
            onEdit={(schedule) => {
              dispatch({ type: 'SET_FORM_DATA', payload: schedule });
              dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });
              openModal('schedule', schedule);
            }}
            onDelete={(schedule) => {
              dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });
              openModal('delete', schedule);
            }}
            onSubmit={(schedule) => {
              dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });
              openModal('submit', schedule);
            }}
            onProcess={(schedule) => {
              dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });
              // Initialize local process state from the schedule so modal buttons reflect current values
              const currentApproval = schedule.ApprovalStatus ?? schedule.Approval ?? schedule.ApprovalStatusName ?? schedule.approvalStatus;
              const currentVisitStatus = schedule.VisitStatus ?? schedule.Status ?? schedule.VisitStatusName ?? schedule.status;
              // Normalize to canonical status strings used by server: 'Approved'|'Rejected'|'Postponed'
              const normalize = (s) => {
                if (!s) return null
                const v = String(s).trim().toLowerCase()
                if (v === 'approved' || v === 'approve' || v === 'approved_by' || v === 'approvedstatus') return 'Approved'
                if (v === 'rejected' || v === 'reject' || v === 'rejected_by') return 'Rejected'
                if (v === 'postponed' || v === 'postpone' || v === 'rescheduled') return 'Postponed'
                return String(s)
              }

              setLocalProcessData({
                status: normalize(currentApproval || currentVisitStatus),
                reason: schedule.RejectionReason || schedule.RejectionReason || schedule.RejectionReason || '',
                postponedDate: schedule.PostponedTo || schedule.PostponedTo || schedule.PostponedTo || ''
              });
              openModal('process', schedule);
            }}
            onFill={(schedule) => {
              (async () => {
                // Determine visit status
                const visitRaw = schedule.VisitStatus ?? schedule.Status ?? schedule.VisitStatusName ?? schedule.status;
                const loweredStatus = String(visitRaw || '').trim().toLowerCase();
                const isCompleted = loweredStatus.includes('complete');
                const isScheduled = loweredStatus === 'scheduled';
                const id = schedule.id ?? schedule.ScheduleID ?? schedule.ScheduleID;

                if (isCompleted) {
                  try {
                    const payload = await api.getFilledFormByScheduleId(dispatch, id, auth.fetchWithAuth);
                    const serverSchedule = payload?.schedule || schedule;
                    const form = payload?.form || {};
                    const farmType = (serverSchedule.FarmType || serverSchedule.FarmTypeCode || '').toString().toUpperCase();
                    const fillData = farmType === 'LAYER' ? { layerForm: form, dairyForm: {} } : { layerForm: {}, dairyForm: form };
                    dispatch({ type: 'SET_FILL_VISIT_FORM_DATA', payload: fillData });
                    setLocalFillData(fillData);
                    dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: serverSchedule });
                    setIsFillReadOnly(true);
                    openModal('fillVisit', serverSchedule);
                  } catch (err) {
                    console.error('Failed to fetch filled form:', err);
                    showToast(err?.response?.data?.message || err.message || 'Failed to load filled visit', 'error');
                  }
                  return;
                }

                // Not completed: open editable modal (do not auto-start here).
                // The visit will be started at submit-time inside `onFillVisitSave` so users can add Location first.
                setIsFillReadOnly(false);
                // open editable modal with schedule as starting data
                dispatch({ type: 'SET_FILL_VISIT_FORM_DATA', payload: schedule });
                setLocalFillData(schedule);
                dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });
                openModal('fillVisit', schedule);
              })();
            }}
            onView={(schedule) => {
              (async () => {
                const id = schedule.id ?? schedule.ScheduleID ?? schedule.ScheduleID;
                try {
                  const payload = await api.getFilledFormByScheduleId(dispatch, id, auth.fetchWithAuth);
                  console.debug('onView: fetched filled form payload', { id, payload });
                  const serverSchedule = payload?.schedule || schedule;
                  const form = payload?.form || {};
                  const farmType = (serverSchedule.FarmType || serverSchedule.FarmTypeCode || '').toString().toUpperCase();
                  const fillData = farmType === 'LAYER' ? { layerForm: form, dairyForm: {} } : { layerForm: {}, dairyForm: form };
                  // Update local state first so parent prop is ready when modal mounts
                  setLocalFillData(fillData);
                  dispatch({ type: 'SET_FILL_VISIT_FORM_DATA', payload: fillData });
                  dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: serverSchedule });
                  setIsFillReadOnly(true);
                  openModal('fillVisit', serverSchedule);
                } catch (err) {
                  // If fetching filled form fails, still open modal in read-only with schedule data
                  console.warn('View: failed to fetch filled form, opening readonly modal with schedule data', err);
                  const fillData = { layerForm: {}, dairyForm: {} };
                  setLocalFillData(fillData);
                  dispatch({ type: 'SET_FILL_VISIT_FORM_DATA', payload: fillData });
                  dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });
                  setIsFillReadOnly(true);
                  openModal('fillVisit', schedule);
                }
              })();
            }}
            onComplete={(schedule) => {
              dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });
              openModal('complete', schedule);
            }}
          />
          {/* Simple pagination controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">{state.scheduleTotalCount} items</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const prev = Math.max(1, (state.schedulePage || 1) - 1);
                  handleSearch({ PageNumber: prev });
                }}
                disabled={(state.schedulePage || 1) <= 1}
                className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
              >Prev</button>
              <div className="text-sm">Page {state.schedulePage || 1} of {state.scheduleTotalPages || 1}</div>
              <button
                onClick={() => {
                  const next = Math.min((state.scheduleTotalPages || 1), (state.schedulePage || 1) + 1);
                  handleSearch({ PageNumber: next });
                }}
                disabled={(state.schedulePage || 1) >= (state.scheduleTotalPages || 1)}
                className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        </div>
      )}

      <ScheduleModals
        state={state}
        dispatch={dispatch}
        fetchWithAuth={auth.fetchWithAuth}
        closeModal={closeModal}
        onSave={onSave}
        onUpdate={onUpdate}
        onDeleteConfirm={onDeleteConfirm}
        onSubmitApproval={onSubmitApproval}
        onProcessApproval={onProcessApproval}
        onCompleteVisit={onCompleteVisit}
        onBulkUpload={onBulkUpload}
        onFillVisitSave={onFillVisitSave}
        setFillVisitFormData={setLocalFillData}
        setApprovalData={setLocalApprovalData}
        setProcessData={setLocalProcessData}
        setCompleteData={setLocalCompleteData}
        setFormData={setFormData}
        fillVisitFormData={localFillData}
        approvalData={localApprovalData}
        processData={localProcessData}
        completeData={localCompleteData}
        fillReadOnly={isFillReadOnly}
      />
      {/* Mobile Floating Action Button for creating a new schedule */}
      <button
        onClick={() => openModal('schedule')}
        className="fixed bottom-6 right-4 sm:hidden z-50 bg-teal-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 transition"
        aria-label="New schedule"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};

export default FarmVisitSchedule;