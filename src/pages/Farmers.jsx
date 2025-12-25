import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
                LastName: farmer.LastName || farmer.last_name || '',
                PhoneNumber: farmer.PhoneNumber || farmer.contact?.phone || '',
                Email: farmer.Email || farmer.contact?.email || '',
                Region: farmer.Region || farmer.farm?.region || '',
                Zone: farmer.Zone || farmer.farm?.zone || '',
                Woreda: farmer.Woreda || farmer.farm?.woreda || '',
                Kebele: farmer.Kebele || farmer.farm?.kebele || '',
                Village: farmer.Village || farmer.farm?.village || '',
                NationalID: farmer.NationalID || farmer.national_id || '',
                FarmingExperience: farmer.FarmingExperience ?? farmer.farming_experience ?? '',
                HouseholdIncome: farmer.HouseholdIncome ?? farmer.household_income ?? '',
                PreferredContactMethod: farmer.PreferredContactMethod || farmer.preferred_contact_method || 'Phone',
                PrimaryLanguage: farmer.PrimaryLanguage || farmer.primary_language || '',
                EducationLevel: farmer.EducationLevel || farmer.education_level || '',
            });
        } else {
            setForm({
                FirstName: '', LastName: '', PhoneNumber: '', Email: '', Region: '', Zone: '', Woreda: '', Kebele: '', Village: '', NationalID: '', FarmingExperience: '', HouseholdIncome: '', PreferredContactMethod: 'Phone', PrimaryLanguage: '', EducationLevel: ''
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
                                    <label htmlFor="PhoneNumber" className="text-sm font-medium text-gray-600">Phone Number</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="PhoneNumber" name="PhoneNumber" value={form.PhoneNumber} onChange={handleChange} className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${errors.PhoneNumber ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {errors.PhoneNumber && <p className="text-xs text-red-500">{errors.PhoneNumber}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="Email" className="text-sm font-medium text-gray-600">Email</label>
                                    <div className="relative">
                                        <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="email" id="Email" name="Email" value={form.Email} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="NationalID" className="text-sm font-medium text-gray-600">National ID</label>
                                    <div className="relative">
                                        <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" id="NationalID" name="NationalID" value={form.NationalID} onChange={handleChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
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
                                    <label htmlFor="Village" className="text-sm font-medium text-gray-600">Village</label>
                                    <input type="text" id="Village" name="Village" value={form.Village} onChange={handleChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
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

const getColumns = (openEdit, confirmDelete, canEdit = true, canDelete = true) => [
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
    onBulkUpload,
    onDownloadTemplate,
    onRefresh,
    onBulkDelete,
    canCreate = true,
    canEdit = true,
    canDelete = true,
}) => {
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState({});
    const [rowSelection, setRowSelection] = useState({});

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const debouncedGlobalFilter = useDebounce(globalFilter, 500);

    useEffect(() => {
        const sortParams = sorting[0] ? { SortColumn: sorting[0].id, SortDirection: sorting[0].desc ? 'DESC' : 'ASC' } : {};
        fetchData({
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            SearchTerm: debouncedGlobalFilter,
            ...sortParams,
        });
    }, [pagination.pageIndex, pagination.pageSize, debouncedGlobalFilter, sorting, fetchData]);

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
                <div className="relative w-full md:w-1/3">
                    <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={globalFilter}
                        onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Search all farmers..."
                        className="form-input pl-10 w-full rounded-md shadow-sm"
                    />
                </div>
                            <div className="flex items-center space-x-2">
                    {selectedRowCount > 0 ? (
                        <button onClick={() => onBulkDelete(table.getSelectedRowModel().rows.map(r => r.original.FarmerID))} className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center space-x-2">
                            <FaTrashAlt />
                            <span>Delete ({selectedRowCount})</span>
                        </button>
                    ) : (
                        <>
                            {canCreate && (
                                <button onClick={onAdd} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center space-x-2">
                                    <FaPlus />
                                    <span>New Farmer</span>
                                </button>
                            )}
                            <button onClick={onRefresh} className="p-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50" title="Refresh Data"><FaSync /></button>
                        </>
                    )}
                </div>
            </div>

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

            {/* Pagination */}
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
                    <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">First</button>
                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Prev</button>
                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Next</button>
                    <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Last</button>
                </div>
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

    const [isFormOpen, setFormOpen] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState(null);
    const [form, setForm] = useState({
        UserID: '', FirstName: '', LastName: '', FatherName: '', Gender: '', PhoneNumber: '', AlternatePhoneNumber: '', GeoLocation: '', Email: '', NationalID: '', ProfilePicture: '', Region: '', Zone: '', Woreda: '', Kebele: '', Village: '', HouseNumber: '', FarmingExperience: '', PrimaryLanguage: '', EducationLevel: '', MaritalStatus: '', FamilySize: '', Dependents: '', HouseholdIncome: '', PreferredContactMethod: '', CommunicationLanguage: ''
    });
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // simple immediate validation clear for the touched field
        setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    };
    
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

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
    const handleFormSubmit = async (payloadFromModal) => {
        setFormSubmitting(true);
        setFieldErrors({});
        setError(null);
        const mapServerErrors = (resp) => {
            const errs = {};
            if (!resp) return errs;
            // common shapes: { errors: { Field: 'msg' } } or { validationErrors: [{ field, message }] }
            if (resp.errors && typeof resp.errors === 'object') Object.assign(errs, resp.errors);
            if (Array.isArray(resp.validationErrors)) {
                resp.validationErrors.forEach(v => { if (v && v.field) errs[v.field] = v.message || v.msg || String(v); });
            }
            // Some controllers return { data: { ... } } with success:false at top-level
            if (resp.data && typeof resp.data === 'object' && resp.data.errors) Object.assign(errs, resp.data.errors);
            return errs;
        }

        try {
            const payload = payloadFromModal ? { ...payloadFromModal } : { ...form };
            if (editingFarmer && editingFarmer.FarmerID) {
                // update
                const res = await fetchWithAuth({ url: `/farmers/${editingFarmer.FarmerID}`, method: 'put', data: { ...payload, UpdatedBy: user?.UserID || user?.id } });
                if (res && (res.success === false || res.success === 'false')) {
                    const errs = mapServerErrors(res);
                    if (Object.keys(errs).length) {
                        setFieldErrors(errs);
                        const first = Object.keys(errs)[0];
                        const el = document.querySelector(`[name="${first}"]`);
                        if (el && typeof el.focus === 'function') el.focus();
                        return;
                    }
                    setError(res.message || 'Save failed');
                    return;
                }
            } else {
                // create
                payload.CreatedBy = user?.UserID || user?.id;
                const res = await fetchWithAuth({ url: `/farmers`, method: 'post', data: payload });
                // If server indicates failure shape
                if (res && (res.success === false || res.success === 'false')) {
                    const errs = mapServerErrors(res);
                    if (Object.keys(errs).length) {
                        setFieldErrors(errs);
                        const first = Object.keys(errs)[0];
                        const el = document.querySelector(`[name="${first}"]`);
                        if (el && typeof el.focus === 'function') el.focus();
                        return;
                    }
                    setError(res.message || 'Save failed');
                    return;
                }

                const newId = res?.data?.data?.FarmerID || res?.data?.FarmerID || res?.FarmerID || null;
                if (newId) {
                    try {
                        const r2 = await fetchWithAuth({ url: `/farmers/${newId}`, method: 'get' });
                        const created = r2?.data?.data || r2?.data;
                        if (created) setData(prev => [created, ...prev]);
                    } catch (e) {
                        // ignore, will refresh list
                    }
                }
            }
            setFormOpen(false);
            // refresh current view
            fetchData({ pageIndex: 0, pageSize: 10 });
        } catch (err) {
            console.error('Save error', err);
            const resp = err?.response?.data || err?.data || null;
            if (resp) {
                const errs = mapServerErrors(resp);
                if (Object.keys(errs).length) {
                    setFieldErrors(errs);
                    const first = Object.keys(errs)[0];
                    const el = document.querySelector(`[name="${first}"]`);
                    if (el && typeof el.focus === 'function') el.focus();
                    return;
                }
                setError(resp.message || resp.error || JSON.stringify(resp));
            } else {
                setError(err.message || 'Save failed');
            }
        } finally {
            setFormSubmitting(false);
        }
    }

    // Compute form-level permission flags. Try common form key 'farmers'.
    const canCreate = (hasFormPermission && hasFormPermission('farmers', 'CanCreate')) || (user && (user.roles || []).includes('ROLE_ADMIN')) || (user && (user.roles || []).includes('ROLE_SUPER_ADMIN'));
    const canEdit = (hasFormPermission && hasFormPermission('farmers', 'CanEdit')) || (user && (user.roles || []).includes('ROLE_ADMIN')) || (user && (user.roles || []).includes('ROLE_SUPER_ADMIN'));
    const canDelete = (hasFormPermission && hasFormPermission('farmers', 'CanDelete')) || (user && (user.roles || []).includes('ROLE_ADMIN')) || (user && (user.roles || []).includes('ROLE_SUPER_ADMIN'));

    const columns = useMemo(() => getColumns(handleEdit, handleDelete, canEdit, canDelete), [data, canEdit, canDelete]);

    return (
        <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Farmers</h1>
            </div>

            {error && <AlertModal title="Error" message={error} onClose={() => setError(null)} />}

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
                                    <label className="text-sm font-medium text-gray-600">Phone Number</label>
                                    <div className="relative">
                                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="PhoneNumber" value={form.PhoneNumber} onChange={handleFieldChange} required className={`form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${fieldErrors?.PhoneNumber ? 'border-red-500' : 'border-gray-300'}`} />
                                    </div>
                                    {fieldErrors?.PhoneNumber && <p className="text-xs text-red-500">{fieldErrors.PhoneNumber}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">Email</label>
                                    <div className="relative">
                                        <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="Email" type="email" value={form.Email} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-600">National ID</label>
                                    <div className="relative">
                                        <FaIdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input name="NationalID" value={form.NationalID} onChange={handleFieldChange} className="form-input w-full pl-10 h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
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
                                    <label className="text-sm font-medium text-gray-600">Village</label>
                                    <input name="Village" value={form.Village} onChange={handleFieldChange} className="form-input w-full h-12 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
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
        </div>
    );
}