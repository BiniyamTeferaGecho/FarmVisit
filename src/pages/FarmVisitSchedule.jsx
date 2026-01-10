import React, { useEffect, useReducer, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { showToast } from '../utils/toast';
import { scheduleReducer, initialState } from '../reducers/scheduleReducer';
import ScheduleHeader from '../components/schedule/ScheduleHeader';
import { format } from 'date-fns';
import ScheduleList from '../components/schedule/ScheduleList';
import Pagination from '../components/common/Pagination';
import ScheduleModals from '../components/schedule/ScheduleModals';
import api from '../services/api';
import apiClient from '../utils/api';
import { validateCompleteRequirements } from '../utils/visitValidation';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { FaTrash, FaUndo } from 'react-icons/fa';

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
  const [confirmedFilled, setConfirmedFilled] = useState({});

  // Initial data loading: use the AuthProvider's fetchWithAuth for authenticated calls
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [creatingScheduleLocked, setCreatingScheduleLocked] = useState(false);
  const [visitStatusFilter, setVisitStatusFilter] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('');
  const creatingScheduleLockRef = React.useRef(false);
  const location = useLocation();

  // Helper: normalize various possible shapes returned by getFilledFormByScheduleId
  const extractFillForm = (payload) => {
    if (!payload) return { schedule: null, form: {} };
    // Common shapes: { schedule, form } or { data: { schedule, form } } or { dairyForm, layerForm }
    const maybe = payload.data || payload;
    const schedule = maybe.schedule || maybe.serverSchedule || maybe.sched || maybe.scheduleRow || null;
    // Try multiple possible locations for the actual form contents
    let form = maybe.form || maybe.dairyForm || maybe.layerForm || maybe.FilledForm || maybe.filledForm || maybe.data?.form || maybe.data?.dairyForm || null;
    // If the returned `form` is wrapped in recordset or array, extract first
    if (Array.isArray(form) && form.length === 1) form = form[0];
    if (form && form.recordset && Array.isArray(form.recordset) && form.recordset.length > 0) form = form.recordset[0];
    // Some APIs return the district or nested object as { DairyFarmVisit: { ... } }
    if (form && form.DairyFarmVisit) form = form.DairyFarmVisit;
    if (!form && maybe && typeof maybe === 'object') {
      // Fallback: return payload keys that look like dairy visit fields
      const candidateKeys = ['Location','LactationCows','AvgMilkProductionPerDayPerCow','DairyFarmVisitId','DairyFarmVisitID'];
      const hasAny = candidateKeys.some(k => Object.prototype.hasOwnProperty.call(maybe, k));
      if (hasAny) form = maybe;
    }
    return { schedule, form: form || {} };
  };

  useEffect(() => {
    const refresh = async () => {
      try {
        // Load lookups directly using fetchWithAuth
        try {
          const [employeesRes, farmsRes, managersRes] = await Promise.all([
            apiClient({ url: '/employees', method: 'GET', params: { pageSize: 1000 } }),
            apiClient({ url: '/farms/active', method: 'GET', params: { pageSize: 1000 } }),
            apiClient({ url: '/advisor/managers', method: 'GET' }),
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
          // Fetch backend-provided filter options (FarmType, VisitStatus, ApprovalStatus, Regions, Zones, Weredas)
          try {
            // Centralized helper will dispatch SET_FILTER_OPTIONS for us
            await api.fetchFilterOptions(dispatch, apiClient);
          } catch (e) {
            // ignore filter-options failures — non-fatal for schedule page
          }
        } catch (e) {
          console.warn('refresh: failed to load lookups directly', e);
        }

          await Promise.all([
            api.fetchStats(dispatch, apiClient),
            // Use handleSearch so we route to the proper backend endpoint (search vs filter)
            (async () => handleSearch({ IncludeDeleted: false, PageNumber: state.schedulePage || 1, PageSize: state.schedulePageSize || 20, farmType: state.farmType, selectedFarmId: state.selectedFarmId }))(),
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

  const handleSearch = async (extraFilters = {}) => {
    // Build options for paged list endpoint using current page/size and any provided filters
    const opts = {
      IncludeDeleted: extraFilters?.IncludeDeleted ?? 0,
      PageNumber: extraFilters?.PageNumber || state.schedulePage || 1,
      PageSize: extraFilters?.PageSize || state.schedulePageSize || 20,
      ...extraFilters,
    };

    // Normalize frontend filter keys to the backend's expected parameter names
    const params = { ...opts };
    // Include page-level search term when present
    if (!params.SearchTerm && !params.search && searchTerm) params.SearchTerm = searchTerm;
    // farmType -> FarmType (accept both camel and Pascal keys)
    if (params.farmType !== undefined) {
      params.FarmType = params.farmType;
      delete params.farmType;
    } else if (params.FarmType !== undefined) {
      // already provided as FarmType — keep as-is
    }
    // Ensure plural alias is present for backends that accept `FarmTypes` (CSV)
    if (params.FarmType !== undefined && params.FarmTypes === undefined) {
      params.FarmTypes = params.FarmType;
    }
    // searchTerm -> SearchTerm (backend expects 'SearchTerm')
    if (params.searchTerm !== undefined) {
      params.SearchTerm = params.searchTerm;
      delete params.searchTerm;
    }
    if (params.search !== undefined) {
      params.SearchTerm = params.search;
      delete params.search;
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
      // Normalize Date objects to ISO strings for consistent server-side parsing
      try {
        if (from) {
          if (from instanceof Date) params.ProposedDateFrom = from.toISOString();
          else if (typeof from === 'string') params.ProposedDateFrom = from;
          else params.ProposedDateFrom = new Date(from).toISOString();
        }
        if (to) {
          if (to instanceof Date) params.ProposedDateTo = to.toISOString();
          else if (typeof to === 'string') params.ProposedDateTo = to;
          else params.ProposedDateTo = new Date(to).toISOString();
        }
      } catch (e) {
        // Fallback: pass raw values if normalization fails
        if (from) params.DateFrom = from;
        if (to) params.DateTo = to;
      }
      delete params.dateRange;
    }

    // Helpful debug to inspect outgoing filter params (always log for easier dev troubleshooting)
    try {
      // eslint-disable-next-line no-console
      console.debug('fetchAllSchedules -> params', params);
    } catch (e) {
      // ignore
    }

    // Clear transient recently-filled flags when performing a fresh search
    setRecentlyFilled({});
    // If a search term is present prefer the search endpoint which supports full-text/keyword search
    const hasSearch = params.SearchTerm || params.Search || params.search || searchTerm;
    if (hasSearch) {
      // normalize key name for search endpoint
      const searchParams = { ...params };
      if (searchParams.SearchTerm === undefined && searchParams.search) searchParams.SearchTerm = searchParams.search;
      // Backend now recognizes `SearchText`; include it for compatibility with new stored-proc
      if (searchParams.SearchTerm !== undefined && !searchParams.SearchText) searchParams.SearchText = searchParams.SearchTerm;
      if (!searchParams.SearchText && searchTerm) searchParams.SearchText = searchTerm;
      try {
        await api.fetchSchedules(dispatch, searchParams, apiClient);
      } catch (e) {
        // fallback to filter endpoint if search fails
        await api.fetchFilteredSchedules(dispatch, params, apiClient);
      }
    } else {
      await api.fetchFilteredSchedules(dispatch, params, apiClient);
    }
  };

  const handleReset = () => {
    // Clear reducer-backed filters
    dispatch({ type: 'SET_DATE_RANGE', payload: initialState.dateRange });
    dispatch({ type: 'SET_FARM_TYPE', payload: '' });
    dispatch({ type: 'SET_SELECTED_FARM_ID', payload: null });
    // Clear local UI filters
    setSearchTerm('');
    try { setApprovalStatusFilter(''); } catch (e) { /* ignore */ }
    try { setVisitStatusFilter(''); } catch (e) { /* ignore */ }
    // Trigger a fresh search with cleared filters
    handleSearch({ dateRange: initialState.dateRange, farmType: '', selectedFarmId: null, SearchTerm: '', PageNumber: 1 });
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
        // If this is a create (no schedule id present), prevent duplicate opens from rapid clicks.
        const isCreate = !data || !(data.id || data.ScheduleID || data.ScheduleId || data.ScheduleId);
        if (isCreate) {
          if (creatingScheduleLockRef.current) return; // ignore subsequent rapid clicks
          // Acquire a ref lock to prevent duplicate opens, but only show the
          // UI "creating" state while an actual submission is in-flight.
          creatingScheduleLockRef.current = true;
          // Set the transient flag so other UI (like header button/FAB) is disabled
          // briefly while the modal opens. Release the visible flag on next tick
          // so the Save button remains enabled for the user to submit.
          setCreatingScheduleLocked(true);
          setTimeout(() => setCreatingScheduleLocked(false), 50);
        }
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
                if (typeof apiClient === 'function' && targetId) {
                    const res = await apiClient({ url: `/farms/${encodeURIComponent(targetId)}`, method: 'GET' });
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
        // If caller provided an AdvisorID in the query string, pass it
        // to the modal so the form can be prefilled (Advisor must still
        // be a valid GUID / lookup on save will validate on server).
        const advisorParam = p.get('AdvisorID') || p.get('advisor') || p.get('advisorId');
        if (advisorParam) {
          openModal('schedule', { AdvisorID: advisorParam });
        } else {
          openModal('schedule');
        }
        // remove the flag from URL so repeated navigation doesn't re-open modal
        p.delete('open');
        p.delete('AdvisorID');
        p.delete('advisor');
        p.delete('advisorId');
        const next = p.toString();
        const newUrl = next ? `${window.location.pathname}?${next}` : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } catch (e) {
      // ignore
    }
  }, [location.search]);

  // Auto-open schedule modal when dashboard navigation includes
  // `?open=edit|view&scheduleId=<id>` so other pages can request the Schedule tab.
  // NOTE: we intentionally do NOT auto-open the fill modal via `?open=fill` anymore
  // because sidebar/menu navigation used to trigger `open=fill` and that caused
  // the fill form to show unexpectedly. Removing `fill` prevents that behavior.
  useEffect(() => {
    try {
      const p = new URLSearchParams(location.search || window.location.search);
      const op = p.get('open');
      const sid = p.get('scheduleId') || p.get('ScheduleID') || p.get('id');
      if ((op === 'edit' || op === 'view') && sid) {
        (async () => {
          try {
              const res = await apiClient({ url: `/farm-visit-schedule/${encodeURIComponent(sid)}`, method: 'get' });
            const body = res?.data?.data || res?.data || res;
            const rec = Array.isArray(body) ? body[0] : (body && body.recordset ? body.recordset[0] : body);
            openModal('schedule', rec);
          } catch (e) {
            console.warn('Failed to load schedule for open param', e);
          }
        })();

        // remove the flags so repeated navigation doesn't re-open
        p.delete('open');
        p.delete('scheduleId');
        p.delete('ScheduleID');
        p.delete('id');
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
        // release create lock when schedule modal is closed (canceled or after successful save)
        creatingScheduleLockRef.current = false;
        setCreatingScheduleLocked(false);
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
          if (typeof apiClient === 'function') {
            const res = await apiClient({ url: '/employees', method: 'GET', params: { pageSize: 2000 } });
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
        await api.updateSchedule(dispatch, payload, apiClient);
      } else {
        const payload = { ...formData, CreatedBy: userEmployeeId }
        // Mark create as in-progress so modal shows "Creating..." and other
        // create triggers remain disabled while request is in-flight.
        creatingScheduleLockRef.current = true;
        setCreatingScheduleLocked(true);
        try {
          await api.createSchedule(dispatch, payload, apiClient);
        } catch (createErr) {
          // Clear transient locks so user can retry after a failed request
          creatingScheduleLockRef.current = false;
          setCreatingScheduleLocked(false);
          throw createErr;
        }
      }
      // Clear any prior messages on success and close modal
      dispatch({ type: 'SET_MESSAGE', payload: null });
      closeModal('schedule');
      handleSearch();
    } catch (err) {
      console.error('onSave error', err)
      // Ensure any transient create locks are cleared so user can retry
      try { creatingScheduleLockRef.current = false; } catch (e) { /* ignore */ }
      try { setCreatingScheduleLocked(false); } catch (e) { /* ignore */ }
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
      const res = await api.callWithAuthOrApi(apiClient, { url: `/farm-visit-schedule/${id}`, method: 'PATCH', data: payload });
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
          await api.fetchSchedules(dispatch, { IncludeDeleted: false, PageNumber: state.schedulePage || 1, PageSize: state.schedulePageSize || 20, FarmType: state.farmType, FarmID: state.selectedFarmId }, apiClient);
        }

        dispatch({ type: 'SET_MESSAGE', payload: null });
        closeModal('schedule');
      } else {
        // fallback: trigger a refresh
        await api.fetchSchedules(dispatch, { IncludeDeleted: false, PageNumber: state.schedulePage || 1, PageSize: state.schedulePageSize || 20, FarmType: state.farmType, FarmID: state.selectedFarmId }, apiClient);
        closeModal('schedule');
      }
    } catch (err) {
      console.error('onUpdate error', err);
      dispatch({ type: 'SET_MESSAGE', payload: err?.response?.data?.message || err.message || 'Failed to update schedule' });
    }
  };

  const onDeleteConfirm = async () => {
    if (!selectedSchedule) return;
    await api.deleteSchedule(dispatch, selectedSchedule.id ?? selectedSchedule.ScheduleID ?? selectedSchedule.ScheduleID, apiClient);
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
            // Determine whether we have a Location from any source before attempting Start.
            // Sources: selectedSchedule row, current visit form data, or any previously-saved layer visit for this schedule.
            let scheduleHasLocation = selectedSchedule && (selectedSchedule.Location || selectedSchedule.location);
            let visitProvidesLocation = data && (data.Location || data.location);

            // If neither schedule nor form has Location, try to fetch a saved layer visit for this schedule
            // which might contain a Location (user may have saved the visit earlier).
            if (!scheduleHasLocation && !visitProvidesLocation) {
              try {
                const saved = await api.getLayerFilledFormByScheduleId(dispatch, scheduleId, apiClient).catch(() => null);
                const savedForm = saved && saved.form ? (saved.form || saved.layerForm || null) : null;
                const savedLoc = savedForm && (savedForm.Location || savedForm.location) ? (savedForm.Location || savedForm.location) : null;
                if (savedLoc) {
                  visitProvidesLocation = savedLoc;
                }
              } catch (e) {
                // ignore errors fetching saved visit; we'll handle absence below
              }
            }

            // If schedule has no Location and no visit provides one, block Start and prompt user
            if (!scheduleHasLocation && !visitProvidesLocation) {
              showToast('Cannot start visit: Location is required. Please add Location via the visit form or the schedule before starting.', 'error');
              return;
            }

            // If the schedule record itself is missing a Location but the visit form provides one,
            // patch the schedule before attempting to start it. The server's start endpoint
            // may require the schedule row to have a Location set.
            if (!scheduleHasLocation && visitProvidesLocation) {
              try {
                const patchPayload = { ScheduleID: scheduleId, Location: data.Location || data.location, UpdatedBy: startedBy };
                const patchedRes = await api.callWithAuthOrApi(apiClient, { url: `/farm-visit-schedule/${scheduleId}`, method: 'PATCH', data: patchPayload });
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

            const started = await api.startFarmVisit(dispatch, scheduleId, startedBy, apiClient, { Location: data.Location || data.location });
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
      await api.fillVisit(dispatch, data, apiClient);
      // mark this schedule as recently filled so UI disables relevant actions immediately
      try {
        const sid = data.ScheduleID || data.ScheduleId || data.scheduleId || (selectedSchedule && (selectedSchedule.ScheduleID || selectedSchedule.ScheduleId || selectedSchedule.id));
        if (sid) {
          setRecentlyFilled(prev => ({ ...(prev || {}), [sid]: true }));
          // Poll server for confirmation that the visit/form is present. If confirmed,
          // move id into `confirmedFilled` so the disabled state persists until
          // the authoritative server state is observed. Fall back to clearing
          // optimistic flag after 30s if server never confirms.
          (async () => {
            const maxAttempts = 6;
            const delayMs = 2000;
            let confirmed = false;
            for (let i = 0; i < maxAttempts; i++) {
              try {
                const payload = await api.getFilledFormByScheduleId(dispatch, sid, apiClient).catch(() => null);
                const normalized = extractFillForm(payload);
                if (payload && (normalized.form && Object.keys(normalized.form).length > 0 || normalized.schedule)) {
                  // Consider confirmed if server returned a filled form or schedule row
                  confirmed = true;
                  setConfirmedFilled(prev => ({ ...(prev || {}), [sid]: true }));
                  // remove optimistic flag
                  setRecentlyFilled(prev => { const copy = { ...(prev || {}) }; delete copy[sid]; return copy; });
                  // Refresh the authoritative schedule row and update local list/state
                  try {
                    const schedRes = await api.callWithAuthOrApi(apiClient, { url: `/farm-visit-schedule/${sid}`, method: 'GET' });
                    const returned = schedRes && schedRes.data ? (schedRes.data.data || schedRes.data) : schedRes;
                    if (returned) {
                      // update selected schedule and list optimistically from server response
                      dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: returned });
                      try {
                        const updated = (schedules || []).map(s => {
                          const sidLocal = s.ScheduleID || s.id || null;
                          const rid = returned.ScheduleID || returned.id || null;
                          if (!sidLocal || !rid) return s;
                          if (String(sidLocal).toLowerCase() === String(rid).toLowerCase()) return { ...s, ...returned };
                          return s;
                        });
                        dispatch({ type: 'SET_LIST', payload: updated });
                      } catch (e) {
                        // fallback: refresh full list if local merge fails
                        await api.fetchSchedules(dispatch, { IncludeDeleted: false, PageNumber: state.schedulePage || 1, PageSize: state.schedulePageSize || 20, FarmType: state.farmType, FarmID: state.selectedFarmId }, apiClient);
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to refresh schedule row after confirmation', e);
                  }
                  break;
                }
              } catch (e) {
                // ignore and retry
              }
              await new Promise(r => setTimeout(r, delayMs));
            }
            if (!confirmed) {
              // fallback: clear optimistic flag after 30s to avoid permanently disabling UI
              setTimeout(() => setRecentlyFilled(prev => { const copy = { ...(prev || {}) }; delete copy[sid]; return copy; }), 30000);
            }
          })();
        }
      } catch (e) { /* ignore */ }
      // clear any external errors on success
      setExternalErrors({});
    } catch (err) {
      console.error('onFillVisitSave error', err);
      // If server returned validation details, map them to externalErrors so modal forms can display inline messages
      const payloadData = (typeof payload !== 'undefined' && payload) ? payload : (localFillData || {});
      const farmType = (payloadData.FarmType || payloadData.FarmTypeCode || '').toString().toUpperCase() || (selectedSchedule && (selectedSchedule.FarmType || selectedSchedule.FarmTypeCode || '')).toString().toUpperCase();
      const resp = err && err.response && err.response.data ? err.response.data : null;
      // Common shapes: { success:false, message:'', details: { field: 'msg' } } or { errors: { field: 'msg' } } or errors: [{field,msg}]
      let fieldErrs = (resp && (resp.details || resp.fieldErrors || resp.errors || resp.validationErrors)) || {};
      // Normalize array-shaped errors to object map
      if (Array.isArray(fieldErrs)) {
        const obj = {};
        fieldErrs.forEach(it => {
          if (!it) return;
          const key = it.field || it.key || it.name || null;
          const msg = it.message || it.msg || it.error || (typeof it === 'string' ? it : JSON.stringify(it));
          if (key) obj[key] = msg;
        });
        fieldErrs = obj;
      }
      // If errors is an object with arrays, flatten to first message
      if (fieldErrs && typeof fieldErrs === 'object' && !Array.isArray(fieldErrs)) {
        const flat = {};
        Object.keys(fieldErrs).forEach(k => {
          const v = fieldErrs[k];
          if (Array.isArray(v) && v.length > 0) flat[k] = v[0];
          else if (typeof v === 'object' && v !== null && (v.message || v.msg)) flat[k] = v.message || v.msg;
          else flat[k] = typeof v === 'string' ? v : String(v);
        });
        fieldErrs = flat;
      }

      if (fieldErrs && Object.keys(fieldErrs).length > 0) {
        if (farmType === 'LAYER') setExternalErrors(prev => ({ ...(prev || {}), layerForm: fieldErrs }));
        else setExternalErrors(prev => ({ ...(prev || {}), dairyForm: fieldErrs }));
        // Don't close the modal; let user fix inline errors
        return;
      }
      // otherwise show a toast or generic message
      showToast(err?.response?.data?.message || err.message || 'Failed to save visit', 'error');
      return;
    }
    // on success: close modal and refresh
    closeModal('fillVisit');
    handleSearch();
  };

  const onSubmitApproval = async () => {
    if (!selectedSchedule) return;
    await api.submitForApproval(dispatch, selectedSchedule.id ?? selectedSchedule.ScheduleID ?? selectedSchedule.ScheduleID, localApprovalData.managerId, apiClient);
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

      const result = await api.processApproval(dispatch, selectedSchedule.id ?? selectedSchedule.ScheduleID ?? selectedSchedule.ScheduleID, payload, apiClient)
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
          await api.fetchSchedules(dispatch, {}, apiClient)
        }
        // refresh stats independently
        try { await api.fetchStats(dispatch, apiClient) } catch (e) { /* ignore */ }
        if (action === 'Approve') dispatch({ type: 'SET_MESSAGE', payload: 'Schedule approved.' })
        else if (action === 'Reject') dispatch({ type: 'SET_MESSAGE', payload: 'Schedule rejected.' })
        else if (action === 'Postpone') dispatch({ type: 'SET_MESSAGE', payload: 'Schedule postponed.' })
        else dispatch({ type: 'SET_MESSAGE', payload: 'Approval processed successfully.' })
      } else {
        // If no returned data, fall back to a full refresh
        await api.fetchSchedules(dispatch, {}, apiClient)
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
        const latestRes = await api.callWithAuthOrApi(apiClient, { url: `/farm-visit-schedule/${id}`, method: 'GET' });
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

      await api.completeVisit(dispatch, id, payload, apiClient);
    } catch (err) {
      console.error('onCompleteVisit error', err);
      showToast(err?.response?.data?.message || err.message || 'Failed to complete visit', 'error')
    } finally {
      closeModal('complete');
      handleSearch();
    }
  };

  const onBulkUpload = async (file) => {
    await api.uploadBulk(dispatch, file, apiClient);
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
        newDisabled={creatingScheduleLocked}
        onShowDrafts={() => api.fetchDrafts(dispatch, apiClient).then(() => dispatch({ type: 'OPEN_DRAFTS_MODAL' }))}
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

      {/* Moved filters: Date Range, Farm Type, Clear/Reset (previously in ScheduleHeader) */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-4 mt-4"> 
        <div className="flex flex-wrap items-end gap-4 pt-0 border-t-0">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">From</label>
            <input
              type="datetime-local"
              value={state.dateRange && state.dateRange.startDate ? new Date(state.dateRange.startDate).toISOString().slice(0,16) : ''}
              onChange={(e) => {
                const v = e.target.value;
                const newStart = v ? new Date(v) : null;
                const nextRange = { startDate: newStart, endDate: state.dateRange ? state.dateRange.endDate : null };
                dispatch({ type: 'SET_DATE_RANGE', payload: nextRange });
                handleSearch({ dateRange: nextRange });
              }}
              className="w-56 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">To</label>
            <input
              type="datetime-local"
              value={state.dateRange && state.dateRange.endDate ? new Date(state.dateRange.endDate).toISOString().slice(0,16) : ''}
              onChange={(e) => {
                const v = e.target.value;
                const newEnd = v ? new Date(v) : null;
                const nextRange = { startDate: state.dateRange ? state.dateRange.startDate : null, endDate: newEnd };
                dispatch({ type: 'SET_DATE_RANGE', payload: nextRange });
                handleSearch({ dateRange: nextRange });
              }}
              className="w-56 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Search</label>
            <div className="relative">
              <input
                type="search"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { handleSearch({ SearchTerm: e.target.value, PageNumber: 1 }); } }}
                placeholder="Search (farm, advisor, visit code...)"
                className="w-96 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
              {searchTerm ? (
                <button type="button" onClick={() => { setSearchTerm(''); handleSearch({ SearchTerm: '', PageNumber: 1 }); }} title="Clear search" className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1">✕</button>
              ) : null}
              <button type="button" onClick={() => { handleSearch({ SearchTerm: searchTerm, PageNumber: 1 }); }} title="Search" className="absolute right-0 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-r-md hover:bg-indigo-700">🔍</button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Farm Type</label>
            {(() => {
              // Prefer backend-provided filter options when available
              const fo = state.filterOptions || {};
              const farmTypeList = fo.FarmType || fo.farmType || fo['FarmType'] || fo['farmType'] || null;
              const normalized = Array.isArray(farmTypeList) && farmTypeList.length > 0 ? farmTypeList : null;
              const fallback = [
                { value: '', label: 'All Types' },
                { value: 'DAIRY', label: 'Dairy' },
                { value: 'LAYER', label: 'Layer' },
                { value: 'BROILER', label: 'Broiler' },
              ];
              const options = normalized ? normalized.map(o => ({ value: o.value ?? o.Value ?? o.Id ?? o.id ?? o.key ?? o.Key ?? '', label: o.label ?? o.Label ?? o.Name ?? o.name ?? String(o) })) : fallback;
              return (
                <select value={state.farmType || ''} onChange={(e) => { const v = e.target ? e.target.value : e; dispatch({ type: 'SET_FARM_TYPE', payload: v }); try { console.debug('FarmType changed ->', v); } catch {} handleSearch({ farmType: v, PageNumber: 1, PageSize: state.schedulePageSize || 20 }); }} className="w-40 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  {options.map((opt, idx) => (
                    <option key={idx} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              );
            })()}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Visit Status</label>
            {(() => {
              const fo = state.filterOptions || {};
              const list = fo.VisitStatus || fo.visitStatus || null;
              const opts = Array.isArray(list) && list.length > 0 ? list : [{ value: '', label: 'All' }, { value: 'Scheduled', label: 'Scheduled' }, { value: 'InProgress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }];
              return (
                <select value={visitStatusFilter || ''} onChange={(e) => { const v = e.target.value; setVisitStatusFilter(v); handleSearch({ visitStatus: v, PageNumber: 1 }); }} className="w-36 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  {opts.map((opt, i) => <option key={String(i)} value={opt.value ?? opt.Value ?? opt.Id ?? opt.id ?? opt}>{opt.label ?? opt.Label ?? opt.Name ?? opt.name ?? String(opt)}</option>)}
                </select>
              );
            })()}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Approval Status</label>
            {(() => {
              const fo = state.filterOptions || {};
              const list = fo.ApprovalStatus || fo.approvalStatus || null;
              const opts = Array.isArray(list) && list.length > 0 ? list : [{ value: '', label: 'All' }, { value: 'Approved', label: 'Approved' }, { value: 'Rejected', label: 'Rejected' }, { value: 'Pending', label: 'Pending' }];
              return (
                <select value={approvalStatusFilter || ''} onChange={(e) => { const v = e.target.value; setApprovalStatusFilter(v); handleSearch({ approvalStatus: v, PageNumber: 1 }); }} className="w-36 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  {opts.map((opt, i) => <option key={String(i)} value={opt.value ?? opt.Value ?? opt.Id ?? opt.id ?? opt}>{opt.label ?? opt.Label ?? opt.Name ?? opt.name ?? String(opt)}</option>)}
                </select>
              );
            })()}
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => { dispatch({ type: 'SET_DATE_RANGE', payload: initialState.dateRange }); dispatch({ type: 'SET_FARM_TYPE', payload: '' }); dispatch({ type: 'SET_SELECTED_FARM_ID', payload: null }); handleSearch({ dateRange: initialState.dateRange, farmType: '', selectedFarmId: null, PageNumber: 1 }); }}
              className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600"
              title="Clear filters"
              aria-label="Clear filters"
            >
              <FaTrash className="h-4 w-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600"
              title="Reset filters"
              aria-label="Reset filters"
            >
              <FaUndo className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Geographic filters removed per request */}
      </div>

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
            fetchWithAuth={apiClient}
            recentlyFilled={recentlyFilled}
            confirmedFilled={confirmedFilled}
            pageStartOffset={((state.schedulePage || 1) - 1) * (state.schedulePageSize || 20)}
            page={state.schedulePage || 1}
            setPage={(n) => { try { dispatch({ type: 'SET_PAGINATION', payload: { currentPage: n, pageSize: state.schedulePageSize || 20, totalCount: state.scheduleTotalCount || 0, totalPages: state.scheduleTotalPages || 1 } }); } catch (e) { /* ignore */ } handleSearch({ PageNumber: n }); }}
            showPager={false}
            total={state.scheduleTotalCount}
            pageSize={state.schedulePageSize}
            totalPages={state.scheduleTotalPages}
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
                    const payload = await api.getFilledFormByScheduleId(dispatch, id, apiClient);
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
              // Open the Visit Schedule modal in read-only mode with the selected schedule's full data.
              (async () => {
                try {
                  const id = schedule?.id || schedule?.ScheduleID || schedule?.ScheduleId || null;
                  let serverSchedule = schedule;
                  if (id) {
                    try {
                      const res = await apiClient({ url: `/farm-visit-schedule/${encodeURIComponent(id)}`, method: 'get' });
                      const body = res?.data?.data || res?.data || res;
                      // support multiple shapes: direct row, { recordset: [...] }, or wrapped payload
                      if (Array.isArray(body)) serverSchedule = body[0] || serverSchedule;
                      else if (body && body.recordset && Array.isArray(body.recordset)) serverSchedule = body.recordset[0] || serverSchedule;
                      else if (body && body.schedule) serverSchedule = body.schedule || serverSchedule;
                      else if (body && typeof body === 'object') serverSchedule = body;
                    } catch (e) {
                      // if fetch fails, fall back to the lightweight schedule from the list
                      console.debug('onView: failed to fetch full schedule, falling back to provided row', e);
                    }
                  }

                  dispatch({ type: 'SET_FORM_DATA', payload: serverSchedule });
                  dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: serverSchedule });
                  // mark schedule modal as read-only before opening
                  dispatch({ type: 'SET_SCHEDULE_READ_ONLY', payload: true });
                  openModal('schedule', serverSchedule);
                } catch (err) {
                  console.warn('onView: failed to open schedule modal', err);
                }
              })();
            }}
            onComplete={(schedule) => {
              dispatch({ type: 'SET_SELECTED_SCHEDULE', payload: schedule });
              openModal('complete', schedule);
            }}
          />
          <div className="mt-4">
            <Pagination page={state.schedulePage || 1} setPage={(n) => { try { dispatch({ type: 'SET_PAGINATION', payload: { currentPage: n, pageSize: state.schedulePageSize || 20, totalCount: state.scheduleTotalCount || 0, totalPages: state.scheduleTotalPages || 1 } }); } catch (e) { /* ignore */ } handleSearch({ PageNumber: n }); }} total={state.scheduleTotalCount} pageSize={state.schedulePageSize} maxButtons={7} totalPages={state.scheduleTotalPages} />
          </div>
        </div>
      )}

      <ScheduleModals
        state={state}
        dispatch={dispatch}
        fetchWithAuth={apiClient}
        isAdvisor={auth?.user && (auth.user.roles || []).includes('ROLE_ADVISOR')}
        currentUserId={auth?.user?.UserID || auth?.user?.userId || auth?.user?.id}
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
        createLocked={creatingScheduleLocked}
      />
      {/* Mobile Floating Action Button for creating a new schedule */}
      <button
        onClick={() => openModal('schedule')}
        disabled={creatingScheduleLocked}
        className={`fixed bottom-6 right-4 md:hidden z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition ${creatingScheduleLocked ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
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