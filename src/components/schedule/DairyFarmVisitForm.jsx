import React, { useState, useEffect, useRef } from 'react';
import { FileText, UploadCloud, ClipboardList, Thermometer, Droplet, AlertTriangle, Pill, Microscope } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider'

const SectionCard = ({ title, icon, children }) => (
  <div className="bg-white shadow-md rounded-lg p-6 mb-6"> 
    <div className="flex items-center mb-4">
      {icon}
      <h3 className="text-xl font-semibold ml-3 text-gray-800">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
  </div>
);

const InputField = ({ label, name, value, onChange, type = 'text', step, placeholder, unit, readOnly = false, disabled = false, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 text-left mb-1">{label}</label>
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        step={step}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        className={`mt-1 block w-full rounded-md ${error ? 'border-red-500' : 'border-gray-300'} shadow-sm sm:text-base py-2 px-3 h-11 ${readOnly || disabled ? 'bg-gray-100 cursor-not-allowed' : 'focus:border-indigo-500 focus:ring-indigo-500'}`}
      />
      {unit && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500">{unit}</span>}
    </div>
    {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
  </div>
);

const CheckboxField = ({ label, name, checked, onChange, disabled = false }) => (
  <div className="flex items-center">
    <input
      type="checkbox"
      name={name}
      checked={Boolean(checked)}
      onChange={onChange}
      disabled={disabled}
      className={`h-5 w-5 text-indigo-600 border-gray-300 rounded ${disabled ? 'opacity-60 cursor-not-allowed' : 'focus:ring-indigo-500'}`}
    />
    <label className="ml-2 block text-sm text-gray-900 text-left">{label}</label>
  </div>
);

const TextAreaField = ({ label, name, value, onChange, placeholder, readOnly = false, disabled = false, error }) => (
  <div className="col-span-1 md:col-span-2">
    <label className="block text-sm font-medium text-gray-700 text-left mb-1">{label}</label>
    <textarea
      name={name}
      rows="4"
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      className={`mt-1 block w-full rounded-md ${error ? 'border-red-500' : 'border-gray-300'} shadow-sm sm:text-base py-2 px-3 h-32 ${readOnly || disabled ? 'bg-gray-100 cursor-not-allowed' : 'focus:border-indigo-500 focus:ring-indigo-500'}`}
    ></textarea>
    {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
  </div>
);

// Dropdown multi-select with checkboxes for Compound Feed Source
const CompoundFeedMultiSelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Compound Feed Source';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadCompoundFeedOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  // parse stored value into array
  const selectedVals = Array.isArray(value) ? value : (String(value || '').split(/[,;|]+/).map(s => s.trim()).filter(Boolean));

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || it.Name || it.name || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  // include synthetic options for selected values not in options
  const optionValuesSet = new Set(options.map(o => String(optionValue(o))));
  const synthetic = selectedVals.filter(v => v && !optionValuesSet.has(String(v))).map(v => ({ LookupValue: v, Name: v }));

  const allOptions = [...options, ...synthetic];

  const toggleValue = (val) => {
    const s = new Set(selectedVals.map(String));
    if (s.has(String(val))) s.delete(String(val)); else s.add(String(val));
    const arr = Array.from(s);
    const joined = arr.join(', ');
    if (typeof onChange === 'function') onChange(joined);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (readOnly) {
    return (
      <input name={name} value={Array.isArray(value) ? value.join(', ') : (value || '')} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />
    );
  }

  const handleBlur = (e) => {
    const related = e.relatedTarget || document.activeElement;
    if (ref.current && !ref.current.contains(related)) {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref} onBlurCapture={handleBlur}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left mt-1 rounded-md border border-gray-300 bg-white py-2 px-3 h-11 flex items-center justify-between">
        <div className="truncate">
          {selectedVals && selectedVals.length ? selectedVals.join(', ') : (loading ? 'Loading...' : 'Select compound feed sources')}
        </div>
        <svg className="ml-2 h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto py-2">
          {loading && <div className="px-3 text-sm text-gray-500">Loading...</div>}
          {!loading && allOptions.length === 0 && <div className="px-3 text-sm text-gray-500">No options</div>}
          {!loading && allOptions.map((it, idx) => {
            const val = optionValue(it);
            const lab = optionLabel(it);
            const checked = selectedVals.includes(String(val));
            return (
              <label key={idx} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggleValue(val)} className="h-4 w-4 text-indigo-600" />
                <span className="ml-2 text-sm text-gray-700 truncate">{lab}</span>
              </label>
            );
          })}
        </div>
      )}
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Single-select dropdown for Feeding System (saves LookupValue)
const FeedingSystemSelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Feeding System';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadFeedingSystemOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  // find label for current value
  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Feeding System</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Single-select dropdown for Watering System (saves LookupValue)
const WateringSystemSelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Watering System';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadWateringSystemOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Watering System</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Single-select dropdown for Milk Supply To (saves LookupValue)
const MilkSupplyToSelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Milk Supply To';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadMilkSupplyToOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Milk Supply To</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Single-select dropdown for Ventilation (saves LookupValue)
const VentilationSelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Ventilation';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadVentilationOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Ventilation</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Single-select dropdown for Light Intensity (saves LookupValue)
const LightIntensitySelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Light Intensity';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadLightIntensityOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Light Intensity</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Single-select dropdown for Bedding Type (saves LookupValue)
const BeddingTypeSelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Bedding Type';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadBeddingTypeOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Bedding Type</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Single-select dropdown for Space Availability (saves LookupValue)
const SpaceAvailabilitySelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Space Availability';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadSpaceAvailabilityOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Space Availability</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Simple date picker for Vaccination Time
const VaccinationTimeDatePicker = ({ name, value, onChange, readOnly = false }) => {
  const parseForInput = (v) => {
    if (!v) return '';
    // if ISO datetime, take date part
    if (typeof v === 'string') {
      if (v.includes('T')) return v.split('T')[0];
      if (v.includes(' ')) return v.split(' ')[0];
      if (v.length >= 10) return v.substring(0, 10);
      return v;
    }
    return String(v);
  };

  const inputValue = parseForInput(value);

  if (readOnly) {
    return <input name={name} value={inputValue} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Vaccination Time</label>
      <input
        type="date"
        name={name}
        value={inputValue}
        onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }}
        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11"
      />
    </div>
  );
};

// Single-select dropdown for Which Company (saves LookupValue)
const CompanySelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Company';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadCompanyOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Which Company</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select Company --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Single-select dropdown for Feeding Mechanism (saves LookupValue)
const FeedingMechanismSelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Feeding Mechanism';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadFeedingMechanismOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const currentLabel = (() => {
    if (!value) return '';
    const found = options.find(o => String(optionValue(o)) === String(value));
    if (found) return optionLabel(found);
    return String(value);
  })();

  if (readOnly) {
    return <input name={name} value={currentLabel} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-left mb-1">Feeding Mechanism</label>
      <select name={name} value={value || ''} onChange={(e) => { if (typeof onChange === 'function') onChange(e.target.value); }} className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11">
        <option value="">-- Select --</option>
        {(!loading && options) && options.map((it, idx) => (
          <option key={idx} value={optionValue(it)}>{optionLabel(it)}</option>
        ))}
      </select>
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Multi-select dropdown for Home Mixing Ingredients (saves LookupValue joined by comma)
const HomeMixingIngredientsSelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'Home Mixing Ingredients';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadHomeMixingOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const selectedVals = Array.isArray(value) ? value : (String(value || '').split(/[,;|]+/).map(s => s.trim()).filter(Boolean));

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || it.Name || it.name || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const optionValuesSet = new Set(options.map(o => String(optionValue(o))));
  const synthetic = selectedVals.filter(v => v && !optionValuesSet.has(String(v))).map(v => ({ LookupValue: v, Name: v }));
  const allOptions = [...options, ...synthetic];

  const toggleValue = (val) => {
    const s = new Set(selectedVals.map(String));
    if (s.has(String(val))) s.delete(String(val)); else s.add(String(val));
    const arr = Array.from(s);
    const joined = arr.join(', ');
    if (typeof onChange === 'function') onChange(joined);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (readOnly) {
    return (
      <input name={name} value={Array.isArray(value) ? value.join(', ') : (value || '')} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />
    );
  }

  const handleBlur = (e) => {
    const related = e.relatedTarget || document.activeElement;
    if (ref.current && !ref.current.contains(related)) {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref} onBlurCapture={handleBlur}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left mt-1 rounded-md border border-gray-300 bg-white py-2 px-3 h-11 flex items-center justify-between">
        <div className="truncate">
          {selectedVals && selectedVals.length ? selectedVals.join(', ') : (loading ? 'Loading...' : 'Select ingredients')}
        </div>
        <svg className="ml-2 h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto py-2">
          {loading && <div className="px-3 text-sm text-gray-500">Loading...</div>}
          {!loading && allOptions.length === 0 && <div className="px-3 text-sm text-gray-500">No options</div>}
          {!loading && allOptions.map((it, idx) => {
            const val = optionValue(it);
            const lab = optionLabel(it);
            const checked = selectedVals.includes(String(val));
            return (
              <label key={idx} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggleValue(val)} className="h-4 w-4 text-indigo-600" />
                <span className="ml-2 text-sm text-gray-700 truncate">{lab}</span>
              </label>
            );
          })}
        </div>
      )}
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

