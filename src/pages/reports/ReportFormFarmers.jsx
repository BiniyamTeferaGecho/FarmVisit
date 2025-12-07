import React, { useState, useEffect } from 'react';
// Single-field filter: dropdown + textbox
import api from '../../utils/api';

export default function ReportFormFarmers() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [farms, setFarms] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [filterField, setFilterField] = useState('FarmerName');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const [fRes, frRes] = await Promise.all([
          api.get('/farms').catch(() => ({ data: [] })),
          api.get('/farmers').catch(() => ({ data: [] })),
        ]);
        const normalize = (d) => Array.isArray(d) ? d : (d && Array.isArray(d.rows) ? d.rows : []);
        setFarms(normalize(fRes?.data ?? fRes));
        setFarmers(normalize(frRes?.data ?? frRes));
      } catch (err) {
        console.warn('Failed to preload lists for farmers report', err);
      }
    };
    fetchLists();
  }, []);

  const handleApply = async (filters) => {
    setLoading(true);
    try {
      const res = await api.post('/reports/farmers', filters);
      setData(res?.data ?? null);
    } catch (err) {
      console.error('Failed to fetch farmers report', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Farmers Report</h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
        <div className="flex items-center gap-2">
          <select value={filterField} onChange={(e) => setFilterField(e.target.value)} className="px-2 py-1 border rounded">
            {['FarmerID','FarmerName','FarmID','Phone','Region','CityTown'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder="Enter value" className="px-2 py-1 border rounded w-64" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            const v = (filterValue || '').toString().trim(); const filters = {}; if (v !== '') filters[filterField] = v; await handleApply(filters);
          }} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">Apply</button>
          <button onClick={async () => { setFilterValue(''); setFilterField('FarmerName'); await handleApply({}); }} disabled={loading} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 border rounded">Clear</button>
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
