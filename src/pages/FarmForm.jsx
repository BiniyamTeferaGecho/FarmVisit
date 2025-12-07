import React from 'react';
import { FaBuilding, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaGlobe, FaInfoCircle } from 'react-icons/fa';

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
                <InputField icon={<FaUser />} label="Owner Name" name="OwnerName" value={form.OwnerName} onChange={handleChange} placeholder="e.g. John Doe" />
                <InputField icon={<FaPhone />} label="Contact Phone" name="ContactPhone" value={form.ContactPhone} onChange={handleChange} error={fieldErrors.ContactPhone} placeholder="0912345678" />
                <InputField icon={<FaMapMarkerAlt />} label="Address" name="Address" value={form.Address} onChange={handleChange} placeholder="123 Main St" />
                <InputField icon={<FaMapMarkerAlt />} label="Region" name="Region" value={form.Region} onChange={handleChange} placeholder="e.g. Amhara" />
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
