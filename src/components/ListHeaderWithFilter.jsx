import React, { useState, useRef, useEffect } from 'react';

// ListHeaderWithFilter
// Props:
// - title: string
// - icon: React node (optional) to render before the title
// - selectOptions: array of { value, label } for the select dropdown
// - onApplyFilters: function(filters) called when user clicks Apply
// - onClear: optional function called when Clear Filters clicked
export default function ListHeaderWithFilter({ title = '', icon = null, selectOptions = [], onApplyFilters = () => {}, onClear = () => {} }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const containerRef = useRef(null);

  // close when clicking outside
  useEffect(() => {
    function onBodyClick(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onBodyClick);
    return () => document.removeEventListener('mousedown', onBodyClick);
  }, [open]);

  const handleApply = () => {
    const filters = {
      SearchTerm: search || null,
      FarmTypeID: selectValue || null,
      CreatedDateFrom: dateFrom || null,
      CreatedDateTo: dateTo || null,
    };
    onApplyFilters(filters);
    setOpen(false);
  };

  const handleClear = () => {
    setSearch(''); setSelectValue(''); setDateFrom(''); setDateTo('');
    onClear();
    onApplyFilters({});
    setOpen(false);
  };

  return (
    <div className="w-full flex items-center justify-between">
      <h1 className="text-left text-2xl font-bold text-gray-800 dark:text-white flex items-center">
        {icon ? <span className="mr-3 text-indigo-600 inline-flex items-center">{icon}</span> : null}
        <span>{title}</span>
      </h1>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen(s => !s)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 13.414V19a1 1 0 01-.447.894l-4 2A1 1 0 019 21v-7.586L3.293 6.707A1 1 0 013 6V4z"></path></svg>
          <span className="hidden sm:inline">Filters</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-screen max-w-sm sm:max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Search</label>
                <input value={search} onChange={e => setSearch(e.target.value)} className="mt-1 block w-full form-input px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500" placeholder="Search by name, code, owner..." />
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Type</label>
                <select value={selectValue} onChange={e => setSelectValue(e.target.value)} className="mt-1 block w-full form-select px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">Any</option>
                  {Array.isArray(selectOptions) && selectOptions.map(opt => (
                    <option key={opt.FarmTypeID || opt.id || opt.value} value={opt.FarmTypeID || opt.id || opt.value}>{opt.TypeName || opt.Type || opt.label || opt.name || opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Created From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 block w-full form-input px-3 py-2 border rounded-md" />
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-300">Created To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 block w-full form-input px-3 py-2 border rounded-md" />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button onClick={handleClear} type="button" className="text-sm text-gray-600 hover:underline">Clear Filters</button>
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(false)} type="button" className="px-3 py-2 bg-gray-100 rounded-md">Cancel</button>
                <button onClick={handleApply} type="button" className="px-3 py-2 bg-indigo-600 text-white rounded-md">Apply Filters</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
