import React from 'react';
import AKFLogo from '../../assets/images/AKF-Logo.png';

const VisitPrintPreview = ({
  visit = {},
  schedule = null,
  entries = [],
  logo = null,
  type = 'Farm',
  onClose = null
}) => {
  const title = `${type} Schedule Report`;
  const now = new Date().toLocaleString();

  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center p-6 print:bg-white">
      <style>
        {`
        @media print {
          @page { size: A4; margin: 20mm }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          .no-break { break-inside: avoid; }
          .page-number:before { content: counter(page); }
        }
        `}
      </style>

      {/* Controls */}
      <div className="fixed top-6 right-6 flex gap-2 print:hidden z-50">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm shadow hover:bg-indigo-700"
        >
          Print
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-200 text-neutral-800 text-sm"
          >
            Close
          </button>
        )}
      </div>

      {/* A4 Page */}
      <article className="w-[210mm] min-h-[297mm] bg-white shadow-xl print:shadow-none rounded-md overflow-hidden">
        <div className="p-[20mm] flex flex-col min-h-[297mm]">

          {/* ===== Header ===== */}
          <header className="no-break">
            <div className="flex items-center justify-between border-b pb-6 mb-8">
              <div className="flex items-center gap-4">
                <img
                  src={logo || AKFLogo}
                  alt="AKF Logo"
                  className="h-14 w-14 object-contain"
                />
                <div>
                  <h1 className="text-2xl font-semibold text-neutral-900">
                    Alema Koudijs Feed PLC
                  </h1>
                  <p className="text-xs text-neutral-500 mt-1">
                    Bishoftu, Ethiopia • +251 (930) 23-4567
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {title}
                </p>
                <p className="text-sm font-medium text-neutral-800 mt-1">
                  {now}
                </p>
              </div>
            </div>
          </header>

          {/* ===== Schedule Section ===== */}
          {schedule && (
            <section className="mb-8 no-break">
              <h2 className="text-sm font-semibold text-neutral-800 mb-3">
                Schedule Overview
              </h2>

              <div className="grid grid-cols-3 gap-4 text-sm">
                {[
                  ['Schedule ID', schedule.ScheduleID || '—'],
                  ['Schedule Code', schedule.VisitCode || '—'],
                  ['Advisor', schedule.AdvisorName || '—'],
                  ['Approval Status', schedule.ApprovalStatus || '—'],
                  ['Visit Status', schedule.VisitStatus || '—'],
                  ['Planned Date', schedule.ProposedDate || '—']
                ].map(([label, value]) => (
                  <div key={label} className="border rounded-md p-3">
                    <div className="text-xs text-neutral-500">{label}</div>
                    <div className="font-medium text-neutral-800 mt-1">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== Visit + Farm Details ===== */}
          <section className="grid grid-cols-3 gap-6 mb-8 no-break">
            <div className="col-span-2 space-y-6">

              {/* Visit Details */}
              <div>
                <h2 className="text-sm font-semibold text-neutral-800 mb-3">
                  Visit Details
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['Proposed Date', visit.ProposedDate],
                    ['Next Follow-up', visit.NextFollowUpDate],
                    ['Purpose', visit.VisitPurpose],
                    ['Frequency', visit.VisitFrequency],
                    ['Status', visit.Status || visit.VisitStatus]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-xs text-neutral-500">{label}</div>
                      <div className="font-medium text-neutral-800 mt-1">
                        {value || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Farm Details */}
              <div>
                <h2 className="text-sm font-semibold text-neutral-800 mb-3">
                  Farm Details
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['Farm Name', visit.FarmName],
                    ['Farm Code', visit.FarmCode || visit.FarmID],
                    ['Farm Type', visit.FarmType],
                    ['Location', visit.Location],
                    ['Advisor', visit.AdvisorName],
                    ['Manager', visit.ManagerName]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-xs text-neutral-500">{label}</div>
                      <div className="font-medium text-neutral-800 mt-1">
                        {value || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h2 className="text-sm font-semibold text-neutral-800 mb-3">
                Summary & Notes
              </h2>
              <div className="text-sm text-neutral-700 whitespace-pre-wrap border rounded-md p-4 min-h-[180px]">
                {visit.Summary || visit.Notes || 'No notes provided.'}
              </div>
            </div>
          </section>

          {/* ===== Structured Table ===== */}
          <section className="mb-8 flex-1 no-break">
            <h2 className="text-sm font-semibold text-neutral-800 mb-3">
              Detailed Records
            </h2>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700 w-1/3">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length ? (
                    entries.map((row, i) =>
                      Object.entries(row).map(([k, v]) => (
                        <tr key={`${i}-${k}`} className="border-t">
                          <td className="px-4 py-3 text-neutral-600 align-top">
                            {k}
                          </td>
                          <td className="px-4 py-3 text-neutral-800">
                            {String(v)}
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-6 text-center text-neutral-500"
                      >
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ===== Footer ===== */}
          <footer className="mt-auto pt-6 border-t text-xs text-neutral-500 flex justify-between items-end no-break">
            <div>Generated on {now}</div>
            <div>
              Page <span className="page-number" />
            </div>
            <div className="text-right">
              <div>Authorized Signature</div>
              <div className="w-40 h-8 border-b mt-4" />
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
};

export default VisitPrintPreview;
