import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import {
  FaPlus, FaSync, FaUpload, FaFileAlt, FaThLarge, FaTrash, FaBars, FaTimes,
  FaClipboardList, FaCheckCircle, FaTimesCircle, FaClipboardCheck, FaClock, FaExclamationTriangle
} from 'react-icons/fa';
import DateRangePicker from './DateRangePicker';

import { baseURL as API_BASE } from '../../utils/api'

const StatCard = ({ label, value, icon, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };

  return (
    <div className={`p-4 rounded-xl flex items-center gap-4 ${colors[color]}`}>
      <div className="p-2 bg-white/50 rounded-full">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value ?? '...'}</p>
        <p className="text-sm font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
};

function useFetchStats(reloadKey) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/farm-visit-schedule/statistics`);
        setStats(res.data?.data || {});
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    })();
  }, [reloadKey]);
  return { stats };
}

const ScheduleHeader = ({
  onNew, onRefresh, onClear, onReset, onShowDrafts, onBulkUpload, onDownloadTemplate,
  dateRange, onDateChange, farmType, onFarmTypeChange, onFilterChange,
  stats: parentStats, showDatePicker, onToggleDatePicker,
}) => {
  const [reloadKey, setReloadKey] = useState(0);
  const { stats: localStats } = useFetchStats(reloadKey);
  const effectiveStats = parentStats || localStats || {};
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleAction = (action, fallback) => action || fallback || (() => {});

  const safeStats = (() => {
    const s = effectiveStats.mainStats || effectiveStats || {};
    return {
      totalSchedules: s.TotalVisits ?? s.totalVisits ?? 0,
      approved: s.ApprovedVisits ?? s.Approved ?? 0,
      rejected: s.RejectedVisits ?? s.Rejected ?? 0,
      completed: s.CompletedVisits ?? s.Completed ?? 0,
      pending: s.PendingApprovalVisits ?? s.PendingApproval ?? s.Pending ?? 0,
      urgent: s.UrgentVisits ?? s.Urgent ?? 0,
    };
  })();

  useEffect(() => {
    const handler = () => setReloadKey(k => k + 1);
    window.addEventListener('farmvisit:changed', handler);
    return () => window.removeEventListener('farmvisit:changed', handler);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Farm Visit Schedules</h1> */}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total" value={safeStats.totalSchedules} icon={<FaClipboardList size={22} />} color="blue" />
        <StatCard label="Approved" value={safeStats.approved} icon={<FaCheckCircle size={22} />} color="purple" />
        <StatCard label="Rejected" value={safeStats.rejected} icon={<FaTimesCircle size={22} />} color="red" />
        <StatCard label="Completed" value={safeStats.completed} icon={<FaClipboardCheck size={22} />} color="green" />
        <StatCard label="Pending" value={safeStats.pending} icon={<FaClock size={22} />} color="yellow" />
        <StatCard label="Urgent" value={safeStats.urgent} icon={<FaExclamationTriangle size={22} />} color="orange" />
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-4"> 
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={handleAction(onNew)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all">
              <FaPlus /> New Schedule
            </button>
            <button onClick={handleAction(onRefresh, () => setReloadKey(k => k + 1))} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600">
              <FaSync /> Refresh
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAction(onBulkUpload)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600">
              <FaUpload /> Bulk Upload
            </button>
            <button onClick={handleAction(onDownloadTemplate)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600">
              <FaFileAlt /> Template
            </button>
            <button onClick={handleAction(onShowDrafts)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600">
              <FaThLarge /> Drafts
            </button>
          </div>
          <button onClick={() => setFiltersOpen(s => !s)} className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {filtersOpen ? <FaTimes /> : <FaBars />} Filters
          </button>
        </div>
        
        <div className={`${filtersOpen ? 'block' : 'hidden'} md:grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700`}>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Date Range</label>
            <div className="relative">
              <button onClick={() => onToggleDatePicker(true)} className="w-full p-2 text-left bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                {`${format(dateRange.startDate, 'MMM dd, yyyy')} - ${format(dateRange.endDate, 'MMM dd, yyyy')}`}
              </button>
              {showDatePicker && (
                <DateRangePicker
                  range={dateRange}
                  onChange={onDateChange}
                  onClose={() => onToggleDatePicker(false)}
                />
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Farm Type</label>
            <select value={farmType} onChange={(e) => onFarmTypeChange(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
              <option value="">All Types</option>
              <option value="DAIRY">Dairy</option>
              <option value="LAYER">Layer</option>
              <option value="BROILER">Broiler</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleAction(onClear, () => onFilterChange({}))} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600">
              <FaTrash /> Clear Filters
            </button>
            <button onClick={handleAction(onReset)} className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600">
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleHeader;