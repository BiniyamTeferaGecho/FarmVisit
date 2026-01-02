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
import { FaPlus, FaFileCsv, FaDownload, FaSync, FaEdit, FaTrash, FaSearch, FaChevronUp, FaChevronDown, FaSort, FaFileExcel, FaFilePdf, FaEye, FaTrashAlt, FaTimes, FaUser, FaPhone, FaEnvelope, FaIdCard, FaMapMarkerAlt, FaTractor, FaMoneyBillWave, FaUserGraduate, FaLanguage } from 'react-icons/fa';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';

// --- Helper Components ---

const Skeleton = () => <div className="h-4 bg-gray-200 rounded animate-pulse"></div>;

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

// Modal for Add/Edit Farmer (reusable inline modal component)
const FarmerModal = ({ isOpen, onClose, farmer, onSave }) => {
    const [form, setForm] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (farmer) {
            setForm({
                id: farmer.FarmerID || farmer.id || null,
                FirstName: farmer.FirstName || farmer.first_name || '',
                Gender: farmer.Gender || farmer.gender || '',
                LastName: farmer.LastName || farmer.last_name || '',
                FatherName: farmer.FatherName || farmer.father_name || '',
                PhoneNumber: farmer.PhoneNumber || farmer.contact?.phone || '',
                AlternatePhoneNumber: farmer.AlternatePhoneNumber || farmer.alternate_phone || '',
                GeoLocation: farmer.GeoLocation || farmer.geo_location || '',
                Email: farmer.Email || farmer.contact?.email || '',
                NationalID: farmer.NationalID || farmer.national_id || '',
                ProfilePicture: farmer.ProfilePicture || farmer.profile_picture || '',
                Region: farmer.Region || farmer.farm?.region || '',
                Zone: farmer.Zone || farmer.farm?.zone || '',
                Woreda: farmer.Woreda || farmer.farm?.woreda || '',
                Kebele: farmer.Kebele || farmer.farm?.kebele || '',
                Village: farmer.Village || farmer.farm?.village || '',
                HouseNumber: farmer.HouseNumber || farmer.house_number || '',
                FarmingExperience: farmer.FarmingExperience ?? farmer.farming_experience ?? '',
                PrimaryLanguage: farmer.PrimaryLanguage || farmer.primary_language || '',
                EducationLevel: farmer.EducationLevel || farmer.education_level || '',
                MaritalStatus: farmer.MaritalStatus || farmer.marital_status || '',
                FamilySize: farmer.FamilySize || farmer.family_size || '',
                Dependents: farmer.Dependents || farmer.dependents || '',
                HouseholdIncome: farmer.HouseholdIncome ?? farmer.household_income ?? '',
                PreferredContactMethod: farmer.PreferredContactMethod || farmer.preferred_contact_method || 'Phone',
                CommunicationLanguage: farmer.CommunicationLanguage || farmer.communication_language || '',
            });
        } else {
            setForm({
                FirstName: '', Gender: '', LastName: '', FatherName: '', PhoneNumber: '', AlternatePhoneNumber: '', GeoLocation: '', Email: '', NationalID: '', ProfilePicture: '', Region: '', Zone: '', Woreda: '', Kebele: '', Village: '', HouseNumber: '', FarmingExperience: '', PrimaryLanguage: '', EducationLevel: '', MaritalStatus: '', FamilySize: '', Dependents: '', HouseholdIncome: '', PreferredContactMethod: 'Phone', CommunicationLanguage: ''
            });
        }
        setErrors({});
    }, [farmer, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const newErrors = {};
        if (!form.FirstName) newErrors.FirstName = 'First name is required';
        if (!form.LastName) newErrors.LastName = 'Last name is required';
        if (!form.PhoneNumber) newErrors.PhoneNumber = 'Phone number is required';
        if (!form.Region) newErrors.Region = 'Region is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) onSave(form);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">{farmer ? 'Edit Farmer' : 'Add New Farmer'}</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1"><FaTimes size={22} /></button>
                        </div>
                    </div>
                <form onSubmit={handleSubmit} noValidate className="grow overflow-y-auto">
                    <div className="p-6">
                        <div className="mb-8">
                            <h4 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-6">Personal & Contact Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                                <div className="space-y-1">
                                    <label htmlFor="FirstName" className="text-sm font-medium text-gray-600">First Name</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="FirstName" name="FirstName" value={form.FirstName} onChange={handleChange} className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${errors.FirstName ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {errors.FirstName && <p className="text-xs text-red-500">{errors.FirstName}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="LastName" className="text-sm font-medium text-gray-600">Last Name</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="LastName" name="LastName" value={form.LastName} onChange={handleChange} className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${errors.LastName ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {errors.LastName && <p className="text-xs text-red-500">{errors.LastName}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="FatherName" className="text-sm font-medium text-gray-600">Father's Name</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="FatherName" name="FatherName" value={form.FatherName} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="CommunicationLanguage" className="text-sm font-medium text-gray-600">Communication Language</label>
                                    <div className="relative">
                                        <FaLanguage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="CommunicationLanguage" name="CommunicationLanguage" value={form.CommunicationLanguage} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="PhoneNumber" className="text-sm font-medium text-gray-600">Phone Number</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="PhoneNumber" name="PhoneNumber" value={form.PhoneNumber} onChange={handleChange} className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${errors.PhoneNumber ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {errors.PhoneNumber && <p className="text-xs text-red-500">{errors.PhoneNumber}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="AlternatePhoneNumber" className="text-sm font-medium text-gray-600">Alternate Phone</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="AlternatePhoneNumber" name="AlternatePhoneNumber" value={form.AlternatePhoneNumber} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="Gender" className="text-sm font-medium text-gray-600">Gender</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select id="Gender" name="Gender" value={form.Gender} onChange={handleChange} aria-label="Gender" autoFocus className="form-select w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                                            <option value="">Select gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="Email" className="text-sm font-medium text-gray-600">Email</label>
                                    <div className="relative">
                                        <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="email" id="Email" name="Email" value={form.Email} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="ProfilePicture" className="text-sm font-medium text-gray-600">Profile Picture (URL)</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="ProfilePicture" name="ProfilePicture" value={form.ProfilePicture} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="NationalID" className="text-sm font-medium text-gray-600">National ID</label>
                                    <div className="relative">
                                        <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="NationalID" name="NationalID" value={form.NationalID} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="GeoLocation" className="text-sm font-medium text-gray-600">Geo Location</label>
                                    <div className="relative">
                                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="GeoLocation" name="GeoLocation" value={form.GeoLocation} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h4 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-6">Address Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                                <div className="space-y-1">
                                    <label htmlFor="Region" className="text-sm font-medium text-gray-600">Region</label>
                                    <div className="relative">
                                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="Region" name="Region" value={form.Region} onChange={handleChange} className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${errors.Region ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {errors.Region && <p className="text-xs text-red-500">{errors.Region}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="Zone" className="text-sm font-medium text-gray-600">Zone</label>
                                    <input type="text" id="Zone" name="Zone" value={form.Zone} onChange={handleChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="Woreda" className="text-sm font-medium text-gray-600">Woreda</label>
                                    <input type="text" id="Woreda" name="Woreda" value={form.Woreda} onChange={handleChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="Kebele" className="text-sm font-medium text-gray-600">Kebele</label>
                                    <input type="text" id="Kebele" name="Kebele" value={form.Kebele} onChange={handleChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="Village" className="text-sm font-medium text-gray-600">Village/City</label>
                                    <input type="text" id="Village" name="Village" value={form.Village} onChange={handleChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="HouseNumber" className="text-sm font-medium text-gray-600">House Number</label>
                                    <input type="text" id="HouseNumber" name="HouseNumber" value={form.HouseNumber} onChange={handleChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-6">Additional Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                                <div className="space-y-1">
                                    <label htmlFor="FarmingExperience" className="text-sm font-medium text-gray-600">Farming Experience (Years)</label>
                                    <div className="relative">
                                        <FaTractor className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="number" id="FarmingExperience" name="FarmingExperience" value={form.FarmingExperience} onChange={handleChange} className="form-input w-full pl-10 h-12" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="MaritalStatus" className="text-sm font-medium text-gray-600">Marital Status</label>
                                    <div className="relative">
                                        <input type="text" id="MaritalStatus" name="MaritalStatus" value={form.MaritalStatus} onChange={handleChange} placeholder="e.g. Single, Married" className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pl-3" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="FamilySize" className="text-sm font-medium text-gray-600">Family Size</label>
                                    <div className="relative">
                                        <input type="number" id="FamilySize" name="FamilySize" value={form.FamilySize} onChange={handleChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pl-3" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="Dependents" className="text-sm font-medium text-gray-600">Dependents</label>
                                    <div className="relative">
                                        <input type="number" id="Dependents" name="Dependents" value={form.Dependents} onChange={handleChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pl-3" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="HouseholdIncome" className="text-sm font-medium text-gray-600">Household Income</label>
                                    <div className="relative">
                                        <FaMoneyBillWave className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="number" id="HouseholdIncome" name="HouseholdIncome" value={form.HouseholdIncome} onChange={handleChange} className="form-input w-full pl-10 h-12" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="EducationLevel" className="text-sm font-medium text-gray-600">Education Level</label>
                                    <div className="relative">
                                        <FaUserGraduate className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="EducationLevel" name="EducationLevel" value={form.EducationLevel} onChange={handleChange} className="form-input w-full pl-10 h-12" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="PrimaryLanguage" className="text-sm font-medium text-gray-600">Primary Language</label>
                                    <div className="relative">
                                        <FaLanguage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="PrimaryLanguage" name="PrimaryLanguage" value={form.PrimaryLanguage} onChange={handleChange} className="form-input w-full pl-10 h-12" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="PreferredContactMethod" className="text-sm font-medium text-gray-600">Preferred Contact</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select id="PreferredContactMethod" name="PreferredContactMethod" value={form.PreferredContactMethod} onChange={handleChange} className="form-select w-full pl-10 h-12">
                                            <option>Phone</option>
                                            <option>Email</option>
                                            <option>In Person</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 mt-4">
                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700">{farmer ? 'Save Changes' : 'Create Farmer'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Columns Definition ---

const getColumns = (openEdit, confirmDelete, canEdit = true, canDelete = true, advisorMap = {}) => [
    {
        id: 'select',
        header: ({ table }) => (
            <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={table.getIsAllRowsSelected()}
                onChange={table.getToggleAllRowsSelectedHandler()}
            />
        ),
        cell: ({ row }) => (
            <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'FarmerCode',
        header: 'Farmer Code',
    },
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => `${row.original.FirstName} ${row.original.LastName}`,
    },
    {
        id: 'phone',
        header: 'Phone',
        accessorFn: row => row?.contact?.phone ?? row?.PhoneNumber ?? '',
        cell: info => info.getValue(),
    },
    {
        id: 'farmName',
        header: 'Farm Name',
        accessorFn: row => row?.farm?.name ?? row?.FarmName ?? '',
        cell: info => info.getValue(),
    },
    {
        id: 'createdBy',
        header: 'Created By',
        accessorFn: row => row?.CreatedBy || row?.createdBy || '',
        cell: ({ row }) => {
            try {
                const key = String(row.original?.CreatedBy || row.original?.createdBy || '');
                const name = advisorMap && advisorMap[key];
                if (name) return name;
                return key || '';
            } catch (e) { return ''; }
        }
    },
    {
        accessorKey: 'Region',
        header: 'Region',
    },
    {
        accessorKey: 'Gender',
        header: 'Gender',
    },
    {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
                    <div className="flex space-x-2">
                        {canEdit && <button onClick={() => openEdit(row.original.FarmerID)} className="text-blue-500 hover:text-blue-700 transition-colors"><FaEdit /></button>}
                        {canDelete && <button onClick={() => confirmDelete(row.original)} className="text-red-500 hover:text-red-700 transition-colors"><FaTrash /></button>}
                    </div>
        ),
    },
];


// --- Data Table Component ---

const DataTable = ({
    columns,
    data,
    totalRows,
    fetchData,
    loading,
    onAdd,
    onRefresh,
    onBulkDelete,
    canCreate = true,
    canEdit = true,
    canDelete = true,
    externalGlobalFilter = '',
    onExternalGlobalFilterChange = null,
    externalFilters = {},
    onBulkUpload = null,
    onDownloadTemplate = null,
}) => {
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState(externalGlobalFilter || '');
    const [columnVisibility, setColumnVisibility] = useState({});
    const [rowSelection, setRowSelection] = useState({});

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // local search / filters inside the table (placed near pagination)
    const [localShowFilters, setLocalShowFilters] = useState(false);
    const [localRegion, setLocalRegion] = useState(externalFilters?.Region ?? '');
    const [localZone, setLocalZone] = useState(externalFilters?.Zone ?? '');
    const [localWoreda, setLocalWoreda] = useState(externalFilters?.Woreda ?? '');
    const [localKebele, setLocalKebele] = useState(externalFilters?.Kebele ?? '');
    const [localVillage, setLocalVillage] = useState(externalFilters?.Village ?? '');
    const [localGender, setLocalGender] = useState(externalFilters?.Gender ?? '');
    const [localIsActive, setLocalIsActive] = useState(externalFilters?.IsActive == null ? 'All' : (externalFilters.IsActive ? 'Active' : 'Inactive'));
    const [localIncludeDeleted, setLocalIncludeDeleted] = useState(Boolean(externalFilters?.IncludeDeleted));
    const [localCreatedFrom, setLocalCreatedFrom] = useState(externalFilters?.CreatedDateFrom ?? '');
    const [localCreatedTo, setLocalCreatedTo] = useState(externalFilters?.CreatedDateTo ?? '');

    const debouncedGlobalFilter = useDebounce(globalFilter, 500);

    // sync with external filter value when provided
    useEffect(() => {
        if (typeof externalGlobalFilter === 'string' && externalGlobalFilter !== globalFilter) {
            setGlobalFilter(externalGlobalFilter || '');
        }
    }, [externalGlobalFilter]);

    useEffect(() => {
        const sortParams = sorting[0] ? { SortColumn: sorting[0].id, SortDirection: sorting[0].desc ? 'DESC' : 'ASC' } : {};
        fetchData({
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            SearchTerm: debouncedGlobalFilter,
            ...sortParams,
            ...externalFilters,
        });
    }, [pagination.pageIndex, pagination.pageSize, debouncedGlobalFilter, sorting, fetchData, JSON.stringify(externalFilters)]);

    const table = useReactTable({
        data,
        columns,
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: Math.ceil(totalRows / pagination.pageSize),
        state: {
            sorting,
            pagination,
            globalFilter,
            columnVisibility,
            rowSelection,
        },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const selectedRowCount = Object.keys(rowSelection).length;

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 transition-shadow duration-300">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                            <div className="flex items-center space-x-2">
                    {selectedRowCount > 0 ? (
                        <button onClick={() => onBulkDelete(table.getSelectedRowModel().rows.map(r => r.original.FarmerID))} className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center space-x-2">
                            <FaTrashAlt />
                            <span>Delete ({selectedRowCount})</span>
                        </button>
                    ) : (
                        <>
                            {/* New Farmer moved to page header */}
                            {/*  */}
                        </>
                    )}
                </div>
            </div>

            {/* Pagination (moved to top) */}
            <div className="flex justify-between items-center mt-4 flex-wrap gap-4">
                <div className="text-sm text-gray-600">
                    {selectedRowCount} of {totalRows} row(s) selected.
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm">Rows per page:</span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={e => table.setPageSize(Number(e.target.value))}
                        className="form-select rounded-md shadow-sm text-sm"
                    >
                        {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                </div>
                <div className="text-sm text-gray-600">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => { table.setPageIndex(0); }}
                        disabled={table.getState().pagination.pageIndex === 0}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                    >First</button>
                    <button
                        onClick={() => { table.setPageIndex(Math.max(0, table.getState().pagination.pageIndex - 1)); }}
                        disabled={table.getState().pagination.pageIndex === 0}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                    >Prev</button>
                    <button
                        onClick={() => { table.setPageIndex(Math.min(table.getState().pagination.pageIndex + 1, Math.max(0, table.getPageCount() - 1))); }}
                        disabled={table.getState().pagination.pageIndex >= Math.max(0, table.getPageCount() - 1)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                    >Next</button>
                    <button
                        onClick={() => { table.setPageIndex(Math.max(0, table.getPageCount() - 1)); }}
                        disabled={table.getState().pagination.pageIndex >= Math.max(0, table.getPageCount() - 1)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                    >Last</button>
                </div>
            </div>

            {/* Search + Filters placed near pagination (table header area) */}
            <div className="mb-4 flex items-center space-x-2">
                <div className="relative w-full md:w-1/3">
                    <input
                        type="search"
                        value={globalFilter}
                        onChange={e => { setGlobalFilter(e.target.value); if (typeof onExternalGlobalFilterChange === 'function') onExternalGlobalFilterChange(e.target.value); }}
                        onKeyDown={e => { if (e.key === 'Enter') { setPagination(p => ({ ...p, pageIndex: 0 })); fetchData({ pageIndex: 0, pageSize: pagination.pageSize, SearchTerm: globalFilter, Region: localRegion || null, Zone: localZone || null, Woreda: localWoreda || null, Kebele: localKebele || null, Village: localVillage || null, Gender: localGender || null, IsActive: localIsActive === 'All' ? null : (localIsActive === 'Active' ? 1 : 0), IncludeDeleted: localIncludeDeleted ? 1 : 0, CreatedDateFrom: localCreatedFrom || null, CreatedDateTo: localCreatedTo || null }); }} }
                        placeholder="Search farmers by name, id, phone..."
                        className="form-input w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    {globalFilter ? (
                        <button type="button" onClick={() => { setGlobalFilter(''); if (typeof onExternalGlobalFilterChange === 'function') onExternalGlobalFilterChange(''); setPagination(p => ({ ...p, pageIndex: 0 })); fetchData({ pageIndex: 0, pageSize: pagination.pageSize }); }} title="Clear search" className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"><FaTimes /></button>
                    ) : null}
                    <button type="button" onClick={() => { setPagination(p => ({ ...p, pageIndex: 0 })); fetchData({ pageIndex: 0, pageSize: pagination.pageSize, SearchTerm: globalFilter, Region: localRegion || null, Zone: localZone || null, Woreda: localWoreda || null, Kebele: localKebele || null, Village: localVillage || null, Gender: localGender || null, IsActive: localIsActive === 'All' ? null : (localIsActive === 'Active' ? 1 : 0), IncludeDeleted: localIncludeDeleted ? 1 : 0, CreatedDateFrom: localCreatedFrom || null, CreatedDateTo: localCreatedTo || null }); }} title="Search" className="absolute right-0 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-r-md hover:bg-indigo-700"><FaSearch /></button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setLocalShowFilters(s => !s)} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Filters</button>
                    <button onClick={() => { setPagination(p => ({ ...p, pageIndex: 0 })); fetchData({ pageIndex: 0, pageSize: pagination.pageSize, SearchTerm: globalFilter }); }} className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200" title="Refresh Data"><FaSync className="mr-2" /> Refresh</button>
                </div>
            </div>

            {localShowFilters && (
                <div className="mb-4 p-4 bg-white rounded-md border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-gray-600">Region</label>
                            <input value={localRegion} onChange={e => setLocalRegion(e.target.value)} placeholder="Region" className="mt-1 block w-full form-input" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Zone</label>
                            <input value={localZone} onChange={e => setLocalZone(e.target.value)} placeholder="Zone" className="mt-1 block w-full form-input" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Woreda</label>
                            <input value={localWoreda} onChange={e => setLocalWoreda(e.target.value)} placeholder="Woreda" className="mt-1 block w-full form-input" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Kebele</label>
                            <input value={localKebele} onChange={e => setLocalKebele(e.target.value)} placeholder="Kebele" className="mt-1 block w-full form-input" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Village/City</label>
                            <input value={localVillage} onChange={e => setLocalVillage(e.target.value)} placeholder="Village" className="mt-1 block w-full form-input" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Gender</label>
                            <select value={localGender} onChange={e => setLocalGender(e.target.value)} className="mt-1 block w-full form-select">
                                <option value="">Any</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Is Active</label>
                            <select value={localIsActive} onChange={e => setLocalIsActive(e.target.value)} className="mt-1 block w-full form-select">
                                <option value="All">All</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Include Deleted</label>
                            <div className="mt-1">
                                <label className="inline-flex items-center">
                                    <input type="checkbox" checked={localIncludeDeleted} onChange={e => setLocalIncludeDeleted(e.target.checked)} className="mr-2" /> Include deleted
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Created From</label>
                            <input type="date" value={localCreatedFrom} onChange={e => setLocalCreatedFrom(e.target.value)} className="mt-1 block w-full form-input" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Created To</label>
                            <input type="date" value={localCreatedTo} onChange={e => setLocalCreatedTo(e.target.value)} className="mt-1 block w-full form-input" />
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => { setPagination(p => ({ ...p, pageIndex: 0 })); fetchData({ pageIndex: 0, pageSize: pagination.pageSize, SearchTerm: globalFilter, Region: localRegion || null, Zone: localZone || null, Woreda: localWoreda || null, Kebele: localKebele || null, Village: localVillage || null, Gender: localGender || null, IsActive: localIsActive === 'All' ? null : (localIsActive === 'Active' ? 1 : 0), IncludeDeleted: localIncludeDeleted ? 1 : 0, CreatedDateFrom: localCreatedFrom || null, CreatedDateTo: localCreatedTo || null }); setLocalShowFilters(false); }}>Apply</button>
                        <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => { setLocalRegion(''); setLocalZone(''); setLocalWoreda(''); setLocalKebele(''); setLocalVillage(''); setLocalGender(''); setLocalIsActive('All'); setLocalIncludeDeleted(false); setLocalCreatedFrom(''); setLocalCreatedTo(''); setPagination(p => ({ ...p, pageIndex: 0 })); fetchData({ pageIndex: 0, pageSize: pagination.pageSize, SearchTerm: globalFilter }); }}>Clear</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} colSpan={header.colSpan} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div
                                            className={header.column.getCanSort() ? 'cursor-pointer select-none flex items-center' : 'flex items-center'}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            <span className="ml-2">
                                                {{ asc: <FaChevronUp />, desc: <FaChevronDown /> }[header.column.getIsSorted()] ?? (header.column.getCanSort() ? <FaSort className="opacity-30" /> : null)}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            Array.from({ length: pagination.pageSize }).map((_, i) => (
                                <tr key={i}>
                                    {columns.map(col => <td key={col.id || col.accessorKey} className="px-6 py-4"><Skeleton /></td>)}
                                </tr>
                            ))
                        ) : table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row, index) => (
                                <tr key={row.id} className={`transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-10 text-gray-500">
                                    No farmers found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 flex items-center justify-end text-sm text-gray-600">
                <span>Total farmers: <strong className="ml-1">{Number(totalRows || 0).toLocaleString()}</strong></span>
            </div>
            
        </div>
    );
};


// --- Main Farmers Page Component ---

export default function Farmers() {
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

    const [isFormOpen, setFormOpen] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState(null);
    const [form, setForm] = useState({
        UserID: '', FirstName: '', LastName: '', FatherName: '', Gender: '', PhoneNumber: '', AlternatePhoneNumber: '', GeoLocation: '', Email: '', NationalID: '', ProfilePicture: '', Region: '', Zone: '', Woreda: '', Kebele: '', Village: '', HouseNumber: '', FarmingExperience: '', PrimaryLanguage: '', EducationLevel: '', MaritalStatus: '', FamilySize: '', Dependents: '', HouseholdIncome: '', PreferredContactMethod: '', CommunicationLanguage: ''
    });
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [showFarmerSaveConfirm, setShowFarmerSaveConfirm] = useState(false);
    const [pendingFarmerPayload, setPendingFarmerPayload] = useState(null);
    const [pendingFarmerIsEdit, setPendingFarmerIsEdit] = useState(false);
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

    const fetchData = useCallback(async (params) => {
        setLoading(true);
        try {
            // Convert react-table params to the search API query parameters
            const qs = new URLSearchParams();
            const pageNumber = (typeof params.pageIndex === 'number') ? (params.pageIndex + 1) : 1;
            const pageSize = params.pageSize || 10;
            if (params.SearchTerm) qs.append('SearchTerm', params.SearchTerm);
            if (params.SortColumn) qs.append('SortColumn', params.SortColumn);
            if (params.SortDirection) qs.append('SortDirection', params.SortDirection);
            qs.append('PageNumber', String(pageNumber));
            qs.append('PageSize', String(pageSize));
            const res = await fetchWithAuth({ url: `/farmers/search?${qs.toString()}`, method: 'get' });
            const payload = res.data?.data ?? res.data ?? [];
            const total = res.data?.totalCount ?? res.data?.TotalCount ?? res.data?.totalRows ?? res.data?.total ?? 0;
            setData(Array.isArray(payload) ? payload : (payload.items || []));
            setTotalRows(Number(total) || 0);
        } catch (err) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth]);

    const handleAdd = () => {
        setEditingFarmer(null);
        setForm({ UserID: '', FirstName: '', LastName: '', FatherName: '', Gender: '', PhoneNumber: '', AlternatePhoneNumber: '', GeoLocation: '', Email: '', NationalID: '', ProfilePicture: '', Region: '', Zone: '', Woreda: '', Kebele: '', Village: '', HouseNumber: '', FarmingExperience: '', PrimaryLanguage: '', EducationLevel: '', MaritalStatus: '', FamilySize: '', Dependents: '', HouseholdIncome: '', PreferredContactMethod: '', CommunicationLanguage: '' });
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
        if (editingFarmer && editingFarmer.FarmerID) {
            setPendingFarmerPayload({ ...payload, UpdatedBy: user?.UserID || user?.id });
            setPendingFarmerIsEdit(true);
        } else {
            setPendingFarmerPayload({ ...payload, CreatedBy: user?.UserID || user?.id });
            setPendingFarmerIsEdit(false);
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
        }
    }

    // Compute form-level permission flags. Try common form key 'farmers'.
    const isAdmin = user && (user.roles || []).includes('ROLE_ADMIN');
    const isSuperAdmin = user && (user.roles || []).includes('ROLE_SUPER_ADMIN');
    const isAdvisor = user && (user.roles || []).includes('ROLE_ADVISOR');

    const canCreate = (hasFormPermission && hasFormPermission('farmers', 'CanCreate')) || isAdmin || isSuperAdmin || isAdvisor;
    const canEdit = (hasFormPermission && hasFormPermission('farmers', 'CanEdit')) || isAdmin || isSuperAdmin || isAdvisor;
    const canDelete = (hasFormPermission && hasFormPermission('farmers', 'CanDelete')) || isAdmin || isSuperAdmin || isAdvisor;

    const columns = useMemo(() => getColumns(handleEdit, handleDelete, canEdit, canDelete, advisorMap), [data, canEdit, canDelete, advisorMap]);

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
        <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Farmers</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        <FaPlus className="mr-2" /> New Farmer
                    </button>
                    <input ref={bulkInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => setSelectedBulkFile(e.target.files?.[0] || null)} />
                    <button onClick={() => bulkInputRef.current?.click()} className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-md shadow-md hover:bg-teal-700 flex items-center space-x-2">
                        <FaFileCsv />
                        <span>Bulk Upload</span>
                    </button>
                    <button onClick={downloadTemplate} className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-600">
                        <FaDownload className="mr-2" /> Template
                    </button>

                    {selectedBulkFile && (
                        <div className="flex items-center space-x-2 ml-4">
                            <span className="text-sm text-gray-700">{selectedBulkFile.name}</span>
                            <button onClick={uploadSelectedFile} disabled={uploading} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                            <button onClick={() => setSelectedBulkFile(null)} disabled={uploading} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                        </div>
                    )}
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
                }}
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

            {/* Modals would be rendered here, e.g., for adding/editing */}
<Modal open={isFormOpen} title={editingFarmer ? "Edit Farmer" : "Add Farmer"} onClose={() => setFormOpen(false)} maxWidth="max-w-4xl" footer={
                <div className="flex items-center gap-3 justify-end px-6 py-4 bg-gray-50 border-t">
                    <button type="button" onClick={() => setFormOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
                    <button type="submit" form="farmer-form" disabled={formSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg shadow-sm hover:bg-emerald-700">
                        {formSubmitting ? 'Saving...' : (editingFarmer ? 'Save Changes' : 'Create Farmer')}
                    </button>
                </div>
            }>
                <form id="farmer-form" onSubmit={(e) => { e.preventDefault(); handleFormSubmit(form); }} noValidate className="grow overflow-y-auto">
                    <div className="p-6 space-y-8">
                        <div>
                            <h4 className="text-base font-semibold text-gray-600 border-b pb-2 mb-4">Personal & Contact</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">First Name</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="FirstName" value={form.FirstName} onChange={handleFieldChange} required className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fieldErrors?.FirstName ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {fieldErrors?.FirstName && <p className="text-xs text-red-500">{fieldErrors.FirstName}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Last Name</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="LastName" value={form.LastName} onChange={handleFieldChange} required className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fieldErrors?.LastName ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {fieldErrors?.LastName && <p className="text-xs text-red-500">{fieldErrors.LastName}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Father's Name</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="FatherName" value={form.FatherName} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Gender</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select name="Gender" value={form.Gender} onChange={handleFieldChange} aria-label="Gender" autoFocus className="form-select w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    {fieldErrors?.Gender && <p className="text-xs text-red-500">{fieldErrors.Gender}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Phone Number</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="PhoneNumber" value={form.PhoneNumber} onChange={handleFieldChange} required className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fieldErrors?.PhoneNumber ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {fieldErrors?.PhoneNumber && <p className="text-xs text-red-500">{fieldErrors.PhoneNumber}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Alternate Phone</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="AlternatePhoneNumber" value={form.AlternatePhoneNumber} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Email</label>
                                    <div className="relative">
                                        <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="Email" type="email" value={form.Email} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Profile Picture (URL)</label>
                                    <div className="relative">
                                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="ProfilePicture" value={form.ProfilePicture} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">National ID</label>
                                    <div className="relative">
                                        <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="NationalID" value={form.NationalID} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Geo Location</label>
                                    <div className="relative">
                                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="GeoLocation" value={form.GeoLocation} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-base font-semibold text-gray-600 border-b pb-2 mb-4">Address Information</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Region</label>
                                    <div className="relative">
                                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="Region" value={form.Region} onChange={handleFieldChange} required className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fieldErrors?.Region ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {fieldErrors?.Region && <p className="text-xs text-red-500">{fieldErrors.Region}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Zone</label>
                                    <input name="Zone" value={form.Zone} onChange={handleFieldChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Woreda</label>
                                    <input name="Woreda" value={form.Woreda} onChange={handleFieldChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Kebele</label>
                                    <input name="Kebele" value={form.Kebele} onChange={handleFieldChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Village/City</label>
                                    <input name="Village" value={form.Village} onChange={handleFieldChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">House Number</label>
                                    <input name="HouseNumber" value={form.HouseNumber} onChange={handleFieldChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-base font-semibold text-gray-600 border-b pb-2 mb-4">Additional Details</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Farming Experience (Years)</label>
                                    <div className="relative">
                                        <FaTractor className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="FarmingExperience" type="number" value={form.FarmingExperience} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Marital Status</label>
                                    <div className="relative">
                                        <input name="MaritalStatus" value={form.MaritalStatus} onChange={handleFieldChange} placeholder="e.g. Single, Married" className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pl-3" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Family Size</label>
                                    <div className="relative">
                                        <input name="FamilySize" type="number" value={form.FamilySize} onChange={handleFieldChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pl-3" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Dependents</label>
                                    <div className="relative">
                                        <input name="Dependents" type="number" value={form.Dependents} onChange={handleFieldChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 pl-3" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Household Income</label>
                                    <div className="relative">
                                        <FaMoneyBillWave className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="HouseholdIncome" type="number" value={form.HouseholdIncome} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Education Level</label>
                                    <div className="relative">
                                        <FaUserGraduate className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="EducationLevel" value={form.EducationLevel} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Primary Language</label>
                                    <div className="relative">
                                        <FaLanguage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="PrimaryLanguage" value={form.PrimaryLanguage} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Preferred Contact</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select name="PreferredContactMethod" value={form.PreferredContactMethod} onChange={handleFieldChange} className="form-select w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300">
                                            <option>Phone</option>
                                            <option>Email</option>
                                            <option>In Person</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Communication Language</label>
                                    <div className="relative">
                                        <FaLanguage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="CommunicationLanguage" value={form.CommunicationLanguage} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
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
                    message={pendingFarmerIsEdit ? `Update farmer "${form.FirstName} ${form.LastName}"?` : `Create farmer "${form.FirstName} ${form.LastName}"?`}
                    onCancel={() => setShowFarmerSaveConfirm(false)}
                    onConfirm={doFarmerSaveConfirmed}
                    confirmLabel={pendingFarmerIsEdit ? 'Update' : 'Create'}
                    cancelLabel="Cancel"
                    loading={formSubmitting}
                />
            )}
        </div>
    );
}