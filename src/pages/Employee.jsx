import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';
import EmployeeForm, { SelectField } from './EmployeeForm';
import { FaUserPlus, FaFileCsv, FaDownload, FaSync, FaChartBar, FaEdit, FaTrash, FaUserCog, FaUndo, FaIdCard, FaVenusMars, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBuilding, FaUserTie, FaSearch, FaTimes, FaColumns } from 'react-icons/fa';
import ColumnSelector from '../components/ColumnSelector';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import { toCsv } from '../utils/csv';

const initialForm = {
    FirstName: '',
    FatherName: '',
    GrandFatherName: '',
    Gender: '',
    NationalID: '',
    MaritalStatus: '',
    PersonalEmail: '',
    WorkEmail: '',
    PersonalPhone: '',
    WorkPhone: '',
    Region: '',
    Zone: '',
    Woreda: '',
    Kebele: '',
    HouseNumber: '',
    PhotoURL: '',
    IsActive: true,
    ManagerID: '',
};

// validation helpers used by the DB constraints
const validators = {
    nationalId: v => !v || /^\d{10}$/.test(v),
    phone: v => !v || (/^(\+2519\d{7}|09\d{8})$/.test(v)),
    email: v => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    gender: v => !v || ['Male', 'Female', 'Other'].includes(v),
    marital: v => !v || ['Single', 'Married', 'Divorced', 'Widowed'].includes(v),
};

