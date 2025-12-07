import React, { useState, useEffect } from 'react';

export default function ReportFilterForm({
  initial = {},
  farms = [],
  farmers = [],
  advisors = [],
  farmTypes = [],
  statuses = [],
  onApply = () => {},
  onReset = () => {},
}) {
  // Defensive normalization: backend may return an object shape (e.g. { rows: [...] })
  // or the props could be non-array; ensure we always map over arrays below.
  const asArray = (v) => Array.isArray(v) ? v : (v && Array.isArray(v.data) ? v.data : (v && Array.isArray(v.rows) ? v.rows : []));
  const farmsList = asArray(farms);
  const farmersList = asArray(farmers);
  const advisorsList = asArray(advisors);
  const farmTypesList = asArray(farmTypes);
  const statusesList = asArray(statuses);
  // Basic filters
  const [startDate, setStartDate] = useState(initial.startDate || '');
  const [endDate, setEndDate] = useState(initial.endDate || '');
  const [search, setSearch] = useState(initial.search || '');

  // Farm-specific filters
  const [farmId, setFarmId] = useState(initial.farmId || '');
  const [farmName, setFarmName] = useState(initial.farmName || '');
  const [farmCode, setFarmCode] = useState(initial.farmCode || '');
  const [farmType, setFarmType] = useState(initial.farmType || '');
  const [region, setRegion] = useState(initial.region || '');
  const [zone, setZone] = useState(initial.zone || '');
  const [wereda, setWereda] = useState(initial.wereda || '');
  const [cityTown, setCityTown] = useState(initial.cityTown || '');
  const [ownerName, setOwnerName] = useState(initial.ownerName || '');
  const [contactPhone, setContactPhone] = useState(initial.contactPhone || '');
  const [minSize, setMinSize] = useState(initial.minSize || '');
  const [maxSize, setMaxSize] = useState(initial.maxSize || '');
  const [isActive, setIsActive] = useState(initial.isActive ?? '');

  useEffect(() => {
    setStartDate(initial.startDate || '');
    setEndDate(initial.endDate || '');
    setSearch(initial.search || '');
    setFarmId(initial.farmId || '');
    setFarmName(initial.farmName || '');
    setFarmCode(initial.farmCode || '');
    setFarmType(initial.farmType || '');
    setRegion(initial.region || '');
    setZone(initial.zone || '');
    setWereda(initial.wereda || '');
    setCityTown(initial.cityTown || '');
    setOwnerName(initial.ownerName || '');
    setContactPhone(initial.contactPhone || '');
    setMinSize(initial.minSize || '');
    setMaxSize(initial.maxSize || '');
    setIsActive(initial.isActive ?? '');
  }, [initial]);

  const handleApply = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    onApply({
      startDate, endDate, search,
      farmId, farmName, farmCode, farmType,
      region, zone, wereda, cityTown,
      ownerName, contactPhone, minSize, maxSize, isActive,
    });
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSearch('');
    setFarmId('');
    setFarmName('');
    setFarmCode('');
    setFarmType('');
    setRegion('');
    setZone('');
    setWereda('');
    setCityTown('');
    setOwnerName('');
    setContactPhone('');
    setMinSize('');
    setMaxSize('');
    setIsActive('');
    onReset && onReset();
  };

  return (
    <form onSubmit={handleApply} className="w-full">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Farm name, code, owner..." className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Farm</label>
              <select value={farmId} onChange={(e) => setFarmId(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                <option value="">All farms</option>
                {farmsList.map(f => <option key={f.FarmID ?? f.id ?? f} value={f.FarmID ?? f.id ?? f}>{f.FarmName ?? f.name ?? f}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Farm code</label>
              <input value={farmCode} onChange={(e) => setFarmCode(e.target.value)} placeholder="e.g. F123" className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Farm name</label>
              <input value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Farm name" className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
            </div>
          </div>

          <div className="w-full md:w-80">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Farm type</label>
                <select value={farmType} onChange={(e) => setFarmType(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <option value="">All types</option>
                  {farmTypesList.map(t => <option key={t.FarmTypeID ?? t.id ?? t} value={t.FarmTypeID ?? t.id ?? t}>{t.Name ?? t.name ?? t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
                <select value={isActive} onChange={(e) => setIsActive(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <option value="">Any</option>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* advanced grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Region</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Zone</label>
            <input value={zone} onChange={(e) => setZone(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Wereda</label>
            <input value={wereda} onChange={(e) => setWereda(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City/Town</label>
            <input value={cityTown} onChange={(e) => setCityTown(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Owner name</label>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min size (ha)</label>
            <input type="number" step="0.01" value={minSize} onChange={(e) => setMinSize(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max size (ha)</label>
            <input type="number" step="0.01" value={maxSize} onChange={(e) => setMaxSize(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">Apply Filters</button>
          <button type="button" onClick={handleReset} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-md hover:bg-gray-100">Reset</button>
        </div>
      </div>
    </form>
  );
}
