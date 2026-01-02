import React from 'react';
import Modal from '../Modal';

const ConfirmModal = ({ open, title = 'Confirm', message = 'Are you sure?', onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel', loading = false }) => {
  return (
    <Modal open={Boolean(open)} title={title} onClose={onCancel}>
      <div className="py-4">
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300">{cancelLabel}</button>
          <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-md text-white ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
