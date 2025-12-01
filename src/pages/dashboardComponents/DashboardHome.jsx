import React, { useEffect, useState, useRef } from 'react';
import {
  FaUsers, FaFileAlt, FaClock, FaCalendarAlt, FaPlusCircle, FaChartBar,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaArchive, FaHistory, FaCalendarCheck
} from 'react-icons/fa';
import apiClient from '../../utils/api';
import FarmsStatsWidget from './FarmsStatsWidget';

const getPieData = (stats = {}) => {
  const s = stats || {};
  const items = [
    { key: 'Rejected', label: 'Rejected', value: Number(s.Rejected) || 0, colorClass: 'fill-red-500', swatchClass: 'bg-red-500' },
    { key: 'Postponed', label: 'Postponed', value: Number(s.Postponed) || 0, colorClass: 'fill-purple-500', swatchClass: 'bg-purple-500' },
    { key: 'Pending', label: 'Pending', value: Number(s.PendingApproval) || 0, colorClass: 'fill-yellow-400', swatchClass: 'bg-yellow-400' },
    { key: 'Completed', label: 'Completed', value: Number(s.Completed) || 0, colorClass: 'fill-green-500', swatchClass: 'bg-green-500' },
  ];
  return items.filter(i => i.value > 0);
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = (angleDeg - 90) * Math.PI / 180.0;
  return { x: cx + (r * Math.cos(angleRad)), y: cy + (r * Math.sin(angleRad)) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function PieChart({ stats = {}, size = 160 }) {
  const data = getPieData(stats);
  const total = data.reduce((s, it) => s + it.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = Math.max(24, (size / 2) - 8);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, label: '', value: 0, pct: '0.0' });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  if (!data || data.length === 0 || total === 0) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">No distribution to show</div>;
  }

  const handleEnter = (e, d) => {
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const pct = total ? ((d.value / total) * 100).toFixed(1) : '0.0';
    setTooltip({ visible: true, x, y, label: d.label, value: d.value, pct });
  };

  const handleMove = (e) => {
    if (!tooltip.visible) return;
    const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const clientX = e.clientX || 0;
    const clientY = e.clientY || 0;
    setTooltip(t => ({ ...t, x: clientX - rect.left, y: clientY - rect.top }));
  };

  const handleLeave = () => setTooltip({ visible: false, x: 0, y: 0, label: '', value: 0, pct: '0.0' });

  let angle = 0;
  return (
    <div ref={containerRef} className="relative" onMouseMove={handleMove}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map(d => {
          const portion = (d.value / total) * 360;
          const start = angle;
          const end = angle + portion;
          const path = describeArc(cx, cy, r, start, end);
          angle = end;
          return <path key={d.key} d={path} className={`${d.colorClass} stroke-none`} onMouseEnter={(e) => handleEnter(e, d)} onMouseLeave={handleLeave} onTouchStart={(e) => handleEnter(e, d)} />;
        })}
        <circle cx={cx} cy={cy} r={r * 0.48} fill={isDark ? '#1f2937' : '#ffffff'} />
      </svg>

      {tooltip.visible && (
        <div style={{ left: tooltip.x + 12, top: tooltip.y + 12 }} className="pointer-events-none absolute bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs rounded-lg shadow-lg px-3 py-2 z-10">
          <div className="font-bold">{tooltip.label}</div>
          <div className="text-xs">{tooltip.value} ({tooltip.pct}%)</div>
        </div>
      )}
    </div>
  );
}

function PieLegend({ stats = {} }) {
  const data = getPieData(stats);
  const total = data.reduce((s, it) => s + it.value, 0);
  if (!data || data.length === 0) return <div className="text-sm text-gray-500 dark:text-gray-400">No distribution data</div>;
  return (
    <div className="space-y-3">
      {data.map(d => {
        const pct = total ? ((d.value / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={d.key} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`${d.swatchClass} w-3 h-3 rounded-sm inline-block`} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{d.label}</span>
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{d.value} <span className="text-xs text-gray-500">({pct}%)</span></div>
          </div>
        );
      })}
    </div>
  );
}