export default function Employee({ inDashboard = false }) {
    const HEADER_HEIGHT = 64;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, fetchWithAuth } = useAuth();
    const navigate = useNavigate();

    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [totalRows, setTotalRows] = useState(0);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [pendingSavePayload, setPendingSavePayload] = useState(null);
    const [pendingSaveIsEdit, setPendingSaveIsEdit] = useState(false);
    const [pendingSaveChanges, setPendingSaveChanges] = useState([]);
    const [showDelete, setShowDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [bulkFile, setBulkFile] = useState(null);
    const [previewNumber, setPreviewNumber] = useState(null);
    const [managerModalOpen, setManagerModalOpen] = useState(false);
    const [managerFor, setManagerFor] = useState(null);
    const [managerIdInput, setManagerIdInput] = useState('');
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [touchedFields, setTouchedFields] = useState({});
    const [isFormValid, setIsFormValid] = useState(false);
    const defaultEmployeeCols = ['idx','firstName','lastName','gender','phone','region','active','actions'];
    const [visibleCols, setVisibleCols] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                const raw = window.localStorage.getItem('employees.columns');
                if (raw) {
                    const parsed = JSON.parse(raw || '{}');
                    if (parsed && typeof parsed === 'object') {
                        const keys = defaultEmployeeCols.filter(id => !!parsed[id]);
                        if (keys.length) return new Set(keys);
                    }
                }
            }
        } catch (e) { /* ignore */ }
        return new Set(defaultEmployeeCols);
    });

    // refetch when pagination changes
    useEffect(() => {
        fetchList(pagination.pageIndex, searchQuery, pagination.pageSize);
    }, [pagination.pageIndex, pagination.pageSize]);

    const getErrorMessage = (err) => {
        try {
            const data = err?.response?.data || err?.data || null;
            if (!data) return err?.message || String(err);
            if (typeof data === 'string') return data;
            if (data.message) return data.message;
            if (data.error) return data.error;
            return JSON.stringify(data);
        } catch (e) { return err?.message || 'Unknown error' }
    };

    const fetchList = async (pageIndex = pagination.pageIndex, search = null, pageSize = pagination.pageSize) => {
        setLoading(true); setError(null);
        try {
            const pageNumber = (Number.isFinite(pageIndex) ? (pageIndex + 1) : 1);
            const size = pageSize || pagination.pageSize || 10
            let url = `/advisor?page=${pageNumber}&pageSize=${size}`
            if (search && String(search).trim() !== '') url += `&search=${encodeURIComponent(String(search))}`
            const res = await fetchWithAuth({ url, method: 'get' });
            const payload = res.data?.data || res.data;
            if (Array.isArray(payload)) {
                setList(payload);
                setTotalRows(payload.length || 0);
            } else if (payload && payload.items) {
                setList(payload.items);
                setTotalRows(payload.total || payload.totalCount || payload.count || payload.items.length || 0);
            } else if (payload && Array.isArray(payload.recordset)) {
                setList(payload.recordset);
                setTotalRows(payload.recordset.length || 0);
            } else if (payload && payload.recordsets) {
                // some backends return recordsets with items in first set and total in second
                const items = (payload.recordsets && payload.recordsets[0]) || payload.recordset || []
                setList(items);
                const maybeTotal = (payload.recordsets[1] && payload.recordsets[1][0] && (payload.recordsets[1][0].TotalCount || payload.recordsets[1][0].TotalEmployees)) || null
                setTotalRows(maybeTotal || items.length || 0);
            } else {
                setList([]);
                setTotalRows(0);
            }
        } catch (err) {
            const msg = getErrorMessage(err);
            setError(msg);
            if (err?.response?.status === 401) navigate('/login');
        } finally { setLoading(false) }
    };

    const openCreate = () => { setEditingId(null); setForm(initialForm); setFieldErrors({}); setShowForm(true) };

    const openEdit = async (id) => {
        setLoading(true); setError(null);
        try {
            // Ensure employees list is present so Manager select shows options
            if (!Array.isArray(list) || list.length === 0) await fetchList();
            const res = await fetchWithAuth({ url: `/advisor/${id}`, method: 'get' });
            const d = res.data?.data || res.data;
            if (d) {
                setForm({
                    FirstName: d.FirstName || '', FatherName: d.FatherName || '', GrandFatherName: d.GrandFatherName || '',
                    Gender: d.Gender || '', NationalID: d.NationalID || '', MaritalStatus: d.MaritalStatus || '',
                    PersonalEmail: d.PersonalEmail || '', WorkEmail: d.WorkEmail || '', PersonalPhone: d.PersonalPhone || '', WorkPhone: d.WorkPhone || '',
                    Region: d.Region || '', Zone: d.Zone || '', Woreda: d.Woreda || '', Kebele: d.Kebele || '', HouseNumber: d.HouseNumber || '',
                    PhotoURL: d.PhotoURL || '', IsActive: d.IsActive === undefined ? true : !!d.IsActive, ManagerID: d.ManagerID || ''
                });
                setEditingId(id);
                // compute validation state for loaded record
                const errs = validateForm({
                    FirstName: d.FirstName || '', FatherName: d.FatherName || '', GrandFatherName: d.GrandFatherName || '',
                    Gender: d.Gender || '', NationalID: d.NationalID || '', MaritalStatus: d.MaritalStatus || '',
                    PersonalEmail: d.PersonalEmail || '', WorkEmail: d.WorkEmail || '', PersonalPhone: d.PersonalPhone || '', WorkPhone: d.WorkPhone || '',
                });
                setFieldErrors(errs);
                setTouchedFields({});
                setIsFormValid(Object.keys(errs).length === 0);
                setShowForm(true);
            }
        } catch (err) { setError(getErrorMessage(err) || 'Failed to load') } finally { setLoading(false) }
    };

    const handleFieldChange = (e) => {
        const { name, value, type, checked } = e.target;
        const v = type === 'checkbox' ? checked : value;
        setForm(s => {
            const next = { ...s, [name]: v };
            const errs = validateForm(next);
            setFieldErrors(errs);
            setIsFormValid(Object.keys(errs).length === 0);
            return next;
        });
        setTouchedFields(t => ({ ...t, [name]: true }));
    };

    const validateForm = (f) => {
        const errs = {};
        if (!f.FirstName) errs.FirstName = 'First name is required';
        if (!f.FatherName) errs.FatherName = 'Father name is required';
        if (!f.Gender) errs.Gender = 'Gender is required';
        if (!validators.gender(f.Gender)) errs.Gender = 'Invalid gender';
        if (!validators.nationalId(f.NationalID)) errs.NationalID = 'National ID must be 10 digits or empty';
        if (!validators.phone(f.PersonalPhone)) errs.PersonalPhone = 'Phone must start with +2519... or 09...';
        if (!validators.email(f.PersonalEmail)) errs.PersonalEmail = 'Invalid email';
        if (!validators.email(f.WorkEmail)) errs.WorkEmail = 'Invalid work email';
        if (!validators.marital(f.MaritalStatus)) errs.MaritalStatus = 'Invalid marital status';
        return errs;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setFieldErrors({}); setError(null);
        const errs = validateForm(form);
        if (Object.keys(errs).length) { setFieldErrors(errs); return }

        const payload = { ...form, CreatedBy: user?.UserID || user?.id };
        const computeChanges = (oldObj = {}, newObj = {}) => {
            const changes = [];
            const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
            for (const k of keys) {
                try {
                    const oldVal = oldObj && oldObj[k] !== undefined && oldObj[k] !== null ? String(oldObj[k]) : '';
                    const newVal = newObj && newObj[k] !== undefined && newObj[k] !== null ? String(newObj[k]) : '';
                    if (oldVal !== newVal) changes.push({ key: k, label: k, oldValue: oldVal, newValue: newVal });
                } catch (e) { }
            }
            return changes;
        };

        if (editingId) {
            setPendingSavePayload({ ...payload, UpdatedBy: user?.UserID || user?.id });
            setPendingSaveIsEdit(true);
            // try to find the original object from list
            const orig = list.find(x => String(x.EmployeeID || x.EmployeeId || x.id) === String(editingId)) || {};
            setPendingSaveChanges(computeChanges(orig, payload));
        } else {
            setPendingSavePayload(payload);
            setPendingSaveIsEdit(false);
            setPendingSaveChanges(computeChanges({}, payload));
        }
        setShowSaveConfirm(true);
    };

    const doSaveConfirmed = async () => {
        if (!pendingSavePayload) return;
        setShowSaveConfirm(false);
        setLoading(true);
        try {
            if (pendingSaveIsEdit && editingId) {
                await fetchWithAuth({ url: `/advisor/${editingId}`, method: 'patch', data: pendingSavePayload });
            } else {
                await fetchWithAuth({ url: `/advisor`, method: 'post', data: pendingSavePayload });
            }
            setShowForm(false); fetchList();
        } catch (err) {
            setError(getErrorMessage(err) || 'Save failed');
            if (err?.response?.status === 401) navigate('/login');
        } finally { setLoading(false); setPendingSavePayload(null); setPendingSaveIsEdit(false); }
    };

    const confirmDelete = (it) => { setDeleteTarget(it); setShowDelete(true) };
    const doDelete = async () => {
        if (!deleteTarget) return;
        setLoading(true); setError(null);
        try {
            await fetchWithAuth({ url: `/advisor/${deleteTarget.EmployeeID}/delete`, method: 'post', data: { DeletedBy: user?.UserID || user?.id } });
            setShowDelete(false); setDeleteTarget(null); fetchList();
        } catch (err) { setError(getErrorMessage(err) || 'Delete failed') } finally { setLoading(false) }
    };

    const handleBulkFile = (e) => setBulkFile(e.target.files?.[0] || null);
    const uploadBulk = async () => {
        if (!bulkFile) return;
        setLoading(true); setError(null);
        try {
            const text = await bulkFile.text();
            const lines = text.split(/\r?\n/).filter(Boolean);
            const rows = lines.map((l, idx) => {
                if (idx === 0 && l.toLowerCase().includes('firstname')) return null;
                const cols = l.split(',').map(c => c.trim());
                return {
                    FirstName: cols[0] || null,
                    FatherName: cols[1] || null,
                    GrandFatherName: cols[2] || null,
                    Gender: cols[3] || null,
                    NationalID: cols[4] || null,
                    MaritalStatus: cols[5] || null,
                    PersonalEmail: cols[6] || null,
                    WorkEmail: cols[7] || null,
                    PersonalPhone: cols[8] || null,
                    WorkPhone: cols[9] || null,
                    Region: cols[10] || null,
                    Zone: cols[11] || null,
                    Woreda: cols[12] || null,
                    Kebele: cols[13] || null,
                    HouseNumber: cols[14] || null,
                    PhotoURL: cols[15] || null,
                    IsActive: cols[16] === undefined ? 1 : (cols[16] === '1' || cols[16] === 'true' ? 1 : 0),
                    ManagerID: cols[17] || null,
                };
            }).filter(Boolean);
            await fetchWithAuth({ url: `/advisor/bulk`, method: 'post', data: { EmployeeData: rows, CreatedBy: user?.UserID || user?.id } });
            setBulkFile(null); fetchList();
        } catch (err) { setError(getErrorMessage(err) || 'Bulk upload failed') } finally { setLoading(false) }
    };

    const downloadTemplate = () => {
        const headers = ['FirstName', 'FatherName', 'GrandFatherName', 'Gender', 'NationalID', 'MaritalStatus', 'PersonalEmail', 'WorkEmail', 'PersonalPhone', 'WorkPhone', 'Region', 'Zone', 'Woreda', 'Kebele', 'HouseNumber', 'PhotoURL', 'IsActive', 'ManagerID'];
        const example = ['John', 'Doe', 'Smith', 'Male', '1234567890', 'Single', 'john@example.com', 'john.work@example.com', '0912345678', '', 'RegionA', 'ZoneA', 'WoredaA', 'KebeleA', 'H-12', 'https://example.com/photo.jpg', '1', ''];
        const csv = [headers.join(','), example.join(',')].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'employees_import_template.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    const previewNext = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetchWithAuth({ url: `/advisor/preview-next-number`, method: 'get' });
            setPreviewNumber(res.data?.data?.EmployeeNumber || res.data);
        } catch (err) { setError(getErrorMessage(err) || 'Preview failed') } finally { setLoading(false) }
    };

    const openChangeManager = async (emp) => {
            // Ensure employee list is populated before showing manager selector
            try {
                if (!Array.isArray(list) || list.length === 0) {
                    await fetchList()
                }
            } catch (e) {
                // ignore fetch errors; still allow opening modal so user can try
                console.debug('openChangeManager: failed to prefetch employees', e)
            }
            setManagerFor(emp);
            setManagerIdInput(emp.ManagerID || emp.ManagerId || emp.EmployeeID || '');
            setManagerModalOpen(true);
    };
    const doChangeManager = async () => {
        if (!managerFor) return;
        setLoading(true); setError(null);
        try {
            await fetchWithAuth({ url: `/advisor/${managerFor.EmployeeID}/change-manager`, method: 'post', data: { NewManagerID: managerIdInput, UpdatedBy: user?.UserID || user?.id } });
            setManagerModalOpen(false); setManagerFor(null); fetchList();
        } catch (err) { setError(getErrorMessage(err) || 'Change manager failed') } finally { setLoading(false) }
    };

    const restoreEmployee = async (emp) => {
        setLoading(true); setError(null);
        try {
            await fetchWithAuth({ url: `/advisor/${emp.EmployeeID}/restore`, method: 'post', data: { RestoredBy: user?.UserID || user?.id } });
            fetchList();
        } catch (err) { setError(getErrorMessage(err) || 'Restore failed') } finally { setLoading(false) }
    };

    // Open error modal automatically when `error` is set
    useEffect(() => {
        if (error) setShowErrorModal(true);
    }, [error]);

    const generateReport = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetchWithAuth({ url: `/advisor/report`, method: 'get' });
            const rows = (res.data && res.data.data) ? res.data.data : (res.data || []);
            const csvText = toCsv(Array.isArray(rows) ? rows : []);
            const blob = new Blob([csvText], { type: 'text/csv' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'employees_report.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } catch (err) { setError(getErrorMessage(err) || 'Report failed') } finally { setLoading(false) }
    };

    const fetchStats = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetchWithAuth({ url: `/advisor/stats/overview`, method: 'get' });
            setStats(res.data?.data || res.data);
        } catch (err) { setError(getErrorMessage(err) || 'Stats failed') } finally { setLoading(false) }
    };

    const visibleCount = visibleCols.size || 1;

    return (
        <>
            {!inDashboard && (
                <div style={{ height: HEADER_HEIGHT }} className="fixed top-0 left-0 right-0 z-40">
                    <TopNav onToggleSidebar={() => setSidebarOpen(s => !s)} onToggleCollapse={() => {}} />
                </div>
            )}

            {!inDashboard && (
                <Sidebar
                    isOpen={sidebarOpen}
                    isCollapsed={false}
                    active={'employees'}
                    onChange={() => {}}
                    onClose={() => setSidebarOpen(false)}
                    width={280}
                    minWidth={82}
                />
            )}

            <main style={{ paddingTop: inDashboard ? 0 : HEADER_HEIGHT }} className="text-left flex-1 p-6 bg-gray-100 dark:bg-gray-900">
                <div className="text-left bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                    <div className="text-left flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-6 gap-3">
                        <h1 className="text-left text-2xl font-bold text-gray-800 dark:text-white flex items-center"><FaIdCard className="inline-block mr-3 text-indigo-600" />Manage Employees</h1>
                        <div className="text-left flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <button onClick={openCreate} className="text-left flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm">
                                <FaUserPlus className="mr-2" /> New Employee
                            </button>
                            <div className="relative w-full sm:w-auto">
                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleBulkFile} />
                                <button className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700 text-sm">
                                    <FaFileCsv className="mr-2" /> {bulkFile ? 'File Selected' : 'Bulk Upload'}
                                </button>
                            </div>
                            {bulkFile && (
                                <button onClick={uploadBulk} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 text-sm">
                                    Upload
                                </button>
                            )}
                            <button onClick={downloadTemplate} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">
                                <FaDownload className="mr-2" /> Template
                            </button>
                            <button onClick={generateReport} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">
                                <FaFileCsv className="mr-2" /> Export
                            </button>
                            <div />
                        </div>
                    </div>

                {/* show generic error modal instead of inline raw errors */}
                {/* Modal opens automatically when `error` is set (useEffect below) */}
                {error ? <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg">An error occurred. Please try again.</div> : null}
                <AlertModal open={showErrorModal} title="Error" message={"An unexpected error occurred. Please try again or contact support."} details={error} onClose={() => { setShowErrorModal(false); setError(null); }} />

                {/* Auto-open modal whenever an error is set */}
                <script>{/* placeholder to keep linter happy for the following useEffect */}</script>
                {previewNumber && <div className="mb-4 p-4 bg-blue-100 text-blue-700 border border-blue-400 rounded-lg">Next Employee Number: <strong>{previewNumber}</strong></div>}

                {/* Search + Refresh (matches Farms.jsx layout) */}
                <div className="mb-4 flex items-center space-x-2">
                    <div className="relative w-full md:w-1/3">
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setPagination(p => ({ ...p, pageIndex: 0 })); fetchList(0, searchQuery); } }}
                            placeholder="Search employees by name, id, phone..."
                            className="form-input w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        {searchQuery ? (
                            <button type="button" onClick={() => { setSearchQuery(''); setPagination(p => ({ ...p, pageIndex: 0 })); fetchList(0, null); }} title="Clear search" className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"><FaTimes /></button>
                        ) : null}
                        <button type="button" onClick={() => { setPagination(p => ({ ...p, pageIndex: 0 })); fetchList(0, searchQuery); }} title="Search" className="absolute right-0 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-r-md hover:bg-indigo-700"><FaSearch /></button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => { setSearchQuery(''); setPagination(p => ({ ...p, pageIndex: 0 })); setTimeout(()=>fetchList(0, null),0); }} className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" title="Refresh Data">
                            <FaSync className="mr-2" /> Refresh
                        </button>
                    </div>
                </div>

                

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 uppercase">
                            <tr>
                                {visibleCols.has('idx') && <th className="px-4 py-3">#</th>}
                                {visibleCols.has('firstName') && <th className="px-4 py-3">First Name</th>}
                                {visibleCols.has('lastName') && <th className="px-4 py-3">Last Name</th>}
                                {visibleCols.has('gender') && <th className="px-4 py-3">Gender</th>}
                                {visibleCols.has('phone') && <th className="px-4 py-3">Phone</th>}
                                {visibleCols.has('region') && <th className="px-4 py-3">Region</th>}
                                {visibleCols.has('active') && <th className="px-4 py-3">Active</th>}
                                {visibleCols.has('actions') && (
                                    <th className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-sm text-gray-700">Actions</span>
                                            <ColumnSelector
                                                columns={defaultEmployeeCols.map(c => ({ key: c, label: (c === 'idx' ? '#' : (c === 'firstName' ? 'First Name' : c === 'lastName' ? 'Last Name' : c === 'gender' ? 'Gender' : c === 'phone' ? 'Phone' : c === 'region' ? 'Region' : c === 'active' ? 'Active' : 'Actions')) }))}
                                                visibilityMap={Object.fromEntries(defaultEmployeeCols.map(id => [id, visibleCols.has(id)]))}
                                                onChange={(next) => setVisibleCols(new Set(Object.keys(next).filter(k => next[k])))}
                                                trigger={<FaColumns className="w-4 h-4 text-gray-600" />}
                                                localStorageKey="employees.columns"
                                            />
                                        </div>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={visibleCount} className="text-center p-4"><LoadingSpinner /></td></tr>
                            ) : list.length === 0 ? (
                                <tr><td colSpan={visibleCount} className="text-center p-4">No employees found.</td></tr>
                            ) : list.map((it, idx) => (
                                <tr key={it.EmployeeID || idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    {visibleCols.has('idx') && <td className="px-4 py-3">{idx + 1}</td>}
                                    {visibleCols.has('firstName') && <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{it.FirstName || ''}</td>}
                                    {visibleCols.has('lastName') && <td className="px-4 py-3">{it.LastName || it.GrandFatherName || it.FatherName || ''}</td>}
                                    {visibleCols.has('gender') && <td className="px-4 py-3">{it.Gender || ''}</td>}
                                    {visibleCols.has('phone') && <td className="px-4 py-3">{it.PersonalPhone || it.WorkPhone}</td>}
                                    {visibleCols.has('region') && <td className="px-4 py-3">{it.Region}</td>}
                                    {visibleCols.has('active') && <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${it.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {it.IsActive ? 'Yes' : 'No'}
                                        </span>
                                    </td>}
                                    {visibleCols.has('actions') && <td className="px-4 py-3 flex items-center justify-center space-x-2">
                                        <button onClick={() => openEdit(it.EmployeeID)} className="text-indigo-500 hover:text-indigo-700"><FaEdit /></button>
                                        <button onClick={() => openChangeManager(it)} className="text-sky-500 hover:text-sky-700"><FaUserCog /></button>
                                        {it.DeletedAt ? (
                                            <button onClick={() => restoreEmployee(it)} className="text-green-500 hover:text-green-700"><FaUndo /></button>
                                        ) : (
                                            <button onClick={() => confirmDelete(it)} className="text-red-500 hover:text-red-700"><FaTrash /></button>
                                        )}
                                    </td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Rows per page:</span>
                            <select value={pagination.pageSize} onChange={e => setPagination(p => ({ ...p, pageSize: Number(e.target.value), pageIndex: 0 }))} className="form-select rounded-md shadow-sm text-sm">
                                {[10,20,50,100].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="text-sm text-gray-600 sm:ml-4 block">
                            <span className="hidden sm:inline">Page {pagination.pageIndex + 1} of {Math.max(1, Math.ceil(totalRows / pagination.pageSize))} · Total employees: <strong className="ml-1">{Number(totalRows || 0).toLocaleString()}</strong></span>
                            <span className="sm:hidden">Page {pagination.pageIndex + 1} of {Math.max(1, Math.ceil(totalRows / pagination.pageSize))}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                        <button onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">First</button>
                        <button onClick={() => setPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))} disabled={pagination.pageIndex === 0} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Prev</button>
                        <button onClick={() => setPagination(p => ({ ...p, pageIndex: Math.min(p.pageIndex + 1, Math.max(0, Math.ceil(totalRows / p.pageSize) - 1)) }))} disabled={pagination.pageIndex >= Math.max(0, Math.ceil(totalRows / pagination.pageSize) - 1)} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Next</button>
                        <button onClick={() => setPagination(p => ({ ...p, pageIndex: Math.max(0, Math.ceil(totalRows / p.pageSize) - 1) }))} disabled={pagination.pageIndex >= Math.max(0, Math.ceil(totalRows / pagination.pageSize) - 1)} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Last</button>
                    </div>
                </div>
            </div>

            <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Employee' : 'Create New Employee'}>
                <EmployeeForm form={form} setForm={setForm} onFieldChange={handleFieldChange} fieldErrors={fieldErrors} touchedFields={touchedFields} isFormValid={isFormValid} loading={loading} list={list} onCancel={() => setShowForm(false)} onSubmit={handleSubmit} />
            </Modal>

            <Modal open={managerModalOpen} onClose={() => setManagerModalOpen(false)} title={managerFor ? `Change Manager for ${managerFor.FirstName}` : 'Change Manager'}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Select the new manager from the list. The selected value (EmployeeID) will be sent to the server.</p>
                    <SelectField icon={<FaUserTie />} label="New Manager" name="managerIdInput" value={managerIdInput} onChange={(e) => setManagerIdInput(e.target.value)}>
                        <option value="">-- None --</option>
                        {Array.isArray(list) && list.map(emp => {
                            const id = emp.EmployeeID || emp.EmployeeId || emp.id || '';
                            const last = emp.LastName || emp.GrandFatherName || emp.FatherName || '';
                            const display = `${emp.FirstName || ''} ${last}`.trim();
                            return <option key={id || display} value={id}>{display || emp.FirstName}</option>
                        })}
                    </SelectField>
                    <div className="flex justify-end gap-4 pt-4">
                        <button onClick={() => setManagerModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button onClick={doChangeManager} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" disabled={loading}>
                            {loading ? 'Changing...' : 'Change'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal open={showDelete} title="Confirm Deletion" onCancel={() => setShowDelete(false)} onConfirm={doDelete}>
                Are you sure you want to delete employee {deleteTarget?.FirstName} {deleteTarget?.FatherName}? This action cannot be undone.
            </ConfirmModal>
            {showSaveConfirm && (
                <ConfirmModal
                    open={showSaveConfirm}
                    title={pendingSaveIsEdit ? 'Confirm Update' : 'Confirm Create'}
                    message={pendingSaveIsEdit ? `Update employee "${form.FirstName || ''} ${form.FatherName || ''}"?` : `Create employee "${form.FirstName || ''} ${form.FatherName || ''}"?`}
                    onCancel={() => setShowSaveConfirm(false)}
                    onConfirm={doSaveConfirmed}
                    confirmLabel={pendingSaveIsEdit ? 'Update' : 'Create'}
                    cancelLabel="Cancel"
                    loading={loading}
                    changes={pendingSaveChanges}
                />
            )}
        </main>
        </>
    );
}