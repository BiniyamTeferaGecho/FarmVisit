import React from 'react';

export default function AlertModal({ open, title = 'Alert', message, details, onClose, primaryLabel, onPrimary }) {
  if (!open) return null;

  const handlePrimary = () => {
    try { if (typeof onPrimary === 'function') onPrimary(); } catch (e) { /* ignore */ }
    if (onClose) onClose();
  };

  // Show technical details only in non-production builds
  const showDetails = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE !== 'production' && details;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-gray-700">{message}</p>
        {showDetails ? (
          <details className="mt-3 text-xs text-gray-600">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="whitespace-pre-wrap mt-2 text-xs text-gray-700">{typeof details === 'string' ? details : JSON.stringify(details, null, 2)}</pre>
          </details>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          {primaryLabel && typeof onPrimary === 'function' ? (
            <button type="button" onClick={handlePrimary} className="px-4 py-2 rounded bg-emerald-600 text-white">{primaryLabel}</button>
          ) : null}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-indigo-600 text-white">OK</button>
        </div>
      </div>
    </div>
  );
}
