import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import api from '../../utils/api';

export default function ReportFormFarm() {
  const [items, setItems] = useState([]);
  const [chartData, setChartData] = useState({ pieData: [], barData: [], sizeData: [] });
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);

  const PIE_COLORS = ['#4F46E5', '#06B6D4', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#E11D48', '#0EA5E9', '#F97316', '#14B8A6'];

  const runReport = useCallback(async (page = 1, pageSize = 20, filters = {}) => {
    setLoading(true);
    try {
      const payload = { ...filters, PageNumber: page, PageSize: pageSize };
      const res = await api.post('/farms/report/farm', payload).catch(() => null);
      const body = res?.data ?? null;
      const itemsRes = body?.data?.items ?? body?.items ?? body ?? [];
      setItems(Array.isArray(itemsRes) ? itemsRes : []);
    } catch (err) {
      console.error('Failed to fetch farm report', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const computeChartData = useCallback((rows) => {
    const typeCounts = {};
    const regionCounts = {};
    const sizeRanges = { 'Small (<5ha)': 0, 'Medium (5-20ha)': 0, 'Large (>20ha)': 0 };

    (rows || []).forEach((farm) => {
      const type = farm.FarmTypeName || farm.FarmType || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      const region = farm.Region || 'Unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
      const size = parseFloat(farm.FarmSize || 0) || 0;
      if (size < 5) sizeRanges['Small (<5ha)']++;
      else if (size <= 20) sizeRanges['Medium (5-20ha)']++;
      else sizeRanges['Large (>20ha)']++;
    });

    const pieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
    const barData = Object.entries(regionCounts).map(([name, value]) => ({ name, value }));
    const sizeData = Object.entries(sizeRanges).map(([name, value]) => ({ name, value }));

    setChartData({ pieData, barData, sizeData });
  }, []);

  const loadTrendData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      const endDate = new Date();
      const res = await api
        .get(`/farms/report/registration-trend?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&groupBy=MONTH`)
        .catch(() => null);
      const data = res?.data?.data || res?.data || [];
      const t = Array.isArray(data)
        ? data.map((item) => ({ period: item.Period || item.period, count: item.Count || item.count || 0 }))
        : [];
      if (t.length) setTrendData(t);
      else {
        const mock = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          mock.push({ period: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), count: Math.floor(Math.random() * 50) + 10 });
        }
        setTrendData(mock);
      }
    } catch (err) {
      console.error('Failed to load trend data', err);
      const mock = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        mock.push({ period: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), count: Math.floor(Math.random() * 50) + 10 });
      }
      setTrendData(mock);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runReport(1, 20, {});
    loadTrendData();
  }, [runReport, loadTrendData]);

  useEffect(() => {
    if (Array.isArray(items) && items.length > 0) computeChartData(items);
    else setChartData({ pieData: [], barData: [], sizeData: [] });
  }, [items, computeChartData]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Farm Report — Charts & Trends</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await runReport(1, 20, {});
              await loadTrendData();
            }}
            disabled={loading}
            className={`px-3 py-1 rounded text-sm ${loading ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'}`}
            aria-label="Refresh charts"
          >
            Refresh
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <div className="mt-2 text-sm text-gray-500">Loading charts...</div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Farm Types Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={chartData.pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={90} innerRadius={40} dataKey="value">
                      {chartData.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Farms by Region
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Farm Size Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.sizeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <div className="mt-2 text-sm text-gray-500">Loading trends...</div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Farm Registration Trends (Last 12 Months)
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

   [items, farmTypes, farmTypeNameCache];

  // color palette for pie slices
  const PIE_COLORS = ['#4F46E5','#06B6D4','#EF4444','#F59E0B','#10B981','#8B5CF6','#E11D48','#0EA5E9','#F97316','#14B8A6'];

  // clicking a pie slice will filter by that farm type (name or id if available)
  const handlePieClick = async (entry) => {
    if (!entry) return;
    // Always use the friendly farm type name when filtering (backend stored-proc expects FarmType name)
    const name = entry.name || '';
    const filters = { FarmType: name };
    // switch to reports mode and apply
    setReportMode('report');
    setPageNumber(1);
    await handleApply(filters);
  };

  // Load trend data (mock data for now, can be replaced with real API call)
  const loadTrendData = useCallback(async () => {
    setChartLoading(true);
    try {
      // Use the registration trend API if available
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      const endDate = new Date();

      const res = await api.get(`/farms/report/registration-trend?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&groupBy=MONTH`);
      const data = res?.data?.data || [];

      const trendData = data.map(item => ({
        period: item.Period || item.period,
        count: item.Count || item.count || 0
      }));

      setTrendData(trendData);
    } catch (err) {
      console.error('Failed to load trend data', err);
      // Fallback to mock data
      const mockData = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        mockData.push({
          period: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          count: Math.floor(Math.random() * 50) + 10
        });
      }
      setTrendData(mockData);
    } finally {
      setChartLoading(false);
    }
  }, []);

  // Effect to load chart data when items change
  useEffect(() => {
    // Load chart data whenever we have items (e.g. after running the report)
    if (items && items.length > 0) {
      loadChartData();
    }
  }, [items, loadChartData]);

  // Effect to load trend data on mount (so trends are ready when Views tab is opened)
  useEffect(() => {
    loadTrendData();
  }, [loadTrendData]);
  const callViewSummary = async () => {
    setAuxLoading(true); setAuxResult(null);
    try { const r = await api.get('/farms/views/summary'); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) }
  }
  const callViewByRegion = async (opts={}) => {
    setAuxLoading(true); setAuxResult(null);
    try { const q = [];
      if (opts.region) q.push(`region=${encodeURIComponent(opts.region)}`);
      if (opts.zone) q.push(`zone=${encodeURIComponent(opts.zone)}`);
      if (opts.wereda) q.push(`wereda=${encodeURIComponent(opts.wereda)}`);
      if (opts.cityTown) q.push(`cityTown=${encodeURIComponent(opts.cityTown)}`);
      const path = '/farms/views/by-region' + (q.length?('?'+q.join('&')):'');
      const r = await api.get(path); setAuxResult(r?.data);
    } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) }
  }
  const callViewSizeAnalysis = async (opts={}) => { setAuxLoading(true); setAuxResult(null); try { const qs = []; if (opts.region) qs.push(`region=${encodeURIComponent(opts.region)}`); if (opts.zone) qs.push(`zone=${encodeURIComponent(opts.zone)}`); const r = await api.get('/farms/views/size-analysis' + (qs.length?('?'+qs.join('&')):'')); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }
  const callActiveDirectory = async () => { setAuxLoading(true); setAuxResult(null); try { const r = await api.get('/farms/views/active-directory'); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }
  const callAuditTrail = async () => { setAuxLoading(true); setAuxResult(null); try { const r = await api.get('/farms/views/audit-trail'); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }
  const callLocations = async () => { setAuxLoading(true); setAuxResult(null); try { const r = await api.get('/farms/views/locations'); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }

  // Reports
  const callGeographic = async (level=1) => { setAuxLoading(true); setAuxResult(null); try { const r = await api.get(`/farms/report/geographic?groupByLevel=${level}`); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }
  const callReportSizeAnalysis = async (region) => { setAuxLoading(true); setAuxResult(null); try { const r = await api.get('/farms/report/size-analysis' + (region?`?region=${encodeURIComponent(region)}`:'')); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }
  const callRegistrationTrend = async (startDate,endDate,groupBy='MONTH') => { setAuxLoading(true); setAuxResult(null); try { const q = `?startDate=${encodeURIComponent(startDate||'')}&endDate=${encodeURIComponent(endDate||'')}&groupBy=${encodeURIComponent(groupBy)}`; const r = await api.get('/farms/report/registration-trend'+q); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }
  const callContactDirectory = async (region, includeInactive=false) => { setAuxLoading(true); setAuxResult(null); try { const q = `?region=${encodeURIComponent(region||'')}&includeInactive=${includeInactive?1:0}`; const r = await api.get('/farms/report/contact-directory'+q); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }
  const callDashboardStats = async () => { setAuxLoading(true); setAuxResult(null); try { const r = await api.get('/farms/report/dashboard-stats'); setAuxResult(r?.data); } catch(e){ setAuxResult({ error: e.message || e.toString() }) } finally { setAuxLoading(false) } }
  // Note: use the primary callPaged (defined above) for list/report paging and aux results.
  // The earlier iterative edits introduced a second callPaged; that duplicate was removed to
  // avoid redeclaration errors and to keep paging behavior centralized.

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Farm Report</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} disabled={!Array.isArray(items) || items.length===0} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border rounded text-sm">Export page</button>
          <button onClick={exportAllServer} disabled={loading} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border rounded text-sm">Export all (server)</button>
        </div>
      </div>
        {/* Tabs: Views vs Reports */}
        <div className="mt-4">
          <div className="inline-flex rounded bg-gray-100 dark:bg-gray-800 p-1">
            <button onClick={() => setActiveTab('views')} className={`px-3 py-1 rounded text-sm ${activeTab === 'views' ? 'bg-white dark:bg-gray-900 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Views</button>
            <button onClick={() => setActiveTab('reports')} className={`ml-1 px-3 py-1 rounded text-sm ${activeTab === 'reports' ? 'bg-white dark:bg-gray-900 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Reports</button>
          </div>
        </div>

        {/* Advanced & Report UI (shown on Reports tab) */}
        {activeTab === 'reports' && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded">
        <h3 className="text-lg font-semibold mb-2">Advanced: Views & Reports</h3>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Endpoint</label>
            <select value={auxEndpoint} onChange={(e) => { setAuxEndpoint(e.target.value); setAuxParams({}); }} className="w-full px-2 py-1 border rounded">
              {Object.entries(auxEndpointMeta).map(([key, meta]) => (
                <option key={key} value={key} disabled={meta.admin && !isAdmin} title={meta.admin && !isAdmin ? 'Admin only' : ''}>{meta.label}</option>
              ))}
            </select>

            <div className="mt-3 space-y-2">
              {/* dynamic parameter inputs */}
              {auxEndpoint === 'views.byRegion' && (
                <>
                  <input placeholder="Region" value={auxParams.region||''} onChange={(e)=>setAuxParams({...auxParams, region:e.target.value})} className="w-full px-2 py-1 border rounded" />
                  <input placeholder="Zone" value={auxParams.zone||''} onChange={(e)=>setAuxParams({...auxParams, zone:e.target.value})} className="w-full px-2 py-1 border rounded" />
                  <input placeholder="Wereda" value={auxParams.wereda||''} onChange={(e)=>setAuxParams({...auxParams, wereda:e.target.value})} className="w-full px-2 py-1 border rounded" />
                  <input placeholder="City/Town" value={auxParams.cityTown||''} onChange={(e)=>setAuxParams({...auxParams, cityTown:e.target.value})} className="w-full px-2 py-1 border rounded" />
                </>
              )}

              {auxEndpoint === 'report.sizeAnalysis' && (
                <input placeholder="Region (optional)" value={auxParams.region||''} onChange={(e)=>setAuxParams({...auxParams, region:e.target.value})} className="w-full px-2 py-1 border rounded" />
              )}

              {auxEndpoint === 'report.registrationTrend' && (
                <div className="flex gap-2">
                  <input type="date" value={auxParams.startDate||''} onChange={(e)=>setAuxParams({...auxParams, startDate:e.target.value})} className="px-2 py-1 border rounded" />
                  <input type="date" value={auxParams.endDate||''} onChange={(e)=>setAuxParams({...auxParams, endDate:e.target.value})} className="px-2 py-1 border rounded" />
                  <select value={auxParams.groupBy||'MONTH'} onChange={(e)=>setAuxParams({...auxParams, groupBy:e.target.value})} className="px-2 py-1 border rounded">
                    <option value="MONTH">MONTH</option>
                    <option value="WEEK">WEEK</option>
                    <option value="DAY">DAY</option>
                  </select>
                </div>
              )}

              {auxEndpoint === 'report.contactDirectory' && (
                <div className="flex gap-2 items-center">
                  <input placeholder="Region" value={auxParams.region||''} onChange={(e)=>setAuxParams({...auxParams, region:e.target.value})} className="flex-1 px-2 py-1 border rounded" />
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!auxParams.includeInactive} onChange={(e)=>setAuxParams({...auxParams, includeInactive: e.target.checked})} /> Include Inactive</label>
                </div>
              )}

              {auxEndpoint === 'misc.paged' && (
                <div className="flex gap-2">
                  <input placeholder="Page" type="number" value={auxParams.page||1} onChange={(e)=>setAuxParams({...auxParams, page: Number(e.target.value) || 1})} className="px-2 py-1 border rounded w-24" />
                  <input placeholder="PageSize" type="number" value={auxParams.pageSize||20} onChange={(e)=>setAuxParams({...auxParams, pageSize: Number(e.target.value) || 20})} className="px-2 py-1 border rounded w-28" />
                  <input placeholder="q" value={auxParams.q||''} onChange={(e)=>setAuxParams({...auxParams, q: e.target.value})} className="px-2 py-1 border rounded" />
                </div>
              )}
            </div>

            <div className="mt-3">
              <button onClick={runAux} disabled={auxLoading} className="px-3 py-1 bg-blue-600 text-white rounded">Run</button>
              <button onClick={() => { setAuxResult(null); setAuxParams({}); }} className="ml-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 border rounded">Clear</button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm font-medium mb-1">Result</div>
            {auxLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="max-h-72 overflow-auto text-sm bg-white p-2 rounded dark:bg-gray-800">
                {renderAuxResult(auxResult)}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Single-field filter: choose a field and enter a value, then Apply (Reports tab) */}
      {activeTab === 'reports' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="filterField" className="sr-only">Field</label>
            <select id="filterField" value={filterField} onChange={(e) => setFilterField(e.target.value)} className="px-2 py-1 border rounded">
              {['FarmID','FarmName','FarmCode','OwnerName','ContactPhone','CityTown','Region','FarmType','IsActive'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input id="filterValue" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder="Enter value" className="px-2 py-1 border rounded w-64" />
          </div>
          <div className="flex items-center gap-2">
            <select value={reportMode} onChange={(e) => setReportMode(e.target.value)} className="px-2 py-1 border rounded">
              <option value="report">Report (sp)</option>
              <option value="list">List (search)</option>
            </select>

            <button onClick={async () => {
              const v = (filterValue || '').toString().trim();
              const filters = {};
              if (v !== '') {
                if (reportMode === 'report') {
                  // map selected fields that the stored-proc supports
                  const spFields = ['Region','Zone','Wereda','CityTown','IsActive','FarmType'];
                  if (spFields.includes(filterField)) filters[filterField] = v;
                  else {
                    // fallback: use list mode search
                    setReportMode('list');
                    setLastFilters({ q: v });
                    await callPaged(1, pageSize, v, sortColumn, sortDirection);
                    return;
                  }
                } else {
                  // list mode search
                  setLastFilters({ q: v });
                  await callPaged(1, pageSize, v, sortColumn, sortDirection);
                  return;
                }
              }
              setLastFilters(filters);
              await handleApply(filters);
            }} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">Apply</button>
            <button onClick={async () => { setFilterValue(''); setFilterField('FarmName'); await handleApply({}); }} disabled={loading} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border rounded">Clear</button>
          </div>
        </div>
  )}
      {/* Column filters (Excel-style) - inline under headers when in list mode */}
      <div className="text-sm text-gray-600">Tip: when in List mode, use the filters under each column header to filter results (applies automatically).</div>


      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white dark:bg-gray-800 rounded shadow">
            <div className="text-sm text-gray-500">Total Farms</div>
            <div className="text-xl font-bold">{new Intl.NumberFormat().format(summary.TotalFarms ?? total)}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded shadow">
            <div className="text-sm text-gray-500">Active Farms</div>
            <div className="text-xl font-bold">{summary.ActiveFarms != null ? new Intl.NumberFormat().format(summary.ActiveFarms) : ''}</div>
          </div>
          <div className="p-3 bg-white dark:bg-gray-800 rounded shadow">
            <div className="text-sm text-gray-500">Total Area (ha)</div>
            <div className="text-xl font-bold">{summary.TotalArea != null ? new Intl.NumberFormat(undefined, {maximumFractionDigits:2}).format(summary.TotalArea) : ''}</div>
          </div>
        </div>
      )}

      {/* Views sub-tabs: Main (table) and Charts & Trends */}
      {activeTab === 'views' && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Views:</label>
          <div className="flex gap-1">
            <button
              onClick={() => { setViewsSubTab('main'); setViewMode('table'); }}
              className={`px-3 py-1 rounded text-sm ${viewsSubTab === 'main' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              <Table className="w-4 h-4 inline mr-1" />
              Main
            </button>
            <button
              onClick={() => { setViewsSubTab('charts'); setViewMode('charts'); }}
              className={`px-3 py-1 rounded text-sm ${viewsSubTab === 'charts' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Charts & Trends
            </button>
          </div>
        </div>
      )}

      {/* Table View */}
      <AnimatePresence>
        {activeTab === 'reports' && viewMode === 'table' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {loading && !items.length && (
              <div className="space-y-2">
                {[...Array(6)].map((_,i) => (
                  <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            )}

            {!loading && Array.isArray(items) && items.length > 0 && (
              <div className="overflow-auto bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800">
                    <tr className="text-left">
                      {columns.map(c => (
                        <th key={c.key} className="px-3 py-2">
                          <div>{c.label}</div>
                          {/* show inline filter when in list mode */}
                          {reportMode === 'list' && (
                            <input
                              value={columnFilters[c.key] || ''}
                              onChange={(e) => setColumnFilters({...columnFilters, [c.key]: e.target.value})}
                              placeholder="filter"
                              className="mt-1 w-full px-1 py-0.5 text-xs border rounded"
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((r, idx) => (
                      <tr key={r.FarmID ?? r.id ?? idx} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmID'), 'id')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmName'), 'name')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmCode'), 'code')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmType'), 'farmtype')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'OwnerName'), 'owner')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'ContactPhone'), 'phone')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'CityTown'), 'city')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'Region'), 'region')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmSize'), 'size')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'IsActive'), 'active')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (!items || (Array.isArray(items) && items.length===0)) && (
              <div className="text-sm text-gray-500">No results for the selected filters</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts & Trends (visible when Views sub-tab = charts) */}
      <AnimatePresence>
        {activeTab === 'views' && viewsSubTab === 'charts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {chartLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div className="mt-2 text-sm text-gray-500">Loading charts...</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Farm Types Pie Chart */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5" />
                      Farm Types Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          innerRadius={40}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                              style={{ cursor: 'pointer' }}
                              onClick={() => handlePieClick(entry)}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`${value}`, `${props.payload.name}`]} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Regions Bar Chart */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Farms by Region
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Farm Size Ranges */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Farm Size Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.sizeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trends View (part of Charts & Trends sub-tab) */}
      <AnimatePresence>
        {activeTab === 'views' && viewsSubTab === 'charts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {chartLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div className="mt-2 text-sm text-gray-500">Loading trends...</div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Farm Registration Trends (Last 12 Months)
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table View on Views tab (Main sub-tab) */}
      <AnimatePresence>
        {activeTab === 'views' && viewsSubTab === 'main' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {loading && !items.length && (
              <div className="space-y-2">
                {[...Array(6)].map((_,i) => (
                  <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            )}

            {!loading && Array.isArray(items) && items.length > 0 && (
              <div className="overflow-auto bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800">
                    <tr className="text-left">
                      {columns.map(c => (
                        <th key={c.key} className="px-3 py-2">
                          <div>{c.label}</div>
                          {/* show inline filter when in list mode */}
                          {reportMode === 'list' && (
                            <input
                              value={columnFilters[c.key] || ''}
                              onChange={(e) => setColumnFilters({...columnFilters, [c.key]: e.target.value})}
                              placeholder="filter"
                              className="mt-1 w-full px-1 py-0.5 text-xs border rounded"
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((r, idx) => (
                      <tr key={r.FarmID ?? r.id ?? idx} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmID'), 'id')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmName'), 'name')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmCode'), 'code')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmType'), 'farmtype')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'OwnerName'), 'owner')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'ContactPhone'), 'phone')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'CityTown'), 'city')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'Region'), 'region')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'FarmSize'), 'size')}</td>
                        <td className="px-3 py-2">{formatValue(getRowValue(r, 'IsActive'), 'active')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (!items || (Array.isArray(items) && items.length===0)) && (
              <div className="text-sm text-gray-500">No results for the selected filters</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Showing page {pageNumber} — {new Intl.NumberFormat().format(total)} total</div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Page size:</label>
          <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="px-2 py-1 border rounded">
            {[10,20,50,100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={pageNumber<=1 || loading} onClick={() => handlePageChange(pageNumber-1)} className="px-3 py-1 bg-white dark:bg-gray-700 border rounded">Previous</button>
          <button disabled={(pageNumber*pageSize) >= total || loading} onClick={() => handlePageChange(pageNumber+1)} className="px-3 py-1 bg-white dark:bg-gray-700 border rounded">Next</button>
        </div>
      </div>
    </div>
  );
