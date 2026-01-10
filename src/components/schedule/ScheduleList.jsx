import React, { useEffect, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import api from '../../services/api';
import { validateCompleteRequirements } from '../../utils/visitValidation';
import { 
  Pencil, 
  Trash2, 
  ArrowUpCircle, 
  CheckCircle, 
  File, 
  FilePenLine, 
  Clock, 
  XCircle,
  CalendarClock,
  Check
} from 'lucide-react';
import { Eye } from 'lucide-react';
const renderStatus = (visitStatus, approvalStatus) => {
  const v = (visitStatus || '').toString().trim().toLowerCase();
  const a = (approvalStatus || '').toString().trim().toLowerCase();

  let statusText = 'Unknown';
  let statusColor = 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  let Icon = File;

  if (v === 'completed' || a === 'completed') {
    statusText = 'Completed';
    statusColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    Icon = CheckCircle;
  } else if (v === 'draft') {
    statusText = 'Draft';
    statusColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    Icon = File;
  } else if (a === 'approved') {
    statusText = 'Approved';
    statusColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    Icon = CheckCircle;
  } else if (['pending', 'pending approval', 'pending_approval'].includes(a)) {
    statusText = 'Pending Approval';
    statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    Icon = Clock;
  } else if (v === 'scheduled') {
    statusText = 'Scheduled';
    statusColor = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
    Icon = CalendarClock;
  } else if (['rejected', 'denied'].includes(a)) {
    statusText = 'Rejected';
    statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    Icon = XCircle;
  } else if (a) {
    statusText = String(approvalStatus);
  } else if (v) {
    statusText = String(visitStatus);
  }

  return (
    <span className={`px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
      <Icon className="mr-1.5 h-3 w-3" />
      {statusText}
    </span>
  );
};

const renderApprovalBadge = (approvalStatus) => {
  const a = (approvalStatus || '').toString().trim().toLowerCase();
  if (!a) return <span className="text-sm text-gray-600">—</span>;
  if (a === 'approved') return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Approved</span>;
  if (a === 'rejected' || a === 'denied') return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Rejected</span>;
  if (a.includes('pending')) return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
  return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{String(approvalStatus)}</span>;
};

const ActionButton = ({ onClick, icon: Icon, title, disabled = false, disabledReason = '', className = '' }) => (
  <div className="relative inline-block group">
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      className={`p-2 rounded-md transition-colors duration-150 ${
        disabled ? 'text-gray-400 opacity-50 cursor-not-allowed bg-transparent' : 'text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
      } focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
    </button>

    {/* Styled tooltip: appears on hover or focus within the group. If disabled, show disabledReason when present. */}
    <span
      role="tooltip"
      className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transform whitespace-nowrap rounded px-2 py-1 text-xs font-medium transition-opacity duration-150 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 z-50 bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-100`}
    >
      {disabled ? (disabledReason || title) : title}
    </span>
  </div>
);

const ScheduleList = ({ schedules, onEdit, onDelete, onSubmit, onFill, onProcess, onComplete, onView, fetchWithAuth, recentlyFilled = {}, confirmedFilled = {}, pageStartOffset = 0 }) => {
  const [advisorMap, setAdvisorMap] = useState({});
  const [latestMap, setLatestMap] = useState({});
  const [approvalFilter, setApprovalFilter] = useState('All');
  const [visitStatusFilter, setVisitStatusFilter] = useState('All');

  useEffect(() => {
    try {
      // Helpful debug when schedules do not render: log count and sample
      // This can be removed once the root cause is identified.
      // eslint-disable-next-line no-console
      console.debug('[ScheduleList] incoming schedules', Array.isArray(schedules) ? schedules.length : typeof schedules, schedules && schedules[0]);
    } catch (e) {
      // ignore logging errors
    }
  }, [schedules]);

  useEffect(() => {
    const ids = (schedules || []).map(s => s.id ?? s.ScheduleID).filter(Boolean);
    if (ids.length === 0) return;

    const fetchLatestData = async () => {
      const promises = ids.map(id =>
        api.callWithAuthOrApi(fetchWithAuth, { url: `/farm-visit-schedule/${id}` })
          .then(res => ({ id, data: res.data?.data || res.data }))
          .catch(() => ({ id, data: null }))
      );
      const results = await Promise.all(promises);
      const map = results.reduce((acc, r) => (r.id ? { ...acc, [r.id]: r.data } : acc), {});
      setLatestMap(prev => ({ ...prev, ...map }));
    };
    fetchLatestData();
  }, [schedules, fetchWithAuth]);

  useEffect(() => {
    const advisorIds = [...new Set((schedules || []).map(s => s.AdvisorID).filter(Boolean))];
    if (advisorIds.length === 0) return;

    const fetchAdvisors = async () => {
      const promises = advisorIds.map(id =>
        api.callWithAuthOrApi(fetchWithAuth, { url: `/advisor/${id}` })
          .then(res => {
            const body = res && res.data !== undefined ? res.data : res;
            // Normalize possible shapes: { data: { ... } } or direct object
            const item = (body && body.data) ? (Array.isArray(body.data) ? body.data[0] : body.data) : (Array.isArray(body) ? body[0] : body);
            const name = item?.name || item?.Name || `${item?.FirstName || item?.firstName || ''} ${item?.LastName || item?.lastName || item?.FatherName || ''}`.trim() || 'Unknown';
            return ({ id, name });
          })
          .catch(() => ({ id, name: 'Unknown' }))
      );
      const results = await Promise.all(promises);
      const map = results.reduce((acc, r) => ({ ...acc, [r.id]: r.name }), {});
      setAdvisorMap(prev => ({ ...prev, ...map }));
    };
    fetchAdvisors();
  }, [schedules, fetchWithAuth]);

  useEffect(() => {
    const updatedHandler = (e) => {
      const { id, data } = e.detail || {};
      if (!id || !data) return;
      setLatestMap(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...data } }));
    };
    window.addEventListener('farmvisit:updated', updatedHandler);
    return () => window.removeEventListener('farmvisit:updated', updatedHandler);
  }, []);

  

  // apply approval status filter client-side
  const filteredSchedules = (schedules || []).filter(s => {
    if (!approvalFilter || approvalFilter === 'All') return true;
    const approvalStatus = ((latestMap[s.id ?? s.ScheduleID]?.ApprovalStatus ?? s.ApprovalStatus) || '');
    const a = String(approvalStatus).toLowerCase();
    switch (approvalFilter) {
      case 'Approved':
        return a.includes('approved');
      case 'Pending':
        return a.includes('pending') || a.includes('submitted');
      case 'Rejected':
        return a.includes('rejected') || a.includes('denied');
      case 'Submitted':
        return a.includes('submitted');
      case 'None':
        return !a || a.trim() === '';
      default:
        return true;
    }
  });

  // apply visit status filter client-side (in addition to approval filter)
  const filteredByVisitStatus = filteredSchedules.filter(s => {
    if (!visitStatusFilter || visitStatusFilter === 'All') return true;
    const visitStatus = ((latestMap[s.id ?? s.ScheduleID]?.VisitStatus ?? s.VisitStatus) || '');
    const v = String(visitStatus).toLowerCase();
    switch (visitStatusFilter) {
      case 'Scheduled':
        return v === 'scheduled';
      case 'Draft':
        return v === 'draft' || v === 'd';
      case 'Completed':
        return v === 'completed' || v === 'complete';
      case 'Cancelled':
        return v === 'cancelled' || v === 'canceled' || v === 'cancel';
      case 'None':
        return !v || v.trim() === '';
      default:
        return true;
    }
  });

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
            {['Farm Name', 'Visit Code', 'Advisor', 'Scheduled Date', 'Farm Type', 'Visit Type', 'Visit Status', 'Approval Status', 'Actions'].map(header => (
              <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {(filteredByVisitStatus || []).map((schedule, _idx) => {
            const idx = (pageStartOffset || 0) + _idx + 1;
            const id = schedule.id ?? schedule.ScheduleID;
            const latest = latestMap[id] || {};
            const visitStatus = latest.VisitStatus ?? schedule.VisitStatus;
            const approvalStatus = latest.ApprovalStatus ?? schedule.ApprovalStatus;
            const isCompleted = (visitStatus || '').toLowerCase() === 'completed';
            const canComplete = validateCompleteRequirements(schedule).ready;
            const normalizedVisitStatus = String(visitStatus || '').toLowerCase();
            
            const aNorm = String(approvalStatus || '').toLowerCase();
            const isSubmitted = aNorm.includes('pending') || aNorm === 'submitted' || aNorm === 'submitted_for_approval' || aNorm === 'submitted_forapproval' || aNorm === 'submitted_for_approval';
            const isApproved = aNorm === 'approved';
            const isScheduled = String(visitStatus || '').toLowerCase() === 'scheduled';

            // Some backends return a completed flag on the schedule or latestMap under different names
            const completionKeys = ['IsVisitCompleted', 'IsDairyVisitCompleted', 'IsVisitCompletedFlag', 'IsCompleted', 'IsCompletedFlag'];
            const isVisitCompletedFlag = completionKeys.some(k => {
              const v = (latest && latest[k] !== undefined) ? latest[k] : (schedule && schedule[k] !== undefined ? schedule[k] : undefined);
              if (v === undefined || v === null) return false;
              const s = String(v).toLowerCase();
              return s === '1' || s === 'true' || s === 'yes';
            });

            // Fill should be active only when the schedule is approved; disable if already completed
            const fillDisabled = isCompleted || isVisitCompletedFlag || Boolean(recentlyFilled[id]) || Boolean(confirmedFilled[id]) ? true : !isApproved;
            const fillDisabledReason = isCompleted || isVisitCompletedFlag || Boolean(confirmedFilled[id]) ? 'Visit already completed' : (Boolean(recentlyFilled[id]) ? 'Visit saved — awaiting server confirmation' : (!isApproved ? 'Requires approved schedule' : ''));
            const isDraft = normalizedVisitStatus === 'draft' || normalizedVisitStatus === 'd';
            const submitDisabledReason = !isDraft ? 'Submit allowed only when visit status is Draft' : '';
            const submitDisabled = !isDraft;
            const approveDisabledReason = aNorm === 'approved' ? 'Already approved' : (!isScheduled ? 'Approve only allowed when visit is Scheduled' : '');
            

            return (
              <tr key={id} className={`transition-colors duration-500`}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{idx}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{schedule.FarmName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{schedule.VisitCode || schedule.VisitCodeName || schedule.VisitCodeDisplay || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{advisorMap[schedule.AdvisorID] || 'Loading...'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {(() => {
                    const dateStr = schedule.ScheduleDate || schedule.ProposedDate || schedule.ProposedDateTime || schedule.ProposedDateTimeLocal || null;
                    if (!dateStr) return '—';
                    try {
                      const parsed = parseISO(String(dateStr));
                      return isValid(parsed) ? format(parsed, 'MMM dd, yyyy') : 'Invalid Date';
                    } catch (e) {
                      return 'Invalid Date';
                    }
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{schedule.FarmType || schedule.FarmTypeCode || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{schedule.VisitPurpose || schedule.VisitType || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{visitStatus ? renderStatus(visitStatus, approvalStatus) : <span className="text-sm text-gray-600">—</span>}</td>
                <td className="px-6 py-4 whitespace-nowrap">{renderApprovalBadge(approvalStatus)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <ActionButton onClick={() => onEdit(schedule)} icon={Pencil} title="Edit" disabled={isApproved} disabledReason={isApproved ? 'Schedule approved — editing disabled' : ''} />
                    <ActionButton onClick={() => onSubmit(schedule)} icon={ArrowUpCircle} title="Submit" disabled={submitDisabled} disabledReason={submitDisabledReason} />
                    <ActionButton onClick={() => onProcess && onProcess(schedule)} icon={Check} title="Approve" disabled={!isScheduled || String(approvalStatus || '').toLowerCase().includes('approved')} disabledReason={approveDisabledReason} className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" />
                    <ActionButton onClick={() => onFill(schedule)} icon={FilePenLine} title="Fill Visit" disabled={fillDisabled} disabledReason={fillDisabledReason} />
                    <ActionButton onClick={() => onView && onView(schedule)} icon={Eye} title="View Visit" className="text-sky-600" />
                    
                    <ActionButton onClick={() => onDelete(schedule)} icon={Trash2} title="Delete" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      
    </div>
  );
};

export default ScheduleList;