import React from 'react';

// ConfirmModal now accepts an optional `changes` prop (array).
// If `changes` is provided and non-empty, the modal will render a compact
// list of updated fields and will NOT render `children` (keeps focus on the changes).
export default function ConfirmModal({ open, title, message, changes = [], children, onCancel, onConfirm, confirmLabel = 'Confirm', cancelLabel = 'Cancel', loading = false }) {
  if (!open) return null;
  const hasChanges = Array.isArray(changes) && changes.length > 0;
  return (
    <div className="text-left fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 z-10">
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}

        {hasChanges ? (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700">Updated fields</h4>
            <ul className="mt-2 max-h-60 overflow-auto divide-y divide-gray-100 rounded border border-gray-50">
              {changes.map((c, idx) => {
                // support string entries or objects like { key, label, oldValue, newValue }
                if (typeof c === 'string') {
                  return (
                    <li key={idx} className="px-3 py-2 text-sm text-gray-700">
                      <span className="truncate">{c}</span>
                    </li>
                  )
                }
                const label = c.label || c.key || String(c)
                const oldVal = c.oldValue !== undefined ? String(c.oldValue) : ''
                const newVal = c.newValue !== undefined ? String(c.newValue) : ''
                return (
                  <li key={idx} className="px-3 py-2 text-sm text-gray-700">
                    <div className="flex justify-between items-center gap-4">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{label}</div>
                        <div className="text-xs text-gray-500 truncate">{oldVal} → <span className="font-semibold text-gray-700">{newVal}</span></div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          children
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded bg-gray-100">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white">{loading ? 'Saving...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
