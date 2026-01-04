import React, { useState, useEffect, useRef } from 'react';
import { FaBuilding, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaGlobe, FaInfoCircle, FaChevronDown } from 'react-icons/fa';
import { useAuth } from '../auth/AuthProvider';

const InputField = React.memo(({ icon, label, name, value, onChange, error, ...props }) => (
    <div>
        <label className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">{icon}</div>
            <input name={name} value={value} onChange={onChange}
                className="text-left block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                {...props} />
        </div>
        {error && <p className="text-left mt-1 text-xs text-red-500">{error}</p>}
    </div>
));

const SelectField = React.memo(({ icon, label, name, value, onChange, error, children, ...props }) => (
    <div>
        <label className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="relative mt-1">
            <div className="text-left absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">{icon}</div>
            <select name={name} value={value} onChange={onChange}
                className="text-left block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                {...props}>
                {children}
            </select>
        </div>
        {error && <p className="text-left mt-1 text-xs text-red-500">{error}</p>}
    </div>
));

function FarmForm({ form, setForm, onFieldChange, fieldErrors, farmTypes = [], loading, onCancel, onSubmit, editingId }) {
    const { fetchWithAuth } = useAuth();
    const [regionOptions, setRegionOptions] = useState([]);
    const [regionLoading, setRegionLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setRegionLoading(true);
                const res = await fetchWithAuth({ url: `http://localhost:80/api/lookups/by-type-name/Region`, method: 'get' });
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
                if (!cancelled) setRegionOptions(opts);
            } catch (e) {
                if (!cancelled) setRegionOptions([]);
            } finally { if (!cancelled) setRegionLoading(false); }
        })();
        return () => { cancelled = true };
    }, [fetchWithAuth]);

    const handleChange = (e) => {
        if (typeof onFieldChange === 'function') return onFieldChange(e);
        const { name, value, type, checked } = e.target;
        setForm(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField icon={<FaBuilding />} label="Farm Name" name="FarmName" value={form.FarmName} onChange={handleChange} error={fieldErrors.FarmName} placeholder="e.g. Green Valley Farms" />
                <InputField icon={<FaBuilding />} label="Farm Code" name="FarmCode" value={form.FarmCode} onChange={handleChange} error={fieldErrors.FarmCode} placeholder="Unique farm code" readOnly={!editingId} />
                <SelectField icon={<FaInfoCircle />} label="Farm Type" name="FarmTypeID" value={form.FarmTypeID} onChange={handleChange} error={fieldErrors.FarmTypeID}>
                    <option value="">Select Type</option>
                    {Array.isArray(farmTypes) && farmTypes.map(ft => (
                        <option key={ft.FarmTypeID || ft.Id || ft.id || ft.ID} value={ft.FarmTypeID || ft.Id || ft.id || ft.ID}>
                            {`${ft.TypeCode || ft.Type || ft.Code || ''}${ft.TypeCode ? ' - ' : ''}${ft.TypeName || ft.Type || ft.Name || ft.Label || ''}`}
                        </option>
                    ))}
                </SelectField>
                <div>
                    <label className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">Owner Name</label>
                    <FarmersDropdown
                        valueDisplay={form.OwnerName}
                        valueId={form.FarmerID}
                        onSelect={(display, id) => {
                            // update both OwnerName (display text) and FarmerID
                            setForm(s => ({ ...s, OwnerName: display, FarmerID: id }));
                        }}
                    />
                    {fieldErrors.OwnerName && <p className="text-left mt-1 text-xs text-red-500">{fieldErrors.OwnerName}</p>}
                </div>
                <InputField icon={<FaPhone />} label="Contact Phone" name="ContactPhone" value={form.ContactPhone} onChange={handleChange} error={fieldErrors.ContactPhone} placeholder="0912345678" />
                <InputField icon={<FaMapMarkerAlt />} label="Address" name="Address" value={form.Address} onChange={handleChange} placeholder="123 Main St" />
                <SelectField icon={<FaMapMarkerAlt />} label="Region" name="Region" value={form.Region} onChange={handleChange} error={fieldErrors.Region}>
                    <option value="">Select region</option>
                    {(regionOptions || []).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </SelectField>
                <InputField icon={<FaMapMarkerAlt />} label="Zone" name="Zone" value={form.Zone} onChange={handleChange} placeholder="e.g. North Shewa" />
                <InputField icon={<FaMapMarkerAlt />} label="Wereda" name="Wereda" value={form.Wereda} onChange={handleChange} placeholder="e.g. Debre Berhan" />
                <InputField icon={<FaMapMarkerAlt />} label="City/Town" name="CityTown" value={form.CityTown} onChange={handleChange} placeholder="e.g. Addis Ababa" />
                <InputField icon={<FaGlobe />} label="Farm Size (ha)" name="FarmSize" value={form.FarmSize} onChange={handleChange} type="number" step="0.01" placeholder="100.00" />
                <InputField icon={<FaMapMarkerAlt />} label="GPS Location" name="GPSLocation" value={form.GPSLocation} onChange={handleChange} placeholder="lat,lon or GeoJSON" />
            </div>
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" name="IsActive" checked={!!form.IsActive} onChange={handleChange} className="rounded text-indigo-600 focus:ring-indigo-500" /> Active
                </label>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                </button>
            </div>
        </form>
    );
}

export { InputField, SelectField };
export default React.memo(FarmForm);

function FarmersDropdown({ valueDisplay = '', valueId = '', onSelect }) {
    const { fetchWithAuth } = useAuth();
    const [query, setQuery] = useState(valueDisplay || '');
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showList, setShowList] = useState(false);
    const ref = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => { setQuery(valueDisplay || ''); }, [valueDisplay]);

    useEffect(() => {
        const onBodyClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowList(false); };
        document.addEventListener('click', onBodyClick);
        return () => document.removeEventListener('click', onBodyClick);
    }, []);

    // Fetch an initial list of farmers when the component mounts so the owner
    // dropdown is populated immediately (useful when the form/modal opens).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await fetchWithAuth({ url: `/farms/farmers-dropdown`, method: 'get' });
                const payload = res?.data?.data || res?.data || res;
                let arr = null;
                if (Array.isArray(payload)) arr = payload;
                else if (Array.isArray(payload.items)) arr = payload.items;
                else if (Array.isArray(payload.recordset)) arr = payload.recordset;
                else if (Array.isArray(payload.data)) arr = payload.data;
                if (!arr && payload && typeof payload === 'object') {
                    for (const k of Object.keys(payload)) if (Array.isArray(payload[k])) { arr = payload[k]; break; }
                }
                const norm = (arr || []).map(it => ({ id: it.FarmerID || it.Id || it.id || it.ID || it.farmerId || '', text: it.DisplayText || it.Display || it.label || it.Name || it.OwnerName || '' }));
                if (!cancelled) {
                    setOptions(norm);
                }
            } catch (err) {
                console.debug('FarmersDropdown initial fetch failed', err);
            } finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [fetchWithAuth]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query || query.trim().length < 1) { setOptions([]); return; }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const qs = new URLSearchParams();
                qs.append('search', query);
                const res = await fetchWithAuth({ url: `/farms/farmers-dropdown?${qs.toString()}`, method: 'get' });
                const payload = res?.data?.data || res?.data || res;
                let arr = null;
                if (Array.isArray(payload)) arr = payload;
                else if (Array.isArray(payload.items)) arr = payload.items;
                else if (Array.isArray(payload.recordset)) arr = payload.recordset;
                else if (Array.isArray(payload.data)) arr = payload.data;
                if (!arr && payload && typeof payload === 'object') {
                    for (const k of Object.keys(payload)) if (Array.isArray(payload[k])) { arr = payload[k]; break; }
                }
                // normalize to objects with DisplayText and FarmerID
                const norm = (arr || []).map(it => ({ id: it.FarmerID || it.Id || it.id || it.ID || it.farmerId || '', text: it.DisplayText || it.Display || it.label || it.Name || it.OwnerName || '' }));
                setOptions(norm);
                setShowList(true);
            } catch (err) {
                console.debug('FarmersDropdown fetch failed', err);
                setOptions([]);
            } finally { setLoading(false); }
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, fetchWithAuth]);

    const onChoose = (opt) => {
        setQuery(opt.text || '');
        setShowList(false);
        if (typeof onSelect === 'function') onSelect(opt.text || '', opt.id || '');
    };

    return (
        <div className="relative" ref={ref}>
            <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><FaUser /></div>
                <input type="text" value={query} onChange={e => { setQuery(e.target.value); }} onFocus={() => { if ((options || []).length > 0) setShowList(true); }} className="text-left block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="Search owner by name..." />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <FaChevronDown className={`${showList ? 'transform rotate-180' : ''}`} />
                </div>
            </div>
            {showList && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                    {loading ? <div className="p-2 text-sm text-gray-500">Searching...</div> : null}
                    {!loading && options.length === 0 ? <div className="p-2 text-sm text-gray-500">No matches</div> : null}
                    {!loading && options.map(o => (
                        <div key={`${o.id}:${o.text}`} onClick={() => onChoose(o)} className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">{o.text}{o.id ? <span className="text-xs text-gray-400 ml-2">{o.id}</span> : null}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
