import apiClient from '../utils/api';

// Generic error handler
const handleError = (dispatch, error) => {
  const message = error.response?.data?.message || error.message;
  dispatch({ type: 'SET_ERROR', payload: message });
};

// --- API Functions ---

const callWithAuthOrApi = async (fetchWithAuth, config) => {
  if (typeof fetchWithAuth === 'function') {
    // fetchWithAuth expects an axios-like config and sets baseURL internally
    return await fetchWithAuth(config);
  }
  // adjust config.url when using the shared axios client fallback
  const fallbackConfig = { ...config };
  return await apiClient(fallbackConfig);
};

export const fetchSchedules = async (dispatch, filters, fetchWithAuth) => {
  dispatch({ type: 'SET_LOADING', payload: true });
  try {
    // Backend expects GET /farm-visit-schedule/search on the API base
    const res = await callWithAuthOrApi(fetchWithAuth, { url: '/farm-visit-schedule/search', method: 'GET', params: filters });
    const payload = res.data && res.data.data ? res.data.data : (res.data || []);
    dispatch({ type: 'SET_LIST', payload });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const fetchAllSchedules = async (dispatch, fetchWithAuth, options = {}) => {
  dispatch({ type: 'SET_LOADING', payload: true });
  try {
    const params = {};
    if (options.IncludeDeleted !== undefined) params.IncludeDeleted = options.IncludeDeleted ? 1 : 0;
    if (options.PageNumber) params.PageNumber = options.PageNumber;
    if (options.PageSize) params.PageSize = options.PageSize;
    // include any other filter props directly
    Object.keys(options).forEach(k => {
      if (!['IncludeDeleted','PageNumber','PageSize'].includes(k) && options[k] !== undefined) params[k] = options[k];
    });

    const res = await callWithAuthOrApi(fetchWithAuth, { url: '/farm-visit-schedule/list', method: 'GET', params });
    const wrapper = res.data && res.data.data ? res.data.data : (res.data || {});
    const items = Array.isArray(wrapper.items) ? wrapper.items : (Array.isArray(wrapper) ? wrapper : []);
    const pagination = wrapper.pagination || { totalCount: items.length, currentPage: options.PageNumber || 1, pageSize: options.PageSize || items.length, totalPages: 1 };
    dispatch({ type: 'SET_LIST', payload: items });
    dispatch({ type: 'SET_PAGINATION', payload: { currentPage: pagination.currentPage || pagination.current || options.PageNumber || 1, pageSize: pagination.pageSize || pagination.pageSize || options.PageSize || items.length, totalCount: pagination.totalCount || pagination.total || items.length, totalPages: pagination.totalPages || 1 } });
    return { items, pagination };
  } catch (error) {
    handleError(dispatch, error);
    return { items: [], pagination: { totalCount: 0, currentPage: 1, pageSize: options.PageSize || 0, totalPages: 0 } };
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

export const fetchDrafts = async (dispatch, fetchWithAuth, params = {}) => {
  dispatch({ type: 'SET_LOADING', payload: true });
  try {
    const res = await callWithAuthOrApi(fetchWithAuth, { url: '/farm-visit-schedule/drafts', method: 'GET', params });
    // New backend response shape: { success: true, data: { items: [...], pagination: { totalCount, currentPage, pageSize, totalPages } } }
    const wrapper = res.data && res.data.data ? res.data.data : (res.data || {});
    const items = Array.isArray(wrapper.items) ? wrapper.items : (Array.isArray(wrapper) ? wrapper : []);
    const pagination = wrapper.pagination || { totalCount: items.length, currentPage: params.PageNumber || 1, pageSize: params.PageSize || items.length, totalPages: 1 };
    dispatch({ type: 'SET_DRAFTS', payload: { items, pagination } });
  } catch (error) {
    handleError(dispatch, error);
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

export const fetchLookups = async (dispatch, fetchWithAuth) => {
  try {
    // Use advisor endpoints for employee/manager lookups (backend mounts employee routes under /api/advisor)
    const [farms, employees, managers] = await Promise.all([
      callWithAuthOrApi(fetchWithAuth, { url: '/farms/active', method: 'GET' }),
      // request all active advisors/employees for dropdowns
      callWithAuthOrApi(fetchWithAuth, { url: '/advisor/active/all', method: 'GET' }),
      callWithAuthOrApi(fetchWithAuth, { url: '/advisor/managers', method: 'GET' }),
    ]);
    dispatch({ type: 'SET_LOOKUP_DATA', payload: { farms: farms.data, employees: employees.data, managers: managers.data } });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const fetchStats = async (dispatch, fetchWithAuth) => {
  try {
    // Controller exposes quick dashboard stats at /stats/quick
    const res = await callWithAuthOrApi(fetchWithAuth, { url: '/farm-visit-schedule/stats/quick', method: 'GET' });
    // The controller returns a normalized stats object in res.data.data
    const payload = res.data && res.data.data ? res.data.data : (res.data || {});
    dispatch({ type: 'SET_STATS', payload });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const fetchStatistics = async (dispatch, params = {}, fetchWithAuth) => {
  try {
    const res = await callWithAuthOrApi(fetchWithAuth, { url: '/farm-visit-schedule/statistics', method: 'GET', params });
    const payload = res.data && res.data.data ? res.data.data : (res.data || {});
    dispatch({ type: 'SET_STATISTICS', payload });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const fetchDashboardQuick = async (dispatch, params = {}, fetchWithAuth) => {
  try {
    const res = await callWithAuthOrApi(fetchWithAuth, { url: '/farm-visit-schedule/stats/quick', method: 'GET', params });
    const payload = res.data && res.data.data ? res.data.data : (res.data || {});
    dispatch({ type: 'SET_DASHBOARD_QUICK', payload });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const createSchedule = async (dispatch, scheduleData, fetchWithAuth) => {
  try {
    await callWithAuthOrApi(fetchWithAuth, { url: '/farm-visit-schedule', method: 'POST', data: scheduleData });
    dispatch({ type: 'SET_SUCCESS', payload: 'Schedule created successfully.' });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const updateSchedule = async (dispatch, scheduleData, fetchWithAuth) => {
  try {
    // Backend expects PATCH /:id
    const id = scheduleData.id || scheduleData.ScheduleID;
    await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}`, method: 'PATCH', data: scheduleData });
    dispatch({ type: 'SET_SUCCESS', payload: 'Schedule updated successfully.' });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const deleteSchedule = async (dispatch, id, fetchWithAuth) => {
  try {
    // Backend uses POST /:id/delete for soft delete
    await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/delete`, method: 'POST', data: {} });
    dispatch({ type: 'SET_SUCCESS', payload: 'Schedule deleted successfully.' });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const submitForApproval = async (dispatch, id, managerId, fetchWithAuth) => {
  try {
    await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/submit`, method: 'POST', data: { SubmittedBy: managerId } });
    dispatch({ type: 'SET_SUCCESS', payload: 'Schedule submitted for approval.' });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const processApproval = async (dispatch, id, approvalData, fetchWithAuth) => {
  try {
    // Backend route: POST /:id/approval
    const res = await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/approval`, method: 'POST', data: approvalData });
    dispatch({ type: 'SET_SUCCESS', payload: 'Approval processed successfully.' });
    // Return the parsed server response so callers can update local state without refetching
    return res.data;
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const approveSchedule = async (dispatch, id, approvedBy, comments = null, fetchWithAuth) => {
  try {
    const data = { ApprovedBy: approvedBy, Comments: comments };
    const res = await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/approve`, method: 'POST', data });
    dispatch({ type: 'SET_SUCCESS', payload: res.data && (res.data.message || res.data.Message) ? (res.data.message || res.data.Message) : 'Schedule approved.' });
    return res.data;
  } catch (error) {
    handleError(dispatch, error);
    throw error;
  }
};

export const rejectSchedule = async (dispatch, id, rejectedBy, rejectionReason, comments = null, fetchWithAuth) => {
  try {
    const data = { RejectedBy: rejectedBy, RejectionReason: rejectionReason, Comments: comments };
    const res = await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/reject`, method: 'POST', data });
    dispatch({ type: 'SET_SUCCESS', payload: res.data && (res.data.message || res.data.Message) ? (res.data.message || res.data.Message) : 'Schedule rejected.' });
    return res.data;
  } catch (error) {
    handleError(dispatch, error);
    throw error;
  }
};

export const postponeSchedule = async (dispatch, id, postponedBy, postponedTo, postponedReason, comments = null, fetchWithAuth) => {
  try {
    const data = { PostponedBy: postponedBy, PostponedTo: postponedTo, PostponedReason: postponedReason, Comments: comments };
    const res = await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/postpone`, method: 'POST', data });
    dispatch({ type: 'SET_SUCCESS', payload: res.data && (res.data.message || res.data.Message) ? (res.data.message || res.data.Message) : 'Schedule postponed.' });
    return res.data;
  } catch (error) {
    handleError(dispatch, error);
    throw error;
  }
};

export const completeVisit = async (dispatch, id, completeData, fetchWithAuth) => {
  try {
    await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/complete`, method: 'POST', data: completeData });
    dispatch({ type: 'SET_SUCCESS', payload: 'Visit marked as complete.' });
  } catch (error) {
    handleError(dispatch, error);
  }
};

export const fillVisit = async (dispatch, visitData, fetchWithAuth) => {
  try {
    // Use the controller routes for layer/dairy farm visits.
    // For dairy visits the backend exposes POST /api/dairy-farm (create) and PUT /api/dairy-farm/:id (update).
    if (visitData.FarmType === 'LAYER') {
      // Use create endpoint for layer farm visits (controller: createLayerFarmVisit)
      const endpoint = '/layer-farm';
      await callWithAuthOrApi(fetchWithAuth, { url: endpoint, method: 'POST', data: visitData });
    } else {
      // Dairy farm: create when no id, update when id present
      const id = visitData.DairyFarmVisitId || visitData.dairyFarmVisitId || visitData.id || null;
      if (id) {
        await callWithAuthOrApi(fetchWithAuth, { url: `/dairy-farm/${id}`, method: 'PUT', data: visitData });
      } else {
        await callWithAuthOrApi(fetchWithAuth, { url: '/dairy-farm', method: 'POST', data: visitData });
      }
    }
    dispatch({ type: 'SET_SUCCESS', payload: 'Visit details saved successfully.' });
  } catch (error) {
    handleError(dispatch, error);
    // Re-throw so callers can inspect validation errors and display inline messages
    throw error;
  }
};

export const startFarmVisit = async (dispatch, id, startedBy, fetchWithAuth) => {
  try {
    const data = { StartedBy: startedBy };
    const res = await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/start`, method: 'POST', data });
    dispatch({ type: 'SET_SUCCESS', payload: 'Visit started.' });
    // Normalize return: prefer res.data.data (the updated schedule row) when present
    if (res && res.data) return res.data.data ? res.data.data : res.data;
    return null;
  } catch (error) {
    handleError(dispatch, error);
    throw error;
  }
};

export const getFilledFormByScheduleId = async (dispatch, id, fetchWithAuth) => {
  try {
    const res = await callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}/filled-form`, method: 'GET' });
    // Expecting shape { success, data: { schedule, form, statusHistory } }
    const payload = res && res.data ? (res.data.data || res.data) : null;
    return payload;
  } catch (error) {
    handleError(dispatch, error);
    throw error;
  }
};

export const downloadCsvTemplate = () => {
  // Use the shared axios client's baseURL for the template link
  const base = apiClient.defaults?.baseURL || '';
  window.location.href = `${base.replace(/\/$/, '')}/farm-visit-schedule/template`;
};

export const uploadBulk = async (dispatch, file, fetchWithAuth) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    await callWithAuthOrApi(fetchWithAuth, { url: '/farm-visit-schedule/bulk', method: 'POST', data: formData });
    dispatch({ type: 'SET_SUCCESS', payload: 'Bulk upload successful.' });
  } catch (error) {
    handleError(dispatch, error);
  }
};

// Default export: consolidated API object for convenience
const api = {
  callWithAuthOrApi,
  fetchSchedules,
  fetchAllSchedules,
  fetchDrafts,
  fetchLookups,
  fetchStats,
  fetchStatistics,
  fetchDashboardQuick,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  submitForApproval,
  processApproval,
  completeVisit,
  fillVisit,
  startFarmVisit,
  getFilledFormByScheduleId,
  downloadCsvTemplate,
  uploadBulk,
};

export default api;
