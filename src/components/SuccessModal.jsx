import React from 'react';

export default function SuccessModal({ open, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10 text-center">
        {/* Inline styles for the SVG animation (small, self-contained)
            Using a <style> tag here keeps the animation local and avoids editing global CSS config. */}
        <style>{`
          .check-wrap { display: inline-block; transform: scale(0.9); }
          .check-circle { stroke-dasharray: 300; stroke-dashoffset: 300; animation: dash 0.7s ease-out forwards; }
          .check-mark { stroke-dasharray: 50; stroke-dashoffset: 50; animation: dash 0.45s ease-out 0.55s forwards; }
          @keyframes dash { to { stroke-dashoffset: 0; } }
          .pop { transform: scale(0); animation: popIn 0.25s ease-out 0.5s forwards; }
          @keyframes popIn { to { transform: scale(1); } }
        `}</style>

        <div className="flex flex-col items-center">
          <div className="check-wrap pop">
            <svg className="w-20 h-20" viewBox="0 0 120 120" fill="none" aria-hidden="true">
              <circle className="check-circle" cx="60" cy="60" r="50" stroke="#16a34a" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path className="check-mark" d="M40 62 L54 76 L82 46" stroke="#16a34a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold mt-3">Success</h3>
          <p className="mt-2 text-sm text-gray-700">{message}</p>

          <div className="mt-6 flex justify-center">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-indigo-600 text-white">OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}
