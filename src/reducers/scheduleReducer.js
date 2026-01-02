import { addDays, format } from 'date-fns';

export const initialState = {
  list: [],
  selectedSchedule: null,
  loading: true,
  message: null,
  showForm: false,
  scheduleReadOnly: false,
  editingId: null,
  form: {
    AdvisorID: '',
    FarmID: '',
    ProposedDate: '',
    FarmType: '',
    ManagerID: '',
    FarmTypeReferenceID: '',
    VisitFrequency: '',
    NextFollowUpDate: '',
    FollowUpNote: '',
    VisitPurpose: '',
    EstimatedDuration: '',
    AssignTo: '',
    VisitNote: '',
    IsUrgent: false,
  },
  showDelete: false,
  deleteTarget: null,
  showSubmitModal: false,
  submitTarget: null,
  submitManagerId: '',
  showApprovalModal: false,
  approvalTarget: null,
  approvalAction: 'Approve',
  approvalReason: '',
  approvalPostponedTo: '',
  showCompleteModal: false,
  completeTarget: null,
  completeActualDate: '',
  completeNote: '',
  showFillModal: false,
  fillTarget: null,
  fillData: null,
  layerForm: null,
  dairyForm: null,
  fillLoading: false,
  fillError: null,
  showBulkModal: false,
  bulkFile: null,
  showDraftsModal: false,
  drafts: [],
  draftPage: 1,
  draftSize: 10,
  draftTotalPages: 1,
  draftTotalCount: 0,
  employees: [],
  farms: [],
  managers: [],
  advisors: [],
  // pagination for schedule list
  schedulePage: 1,
  schedulePageSize: 20,
  scheduleTotalCount: 0,
  scheduleTotalPages: 1,
  dateRange: {
    startDate: addDays(new Date(), -30),
    endDate: new Date(),
  },
  farmType: '',
  selectedFarmId: null,
  showDatePicker: false,
  stats: {},
  dashboardQuick: {},
  statistics: null,
  filterOptions: {},
};

