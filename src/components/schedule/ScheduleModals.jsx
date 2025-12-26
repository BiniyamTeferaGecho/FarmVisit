import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { validateCompleteRequirements } from '../../utils/visitValidation';
import FillVisitModal from './FillVisitModal'; 
import Modal from '../Modal';
import { FilePlus, Trash2, Send, CheckCircle, XCircle, Clock, Upload, Calendar, User, Building, Clipboard, Clock4, StickyNote, AlertTriangle } from 'lucide-react';

const InputField = ({ label, name, value, onChange, placeholder, type = 'text', icon }) => (
  <div>
    <label className="text-left block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 ${icon ? 'pl-10' : ''}`}
      />
    </div>
  </div>
);

const SelectField = ({ label, name, value, onChange, children, icon, disabled = false }) => (
  <div>
    <label className="text-left block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 ${icon ? 'pl-10' : ''}`}
      >
        {children}
      </select>
    </div>
  </div>
);

const TextAreaField = ({ label, name, value, onChange, placeholder, icon }) => (
    <div className="md:col-span-2">
        <label className="text-left block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
            {icon && <div className="absolute top-2.5 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
            <textarea
                name={name}
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 ${icon ? 'pl-10' : ''}`}
                rows="3"
            ></textarea>
        </div>
    </div>
);

const CheckboxField = ({ name, checked, onChange, label }) => (
  <label className="flex items-center gap-2 text-sm text-gray-700">
    <input
      type="checkbox"
      name={name}
      checked={Boolean(checked)}
      onChange={onChange}
      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
    />
    {label}
  </label>
);

const ActionButton = ({ onClick, children, className = '', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-semibold text-white transition-colors ${className}`}
  >
    {children}
  </button>
);

