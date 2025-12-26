import React from 'react';
import AKFLogo from '../../image/AKF Logo.png';

/**
 * VisitPrintPreview
 * Props:
 * - visit: object containing key fields (FarmName, Advisor, ProposedDate, etc.)
 * - entries: array of objects representing structured rows for the table (each item should be an object)
 * - logo: optional URL for logo image
 * - type: 'Layer'|'Dairy' (used for document title)
 *
 * Note: uses Tailwind utility classes for layout and print: utilities. A minimal
 * print-focused CSS block is embedded for A4 sizing and page numbering, which
 * require small bits of CSS not expressible via Tailwind utilities alone.
 */
const VisitPrintPreview = ({ visit = {}, schedule = null, entries = [], logo = null, type = 'Farm', onClose = null }) => {
  const title = `${type} Schedule Report`;
  const now = new Date();
  const formattedDate = now.toLocaleString();

  // build a list of visit object fields that were rendered in primary groups
  const renderedFieldNames = [
    'ProposedDate','proposedDate','NextFollowUpDate','nextFollowUpDate','VisitPurpose','visitPurpose','VisitFrequency','visitFrequency','Status','VisitStatus',
    'FarmName','farmName','Farm','FarmCode','farmCode','FarmID','FarmType','farmType','Location','LocationName','AdvisorName','Advisor','ManagerName','Manager','Summary','Notes','VisitSummary'
  ];
  const renderedSet = new Set(renderedFieldNames.map(s => String(s).toLowerCase()));
  const otherFields = Object.keys(visit || {}).filter(k => {
    if (!k) return false;
    const low = String(k).toLowerCase();
    return !renderedSet.has(low);
  }).map(k => ({ k, v: visit[k] }));

  // schedule other fields
  const scheduleRenderedNames = ['scheduleid','schedulecode','visitcode','advisor','advisorname','approvalstatus','visitstatus','proposeddate','planneddate','createdby','createdat','frequency','farmid','farmname'];
  const schedRenderedSet = new Set(scheduleRenderedNames.map(s => String(s).toLowerCase()));
  const scheduleOtherFields = schedule ? Object.keys(schedule).filter(k => { const low = String(k).toLowerCase(); return !schedRenderedSet.has(low); }).map(k => ({ k, v: schedule[k] })) : [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 print:bg-white">
      {/* Embedded minimal print CSS for A4 page sizing and page counters */}
      <style>
        {`@media print {
            @page { size: A4; margin: 20mm }
            body { -webkit-print-color-adjust: exact; color-adjust: exact; }
            /* Prevent breaking inside important sections */
            .no-break { break-inside: avoid; page-break-inside: avoid; }
            /* Avoid breaking table rows across pages and repeat header */
            table { border-collapse: collapse; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr, td, th { break-inside: avoid; page-break-inside: avoid; }
            /* Page numbering (current page). Browser support for total pages varies. */
            .page-number:before { content: counter(page); }
            /* Ensure backgrounds and borders render in print */
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          /* Hide print-only helpers on screen */
          @media screen { .print-only { display: none; } }
        `}
      </style>

      <div className="w-full flex flex-col items-center">
        {/* Controls (hidden in print) */}
        <div className="w-full flex justify-end mb-4 gap-2 print:hidden" role="navigation" aria-label="Print controls">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none"
            aria-label="Print this report"
          >
            Print
          </button>
          {onClose && (
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">Close</button>
          )}
        </div>

        {/* A4 sheet centered on the page */}
        <article
          className="bg-white shadow-md print:shadow-none print:mx-0 overflow-hidden w-[210mm] max-w-[95vw] print:w-[210mm] print:h-[297mm] rounded-sm"
          role="document"
          aria-label={title}
        >
          {/* inner margin (mimics print margins). Use larger padding when printing */}
          <div className="p-8 print:p-[20mm] flex flex-col h-full">

            {/* Header */}
            <header className="flex items-center justify-between mb-6 no-break">
              <div className="flex items-center gap-4">
                <img src={logo || AKFLogo} alt="AKF Logo" className="h-16 w-16 object-contain" />
                <div>
                  <h1 className="text-2xl print:text-3xl font-bold text-gray-900">Alema Koudijs Feed PLC</h1>
                  <p className="text-sm text-gray-600 mt-1">Bishoftu, Ethiopia • +251 (930) 23-4567</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">{title}</div>
                <div className="text-lg font-semibold text-gray-800">{formattedDate}</div>
              </div>
            </header>

            {/* Grouped information: Visit Details + Farm Details */}
            {/* Schedule Details (if present) */}
            {schedule && (
              <section className="mb-6 no-break">
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Schedule Details</h3>
                  <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <dt className="text-gray-600">Schedule ID</dt>
                    <dd className="font-medium text-gray-800">{schedule.ScheduleID || schedule.id || schedule.ScheduleId || '—'}</dd>

                    <dt className="text-gray-600">Schedule Code</dt>
                    <dd className="font-medium text-gray-800">{schedule.VisitCode || schedule.ScheduleCode || schedule.ScheduleNumber || '—'}</dd>

                    <dt className="text-gray-600">Advisor</dt>
                    <dd className="font-medium text-gray-800">{schedule.AdvisorName || schedule.Advisor || '—'}</dd>

                    <dt className="text-gray-600">Approval Status</dt>
                    <dd className="font-medium text-gray-800">{schedule.ApprovalStatus || schedule.approvalStatus || '—'}</dd>

                    <dt className="text-gray-600">Visit Status</dt>
                    <dd className="font-medium text-gray-800">{schedule.VisitStatus || schedule.visitStatus || '—'}</dd>

                    <dt className="text-gray-600">Planned Date</dt>
                    <dd className="font-medium text-gray-800">{schedule.ProposedDate || schedule.proposedDate || schedule.PlannedDate || '—'}</dd>
                  </dl>

                  {scheduleOtherFields && scheduleOtherFields.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">More schedule fields</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {scheduleOtherFields.map((it,i) => (
                          <div key={i} className="flex gap-2">
                            <div className="text-gray-600 w-36">{String(it.k)}</div>
                            <div className="text-gray-800 break-words">{it.v === null || it.v === undefined || it.v === '' ? '—' : String(it.v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
            <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 no-break" aria-labelledby="visit-groups">
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Visit Details</h3>
                  <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <dt className="text-gray-600">Proposed Date</dt>
                    <dd className="font-medium text-gray-800">{visit.ProposedDate || visit.proposedDate || '—'}</dd>

                    <dt className="text-gray-600">Next Follow-up</dt>
                    <dd className="font-medium text-gray-800">{visit.NextFollowUpDate || visit.nextFollowUpDate || '—'}</dd>

                    <dt className="text-gray-600">Visit Purpose</dt>
                    <dd className="font-medium text-gray-800">{visit.VisitPurpose || visit.visitPurpose || '—'}</dd>

                    <dt className="text-gray-600">Frequency</dt>
                    <dd className="font-medium text-gray-800">{visit.VisitFrequency || visit.visitFrequency || '—'}</dd>

                    <dt className="text-gray-600">Status</dt>
                    <dd className="font-medium text-gray-800">{visit.Status || visit.VisitStatus || '—'}</dd>
                  </dl>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Farm Details</h3>
                  <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <dt className="text-gray-600">Farm Name</dt>
                    <dd className="font-medium text-gray-800">{visit.FarmName || visit.farmName || visit.Farm || '—'}</dd>

                    <dt className="text-gray-600">Farm Code</dt>
                    <dd className="font-medium text-gray-800">{visit.FarmCode || visit.farmCode || visit.FarmID || '—'}</dd>

                    <dt className="text-gray-600">Farm Type</dt>
                    <dd className="font-medium text-gray-800">{visit.FarmType || visit.farmType || '—'}</dd>

                    <dt className="text-gray-600">Location</dt>
                    <dd className="font-medium text-gray-800">{visit.Location || visit.LocationName || '—'}</dd>

                    <dt className="text-gray-600">Advisor</dt>
                    <dd className="font-medium text-gray-800">{visit.AdvisorName || visit.Advisor || '—'}</dd>

                    <dt className="text-gray-600">Manager</dt>
                    <dd className="font-medium text-gray-800">{visit.ManagerName || visit.Manager || '—'}</dd>
                  </dl>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary & Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{visit.Summary || visit.Notes || visit.VisitSummary || 'No additional notes provided.'}</p>
              </div>
            </section>

            {/* Additional fields not in primary groups */}
            {otherFields && otherFields.length > 0 && (
              <section className="mb-6 no-break">
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Other Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {otherFields.map((it, i) => (
                      <div key={String(i)} className="flex gap-2">
                        <div className="text-gray-600 w-40">{String(it.k)}</div>
                        <div className="text-gray-800 break-words">{it.v === null || it.v === undefined || it.v === '' ? '—' : String(it.v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Structured table */}
            <section className="mb-6 flex-1 no-break" aria-label="Structured data table">
              <div className="overflow-auto border border-gray-100 rounded">
                <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm print:text-sm" role="table">
                  <thead className="bg-gray-50 print:bg-gray-50" role="rowgroup">
                    <tr>
                      {/* Example columns: adjust according to entries shape */}
                      <th className="w-1/4 px-4 py-3 text-left font-medium text-gray-700">Item</th>
                      <th className="w-3/4 px-4 py-3 text-left font-medium text-gray-700">Value / Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100" role="rowgroup">
                    {entries && entries.length > 0 ? (
                      entries.map((row, idx) => {
                        // If row is an object with a single key/value, render them; otherwise stringify
                        if (typeof row === 'object' && !Array.isArray(row)) {
                          const keys = Object.keys(row);
                          return keys.map((k, i) => (
                            <tr key={`${idx}-${i}`} className="align-top no-break" role="row">
                              <td className="px-4 py-3 text-gray-700 align-top break-words" role="cell">{k}</td>
                                <td className="px-4 py-3 text-gray-800 align-top break-words" role="cell">{String(row[k])}</td>
                            </tr>
                          ));
                        }
                        return (
                          <tr key={idx} className="no-break" role="row">
                            <td className="px-4 py-3 text-gray-700" role="cell">{idx + 1}</td>
                            <td className="px-4 py-3 text-gray-800 break-words" role="cell">{String(row)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-gray-500">No structured data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Footer inside the sheet (not fixed) */}
            <footer className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-600 flex items-center justify-between print:mt-auto no-break">
              <div>Generated: {formattedDate}</div>
              <div className="text-center">
                <span>Page </span><span className="page-number" aria-hidden="true" />
              </div>
              <div className="flex flex-col items-end">
                <div>Signature:</div>
                <div className="h-8 w-48 border-b border-gray-300 mt-6" />
              </div>
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
};

export default VisitPrintPreview;
