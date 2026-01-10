import React, { useEffect, useState, useRef } from 'react';
import {
  FaUsers, FaFileAlt, FaClock, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaArchive, FaHistory, FaCalendarCheck
} from 'react-icons/fa';
import apiClient from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
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

// Quick action and recent activity UI removed per request

const DashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [farmStats, setFarmStats] = useState(null);
  const [farmLoading, setFarmLoading] = useState(true);
  const [visitsByStatus, setVisitsByStatus] = useState([])
  const [visitsByStatusLoading, setVisitsByStatusLoading] = useState(true)
  const [visitsByFarmType, setVisitsByFarmType] = useState([])
  const [visitsByFarmTypeLoading, setVisitsByFarmTypeLoading] = useState(true)
  const [monthlyTrends, setMonthlyTrends] = useState([])
  const [monthlyTrendsLoading, setMonthlyTrendsLoading] = useState(true)
  const [advisorPerf, setAdvisorPerf] = useState([])
  const [advisorPerfLoading, setAdvisorPerfLoading] = useState(true)
  const [advisorShowAll, setAdvisorShowAll] = useState(false)
  const [advisorPage, setAdvisorPage] = useState(1)
  const advisorPageSize = 10

  const computeTotal = (s) => {
    if (!s) return 0;
    return Object.values(s).reduce((acc, value) => acc + (Number(value) || 0), 0);
  };

  // Format YearMonth values like 202501 -> 'Jan 2025'
  const formatYearMonth = (ym) => {
    if (!ym) return ''
    const s = String(ym)
    if (/^\d{6}$/.test(s)) {
      const y = Number(s.slice(0,4))
      const m = Number(s.slice(4,6))
      try {
        const d = new Date(y, m - 1, 1)
        return d.toLocaleString(undefined, { month: 'short', year: 'numeric' })
      } catch (e) {
        return s
      }
    }
    return s
  }

  const monthlyChartData = (monthlyTrends || []).slice(-12).map(r => ({
    label: r.MonthName || (r.YearMonth ? formatYearMonth(r.YearMonth) : (r.YearMonthString || r.label || '')),
    TotalVisits: Number(r.TotalVisits || r.Total || r.VisitCount || 0) || 0
  }))

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
    // fetch reporting views and advisor performance
    (async () => {
      try {
        setVisitsByStatusLoading(true)
        const r1 = await apiClient.get('/farm-visit-schedule/stats/visits-by-status')
        setVisitsByStatus(r1.data?.data || r1.data || [])
      } catch (e) { console.debug('visits-by-status fetch failed', e) } finally { setVisitsByStatusLoading(false) }

      try {
        setVisitsByFarmTypeLoading(true)
        const r2 = await apiClient.get('/farm-visit-schedule/stats/visits-by-farmtype')
        setVisitsByFarmType(r2.data?.data || r2.data || [])
      } catch (e) { console.debug('visits-by-farmtype fetch failed', e) } finally { setVisitsByFarmTypeLoading(false) }

      try {
        setMonthlyTrendsLoading(true)
        const r3 = await apiClient.get('/farm-visit-schedule/stats/monthly-trends')
        setMonthlyTrends(r3.data?.data || r3.data || [])
      } catch (e) { console.debug('monthly-trends fetch failed', e) } finally { setMonthlyTrendsLoading(false) }

      try {
        setAdvisorPerfLoading(true)
        const r4 = await apiClient.get('/farm-visit-schedule/stats/advisor-performance?top=10')
        setAdvisorPerf(r4.data?.data || r4.data || [])
      } catch (e) { console.debug('advisor-performance fetch failed', e) } finally { setAdvisorPerfLoading(false) }
    })()
  }, []);

  // Toggle handler: fetch top N or all advisors when user toggles
  const toggleAdvisorShowAll = async () => {
    try {
      const wantAll = !advisorShowAll
      setAdvisorShowAll(wantAll)
      setAdvisorPerfLoading(true)
      const url = wantAll ? '/farm-visit-schedule/stats/advisor-performance' : '/farm-visit-schedule/stats/advisor-performance?top=10'
      const r = await apiClient.get(url)
      setAdvisorPerf(r.data?.data || r.data || [])
      setAdvisorPage(1)
    } catch (e) {
      console.debug('toggleAdvisorShowAll failed', e)
    } finally {
      setAdvisorPerfLoading(false)
    }
  }

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
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
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

          
        </section>
      )}

      <section>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Farms Summary</h2>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
          <FarmsStatsWidget externalData={farmStats} externalLoading={farmLoading} wide />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mt-8 mb-4">More Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Visits By Status</h4>
            {visitsByStatusLoading ? <div className="text-sm text-gray-500">Loading...</div> : (
              visitsByStatus && visitsByStatus.length > 0 ? visitsByStatus.map(s => (
                <div key={s.Status} className="flex items-center gap-4 mb-2">
                  <div className="w-32 text-sm text-gray-700">{s.Status}</div>
                  <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                    <div style={{ width: `${s.Percentage || 0}%` }} className="h-3 bg-blue-500" />
                  </div>
                  <div className="w-12 text-right text-sm font-semibold">{s.VisitCount}</div>
                </div>
              )) : <div className="text-sm text-gray-500">No data</div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Visits By Farm Type</h4>
            {visitsByFarmTypeLoading ? <div className="text-sm text-gray-500">Loading...</div> : (
              visitsByFarmType && visitsByFarmType.length > 0 ? visitsByFarmType.map(ft => (
                <div key={ft.FarmType} className="flex items-center gap-3 mb-2">
                  <div className="w-32 text-sm text-gray-700">{ft.FarmType || '—'}</div>
                  <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                    <div style={{ width: `${ft.Percentage || 0}%` }} className="h-3 bg-green-500" />
                  </div>
                  <div className="w-12 text-right text-sm font-semibold">{ft.VisitCount}</div>
                </div>
              )) : <div className="text-sm text-gray-500">No data</div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 lg:col-span-2">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Monthly Visit Trends</h4>
            {monthlyTrendsLoading ? <div className="text-sm text-gray-500">Loading...</div> : (
              monthlyChartData && monthlyChartData.length > 0 ? (
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={48} />
                      <YAxis allowDecimals={false} />
                      <ReTooltip formatter={(value) => [value, 'Visits']} />
                      <Bar dataKey="TotalVisits" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="text-sm text-gray-500">No trend data</div>
            )}
          </div>

          <div className="mt-6 lg:mt-0 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 lg:col-span-4">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Top Advisors (by Completed Visits)</h4>
            {advisorPerfLoading ? <div className="text-sm text-gray-500">Loading...</div> : (
              advisorPerf && advisorPerf.length > 0 ? (
                <div>
                  <div className="h-72" style={{ minWidth: 0, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={advisorPerf.slice((advisorPage-1)*advisorPageSize, (advisorPage)*advisorPageSize)} margin={{ top: 28, right: 12, left: 0, bottom: 48 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="AdvisorName" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={60} />
                        <YAxis />
                        <ReTooltip />
                        <Legend verticalAlign="top" align="right" />
                        <Bar dataKey="CompletedVisits" name="Completed" fill="#10b981" />
                        <Bar dataKey="TotalVisitsAssigned" name="Assigned" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button onClick={toggleAdvisorShowAll} className="px-3 py-1 bg-gray-100 rounded text-sm">{advisorShowAll ? 'Show Top 10' : 'Show All'}</button>
                      {advisorShowAll && advisorPerf.length > advisorPageSize && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setAdvisorPage(p => Math.max(1, p-1))} disabled={advisorPage <= 1} className="px-2 py-1 bg-white border rounded text-sm">Prev</button>
                          <div className="text-sm text-gray-600">Page {advisorPage} of {Math.ceil(advisorPerf.length / advisorPageSize)}</div>
                          <button onClick={() => setAdvisorPage(p => Math.min(Math.ceil(advisorPerf.length / advisorPageSize), p+1))} disabled={advisorPage >= Math.ceil(advisorPerf.length / advisorPageSize)} className="px-2 py-1 bg-white border rounded text-sm">Next</button>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">Showing {Math.min(advisorPage*advisorPageSize, advisorPerf.length)} of {advisorPerf.length}</div>
                  </div>
                </div>
              ) : <div className="text-sm text-gray-500">No advisor performance data</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardHome;