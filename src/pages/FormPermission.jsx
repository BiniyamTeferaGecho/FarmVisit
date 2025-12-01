import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

const getUserId = (user) => user && (user.UserID || user.userId || user.UserId || user.id || user.ID);

const FormPermission = () => {
  const { user, fetchWithAuth } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [pagination, setPagination] = useState({ totalCount: 0, currentPage: 1, pageSize: 15 });

  const [forms, setForms] = useState([]);
  const [roles, setRoles] = useState([]);

  const [editModal, setEditModal] = useState({ open: false, data: null, saving: false });
  const [confirm, setConfirm] = useState({ open: false, data: null, processing: false });

  // Bulk assign state
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [bulkSelectedForms, setBulkSelectedForms] = useState(new Set());
  const [bulkFlags, setBulkFlags] = useState({ CanAccess: 1, CanCreate: 0, CanEdit: 0, CanDelete: 0, CanApprove: 0 });

  const fetchList = async (page = 1) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth({ url: '/form-permissions', params: { page, pageSize: pagination.pageSize } });
      const responseData = res.data?.data || res.data || { items: [] };
      setItems(responseData.items || []);
      if (responseData.pagination) setPagination(responseData.pagination);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load permissions' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [formsRes, rolesRes] = await Promise.all([
        fetchWithAuth({ url: '/forms', params: { pageSize: 1000 } }),
        fetchWithAuth({ url: '/roles', params: { pageSize: 1000 } }),
      ]);
      setForms(formsRes.data?.data?.items || formsRes.data?.items || []);
      setRoles(rolesRes.data?.data?.items || rolesRes.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch forms or roles', err);
    }
  };

  useEffect(() => {
    fetchList(1);
    fetchDropdownData();
  }, []);

  const handleSave = async () => {
    const userId = getUserId(user);
    if (!userId) {
      setMessage({ type: 'error', text: 'Authentication Error: User ID not found.' });
      return;
    }

    const { data } = editModal;
    if (!data.FormID || !data.RoleID) {
        setMessage({ type: 'error', text: 'Form and Role are required.' });
        return;
    }

    setEditModal(s => ({ ...s, saving: true }));

    const isEditing = !!data.FormPermissionID;
    const url = isEditing ? `/form-permissions/${data.FormPermissionID}` : '/form-permissions';
    const method = isEditing ? 'PATCH' : 'POST';
    const body = isEditing ? { ...data, UpdatedBy: userId } : { ...data, CreatedBy: userId };

    try {
      await fetchWithAuth({ url, method, data: body });
      setMessage({ type: 'success', text: `Permission ${isEditing ? 'updated' : 'created'} successfully` });
      setEditModal({ open: false, data: null, saving: false });
      fetchList(pagination.currentPage);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || `Failed to ${isEditing ? 'update' : 'create'} permission` });
      setEditModal(s => ({ ...s, saving: false }));
    }
  };

  const handleDelete = async () => {
    const userId = getUserId(user);
    const { data } = confirm;
    if (!data?.FormPermissionID) return;

    setConfirm(c => ({ ...c, processing: true }));
    try {
      await fetchWithAuth({ url: `/form-permissions/${data.FormPermissionID}`, method: 'DELETE', data: { UpdatedBy: userId } });
      setMessage({ type: 'success', text: 'Permission deleted successfully' });
      setConfirm({ open: false, data: null, processing: false });
      fetchList(pagination.currentPage);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete permission' });
      setConfirm(c => ({ ...c, processing: false }));
    }
  };

  const handleBulkAssign = async () => {
    const userId = getUserId(user);
    if (!bulkRoleId || bulkSelectedForms.size === 0) {
      setMessage({ type: 'error', text: 'Please select a role and at least one form.' });
      return;
    }
    try {
      const payload = {
        RoleID: bulkRoleId,
        FormPermissions: Array.from(bulkSelectedForms).map(formId => ({ FormID: formId, ...bulkFlags })),
        CreatedBy: userId,
      };
      await fetchWithAuth({ url: '/form-permissions/bulk-assign', method: 'POST', data: payload });
      setMessage({ type: 'success', text: 'Bulk assign successful' });
      setBulkSelectedForms(new Set());
      fetchList(pagination.currentPage);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Bulk assign failed' });
    }
  };

  const openCreateModal = () => {
    setEditModal({
      open: true,
      data: { FormID: '', RoleID: '', CanAccess: true, CanCreate: false, CanEdit: false, CanDelete: false, CanApprove: false },
      saving: false,
    });
  };

  const openEditModal = (item) => {
    setEditModal({ open: true, data: item, saving: false });
  };

  const openDeleteConfirm = (item) => {
    setConfirm({
      open: true,
      data: item,
      title: 'Delete Permission',
      message: `Are you sure you want to delete the permission for "${item.RoleName}" on "${item.FormName}"?`,
      processing: false,
    });
  };

  const toggleBulkForm = (formId) => {
    const newSet = new Set(bulkSelectedForms);
    if (newSet.has(formId)) {
      newSet.delete(formId);
    } else {
      newSet.add(formId);
    }
    setBulkSelectedForms(newSet);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Form Permissions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage form access for different roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchList(pagination.currentPage)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <Plus className="h-4 w-4" /> New Permission
          </button>
        </div>
      </header>

      {message && (
        <div className={`p-4 mb-4 rounded-md text-sm ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                {['Form', 'Role', 'Access', 'Create', 'Edit', 'Delete', 'Approve', 'Actions'].map(header => (
                  <th key={header} scope="col" className="px-6 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <td colSpan="8" className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-full animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : items.map(it => (
                <tr key={it.FormPermissionID} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{it.FormName}</td>
                  <td className="px-6 py-4">{it.RoleName}</td>
                  {[it.CanAccess, it.CanCreate, it.CanEdit, it.CanDelete, it.CanApprove].map((perm, i) => (
                    <td key={i} className="px-6 py-4">
                      {perm ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />}
                    </td>
                  ))}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(it)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit"><Edit className="h-4 w-4 text-gray-600 dark:text-gray-300" /></button>
                      <button onClick={() => openDeleteConfirm(it)} className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-800" title="Delete"><Trash2 className="h-4 w-4 text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Assign Section */}
      <section className="bg-white dark:bg-gray-800 mt-6 p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Bulk Assign Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <select value={bulkRoleId} onChange={(e) => setBulkRoleId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">-- Select Role --</option>
              {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Forms</label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 grid grid-cols-2 gap-3">
              {forms.map(f => (
                <label key={f.FormID} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={bulkSelectedForms.has(f.FormID)} onChange={() => toggleBulkForm(f.FormID)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  {f.FormName}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {Object.keys(bulkFlags).map(key => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={!!bulkFlags[key]} onChange={(e) => setBulkFlags(b => ({ ...b, [key]: e.target.checked ? 1 : 0 }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              {key.replace('Can', '')}
            </label>
          ))}
        </div>
        <div className="mt-6">
          <button onClick={handleBulkAssign} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700">Assign Permissions</button>
        </div>
      </section>

      {/* Edit/Create Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, data: null })} title={editModal.data?.FormPermissionID ? 'Edit Permission' : 'New Permission'}>
        {editModal.data && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Form</label>
              <select value={editModal.data.FormID || ''} onChange={(e) => setEditModal(s => ({ ...s, data: { ...s.data, FormID: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">-- Select Form --</option>
                {forms.map(f => <option key={f.FormID} value={f.FormID}>{f.FormName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <select value={editModal.data.RoleID || ''} onChange={(e) => setEditModal(s => ({ ...s, data: { ...s.data, RoleID: e.target.value } }))} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">-- Select Role --</option>
                {roles.map(r => <option key={r.RoleID} value={r.RoleID}>{r.RoleName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              {['CanAccess', 'CanCreate', 'CanEdit', 'CanDelete', 'CanApprove'].map(key => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editModal.data[key]} onChange={(e) => setEditModal(s => ({ ...s, data: { ...s.data, [key]: e.target.checked } }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  {key.replace('Can', '')}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setEditModal({ open: false, data: null })} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={editModal.saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300">
                {editModal.saving ? 'Saving...' : (editModal.data.FormPermissionID ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onCancel={() => setConfirm({ open: false, data: null })}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={confirm.processing}
      />
    </div>
  );
};

export default FormPermission;