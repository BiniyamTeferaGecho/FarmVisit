import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

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
const getColumns = (onEdit, onDelete, onView, canEdit, canDelete, advisorMap = {}, paginationMeta = null, pageIndex = 0, pageSize = 10) => {
    return [
        {
            id: 'rowNumber',
            header: '#',
            cell: info => {
                try {
                    const serverPageIndex = (paginationMeta && paginationMeta.currentPage) ? (paginationMeta.currentPage - 1) : pageIndex;
                    const seq = serverPageIndex * pageSize + info.row.index + 1;
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
    const [paginationMeta, setPaginationMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Manual table pagination state (replaces react-table)
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    
    // Search (simple) state
    const [searchQuery, setSearchQuery] = useState('');
    // Search type/term for server-side search (core.SearchFarmers)
    const [searchType, setSearchType] = useState('FirstName');
    const [searchTermState, setSearchTermState] = useState('');
    // Persist the last-search parameters so pagination keeps using them
    const [activeSearchParams, setActiveSearchParams] = useState(null);
    const [createdByFilter, setCreatedByFilter] = useState('');
    // Search select options for typed searches
    const [regionOptions, setRegionOptions] = useState([]);
    const [regionLoading, setRegionLoading] = useState(false);
    const [selectedSearchRegionId, setSelectedSearchRegionId] = useState(null);
    const [zoneOptions, setZoneOptions] = useState([]);
    const [zoneLoading, setZoneLoading] = useState(false);
    const [primaryOptions, setPrimaryOptions] = useState([]);
    const [primaryLoading, setPrimaryLoading] = useState(false);
    const genderOptions = [
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' },
        { value: 'Other', label: 'Other' }
    ];

    const fetchRegionOptions = async () => {
        if (regionLoading || (regionOptions && regionOptions.length > 0)) return;
        setRegionLoading(true);
        try {
            let res = await fetchWithAuth({ url: `/lookups/location-hierarchy`, method: 'get' });
            let payload = res?.data?.data || res?.data || res;
            let rows = [];
            if (Array.isArray(payload)) rows = payload;
            else if (Array.isArray(payload.items)) rows = payload.items;
            else if (Array.isArray(payload.recordset)) rows = payload.recordset;
            else if (Array.isArray(payload.data)) rows = payload.data;

            if (!rows || rows.length === 0) {
                res = await fetchWithAuth({ url: `/lookups/by-type-name/Region`, method: 'get' });
                payload = res?.data?.data || res?.data || res;
                if (Array.isArray(payload)) rows = payload;
                else if (Array.isArray(payload.items)) rows = payload.items;
                else if (Array.isArray(payload.recordset)) rows = payload.recordset;
                else if (Array.isArray(payload.data)) rows = payload.data;
                else rows = [];
            }

            const opts = (rows || []).map(r => {
                const id = r?.LookupID || r?.LookupId || r?.id || null;
                const value = r?.LookupValue ?? r?.Value ?? r?.lookupValue ?? r?.value ?? null;
                const label = r?.LookupLabel ?? r?.Label ?? r?.Name ?? value ?? '';
                return value ? { id: id ? String(id) : null, value: String(value), label: String(label) } : null;
            }).filter(Boolean);
            setRegionOptions(opts);
        } catch (e) {
            setRegionOptions([]);
        } finally { setRegionLoading(false); }
    };

    const fetchZoneOptions = async (regionId) => {
        if (!regionId) { setZoneOptions([]); return; }
        if (zoneLoading) return;
        setZoneLoading(true);
        try {
            const qs = `RegionID=${encodeURIComponent(regionId)}`;
            const res = await fetchWithAuth({ url: `/lookups/location-hierarchy?${qs}`, method: 'get' });
            const payload = res?.data?.data || res?.data || res;
            let rows = [];
            if (Array.isArray(payload)) rows = payload;
            else if (Array.isArray(payload.items)) rows = payload.items;
            else if (Array.isArray(payload.recordset)) rows = payload.recordset;
            else if (Array.isArray(payload.data)) rows = payload.data;
            const opts = (rows || []).map(r => ({ id: r.LookupID || r.LookupId || r.id || null, value: r.LookupValue || r.LookupLabel || r.Value || r.value || '', label: r.LookupValue || r.LookupLabel || r.Value || r.value || '' }));
            setZoneOptions(opts);
        } catch (e) {
            setZoneOptions([]);
        } finally { setZoneLoading(false); }
    };

    const fetchPrimaryOptions = async () => {
        if (primaryLoading || (primaryOptions && primaryOptions.length > 0)) return;
        setPrimaryLoading(true);
        try {
            const res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent('Primary Language')}`, method: 'get' });
            const payload = res?.data?.data || res?.data || res;
            let rows = [];
            if (Array.isArray(payload)) rows = payload;
            else if (Array.isArray(payload.items)) rows = payload.items;
            else if (Array.isArray(payload.recordset)) rows = payload.recordset;
            else if (Array.isArray(payload.data)) rows = payload.data;
            const opts = (rows || []).map(r => {
                const value = r?.LookupValue ?? r?.Value ?? r?.lookupValue ?? r?.value ?? null;
                const label = r?.LookupLabel ?? r?.Label ?? r?.Name ?? value ?? '';
                return value ? { value: String(value), label: String(label) } : null;
            }).filter(Boolean);
            setPrimaryOptions(opts);
        } catch (e) {
            setPrimaryOptions([]);
        } finally { setPrimaryLoading(false); }
    };

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
            const pageIndex = (typeof params.pageIndex === 'number')
                ? params.pageIndex
                : (typeof params.PageNumber === 'number'
                    ? Math.max(0, params.PageNumber - 1)
                    : (typeof params.CurrentPage === 'number' ? Math.max(0, params.CurrentPage - 1) : 0));
            // Prefer explicit params, otherwise use the current pageSize state so navigation respects user's selection
            const requestedPageSize = (typeof params.pageSize !== 'undefined' && params.pageSize !== null)
                ? Number(params.pageSize)
                : (typeof params.PageSize !== 'undefined' && params.PageSize !== null)
                    ? Number(params.PageSize)
                    : pageSize;

            const qs = new URLSearchParams();
            qs.append('PageNumber', String(pageIndex + 1));
            qs.append('PageSize', String(requestedPageSize));

            const appendIf = (key, val) => { if (val !== undefined && val !== null && String(val).trim() !== '') qs.append(key, String(val)); };

            // Preserve component-level search state when navigation occurs without explicit SearchType/Term
            // Only treat the component-level `searchType` as active when there is an accompanying term/selection
            const hasActiveSearchValue = (searchTermState && String(searchTermState).trim() !== '') || (!!selectedSearchRegionId) || (!!activeSearchParams);
            const suppliedSearchType = params.SearchType ?? params.searchType ?? (activeSearchParams && activeSearchParams.SearchType) ?? (hasActiveSearchValue ? searchType : null);
            const suppliedSearchTerm = params.SearchTerm ?? params.search ?? params.q ?? (activeSearchParams && (activeSearchParams.SearchTerm || activeSearchParams.SearchTerm === '') ? activeSearchParams.SearchTerm : (hasActiveSearchValue ? searchTermState : null));

            // Map filter-oriented SearchTypes to the backend-accepted 'All' SearchType when building the query
            const filterTypes = ['Region', 'Zone', 'PrimaryLanguage', 'Gender'];
            let effectiveSearchType = (filterTypes.includes(suppliedSearchType)) ? 'All' : suppliedSearchType;
            // If a filter-only parameter is provided (e.g. CreatedByName) but no quick-search term
            // is present, ensure we treat this as a filter search by using 'All'. This prevents
            // backend validation errors when SearchType is a quick-search (FirstName, etc.) with
            // an empty SearchTerm while other filters are supplied.
            const hasCreatedByNameFilter = (params && (params.CreatedByName || params.createdByName)) || (activeSearchParams && (activeSearchParams.CreatedByName || activeSearchParams.createdByName));
            if (hasCreatedByNameFilter && (!suppliedSearchTerm || String(suppliedSearchTerm).trim() === '')) {
                effectiveSearchType = 'All';
            }

            // Decide whether to call the paged endpoint or the search endpoint (core.SearchFarmers)
            // Simplify logic: use `/farmers/paged` for plain pagination requests (no active search/filter),
            // and use `/farmers/search` only when a search/filter is active (SearchType or SearchTerm provided
            // or `activeSearchParams` exists). This aligns with the backend controllers and stored-procedures.
            let endpoint;
            // Ensure pageNumberToSend is available in outer scope for fallback metadata calculations
            let pageNumberToSend = (typeof params.PageNumber !== 'undefined' && params.PageNumber !== null) ? Number(params.PageNumber) : (pageIndex + 1);
            const isPaged = (typeof params.pageIndex === 'number') || (typeof params.PageNumber !== 'undefined') || params.PageSize || params.pageSize;

            // Determine whether this call should be treated as a search (use advanced search SP)
            const explicitSearchProvided = (typeof params.SearchType !== 'undefined' && params.SearchType !== null) || (typeof params.SearchTerm !== 'undefined' && params.SearchTerm !== null) || (typeof params.Search !== 'undefined' && params.Search !== null);
            const hasActiveFilters = !!activeSearchParams;
            const treatAsSearch = explicitSearchProvided || hasActiveFilters || (searchTermState && String(searchTermState).trim() !== '') || (searchType && String(searchType).trim() !== '' && searchType !== 'FirstName');

            if (isPaged && !treatAsSearch) {
                // Plain pagination request -> call paged endpoint
                const pagedQs = new URLSearchParams();
                pageNumberToSend = (typeof params.PageNumber !== 'undefined' && params.PageNumber !== null) ? Number(params.PageNumber) : (pageIndex + 1);
                pagedQs.append('PageNumber', String(pageNumberToSend));
                pagedQs.append('PageSize', String(requestedPageSize));
                const appendIfPaged = (key, val) => { if (val !== undefined && val !== null && String(val).trim() !== '') pagedQs.append(key, String(val)); };

                // Determine effective filter values (prefer explicit params, then activeSearchParams)
                const effectiveRegion = params.Region ?? params.region ?? (activeSearchParams && (activeSearchParams.Region || activeSearchParams.Region === '') ? activeSearchParams.Region : ((selectedSearchRegionId && regionOptions) ? (regionOptions.find(r => String(r.id) === String(selectedSearchRegionId))?.value) : null));
                const effectiveZone = params.Zone ?? params.zone ?? (activeSearchParams && (activeSearchParams.Zone || activeSearchParams.Zone === '') ? activeSearchParams.Zone : null);
                const effectiveWoreda = params.Woreda ?? params.woreda ?? (activeSearchParams && activeSearchParams.Woreda ? activeSearchParams.Woreda : null);
                const effectiveMarital = params.MaritalStatus ?? params.maritalStatus ?? (activeSearchParams && activeSearchParams.MaritalStatus ? activeSearchParams.MaritalStatus : null);
                const effectiveEducation = params.EducationLevel ?? params.educationLevel ?? (activeSearchParams && activeSearchParams.EducationLevel ? activeSearchParams.EducationLevel : null);
                const effectivePrimary = params.PrimaryLanguage ?? params.primaryLanguage ?? (activeSearchParams && (activeSearchParams.PrimaryLanguage || activeSearchParams.PrimaryLanguage === '') ? activeSearchParams.PrimaryLanguage : null);
                const effectiveGender = params.Gender ?? params.gender ?? (activeSearchParams && (activeSearchParams.Gender || activeSearchParams.Gender === '') ? activeSearchParams.Gender : null);
                const effectiveCreatedByName = params.CreatedByName ?? params.createdByName ?? (activeSearchParams && (activeSearchParams.CreatedByName || activeSearchParams.CreatedByName === '') ? activeSearchParams.CreatedByName : (createdByFilter ? createdByFilter : null));

                appendIfPaged('Region', effectiveRegion);
                appendIfPaged('Zone', effectiveZone);
                appendIfPaged('Woreda', effectiveWoreda);
                appendIfPaged('Kebele', params.Kebele ?? params.kebele ?? (activeSearchParams && activeSearchParams.Kebele ? activeSearchParams.Kebele : null));
                appendIfPaged('Village', params.Village ?? params.village ?? (activeSearchParams && activeSearchParams.Village ? activeSearchParams.Village : null));
                appendIfPaged('Gender', effectiveGender);
                appendIfPaged('CreatedByName', effectiveCreatedByName);
                appendIfPaged('SearchTerm', suppliedSearchTerm);
                appendIfPaged('SortColumn', params.SortColumn || params.Sort || params.sortColumn || null);
                appendIfPaged('SortDirection', params.SortDirection || params.sortDirection || null);

                endpoint = pagedQs.toString() ? `/farmers/paged?${pagedQs.toString()}` : '/farmers/paged';
            } else if (isPaged && treatAsSearch) {
                // Paged search: caller expects search semantics (preserve filters)
                const pagedQs = new URLSearchParams();
                pageNumberToSend = (typeof params.PageNumber !== 'undefined' && params.PageNumber !== null) ? Number(params.PageNumber) : (pageIndex + 1);
                pagedQs.append('PageNumber', String(pageNumberToSend));
                pagedQs.append('PageSize', String(requestedPageSize));
                const appendIfPaged = (key, val) => { if (val !== undefined && val !== null && String(val).trim() !== '') pagedQs.append(key, String(val)); };

                // When using the search endpoint, map filter-oriented search types to 'All' and preserve filters
                appendIfPaged('SearchType', effectiveSearchType);
                if (!filterTypes.includes(suppliedSearchType)) appendIfPaged('SearchTerm', suppliedSearchTerm);
                appendIfPaged('Region', params.Region ?? params.region ?? (activeSearchParams && activeSearchParams.Region ? activeSearchParams.Region : null));
                appendIfPaged('Zone', params.Zone ?? params.zone ?? (activeSearchParams && activeSearchParams.Zone ? activeSearchParams.Zone : null));
                appendIfPaged('Woreda', params.Woreda ?? params.woreda ?? (activeSearchParams && activeSearchParams.Woreda ? activeSearchParams.Woreda : null));
                appendIfPaged('MaritalStatus', params.MaritalStatus ?? params.maritalStatus ?? (activeSearchParams && activeSearchParams.MaritalStatus ? activeSearchParams.MaritalStatus : null));
                appendIfPaged('EducationLevel', params.EducationLevel ?? params.educationLevel ?? (activeSearchParams && activeSearchParams.EducationLevel ? activeSearchParams.EducationLevel : null));
                appendIfPaged('PrimaryLanguage', params.PrimaryLanguage ?? params.primaryLanguage ?? (activeSearchParams && activeSearchParams.PrimaryLanguage ? activeSearchParams.PrimaryLanguage : null));
                appendIfPaged('Gender', params.Gender ?? params.gender ?? (activeSearchParams && activeSearchParams.Gender ? activeSearchParams.Gender : null));
                appendIfPaged('CreatedByName', params.CreatedByName ?? params.createdByName ?? (activeSearchParams && activeSearchParams.CreatedByName ? activeSearchParams.CreatedByName : (createdByFilter ? createdByFilter : null)));

                endpoint = pagedQs.toString() ? `/farmers/search?${pagedQs.toString()}` : '/farmers/search';
            } else {
                // Non-paged/list endpoint
                endpoint = (qs.toString() && qs.toString().length > 0) ? `/farmers?${qs.toString()}` : '/farmers';
            }
            const res = await fetchWithAuth({ url: endpoint, method: 'get' });
            const raw = res?.data || res;
            // payloadRows is the actual array of rows returned by the API (often at res.data.data)
            const payloadRows = (raw && raw.data && Array.isArray(raw.data)) ? raw.data : (Array.isArray(raw) ? raw : null);

            // normalize into array + total. Prefer metadata on the outer response when present
            let items = null; let total = 0; let currentPageResp = null;
            if (payloadRows) {
                items = payloadRows;
                total = Number(raw.totalCount ?? raw.total ?? items.length) || items.length;
                currentPageResp = Number(raw.pageNumber ?? raw.CurrentPage ?? raw.currentPage ?? raw.page ?? null) || null;
            } else {
                const payload = (Array.isArray(raw) ? raw : (raw && raw.data && !Array.isArray(raw.data) ? raw.data : raw));
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
                    const arr = Object.keys(payload).find(k => Array.isArray(payload[k]));
                    items = arr ? payload[arr] : [];
                    total = items.length || 0;
                }
            }

            console.debug('fetchData(farmers) ->', { endpoint, raw, itemsPreview: Array.isArray(items) ? items.slice(0,5) : items, total });
            setData(items || []);
            setTotalRows(Number(total) || 0);
            // Capture server pagination metadata when provided so UI can render page links reliably
            // Use the requested page size (requestedPageSize) and explicit page number
            // when computing fallback pagination metadata to avoid race conditions
            // between state updates and the fetch parameters.
            const serverTotalPages = Number(raw.totalPages ?? raw.TotalPages ?? Math.max(1, Math.ceil((Number(total) || 0) / (requestedPageSize || 10))));
            const serverStart = Number(raw.startRecord ?? raw.StartRecord ?? raw.Start ?? null) || (items && items.length ? ((currentPageResp || pageNumberToSend || (pageIndex + 1)) - 1) * (requestedPageSize || 10) + 1 : 0);
            const serverEnd = Number(raw.endRecord ?? raw.EndRecord ?? raw.End ?? null) || Math.min(Number(total) || 0, (currentPageResp || pageNumberToSend || (pageIndex + 1)) * (requestedPageSize || 10));
            const serverHasNext = (typeof raw.hasNext !== 'undefined') ? !!raw.hasNext : (typeof raw.HasNext !== 'undefined' ? !!raw.HasNext : null);
            const serverHasPrevious = (typeof raw.hasPrevious !== 'undefined') ? !!raw.hasPrevious : (typeof raw.HasPrevious !== 'undefined' ? !!raw.HasPrevious : null);
            setPaginationMeta({ totalPages: serverTotalPages, currentPage: (currentPageResp || (pageIndex + 1)), startRecord: serverStart, endRecord: serverEnd, hasNext: serverHasNext, hasPrevious: serverHasPrevious });
            // If backend returned pageNumber/currentPage align the UI pageIndex accordingly
            if (currentPageResp !== null && !Number.isNaN(currentPageResp)) {
                setPageIndex(Math.max(0, currentPageResp - 1));
            }
        } catch (err) {
            console.debug('fetchData(farmers) failed', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to load farmers');
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth, searchQuery, searchType, searchTermState, selectedSearchRegionId, regionOptions, zoneOptions, primaryOptions, activeSearchParams]);

    // Fetch when pageIndex/pageSize or filters change
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!cancelled) await fetchData({ PageNumber: pageIndex + 1, PageSize: pageSize });
            } catch (e) {
                // ignore here - fetchData sets error state
            }
        })();
        return () => { cancelled = true; };
    }, [fetchData, pageIndex, pageSize, searchType, searchTermState, selectedSearchRegionId, activeSearchParams]);

    const exportFarmers = async () => {
        setLoading(true); setError(null);
        try {
            // Export using server-side search/paged endpoints with current filters.
            // There is no dedicated `/farmers/report` route; request the search/paged
            // endpoint with active search params and a large PageSize so we receive
            // all matching rows, then generate CSV client-side.
            const params = activeSearchParams ? { ...activeSearchParams } : {};
            // Ensure we request from the first page and a large page size to include all rows
            params.PageNumber = 1;
            params.PageSize = Math.max(1000, pageSize, totalRows || 1000);

            // Build query string
            const qs = new URLSearchParams();
            Object.keys(params || {}).forEach(k => {
                const v = params[k];
                if (v !== undefined && v !== null && String(v).trim() !== '') qs.append(k, String(v));
            });

            // Decide whether to call search or paged endpoint
            const endpoint = (params.SearchType || params.SearchType === '') ? `/farmers/search?${qs.toString()}` : `/farmers/paged?${qs.toString()}`;
            const res = await fetchWithAuth({ url: endpoint, method: 'get' });
            const rows = res?.data?.data || res?.data || res;

            const finalRows = Array.isArray(rows) ? rows : (rows && rows.recordset ? rows.recordset : []);
            if (!finalRows || finalRows.length === 0) {
                setError('No data to export');
                return;
            }

            const csvText = toCsv(finalRows);
            const blob = new Blob([csvText], { type: 'text/csv' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'farmers_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } catch (err) {
            setError(err?.message || 'Export failed');
        } finally { setLoading(false) }
    };

    const handleSearch = async () => {
        // perform server-side search via core.SearchFarmers
        setPageIndex(0);
        // The backend `searchFarmers` expects SearchType to be one of the quick-search types
        // (FirstName, LastName, FatherName, PhoneNumber, All). For filter-based searches
        // (Gender, Region, Zone, PrimaryLanguage) send SearchType='All' and include the
        // corresponding filter param so the stored-proc will apply it.
        const params = { SearchType: searchType, PageNumber: 1, PageSize: pageSize };
        if (searchType === 'Region') {
            params.SearchType = 'All';
            params.Region = searchTermState;
        } else if (searchType === 'Zone') {
            params.SearchType = 'All';
            params.Zone = searchTermState;
            // also send Region by value if we have the id selected
            const region = (regionOptions || []).find(r => String(r.id) === String(selectedSearchRegionId));
            if (region && region.value) params.Region = region.value;
        } else if (searchType === 'PrimaryLanguage') {
            params.SearchType = 'All';
            params.PrimaryLanguage = searchTermState;
        } else if (searchType === 'Gender') {
            params.SearchType = 'All';
            params.Gender = searchTermState;
        } else {
            params.SearchTerm = searchTermState;
        }
        if (createdByFilter && String(createdByFilter).trim() !== '') {
            // If user only provided a CreatedByName (advisor name) and no search term,
            // the backend stored-proc expects SearchType='All' (filter-based search).
            // Ensure we don't send a quick-search type (like FirstName) with an empty SearchTerm.
            if (!searchTermState || String(searchTermState).trim() === '') {
                params.SearchType = 'All';
            }
            params.CreatedByName = createdByFilter;
        }

        setActiveSearchParams(params);
        await fetchData(params);
    };

    const handleClearSearch = async () => {
        setSearchType('FirstName');
        setSearchTermState('');
        setCreatedByFilter('');
        setSelectedSearchRegionId(null);
        setZoneOptions([]);
        setActiveSearchParams(null);
        setPageIndex(0);
        await fetchData({ PageNumber: 1, PageSize: pageSize });
    };

    // (Removed advanced filter lookups)

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
            fetchData({ PageNumber: 1, PageSize: 10 });
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

    const columns = useMemo(() => getColumns(handleEdit, handleDelete, handleView, canEdit, canDelete, advisorMap, paginationMeta, pageIndex, pageSize), [data, canEdit, canDelete, advisorMap, handleView, paginationMeta, pageIndex, pageSize]);

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
            fetchData({ PageNumber: 1, PageSize: 10 });
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

            {/* Filters removed */}

            {/* Search form for core.SearchFarmers */}
            <div className="mb-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <label className="sr-only">Search Type</label>
                    <select value={searchType} onChange={e => {
                        const v = e.target.value;
                        setSearchType(v);
                        setSearchTermState('');
                        setSelectedSearchRegionId(null);
                        if (v === 'Region' || v === 'Zone') fetchRegionOptions();
                        if (v === 'PrimaryLanguage') fetchPrimaryOptions();
                    }} className="w-full sm:w-48 px-3 py-2 bg-white border rounded-md text-sm">
                        <option value="FirstName">First Name</option>
                        <option value="LastName">Last Name</option>
                        <option value="FatherName">Father Name</option>
                        <option value="PhoneNumber">Phone Number</option>
                        <option value="Gender">Gender</option>
                        <option value="Region">Region</option>
                        <option value="Zone">Zone/Sub-City</option>
                        <option value="PrimaryLanguage">Primary Language</option>
                        <option value="All">All</option>
                    </select>

                    {/* conditional input/select based on chosen searchType */}
                    {searchType === 'Region' && (
                        <select value={searchTermState} onChange={e => setSearchTermState(e.target.value)} onFocus={() => fetchRegionOptions()} className="flex-1 px-3 py-2 border rounded-md text-sm">
                            <option value="">Select region</option>
                            {(regionOptions || []).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )}

                    {searchType === 'Zone' && (
                        <div className="flex-1 flex gap-2">
                            <select value={selectedSearchRegionId || ''} onChange={e => {
                                const id = e.target.value || null;
                                setSelectedSearchRegionId(id);
                                setSearchTermState('');
                                if (id) fetchZoneOptions(id);
                                else setZoneOptions([]);
                            }} onFocus={() => fetchRegionOptions()} className="w-1/2 px-3 py-2 border rounded-md text-sm">
                                <option value="">Select region</option>
                                {(regionOptions || []).map(opt => (
                                    <option key={opt.id || opt.value} value={opt.id || ''}>{opt.label}</option>
                                ))}
                            </select>

                            <select value={searchTermState} onChange={e => setSearchTermState(e.target.value)} className="w-1/2 px-3 py-2 border rounded-md text-sm">
                                <option value="">Select zone</option>
                                {(zoneOptions || []).map(opt => (
                                    <option key={opt.id || opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {searchType === 'PrimaryLanguage' && (
                        <select value={searchTermState} onChange={e => setSearchTermState(e.target.value)} onFocus={() => fetchPrimaryOptions()} className="flex-1 px-3 py-2 border rounded-md text-sm">
                            <option value="">Select primary language</option>
                            {(primaryOptions || []).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )}

                    {searchType === 'Gender' && (
                        <select value={searchTermState} onChange={e => setSearchTermState(e.target.value)} className="flex-1 px-3 py-2 border rounded-md text-sm">
                            <option value="">Select gender</option>
                            {genderOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    )}

                    {(searchType !== 'Region' && searchType !== 'Zone' && searchType !== 'PrimaryLanguage' && searchType !== 'Gender') && (
                        <input type="text" value={searchTermState} onChange={e => setSearchTermState(e.target.value)} placeholder="Enter search term" className="flex-1 px-3 py-2 border rounded-md text-sm" />
                    )}

                    <div className="w-48">
                        <input type="text" value={createdByFilter} onChange={e => setCreatedByFilter(e.target.value)} placeholder="Created By Advisor)" className="w-full px-3 py-2 border rounded-md text-sm" />
                    </div>

                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleSearch} className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm">Search</button>
                        <button type="button" onClick={handleClearSearch} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md text-sm">Clear</button>
                    </div>
                </div>
            </div>

            {error && <AlertModal title="Error" message={error} onClose={() => setError(null)} />}
            {uploadResult && (
                <AlertModal
                    title={uploadResult.status === 'success' ? 'Upload Successful' : 'Upload Failed'}
                    message={uploadResult.message}
                    onClose={() => setUploadResult(null)}
                />
            )}

            {/* Search/Filters moved into table header to avoid duplication. */}

            {/* Manual table (replacing react-table) */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="overflow-x-auto">
                    {
                        (() => {
                            const allColumnIds = (columns || []).map(c => (c.id || c.accessorKey || '').toString()).filter(Boolean);
                            const defaultCols = ['rowNumber','name','phone','region','primaryLanguage','educationLevel','createdBy','actions'];
                            const [visibleColsLocal, setVisibleColsLocal] = [undefined, undefined];
                            // use the component-level visibleCols if present, else fall back to local stored value
                            // We'll persist visibility in localStorage via the ColumnSelector onChange handler below.
                            const displayedCols = (columns || []).filter(c => {
                                const id = (c.id || c.accessorKey || '').toString();
                                // If localStorage has a preference, honor it; otherwise use defaultCols
                                try {
                                    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('farmers.columns') : null;
                                    if (raw) {
                                        const parsed = JSON.parse(raw || '{}');
                                        if (parsed && typeof parsed === 'object') {
                                            if (parsed[id] === false) return false;
                                            if (parsed[id] === true) return true;
                                        }
                                    }
                                } catch (e) { /* ignore */ }
                                return defaultCols.includes(id) || id === '';
                            });

                            const totalPages = Math.max(1, Math.ceil((Number(totalRows) || 0) / (pageSize || 10)));
                            return (
                                <>
                                    <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                                        <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                            <tr>
                                                {displayedCols.map(col => (
                                                    <th key={(col.id || col.accessorKey)} className="px-4 py-3">{col.header}</th>
                                                ))}
                                                <th className="px-4 py-3 text-right">
                                                    <ColumnSelector
                                                        columns={allColumnIds.map(id => ({ key: id, label: id }))}
                                                        visibilityMap={Object.fromEntries(allColumnIds.map(id => [id, (typeof window !== 'undefined' && (() => { try { const raw = window.localStorage.getItem('farmers.columns'); if (raw) { const p = JSON.parse(raw||'{}'); return !!p[id]; } } catch(e){} return defaultCols.includes(id); })())]))}
                                                        onChange={(next) => { try { window.localStorage.setItem('farmers.columns', JSON.stringify(next)); } catch (e) {} }}
                                                        trigger={<FaColumns className="w-4 h-4 text-gray-600 inline-block" />}
                                                        localStorageKey={'farmers.columns'}
                                                    />
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan={displayedCols.length + 1} className="text-center p-4"><LoadingSpinner /></td></tr>
                                            ) : (Array.isArray(data) && data.length > 0 ? (
                                                data.map((row, ridx) => (
                                                    <tr key={row.FarmerID || ridx} className="border-b hover:bg-gray-50">
                                                        {displayedCols.map((col) => {
                                                            const cid = (col.id || col.accessorKey || '').toString();
                                                            const val = col.accessorKey ? (row[col.accessorKey] ?? '—') : null;
                                                            if (cid === 'rowNumber') {
                                                                const displayPageIndex = (paginationMeta && paginationMeta.currentPage) ? (paginationMeta.currentPage - 1) : pageIndex;
                                                                return <td key={cid} className="px-4 py-3 align-top text-sm font-medium">{displayPageIndex * pageSize + ridx + 1}</td>;
                                                            }
                                                            if (cid === 'name') {
                                                                const full = [row.FirstName, row.LastName].filter(Boolean).join(' ');
                                                                return <td key={cid} className="px-4 py-3 align-top text-sm">{full || '—'}</td>;
                                                            }
                                                            if (cid === 'phone') return <td key={cid} className="px-4 py-3">{row.PhoneNumber || '—'}</td>;
                                                            if (cid === 'region') return <td key={cid} className="px-4 py-3">{row.Region || '—'}</td>;
                                                            if (cid === 'primaryLanguage') return <td key={cid} className="px-4 py-3">{row.PrimaryLanguage || '—'}</td>;
                                                            if (cid === 'educationLevel') return <td key={cid} className="px-4 py-3">{row.EducationLevel || '—'}</td>;
                                                            if (cid === 'createdBy') {
                                                                const id = row?.CreatedBy || row?.createdBy || row?.CreatedByID || row?.CreatedById || null;
                                                                return <td key={cid} className="px-4 py-3">{(id && advisorMap[String(id)]) || id || '—'}</td>;
                                                            }
                                                            if (cid === 'actions') {
                                                                return (
                                                                    <td key={cid} className="px-4 py-3 text-right">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <button onClick={() => handleView && handleView(row.FarmerID)} title="View" className="text-gray-600 hover:text-gray-800"><FaEye /></button>
                                                                            {canEdit && <button onClick={() => handleEdit && handleEdit(row.FarmerID)} title="Edit" className="text-indigo-600 hover:text-indigo-800"><FaEdit /></button>}
                                                                            {canDelete && <button onClick={() => handleDelete && handleDelete(row)} title="Delete" className="text-red-600 hover:text-red-800"><FaTrash /></button>}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            }
                                                            return <td key={cid || Math.random()} className="px-4 py-3">{val ?? '—'}</td>;
                                                        })}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan={displayedCols.length + 1} className="text-center p-6 text-gray-500">No records found.</td></tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Page navigation (example styling) */}
                                    {(() => {
                                        const totalPages = (paginationMeta && paginationMeta.totalPages) ? paginationMeta.totalPages : Math.max(1, Math.ceil((Number(totalRows) || 0) / (pageSize || 10)));
                                        const current = (paginationMeta && paginationMeta.currentPage) ? paginationMeta.currentPage : (pageIndex + 1);
                                        const maxPagesToShow = 7;
                                        let start = Math.max(1, current - Math.floor(maxPagesToShow / 2));
                                        let end = Math.min(totalPages, start + maxPagesToShow - 1);
                                        if (end - start + 1 < maxPagesToShow) start = Math.max(1, end - maxPagesToShow + 1);
                                        const pages = [];
                                        for (let p = start; p <= end; p++) pages.push(p);

                                        const prevDisabled = current <= 1;
                                        const nextDisabled = current >= totalPages;

                                        return (
                                            <nav aria-label="Page navigation example" className="flex items-center space-x-4 mt-4">
                                                <ul className="flex -space-x-px text-sm">
                                                                <li>
                                                                    <button type="button" onClick={() => fetchData({ PageNumber: Math.max(1, current - 1), PageSize: pageSize })} disabled={prevDisabled} className={`flex items-center justify-center text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5 rounded-s-base text-sm px-3 h-9 focus:outline-none ${prevDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>Previous</button>
                                                                </li>
                                                    {pages.map(p => (
                                                        <li key={p}>
                                                                        <button type="button" onClick={() => fetchData({ PageNumber: p, PageSize: pageSize })} aria-current={p === current ? 'page' : undefined} className={`flex items-center justify-center ${p === current ? 'text-fg-brand bg-neutral-tertiary-medium box-border border border-default-medium hover:text-fg-brand font-medium' : 'text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5'} text-sm ${p === current ? 'w-9 h-9 focus:outline-none' : 'w-9 h-9 focus:outline-none'}`}>{p}</button>
                                                        </li>
                                                    ))}
                                                                <li>
                                                                    <button type="button" onClick={() => fetchData({ PageNumber: Math.min(totalPages, current + 1), PageSize: pageSize })} disabled={nextDisabled} className={`flex items-center justify-center text-body bg-neutral-secondary-medium border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading shadow-xs font-medium leading-5 rounded-e-base text-sm px-3 h-9 focus:outline-none ${nextDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>Next</button>
                                                                </li>
                                                </ul>
                                                <form className="w-32 mx-auto">
                                                    <label htmlFor="pageSize" className="sr-only">Select page size</label>
                                                    <select id="pageSize" value={pageSize} onChange={e => { const v = Number(e.target.value); setPageSize(v); setPageIndex(0); setPaginationMeta(null); fetchData({ PageNumber: 1, PageSize: v }); }} className="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm leading-4 rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                                                        <option value={10}>10 per page</option>
                                                        <option value={25}>25 per page</option>
                                                        <option value={50}>50 per page</option>
                                                        <option value={100}>100 per page</option>
                                                    </select>
                                                </form>
                                            </nav>
                                        )
                                    })()}

                                </>
                            );
                        })()
                    }
                </div>
            </div>

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