import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import FarmForm from './FarmForm';
import FarmPrintForm from '../components/print/forms/FarmPrintForm'
import ConfirmModal from '../components/ConfirmModal';
import ListHeaderWithFilter from '../components/ListHeaderWithFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';
import ColumnHeaderFilter from '../components/ColumnHeaderFilter';
import ColumnSelector from '../components/ColumnSelector';
import Pagination from '../components/common/Pagination';
import { FaPlus, FaFileCsv, FaDownload, FaSync, FaChartBar, FaEdit, FaTrash, FaUndo, FaMapMarkerAlt, FaBuilding, FaUser, FaPhone, FaEnvelope, FaGlobe, FaInfoCircle, FaSearch, FaTimes, FaColumns } from 'react-icons/fa';
import { toCsv } from '../utils/csv';
import TopNav from '../components/TopNav';
import Sidebar from '../components/Sidebar';

const initialForm = {
    FarmName: '',
    FarmCode: '',
    Address: '',
    Zone: '',
    Wereda: '',
    Region: '',
    CityTown: '',
    GPSLocation: '',
    FarmSize: '',
    FarmTypeID: '',
    OwnerName: '',
    FarmerID: '',
    ContactPhone: '',
    IsActive: true,
};

// Validation helpers
const validators = {
    phone: v => !v || [/^(\+2519\d{7}|09\d{8})$/.test(v),/^(\+2511\d{7}|14\d{8})$/.test(v),/^(\+2517\d{7}|07\d{8})$/.test(v)],
    email: v => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    farmType: v => !v || ['Dairy', 'Layer', 'Broiler'].includes(v),
    farmStatus: v => !v || ['Active', 'Inactive', 'Under Construction'].includes(v),
};

