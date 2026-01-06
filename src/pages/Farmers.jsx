import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
} from '@tanstack/react-table';
import { FaPlus, FaFileCsv, FaDownload, FaSync, FaEdit, FaTrash, FaSearch, FaChevronUp, FaChevronDown, FaSort, FaFileExcel, FaFilePdf, FaEye, FaTrashAlt, FaTimes, FaUser, FaPhone, FaEnvelope, FaIdCard, FaMapMarkerAlt, FaTractor, FaMoneyBillWave, FaUserGraduate, FaLanguage, FaColumns } from 'react-icons/fa';
import ColumnSelector from '../components/ColumnSelector';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';
import FarmersForm from './FarmersForm';
import { toCsv } from '../utils/csv';
// Inlined DataTable component (moved from ../components/DataTable.jsx)

function DataTable({
    columns = [],
    data = [],
    totalRows = 0,
    fetchData,
    loading = false,
    onAdd,
    canCreate = false,
    canEdit,
    canDelete,
    onBulkDelete,
    onRefresh,
    externalGlobalFilter = '',
    onExternalGlobalFilterChange,
    externalFilters = {},
    onBulkUpload,
    onDownloadTemplate,
    storageKey = null,
}) {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);

    useEffect(() => {
        const sortParams = sorting[0] ? { SortColumn: sorting[0].id, SortDirection: sorting[0].desc ? 'DESC' : 'ASC' } : {};
        if (typeof fetchData === 'function') {
            fetchData({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize, SearchTerm: externalGlobalFilter, ...sortParams, ...externalFilters });
        }
    }, [pagination.pageIndex, pagination.pageSize, sorting, externalGlobalFilter, JSON.stringify(externalFilters), fetchData]);

    // Column selector state and visible columns
    const allColumnIds = useMemo(() => (columns || []).map(c => (c.id || c.accessorKey || '').toString()).filter(Boolean), [columns]);
    const [visibleCols, setVisibleCols] = useState(() => {
        try {
            if (storageKey && typeof window !== 'undefined') {
                const raw = window.localStorage.getItem(storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw || '{}');
                    if (parsed && typeof parsed === 'object') {
                        const keys = allColumnIds.filter(id => !!parsed[id]);
                        if (keys.length) return new Set(keys);
                    }
                }
            }
        } catch (e) { /* ignore */ }
        return new Set(allColumnIds);
    });
    useEffect(() => { if (!storageKey) setVisibleCols(new Set(allColumnIds)); }, [allColumnIds]);
    const toggleColumn = (colId) => setVisibleCols(prev => {
        const next = new Set(prev ? Array.from(prev) : []);
        if (next.has(colId)) next.delete(colId); else next.add(colId);
        return next;
    });

    const displayedColumns = useMemo(() => {
        if (!columns) return [];
        return (columns || []).filter(c => {
            const id = (c.id || c.accessorKey || '').toString();
            return !id || visibleCols.has(id);
        });
    }, [columns, visibleCols]);

    const table = useReactTable({
        data: data || [],
        columns: displayedColumns || [],
        pageCount: Math.ceil((totalRows || 0) / (pagination.pageSize || 10)),
        state: {
            pagination,
            sorting,
        },
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const displayedTotalRows = typeof totalRows !== 'undefined' && totalRows !== null ? totalRows : (Array.isArray(data) ? data.length : 0);
    const headerCellCount = ((table.getHeaderGroups && table.getHeaderGroups()[0] && table.getHeaderGroups()[0].headers && table.getHeaderGroups()[0].headers.length) || displayedColumns.length) + 1;

    return (
        <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-4">
                    <div />
                    <div />
                </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 uppercase">
                        {table.getHeaderGroups().map((hg, hgIndex) => (
                            <tr key={hg.id}>
                                {hg.headers.map(h => (
                                    <th key={h.id} className="px-4 py-3">
                                        <div onClick={h.column.getToggleSortingHandler()} className={h.column.getCanSort() ? 'cursor-pointer select-none' : ''}>
                                            {flexRender(h.column.columnDef.header, h.getContext())}
                                        </div>
                                    </th>
                                ))}
                                {hgIndex === 0 && (
                                    <th className="px-4 py-3 text-right">
                                        <ColumnSelector
                                            columns={allColumnIds.map(id => ({ key: id, label: id }))}
                                            visibilityMap={Object.fromEntries(allColumnIds.map(id => [id, visibleCols.has(id)]))}
                                            onChange={(next) => setVisibleCols(new Set(Object.keys(next).filter(k => next[k])))}
                                            trigger={<FaColumns className="w-4 h-4 text-gray-600 inline-block" />}
                                            localStorageKey={storageKey || 'farmers.columns'}
                                        />
                                    </th>
                                )}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={headerCellCount} className="text-center p-4"><LoadingSpinner /></td></tr>
                        ) : (table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-4 py-3 align-top text-sm text-gray-700 dark:text-gray-300">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={headerCellCount} className="text-center p-6 text-gray-500">No records found.</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-sm text-gray-600">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Showing page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
                        <span className="hidden sm:inline">· Rows: {displayedTotalRows}</span>
                    </div>
                    <div className="text-sm text-gray-600 sm:ml-4 block">
                        <span className="sm:hidden">Rows: {displayedTotalRows}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end w-full sm:w-auto">
                    <select value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))} className="form-select px-2 py-2 border rounded text-sm w-full sm:w-auto">
                        {[10,20,50,100].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => table.setPageIndex(0)} disabled={table.getState().pagination.pageIndex === 0} className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">First</button>
                    <button onClick={() => table.setPageIndex(Math.max(0, table.getState().pagination.pageIndex - 1))} disabled={table.getState().pagination.pageIndex === 0} className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Prev</button>
                    <button onClick={() => table.setPageIndex(Math.min(table.getState().pagination.pageIndex + 1, Math.max(0, table.getPageCount() - 1)))} disabled={table.getState().pagination.pageIndex >= Math.max(0, table.getPageCount() - 1)} className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Next</button>
                    <button onClick={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))} disabled={table.getState().pagination.pageIndex >= Math.max(0, table.getPageCount() - 1)} className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Last</button>
                </div>
            </div>
            </div>
    );
}

