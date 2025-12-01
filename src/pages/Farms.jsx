import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';
import { FaPlus, FaFileCsv, FaDownload, FaSync, FaChartBar, FaEdit, FaTrash, FaUndo, FaMapMarkerAlt, FaBuilding, FaUser, FaPhone, FaEnvelope, FaGlobe, FaInfoCircle } from 'react-icons/fa';

const initialForm = {
    FarmName: '',
    FarmType: '',
    FarmOwner: '',
    ContactPerson: '',
    ContactPhone: '',
    ContactEmail: '',
    Address: '',
    Region: '',
    Zone: '',
    Woreda: '',
    Kebele: '',
    FarmStatus: '',
    OwnershipType: '',
    ProductionSystem: '',
    WaterSource: '',
    FarmSize: '',
    NumberOfPlots: '',
    IsActive: true,
    Latitude: '',
    Longitude: '',
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
    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
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
        } catch (e) { return err?.message || 'Unknown error' }
    };

    const fetchList = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetchWithAuth({ url: `/farms`, method: 'get' });
            const payload = res.data?.data || res.data;
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

            if (arr) setList(arr);
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

    const openCreate = () => { setEditingId(null); setForm(initialForm); setFieldErrors({}); setShowForm(true) };

    const openEdit = async (id) => {
        setLoading(true); setError(null);
        try {
            const res = await fetchWithAuth({ url: `/farms/${id}`, method: 'get' });
            const d = res.data?.data || res.data;
            if (d) {
                setForm({
                    FarmName: d.FarmName || '', FarmType: d.FarmType || '', FarmOwner: d.FarmOwner || '',
                    ContactPerson: d.ContactPerson || '', ContactPhone: d.ContactPhone || '', ContactEmail: d.ContactEmail || '',
                    Address: d.Address || '', Region: d.Region || '', Zone: d.Zone || '', Woreda: d.Woreda || '', Kebele: d.Kebele || '',
                    FarmStatus: d.FarmStatus || '', OwnershipType: d.OwnershipType || '', ProductionSystem: d.ProductionSystem || '',
                    WaterSource: d.WaterSource || '', FarmSize: d.FarmSize || '', NumberOfPlots: d.NumberOfPlots || '',
                    IsActive: d.IsActive === undefined ? true : !!d.IsActive, Latitude: d.Latitude || '', Longitude: d.Longitude || ''
                });
                setEditingId(id);
                setShowForm(true);
            }
        } catch (err) { setError(getErrorMessage(err) || 'Failed to load') } finally { setLoading(false) }
    };

    const validateForm = (f) => {
        const errs = {};
        if (!f.FarmName) errs.FarmName = 'Farm name is required';
        if (!f.FarmType) errs.FarmType = 'Farm type is required';
        if (!validators.farmType(f.FarmType)) errs.FarmType = 'Invalid farm type';
        if (!validators.phone(f.ContactPhone)) errs.ContactPhone = 'Invalid phone number';
        if (!validators.email(f.ContactEmail)) errs.ContactEmail = 'Invalid email address';
        if (!validators.farmStatus(f.FarmStatus)) errs.FarmStatus = 'Invalid farm status';
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
        setLoading(true);
        try {
            const payload = { ...form, CreatedBy: user?.UserID || user?.id };
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
            await fetchWithAuth({ url: `/farms/${deleteTarget.FarmID}/delete`, method: 'post', data: { DeletedBy: user?.UserID || user?.id } });
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
                await fetchWithAuth({ url: `/farms/${farm.FarmID}/permanent-delete`, method: 'delete', data: { DeletedBy: user?.UserID || user?.id } });
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

    const InputField = ({ icon, label, name, value, onChange, error, ...props }) => (
        <div>
            <label className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="text-left relative mt-1">
                <div className="text-left absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    {icon}
                </div>
                <input
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="text-left block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    {...props}
                />
            </div>
            {error && <p className="text-left mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );

    const SelectField = ({ icon, label, name, value, onChange, error, children, ...props }) => (
        <div>
            <label className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="text-left relative mt-1">
                <div className="text-left absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    {icon}
                </div>
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="text-left block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    {...props}
                >
                    {children}
                </select>
            </div>
            {error && <p className="text-left mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );

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

                {error ? <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg">An error occurred. Please try again.</div> : null}
                <AlertModal open={showErrorModal} title="Error" message={"An unexpected error occurred. Please try again or contact support."} details={error} onClose={() => { setShowErrorModal(false); setError(null); }} />

                <div className="flex items-center space-x-2 mb-4">
                    <button onClick={() => fetchList()} className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                        <FaSync className="mr-2" /> Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 uppercase">
                            <tr>
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
                                <tr><td colSpan={8} className="text-center p-4"><LoadingSpinner /></td></tr>
                            ) : list.length === 0 ? (
                                <tr><td colSpan={8} className="text-center p-4">No farms found.</td></tr>
                            ) : list.map((it, idx) => (
                                <tr key={it.FarmID || idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-4 py-3">{idx + 1}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{it.FarmName || ''}</td>
                                    <td className="px-4 py-3">{it.FarmType || it.Type || it.FarmTypeCode || it.FarmTypeName || ''}</td>
                                    <td className="px-4 py-3">{it.FarmOwner || it.OwnerName || it.Owner || it.FarmerName || it.ContactPerson || ''}</td>
                                    <td className="px-4 py-3">{it.ContactPhone || it.ContactNumber || it.Phone || it.WorkPhone || it.ContactEmail || ''}</td>
                                    <td className="px-4 py-3">{it.Region || it.RegionName || it.LocationRegion || it.Area || ''}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${it.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {it.IsActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 flex items-center justify-center space-x-2">
                                        <button onClick={() => openEdit(it.FarmID)} className="text-indigo-500 hover:text-indigo-700"><FaEdit /></button>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Farm' : 'Create New Farm'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField icon={<FaBuilding />} label="Farm Name" name="FarmName" value={form.FarmName} onChange={handleChange} error={fieldErrors.FarmName} placeholder="e.g. Green Valley Farms" />
                        <SelectField icon={<FaInfoCircle />} label="Farm Type" name="FarmType" value={form.FarmType} onChange={handleChange} error={fieldErrors.FarmType}>
                            <option value="">Select Type</option>
                            <option>Dairy</option>
                            <option>Layer</option>
                            <option>Broiler</option>
                        </SelectField>
                        <InputField icon={<FaUser />} label="Farm Owner" name="FarmOwner" value={form.FarmOwner} onChange={handleChange} placeholder="e.g. John Doe" />
                        <InputField icon={<FaUser />} label="Contact Person" name="ContactPerson" value={form.ContactPerson} onChange={handleChange} placeholder="e.g. Jane Doe" />
                        <InputField icon={<FaPhone />} label="Contact Phone" name="ContactPhone" value={form.ContactPhone} onChange={handleChange} error={fieldErrors.ContactPhone} placeholder="0912345678" />
                        <InputField icon={<FaEnvelope />} label="Contact Email" name="ContactEmail" value={form.ContactEmail} onChange={handleChange} error={fieldErrors.ContactEmail} placeholder="contact@farm.com" />
                        <InputField icon={<FaMapMarkerAlt />} label="Address" name="Address" value={form.Address} onChange={handleChange} placeholder="123 Main St" />
                        <InputField icon={<FaMapMarkerAlt />} label="Region" name="Region" value={form.Region} onChange={handleChange} placeholder="e.g. Amhara" />
                        <InputField icon={<FaMapMarkerAlt />} label="Zone" name="Zone" value={form.Zone} onChange={handleChange} placeholder="e.g. North Shewa" />
                        <InputField icon={<FaMapMarkerAlt />} label="Woreda" name="Woreda" value={form.Woreda} onChange={handleChange} placeholder="e.g. Debre Berhan" />
                        <InputField icon={<FaMapMarkerAlt />} label="Kebele" name="Kebele" value={form.Kebele} onChange={handleChange} placeholder="e.g. 01" />
                        <SelectField icon={<FaInfoCircle />} label="Farm Status" name="FarmStatus" value={form.FarmStatus} onChange={handleChange} error={fieldErrors.FarmStatus}>
                            <option value="">Select Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Under Construction</option>
                        </SelectField>
                        <InputField icon={<FaGlobe />} label="Ownership Type" name="OwnershipType" value={form.OwnershipType} onChange={handleChange} placeholder="e.g. Private, Cooperative" />
                        <InputField icon={<FaGlobe />} label="Production System" name="ProductionSystem" value={form.ProductionSystem} onChange={handleChange} placeholder="e.g. Intensive, Extensive" />
                        <InputField icon={<FaGlobe />} label="Water Source" name="WaterSource" value={form.WaterSource} onChange={handleChange} placeholder="e.g. Borehole, River" />
                        <InputField icon={<FaGlobe />} label="Farm Size (in ha)" name="FarmSize" value={form.FarmSize} onChange={handleChange} type="number" placeholder="100" />
                        <InputField icon={<FaGlobe />} label="Number of Plots" name="NumberOfPlots" value={form.NumberOfPlots} onChange={handleChange} type="number" placeholder="5" />
                        <InputField icon={<FaMapMarkerAlt />} label="Latitude" name="Latitude" value={form.Latitude} onChange={handleChange} placeholder="e.g. 9.0000" />
                        <InputField icon={<FaMapMarkerAlt />} label="Longitude" name="Longitude" value={form.Longitude} onChange={handleChange} placeholder="e.g. 38.0000" />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <input type="checkbox" name="IsActive" checked={!!form.IsActive} onChange={handleChange} className="rounded text-indigo-600 focus:ring-indigo-500" /> Active
                        </label>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
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
                        <div className="flex-shrink-0">
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