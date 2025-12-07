import React, { useState, useEffect } from 'react';
// Single-field filter: dropdown + textbox
import api from '../../utils/api';

export default function ReportFormVisit() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [farms, setFarms] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [filterField, setFilterField] = useState('FarmName');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [fRes, aRes, sRes] = await Promise.all([
          api.get('/farms').catch(() => ({ data: [] })),
          api.get('/advisors').catch(() => ({ data: [] })),
          api.get('/visit-statuses').catch(() => ({ data: [] })),
        ]);
        const normalize = (d) => Array.isArray(d) ? d : (d && Array.isArray(d.rows) ? d.rows : []);
        setFarms(normalize(fRes?.data ?? fRes));
        setAdvisors(normalize(aRes?.data ?? aRes));
        setStatuses(normalize(sRes?.data ?? sRes));
      } catch (err) {
        console.warn('Failed to preload lists for visit report', err);
      }
    };
    fetchLists();
  }, []);

  const handleApply = async (filters) => {
    setLoading(true);
    try {
      const res = await api.post('/reports/visit', filters);
      setData(res?.data ?? null);
    } catch (err) {
      console.error('Failed to fetch visit report', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Visit Report</h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
        <div className="flex items-center gap-2">
          <select value={filterField} onChange={(e) => setFilterField(e.target.value)} className="px-2 py-1 border rounded">
            {['VisitID','FarmName','AdvisorName','Status','VisitDate','Region'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder="Enter value" className="px-2 py-1 border rounded w-64" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => { const v = (filterValue||'').toString().trim(); const filters = {}; if (v!=='') filters[filterField]=v; await handleApply(filters); }} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">Apply</button>
          <button onClick={async () => { setFilterValue(''); setFilterField('FarmName'); await handleApply({}); }} disabled={loading} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border rounded">Clear</button>
        </div>
      </div>

      <div className="mt-6">
        {loading ? <div>Loading...</div> : (
          data ? <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded-md dark:bg-gray-800">{JSON.stringify(data, null, 2)}</pre> : <div className="text-sm text-gray-500">No results</div>
        )}
      </div>
    </div>
  );
}
