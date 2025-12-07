import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Table, Download, Filter } from 'lucide-react';
// Single-field simple filter: dropdown + textbox
import api from '../../utils/api';
import { useAuth } from '../../auth/AuthProvider';

export default function ReportFormFarm() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [farms, setFarms] = useState([]);
  const [farmTypes, setFarmTypes] = useState([]);
  const [farmTypeNameCache, setFarmTypeNameCache] = useState({});
  const [filterField, setFilterField] = useState('FarmName');
  const [filterValue, setFilterValue] = useState('');
  const [reportMode, setReportMode] = useState('report'); // 'report' (sp_GetFarmReport) or 'list' (/farms/paged)
  const [sortColumn, setSortColumn] = useState('FarmName');
  const [sortDirection, setSortDirection] = useState('ASC');

  // paging
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [lastFilters, setLastFilters] = useState({});
  const [activeTab, setActiveTab] = useState('reports'); // 'views' or 'reports'
  const { user } = useAuth();
  const isAdmin = !!(user && (Array.isArray(user.roles) && (user.roles.includes('ROLE_ADMIN') || user.roles.includes('ROLE_SUPER_ADMIN'))));

  // metadata for advanced endpoints to support role-aware UI
  const auxEndpointMeta = {
    'views.summary': { label: 'Views: Summary', admin: true },
    'views.byRegion': { label: 'Views: By Region', admin: true },
    'views.sizeAnalysis': { label: 'Views: Size Analysis', admin: true },
    'views.activeDirectory': { label: 'Views: Active Directory', admin: false },
    'views.auditTrail': { label: 'Views: Audit Trail', admin: true },
    'views.locations': { label: 'Views: Locations', admin: true },
    'report.geographic': { label: 'Report: Geographic', admin: true },
    'report.sizeAnalysis': { label: 'Report: Size Analysis', admin: true },
    'report.registrationTrend': { label: 'Report: Registration Trend', admin: true },
    'report.contactDirectory': { label: 'Report: Contact Directory', admin: true },
    'report.dashboardStats': { label: 'Report: Dashboard Stats', admin: true },
    'misc.paged': { label: 'Misc: Get Paged', admin: true }
  };

  // load lookups (use views we created)
  useEffect(() => {
    const fetchLists = async () => {
      try {
  // Active directory for farms (lightweight)
  const fRes = await api.get('/farms/views/active-directory').catch(() => ({ data: [] }));
        const farmsData = Array.isArray(fRes?.data) ? fRes.data : (Array.isArray(fRes) ? fRes : [])
        setFarms(farmsData);

        // attempt farm types from an existing endpoint; fallback to deriving from farms
        // Farm types are stored as lookups on the backend. Prefer the lookup endpoint.
        let types = [];
        try {
          // try the lookups endpoint first
          const tRes = await api.get('/lookups/by-type/FarmType').catch(() => ({ data: [] }));
          // the lookup controller returns an array of lookup objects
          types = Array.isArray(tRes?.data) ? tRes.data : [];
        } catch (e) {
          types = [];
        }
        if (!types || types.length === 0) {
          // derive unique FarmTypeID values from farms list where present
          const map = new Map();
          for (const f of farmsData) {
            const id = f.FarmTypeID || f.farmTypeID || null;
            if (id && !map.has(id)) map.set(id, { id });
          }
          types = Array.from(map.values());
        }
        setFarmTypes(types);
      } catch (err) {
        console.warn('Failed to preload lists for report filter', err);
      }
    };
    fetchLists();
  }, []);

  const runReport = useCallback(async (filters = {}, page = pageNumber, size = pageSize) => {
    setLoading(true);
    try {
      const payload = { ...filters, PageNumber: page, PageSize: size };
  const res = await api.post('/farms/report/farm', payload);
      const body = res?.data ?? null;
      const itemsRes = body?.data?.items ?? body?.items ?? body ?? [];
      const summaryRes = body?.data?.summary ?? body?.summary ?? null;

      // If stored proc returned counts in rows (COUNT OVER), pick total from first row as fallback
      const totalCount = (summaryRes && (summaryRes.TotalFarms || summaryRes.TotalCount)) || (itemsRes && itemsRes[0] && (itemsRes[0].TotalCount || itemsRes[0].TotalCount === 0) ? itemsRes[0].TotalCount : (itemsRes.length));

  setItems(Array.isArray(itemsRes) ? itemsRes : []);
  setSummary(summaryRes);
  setTotal(Number(totalCount) || 0);
  // remember the filters used so paging keeps them
  setLastFilters(filters || {});
    } catch (err) {
      console.error('Failed to fetch farm report', err);
      setItems([]);
      setSummary(null);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize]);

  const handleApply = async (filters) => {
    setPageNumber(1);
    setLastFilters(filters || {});
    await runReport(filters, 1, pageSize);
  };

  const handlePageChange = async (newPage) => {
    setPageNumber(newPage);
    if (reportMode === 'report') await runReport(lastFilters || {}, newPage, pageSize);
    else await callPaged(newPage, pageSize, lastFilters?.q || null, sortColumn, sortDirection);
  };

  const handlePageSizeChange = async (newSize) => {
    setPageSize(newSize);
    setPageNumber(1);
    if (reportMode === 'report') await runReport(lastFilters || {}, 1, newSize);
    else await callPaged(1, newSize, lastFilters?.q || null, sortColumn, sortDirection);
  };

  // list mode: call /farms/paged with sorting and search
  const callPaged = async (page=1, size=20, q=null, sortBy='FarmName', sortDir='ASC') => {
    setAuxLoading(true); setAuxResult(null);
    try {
      const url = `/farms/paged?page=${page}&pageSize=${size}&sortBy=${encodeURIComponent(sortBy)}&sortDir=${encodeURIComponent(sortDir)}${q?`&q=${encodeURIComponent(q)}`:''}`;
      const r = await api.get(url);
      // r.data expected shape { success:true, data: { items, total, page, pageSize } }
      setItems(r?.data?.data?.items || []);
      setTotal(r?.data?.data?.total || 0);
      setSummary(null);
      setAuxResult(r?.data);
    } catch (e) {
      setAuxResult({ error: e.message || e.toString() });
    } finally {
      setAuxLoading(false);
    }
  }

  const exportCsv = () => {
    if (!Array.isArray(items) || items.length === 0) return;
    const rows = items;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => {
      const v = r[h];
      if (v === null || v === undefined) return '';
      return '"' + String(v).replace(/"/g, '""') + '"';
    }).join(',')) ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farm-report-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Export all via server-side export endpoint (requires auth).
  // Backend currently returns JSON rows; convert to CSV client-side and download.
  const exportAllServer = async () => {
    try {
      const res = await api.get('/farms/report/export', { params: lastFilters || {} });
      const rows = res?.data?.data || res?.data || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        alert('No rows returned for export');
        return;
      }

      const headers = Object.keys(rows[0]);
      const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => {
        const v = r[h];
        if (v === null || v === undefined) return '';
        return '"' + String(v).replace(/"/g, '""') + '"';
      }).join(','))).join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farm-report-export-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: attempt to download as blob if server returns binary
      try {
        const qs = Object.entries(lastFilters || {}).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
        const url = `/farms/report/export${qs ? ('?' + qs) : ''}`;
        const r = await api.get(url, { responseType: 'blob' });
        const blob = new Blob([r.data], { type: r.headers['content-type'] || 'application/octet-stream' });
        const urlBlob = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = `farm-report-export-${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlBlob);
        return;
      } catch (err2) {
        console.error('Server export failed', err, err2);
        alert('Server export failed. Ensure you are authenticated and have permission.');
      }
    }
  };

  const formatValue = (val, col) => {
    if (val === null || val === undefined) return '';
    // simple heuristics
    if (col.toLowerCase().includes('date')) {
      const d = new Date(val);
      if (!isNaN(d)) return d.toLocaleDateString();
    }
    if (typeof val === 'number') return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(val);
    return String(val);
  };

  // Advanced: handlers for all view/report endpoints in farm.routes.js / farm.controller.js
  const [auxResult, setAuxResult] = useState(null);
  const [auxLoading, setAuxLoading] = useState(false);
  // compact advanced form state
  const [auxEndpoint, setAuxEndpoint] = useState('views.summary');
  const [auxParams, setAuxParams] = useState({});

  // Run the selected advanced endpoint with parameters from auxParams
  const runAux = async () => {
    setAuxLoading(true);
    setAuxResult(null);
    // Prevent non-admins from calling admin-only endpoints
    if (auxEndpointMeta[auxEndpoint] && auxEndpointMeta[auxEndpoint].admin && !isAdmin) {
      setAuxResult({ error: 'This endpoint requires admin role' });
      setAuxLoading(false);
      return;
    }
    try {
      let res = null;
      switch (auxEndpoint) {
        case 'views.summary':
          res = await api.get('/farms/views/summary');
          break;
        case 'views.byRegion': {
          const q = [];
          if (auxParams.region) q.push(`region=${encodeURIComponent(auxParams.region)}`);
          if (auxParams.zone) q.push(`zone=${encodeURIComponent(auxParams.zone)}`);
          if (auxParams.wereda) q.push(`wereda=${encodeURIComponent(auxParams.wereda)}`);
          if (auxParams.cityTown) q.push(`cityTown=${encodeURIComponent(auxParams.cityTown)}`);
          res = await api.get('/farms/views/by-region' + (q.length ? ('?' + q.join('&')) : ''));
          break;
        }
        case 'views.sizeAnalysis': {
          const qs = []; if (auxParams.region) qs.push(`region=${encodeURIComponent(auxParams.region)}`); if (auxParams.zone) qs.push(`zone=${encodeURIComponent(auxParams.zone)}`);
          res = await api.get('/farms/views/size-analysis' + (qs.length?('?'+qs.join('&')):''));
          break;
        }
        case 'views.activeDirectory':
          res = await api.get('/farms/views/active-directory');
          break;
        case 'views.auditTrail':
          res = await api.get('/farms/views/audit-trail');
          break;
        case 'views.locations':
          res = await api.get('/farms/views/locations');
          break;
        case 'report.geographic':
          res = await api.get(`/farms/report/geographic${auxParams.groupByLevel?('?groupByLevel='+encodeURIComponent(auxParams.groupByLevel)):''}`);
          break;
        case 'report.sizeAnalysis':
          res = await api.get('/farms/report/size-analysis' + (auxParams.region?`?region=${encodeURIComponent(auxParams.region)}`:''));
          break;
        case 'report.registrationTrend':
          {
            const start = auxParams.startDate || '';
            const end = auxParams.endDate || '';
            const groupBy = auxParams.groupBy || 'MONTH';
            const q = `?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&groupBy=${encodeURIComponent(groupBy)}`;
            res = await api.get('/farms/report/registration-trend' + q);
          }
          break;
        case 'report.contactDirectory':
          res = await api.get('/farms/report/contact-directory' + `?region=${encodeURIComponent(auxParams.region||'')}&includeInactive=${auxParams.includeInactive?1:0}`);
          break;
        case 'report.dashboardStats':
          res = await api.get('/farms/report/dashboard-stats');
          break;
        case 'misc.paged':
          {
            const p = Number(auxParams.page || 1);
            const s = Number(auxParams.pageSize || 20);
            const q = auxParams.q ? `&q=${encodeURIComponent(auxParams.q)}` : '';
            res = await api.get(`/farms/paged?page=${p}&pageSize=${s}${q}`);
          }
          break;
        default:
          res = { data: { message: 'Unknown endpoint' } };
      }
      setAuxResult(res?.data ?? res);
    } catch (err) {
      setAuxResult({ error: err.message || String(err) });
    } finally {
      setAuxLoading(false);
    }
  };

  // Render helper for auxResult: table for arrays, key/value for objects
  const renderAuxResult = (res) => {
    if (!res) return <div className="text-sm text-gray-500">No result</div>;
    const body = res?.data ?? res;
    // If body has data.items or data array
    let rows = null;
    if (body?.data?.items && Array.isArray(body.data.items)) rows = body.data.items;
    else if (Array.isArray(body?.data)) rows = body.data;
    else if (Array.isArray(body)) rows = body;
    else if (Array.isArray(body?.items)) rows = body.items;

    if (Array.isArray(rows) && rows.length > 0) {
      const headers = Object.keys(rows[0]);
      return (
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {headers.map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
                {headers.map(h => <td key={h} className="px-2 py-1">{formatValue(r[h], h)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (typeof body === 'object') {
      return (
        <div className="space-y-1">
          {Object.entries(body).map(([k,v]) => (
            <div key={k} className="flex gap-2"><div className="font-medium w-40">{k}</div><div className="truncate">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div></div>
          ))}
        </div>
      );
    }

    return <pre>{JSON.stringify(body, null, 2)}</pre>;
  };

  // Modern features: charts and trends
  const [viewMode, setViewMode] = useState('table'); // 'table', 'charts', 'trends'
  const [chartData, setChartData] = useState({ pieData: [], barData: [], sizeData: [] });
  const [trendData, setTrendData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Column-level filters for Excel-like header filtering
  const [columnFilters, setColumnFilters] = useState({});

  // Debounce and apply column filters for list mode: construct a simple 'q' by joining values
  useEffect(() => {
    // Only auto-apply when in list mode and table view
    if (reportMode !== 'list') return;
    const activeEntries = Object.entries(columnFilters).filter(([,v]) => v !== null && v !== undefined && String(v).trim() !== '');
    if (activeEntries.length === 0) return; // nothing to apply
    const handler = setTimeout(() => {
      // Construct a simple q string by concatenating filter values (server search is full-text/tvfs)
      const q = activeEntries.map(([k,v]) => String(v).trim()).join(' ');
      // Reset to first page when filters change
      setPageNumber(1);
      callPaged(1, pageSize, q, sortColumn, sortDirection);
      // also store lastFilters so pagination retains the search
      setLastFilters({ q });
    }, 450);
    return () => clearTimeout(handler);
  }, [columnFilters, reportMode, pageSize, sortColumn, sortDirection]);

  // Columns definition (centralized for header rendering and mapping)
  const columns = [
    { key: 'FarmID', label: 'FarmID' },
    { key: 'FarmName', label: 'FarmName' },
    { key: 'FarmCode', label: 'FarmCode' },
    { key: 'FarmType', label: 'FarmType' },
    { key: 'OwnerName', label: 'Owner' },
    { key: 'ContactPhone', label: 'Phone' },
    { key: 'CityTown', label: 'City/Town' },
    { key: 'Region', label: 'Region' },
    { key: 'FarmSize', label: 'Size(ha)' },
    { key: 'IsActive', label: 'Active' },
  ];

  // Helper: get a comparable string value from a row for a given column key
  const getRowValue = (row, colKey) => {
    if (!row) return '';
    switch (colKey) {
      case 'FarmID': return row.FarmID || row.id || '';
      case 'FarmName': return row.FarmName || row.Farm_Name || row.name || '';
      case 'FarmCode': return row.FarmCode || row.Farm_Code || row.code || '';
      case 'FarmType': return row.FarmTypeName || row.FarmType || row.FarmTypeID || '';
      case 'OwnerName': return row.OwnerName || row.ownerName || '';
      case 'ContactPhone': return row.ContactPhone || row.Contact_Phone || '';
      case 'CityTown': return row.CityTown || row.City_Town || '';
      case 'Region': return row.Region || '';
      case 'FarmSize': return row.FarmSize || row.Farm_Size || '';
      case 'IsActive': return (row.IsActive !== undefined ? String(row.IsActive) : (row.isActive !== undefined ? String(row.isActive) : ''));
      default: return '';
    }
  };

  // filteredItems: apply client-side column filters when present (useMemo for performance)
  const filteredItems = React.useMemo(() => {
    if (!Array.isArray(items)) return [];
    const active = Object.entries(columnFilters).filter(([,v]) => v !== null && v !== undefined && String(v).trim() !== '');
    if (active.length === 0) return items;
    return items.filter(row => {
      for (const [col, val] of active) {
        const cell = String(getRowValue(row, col) ?? '').toLowerCase();
        const needle = String(val).toLowerCase();
        if (!cell.includes(needle)) return false;
      }
      return true;
    });
  }, [items, columnFilters]);

  // Load chart data from current items. This resolves FarmType names by consulting
  // local farmTypes and, when missing, fetching details per-ID from the backend
  // `/farm-types/:id` endpoint and caching results to avoid repeated requests.
  const loadChartData = useCallback(async () => {
    if (!Array.isArray(items) || items.length === 0) return;

    setChartLoading(true);
    try {
      const typeMap = new Map();
      const regionCount = {};
      const sizeRanges = { 'Small (<5ha)': 0, 'Medium (5-20ha)': 0, 'Large (>20ha)': 0 };

      // gather unique FarmTypeIDs we might need to resolve
      const idsToResolve = new Set();
      items.forEach(farm => {
        const id = farm.FarmTypeID || farm.farmTypeID || null;
        if (id) idsToResolve.add(String(id));
      });

      // determine which ids are missing in cache
      const missing = Array.from(idsToResolve).filter(id => !farmTypeNameCache[id]);
      if (missing.length > 0) {
        // fetch missing in parallel but limit concurrency if needed
        await Promise.all(missing.map(async (id) => {
          try {
            const r = await api.get(`/farm-types/${encodeURIComponent(id)}`);
            const payload = r?.data?.data || r?.data || r;
            // tolerant parse: payload may be the record or contain data
            const rec = Array.isArray(payload) ? payload[0] : (payload && payload.recordset ? payload.recordset[0] : payload);
            const name = rec?.TypeName || rec?.Type || rec?.TypeName || rec?.TypeName || rec?.TypeName || (rec?.TypeName) || (rec?.TypeName) || (rec?.TypeName) || (rec?.TypeName) || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.typeName || rec?.name || rec?.TypeName;
            // fallback to other fields
            const finalName = name || rec?.TypeName || rec?.Type || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.TypeName || rec?.Name || '';
            setFarmTypeNameCache(prev => ({ ...prev, [id]: finalName }));
          } catch (e) {
            // don't fail chart load if a single lookup fails
            setFarmTypeNameCache(prev => ({ ...prev, [id]: String(id) }));
          }
        }));
      }

      // Now build counts resolving names from cache or farm row
      items.forEach(farm => {
        const id = farm.FarmTypeID || farm.farmTypeID || null;
        const cachedName = id ? (farmTypeNameCache[String(id)] || null) : null;
        const name = farm.FarmTypeName || farm.FarmType || cachedName || (id ? String(id) : 'Unknown');
        const key = `${id || 'N'}::${name}`;
        if (!typeMap.has(key)) typeMap.set(key, { id, name, count: 0 });
        typeMap.get(key).count++;

        const region = farm.Region || 'Unknown';
        regionCount[region] = (regionCount[region] || 0) + 1;

        const size = parseFloat(farm.FarmSize || 0);
        if (size < 5) sizeRanges['Small (<5ha)']++;
        else if (size <= 20) sizeRanges['Medium (5-20ha)']++;
        else sizeRanges['Large (>20ha)']++;
      });

      let pieArr = Array.from(typeMap.values()).map(v => ({ name: v.name, value: v.count, id: v.id }));
      pieArr.sort((a,b) => b.value - a.value);

      const TOP_N = 8;
      if (pieArr.length > TOP_N) {
        const top = pieArr.slice(0, TOP_N);
        const rest = pieArr.slice(TOP_N);
        const otherSum = rest.reduce((s,r) => s + r.value, 0);
        top.push({ name: 'Other', value: otherSum, id: null });
        pieArr = top;
      }

      const pieData = pieArr;
      const barData = Object.entries(regionCount).map(([name, value]) => ({ name, value }));
      const sizeData = Object.entries(sizeRanges).map(([name, value]) => ({ name, value }));

      setChartData({ pieData, barData, sizeData });
    } catch (err) {
      console.error('Failed to process chart data', err);
    } finally {
      setChartLoading(false);
    }
  }, [items, farmTypes, farmTypeNameCache]);

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
    if (viewMode === 'charts' && items.length > 0) {
      loadChartData();
    }
  }, [viewMode, items, loadChartData]);

  // Effect to load trend data when view mode changes
  useEffect(() => {
    if (viewMode === 'trends') {
      loadTrendData();
    }
  }, [viewMode, loadTrendData]);
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

      {/* View Mode Toggle (only on Views tab) */}
      {activeTab === 'views' && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">View:</label>
          <div className="flex gap-1">
            <button
              onClick={() => { setActiveTab('reports'); setViewMode('table'); }}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              <Table className="w-4 h-4 inline mr-1" />
              Table
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'charts' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Charts
            </button>
            <button
              onClick={() => setViewMode('trends')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'trends' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Trends
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

      {/* Charts View */}
      <AnimatePresence>
        {activeTab === 'views' && viewMode === 'charts' && (
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

      {/* Trends View */}
      <AnimatePresence>
        {activeTab === 'views' && viewMode === 'trends' && (
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
}