const StatCard = ({ icon, label, value, className = '', colorClass = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
      </div>
      <div className={`rounded-full p-3 ${colorClass}`}>
        {icon}
      </div>
    </div>
  </div>
);

const RecentActivityItem = ({ icon, text, time }) => (
  <div className="flex items-start space-x-4 py-4">
    <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-3">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{time}</p>
    </div>
  </div>
);

const QuickActionButton = ({ icon, label }) => (
  <button className="flex items-center justify-center w-full bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-300">
    {icon}
    <span className="ml-2 text-sm">{label}</span>
  </button>
);

const DashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [farmStats, setFarmStats] = useState(null);
  const [farmLoading, setFarmLoading] = useState(true);

  const computeTotal = (s) => {
    if (!s) return 0;
    return Object.values(s).reduce((acc, value) => acc + (Number(value) || 0), 0);
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/farm-visit-schedule/stats/quick');
        setStats(response.data?.data || response.data);
      } catch (err) {
        console.error('Failed to fetch dashboard statistics.', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    const fetchFarmStats = async () => {
      try {
        setFarmLoading(true);
        const res = await apiClient.get('/farms/statistics/quick');
        setFarmStats(res.data?.data || res.data);
      } catch (err) {
        console.error('Failed to fetch farm statistics', err);
      } finally {
        setFarmLoading(false);
      }
    };
    fetchFarmStats();
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Welcome Back!</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">Here's a snapshot of your farm's activities.</p>
      </header>

      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Farm Visit Summary</h2>
      {stats && !loading && computeTotal(stats) === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No visit data available.</div>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard icon={<FaUsers size={24} />} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" label="Total Visits" value={stats ? stats.TotalVisits : '...'} />
            <StatCard icon={<FaClock size={24} />} colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" label="Pending" value={stats ? stats.PendingApproval : '...'} />
            <StatCard icon={<FaFileAlt size={24} />} colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" label="Completed" value={stats ? stats.Completed : '...'} />
            <StatCard icon={<FaExclamationTriangle size={24} />} colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" label="Urgent" value={stats ? stats.UrgentVisits : '...'} />
            <StatCard icon={<FaCheckCircle size={24} />} colorClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" label="Approved" value={stats ? stats.Approved : '...'} />
            <StatCard icon={<FaTimesCircle size={24} />} colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" label="Rejected" value={stats ? stats.Rejected : '...'} />
            <StatCard icon={<FaArchive size={24} />} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" label="Postponed" value={stats ? stats.Postponed : '...'} />
            <StatCard icon={<FaHistory size={24} />} colorClass="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" label="Overdue" value={stats ? stats.OverdueVisits : '...'} />
            <StatCard icon={<FaCalendarCheck size={24} />} colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" label="Today's Visits" value={stats ? stats.TodayVisits : '...'} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Visit Distribution</h3>
            <div className="w-full flex items-center justify-center">
              <PieChart stats={stats} size={200} />
            </div>
            <div className="w-full mt-6">
              <PieLegend stats={stats} />
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Farms Summary</h2>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
          <FarmsStatsWidget externalData={farmStats} externalLoading={farmLoading} wide />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickActionButton icon={<FaPlusCircle size={18} />} label="New Farm Visit" />
            <QuickActionButton icon={<FaCalendarAlt size={18} />} label="View Schedule" />
            <QuickActionButton icon={<FaChartBar size={18} />} label="Analytics" />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Recent Activity</h3>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <RecentActivityItem icon={<FaFileAlt size={20} className="text-blue-500" />} text="Dr. Smith submitted a new visit report for Green Valley Farm." time="2 hours ago" />
            <RecentActivityItem icon={<FaClock size={20} className="text-yellow-500" />} text="A visit to Sunny Meadows Farm is pending approval." time="5 hours ago" />
            <RecentActivityItem icon={<FaUsers size={20} className="text-green-500" />} text="You have a new visit scheduled for tomorrow at Oakwood Farm." time="1 day ago" />
          </div>
          <button className="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-4">
            View all activity
          </button>
        </section>
      </div>
    </div>
  );
};

export default DashboardHome;