// --- Helper Components ---

const Skeleton = () => <div className="h-4 bg-gray-200 rounded animate-pulse"></div>;

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay ?? 300);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
};

// Column factory for react-table
const getColumns = (onEdit, onDelete, onView, canEdit, canDelete, advisorMap = {}) => {
    return [
        {
            id: 'rowNumber',
            header: '#',
            cell: info => {
                try {
                    const state = info.table.getState();
                    const pageIndex = (state.pagination && state.pagination.pageIndex) ? state.pagination.pageIndex : 0;
                    const pageSize = (state.pagination && state.pagination.pageSize) ? state.pagination.pageSize : 10;
                    const seq = pageIndex * pageSize + info.row.index + 1;
                    return <div className="font-medium text-sm">{seq}</div>;
                } catch (e) {
                    return <div className="font-medium text-sm">{info.row.index + 1}</div>;
                }
            }
        },
        {
            accessorKey: 'FirstName',
            id: 'name',
            header: 'Name',
            cell: info => {
                const r = info.row.original || {};
                const full = [r.FirstName, r.LastName].filter(Boolean).join(' ');
                return <div className="font-medium text-sm">{full || '—'}</div>;
            }
        },
        { accessorKey: 'PhoneNumber', id: 'phone', header: 'Phone', cell: info => info.getValue() || '—' },
        { accessorKey: 'Region', id: 'region', header: 'Region', cell: info => info.getValue() || '—' },
        { accessorKey: 'PrimaryLanguage', id: 'primaryLanguage', header: 'Primary Language', cell: info => info.getValue() || '—' },
        { accessorKey: 'EducationLevel', id: 'educationLevel', header: 'Education Level', cell: info => info.getValue() || '—' },
        {
            id: 'createdBy',
            header: 'Created By',
            cell: info => {
                const id = info.row.original?.CreatedBy || info.row.original?.createdBy || info.row.original?.CreatedByID || info.row.original?.CreatedById;
                return <span>{(id && advisorMap[String(id)]) || id || '—'}</span>;
            }
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => onView && onView(row.original?.FarmerID)} title="View" className="text-gray-600 hover:text-gray-800"><FaEye /></button>
                    {canEdit && <button onClick={() => onEdit(row.original?.FarmerID)} title="Edit" className="text-indigo-600 hover:text-indigo-800"><FaEdit /></button>}
                    {canDelete && <button onClick={() => onDelete(row.original)} title="Delete" className="text-red-600 hover:text-red-800"><FaTrash /></button>}
                </div>
            )
        }
    ];
};


// --- Main Farmers Page Component ---

export default function Farmers({ inDashboard = false }) {
    const HEADER_HEIGHT = 64;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, fetchWithAuth, hasFormPermission } = useAuth();
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Search and advanced filters (mirror Farms.jsx behavior)
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterRegion, setFilterRegion] = useState('');
    const [filterZone, setFilterZone] = useState('');
    const [filterWoreda, setFilterWoreda] = useState('');
    const [filterKebele, setFilterKebele] = useState('');
    const [filterVillage, setFilterVillage] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterIsActive, setFilterIsActive] = useState('All');
    const [filterIncludeDeleted, setFilterIncludeDeleted] = useState(false);
    const [filterCreatedFrom, setFilterCreatedFrom] = useState('');
    const [filterCreatedTo, setFilterCreatedTo] = useState('');
    const [filterCreatedByName, setFilterCreatedByName] = useState('');
    const [filterPrimaryLanguage, setFilterPrimaryLanguage] = useState('');
    const [filterEducationLevel, setFilterEducationLevel] = useState('');

    const [primaryLanguageOptions, setPrimaryLanguageOptions] = useState([])
    const [educationOptions, setEducationOptions] = useState([])

    const [isFormOpen, setFormOpen] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState(null);
    const [isFormReadOnly, setFormReadOnly] = useState(false);
    const [form, setForm] = useState({
        UserID: '', FirstName: '', LastName: '', FatherName: '', Gender: '', PhoneNumber: '', AlternatePhoneNumber: '', GeoLocation: '', Email: '', NationalID: '', ProfilePicture: '', Region: '', Zone: '', Woreda: '', Kebele: '', Village: '', HouseNumber: '', FarmingExperience: '', PrimaryLanguage: '', EducationLevel: '', MaritalStatus: '', FamilySize: '', Dependents: '', HouseholdIncome: '', PreferredContactMethod: '', CommunicationLanguage: ''
    });
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [showFarmerSaveConfirm, setShowFarmerSaveConfirm] = useState(false);
    const [pendingFarmerPayload, setPendingFarmerPayload] = useState(null);
    const [pendingFarmerIsEdit, setPendingFarmerIsEdit] = useState(false);
    const [pendingFarmerChanges, setPendingFarmerChanges] = useState([]);
    const [fieldErrors, setFieldErrors] = useState({});

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // simple immediate validation clear for the touched field
        setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    };
    
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Bulk upload UI state (header)
    const bulkInputRef = useRef(null);
    const [selectedBulkFile, setSelectedBulkFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null); // { status: 'success'|'error', message: '' }
    const [advisorMap, setAdvisorMap] = useState({});

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const pageIndex = (typeof params.pageIndex === 'number') ? params.pageIndex : (typeof params.PageNumber === 'number' ? Math.max(0, params.PageNumber - 1) : 0);
            const pageSize = params.pageSize || params.PageSize || 10;

            const qs = new URLSearchParams();
            qs.append('PageNumber', String(pageIndex + 1));
            qs.append('PageSize', String(pageSize));

            const appendIf = (key, val) => { if (val !== undefined && val !== null && String(val).trim() !== '') qs.append(key, String(val)); };

            appendIf('SearchTerm', params.SearchTerm ?? params.search ?? searchQuery ?? null);
            appendIf('Region', params.Region ?? params.region ?? filterRegion ?? null);
            appendIf('Zone', params.Zone ?? params.zone ?? filterZone ?? null);
            appendIf('Woreda', params.Woreda ?? params.woreda ?? filterWoreda ?? null);
            appendIf('Kebele', params.Kebele ?? params.kebele ?? filterKebele ?? null);
            appendIf('Village', params.Village ?? params.village ?? filterVillage ?? null);
            appendIf('Gender', params.Gender ?? params.gender ?? filterGender ?? null);
            if (typeof (params.IsActive ?? (filterIsActive === 'All' ? null : (filterIsActive === 'Active' ? 1 : 0))) !== 'undefined' && params.IsActive !== null) {
                const iv = params.IsActive ?? (filterIsActive === 'All' ? null : (filterIsActive === 'Active' ? 1 : 0));
                if (iv !== null) qs.append('IsActive', String(iv));
            }
            if (params.IncludeDeleted ?? filterIncludeDeleted) qs.append('IncludeDeleted', '1');

            // Date filters
            appendIf('CreatedDateFrom', params.CreatedDateFrom ?? params.createdDateFrom ?? filterCreatedFrom ?? null);
            appendIf('CreatedDateTo', params.CreatedDateTo ?? params.createdDateTo ?? filterCreatedTo ?? null);

            const endpoint = (qs.toString() && qs.toString().length > 0) ? `/farmers?${qs.toString()}` : '/farmers';
            const res = await fetchWithAuth({ url: endpoint, method: 'get' });
            const payload = res?.data?.data || res?.data || res;

            // normalize into array + total
            let items = null; let total = 0;
            if (!payload) {
                items = [];
                total = 0;
            } else if (Array.isArray(payload)) {
                items = payload;
                total = payload.length;
            } else if (payload.items && Array.isArray(payload.items)) {
                items = payload.items;
                total = payload.total || payload.totalCount || items.length;
            } else if (Array.isArray(payload.recordset)) {
                items = payload.recordset;
                total = payload.recordset.length || (payload.total || payload.totalCount || 0);
            } else if (payload.data && Array.isArray(payload.data)) {
                items = payload.data;
                total = payload.total || payload.totalCount || items.length;
            } else if (payload && payload.FarmerID) {
                items = [payload];
                total = 1;
            } else {
                // try to pick first array-valued prop
                const arr = Object.keys(payload).find(k => Array.isArray(payload[k]));
                items = arr ? payload[arr] : [];
                total = items.length || 0;
            }

            setData(items || []);
            setTotalRows(Number(total) || 0);
        } catch (err) {
            console.debug('fetchData(farmers) failed', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to load farmers');
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth, searchQuery, filterRegion, filterZone, filterWoreda, filterKebele, filterVillage, filterGender, filterIsActive, filterIncludeDeleted, filterCreatedFrom, filterCreatedTo]);

    const exportFarmers = async () => {
        setLoading(true); setError(null);
        try {
            // Try server-side CSV/report endpoint first
            try {
                const res = await fetchWithAuth({ url: `/farmers/report`, method: 'get' });
                const rows = res?.data?.data || res?.data || null;
                if (rows && Array.isArray(rows) && rows.length > 0) {
                    const csvText = toCsv(rows);
                    const blob = new Blob([csvText], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'farmers_report.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                    return;
                }
            } catch (e) {
                // ignore and fallback to client-side export
            }

            // Fallback: export current page data
            const rows = Array.isArray(data) ? data : [];
            if (rows.length === 0) {
                setError('No data to export');
                return;
            }
            const csvText = toCsv(rows);
            const blob = new Blob([csvText], { type: 'text/csv' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'farmers_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } catch (err) {
            setError(err?.message || 'Export failed');
        } finally { setLoading(false) }
    };

    // Fetch lookup options for filters
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res1 = await fetchWithAuth({ url: `http://localhost:80/api/lookups/by-type-name/${encodeURIComponent('Primary Language')}`, method: 'get' })
                const payload1 = res1?.data?.data || res1?.data || res1
                let rows1 = []
                if (Array.isArray(payload1)) rows1 = payload1
                else if (Array.isArray(payload1.items)) rows1 = payload1.items
                else if (Array.isArray(payload1.recordset)) rows1 = payload1.recordset
                else if (Array.isArray(payload1.data)) rows1 = payload1.data
                const opts1 = (rows1 || []).map(r => {
                    const value = r?.LookupValue ?? r?.Value ?? r?.value ?? null
                    const label = r?.LookupLabel ?? r?.Label ?? value ?? ''
                    return value ? { value: String(value), label: String(label) } : null
                }).filter(Boolean)
                if (!cancelled) setPrimaryLanguageOptions(opts1)

                const res2 = await fetchWithAuth({ url: `http://localhost:80/api/lookups/by-type-name/${encodeURIComponent('Education Level')}`, method: 'get' })
                const payload2 = res2?.data?.data || res2?.data || res2
                let rows2 = []
                if (Array.isArray(payload2)) rows2 = payload2
                else if (Array.isArray(payload2.items)) rows2 = payload2.items
                else if (Array.isArray(payload2.recordset)) rows2 = payload2.recordset
                else if (Array.isArray(payload2.data)) rows2 = payload2.data
                const opts2 = (rows2 || []).map(r => {
                    const value = r?.LookupValue ?? r?.Value ?? r?.value ?? null
                    const label = r?.LookupLabel ?? r?.Label ?? value ?? ''
                    return value ? { value: String(value), label: String(label) } : null
                }).filter(Boolean)
                if (!cancelled) setEducationOptions(opts2)
            } catch (e) {
                if (!cancelled) { setPrimaryLanguageOptions([]); setEducationOptions([]) }
            }
        })()
        return () => { cancelled = true }
    }, [fetchWithAuth])

    const handleAdd = () => {
        setEditingFarmer(null);
        setForm({ UserID: '', FirstName: '', LastName: '', FatherName: '', Gender: '', PhoneNumber: '', AlternatePhoneNumber: '', GeoLocation: '', Email: '', NationalID: '', ProfilePicture: '', Region: '', Zone: '', Woreda: '', Kebele: '', Village: '', HouseNumber: '', FarmingExperience: '', PrimaryLanguage: '', EducationLevel: '', MaritalStatus: '', FamilySize: '', Dependents: '', HouseholdIncome: '', PreferredContactMethod: '', CommunicationLanguage: '' });
        setFormReadOnly(false);
        setFormOpen(true);
    };

    const handleEdit = (farmerId) => {
        const farmer = data.find(f => f.FarmerID === farmerId);
        setEditingFarmer(farmer);
        if (farmer) {
            setForm({
                UserID: farmer.UserID || '', FirstName: farmer.FirstName || '', LastName: farmer.LastName || '', FatherName: farmer.FatherName || '', Gender: farmer.Gender || '', PhoneNumber: farmer.PhoneNumber || '', AlternatePhoneNumber: farmer.AlternatePhoneNumber || '', GeoLocation: farmer.GeoLocation || '', Email: farmer.Email || '', NationalID: farmer.NationalID || '', ProfilePicture: farmer.ProfilePicture || '', Region: farmer.Region || '', Zone: farmer.Zone || '', Woreda: farmer.Woreda || '', Kebele: farmer.Kebele || '', Village: farmer.Village || '', HouseNumber: farmer.HouseNumber || '', FarmingExperience: farmer.FarmingExperience || '', PrimaryLanguage: farmer.PrimaryLanguage || '', EducationLevel: farmer.EducationLevel || '', MaritalStatus: farmer.MaritalStatus || '', FamilySize: farmer.FamilySize || '', Dependents: farmer.Dependents || '', HouseholdIncome: farmer.HouseholdIncome || '', PreferredContactMethod: farmer.PreferredContactMethod || '', CommunicationLanguage: farmer.CommunicationLanguage || ''
            });
        }
        setFormReadOnly(false);
        setFormOpen(true);
    };

    const handleView = (farmerId) => {
        const farmer = data.find(f => f.FarmerID === farmerId);
        setEditingFarmer(farmer);
        if (farmer) {
            setForm({
                UserID: farmer.UserID || '', FirstName: farmer.FirstName || '', LastName: farmer.LastName || '', FatherName: farmer.FatherName || '', Gender: farmer.Gender || '', PhoneNumber: farmer.PhoneNumber || '', AlternatePhoneNumber: farmer.AlternatePhoneNumber || '', GeoLocation: farmer.GeoLocation || '', Email: farmer.Email || '', NationalID: farmer.NationalID || '', ProfilePicture: farmer.ProfilePicture || '', Region: farmer.Region || '', Zone: farmer.Zone || '', Woreda: farmer.Woreda || '', Kebele: farmer.Kebele || '', Village: farmer.Village || '', HouseNumber: farmer.HouseNumber || '', FarmingExperience: farmer.FarmingExperience || '', PrimaryLanguage: farmer.PrimaryLanguage || '', EducationLevel: farmer.EducationLevel || '', MaritalStatus: farmer.MaritalStatus || '', FamilySize: farmer.FamilySize || '', Dependents: farmer.Dependents || '', HouseholdIncome: farmer.HouseholdIncome || '', PreferredContactMethod: farmer.PreferredContactMethod || '', CommunicationLanguage: farmer.CommunicationLanguage || ''
            });
        }
        setFormReadOnly(true);
        setFormOpen(true);
    };

    const handleDelete = (farmer) => {
        setDeleteTarget(farmer);
        setDeleteConfirmOpen(true);
    };

    const handleBulkDelete = (ids) => {
        // Placeholder for bulk delete logic
        console.log("Bulk delete IDs:", ids);
        alert(`Bulk delete action for ${ids.length} farmers.`);
    };

    // Accept optional payload (from FarmerModal) else use local `form` state
    const mapServerErrors = (resp) => {
        const errs = {};
        if (!resp) return errs;
        if (resp.errors && typeof resp.errors === 'object') Object.assign(errs, resp.errors);
        if (Array.isArray(resp.validationErrors)) {
            resp.validationErrors.forEach(v => { if (v && v.field) errs[v.field] = v.message || v.msg || String(v); });
        }
        if (resp.data && typeof resp.data === 'object' && resp.data.errors) Object.assign(errs, resp.data.errors);
        return errs;
    }

    const handleFormSubmit = async (payloadFromModal) => {
        // Prepare payload and show confirm modal instead of sending directly
        setFieldErrors({});
        setError(null);
        const payload = payloadFromModal ? { ...payloadFromModal } : { ...form };
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

        if (editingFarmer && editingFarmer.FarmerID) {
            setPendingFarmerPayload({ ...payload, UpdatedBy: user?.UserID || user?.id });
            setPendingFarmerIsEdit(true);
            setPendingFarmerChanges(computeChanges(editingFarmer || {}, payload));
        } else {
            setPendingFarmerPayload({ ...payload, CreatedBy: user?.UserID || user?.id });
            setPendingFarmerIsEdit(false);
            setPendingFarmerChanges(computeChanges({}, payload));
        }
        setShowFarmerSaveConfirm(true);
    }

    const doFarmerSaveConfirmed = async () => {
        if (!pendingFarmerPayload) return;
        setShowFarmerSaveConfirm(false);
        setFormSubmitting(true);
        setFieldErrors({});
        setError(null);
        try {
            if (pendingFarmerIsEdit && editingFarmer && editingFarmer.FarmerID) {
                const res = await fetchWithAuth({ url: `/farmers/${editingFarmer.FarmerID}`, method: 'put', data: pendingFarmerPayload });
                if (res && (res.success === false || res.success === 'false')) {
                    const errs = mapServerErrors(res);
                    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
                    setError(res.message || 'Save failed'); return;
                }
            } else {
                const res = await fetchWithAuth({ url: `/farmers`, method: 'post', data: pendingFarmerPayload });
                if (res && (res.success === false || res.success === 'false')) {
                    const errs = mapServerErrors(res);
                    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
                    setError(res.message || 'Save failed'); return;
                }
                const newId = res?.data?.data?.FarmerID || res?.data?.FarmerID || res?.FarmerID || null;
                if (newId) {
                    try {
                        const r2 = await fetchWithAuth({ url: `/farmers/${newId}`, method: 'get' });
                        const created = r2?.data?.data || r2?.data;
                        if (created) setData(prev => [created, ...prev]);
                    } catch (e) { /* ignore */ }
                }
            }
            setFormOpen(false);
            fetchData({ pageIndex: 0, pageSize: 10 });
        } catch (err) {
            console.error('Save error', err);
            const resp = err?.response?.data || err?.data || null;
            if (resp) {
                const errs = mapServerErrors(resp);
                if (Object.keys(errs).length) { setFieldErrors(errs); return; }
                setError(resp.message || resp.error || JSON.stringify(resp));
            } else {
                setError(err.message || 'Save failed');
            }
        } finally {
            setFormSubmitting(false);
            setPendingFarmerPayload(null);
            setPendingFarmerIsEdit(false);
            setPendingFarmerChanges([]);
        }
    }

    // Compute form-level permission flags. Try common form key 'farmers'.
    const isAdmin = user && (user.roles || []).includes('ROLE_ADMIN');
    const isSuperAdmin = user && (user.roles || []).includes('ROLE_SUPER_ADMIN');
    const isAdvisor = user && (user.roles || []).includes('ROLE_ADVISOR');

    const canCreate = (hasFormPermission && hasFormPermission('farmers', 'CanCreate')) || isAdmin || isSuperAdmin || isAdvisor;
    const canEdit = (hasFormPermission && hasFormPermission('farmers', 'CanEdit')) || isAdmin || isSuperAdmin || isAdvisor;
    const canDelete = (hasFormPermission && hasFormPermission('farmers', 'CanDelete')) || isAdmin || isSuperAdmin || isAdvisor;

    const columns = useMemo(() => getColumns(handleEdit, handleDelete, handleView, canEdit, canDelete, advisorMap), [data, canEdit, canDelete, advisorMap, handleView]);

    // Resolve CreatedBy -> advisor display names for rows shown in the table
    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return;
        const ids = new Set();
        data.forEach(d => {
            const id = d?.CreatedBy || d?.createdBy || d?.CreatedByID || d?.CreatedById || null;
            if (id) ids.add(String(id));
        });
        const missing = [...ids].filter(id => !advisorMap[id]);
        if (missing.length === 0) return;

        const fetchAll = async () => {
            try {
                await Promise.all(missing.map(async (id) => {
                    try {
                        const res = await fetchWithAuth({ url: `/users/advisor-by-createdby/${encodeURIComponent(id)}`, method: 'get' });
                        const rows = res?.data?.data || res?.data || [];
                        const row = Array.isArray(rows) ? rows[0] : rows;
                        const first = row?.AdvisorFirstName || row?.FirstName || row?.AdvisorName || '';
                        const father = row?.AdvisorFatherName || row?.FatherName || '';
                        const name = [first, father].filter(Boolean).join(' ') || id;
                        setAdvisorMap(prev => ({ ...(prev || {}), [id]: name }));
                    } catch (err) {
                        setAdvisorMap(prev => ({ ...(prev || {}), [id]: id }));
                    }
                }));
            } catch (e) {
                // ignore
            }
        };
        fetchAll();
    }, [data, fetchWithAuth, advisorMap]);

    // Bulk upload handlers
    const downloadTemplate = () => {
        const headers = ['FirstName','LastName','FatherName','Gender','PhoneNumber','AlternatePhoneNumber','Email','NationalID','Region','Zone','Woreda','Kebele','Village','HouseNumber','FarmingExperience','PrimaryLanguage','EducationLevel','MaritalStatus','FamilySize','Dependents','HouseholdIncome','PreferredContactMethod','CommunicationLanguage'];
        const example = ['John','Doe','Abebe','Male','0912345678','','john@example.com','123456789','RegionA','ZoneA','WoredaA','KebeleA','VillageA','12','5','BSc','Married','5','2','1000','Phone','Amharic'];
        const csv = [headers.join(','), example.join(',')].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'farmers_import_template.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    const uploadSelectedFile = async () => {
        if (!selectedBulkFile) return;
        setUploading(true);
        try {
            const text = await selectedBulkFile.text();
            const lines = text.split(/\r?\n/).filter(Boolean);
            const rows = lines.map((l, idx) => {
                if (idx === 0 && l.toLowerCase().includes('firstname')) return null;
                const cols = l.split(',').map(c => c.trim());
                return {
                    FirstName: cols[0] || null,
                    LastName: cols[1] || null,
                    FatherName: cols[2] || null,
                    Gender: cols[3] || null,
                    PhoneNumber: cols[4] || null,
                    AlternatePhoneNumber: cols[5] || null,
                    Email: cols[6] || null,
                    NationalID: cols[7] || null,
                    Region: cols[8] || null,
                    Zone: cols[9] || null,
                    Woreda: cols[10] || null,
                    Kebele: cols[11] || null,
                    Village: cols[12] || null,
                    HouseNumber: cols[13] || null,
                    FarmingExperience: cols[14] ? Number(cols[14]) : null,
                    PrimaryLanguage: cols[15] || null,
                    EducationLevel: cols[16] || null,
                    MaritalStatus: cols[17] || null,
                    FamilySize: cols[18] ? Number(cols[18]) : null,
                    Dependents: cols[19] ? Number(cols[19]) : null,
                    HouseholdIncome: cols[20] ? Number(cols[20]) : null,
                    PreferredContactMethod: cols[21] || null,
                    CommunicationLanguage: cols[22] || null,
                };
            }).filter(Boolean);

            if (rows.length === 0) {
                setUploadResult({ status: 'error', message: 'No valid rows found in file.' });
                return;
            }

            await fetchWithAuth({ url: '/farmers/bulk', method: 'post', data: { farmers: rows, CreatedBy: user?.UserID || user?.id } });
            setUploadResult({ status: 'success', message: `Uploaded ${rows.length} farmers successfully.` });
            setSelectedBulkFile(null);
            // refresh list
            fetchData({ pageIndex: 0, pageSize: 10 });
        } catch (err) {
            console.error('Bulk upload failed', err);
            const msg = err?.message || (err?.response?.data && JSON.stringify(err.response.data)) || 'Bulk upload failed';
            setUploadResult({ status: 'error', message: msg });
        } finally {
            setUploading(false);
        }
    };

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
                    active={'farmers'}
                    onChange={() => {}}
                    onClose={() => setSidebarOpen(false)}
                    width={280}
                    minWidth={82}
                />
            )}

            <div style={{ paddingTop: inDashboard ? 0 : HEADER_HEIGHT }} className="p-4 md:p-8 bg-gray-100 min-h-screen">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-6 gap-3">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center"><FaTractor className="inline-block mr-3 text-indigo-600" />Farmers</h1>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button onClick={() => setShowFilters(s => !s)} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm flex items-center gap-2 w-full sm:w-auto justify-center">
                            <FaSearch />
                            <span>Filters</span>
                        </button>
                        <button onClick={handleAdd} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm">
                            <FaPlus className="mr-2" /> New Farmer
                        </button>
                        <input ref={bulkInputRef} type="file" accept=",.csv,text/csv" className="hidden" onChange={e => setSelectedBulkFile(e.target.files?.[0] || null)} />
                        <button onClick={() => bulkInputRef.current?.click()} className="px-3 py-2 text-sm font-medium bg-teal-600 text-white rounded-md shadow-md hover:bg-teal-700 flex items-center space-x-2 w-full sm:w-auto justify-center">
                            <FaFileCsv />
                            <span>Bulk Upload</span>
                        </button>
                        <button onClick={downloadTemplate} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">
                            <FaDownload className="mr-2" /> Template
                        </button>
                        <button onClick={exportFarmers} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm">
                            <FaFileCsv className="mr-2" /> Export
                        </button>

                        {selectedBulkFile && (
                            <div className="flex items-center space-x-2 ml-0 sm:ml-4">
                                <span className="text-sm text-gray-700">{selectedBulkFile.name}</span>
                                <button onClick={uploadSelectedFile} disabled={uploading} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                                <button onClick={() => setSelectedBulkFile(null)} disabled={uploading} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                            </div>
                        )}
                    </div>
                </div>
            {/* horizontal divider similar to Farms list */}
            <div className="border-b border-gray-200 mb-6" />

            {showFilters && (
                <div className="bg-white p-4 rounded-lg mb-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Created By</label>
                            <input value={filterCreatedByName} onChange={e => setFilterCreatedByName(e.target.value)} placeholder="Creator name" className="mt-1 block w-full border px-3 py-2 rounded" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Primary Language</label>
                            <select value={filterPrimaryLanguage} onChange={e => setFilterPrimaryLanguage(e.target.value)} className="mt-1 block w-full border px-3 py-2 rounded">
                                <option value="">Any</option>
                                {primaryLanguageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Education Level</label>
                            <select value={filterEducationLevel} onChange={e => setFilterEducationLevel(e.target.value)} className="mt-1 block w-full border px-3 py-2 rounded">
                                <option value="">Any</option>
                                {educationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end gap-2">
                            <button onClick={() => { fetchData({ pageIndex: 0, PageNumber: 1 }); }} className="px-4 py-2 bg-indigo-600 text-white rounded">Apply</button>
                            <button onClick={() => { setFilterCreatedByName(''); setFilterPrimaryLanguage(''); setFilterEducationLevel(''); fetchData({ pageIndex: 0, PageNumber: 1 }); }} className="px-4 py-2 bg-gray-200 rounded">Reset</button>
                        </div>
                    </div>
                </div>
            )}

            {error && <AlertModal title="Error" message={error} onClose={() => setError(null)} />}
            {uploadResult && (
                <AlertModal
                    title={uploadResult.status === 'success' ? 'Upload Successful' : 'Upload Failed'}
                    message={uploadResult.message}
                    onClose={() => setUploadResult(null)}
                />
            )}

            {/* Search/Filters moved into table header to avoid duplication. */}

            <DataTable
                columns={columns}
                data={data}
                totalRows={totalRows}
                fetchData={fetchData}
                loading={loading}
                onAdd={handleAdd}
                canCreate={canCreate}
                canEdit={canEdit}
                canDelete={canDelete}
                onBulkDelete={handleBulkDelete}
                onRefresh={() => fetchData({ pageIndex: 0, pageSize: 10 })}
                externalGlobalFilter={searchQuery}
                onExternalGlobalFilterChange={(v) => { setSearchQuery(v); }}
                externalFilters={{
                    Region: filterRegion || null,
                    Zone: filterZone || null,
                    Woreda: filterWoreda || null,
                    Kebele: filterKebele || null,
                    Village: filterVillage || null,
                    Gender: filterGender || null,
                    IsActive: filterIsActive === 'All' ? null : (filterIsActive === 'Active' ? 1 : 0),
                    IncludeDeleted: filterIncludeDeleted ? 1 : 0,
                    CreatedDateFrom: filterCreatedFrom || null,
                    CreatedDateTo: filterCreatedTo || null,
                    CreatedByName: filterCreatedByName || null,
                    PrimaryLanguage: filterPrimaryLanguage || null,
                    EducationLevel: filterEducationLevel || null,
                }}
                storageKey="farmers.columns"
                onBulkUpload={async (file) => {
                    // parent handler will process file and send to backend
                    if (!file) return;
                    try {
                        const text = await file.text();
                        const lines = text.split(/\r?\n/).filter(Boolean);
                        const rows = lines.map((l, idx) => {
                            if (idx === 0 && l.toLowerCase().includes('firstname')) return null;
                            const cols = l.split(',').map(c => c.trim());
                            return {
                                FirstName: cols[0] || null,
                                LastName: cols[1] || null,
                                FatherName: cols[2] || null,
                                Gender: cols[3] || null,
                                PhoneNumber: cols[4] || null,
                                AlternatePhoneNumber: cols[5] || null,
                                Email: cols[6] || null,
                                NationalID: cols[7] || null,
                                Region: cols[8] || null,
                                Zone: cols[9] || null,
                                Woreda: cols[10] || null,
                                Kebele: cols[11] || null,
                                Village: cols[12] || null,
                                HouseNumber: cols[13] || null,
                                FarmingExperience: cols[14] ? Number(cols[14]) : null,
                                PrimaryLanguage: cols[15] || null,
                                EducationLevel: cols[16] || null,
                                MaritalStatus: cols[17] || null,
                                FamilySize: cols[18] ? Number(cols[18]) : null,
                                Dependents: cols[19] ? Number(cols[19]) : null,
                                HouseholdIncome: cols[20] ? Number(cols[20]) : null,
                                PreferredContactMethod: cols[21] || null,
                                CommunicationLanguage: cols[22] || null,
                            };
                        }).filter(Boolean);

                        if (rows.length === 0) return;
                        await fetchWithAuth({ url: '/farmers/bulk', method: 'post', data: { farmers: rows, CreatedBy: user?.UserID || user?.id } });
                        // refresh list
                        fetchData({ pageIndex: 0, pageSize: 10 });
                    } catch (err) {
                        console.error('Bulk upload failed', err);
                        throw err;
                    }
                }}
                onDownloadTemplate={() => {
                    const headers = ['FirstName','LastName','FatherName','Gender','PhoneNumber','AlternatePhoneNumber','Email','NationalID','Region','Zone','Woreda','Kebele','Village','HouseNumber','FarmingExperience','PrimaryLanguage','EducationLevel','MaritalStatus','FamilySize','Dependents','HouseholdIncome','PreferredContactMethod','CommunicationLanguage'];
                    const example = ['John','Doe','Abebe','Male','0912345678','','john@example.com','123456789','RegionA','ZoneA','WoredaA','KebeleA','VillageA','12','5','BSc','Married','5','2','1000','Phone','Amharic'];
                    const csv = [headers.join(','), example.join(',')].join('\r\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'farmers_import_template.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }}
            />

            {/* Render reusable FarmersForm component inside Modal when open */}
            <Modal
                open={isFormOpen}
                onClose={() => { setFormOpen(false); setFormReadOnly(false); }}
                title={editingFarmer ? 'Edit Farmer' : 'Add Farmer'}
                maxWidth="max-w-4xl"
            >
                <FarmersForm
                    form={form}
                    setForm={setForm}
                    onFieldChange={handleFieldChange}
                    fieldErrors={fieldErrors}
                    loading={formSubmitting}
                    onCancel={() => setFormOpen(false)}
                    onSubmit={(e) => { if (e && e.preventDefault) e.preventDefault(); handleFormSubmit(form); }}
                    readOnly={isFormReadOnly}
                    editingId={editingFarmer?.FarmerID}
                />
            </Modal>

            {isDeleteConfirmOpen && (
                <ConfirmModal
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete ${deleteTarget?.FirstName} ${deleteTarget?.LastName}?`}
                    onConfirm={() => {
                        console.log("Deleting", deleteTarget);
                        setDeleteConfirmOpen(false);
                    }}
                    onCancel={() => setDeleteConfirmOpen(false)}
                />
            )}
            {showFarmerSaveConfirm && (
                <ConfirmModal
                    open={showFarmerSaveConfirm}
                    title={pendingFarmerIsEdit ? 'Confirm Update' : 'Confirm Create'}
                    message={pendingFarmerIsEdit ? `Update farmer "${form.FirstName || ''} ${form.LastName || ''}"?` : `Create farmer "${form.FirstName || ''} ${form.LastName || ''}"?`}
                    onConfirm={doFarmerSaveConfirmed}
                    onCancel={() => setShowFarmerSaveConfirm(false)}
                    confirmLabel={pendingFarmerIsEdit ? 'Update' : 'Create'}
                    cancelLabel="Cancel"
                    loading={formSubmitting}
                    changes={pendingFarmerChanges}
                />
            )}
            
        </div>
    </>
    );
}