export const scheduleReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'SET_ERROR':
      // normalize errors into message for UI
      return { ...state, message: action.payload, loading: false };
    case 'SET_SUCCESS':
      // success payloads are surfaced via message for the UI
      return { ...state, message: action.payload, loading: false };
    case 'SET_LIST':
      return { ...state, list: action.payload, loading: false };
    case 'SET_PAGINATION':
      return { ...state, schedulePage: action.payload.currentPage || action.payload.current || state.schedulePage, schedulePageSize: action.payload.pageSize || action.payload.pageSize || state.schedulePageSize, scheduleTotalCount: action.payload.totalCount || action.payload.total || state.scheduleTotalCount, scheduleTotalPages: action.payload.totalPages || state.scheduleTotalPages };
    case 'SET_LOOKUP_DATA':
      return { ...state, employees: action.payload.employees, farms: action.payload.farms, managers: action.payload.managers || state.managers, advisors: action.payload.advisors || state.advisors };
    case 'SET_FILTER_OPTIONS':
      return { ...state, filterOptions: action.payload || {} };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    case 'SET_FARM_TYPE':
        return { ...state, farmType: action.payload };
    case 'SET_SELECTED_FARM_ID':
        return { ...state, selectedFarmId: action.payload };
    case 'TOGGLE_DATE_PICKER':
        return { ...state, showDatePicker: !state.showDatePicker };
    case 'OPEN_FORM':
      {
        const payload = action.payload || null;
        let formattedProposed = '';
        let formattedNext = '';
        try {
          if (payload) {
            const pd = payload.ProposedDate || payload.proposedDate || null;
            const nf = payload.NextFollowUpDate || payload.nextFollowUpDate || null;
            if (pd) {
              const d = new Date(pd);
              if (!isNaN(d.getTime())) formattedProposed = format(d, "yyyy-MM-dd'T'HH:mm");
            }
            if (nf) {
              const n = new Date(nf);
              if (!isNaN(n.getTime())) formattedNext = format(n, "yyyy-MM-dd'T'HH:mm");
            }
          }
        } catch (e) {
          // fall back to empty strings on parse errors
          formattedProposed = '';
          formattedNext = '';
        }

        // Normalize common alternate property names into the canonical `form` shape
        const normalizedPayload = payload ? {
          ...payload,
          VisitPurpose: payload.VisitPurpose || payload.VisitType || payload.visitPurpose || payload.visitType || payload.VisitPurpose || '',
        } : payload;

        return {
          ...state,
          showForm: true,
          editingId: payload ? payload.ScheduleID : null,
          form: payload ? { ...initialState.form, ...normalizedPayload, ProposedDate: formattedProposed, NextFollowUpDate: formattedNext || (payload && (payload.NextFollowUpDate || payload.nextFollowUpDate) ? (payload.NextFollowUpDate || payload.nextFollowUpDate) : '') } : initialState.form,
          // respect explicit read-only flag if set by caller
          scheduleReadOnly: payload && payload.__readOnly === true ? true : state.scheduleReadOnly,
        };
      }
    case 'CLOSE_FORM':
      return { ...state, showForm: false, editingId: null, form: initialState.form, scheduleReadOnly: false };
    case 'SET_SCHEDULE_READ_ONLY':
      return { ...state, scheduleReadOnly: action.payload === true };
    case 'SET_FORM_DATA':
      {
        const payload = action.payload || {};
        // normalize VisitPurpose from alternative property names
        let visitPurpose = payload.VisitPurpose || payload.VisitType || payload.visitPurpose || payload.visitType || '';
        // format ProposedDate and NextFollowUpDate for datetime-local inputs
        let formattedProposed = '';
        let formattedNext = '';
        try {
          const pd = payload.ProposedDate || payload.proposedDate || null;
          const nf = payload.NextFollowUpDate || payload.nextFollowUpDate || null;
          if (pd) {
            const d = new Date(pd);
            if (!isNaN(d.getTime())) formattedProposed = format(d, "yyyy-MM-dd'T'HH:mm");
          }
          if (nf) {
            const n = new Date(nf);
            if (!isNaN(n.getTime())) formattedNext = format(n, "yyyy-MM-dd'T'HH:mm");
          }
        } catch (e) {
          // ignore
        }
        return { ...state, form: { ...initialState.form, ...payload, VisitPurpose: visitPurpose, ProposedDate: formattedProposed || (payload.ProposedDate || payload.proposedDate || ''), NextFollowUpDate: formattedNext || (payload.NextFollowUpDate || payload.nextFollowUpDate || '') } };
      }
    case 'UPDATE_FORM':
      return { ...state, form: { ...state.form, [action.payload.name]: action.payload.value } };
    case 'OPEN_DELETE_MODAL':
        return { ...state, showDelete: true, deleteTarget: action.payload };
    case 'CLOSE_DELETE_MODAL':
        return { ...state, showDelete: false, deleteTarget: null };
    case 'OPEN_SUBMIT_MODAL':
        return { ...state, showSubmitModal: true, submitTarget: action.payload };
    case 'CLOSE_SUBMIT_MODAL':
        return { ...state, showSubmitModal: false, submitTarget: null, submitManagerId: '' };
    case 'OPEN_APPROVAL_MODAL':
        return { ...state, showApprovalModal: true, approvalTarget: action.payload };
    case 'CLOSE_APPROVAL_MODAL':
        return { ...state, showApprovalModal: false, approvalTarget: null, approvalAction: 'Approve', approvalReason: '', approvalPostponedTo: '' };
    case 'OPEN_COMPLETE_MODAL':
        return { ...state, showCompleteModal: true, completeTarget: action.payload, completeActualDate: new Date().toISOString().slice(0, 16) };
    case 'CLOSE_COMPLETE_MODAL':
        return { ...state, showCompleteModal: false, completeTarget: null, completeActualDate: '', completeNote: '' };
    case 'OPEN_FILL_MODAL':
        return { ...state, showFillModal: true, fillTarget: action.payload };
    case 'CLOSE_FILL_MODAL':
        return { ...state, showFillModal: false, fillTarget: null, fillData: null, layerForm: null, dairyForm: null, fillError: null };
    case 'SET_FILL_DATA':
        return { ...state, fillData: action.payload.data, layerForm: action.payload.layerForm, dairyForm: action.payload.dairyForm, fillLoading: false };
      case 'SET_STATS':
        return { ...state, stats: action.payload };
      case 'SET_DASHBOARD_QUICK':
        return { ...state, dashboardQuick: action.payload };
      case 'SET_STATISTICS':
        return { ...state, statistics: action.payload };
    case 'SET_FILL_LOADING':
        return { ...state, fillLoading: action.payload };
    case 'SET_FILL_ERROR':
        return { ...state, fillError: action.payload, fillLoading: false };
    case 'UPDATE_LAYER_FORM':
        return { ...state, layerForm: { ...state.layerForm, ...action.payload } };
    case 'UPDATE_DAIRY_FORM':
        return { ...state, dairyForm: { ...state.dairyForm, ...action.payload } };
    case 'SET_SELECTED_SCHEDULE':
      return {
        ...state,
        selectedSchedule: action.payload,
        // keep legacy fields in sync for components that read these
        deleteTarget: action.payload,
        submitTarget: action.payload,
        approvalTarget: action.payload,
        completeTarget: action.payload,
        fillTarget: action.payload,
      };
    case 'SET_FILL_VISIT_FORM_DATA':
      return {
        ...state,
        fillData: action.payload || null,
        // If payload has farm-specific forms, set them
        layerForm: action.payload?.layerForm ?? state.layerForm,
        dairyForm: action.payload?.dairyForm ?? state.dairyForm,
      };
    case 'SET_DRAFTS':
      // payload: { items: [...], pagination: { totalCount, currentPage, pageSize, totalPages } }
      return {
        ...state,
        drafts: action.payload?.items ?? [],
        draftTotalCount: action.payload?.pagination?.totalCount ?? state.draftTotalCount,
        draftPage: action.payload?.pagination?.currentPage ?? state.draftPage,
        draftSize: action.payload?.pagination?.pageSize ?? state.draftSize,
        draftTotalPages: action.payload?.pagination?.totalPages ?? state.draftTotalPages,
      };
    case 'OPEN_DRAFTS_MODAL':
      return { ...state, showDraftsModal: true };
    case 'CLOSE_DRAFTS_MODAL':
      return { ...state, showDraftsModal: false };
    case 'SET_APPROVAL_DATA':
      return { ...state, approvalData: action.payload };
    case 'SET_PROCESS_DATA':
      return { ...state, processData: action.payload };
    case 'SET_COMPLETE_DATA':
      return { ...state, completeData: action.payload };
    case 'OPEN_BULK_MODAL':
      return { ...state, showBulkModal: true };
    case 'CLOSE_BULK_MODAL':
      return { ...state, showBulkModal: false, bulkFile: null };
    case 'SET_BULK_FILE':
      return { ...state, bulkFile: action.payload };
    default:
      return state;
  }
};