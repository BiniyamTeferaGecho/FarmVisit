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
    const [zoneOptions, setZoneOptions] = useState([]);
    const [zoneLoading, setZoneLoading] = useState(false);
    const [selectedZoneId, setSelectedZoneId] = useState(null);
    const [weredaOptions, setWeredaOptions] = useState([]);
    const [weredaLoading, setWeredaLoading] = useState(false);
    const [selectedWeredaId, setSelectedWeredaId] = useState(null);
    const [cityOptions, setCityOptions] = useState([]);
    const [cityLoading, setCityLoading] = useState(false);
    const [selectedRegionId, setSelectedRegionId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setRegionLoading(true);
                // Use a relative URL so mobile devices and proxies resolve to the current API host
                const res = await fetchWithAuth({ url: `/lookups/by-type-name/Region`, method: 'get' });
                const payload = res?.data?.data || res?.data || res;
                let rows = [];
                if (Array.isArray(payload)) rows = payload;
                else if (Array.isArray(payload.items)) rows = payload.items;
                else if (Array.isArray(payload.recordset)) rows = payload.recordset;
                else if (Array.isArray(payload.data)) rows = payload.data;
                const opts = (rows || []).map(r => {
                    const id = r?.LookupID || r?.LookupId || r?.id || null;
                    const value = r?.LookupValue ?? r?.Value ?? r?.lookupValue ?? r?.value ?? null;
                    const label = r?.LookupLabel ?? r?.Label ?? r?.Name ?? value ?? '';
                    return value ? { id: id ? String(id) : null, value: String(value), label: String(label) } : null;
                }).filter(Boolean);
                if (!cancelled) setRegionOptions(opts);
            } catch (e) {
                if (!cancelled) setRegionOptions([]);
            } finally { if (!cancelled) setRegionLoading(false); }
        })();
        return () => { cancelled = true };
    }, [fetchWithAuth]);

    // Keep selectedRegionId in sync with the current form value when editing
    useEffect(() => {
        if (form && form.Region) {
            const sel = (regionOptions || []).find(o => o.value === form.Region || o.label === form.Region)
            setSelectedRegionId(sel && sel.id ? sel.id : null)
        }
    }, [form.Region, regionOptions]);

    // When selectedRegionId changes, load zones
    useEffect(() => {
        let cancelled = false
        const regionId = selectedRegionId
        if (!regionId) {
            setZoneOptions([])
            setSelectedZoneId(null)
            setWeredaOptions([])
            setSelectedWeredaId(null)
            setCityOptions([])
            return
        }
        ;(async () => {
            try {
                setZoneLoading(true)
                const res = await fetchWithAuth({ url: `/lookups/location-hierarchy?RegionID=${encodeURIComponent(regionId)}`, method: 'get' })
                const rows = res?.data?.data || res?.data || []
                const opts = (rows || []).map(r => ({ id: r.LookupID || r.LookupId || r.id || null, value: r.LookupValue || r.LookupLabel || r.Value || r.value || '', label: r.LookupValue || r.LookupLabel || r.Value || r.value || '' }))
                if (!cancelled) {
                    setZoneOptions(opts)
                    setSelectedZoneId(null)
                    setWeredaOptions([])
                    setSelectedWeredaId(null)
                    setCityOptions([])
                }
            } catch (e) {
                if (!cancelled) setZoneOptions([])
            } finally { if (!cancelled) setZoneLoading(false) }
        })()
        return () => { cancelled = true }
    }, [selectedRegionId, fetchWithAuth])

    // Keep selectedZoneId in sync when form.Zone or zoneOptions change
    useEffect(() => {
        if (form && form.Zone) {
            const sel = (zoneOptions || []).find(o => o.value === form.Zone || o.label === form.Zone)
            setSelectedZoneId(sel && sel.id ? sel.id : null)
        }
    }, [form.Zone, zoneOptions])

    // When selectedZoneId changes, load weredas
    useEffect(() => {
        let cancelled = false
        const regionId = selectedRegionId
        const zoneId = selectedZoneId
        if (!zoneId) {
            setWeredaOptions([])
            setSelectedWeredaId(null)
            setCityOptions([])
            return
        }
        ;(async () => {
            try {
                setWeredaLoading(true)
                const qs = `RegionID=${encodeURIComponent(regionId || '')}&ZoneID=${encodeURIComponent(zoneId)}`
                const res = await fetchWithAuth({ url: `/lookups/location-hierarchy?${qs}`, method: 'get' })
                const rows = res?.data?.data || res?.data || []
                const opts = (rows || []).map(r => ({ id: r.LookupID || r.LookupId || r.id || null, value: r.LookupValue || r.LookupLabel || r.Value || r.value || '', label: r.LookupValue || r.LookupLabel || r.Value || r.value || '' }))
                if (!cancelled) {
                    setWeredaOptions(opts)
                    setSelectedWeredaId(null)
                    setCityOptions([])
                }
            } catch (e) {
                if (!cancelled) setWeredaOptions([])
            } finally { if (!cancelled) setWeredaLoading(false) }
        })()
        return () => { cancelled = true }
    }, [selectedZoneId, selectedRegionId, fetchWithAuth])

    // Keep selectedWeredaId in sync when form.Wereda or weredaOptions change
    useEffect(() => {
        if (form && form.Wereda) {
            const sel = (weredaOptions || []).find(o => o.value === form.Wereda || o.label === form.Wereda)
            setSelectedWeredaId(sel && sel.id ? sel.id : null)
        }
    }, [form.Wereda, weredaOptions])

    // When selectedWeredaId changes, load cities
    useEffect(() => {
        let cancelled = false
        const regionId = selectedRegionId
        const zoneId = selectedZoneId
        const weredaId = selectedWeredaId
        if (!weredaId) {
            setCityOptions([])
            return
        }
        ;(async () => {
            try {
                setCityLoading(true)
                const qs = `RegionID=${encodeURIComponent(regionId || '')}&ZoneID=${encodeURIComponent(zoneId || '')}&WeredaID=${encodeURIComponent(weredaId)}`
                const res = await fetchWithAuth({ url: `/lookups/location-hierarchy?${qs}`, method: 'get' })
                const rows = res?.data?.data || res?.data || []
                const opts = (rows || []).map(r => ({ id: r.LookupID || r.LookupId || r.id || null, value: r.LookupValue || r.LookupLabel || r.Value || r.value || '', label: r.LookupValue || r.LookupLabel || r.Value || r.value || '' }))
                if (!cancelled) setCityOptions(opts)
            } catch (e) {
                if (!cancelled) setCityOptions([])
            } finally { if (!cancelled) setCityLoading(false) }
        })()
        return () => { cancelled = true }
    }, [selectedWeredaId, selectedZoneId, selectedRegionId, fetchWithAuth])

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
                <SelectField icon={<FaMapMarkerAlt />} label="Region" name="Region" value={form.Region} onChange={(e) => {
                    const val = e.target.value
                    const sel = (regionOptions || []).find(o => o.value === val)
                    // reset downstream selections
                    setZoneOptions([]); setWeredaOptions([]); setCityOptions([])
                    setSelectedZoneId(null); setSelectedWeredaId(null); setSelectedRegionId(sel && sel.id ? sel.id : null)
                    // set the form region to the lookup value (string)
                    handleChange({ target: { name: 'Region', value: val } })
                }} onFocus={() => { /* region options are preloaded on mount */ }} loading={regionLoading} error={fieldErrors.Region}>
                    <option value="">Select region</option>
                    {(regionOptions || []).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </SelectField>
                {/* Zone/Sub-City select - lazy loaded based on selected region */}
                <SelectField icon={<FaMapMarkerAlt />} label="Zone" name="Zone" value={form.Zone} onChange={(e) => {
                    const val = e.target.value
                    const sel = (zoneOptions || []).find(o => o.value === val || o.id === val)
                    setSelectedZoneId(sel && sel.id ? sel.id : null)
                    handleChange({ target: { name: 'Zone', value: val } })
                }} loading={zoneLoading} error={fieldErrors.Zone}>
                    <option value="">Select Zone/Sub-City</option>
                    {(zoneOptions || []).map(opt => (
                        <option key={opt.id || opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </SelectField>

                    {/* zones are loaded via the effect watching `selectedRegionId` */}

                <SelectField icon={<FaMapMarkerAlt />} label="Wereda" name="Wereda" value={form.Wereda} onChange={(e) => {
                    const val = e.target.value
                    const sel = (weredaOptions || []).find(o => o.value === val || o.id === val)
                    setSelectedWeredaId(sel && sel.id ? sel.id : null)
                    handleChange({ target: { name: 'Wereda', value: val } })
                }} loading={weredaLoading} error={fieldErrors.Wereda}>
                    <option value="">Select Wereda</option>
                    {(weredaOptions || []).map(opt => (
                        <option key={opt.id || opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </SelectField>

                <SelectField icon={<FaMapMarkerAlt />} label="City/Town" name="CityTown" value={form.CityTown} onChange={(e) => {
                    const val = e.target.value
                    handleChange({ target: { name: 'CityTown', value: val } })
                }} loading={cityLoading} error={fieldErrors.CityTown}>
                    <option value="">Select city / town</option>
                    {(cityOptions || []).map(opt => (
                        <option key={opt.id || opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </SelectField>
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