export default function Farms({ inDashboard = false }) {
    const HEADER_HEIGHT = 64;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { user, fetchWithAuth } = useAuth();
    const navigate = useNavigate();

    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [form, setForm] = useState(initialForm);
    const [originalForm, setOriginalForm] = useState(null);
    const [totalRows, setTotalRows] = useState(0);
    const [farmTypes, setFarmTypes] = useState([]);
    const [farmTypesLoadError, setFarmTypesLoadError] = useState(null);
    const [farmTypeNameCache, setFarmTypeNameCache] = useState({});
    const [advisorMap, setAdvisorMap] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [modalTab, setModalTab] = useState('form');
    const [showDelete, setShowDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [pendingSavePayload, setPendingSavePayload] = useState(null);
    const [pendingSaveIsEdit, setPendingSaveIsEdit] = useState(false);
    const [pendingSaveChanges, setPendingSaveChanges] = useState([]);
    const [bulkFile, setBulkFile] = useState(null);
    const [gpsModalOpen, setGpsModalOpen] = useState(false);
    const [gpsFor, setGpsFor] = useState(null);
    const [gpsCoords, setGpsCoords] = useState(''); // single string "lat,lon"
    const [gpsLoading, setGpsLoading] = useState(false)
    const [error, setError] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRegion, setFilterRegion] = useState('');
    const [filterZone, setFilterZone] = useState('');
    const [filterWereda, setFilterWereda] = useState('');
    const [filterCityTown, setFilterCityTown] = useState('');
    const [filterFarmTypeID, setFilterFarmTypeID] = useState('');
    const [filterFarmSizeMin, setFilterFarmSizeMin] = useState('');
    const [filterFarmSizeMax, setFilterFarmSizeMax] = useState('');
    const [filterCreatedFrom, setFilterCreatedFrom] = useState('');
    const [filterCreatedTo, setFilterCreatedTo] = useState('');
    const [filterIsActive, setFilterIsActive] = useState('All'); // 'All' | 'Active' | 'Inactive'
    const [filterIncludeDeleted, setFilterIncludeDeleted] = useState(false);
    const [columnFilters, setColumnFilters] = useState({});

    // Column visibility selector
    const defaultFarmCols = ['rowNumber','farmCode','farmName','type','owner','contact','createdBy','region','status','actions'];
    const [visibleCols, setVisibleCols] = useState(() => {
        try {
            if (typeof window !== 'undefined') {
                const raw = window.localStorage.getItem('farms.columns');
                if (raw) {
                    const parsed = JSON.parse(raw || '{}');
                    if (parsed && typeof parsed === 'object') {
                        const keys = defaultFarmCols.filter(id => !!parsed[id]);
                        if (keys.length) return new Set(keys);
                    }
                }
            }
        } catch (e) { /* ignore */ }
        return new Set(defaultFarmCols);
    });
    const toggleColumn = (id) => setVisibleCols(prev => { const next = new Set(prev ? Array.from(prev) : []); if (next.has(id)) next.delete(id); else next.add(id); return next; });

    const buildApiFiltersFromColumnFilters = (cf = {}) => {
        const api = {};
        if (cf.type) api.FarmTypeID = cf.type;
        if (cf.region) api.Region = cf.region;
        if (cf.createdBy) {
            // if createdBy looks like a GUID, send as CreatedByID, otherwise send as CreatedByName
            const g = String(cf.createdBy)
            const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(g)
            // backend expects CreatedByID (GUID) when a GUID is provided
            if (isGuid) api.CreatedByID = cf.createdBy
            else api.CreatedByName = cf.createdBy
        }
        if (cf.status !== undefined && cf.status !== null) api.IsActive = cf.status;
        if (cf.createdDateRange) {
            if (cf.createdDateRange.from) api.CreatedDateFrom = cf.createdDateRange.from;
            if (cf.createdDateRange.to) api.CreatedDateTo = cf.createdDateRange.to;
        }
        // Search term precedence: farmName -> farmCode -> owner -> contact
        const search = cf.farmName || cf.farmCode || cf.owner || cf.contact || '';
        if (search) api.SearchTerm = search;
        // If createdBy is a free-text name and SearchTerm isn't set, use it to search creator names
        if (!api.SearchTerm && cf.createdBy) {
            // if createdBy is not a GUID, use it as a name search
            const g = String(cf.createdBy)
            const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(g)
            if (!isGuid) api.SearchTerm = cf.createdBy
        }
        return api;
    };

    const applyColumnFilter = (key, val) => {
        const next = { ...(columnFilters || {}) };
        if (val === null || val === undefined || val === '') delete next[key];
        else next[key] = val;
        setColumnFilters(next);
        const apiFilters = buildApiFiltersFromColumnFilters(next);
        setPagination(p => ({ ...p, pageIndex: 0 }));
        fetchList({ pageIndex: 0, pageSize: pagination.pageSize, filters: apiFilters });
    };

    const clearColumnFilter = (key) => {
        const next = { ...(columnFilters || {}) };
        delete next[key];
        setColumnFilters(next);
        const apiFilters = buildApiFiltersFromColumnFilters(next);
        setPagination(p => ({ ...p, pageIndex: 0 }));
        fetchList({ pageIndex: 0, pageSize: pagination.pageSize, filters: apiFilters });
    };

    const createdByOptions = (() => {
        const map = new Map();
        if (Array.isArray(list)) {
            for (const it of list) {
                const id = it?.CreatedBy || it?.createdBy || it?.CreatedById || it?.CreatedByID || null;
                const key = id ? String(id) : null;
                const name = key ? (advisorMap && advisorMap[key] ? advisorMap[key] : (it.CreatedByName || it.CreatorName || key)) : null;
                if (key && !map.has(key)) map.set(key, name);
            }
        }
        if (advisorMap) {
            for (const k of Object.keys(advisorMap)) if (!map.has(k)) map.set(k, advisorMap[k]);
        }
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    })();
    const [regionOptions, setRegionOptions] = useState([])

    // Fetch distinct regions for the Region dropdown. Prefer the server view; fall back to deriving from current page.
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const r = await fetchWithAuth({ url: `/farms/views/by-region`, method: 'get' })
                const payload = r?.data?.data || r?.data || r
                const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.recordset) ? payload.recordset : []);
                if (rows && rows.length > 0) {
                    const set = new Set();
                    for (const row of rows) {
                        const rv = (row.Region || row.FarmRegion || row.region || null)
                        if (rv) set.add(String(rv))
                    }
                    if (!cancelled) setRegionOptions(Array.from(set).sort().map(v => ({ value: v, label: v })))
                    return
                }
            } catch (e) { /* ignore and fallback */ }

            // fallback: derive from current list
            try {
                const set = new Set();
                if (Array.isArray(list)) {
                    for (const it of list) {
                        const val = pickFirst(it, regionAliases) || findByKeySubstring(it, ['region', 'regionname', 'region_label']);
                        if (val) set.add(String(val));
                    }
                }
                if (!cancelled) setRegionOptions(Array.from(set).sort().map(v => ({ value: v, label: v })))
            } catch (e) { if (!cancelled) setRegionOptions([]) }
        })()
        return () => { cancelled = true }
    }, [fetchWithAuth, list])

    useEffect(() => { fetchList({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }) }, [pagination.pageIndex, pagination.pageSize]);

    // Debounced search: when searchQuery changes, reset to first page and fetch filtered list
    useEffect(() => {
        const t = setTimeout(() => {
            setPagination(p => ({ ...p, pageIndex: 0 }));
            fetchList({ pageIndex: 0, pageSize: pagination.pageSize, search: searchQuery || null });
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery, pagination.pageSize]);

    useEffect(() => { fetchFarmTypes() }, []);

    const fetchFarmTypes = async () => {
        try {
            setFarmTypesLoadError(null);
            const res = await fetchWithAuth({ url: `/farm-types/views/active`, method: 'get' });
            const payload = res.data?.data || res.data;
            // tolerant parsing
            let arr = null;
            if (Array.isArray(payload)) arr = payload;
            else if (Array.isArray(payload.items)) arr = payload.items;
            else if (Array.isArray(payload.recordset)) arr = payload.recordset;
            else if (Array.isArray(payload.rows)) arr = payload.rows;
            else if (Array.isArray(payload.data)) arr = payload.data;
            if (!arr && payload && typeof payload === 'object') {
                for (const k of Object.keys(payload)) if (Array.isArray(payload[k])) { arr = payload[k]; break; }
            }
            setFarmTypes(arr || []);
            if (!arr || arr.length === 0) {
                // treat empty result as non-fatal but note for the user
                setFarmTypesLoadError('No farm types found. You can still enter a farm but Farm Type will be saved as provided.');
            }
        } catch (err) {
            // Surface a friendly message so the user knows why the dropdown may be empty
            const msg = err?.response?.data?.message || err?.message || 'Failed to load farm types';
            console.debug('Failed to load farm types', msg);
            setFarmTypes([]);
            setFarmTypesLoadError('Failed to load farm types. You can still enter a farm but the dropdown is unavailable.');
        }
    };

    const exportFarms = async () => {
        setLoading(true); setError(null);
        try {
            try {
                const res = await fetchWithAuth({ url: `/farms/report`, method: 'get' });
                const rows = res?.data?.data || res?.data || null;
                if (rows && Array.isArray(rows) && rows.length > 0) {
                    const csvText = toCsv(rows);
                    const blob = new Blob([csvText], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'farms_report.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                    return;
                }
            } catch (e) { }

            // fallback to client data export
            const rows = Array.isArray(list) ? list : [];
            if (rows.length === 0) { setError('No data to export'); return; }
            const csvText = toCsv(rows);
            const blob = new Blob([csvText], { type: 'text/csv' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'farms_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } catch (err) { setError(err?.message || 'Export failed') } finally { setLoading(false) }
    };

    // auto-open error modal when `error` is set
    useEffect(() => {
        if (error) setShowErrorModal(true);
    }, [error]);

    const getErrorMessage = (err) => {
        try {
            const data = err?.response?.data || err?.data || null;
            if (!data) return err?.message || String(err);
            if (typeof data === 'string') return data;
            if (data.message) return data.message;
            if (data.error) return data.error;
            return JSON.stringify(data);
    } catch { return err?.message || 'Unknown error' }
    };

    // utility: pick the first defined/non-empty value from an object for a list of possible keys
    const extractScalar = (v) => {
        if (v === undefined || v === null) return '';
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
        if (Array.isArray(v) && v.length > 0) return extractScalar(v[0]);
        if (typeof v === 'object') {
            // try common scalar keys (both camel and snake/case variants)
            const keys = ['Region', 'RegionName', 'region', 'regionName', 'region_name', 'name', 'label', 'Name', 'Label', 'CityTown', 'City', 'Town', 'city', 'town', 'Zone', 'zone', 'ZoneName', 'Wereda', 'Woreda', 'wereda', 'woreda'];
            for (const k of keys) {
                if (v[k] !== undefined && v[k] !== null && String(v[k]).trim() !== '') return String(v[k]);
            }
            // try toString
            try { const s = JSON.stringify(v); if (s && s !== '{}') return s; } catch { /* ignore circular */ }
            return '';
        }
        return '';
    };

    // Safe recursive search for candidate keys in nested objects (bounded depth and seen set to avoid cycles)
    const findKeyRec = (obj, keys, maxDepth = 3, seen = new Set()) => {
        if (!obj || typeof obj !== 'object' || maxDepth < 0) return null;
        if (seen.has(obj)) return null;
        seen.add(obj);
        for (const k of keys) {
            if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null) return obj[k];
        }
        // traverse object properties (but not long strings or arrays of primitives)
        for (const prop of Object.keys(obj)) {
            try {
                const val = obj[prop];
                if (val && typeof val === 'object') {
                    const found = findKeyRec(val, keys, maxDepth - 1, seen);
                    if (found !== null && found !== undefined) return found;
                }
            } catch { /* ignore property access errors */ }
        }
        return null;
    };

    const pickFirst = (obj, keys) => {
        if (!obj || typeof obj !== 'object') return '';
        for (const k of keys) {
            const v = obj[k];
            if (v !== undefined && v !== null) {
                const s = extractScalar(v);
                if (s !== '') return s;
            }
        }
        // try a bounded recursive search for nested/aliased keys
        try {
            const found = findKeyRec(obj, keys, 3, new Set());
            if (found !== null && found !== undefined) {
                const s = extractScalar(found);
                if (s !== '') return s;
            }
    } catch { /* swallow */ }
        return '';
    };

    // pickFirst that also returns which key matched (for debugging and finer mapping)
    const pickFirstWithKey = (obj, keys) => {
        if (!obj || typeof obj !== 'object') return { value: '', key: null };
        for (const k of keys) {
            const v = obj[k];
            if (v !== undefined && v !== null) {
                const s = extractScalar(v);
                if (s !== '') return { value: s, key: k };
            }
        }
        try {
            const found = findKeyRec(obj, keys, 3, new Set());
            if (found !== null && found !== undefined) {
                const s = extractScalar(found);
                if (s !== '') return { value: s, key: '__nested__' };
            }
    } catch { /* swallow */ }
        return { value: '', key: null };
    };

    // Heuristic: recursively search object keys for substrings (e.g. 'region','zone','wered','city') and return the first scalar found
    const findByKeySubstring = (obj, substrings, maxDepth = 4, seen = new Set()) => {
        if (!obj || typeof obj !== 'object' || maxDepth < 0) return null;
        if (seen.has(obj)) return null;
        seen.add(obj);
        for (const k of Object.keys(obj)) {
            try {
                const lower = String(k).toLowerCase();
                if (substrings.some(s => lower.includes(s))) {
                    const v = obj[k];
                    const s = extractScalar(v);
                    if (s) return s;
                }
                const val = obj[k];
                if (val && typeof val === 'object') {
                    const found = findByKeySubstring(val, substrings, maxDepth - 1, seen);
                    if (found) return found;
                }
            } catch { /* ignore */ }
        }
        return null;
    };

    // Common alias lists (shared between list rendering and mapFarmToForm)
    const regionAliases = ['Region', 'RegionName', 'LocationRegion', 'Area', 'RegionLabel', 'region', 'regionName', 'Region_Name', 'RegionInfo', 'RegionDescription'];
    const zoneAliases = ['Zone', 'ZoneName', 'zone', 'ZoneInfo', 'ZoneLabel'];
    const weredaAliases = ['Wereda', 'Woreda', 'District', 'wereda', 'woreda', 'DistrictName'];
    const cityAliases = ['CityTown', 'City', 'Town', 'City_Town', 'city', 'town', 'Municipality'];

    // Map a farm record (from list or API) to the form shape used in the modal.
    const mapFarmToForm = (d) => {
        if (!d || typeof d !== 'object') return { ...initialForm };
        // handle nested structures and multiple property name variants
        const FarmTypeID = pickFirst(d, ['FarmTypeID', 'farmTypeID', 'FarmTypeId', 'FarmType', 'TypeID']);
        const FarmType = pickFirst(d, ['FarmTypeName', 'FarmType', 'TypeName', 'Type', 'FarmTypeLabel']);
        const Latitude = pickFirst(d, ['Latitude', 'latitude', 'GPSLat', 'Lat']);
        const Longitude = pickFirst(d, ['Longitude', 'longitude', 'GPSLon', 'Lon']);
        const IsActive = d.IsActive === undefined ? (d.isActive === undefined ? true : !!d.isActive) : !!d.IsActive;

    const rFound = pickFirstWithKey(d, regionAliases);
    const zFound = pickFirstWithKey(d, zoneAliases);
    const wFound = pickFirstWithKey(d, weredaAliases);
    const cFound = pickFirstWithKey(d, cityAliases);

        const result = {
            FarmName: pickFirst(d, ['FarmName', 'Name', 'Farm']),
            FarmCode: pickFirst(d, ['FarmCode', 'Code']),
            Address: pickFirst(d, ['Address', 'Street', 'Location', 'Addr']),
            Zone: zFound.value || pickFirst(d, ['Zone', 'ZoneName', 'zone']) || findByKeySubstring(d, ['zone', 'zonename']),
            Wereda: wFound.value || pickFirst(d, ['Wereda', 'Woreda', 'District']) || findByKeySubstring(d, ['wereda', 'woreda', 'district']),
            Region: rFound.value || pickFirst(d, ['Region', 'RegionName', 'region']) || findByKeySubstring(d, ['region', 'regionname']),
            CityTown: cFound.value || pickFirst(d, ['CityTown', 'City', 'Town']) || findByKeySubstring(d, ['city', 'town', 'municipality', 'kebele']),
            GPSLocation: pickFirst(d, ['GPSLocation', 'gpsLocation', 'GPS', 'GPSCoords', 'GPS_Location']),
            FarmSize: pickFirst(d, ['FarmSize', 'Size']),
            FarmTypeID,
            OwnerName: pickFirst(d, ['OwnerName', 'FarmOwner', 'Owner', 'FarmerName']),
            FarmerID: pickFirst(d, ['FarmerID', 'OwnerID', 'FarmerId', 'farmerId', 'Farmer']) || '',
            ContactPhone: pickFirst(d, ['ContactPhone', 'ContactNumber', 'Phone', 'WorkPhone']),
            IsActive,
        };
        // Debug: show which alias matched for location fields
        try {
            console.debug('mapFarmToForm input:', d);
            console.debug('mapFarmToForm resolved keys:', { Region: rFound, Zone: zFound, Wereda: wFound, CityTown: cFound });
            console.debug('mapFarmToForm result:', result);
    } catch { /* ignore logging errors */ }
        return result;
    };

    const fetchList = async ({ pageIndex = 0, pageSize = 10, search = null, sortColumn = null, sortDir = null, filters = {} } = {}) => {
        setLoading(true); setError(null);
        try {
            const pageNumber = (typeof pageIndex === 'number') ? (pageIndex + 1) : 1;
            const qs = new URLSearchParams();
            qs.append('PageNumber', String(pageNumber));
            qs.append('PageSize', String(pageSize));

            // prefer explicit args, otherwise fall back to component state
            const SearchTerm = (search !== null && search !== undefined) ? search : (filters.SearchTerm ?? searchQuery ?? null);
            const FarmTypeID = (filters.FarmTypeID ?? filterFarmTypeID) || null;
            const Region = (filters.Region ?? filterRegion) || null;
            const Zone = (filters.Zone ?? filterZone) || null;
            const Wereda = (filters.Wereda ?? filterWereda) || null;
            const CityTown = (filters.CityTown ?? filterCityTown) || null;
            const FarmSizeMin = (filters.FarmSizeMin !== undefined) ? filters.FarmSizeMin : (filterFarmSizeMin || null);
            const FarmSizeMax = (filters.FarmSizeMax !== undefined) ? filters.FarmSizeMax : (filterFarmSizeMax || null);
            const CreatedDateFrom = (filters.CreatedDateFrom ?? filterCreatedFrom) || null;
            const CreatedDateTo = (filters.CreatedDateTo ?? filterCreatedTo) || null;
            const CreatedByID = (filters.CreatedByID ?? filters.EmployeeID ?? filters.employeeId ?? filters.createdById ?? null) || null;
            const CreatedByName = (filters.CreatedByName ?? filters.createdByName ?? filters.CreatedBy ?? filters.createdBy ?? null) || null;
            const FarmCode = (filters.FarmCode ?? filters.farmCode ?? null) || null;
            const FarmName = (filters.FarmName ?? filters.farmName ?? null) || null;
            const IsActive = (filters.IsActive !== undefined && filters.IsActive !== null) ? filters.IsActive : (filterIsActive === 'All' ? null : (filterIsActive === 'Active' ? 1 : 0));
            const IncludeDeleted = (filters.IncludeDeleted !== undefined) ? (filters.IncludeDeleted ? 1 : 0) : (filterIncludeDeleted ? 1 : 0);

            if (SearchTerm) qs.append('SearchTerm', SearchTerm);
            if (FarmTypeID) qs.append('FarmTypeID', FarmTypeID);
            if (Region) qs.append('Region', Region);
            if (Zone) qs.append('Zone', Zone);
            if (Wereda) qs.append('Wereda', Wereda);
            if (CityTown) qs.append('CityTown', CityTown);
            if (FarmSizeMin) qs.append('FarmSizeMin', String(FarmSizeMin));
            if (FarmSizeMax) qs.append('FarmSizeMax', String(FarmSizeMax));
            if (CreatedDateFrom) qs.append('CreatedDateFrom', String(CreatedDateFrom));
            if (CreatedDateTo) qs.append('CreatedDateTo', String(CreatedDateTo));
            if (CreatedByID) {
                qs.append('CreatedByID', String(CreatedByID));
                console.debug('fetchList: appending CreatedByID filter', CreatedByID, `/farms?${qs.toString()}`);
            }
            if (CreatedByName) {
                qs.append('CreatedByName', String(CreatedByName));
                console.debug('fetchList: appending CreatedByName filter', CreatedByName, `/farms?${qs.toString()}`);
            }
            if (FarmCode) {
                qs.append('FarmCode', String(FarmCode));
            }
            if (FarmName) {
                qs.append('FarmName', String(FarmName));
            }
            if (IsActive !== null) qs.append('IsActive', String(IsActive));
            qs.append('IncludeDeleted', String(IncludeDeleted));

            if (sortColumn) qs.append('SortColumn', sortColumn);
            if (sortDir) qs.append('SortDirection', sortDir);

            // Decide which backend endpoint to call: use /farms/search when advanced filters are present
            const advancedFiltersPresent = Boolean(SearchTerm || FarmTypeID || Region || Zone || Wereda || CityTown || FarmSizeMin || FarmSizeMax || CreatedDateFrom || CreatedDateTo || CreatedByID || CreatedByName || IsActive !== null || IncludeDeleted)
            const endpoint = advancedFiltersPresent ? '/farms/search' : '/farms'
            // Debug: log final outgoing request for troubleshooting filters
            try { console.debug('fetchList: final request', { endpoint, url: `${endpoint}?${qs.toString()}`, filters, builtQuery: qs.toString() }); } catch (e) {}
            const res = await fetchWithAuth({ url: `${endpoint}?${qs.toString()}`, method: 'get' });
            const payload = res.data?.data || res.data;
            try { console.debug('fetchList response summary', { url: '/farms', payloadShape: Object.prototype.toString.call(payload), payloadSample: Array.isArray(payload) ? payload.length : (payload && typeof payload === 'object' ? Object.keys(payload).slice(0,5) : null) }); } catch(e) {}

            // If API returns paged shape { items, total }
            if (payload && typeof payload === 'object' && (payload.items || payload.total !== undefined)) {
                const items = Array.isArray(payload.items) ? payload.items : [];
                const total = payload.total || payload.totalCount || payload.TotalCount || 0;
                setList(items || []);
                setTotalRows(Number(total) || 0);
                try { console.debug('fetchList setList paged', { items: items.length, total }); } catch (e) {}
            } else {
                // tolerant parsing for different API shapes (legacy)
                const arr = (arrCandidate => {
                    if (!arrCandidate) return null;
                    if (Array.isArray(arrCandidate)) return arrCandidate;
                    if (Array.isArray(arrCandidate.items)) return arrCandidate.items;
                    if (Array.isArray(arrCandidate.recordset)) return arrCandidate.recordset;
                    if (Array.isArray(arrCandidate.rows)) return arrCandidate.rows;
                    if (Array.isArray(arrCandidate.data)) return arrCandidate.data;
                    // try to find first array-valued prop
                    for (const k of Object.keys(arrCandidate)) {
                        if (Array.isArray(arrCandidate[k])) return arrCandidate[k];
                    }
                    return null;
                })(payload);

                if (arr) {
                    setList(arr);
                    setTotalRows(arr.length);
                    try { console.debug('fetchList setList (legacy)', { listLength: (arr || []).length }); } catch(e) {}
                } else {
                    // fallback: if payload is an object with farm-like keys, wrap it
                    if (payload && typeof payload === 'object' && (payload.FarmID || payload.FarmName)) {
                        setList([payload]);
                        setTotalRows(1);
                    } else {
                        console.debug('fetchList /farms: unexpected payload', payload);
                        setList([]);
                        setTotalRows(0);
                    }
                }
            }
        } catch (err) {
            setError(getErrorMessage(err));
            if (err?.response?.status === 401) navigate('/login');
        } finally { setLoading(false) }
    };

    // Resolve FarmType names for the current list by calling /api/farm-types/:id and caching results
    useEffect(() => {
        if (!Array.isArray(list) || list.length === 0) return;
        const ids = new Set();
        for (const f of list) {
            const id = f?.FarmTypeID || f?.farmTypeID || f?.FarmType || null;
            if (id) ids.add(String(id));
        }
        const toResolve = Array.from(ids).filter(id => id && !farmTypeNameCache[id]);
        if (toResolve.length === 0) return;

        let cancelled = false;
        (async () => {
            const updates = {};
                await Promise.all(toResolve.map(async (id) => {
                try {
                    const r = await fetchWithAuth({ url: `/farm-types/${encodeURIComponent(id)}`, method: 'get' });
                    const payload = r?.data?.data || r?.data || r;
                    let rec = payload;
                    if (Array.isArray(payload)) rec = payload[0];
                    else if (payload && payload.recordset && Array.isArray(payload.recordset)) rec = payload.recordset[0];
                    const name = (rec && (rec.TypeName || rec.Type || rec.Name || rec.Label)) || String(id);
                    updates[id] = name;
                } catch {
                    updates[id] = String(id);
                }
            }));
            if (!cancelled) setFarmTypeNameCache(prev => ({ ...prev, ...updates }));
        })();
        return () => { cancelled = true; };
    }, [list]);

    // Resolve CreatedBy -> advisor names for farms listing
    useEffect(() => {
        if (!Array.isArray(list) || list.length === 0) return;
        const ids = new Set();
        for (const f of list) {
            const id = f?.CreatedBy || f?.createdBy || f?.CreatedById || f?.CreatedByID || null;
            if (id) ids.add(String(id));
        }
        const toResolve = Array.from(ids).filter(id => id && !advisorMap[id]);
        if (toResolve.length === 0) return;

        let cancelled = false;
        (async () => {
            const updates = {};
            await Promise.all(toResolve.map(async (id) => {
                try {
                    const r = await fetchWithAuth({ url: `/users/advisor-by-createdby/${encodeURIComponent(id)}`, method: 'get' });
                    const payload = r?.data?.data || r?.data || r;
                    const rec = Array.isArray(payload) ? payload[0] : payload;
                    const first = rec?.AdvisorFirstName || rec?.FirstName || rec?.AdvisorName || '';
                    const father = rec?.AdvisorFatherName || rec?.FatherName || '';
                    const name = [first, father].filter(Boolean).join(' ') || id;
                    updates[id] = name;
                } catch (e) {
                    updates[id] = id;
                }
            }));
            if (!cancelled) setAdvisorMap(prev => ({ ...(prev || {}), ...updates }));
        })();
        return () => { cancelled = true; };
    }, [list, fetchWithAuth, advisorMap]);

    // adjust pageIndex if totalRows shrinks or pageSize changes
    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(totalRows / pagination.pageSize));
        if (pagination.pageIndex >= pageCount) {
            setPagination(p => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }));
        }
    }, [totalRows, pagination.pageSize]);

    const openCreate = () => { setEditingId(null); setForm(initialForm); setOriginalForm(initialForm); setFieldErrors({}); setShowForm(true) };

    const openEdit = async (idOrObj) => {
        // Accept either an id string or the farm object from the list.
        setError(null);
        // Accept either an id string or the farm object from the list.
        setLoading(true);
        try {
            let id = null;
            if (idOrObj && typeof idOrObj === 'object') {
                id = idOrObj.FarmID || idOrObj.id || idOrObj.FarmId || null;
            } else {
                id = idOrObj;
            }

            if (!id) {
                // No id available; fall back to using the provided object if any
                if (idOrObj && typeof idOrObj === 'object') {
                    setForm(mapFarmToForm(idOrObj));
                    setEditingId(idOrObj.FarmID || idOrObj.id || idOrObj.FarmId || null);
                    setShowForm(true);
                    return;
                }
                return setError('Farm ID is required to edit');
            }

            // Always fetch the authoritative record from backend (include deleted) to ensure modal has full/consistent shape
            try {
                const res = await fetchWithAuth({ url: `/farms/${encodeURIComponent(id)}?includeDeleted=1`, method: 'get' });
                const d = res.data?.data || res.data;
                if (d) {
                        const mapped = mapFarmToForm(d);
                        setForm(mapped);
                        setOriginalForm(mapped);
                        setEditingId(id);
                        setShowForm(true);
                        return;
                    }
            } catch (fetchErr) {
                // if fetch fails, fallback to using the supplied object (if present) so editing is still possible
                if (idOrObj && typeof idOrObj === 'object') {
                    console.debug('openEdit: backend fetch failed, falling back to list object', fetchErr);
                    setForm(mapFarmToForm(idOrObj));
                    setEditingId(id);
                    setShowForm(true);
                    return;
                }
                throw fetchErr;
            }
        } catch (err) {
            setError(getErrorMessage(err) || 'Failed to load');
            if (err?.response?.status === 401) navigate('/login');
        } finally { setLoading(false) }
    };

    const validateForm = (f) => {
        const errs = {};
        if (!f.FarmName) errs.FarmName = 'Farm name is required';
        // Require a FarmerID (owner) because backend stored-proc now enforces it
        if (!f.FarmerID) errs.OwnerName = 'Owner is required. Please select from the dropdown';
        if (!f.FarmTypeID) errs.FarmTypeID = 'Farm type is required';
        if (!validators.phone(f.ContactPhone)) errs.ContactPhone = 'Invalid phone number';
        if (!validators.email(f.ContactEmail)) errs.ContactEmail = 'Invalid email address';
        if (!validators.farmStatus(f.FarmStatus)) errs.FarmStatus = 'Invalid farm status';
        return errs;
    };

    const handleChange = async (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'FarmTypeID') {
            // when a FarmType is selected, also store a friendly name for backward compatibility
            const id = value;
            const sel = farmTypes.find(f => (f.FarmTypeID || f.Id || f.id || f.ID || '').toString() === id?.toString());
            const friendly = sel ? (sel.TypeName || sel.Type || sel.Name || sel.Label || '') : '';
            setForm(s => ({ ...s, FarmTypeID: id, FarmType: friendly }));
            return;
        }

        // Update local form state first
        setForm(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }));

        // If toggling IsActive while editing an existing farm, call the dedicated toggle endpoint
        if (name === 'IsActive' && editingId) {
            setLoading(true); setError(null);
            try {
                const setActive = type === 'checkbox' ? checked : (value === 'true' || value === '1');
                await fetchWithAuth({ url: `/farms/${editingId}/active`, method: 'post', data: { UserID: user?.UserID || user?.id, SetActive: setActive } });
                // refresh list and current form with authoritative data
                await fetchList();
                // attempt to re-open the edited farm into form to show updated state
                try { await openEdit(editingId); } catch (e) { /* ignore */ }
            } catch (err) {
                setError(getErrorMessage(err) || 'Failed to update active status');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setFieldErrors({}); setError(null);
        const errs = validateForm(form);
        if (Object.keys(errs).length) { setFieldErrors(errs); return }

        // Prepare payload but do not send yet — show confirm modal first
        const payload = { ...form, FarmTypeID: form.FarmTypeID || null, CreatedBy: user?.UserID || user?.id };
        if (payload.FarmStatus !== undefined && payload.FarmStatus !== null) {
            try {
                const s = String(payload.FarmStatus).trim().toLowerCase();
                if (s === 'inactive' || s === '0' || s === 'false') payload.IsActive = false;
                else if (s === 'active' || s === '1' || s === 'true') payload.IsActive = true;
            } catch (e) { /* ignore */ }
        }
        payload.IsActive = payload.IsActive === undefined || payload.IsActive === null ? !!form.IsActive : !!payload.IsActive;

        // compute a simple diff between originalForm and payload
        const computeChanges = (oldObj = {}, newObj = {}) => {
            const changes = [];
            const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
            for (const k of keys) {
                try {
                    const oldVal = oldObj && oldObj[k] !== undefined && oldObj[k] !== null ? String(oldObj[k]) : '';
                    const newVal = newObj && newObj[k] !== undefined && newObj[k] !== null ? String(newObj[k]) : '';
                    if (oldVal !== newVal) {
                        changes.push({ key: k, label: k, oldValue: oldVal, newValue: newVal });
                    }
                } catch (e) { /* ignore */ }
            }
            return changes;
        };

        setPendingSavePayload(payload);
        setPendingSaveIsEdit(!!editingId);
        setPendingSaveChanges(computeChanges(originalForm || {}, payload));
        setShowSaveConfirm(true);
    };

    const doSaveConfirmed = async () => {
        if (!pendingSavePayload) return;
        setShowSaveConfirm(false);
        setLoading(true); setError(null);
        try {
            if (pendingSaveIsEdit && editingId) {
                await fetchWithAuth({ url: `/farms/${editingId}`, method: 'put', data: { ...pendingSavePayload, UpdatedBy: user?.UserID || user?.id } });
            } else {
                await fetchWithAuth({ url: `/farms`, method: 'post', data: pendingSavePayload });
            }
            setShowForm(false); setPendingSavePayload(null); fetchList();
        } catch (err) {
            setError(getErrorMessage(err) || 'Save failed');
            if (err?.response?.status === 401) navigate('/login');
        } finally { setLoading(false) }
    };

    const confirmDelete = (it) => { setDeleteTarget(it); setShowDelete(true) };
    const doDelete = async () => {
        if (!deleteTarget) return;
        setLoading(true); setError(null);
        try {
            // Backend expects a DELETE to /api/farms/:id for soft delete
            await fetchWithAuth({ url: `/farms/${deleteTarget.FarmID}`, method: 'delete', data: { DeletedBy: user?.UserID || user?.id } });
            setShowDelete(false); setDeleteTarget(null); fetchList();
        } catch (err) { setError(getErrorMessage(err) || 'Delete failed') } finally { setLoading(false) }
    };

    const restoreFarm = async (farm) => {
        setLoading(true); setError(null);
        try {
            await fetchWithAuth({ url: `/farms/${farm.FarmID}/restore`, method: 'post', data: { RestoredBy: user?.UserID || user?.id } });
            fetchList();
        } catch (err) { setError(getErrorMessage(err) || 'Restore failed') } finally { setLoading(false) }
    };

    const permanentDelete = async (farm) => {
        if (window.confirm('Are you sure you want to permanently delete this farm? This action cannot be undone.')) {
            setLoading(true); setError(null);
            try {
                // Backend route for permanent delete is DELETE /api/farms/permanent/:id
                await fetchWithAuth({ url: `/farms/permanent/${farm.FarmID}`, method: 'delete', data: { DeletedBy: user?.UserID || user?.id } });
                fetchList();
            } catch (err) { setError(getErrorMessage(err) || 'Permanent delete failed') } finally { setLoading(false) }
        }
    };

    const handleBulkFile = (e) => setBulkFile(e.target.files?.[0] || null);
    const uploadBulk = async () => {
        if (!bulkFile) return;
        setLoading(true); setError(null);
        try {
            const text = await bulkFile.text();
            const lines = text.split(/\r?\n/).filter(Boolean);
            const rows = lines.map((l, idx) => {
                if (idx === 0 && l.toLowerCase().includes('farmname')) return null;
                const cols = l.split(',').map(c => c.trim());
                return {
                    FarmName: cols[0] || null, FarmType: cols[1] || null, FarmOwner: cols[2] || null,
                    ContactPerson: cols[3] || null, ContactPhone: cols[4] || null, ContactEmail: cols[5] || null,
                    Address: cols[6] || null, Region: cols[7] || null, Zone: cols[8] || null, Woreda: cols[9] || null, Kebele: cols[10] || null,
                    FarmStatus: cols[11] || null, OwnershipType: cols[12] || null, ProductionSystem: cols[13] || null,
                    WaterSource: cols[14] || null, FarmSize: cols[15] || null, NumberOfPlots: cols[16] || null,
                    IsActive: cols[17] === undefined ? 1 : (cols[17] === '1' || cols[17] === 'true' ? 1 : 0),
                    Latitude: cols[18] || null, Longitude: cols[19] || null,
                };
            }).filter(Boolean);
            await fetchWithAuth({ url: `/farms/bulk`, method: 'post', data: { FarmData: rows, CreatedBy: user?.UserID || user?.id } });
            setBulkFile(null); fetchList();
        } catch (err) { setError(getErrorMessage(err) || 'Bulk upload failed') } finally { setLoading(false) }
    };

    const downloadTemplate = () => {
        const headers = ['FarmName', 'FarmType', 'FarmOwner', 'ContactPerson', 'ContactPhone', 'ContactEmail', 'Address', 'Region', 'Zone', 'Woreda', 'Kebele', 'FarmStatus', 'OwnershipType', 'ProductionSystem', 'WaterSource', 'FarmSize', 'NumberOfPlots', 'IsActive', 'Latitude', 'Longitude'];
        const example = ['My Farm', 'Dairy', 'John Doe', 'Jane Doe', '0912345678', 'jane@example.com', '123 Main St', 'RegionA', 'ZoneA', 'WoredaA', 'KebeleA', 'Active', 'Private', 'Intensive', 'Borehole', '100', '5', '1', '9.0000', '38.0000'];
        const csv = [headers.join(','), example.join(',')].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'farms_import_template.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    const openGpsModal = (farm) => {
        setGpsFor(farm);
        const lat = farm.Latitude || farm.latitude || '';
        const lon = farm.Longitude || farm.longitude || '';
        setGpsCoords(lat || lon ? `${lat || ''},${lon || ''}` : '');
        setGpsModalOpen(true);
    };

    const handleGpsChange = (e) => {
        const { value } = e.target;
        setGpsCoords(value);
    };

    const updateGps = async () => {
        if (!gpsFor) return;
        setLoading(true); setError(null);
        try {
            const raw = (gpsCoords || '').trim();
            // accept formats like "lat,lon" or "lat lon"
            const m = raw.match(/(-?\d+\.?\d*)[ ,]+(-?\d+\.?\d*)/);
            if (!m) {
                setError('Invalid coordinates. Use format: lat,lon');
                setLoading(false);
                return;
            }
            const lat = m[1];
            const lon = m[2];
            const gpsLocation = `${lat},${lon}`;
            await fetchWithAuth({ url: `/farms/${gpsFor.FarmID}/gps`, method: 'put', data: { GPSLocation: gpsLocation, UpdatedBy: user?.UserID || user?.id } });
            setGpsModalOpen(false); setGpsFor(null); setGpsCoords(''); fetchList();
        } catch (err) { setError(getErrorMessage(err) || 'GPS update failed') } finally { setLoading(false) }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }
        setGpsLoading(true); setError(null);
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude.toFixed(6);
            const lon = pos.coords.longitude.toFixed(6);
            setGpsCoords(`${lat},${lon}`);
            setGpsLoading(false);
        }, (err) => {
            setGpsLoading(false);
            setError(err?.message || 'Failed to get location');
        }, { enableHighAccuracy: true, timeout: 10000 });
    };

    // Farm form fields are rendered by `FarmForm` component (see ./FarmForm.jsx)

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
                    active={'farms'}
                    onChange={() => {}}
                    onClose={() => setSidebarOpen(false)}
                    width={280}
                    minWidth={82}
                />
            )}

            <main style={{ paddingTop: inDashboard ? 0 : HEADER_HEIGHT }} className="text-left flex-1 p-6 bg-gray-100 dark:bg-gray-900">
                <div className="relative text-left bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                    {loading && (
                        <div className="absolute inset-0 z-50 bg-white bg-opacity-60 flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    )}
                <div className="text-left flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div className="w-full md:flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center"><span className="mr-3 text-indigo-600"><FaBuilding /></span>Manage Farms</h2>
                    </div>

                    <div className="flex w-full sm:w-auto justify-end flex-col sm:flex-row sm:flex-nowrap items-stretch sm:items-center gap-2 mt-4 md:mt-0 md:ml-4">
                        <ListHeaderWithFilter
                            title=""
                            icon={null}
                            selectOptions={farmTypes}
                            onApplyFilters={(filters) => {
                                // merge with existing filters and refresh
                                const merged = {
                                    pageIndex: 0,
                                    pageSize: pagination.pageSize,
                                };
                                // apply supported filter keys
                                const apiFilters = {
                                    SearchTerm: filters.SearchTerm || null,
                                    FarmTypeID: filters.FarmTypeID || null,
                                    CreatedDateFrom: filters.CreatedDateFrom || null,
                                    CreatedDateTo: filters.CreatedDateTo || null,
                                };
                                // call fetchList with explicit filters
                                setPagination(p => ({ ...p, pageIndex: 0 }));
                                fetchList({ pageIndex: 0, pageSize: pagination.pageSize, filters: apiFilters });
                            }}
                            onClear={() => {
                                // reset advanced filters as well
                                setFilterRegion(''); setFilterZone(''); setFilterWereda(''); setFilterCityTown(''); setFilterFarmTypeID(''); setFilterFarmSizeMin(''); setFilterFarmSizeMax(''); setFilterCreatedFrom(''); setFilterCreatedTo(''); setFilterIsActive('All'); setFilterIncludeDeleted(false);
                                setPagination(p => ({ ...p, pageIndex: 0 }));
                                fetchList({ pageIndex: 0, pageSize: pagination.pageSize });
                            }}
                        />
                        <button onClick={openCreate} disabled={loading} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm whitespace-nowrap">
                            <FaPlus className="mr-2" /> New Farm
                        </button>
                        <div className="relative w-full sm:w-auto">
                            <input type="file" disabled={loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleBulkFile} />
                            <button disabled={loading} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700 text-sm whitespace-nowrap">
                                <FaFileCsv className="mr-2" /> {bulkFile ? 'File Selected' : 'Bulk Upload'}
                            </button>
                        </div>
                        {bulkFile && (
                            <button onClick={uploadBulk} disabled={loading || gpsLoading} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 text-sm whitespace-nowrap">
                                Upload
                            </button>
                        )}
                        <button onClick={downloadTemplate} disabled={loading} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm whitespace-nowrap">
                            <FaDownload className="mr-2" /> Template
                        </button>
                        <button onClick={exportFarms} disabled={loading} className="flex items-center justify-center w-full sm:w-auto px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm whitespace-nowrap">
                            <FaFileCsv className="mr-2" /> Export
                        </button>
                    </div>
                </div>
                {/* Pagination controls moved to bottom of list */}

                {error ? <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg">An error occurred. Please try again.</div> : null}
                <AlertModal open={showErrorModal} title="Error" message={"An unexpected error occurred. Please try again or contact support."} details={error} onClose={() => { setShowErrorModal(false); setError(null); }} />

                <div className="flex items-center space-x-2 mb-4">
                    <div className="flex items-center w-full md:w-1/3 relative">
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    setPagination(p => ({ ...p, pageIndex: 0 }));
                                    fetchList({ pageIndex: 0, pageSize: pagination.pageSize, search: searchQuery || null });
                                }
                            }}
                            placeholder="Search farms by name, code, owner..."
                            className="form-input w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                        />

                        {/* Clear button (visible when there is text) */}
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setPagination(p => ({ ...p, pageIndex: 0 }));
                                    fetchList({ pageIndex: 0, pageSize: pagination.pageSize, search: null });
                                }}
                                title="Clear search"
                                disabled={loading}
                                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                            >
                                <FaTimes />
                            </button>
                        ) : null}

                        {/* Search button: triggers immediate search */}
                        <button
                            type="button"
                            onClick={() => { setPagination(p => ({ ...p, pageIndex: 0 })); fetchList({ pageIndex: 0, pageSize: pagination.pageSize, search: searchQuery || null }); }}
                            title="Search"
                            disabled={loading}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-r-md hover:bg-indigo-700"
                        >
                            <FaSearch />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => fetchList({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize, search: searchQuery || null })} disabled={loading} className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                            <FaSync className="mr-2" /> Refresh
                        </button>
                    </div>
                </div>

                
                {farmTypesLoadError ? (
                    <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded">
                        {farmTypesLoadError}
                    </div>
                ) : null}

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 uppercase">
                            <tr>
                                {visibleCols.has('rowNumber') && (<th className="px-4 py-3">#</th>)}
                                {visibleCols.has('farmCode') && (
                                    <th className="px-4 py-3">
                                        <ColumnHeaderFilter
                                            title="Farm Code"
                                            columnKey="farmCode"
                                            type="text"
                                            value={columnFilters?.farmCode || ''}
                                            onApply={(v) => applyColumnFilter('farmCode', v)}
                                            onClear={() => clearColumnFilter('farmCode')}
                                        />
                                    </th>
                                )}
                                {visibleCols.has('farmName') && (
                                    <th className="px-4 py-3">
                                        <ColumnHeaderFilter
                                            title="Farm Name"
                                            columnKey="farmName"
                                            type="text"
                                            value={columnFilters?.farmName || ''}
                                            onApply={(v) => applyColumnFilter('farmName', v)}
                                            onClear={() => clearColumnFilter('farmName')}
                                        />
                                    </th>
                                )}
                                {visibleCols.has('type') && (
                                    <th className="px-4 py-3">
                                        <ColumnHeaderFilter
                                            title="Type"
                                            columnKey="type"
                                            type="select"
                                            options={(farmTypes || []).map(ft => ({ value: String(ft.FarmTypeID || ft.Id || ft.id || ft.ID || ''), label: ft.TypeName || ft.Type || ft.Name || ft.Label || String(ft.FarmTypeID || ft.Id || '') }))}
                                            value={columnFilters?.type || ''}
                                            onApply={(v) => applyColumnFilter('type', v)}
                                            onClear={() => clearColumnFilter('type')}
                                        />
                                    </th>
                                )}
                                {visibleCols.has('owner') && (
                                    <th className="px-4 py-3">
                                        <ColumnHeaderFilter
                                            title="Owner"
                                            columnKey="owner"
                                            type="text"
                                            value={columnFilters?.owner || ''}
                                            onApply={(v) => applyColumnFilter('owner', v)}
                                            onClear={() => clearColumnFilter('owner')}
                                        />
                                    </th>
                                )}
                                {visibleCols.has('contact') && (
                                    <th className="px-4 py-3">
                                        <ColumnHeaderFilter
                                            title="Contact"
                                            columnKey="contact"
                                            type="text"
                                            value={columnFilters?.contact || ''}
                                            onApply={(v) => applyColumnFilter('contact', v)}
                                            onClear={() => clearColumnFilter('contact')}
                                        />
                                    </th>
                                )}
                                {visibleCols.has('createdBy') && (
                                    <th className="px-4 py-3">
                                        <ColumnHeaderFilter
                                            title="Created By"
                                            columnKey="createdBy"
                                            type="select"
                                            options={createdByOptions}
                                            value={columnFilters?.createdBy || ''}
                                            onApply={(v) => applyColumnFilter('createdBy', v)}
                                            onClear={() => clearColumnFilter('createdBy')}
                                        />
                                    </th>
                                )}
                                {visibleCols.has('region') && (
                                    <th className="px-4 py-3">
                                        <ColumnHeaderFilter
                                            title="Region"
                                            columnKey="region"
                                            type="select"
                                            options={regionOptions}
                                            value={columnFilters?.region || ''}
                                            onApply={(v) => applyColumnFilter('region', v)}
                                            onClear={() => clearColumnFilter('region')}
                                        />
                                    </th>
                                )}
                                {visibleCols.has('status') && (
                                    <th className="px-4 py-3">
                                        <ColumnHeaderFilter
                                            title="Status"
                                            columnKey="status"
                                            type="status"
                                            value={columnFilters?.status || ''}
                                            onApply={(v) => applyColumnFilter('status', v)}
                                            onClear={() => clearColumnFilter('status')}
                                        />
                                    </th>
                                )}
                                {visibleCols.has('actions') && (
                                    <th className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-sm text-gray-700">Actions</span>
                                            <ColumnSelector
                                                columns={defaultFarmCols.map(id => ({ key: id, label: ({ farmCode: 'Farm Code', rowNumber: '#', farmName: 'Farm Name', type: 'Type', owner: 'Owner', contact: 'Contact', createdBy: 'Created By', region: 'Region', status: 'Status', actions: 'Actions' }[id] || id) }))}
                                                visibilityMap={Object.fromEntries(defaultFarmCols.map(id => [id, visibleCols.has(id)]))}
                                                onChange={(next) => {
                                                    setVisibleCols(new Set(Object.keys(next).filter(k => next[k])));
                                                    try { window.localStorage.setItem('farms.columns', JSON.stringify(next)); } catch (e) { }
                                                }}
                                                trigger={<FaColumns className="w-4 h-4 text-gray-600" />}
                                                localStorageKey="farms.columns"
                                            />
                                        </div>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} className="text-center p-4"><LoadingSpinner /></td></tr>
                            ) : list.length === 0 ? (
                                <tr><td colSpan={10} className="text-center p-4">No farms found.</td></tr>
                            ) : (
                                (() => {
                                    const pageIndex = pagination.pageIndex || 0;
                                    const pageSize = pagination.pageSize || 10;
                                    const start = pageIndex * pageSize;
                                    try { console.debug('Farms pagination debug', { totalRows, listLength: list.length, pageIndex, pageSize, start, returnedLength: list.length }); } catch(e) {}
                                    return list.map((it, idx) => (
                                        <tr key={it.FarmID || start + idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            {visibleCols.has('rowNumber') && (<td className="px-4 py-3">{start + idx + 1}</td>)}
                                            {visibleCols.has('farmCode') && (<td className="px-4 py-3">{it.FarmCode || it.Code || ''}</td>)}
                                            {visibleCols.has('farmName') && (<td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{it.FarmName || ''}</td>)}
                                            {visibleCols.has('type') && (<td className="px-4 py-3">{(() => { const idKey = (it?.FarmTypeID || it?.farmTypeID || it?.FarmType || '')?.toString(); return (idKey && farmTypeNameCache[idKey]) ? farmTypeNameCache[idKey] : (it.FarmTypeName || it.FarmType || it.Type || it.FarmTypeCode || ''); })()}</td>)}
                                            {visibleCols.has('owner') && (<td className="px-4 py-3">{it.FarmOwner || it.OwnerName || it.Owner || it.FarmerName || it.ContactPerson || ''}</td>)}
                                            {visibleCols.has('contact') && (<td className="px-4 py-3">{it.ContactPhone || it.ContactNumber || it.Phone || it.WorkPhone || it.ContactEmail || ''}</td>)}
                                            {visibleCols.has('createdBy') && (<td className="px-4 py-3">{(() => { const id = it?.CreatedBy || it?.createdBy || it?.CreatedById || it?.CreatedByID || null; const key = id ? String(id) : ''; return (advisorMap && advisorMap[key]) ? advisorMap[key] : (it.CreatedByName || it.CreatorName || key || ''); })()}</td>)}
                                            {visibleCols.has('region') && (<td className="px-4 py-3">{(() => { const val = pickFirst(it, regionAliases) || findByKeySubstring(it, ['region', 'regionname', 'region_label']); return val || ''; })()}</td>)}
                                            {visibleCols.has('status') && (<td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${it.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{it.IsActive ? 'Active' : 'Inactive'}</span></td>)}
                                            {visibleCols.has('actions') && (<td className="px-4 py-3 flex items-center justify-center space-x-2">
                                                <button onClick={() => openEdit(it)} disabled={loading} className="text-indigo-500 hover:text-indigo-700"><FaEdit /></button>
                                                <button onClick={() => openGpsModal(it)} disabled={loading} className="text-blue-500 hover:text-blue-700"><FaMapMarkerAlt /></button>
                                                {it.DeletedAt ? (
                                                    <>
                                                        <button onClick={() => restoreFarm(it)} disabled={loading} className="text-green-500 hover:text-green-700"><FaUndo /></button>
                                                        <button onClick={() => permanentDelete(it)} disabled={loading} className="text-red-700 hover:text-red-900"><FaTrash /></button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => confirmDelete(it)} disabled={loading} className="text-red-500 hover:text-red-700"><FaTrash /></button>
                                                )}
                                            </td>)}
                                        </tr>
                                    ));
                                })()
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex items-center justify-end text-sm text-gray-600">
                    <span>Total farms: <strong className="ml-1">{Number(totalRows || 0).toLocaleString()}</strong></span>
                </div>
                {/* Pagination controls (bottom) */}
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-sm text-gray-600">Rows per page:</span>
                            <select value={pagination.pageSize} onChange={e => setPagination(p => ({ ...p, pageSize: Number(e.target.value), pageIndex: 0 }))} disabled={loading} className="form-select rounded-md shadow-sm text-sm w-full sm:w-auto">
                                {[10,20,50,100].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="text-sm text-gray-600 sm:ml-4">Page {pagination.pageIndex + 1} of {Math.max(1, Math.ceil(totalRows / pagination.pageSize))}</div>
                    </div>

                    <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                        <Pagination
                            page={Math.max(1, (pagination.pageIndex || 0) + 1)}
                            setPage={(p) => {
                                const np = Number(p) || 1
                                setPagination(prev => ({ ...prev, pageIndex: Math.max(0, np - 1) }))
                            }}
                            total={Number(totalRows || 0)}
                            pageSize={Number(pagination.pageSize || 10)}
                            totalPages={Math.max(1, Math.ceil((Number(totalRows || 0) || 0) / Number(pagination.pageSize || 10)))}
                        />
                    </div>
                </div>
            </div>

            <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Farm' : 'Create New Farm'}>
                <div className="mb-4 flex gap-2">
                    <button type="button" onClick={() => setModalTab('form')} className={`px-3 py-1 rounded ${modalTab==='form' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>Form</button>
                    <button type="button" onClick={() => setModalTab('print')} className={`px-3 py-1 rounded ${modalTab==='print' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>Print Data</button>
                </div>

                {modalTab === 'form' && (
                <FarmForm
                    form={form}
                    setForm={setForm}
                    onFieldChange={handleChange}
                    editingId={editingId}
                    fieldErrors={fieldErrors}
                    farmTypes={farmTypes}
                    loading={loading}
                    onCancel={() => setShowForm(false)}
                    onSubmit={handleSubmit}
                />
                )}

                {modalTab === 'print' && (
                    <FarmPrintForm farmCode={form.FarmCode || form.FarmCode || ''} />
                )}
            </Modal>

            <Modal open={gpsModalOpen} onClose={() => setGpsModalOpen(false)} title={`Update GPS for ${gpsFor?.FarmName}`}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get or enter GPS coordinates in the form <code>lat,lon</code>. Click <strong>Get</strong> to use your device location. The field is read-only.</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Coordinates (lat, lon)</label>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <FaMapMarkerAlt />
                                </div>
                                <input
                                    name="coords"
                                    value={gpsCoords}
                                    onChange={handleGpsChange}
                                    readOnly={true}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                    placeholder="e.g. 9.000000,38.000000"
                                />
                            </div>
                        </div>
                        <div className="shrink-0">
                            <button type="button" onClick={getCurrentLocation} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" disabled={gpsLoading}>
                                {gpsLoading ? 'Getting...' : 'Get'}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button onClick={() => setGpsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button onClick={updateGps} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" disabled={loading}>
                            {loading ? 'Updating...' : 'Update'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal open={showDelete} title="Confirm Deletion" onCancel={() => setShowDelete(false)} onConfirm={doDelete}>
                Are you sure you want to delete farm {deleteTarget?.FarmName}? This will mark it as inactive.
            </ConfirmModal>
            <ConfirmModal
                open={showSaveConfirm}
                title={pendingSaveIsEdit ? 'Confirm Update' : 'Confirm Create'}
                message={pendingSaveIsEdit ? `Are you sure you want to update farm "${form.FarmName || ''}"?` : `Are you sure you want to create farm "${form.FarmName || ''}"?`}
                onCancel={() => setShowSaveConfirm(false)}
                onConfirm={doSaveConfirmed}
                confirmLabel={pendingSaveIsEdit ? 'Update' : 'Create'}
                cancelLabel="Cancel"
                loading={loading}
                changes={pendingSaveChanges}
            />
        </main>
        </>
    );
}