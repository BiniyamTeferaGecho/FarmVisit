import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import FarmForm from './FarmForm';
import FarmPrintForm from '../components/print/forms/FarmPrintForm'
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';
import { FaPlus, FaFileCsv, FaDownload, FaSync, FaChartBar, FaEdit, FaTrash, FaUndo, FaMapMarkerAlt, FaBuilding, FaUser, FaPhone, FaEnvelope, FaGlobe, FaInfoCircle } from 'react-icons/fa';

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

export default function Farms() {
    const { user, fetchWithAuth } = useAuth();
    const navigate = useNavigate();

    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [form, setForm] = useState(initialForm);
    const [farmTypes, setFarmTypes] = useState([]);
    const [farmTypesLoadError, setFarmTypesLoadError] = useState(null);
    const [farmTypeNameCache, setFarmTypeNameCache] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [modalTab, setModalTab] = useState('form');
    const [showDelete, setShowDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [bulkFile, setBulkFile] = useState(null);
    const [gpsModalOpen, setGpsModalOpen] = useState(false);
    const [gpsFor, setGpsFor] = useState(null);
    const [gpsCoords, setGpsCoords] = useState(''); // single string "lat,lon"
    const [gpsLoading, setGpsLoading] = useState(false)
    const [error, setError] = useState(null);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => { fetchList() }, []);

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

    const fetchList = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetchWithAuth({ url: `/farms`, method: 'get' });
            const payload = res.data?.data || res.data;
            try { console.debug('fetchList response summary', { url: '/farms', payloadShape: Object.prototype.toString.call(payload), payloadSample: Array.isArray(payload) ? payload.length : (payload && typeof payload === 'object' ? Object.keys(payload).slice(0,5) : null) }); } catch(e) {}
            // tolerant parsing for different API shapes
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
                try { console.debug('fetchList setList', { listLength: (arr || []).length }); } catch(e) {}
            }
            else {
                // fallback: if payload is an object with farm-like keys, wrap it
                if (payload && typeof payload === 'object' && (payload.FarmID || payload.FarmName)) setList([payload]);
                else {
                    console.debug('fetchList /farms: unexpected payload', payload);
                    setList([]);
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

    // adjust pageIndex if list shrinks or pageSize changes
    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(list.length / pagination.pageSize));
        if (pagination.pageIndex >= pageCount) {
            setPagination(p => ({ ...p, pageIndex: Math.max(0, pageCount - 1) }));
        }
    }, [list, pagination.pageSize]);

    const openCreate = () => { setEditingId(null); setForm(initialForm); setFieldErrors({}); setShowForm(true) };

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
                    setForm(mapFarmToForm(d));
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
        setLoading(true);
        try {
            // Send FarmTypeID to backend (expecting ID not free-text type)
            const payload = { ...form, FarmTypeID: form.FarmTypeID || null, CreatedBy: user?.UserID || user?.id };
            // Always send an explicit IsActive boolean to the backend to avoid NULL (no-change) parameters.
            // Accept either the explicit `IsActive` checkbox from the form or legacy `FarmStatus` values.
            if (payload.FarmStatus !== undefined && payload.FarmStatus !== null) {
                try {
                    const s = String(payload.FarmStatus).trim().toLowerCase();
                    if (s === 'inactive' || s === '0' || s === 'false') payload.IsActive = false;
                    else if (s === 'active' || s === '1' || s === 'true') payload.IsActive = true;
                } catch (e) { /* ignore */ }
            }
            // Ensure IsActive is always present as boolean (fallback to form checkbox state)
            payload.IsActive = payload.IsActive === undefined || payload.IsActive === null ? !!form.IsActive : !!payload.IsActive;
            if (editingId) {
                await fetchWithAuth({ url: `/farms/${editingId}`, method: 'put', data: { ...payload, UpdatedBy: user?.UserID || user?.id } });
            } else {
                await fetchWithAuth({ url: `/farms`, method: 'post', data: payload });
            }
            setShowForm(false); fetchList();
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
        <main className="text-left flex-1 p-6 bg-gray-100 dark:bg-gray-900">
            <div className="text-left bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                <div className="text-left flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <h1 className="text-left text-2xl font-bold text-gray-800 dark:text-white">Manage Farms</h1>
                    <div className="text-left flex items-center space-x-2 mt-4 md:mt-0">
                        <button onClick={openCreate} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                            <FaPlus className="mr-2" /> New Farm
                        </button>
                        <div className="relative">
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleBulkFile} />
                            <button className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700">
                                <FaFileCsv className="mr-2" /> {bulkFile ? 'File Selected' : 'Bulk Upload'}
                            </button>
                        </div>
                        {bulkFile && (
                            <button onClick={uploadBulk} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700">
                                Upload
                            </button>
                        )}
                        <button onClick={downloadTemplate} className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600">
                            <FaDownload className="mr-2" /> Template
                        </button>
                    </div>
                </div>
                {/* Pagination controls */}
                <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Rows per page:</span>
                        <select value={pagination.pageSize} onChange={e => setPagination(p => ({ ...p, pageSize: Number(e.target.value), pageIndex: 0 }))} className="form-select rounded-md shadow-sm text-sm">
                            {[10,20,50,100].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="text-sm text-gray-600">Page {pagination.pageIndex + 1} of {Math.max(1, Math.ceil(list.length / pagination.pageSize))}</div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">First</button>
                        <button onClick={() => setPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))} disabled={pagination.pageIndex === 0} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Prev</button>
                        <button onClick={() => setPagination(p => ({ ...p, pageIndex: Math.min(p.pageIndex + 1, Math.max(0, Math.ceil(list.length / p.pageSize) - 1)) }))} disabled={pagination.pageIndex >= Math.max(0, Math.ceil(list.length / pagination.pageSize) - 1)} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Next</button>
                        <button onClick={() => setPagination(p => ({ ...p, pageIndex: Math.max(0, Math.ceil(list.length / p.pageSize) - 1) }))} disabled={pagination.pageIndex >= Math.max(0, Math.ceil(list.length / pagination.pageSize) - 1)} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Last</button>
                    </div>
                </div>

                {error ? <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg">An error occurred. Please try again.</div> : null}
                <AlertModal open={showErrorModal} title="Error" message={"An unexpected error occurred. Please try again or contact support."} details={error} onClose={() => { setShowErrorModal(false); setError(null); }} />

                <div className="flex items-center space-x-2 mb-4">
                    <button onClick={() => fetchList()} className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                        <FaSync className="mr-2" /> Refresh
                    </button>
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
                                <th className="px-4 py-3">Farm Code</th>
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Farm Name</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Owner</th>
                                <th className="px-4 py-3">Contact</th>
                                <th className="px-4 py-3">Region</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="text-center p-4"><LoadingSpinner /></td></tr>
                            ) : list.length === 0 ? (
                                <tr><td colSpan={9} className="text-center p-4">No farms found.</td></tr>
                            ) : (
                                (() => {
                                    const pageIndex = pagination.pageIndex || 0;
                                    const pageSize = pagination.pageSize || 10;
                                    const start = pageIndex * pageSize;
                                    const end = start + pageSize;
                                    const paged = list.slice(start, end);
                                    try { console.debug('Farms pagination debug', { listLength: list.length, pageIndex, pageSize, start, end, pagedLength: paged.length }); } catch(e) {}
                                    return paged.map((it, idx) => (
                                        <tr key={it.FarmID || start + idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <td className="px-4 py-3">{it.FarmCode || it.Code || ''}</td>
                                            <td className="px-4 py-3">{start + idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{it.FarmName || ''}</td>
                                            <td className="px-4 py-3">{
                                                (() => {
                                                    const idKey = (it?.FarmTypeID || it?.farmTypeID || it?.FarmType || '')?.toString();
                                                    return (idKey && farmTypeNameCache[idKey]) ? farmTypeNameCache[idKey] : (it.FarmTypeName || it.FarmType || it.Type || it.FarmTypeCode || '');
                                                })()
                                            }</td>
                                            <td className="px-4 py-3">{it.FarmOwner || it.OwnerName || it.Owner || it.FarmerName || it.ContactPerson || ''}</td>
                                            <td className="px-4 py-3">{it.ContactPhone || it.ContactNumber || it.Phone || it.WorkPhone || it.ContactEmail || ''}</td>
                                            <td className="px-4 py-3">{(() => {
                                                const val = pickFirst(it, regionAliases) || findByKeySubstring(it, ['region', 'regionname', 'region_label']);
                                                return val || '';
                                            })()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${it.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {it.IsActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 flex items-center justify-center space-x-2">
                                                <button onClick={() => openEdit(it)} className="text-indigo-500 hover:text-indigo-700"><FaEdit /></button>
                                                <button onClick={() => openGpsModal(it)} className="text-blue-500 hover:text-blue-700"><FaMapMarkerAlt /></button>
                                                {it.DeletedAt ? (
                                                    <>
                                                        <button onClick={() => restoreFarm(it)} className="text-green-500 hover:text-green-700"><FaUndo /></button>
                                                        <button onClick={() => permanentDelete(it)} className="text-red-700 hover:text-red-900"><FaTrash /></button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => confirmDelete(it)} className="text-red-500 hover:text-red-700"><FaTrash /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ));
                                })()
                            )}
                        </tbody>
                    </table>
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

            <ConfirmModal open={showDelete} title="Confirm Deletion" onClose={() => setShowDelete(false)} onConfirm={doDelete}>
                Are you sure you want to delete farm {deleteTarget?.FarmName}? This will mark it as inactive.
            </ConfirmModal>
        </main>
    );
}