import React from 'react';
import { FaUserTie, FaVenusMars, FaIdCard, FaPhone, FaEnvelope, FaMapMarkerAlt, FaBuilding } from 'react-icons/fa';

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

function EmployeeForm({ form, setForm, onFieldChange, fieldErrors, touchedFields, isFormValid, loading, list, onCancel, onSubmit }) {
    const handleChange = (e) => {
        if (typeof onFieldChange === 'function') return onFieldChange(e);
        const { name, value, type, checked } = e.target;
        setForm(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField icon={<FaUserTie />} label="First Name" name="FirstName" value={form.FirstName} onChange={handleChange} error={fieldErrors.FirstName} placeholder="John" />
                <InputField icon={<FaUserTie />} label="Father Name" name="FatherName" value={form.FatherName} onChange={handleChange} error={fieldErrors.FatherName} placeholder="Doe" />
                <InputField icon={<FaUserTie />} label="Grandfather Name" name="GrandFatherName" value={form.GrandFatherName} onChange={handleChange} placeholder="Smith" />
                <SelectField icon={<FaVenusMars />} label="Gender" name="Gender" value={form.Gender} onChange={handleChange} error={fieldErrors.Gender}>
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                </SelectField>
                <InputField icon={<FaIdCard />} label="National ID" name="NationalID" value={form.NationalID} onChange={handleChange} error={fieldErrors.NationalID} placeholder="1234567890" />
                <SelectField icon={<FaIdCard />} label="Marital Status" name="MaritalStatus" value={form.MaritalStatus} onChange={handleChange} error={fieldErrors.MaritalStatus}>
                    <option value="">Select Status</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Divorced</option>
                    <option>Widowed</option>
                </SelectField>
                <InputField icon={<FaPhone />} label="Personal Phone" name="PersonalPhone" value={form.PersonalPhone} onChange={handleChange} error={fieldErrors.PersonalPhone} placeholder="0912345678" />
                <InputField icon={<FaPhone />} label="Work Phone" name="WorkPhone" value={form.WorkPhone} onChange={handleChange} placeholder="+2519..." />
                <InputField icon={<FaEnvelope />} label="Personal Email" name="PersonalEmail" value={form.PersonalEmail} onChange={handleChange} error={fieldErrors.PersonalEmail} placeholder="john.doe@personal.com" />
                <InputField icon={<FaEnvelope />} label="Work Email" name="WorkEmail" value={form.WorkEmail} onChange={handleChange} error={fieldErrors.WorkEmail} placeholder="john.doe@work.com" />
                <InputField icon={<FaMapMarkerAlt />} label="Region" name="Region" value={form.Region} onChange={handleChange} placeholder="e.g. Amhara" />
                <InputField icon={<FaMapMarkerAlt />} label="Zone" name="Zone" value={form.Zone} onChange={handleChange} placeholder="e.g. North Shewa" />
                <InputField icon={<FaMapMarkerAlt />} label="Woreda" name="Woreda" value={form.Woreda} onChange={handleChange} placeholder="e.g. Debre Berhan" />
                <InputField icon={<FaMapMarkerAlt />} label="Kebele" name="Kebele" value={form.Kebele} onChange={handleChange} placeholder="e.g. 01" />
                <InputField icon={<FaMapMarkerAlt />} label="House Number" name="HouseNumber" value={form.HouseNumber} onChange={handleChange} placeholder="e.g. 123" />
                <InputField icon={<FaBuilding />} label="Photo URL" name="PhotoURL" value={form.PhotoURL} onChange={handleChange} placeholder="https://example.com/photo.jpg" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" name="IsActive" checked={!!form.IsActive} onChange={handleChange} className="rounded text-indigo-600 focus:ring-indigo-500" /> Active
                </label>
                <SelectField icon={<FaUserTie />} label="Manager" name="ManagerID" value={form.ManagerID} onChange={handleChange}>
                    <option value="">-- None --</option>
                    {Array.isArray(list) && list.map(emp => {
                        const id = emp.EmployeeID || emp.EmployeeId || emp.id || '';
                        const last = emp.LastName || emp.GrandFatherName || emp.FatherName || '';
                        const display = `${emp.FirstName || ''} ${last}`.trim();
                        return <option key={id || display} value={id}>{display || emp.FirstName || id}</option>
                    })}
                </SelectField>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" disabled={loading || (typeof isFormValid !== 'undefined' && !isFormValid)}>
                    {loading ? 'Saving...' : 'Save'}
                </button>
            </div>
        </form>
    );
}

export { InputField, SelectField };
export default React.memo(EmployeeForm);