// Multi-select dropdown for "How Much Feeding Per Day" (saves LookupValue joined by comma)
const HowMuchFeedingPerDaySelect = ({ name, value, onChange, readOnly = false }) => {
  const auth = useAuth();
  const { fetchWithAuth } = auth || {};
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let mounted = true;
    const extractItems = (body) => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body.data)) return body.data;
      if (body.data && Array.isArray(body.data.items)) return body.data.items;
      if (Array.isArray(body.items)) return body.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res = null;
        const typeName = 'How Much Feeding Per Day';
        if (typeof fetchWithAuth === 'function') {
          res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent(typeName)}`, method: 'GET' });
        } else {
          const base = window.location.origin;
          const r = await fetch(`${base}/api/lookups/by-type-name/${encodeURIComponent(typeName)}`, { credentials: 'include' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          res = await r.json();
        }
        const items = extractItems(res) || [];
        if (mounted) setOptions(items);
      } catch (err) {
        console.debug('loadHowMuchFeedingOptions error', err);
        if (mounted) setError('Failed to load options');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [fetchWithAuth]);

  const selectedVals = Array.isArray(value) ? value : (String(value || '').split(/[,;|]+/).map(s => s.trim()).filter(Boolean));

  const optionValue = (it) => {
    if (!it) return '';
    return it.LookupValue || it.Value || it.LookupCode || it.code || it.value || it.Name || it.name || String(it);
  };
  const optionLabel = (it) => {
    if (!it) return '';
    return it.Name || it.Value || it.LookupValue || it.name || it.value || String(it);
  };

  const optionValuesSet = new Set(options.map(o => String(optionValue(o))));
  const synthetic = selectedVals.filter(v => v && !optionValuesSet.has(String(v))).map(v => ({ LookupValue: v, Name: v }));
  const allOptions = [...options, ...synthetic];

  const toggleValue = (val) => {
    const s = new Set(selectedVals.map(String));
    if (s.has(String(val))) s.delete(String(val)); else s.add(String(val));
    const arr = Array.from(s);
    const joined = arr.join(', ');
    if (typeof onChange === 'function') onChange(joined);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (readOnly) {
    return (
      <input name={name} value={Array.isArray(value) ? value.join(', ') : (value || '')} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-base py-2 px-3 h-11 bg-gray-100 cursor-not-allowed" />
    );
  }

  const handleBlur = (e) => {
    const related = e.relatedTarget || document.activeElement;
    if (ref.current && !ref.current.contains(related)) {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref} onBlurCapture={handleBlur}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left mt-1 rounded-md border border-gray-300 bg-white py-2 px-3 h-11 flex items-center justify-between">
        <div className="truncate">
          {selectedVals && selectedVals.length ? selectedVals.join(', ') : (loading ? 'Loading...' : 'Select feeding times')}
        </div>
        <svg className="ml-2 h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto py-2">
          {loading && <div className="px-3 text-sm text-gray-500">Loading...</div>}
          {!loading && allOptions.length === 0 && <div className="px-3 text-sm text-gray-500">No options</div>}
          {!loading && allOptions.map((it, idx) => {
            const val = optionValue(it);
            const lab = optionLabel(it);
            const checked = selectedVals.includes(String(val));
            return (
              <label key={idx} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={() => toggleValue(val)} className="h-4 w-4 text-indigo-600" />
                <span className="ml-2 text-sm text-gray-700 truncate">{lab}</span>
              </label>
            );
          })}
        </div>
      )}
      {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
    </div>
  );
};

const DairyFarmVisitForm = ({ form, onChange, onSave, onCancel, loading, readOnly = false, locationReadOnlyInModal = false, externalErrors = {} }) => {
  const data = form ?? {};
  const [imagePreviews, setImagePreviews] = useState([]);
  const createdBlobUrlsRef = useRef([]);
  const inputRef = useRef(null);
  const [locationReadOnly, setLocationReadOnly] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);
  const locationRef = useRef(null);
  const [errors, setErrors] = useState({});

  // When parent supplies externalErrors (server-side validation), merge into local errors
  useEffect(() => {
    try {
      if (externalErrors && typeof externalErrors === 'object' && Object.keys(externalErrors).length > 0) {
        setErrors(prev => ({ ...(prev || {}), ...externalErrors }));
      }
    } catch (e) {}
  }, [externalErrors]);

  // Helper to focus an input by name (supports dotted keys like 'dairyForm.Location')
  const focusFieldByName = (fieldName) => {
    try {
      if (!fieldName) return;
      const short = String(fieldName).split('.').pop();
      // Try exact match then short name
      const selector = `[name="${fieldName}"] , [name=\"${short}\"]`;
      const el = document.querySelector(selector);
      if (el && typeof el.focus === 'function') {
        el.focus();
        if (el.select) {
          try { el.select(); } catch (e) {}
        }
      }
    } catch (e) {}
  };

  const handleChange = (e) => {
    if (!e) return;
    const { name, value, type, checked } = e.target;
    const parsedValue = type === 'checkbox' ? checked : value;
    if (errors && errors[name]) {
      setErrors(prev => { const c = { ...(prev || {}) }; delete c[name]; return c; });
    }
    if (typeof onChange === 'function') {
      onChange({ ...data, [name]: parsedValue });
    }
  };

  const handleFilesChange = (e) => {
    if (readOnly) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (typeof onChange === 'function') {
      onChange({ ...data, AnyRelatedEvidenceImage: files });
    }

    createdBlobUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
    const urls = files.map((f) => URL.createObjectURL(f));
    createdBlobUrlsRef.current = urls.slice();
    setImagePreviews(urls);
  };

  const handleGetLocation = () => {
    if (readOnly) return;
    if (!navigator || !navigator.geolocation) {
      setLocError('Geolocation not supported by this browser');
      return;
    }
    setLocLoading(true);
    setLocError(null);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const coord = `${lat}, ${lng}`;
          try {
            if (typeof onChange === 'function') onChange({ ...data, Location: coord, LocationCoordinate: coord });
          } catch (e) { }
          setLocationReadOnly(true);
          setLocLoading(false);
        },
        (err) => {
          setLocError(err?.message || 'Failed to retrieve location');
          setLocLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (e) {
      setLocError('Unable to request geolocation');
      setLocLoading(false);
    }
  };

  useEffect(() => {
    if (readOnly) {
      setLocationReadOnly(true);
    } else if (data && data.Location) {
      // If there's already a location value, default to read-only until user clicks Edit
      setLocationReadOnly(true);
    }
    if (Array.isArray(data.AnyRelatedEvidenceImage) && data.AnyRelatedEvidenceImage.length > 0) {
      const arr = data.AnyRelatedEvidenceImage.map((it) => (it instanceof File ? URL.createObjectURL(it) : String(it)));
      createdBlobUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
      createdBlobUrlsRef.current = arr.filter((u) => u.startsWith('blob:'));
      setImagePreviews(arr);
    }
    return () => {
      createdBlobUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
      createdBlobUrlsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When UsesConcentrate is turned off, clear WhichCompany from the form payload
  useEffect(() => {
    try {
      if (readOnly) return;
      if (form && form.UsesConcentrate === false && form.WhichCompany) {
        if (typeof onChange === 'function') {
          onChange({ ...form, WhichCompany: '' });
        }
      }
    } catch (e) {
      // ignore
    }
    // only watch UsesConcentrate specifically
  }, [form?.UsesConcentrate]);

  // When IsLocalMix is turned off, clear ListofIngridiant from the form payload
  useEffect(() => {
    try {
      if (readOnly) return;
      if (form && form.IsLocalMix === false && form.ListofIngridiant) {
        if (typeof onChange === 'function') {
          onChange({ ...form, ListofIngridiant: '' });
        }
      }
    } catch (e) {
      // ignore
    }
  }, [form?.IsLocalMix]);

  // When HasForage is turned off, clear TypeOfForage and ForageAmount from the form payload
  useEffect(() => {
    try {
      if (readOnly) return;
      if (form && form.HasForage === false && (form.TypeOfForage || form.ForageAmount)) {
        if (typeof onChange === 'function') {
          onChange({ ...form, TypeOfForage: '', ForageAmount: '' });
        }
      }
    } catch (e) {
      // ignore
    }
  }, [form?.HasForage]);

  const validate = () => {
    const errs = {};
    const getNum = (v) => {
      if (v === null || v === undefined || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : NaN
    }

    // Required
    if (!data.Location) errs.Location = 'Location is required'

    // Animal counts must be >= 0 (integers)
    ;['LactationCows','DryCows','Heifers','Calves','Buls'].forEach((k) => {
      const n = getNum(data[k])
      if (n === null) return
      if (!Number.isFinite(n) || n < 0) errs[k] = `${k} must be a number >= 0`
    })

    // BodyCondition fields between 1 and 5
    const bodyL = getNum(data.BodyConditionLactetingCow)
    if (bodyL !== null && !Number.isNaN(bodyL)) {
      if (bodyL < 1 || bodyL > 5) errs.BodyConditionLactetingCow = 'Body condition (lactating) must be between 1.0 and 5.0'
    }
    const bodyD = getNum(data.BodyConditionDryCow)
    if (bodyD !== null && !Number.isNaN(bodyD)) {
      if (bodyD < 1 || bodyD > 5) errs.BodyConditionDryCow = 'Body condition (dry) must be between 1.0 and 5.0'
    }

    // AgeAtFirstCalving 18-40
    const age = getNum(data.AgeAtFirstCalving)
    if (age !== null && !Number.isNaN(age)) {
      if (age < 18 || age > 40) errs.AgeAtFirstCalving = 'Age at first calving must be between 18 and 40 months'
    }

    // CalvingInterval 300-600
    const ci = getNum(data.CalvingInterval)
    if (ci !== null && !Number.isNaN(ci)) {
      if (ci < 300 || ci > 600) errs.CalvingInterval = 'Calving interval must be between 300 and 600 days'
    }

    // ForageAmount 0-10000
    const fa = getNum(data.ForageAmount)
    if (fa !== null && !Number.isNaN(fa)) {
      if (fa < 0 || fa > 10000) errs.ForageAmount = 'Forage amount must be between 0 and 10000'
    }

    // Manure scores 1-5 or null
    ;['ManureScore1','ManureScore2','ManureScore3','ManureScore4'].forEach((k) => {
      const n = getNum(data[k])
      if (n === null) return
      if (!Number.isFinite(n) || n < 1 || n > 5) errs[k] = `${k} must be between 1 and 5`
    })

    // Milk price >= 0
    const mp = getNum(data.MilkPricePerLitter)
    if (mp !== null && !Number.isNaN(mp)) {
      if (mp < 0) errs.MilkPricePerLitter = 'Milk price must be >= 0'
    }

    // Avg and Max milk checks (per cow)
    const avg = getNum(data.AvgMilkProductionPerDayPerCow)
    const max = getNum(data.MaxMilkProductionPerDayPerCow)
    if (avg !== null && !Number.isNaN(avg)) {
      if (avg < 0 || avg > 100) errs.AvgMilkProductionPerDayPerCow = 'Avg milk per day must be between 0 and 100 L'
    }
    if (max !== null && !Number.isNaN(max)) {
      if (max < 0) errs.MaxMilkProductionPerDayPerCow = 'Max milk production must be >= 0'
    }
    if (avg !== null && max !== null && !Number.isNaN(avg) && !Number.isNaN(max)) {
      if (avg > max) errs.AvgMilkProductionPerDayPerCow = 'Average production cannot exceed max production per cow'
    }

    // Total milk reasonable check: <= lactation * avg * 1.5
    const lact = getNum(data.LactationCows)
    const total = getNum(data.TotalMilkPerDay)
    if (lact !== null && avg !== null && total !== null && !Number.isNaN(lact) && !Number.isNaN(avg) && !Number.isNaN(total)) {
      if (lact > 0 && avg > 0 && total > (lact * avg * 1.5)) {
        errs.TotalMilkPerDay = 'Total milk exceeds reasonable maximum based on lactation cows and average production'
      }
    }

    return errs
  }

  const handleSaveInternal = async () => {
    const errs = validate();
    const merged = { ...(externalErrors || {}), ...errs };
    if (Object.keys(merged).length) {
      setErrors(merged);
      // Focus first invalid field (prefer Location when present)
      const keys = Object.keys(merged || {});
      if (keys && keys.length) {
        const first = keys.includes('Location') ? 'Location' : keys[0];
        // small delay to ensure DOM is ready
        setTimeout(() => focusFieldByName(first), 50);
      }
      return;
    }
    if (typeof onSave === 'function') {
      try { await onSave(); } catch (e) { console.error('parent onSave error', e); }
    }
  }
 
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Ensure ScheduleID is included in the payload (hidden input) */}
        <input type="hidden" name="ScheduleID" value={data.ScheduleID || ''} />
        <SectionCard title="Visit Details" icon={<FileText className="text-indigo-600" />}>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">Location (lat, long)</label>
            <div className="flex items-center gap-2">
              <input
                ref={locationRef}
                name="Location"
                value={data.Location || ''}
                onChange={(e) => { if (errors && errors.Location) setErrors(prev => { const c = { ...prev }; delete c.Location; return c; }); handleChange(e); }}
                placeholder="Latitude, Longitude"
                readOnly={readOnly || locationReadOnly || locationReadOnlyInModal}
                disabled={readOnly || locationReadOnlyInModal}
                className={`mt-1 block w-full rounded-md ${errors && errors.Location ? 'border-red-500' : 'border-gray-300'} shadow-sm sm:text-base py-2 px-3 h-11 ${(readOnly || locationReadOnlyInModal) ? 'bg-gray-100 cursor-not-allowed' : 'focus:border-indigo-500 focus:ring-indigo-500'}`}
              />
              {!readOnly && (
                <button type="button" onClick={handleGetLocation} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" disabled={locLoading}>
                {locLoading ? 'Getting...' : 'Get'}
                </button>
              )}
              {!readOnly && locationReadOnly && !locationReadOnlyInModal && (
                <button type="button" onClick={() => { setLocationReadOnly(false); setLocError(null); }} className="px-2 py-2 bg-gray-200 text-sm rounded-md">
                  Edit
                </button>
              )}
            </div>
            {errors && errors.Location ? (
              <div className="text-sm text-red-600 mt-1">{errors.Location}</div>
            ) : locError ? (
              <div className="text-sm text-red-600 mt-1">{locError}</div>
            ) : (
              <div className="text-sm text-gray-500 mt-1">Format: <span className="italic">lat, long</span> — e.g. <span className="font-mono">9.030000, 38.740000</span>. Click to auto-fill.</div>
            )}
          </div>
          <InputField label="Lactation Cows" name="LactationCows" type="number" value={data.LactationCows} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.LactationCows} />
          <InputField label="Dry Cows" name="DryCows" type="number" value={data.DryCows} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.DryCows} />
          <InputField label="Heifers" name="Heifers" type="number" value={data.Heifers} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.Heifers} />
          <InputField label="Calves" name="Calves" type="number" value={data.Calves} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.Calves} />
          <InputField label="Bulls" name="Buls" type="number" value={data.Buls} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.Buls} />
          <InputField label="Body Condition (Lactating cows)" name="BodyConditionLactetingCow" type="number" step="0.1" value={data.BodyConditionLactetingCow} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.BodyConditionLactetingCow} />
          <InputField label="Body Condition (Dry cows)" name="BodyConditionDryCow" type="number" step="0.1" value={data.BodyConditionDryCow} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.BodyConditionDryCow} />

          {/* Feeding and feed source fields - always visible and ordered */}
          <div>
            <FeedingSystemSelect
              name="FeedingSystem"
              value={data.FeedingSystem}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, FeedingSystem: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.FeedingSystem && <div className="text-sm text-red-600 mt-1">{errors.FeedingSystem}</div>}
          </div>
          {/* Compound Feed Source: multi-select populated from lookup API */}
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">Compound Feed Source</label>
            <CompoundFeedMultiSelect
              name="CompoundFeedSource"
              value={data.CompoundFeedSource}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, CompoundFeedSource: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.CompoundFeedSource && <div className="text-sm text-red-600 mt-1">{errors.CompoundFeedSource}</div>}
          </div>
          <div>
            <CompanySelect
              name="WhichCompany"
              value={data.WhichCompany}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, WhichCompany: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.WhichCompany && <div className="text-sm text-red-600 mt-1">{errors.WhichCompany}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">List of Home Mixing Ingredient</label>
            <HomeMixingIngredientsSelect
              name="ListOfHomeMixingIngridient"
              value={data.ListOfHomeMixingIngridient || data.ListofIngridiant}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, ListOfHomeMixingIngridient: val, ListofIngridiant: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.ListOfHomeMixingIngridient && <div className="text-sm text-red-600 mt-1">{errors.ListOfHomeMixingIngridient}</div>}
          </div>
          <InputField label="Quantity of Commercial Feed (Kg)" name="QuantityOfCommercialFeed" type="number" value={data.QuantityOfCommercialFeed} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Quantity of Home Mix (Kg)" name="QuantityOfHomeMix" type="number" value={data.QuantityOfHomeMix} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">How Many Times (feeding)</label>
            <HowMuchFeedingPerDaySelect
              name="HowManyTimes"
              value={data.HowManyTimes}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, HowManyTimes: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.HowManyTimes && <div className="text-sm text-red-600 mt-1">{errors.HowManyTimes}</div>}
          </div>
          <div>
            <FeedingMechanismSelect
              name="FeedingMechanism"
              value={data.FeedingMechanism}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, FeedingMechanism: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.FeedingMechanism && <div className="text-sm text-red-600 mt-1">{errors.FeedingMechanism}</div>}
          </div>

          <CheckboxField label="Sample Collected" name="SampleCollection" checked={data.SampleCollection} onChange={handleChange} disabled={readOnly} />
          <CheckboxField label="Has Forage" name="HasForage" checked={data.HasForage} onChange={handleChange} disabled={readOnly} />
          {data.HasForage ? (
            <>
              <InputField label="Type of Forage" name="TypeOfForage" value={data.TypeOfForage} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
              <InputField label="Forage Amount" name="ForageAmount" type="number" value={data.ForageAmount} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.ForageAmount} />
            </>
          ) : null}
          <CheckboxField label="Concentrate Feed Sample" name="ConcentrateFeedSample" checked={data.ConcentrateFeedSample} onChange={handleChange} disabled={readOnly} />

          {/* Retain older feeding inputs (if present) */}
          <InputField label="Feeding Per Cow" name="FeedingPerCow" value={data.FeedingPerCow} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="How They Give For Cows" name="HowTheyGiveForCows" value={data.HowTheyGiveForCows || data.HowTheyGiveForCos} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />

        </SectionCard>

        <SectionCard title="Production & Water" icon={<Thermometer className="text-red-600" />}>
          <InputField label="Amount of Water Provided" name="AmountofWaterProvided" value={data.AmountofWaterProvided} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <div>
            <WateringSystemSelect
              name="WateringSystem"
              value={data.WateringSystem}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, WateringSystem: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.WateringSystem && <div className="text-sm text-red-600 mt-1">{errors.WateringSystem}</div>}
          </div>
          <InputField label="If limited, how much" name="IfLimitedHowMuch" value={data.IfLimitedHowMuch} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Avg Milk Production/Day (per cow)" name="AvgMilkProductionPerDayPerCow" type="number" step="0.01" value={data.AvgMilkProductionPerDayPerCow} onChange={handleChange} unit="L/day" readOnly={readOnly} disabled={readOnly} error={errors && errors.AvgMilkProductionPerDayPerCow} />
          <InputField label="Max Milk Production/Day (per cow)" name="MaxMilkProductionPerDayPerCow" type="number" step="0.01" value={data.MaxMilkProductionPerDayPerCow} onChange={handleChange} unit="L" readOnly={readOnly} disabled={readOnly} error={errors && errors.MaxMilkProductionPerDayPerCow} />
          <InputField label="Total Milk/Day" name="TotalMilkPerDay" type="number" step="0.01" value={data.TotalMilkPerDay} onChange={handleChange} unit="L" readOnly={readOnly} disabled={readOnly} error={errors && errors.TotalMilkPerDay} />
          <div>
            <MilkSupplyToSelect
              name="MilkSupplyTo"
              value={data.MilkSupplyTo}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, MilkSupplyTo: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.MilkSupplyTo && <div className="text-sm text-red-600 mt-1">{errors.MilkSupplyTo}</div>}
          </div>
          <InputField label="Milk Price/Liter" name="MilkPricePerLitter" type="number" step="0.01" value={data.MilkPricePerLitter} onChange={handleChange} unit="ETB/L" readOnly={readOnly} disabled={readOnly} error={errors && errors.MilkPricePerLitter} />
          <div className="col-span-1 md:col-span-2 grid grid-cols-4 gap-4">
            <InputField label="Manure Score 1" name="ManureScore1" type="number" value={data.ManureScore1} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.ManureScore1} />
            <InputField label="Manure Score 2" name="ManureScore2" type="number" value={data.ManureScore2} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.ManureScore2} />
            <InputField label="Manure Score 3" name="ManureScore3" type="number" value={data.ManureScore3} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.ManureScore3} />
            <InputField label="Manure Score 4" name="ManureScore4" type="number" value={data.ManureScore4} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.ManureScore4} />
          </div>
        </SectionCard>

        <SectionCard title="Reproduction & Breeding" icon={<Droplet className="text-blue-600" />}>
          <TextAreaField label="Breeding History" name="BreedingHistory" value={data.BreedingHistory} onChange={handleChange} placeholder="Breeding history..." readOnly={readOnly} disabled={readOnly} />
          <InputField label="Breeding Method" name="BreedingMethod" value={data.BreedingMethod} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Natural or AI?" name="AreTheyUsingNaturalorAI" value={data.AreTheyUsingNaturalorAI} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Insemination Frequency" name="InseminationFrequency" value={data.InseminationFrequency} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Calving Interval" name="CalvingInterval" type="number" value={data.CalvingInterval} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.CalvingInterval} />
          <InputField label="Age at First Calving" name="AgeAtFirstCalving" type="number" value={data.AgeAtFirstCalving} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.AgeAtFirstCalving} />
          {/* LitterCondition removed — field not used by current backend stored-proc */}
        </SectionCard>
        <SectionCard title="Housing & Environment" icon={<AlertTriangle className="text-yellow-600" />}>
          <div>
            <VentilationSelect
              name="Ventilation"
              value={data.Ventilation}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, Ventilation: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.Ventilation && <div className="text-sm text-red-600 mt-1">{errors.Ventilation}</div>}
          </div>
          <div>
            <LightIntensitySelect
              name="LightIntensity"
              value={data.LightIntensity}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, LightIntensity: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.LightIntensity && <div className="text-sm text-red-600 mt-1">{errors.LightIntensity}</div>}
          </div>
          <div>
            <BeddingTypeSelect
              name="BeddingType"
              value={data.BeddingType}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, BeddingType: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.BeddingType && <div className="text-sm text-red-600 mt-1">{errors.BeddingType}</div>}
          </div>
          <div>
            <SpaceAvailabilitySelect
              name="SpaceAvailability"
              value={data.SpaceAvailability}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, SpaceAvailability: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.SpaceAvailability && <div className="text-sm text-red-600 mt-1">{errors.SpaceAvailability}</div>}
          </div>
        </SectionCard>
        <SectionCard title="Health, Medication & Advice" icon={<Pill className="text-purple-600" />}>
          <CheckboxField label="Medication" name="Medication" checked={data.Medication} onChange={handleChange} disabled={readOnly} />
          <TextAreaField label="Vaccination History" name="VaccinationHistory" value={data.VaccinationHistory} onChange={handleChange} placeholder="Vaccination history..." readOnly={readOnly} disabled={readOnly} />
          <InputField label="Vaccination Type" name="VaccinationType" value={data.VaccinationType} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <div>
            <VaccinationTimeDatePicker
              name="VaccinationTime"
              value={data.VaccinationTime}
              onChange={(val) => { if (typeof onChange === 'function') onChange({ ...data, VaccinationTime: val }); }}
              readOnly={readOnly}
            />
            {errors && errors.VaccinationTime && <div className="text-sm text-red-600 mt-1">{errors.VaccinationTime}</div>}
          </div>
          <TextAreaField label="What Type of Medication" name="WhatTypeofMedication" value={data.WhatTypeofMedication} onChange={handleChange} placeholder="Describe medications..." readOnly={readOnly} disabled={readOnly} />
          <InputField label="Recent Medication Type" name="RecentMedicationType" value={data.RecentMedicationType} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Recent Medication Time" name="RecentMedicationTime" value={data.RecentMedicationTime} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Issues / Complaints" name="IssuesComplaints" value={data.IssuesComplaints} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Analysis Requested" name="AnalyzeRequested" value={data.AnalyzeRequested} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
  <SectionCard title="Sampling & Evidence" icon={<Microscope className="text-teal-600" />}>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">Related Evidence Image</label>
            <div
              className={`mt-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-md bg-white ${readOnly ? 'opacity-60 cursor-not-allowed' : 'hover:border-indigo-500 cursor-pointer'}`}
              onClick={() => { if (!readOnly && inputRef.current) inputRef.current.click(); }}
              onDragOver={(e) => { if (!readOnly) e.preventDefault(); }}
              onDrop={(e) => { if (!readOnly) { e.preventDefault(); handleFilesChange({ target: { files: e.dataTransfer.files } }); } }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (!readOnly && (e.key === 'Enter' || e.key === ' ')) { inputRef.current && inputRef.current.click(); } }}
            >
              <div className="text-center">
                <UploadCloud className="mx-auto text-indigo-600" size={36} />
                <p className="mt-2 text-sm text-gray-500">Drag & drop images here, or click to browse</p>
                <p className="mt-1 text-xs text-gray-400">PNG, JPG — up to 10MB</p>
              </div>
              <input ref={inputRef} type="file" name="AnyRelatedEvidenceImage" accept="image/*" multiple onChange={handleFilesChange} className="hidden" disabled={readOnly} />
            </div>
            {imagePreviews && imagePreviews.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="w-24 h-24 rounded overflow-hidden border">
                    <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
              <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <CheckboxField label="Sample Taken" name="SampleTaken" checked={data.SampleTaken} onChange={handleChange} disabled={readOnly} />
              </div>
              <div>
                <InputField label="Batch Number / Production Date" name="BatchNumberorProductionDate" value={data.BatchNumberorProductionDate || data.BatchNumber} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
              </div>
            </div>
          </div>
        </SectionCard>
          
          <TextAreaField label="Feedback on AKF / Customer Feedback" name="FeedBackOnAKF" value={data.FeedBackOnAKF} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Customer Feedback or Complaints" name="CustomerFeedbackorCompliants" value={data.CustomerFeedbackorCompliants} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Farm Advisor Conclusion" name="FarmAdvisorConclusion" value={data.FarmAdvisorConclusion} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Recommendation / Advice" name="RecommendationAdvice" value={data.RecommendationAdvice} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
        </SectionCard>



        

        {readOnly ? (
          <div className="sticky bottom-0 bg-white border-t p-4 mt-8">
            <div className="max-w-4xl mx-auto flex justify-end">
              <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
            </div>
          </div>
        ) : (
          <div className="sticky bottom-0 bg-white border-t p-4 mt-8">
            <div className="max-w-4xl mx-auto flex justify-end space-x-4">
              <div className="flex items-center space-x-3">
                <button onClick={handleSaveInternal} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">{loading ? 'Saving...' : 'Save Visit'}</button>
                <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DairyFarmVisitForm;