const ScheduleModals = ({
  state,
  dispatch,
  fetchWithAuth,
  closeModal,
  onSave,
  onDeleteConfirm,
  onSubmitApproval,
  onProcessApproval,
  onCompleteVisit,
  onBulkUpload,
  onFillVisitSave,
  setFillVisitFormData,
  setApprovalData,
  setProcessData,
  setCompleteData,
  setFormData,
  approvalData,
  processData,
  completeData,
  // allow parent to pass local fill data (preferred over reducer state)
  fillVisitFormData: externalFillVisitFormData = null,
  // whether FillVisitModal should render read-only
  fillReadOnly = false,
  createLocked = false,
  // whether current user has advisor role and their id
  isAdvisor = false,
  currentUserId = null,
}) => {
  const {
    showForm: isScheduleModalOpen,
    showDelete: isDeleteModalOpen,
    showSubmitModal: isSubmitModalOpen,
    showApprovalModal: isProcessModalOpen,
    showCompleteModal: isCompleteModalOpen,
    showBulkModal: isBulkUploadModalOpen,
    showFillModal: isFillVisitModalOpen,
    form: formData = {},
    fillData: reducerFillVisitFormData = {},
    employees = [],
    farms = [],
    managers = [],
    advisors = [],
    deleteTarget,
    submitTarget,
    approvalTarget,
    completeTarget,
    fillTarget,
  } = state;

  // prefer externalFillVisitFormData (from parent local state) over reducer fill data
  const fillVisitFormData = externalFillVisitFormData ?? reducerFillVisitFormData;

  const selectedSchedule = deleteTarget || submitTarget || approvalTarget || completeTarget || fillTarget;

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  // If lookups are not present, attempt to load from the backend directly using fetchWithAuth
  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const loadLookups = async () => {
      try {
        // If we already have lookups (including advisors), skip
        if (Array.isArray(farms) && farms.length > 0 && Array.isArray(employees) && employees.length > 0 && Array.isArray(advisors) && advisors.length > 0) return;

        let farmsData = [];
        let employeesData = [];
        let managersData = [];
        let advisorsData = [];

        if (typeof fetchWithAuth === 'function') {
          const [fRes, eRes, mRes, aRes] = await Promise.all([
            fetchWithAuth({ url: '/farms/active', method: 'GET', params: { pageSize: 1000 } }),
            fetchWithAuth({ url: '/employees', method: 'GET', params: { pageSize: 1000 } }),
            fetchWithAuth({ url: '/advisor/managers', method: 'GET' }),
            fetchWithAuth({ url: '/advisor/active/all', method: 'GET' }),
          ]);
          farmsData = extractItems(fRes);
          employeesData = extractItems(eRes);
          managersData = extractItems(mRes);
          advisorsData = extractItems(aRes);
        } else {
          // fallback to direct fetch to the running app server
          const fetchJson = async (url) => {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) return res.json();
            return null;
          };
          const base = window.location.origin;
          const [fRes, eRes, mRes, aRes] = await Promise.all([
            fetchJson(`${base}/api/farms/active`),
            fetchJson(`${base}/api/employees?pageSize=1000`),
            fetchJson(`${base}/api/advisor/managers`),
            fetchJson(`${base}/api/advisor/active/all`),
          ]);
          farmsData = extractItems(fRes);
          employeesData = extractItems(eRes);
          managersData = extractItems(mRes);
          advisorsData = extractItems(aRes);
        }

        if (mounted) {
          dispatch({ type: 'SET_LOOKUP_DATA', payload: { farms: farmsData || [], employees: employeesData || [], managers: managersData || [], advisors: advisorsData || [] } });
        }
      } catch (err) {
        console.error('ScheduleModals.loadLookups error', err);
      }
    };

    loadLookups();
    return () => { mounted = false };
  }, [fetchWithAuth, farms.length, employees.length, managers.length, advisors.length]);

  // Visit frequency options (loaded from lookup: "Visit Frequency")
  const [visitFrequencies, setVisitFrequencies] = useState([]);
  // If the modal is opened by an advisor creating a schedule, we'll fetch their employee name
  const [advisorSelfName, setAdvisorSelfName] = useState(null);
  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const loadVisitFreq = async () => {
      try {
        let res = null;
        if (typeof fetchWithAuth === 'function') {
          // fetchWithAuth returns parsed JSON (not axios) from AuthProvider.fetchWithAuth
          res = await fetchWithAuth({ url: '/lookups/by-type-name/Visit Frequency', method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent('Visit Frequency')}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res);
        if (mounted) setVisitFrequencies(items || []);
      } catch (err) {
        // non-fatal: keep default options if lookup fails
        console.debug('loadVisitFreq error', err);
      }
    };
    loadVisitFreq();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  // Farm type options (loaded from lookup: "Farm Type")
  const [farmTypesList, setFarmTypesList] = useState([]);
  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const loadFarmTypes = async () => {
      try {
        let res = null;
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: '/lookups/by-type-name/Farm Type', method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent('Farm Type')}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setFarmTypesList(items);
      } catch (err) {
        console.debug('loadFarmTypes error', err);
      }
    };
    loadFarmTypes();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  // Visit type options (for Visit Purpose dropdown) - load from lookup: "Visit Type"
  const [visitTypes, setVisitTypes] = useState([]);
  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const loadVisitTypes = async () => {
      try {
        let res = null;
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: '/lookups/by-type-name/Visit Type', method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent('Visit Type')}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setVisitTypes(items);
      } catch (err) {
        console.debug('loadVisitTypes error', err);
      }
    };
    loadVisitTypes();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  // Use shared validation helper for completion requirements
  const { ready: readyToComplete, reasons: completeReasons } = validateCompleteRequirements(selectedSchedule || {}, completeData || {});

  const isEditing = Boolean((formData && (formData.id || formData.ScheduleID || formData.ScheduleId)));

  // Debug: log fill modal inputs when opened (development only)
  useEffect(() => {
    try {
      if (isFillVisitModalOpen && console && console.debug) {
        console.debug('FillVisitModal props', { selectedSchedule, fillVisitFormData, stateLayer: state.layerForm, stateDairy: state.dairyForm, fillReadOnly });
      }
    } catch (e) { /* ignore logging errors */ }
  }, [isFillVisitModalOpen]);

  // When the schedule modal opens for creation and the current user is an advisor,
  // fetch the advisor's display name and set the AdvisorID on the form (read-only behavior).
  useEffect(() => {
    let mounted = true;
    const tryPrefillAdvisor = async () => {
      try {
        const isOpen = isScheduleModalOpen;
        const editing = isEditing;
        if (!isOpen || editing) return;
        if (!isAdvisor || !currentUserId) return;

        // If AdvisorID already set in formData, leave it alone
        if (formData && (formData.AdvisorID || formData.AdvisorId)) {
          // still try to fetch display name for UI
        }

        // Fetch advisor name via public route: /users/:id/employee-name
        try {
          let res = null;
          if (typeof fetchWithAuth === 'function') {
            res = await fetchWithAuth({ url: `/users/${encodeURIComponent(currentUserId)}/employee-name`, method: 'GET' });
          } else {
            const base = window.location.origin;
            const r = await fetch(`${base}/api/users/${encodeURIComponent(currentUserId)}/employee-name`, { credentials: 'include' });
            if (r.ok) res = await r.json();
          }
          const body = res && res.data !== undefined ? res.data : res;
          // Body may be simple string or object; handle multiple shapes
          let name = null;
          if (!body) name = null;
          else if (typeof body === 'string') name = body;
          else if (typeof body === 'object') {
            if (body.name) name = body.name;
            else if (body.EmployeeName) name = body.EmployeeName;
            else if (body.employeeName) name = body.employeeName;
            else if (body.FullName) name = body.FullName;
            else if (body.fullName) name = body.fullName;
            else {
              // try to build from first/last
              const first = body.FirstName || body.firstName || '';
              const last = body.LastName || body.lastName || '';
              name = `${first} ${last}`.trim() || null;
            }
          }
          if (mounted) {
            setAdvisorSelfName(name || String(currentUserId));
            // Ensure form has AdvisorID set so validation passes
            setFormData(prev => ({ ...(prev || {}), AdvisorID: prev?.AdvisorID || currentUserId }));
          }
        } catch (err) {
          // On error, still set AdvisorID to currentUserId so form is valid
          if (mounted) {
            setAdvisorSelfName(String(currentUserId));
            setFormData(prev => ({ ...(prev || {}), AdvisorID: prev?.AdvisorID || currentUserId }));
          }
        }
      } catch (e) {
        // ignore
      }
    };
    tryPrefillAdvisor();
    return () => { mounted = false };
  }, [isScheduleModalOpen, isEditing, isAdvisor, currentUserId, fetchWithAuth, formData]);

  return (
    <>
      <Modal open={isScheduleModalOpen} title={isEditing ? 'Edit Schedule' : 'New Schedule'} onClose={() => closeModal('schedule')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField
            label="Advisor"
            name="AdvisorID"
            value={formData.AdvisorID}
            onChange={handleFormChange}
            disabled={isAdvisor && !isEditing}
            icon={<User size={16} className="text-gray-400" />}
          >
                {isAdvisor && !isEditing ? (
                  <>
                    <option value="">Select Advisor</option>
                    <option value={currentUserId}>{advisorSelfName || 'Loading...'}</option>
                  </>
                ) : (
                  <>
                    <option value="">Select Advisor</option>
                    {advisors.map(e => {
                      const id = e.EmployeeID || e.EmployeeId || e.EmployeeId || e.id || e.UserID || e.UserId || e.id
                      const name = `${e.FirstName || e.firstName || ''} ${e.FatherName || e.fatherName || e.LastName || e.lastName || ''} ${e.GrandFatherName || ''}`.replace(/\s+/g, ' ').trim() || e.Name || e.name || e.fullName || e.FullName || id
                      return <option key={id} value={id}>{name}</option>
                    })}
                  </>
                )}
          </SelectField>
          <SelectField
            label="Farm"
            name="FarmID"
            value={formData.FarmID}
            onChange={handleFormChange}
            icon={<Building size={16} className="text-gray-400" />}
          >
            <option value="">Select Farm</option>
            {farms.map(f => {
              const id = f.FarmID || f.FarmId || f.id || f.farmId
              const label = `${f.FarmName || f.FarmName || f.Name || f.name || ''}${f.FarmType ? ' (' + f.FarmType + ')' : ''}`.trim()
              return <option key={id} value={id}>{label}</option>
            })}
          </SelectField>
          <InputField 
            label="Proposed Date & Time"
            name="ProposedDate"
            type="datetime-local"
            value={formData.ProposedDate}
            onChange={handleFormChange}
            icon={<Calendar size={16} className="text-gray-400" />}
          />
          <SelectField 
            label="Farm Type"
            name="FarmType" 
            value={formData.FarmType} 
            onChange={handleFormChange}
            icon={<Building size={16} className="text-gray-400" />}
          >
            <option value="">Select Farm Type</option>
            {farmTypesList && farmTypesList.length > 0 ? (
              farmTypesList.map((it, i) => {
                const val = it.LookupValue || it.Value || it.Name || it.name || it.LookupCode || it.code || String(i);
                const label = it.LookupValue || it.Value || it.Name || it.name || String(val);
                return <option key={String(val || i)} value={val}>{label}</option>
              })
            ) : (
              <>
                <option value="DAIRY">Dairy</option>
                <option value="LAYER">Layer</option>
              </>
            )}
          </SelectField>
          <SelectField
            label="Manager"
            name="ManagerID"
            value={formData.ManagerID}
            onChange={handleFormChange}
            icon={<User size={16} className="text-gray-400" />}
          >
            <option value="">Select Manager</option>
            {(managers && managers.length ? managers : employees).map(m => {
              const id = m.EmployeeID || m.EmployeeId || m.id || m.UserID || m.UserId || m.id
              const name = `${m.FirstName || m.firstName || ''} ${m.LastName || m.lastName || ''}`.trim() || m.Name || m.name || m.fullName || m.FullName || id
              return <option key={id} value={id}>{name}</option>
            })}
          </SelectField>
          <InputField
            label="Reference (Type ID)"
            name="FarmTypeReferenceID"
            value={formData.FarmTypeReferenceID}
            onChange={handleFormChange}
            placeholder="Optional reference id"
            icon={<Building size={16} className="text-gray-400" />}
          />
          <SelectField
            label="Visit Frequency"
            name="VisitFrequency"
            value={formData.VisitFrequency}
            onChange={handleFormChange}
            icon={<Clock4 size={16} className="text-gray-400" />}
          >
            <option value="">Select Frequency</option>
            {visitFrequencies && visitFrequencies.length > 0 ? (
              visitFrequencies.map((it, i) => {
                // Support multiple possible property names returned from lookup endpoint
                const val = it.LookupValue || it.Value || it.LookupCode || it.code || it.value || (it.Name || it.name);
                const label = it.LookupValue || it.Value || it.Name || it.name || String(val || '');
                return <option key={String(val || i)} value={val}>{label}</option>
              })
            ) : (
              // fallback defaults in case lookup not available
              <>
                <option value="Once">Once</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </>
            )}
          </SelectField>
          <InputField
            label="Next Follow-up Date"
            name="NextFollowUpDate"
            type="datetime-local"
            value={formData.NextFollowUpDate}
            onChange={handleFormChange}
            icon={<Calendar size={16} className="text-gray-400" />}
          />
          <TextAreaField
            label="Follow-up Note"
            name="FollowUpNote"
            value={formData.FollowUpNote}
            onChange={handleFormChange}
            placeholder="Notes for next follow-up"
            icon={<StickyNote size={16} className="text-gray-400" />}
          />
          <SelectField 
            label="Visit Purpose"
            name="VisitPurpose"
            value={formData.VisitPurpose}
            onChange={handleFormChange}
            icon={<Clipboard size={16} className="text-gray-400" />}
          >
            <option value="">Select Purpose</option>
            {visitTypes && visitTypes.length > 0 ? (
              visitTypes.map((it, i) => {
                const val = it.LookupValue || it.Value || it.LookupCode || it.code || it.value || (it.Name || it.name) || String(i);
                const label = it.LookupValue || it.Value || it.Name || it.name || String(val);
                return <option key={String(val || i)} value={val}>{label}</option>
              })
            ) : (
              <>
                <option value="Routine">Routine</option>
                <option value="Inspection">Inspection</option>
                <option value="Treatment">Treatment</option>
                <option value="Vaccination">Vaccination</option>
                <option value="Other">Other</option>
              </>
            )}
          </SelectField>
          <InputField 
            label="Estimated Duration (hours)"
            name="EstimatedDuration" 
            value={formData.EstimatedDuration} 
            onChange={handleFormChange} 
            placeholder="e.g., 2" 
            type="number"
            icon={<Clock4 size={16} className="text-gray-400" />}
          />
          <SelectField 
            label="Assign To"
            name="AssignTo" 
            value={formData.AssignTo} 
            onChange={handleFormChange}
            icon={<User size={16} className="text-gray-400" />}
          >
            <option value="">Assign To</option>
            {advisors.map(e => {
              const id = e.EmployeeID || e.EmployeeId || e.id || e.UserID || e.UserId || e.id
              const name = `${e.FirstName || e.firstName || ''} ${e.FatherName || e.fatherName || e.LastName || e.lastName || ''} ${e.GrandFatherName || ''}`.replace(/\s+/g,' ').trim() || e.Name || e.name || e.fullName || e.FullName || id
              return <option key={id} value={id}>{name}</option>
            })}
          </SelectField>
          <TextAreaField 
            label="Notes"
            name="Notes" 
            value={formData.Notes} 
            onChange={handleFormChange} 
            placeholder="Additional notes..." 
            icon={<StickyNote size={16} className="text-gray-400" />}
          />
          <div className="md:col-span-2 flex items-center">
            <CheckboxField 
                name="IsUrgent" 
                checked={formData.IsUrgent} 
                onChange={handleFormChange} 
                label="This is an urgent visit" 
            />
            <AlertTriangle size={16} className="text-yellow-500 ml-2" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <ActionButton onClick={() => closeModal('schedule')} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</ActionButton>
          <ActionButton
            onClick={isEditing ? (typeof onUpdate === 'function' ? onUpdate : onSave) : onSave}
            className={`${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            disabled={!isEditing && createLocked}
          >
            {isEditing ? 'Update Schedule' : (createLocked ? 'Creating...' : 'Save Schedule')}
          </ActionButton>
        </div>
      </Modal>

      <Modal open={isDeleteModalOpen} title="Confirm Deletion" onClose={() => closeModal('delete')}>
        <div className="flex items-center">
            <Trash2 size={24} className="text-red-500 mr-3" />
            <p>Are you sure you want to delete the schedule for <strong>{selectedSchedule?.FarmName}</strong>?</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <ActionButton onClick={() => closeModal('delete')} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</ActionButton>
          <ActionButton onClick={onDeleteConfirm} className="bg-red-600 hover:bg-red-700">Delete</ActionButton>
        </div>
      </Modal>

      <Modal open={isSubmitModalOpen} title="Submit for Approval" onClose={() => closeModal('submit')}>
        <SelectField 
            label="Select Manager for Approval"
            name="managerId" 
            value={approvalData.managerId} 
            onChange={(e) => setApprovalData(prev => ({ ...prev, managerId: e.target.value }))}
            icon={<User size={16} className="text-gray-400" />}
        >
          <option value="">Select Manager</option>
          {(managers && managers.length ? managers : employees).map(m => {
            const id = m.id || m.EmployeeID || m.EmployeeId || m.UserID || m.UserId || m.id
            const name = m.name || `${m.FirstName || m.firstName || ''} ${m.LastName || m.lastName || m.FatherName || ''}`.trim() || (m.raw && (m.raw.FirstName || m.raw.FirstName) ? `${m.raw.FirstName} ${m.raw.LastName || m.raw.FatherName || ''}`.trim() : id)
            return <option key={id} value={id}>{name}</option>
          })}
        </SelectField>
        <div className="mt-6 flex justify-end gap-3">
          <ActionButton onClick={() => closeModal('submit')} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</ActionButton>
          <ActionButton onClick={onSubmitApproval} className="bg-green-600 hover:bg-green-700 flex items-center gap-2"><Send size={16} /> Submit</ActionButton>
        </div>
      </Modal>

      <Modal open={isProcessModalOpen} title="Process Approval" onClose={() => closeModal('process')}>
        <div className="flex items-center gap-4 mb-4">
          <ActionButton onClick={() => setProcessData(prev => ({ ...prev, status: 'APPROVED' }))} className={processData.status === 'APPROVED' ? 'bg-green-600' : 'bg-gray-300 text-gray-800'}><CheckCircle size={16} className="mr-2"/>Approve</ActionButton>
          <ActionButton onClick={() => setProcessData(prev => ({ ...prev, status: 'REJECTED' }))} className={processData.status === 'REJECTED' ? 'bg-red-600' : 'bg-gray-300 text-gray-800'}><XCircle size={16} className="mr-2"/>Reject</ActionButton>
          <ActionButton onClick={() => setProcessData(prev => ({ ...prev, status: 'POSTPONED' }))} className={processData.status === 'POSTPONED' ? 'bg-purple-600' : 'bg-gray-300 text-gray-800'}><Clock size={16} className="mr-2"/>Postpone</ActionButton>
        </div>
        {processData.status === 'POSTPONED' && <InputField label="New Date" type="datetime-local" name="postponedDate" value={processData.postponedDate} onChange={(e) => setProcessData(prev => ({ ...prev, postponedDate: e.target.value }))} icon={<Calendar size={16} className="text-gray-400" />} />}
        <TextAreaField label="Reason" name="reason" value={processData.reason} onChange={(e) => setProcessData(prev => ({ ...prev, reason: e.target.value }))} placeholder="Reason for decision..." icon={<StickyNote size={16} className="text-gray-400" />} />
        <div className="mt-6 flex justify-end gap-3">
          <ActionButton onClick={() => closeModal('process')} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</ActionButton>
          <ActionButton onClick={onProcessApproval} className="bg-indigo-600 hover:bg-indigo-700">Confirm</ActionButton>
        </div>
      </Modal>

      <Modal open={isCompleteModalOpen} title="Complete Visit" onClose={() => closeModal('complete')}>
        <InputField label="Actual Visit Date & Time" type="datetime-local" name="actualDateTime" value={completeData.actualDateTime} onChange={(e) => setCompleteData(prev => ({ ...prev, actualDateTime: e.target.value }))} icon={<Calendar size={16} className="text-gray-400" />} />
        <div className="mt-4">
            <TextAreaField label="Follow-up Notes" name="followUpNotes" value={completeData.followUpNotes} onChange={(e) => setCompleteData(prev => ({ ...prev, followUpNotes: e.target.value }))} placeholder="Follow-up notes..." icon={<StickyNote size={16} className="text-gray-400" />} />
        </div>
        {/* Show validation hints when completion is not ready */}
        {!readyToComplete && (
          <div className="mt-3 text-sm text-yellow-700">
            <strong>Cannot complete visit:</strong>
            <ul className="list-disc ml-5 mt-1">
              {completeReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <ActionButton onClick={() => closeModal('complete')} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</ActionButton>
          <ActionButton onClick={onCompleteVisit} disabled={!readyToComplete} className={`bg-indigo-600 hover:bg-indigo-700 ${!readyToComplete ? 'opacity-50 cursor-not-allowed' : ''}`}>
            Complete Visit
          </ActionButton>
        </div>
      </Modal>

      <Modal open={isBulkUploadModalOpen} title="Bulk Upload Schedules" onClose={() => closeModal('bulkUpload')}>
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500">CSV file</p>
            </div>
            <input type="file" onChange={(e) => onBulkUpload(e.target.files[0])} accept=".csv" className="hidden" />
          </label>
        </div>
      </Modal>

        {isFillVisitModalOpen && (
          <FillVisitModal
          open={isFillVisitModalOpen}
          onClose={() => closeModal('fillVisit')}
          target={selectedSchedule}
          layerForm={fillVisitFormData?.layerForm ?? state.layerForm ?? {}}
          dairyForm={fillVisitFormData?.dairyForm ?? state.dairyForm ?? {}}
          onLayerFormChange={(eOrData) => {
            // support both DOM events (from simple inputs) and direct data objects (from child forms that send the whole form state)
            if (!eOrData) return;
            if (eOrData.target) {
              const { name, value, type, checked } = eOrData.target || {};
              const val = type === 'checkbox' ? checked : value;
              setFillVisitFormData(prev => ({ ...(prev || {}), layerForm: { ...(prev?.layerForm || {}), [name]: val } }));
            } else if (typeof eOrData === 'object') {
              // merge keys from supplied object into the layerForm
              setFillVisitFormData(prev => ({ ...(prev || {}), layerForm: { ...(prev?.layerForm || {}), ...eOrData } }));
            }
          }}
          onDairyFormChange={(eOrData) => {
            if (!eOrData) return;
            if (eOrData.target) {
              const { name, value, type, checked } = eOrData.target || {};
              const val = type === 'checkbox' ? checked : value;
              setFillVisitFormData(prev => ({ ...(prev || {}), dairyForm: { ...(prev?.dairyForm || {}), [name]: val } }));
            } else if (typeof eOrData === 'object') {
              setFillVisitFormData(prev => ({ ...(prev || {}), dairyForm: { ...(prev?.dairyForm || {}), ...eOrData } }));
            }
          }}
          onSaveLayer={() => {
            const payload = { ...(selectedSchedule || {}), FarmType: 'LAYER', ...(state.layerForm || fillVisitFormData?.layerForm || {}) };
            onFillVisitSave(payload);
          }}
          onSaveDairy={() => {
            const payload = { ...(selectedSchedule || {}), FarmType: 'DAIRY', ...(state.dairyForm || fillVisitFormData?.dairyForm || {}) };
            onFillVisitSave(payload);
          }}
          loading={state.fillLoading}
          error={state.fillError}
          readOnly={fillReadOnly}
        />
      )}

      {/* Debug logging moved to component-level useEffect to avoid repeated logs during render */}
    </>
  );
};

export default ScheduleModals;