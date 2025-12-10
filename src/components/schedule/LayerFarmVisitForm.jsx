import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthProvider'
import { FileText, Syringe, ClipboardList, Thermometer, Droplet, AlertTriangle, Star, CheckSquare, XSquare, Pill, Microscope, Beaker, UploadCloud } from 'lucide-react';

const SectionCard = ({ title, icon, children }) => (
  <div className="bg-white shadow-md rounded-lg p-6 mb-6">
    <div className="flex items-center mb-4">
      {icon}
      <h3 className="text-xl font-semibold ml-3 text-gray-800">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  </div>
);

const InputField = ({ label, name, value, onChange, type = 'text', step, placeholder, unit, disabled, error }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 text-left mb-1">{label}</label>
    <div className="relative">
      <input
        id={name}
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        step={step}
        placeholder={placeholder}
        className={`mt-1 block w-full rounded-md ${error ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11`}
        disabled={disabled}
      />
      {unit && <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500">{unit}</span>}
    </div>
    {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
  </div>
);
 
const CheckboxField = ({ label, name, checked, onChange, disabled }) => (
  <div className="flex items-center">
    <input
      id={name}
      type="checkbox"
      name={name}
      checked={Boolean(checked)}
      onChange={onChange}
      className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
      disabled={disabled}
    />
    <label htmlFor={name} className="ml-2 block text-sm text-gray-900 text-left">{label}</label>
  </div>
);

const TextAreaField = ({ label, name, value, onChange, placeholder, disabled, error }) => (
  <div className="col-span-1 md:col-span-2">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 text-left mb-1">{label}</label>
    <textarea
      id={name}
      name={name}
      rows="4"
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className={`mt-1 block w-full rounded-md ${error ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-32`}
      disabled={disabled}
    ></textarea>
    {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
  </div>
);

const LayerFarmVisitForm = ({ form, onChange, onSave, onCancel, loading, readOnly = false, locationReadOnlyInModal = false }) => {
  const data = form ?? {};
  const auth = useAuth()
  const { fetchWithAuth, user } = auth || {}
  const [internalSaving, setInternalSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [breedOptions, setBreedOptions] = useState([])
  const [breedLoading, setBreedLoading] = useState(false)
  const [feederOptions, setFeederOptions] = useState([])
  const [feederLoading, setFeederLoading] = useState(false)
  const [drinkerOptions, setDrinkerOptions] = useState([])
  const [drinkerLoading, setDrinkerLoading] = useState(false)
  const [ventilationOptions, setVentilationOptions] = useState([])
  const [ventilationLoading, setVentilationLoading] = useState(false)
  const [litterOptions, setLitterOptions] = useState([])
  const [litterLoading, setLitterLoading] = useState(false)
  const [sourceOptions, setSourceOptions] = useState([])
  const [sourceLoading, setSourceLoading] = useState(false)

  const [imagePreviews, setImagePreviews] = useState([]);
  const createdBlobUrlsRef = useRef([]);
  const inputRef = useRef(null);
  const [locationReadOnly, setLocationReadOnly] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);

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

    const validate = () => {
      const errs = {}
      const toNum = (v) => {
        if (v === null || v === undefined || v === '') return null
        const n = Number(v)
        return Number.isFinite(n) ? n : NaN
      }

      // Location required (table: Location NOT NULL)
      if (!data.Location && !data.location) errs.Location = 'Location is required'

      // FlockSize must be > 0
      const flock = toNum(data.FlockSize)
      if (flock === null) {
        // not required
      } else if (Number.isNaN(flock) || flock <= 0) {
        errs.FlockSize = 'Flock size must be a number > 0'
      }

      // AgeInWeeks 18-100
      const age = toNum(data.AgeInWeeks)
      if (age !== null && !Number.isNaN(age)) {
        if (age < 18 || age > 100) errs.AgeInWeeks = 'Age in weeks must be between 18 and 100'
      }

      // CurrEggProdinPercent 0-100
      const eggProd = toNum(data.CurrEggProdinPercent || data.EggProductionPercent)
      if (eggProd !== null && !Number.isNaN(eggProd)) {
        if (eggProd < 0 || eggProd > 100) errs.CurrEggProdinPercent = 'Egg production percent must be between 0 and 100'
      }

      // HouseTemperature 10-40
      const temp = toNum(data.HouseTemperature)
      if (temp !== null && !Number.isNaN(temp)) {
        if (temp < 10 || temp > 40) errs.HouseTemperature = 'House temperature must be between 10 and 40 °C'
      }

      // RecentMortalityPrev1to3Weeks <= FlockSize
      const mortTotal = toNum(data.MortalityTotal)
      const mortRecent = toNum(data.RecentMortalityPrev1to3Weeks || data.MortalityRecent2Weeks)
      if (mortRecent !== null && !Number.isNaN(mortRecent)) {
        if (mortRecent < 0) errs.RecentMortalityPrev1to3Weeks = 'Recent mortality must be >= 0'
        if (flock !== null && !Number.isNaN(flock) && mortRecent > flock) errs.RecentMortalityPrev1to3Weeks = 'Recent mortality cannot exceed flock size'
      }

      ;['FeedIntakePerChickenGm','WaterInTakePerChickenPerDay','AverageBodyWeightKG','NumberofDrinker','NumberofFeeder','MortalityTotal'].forEach(k => {
        const v = toNum(data[k])
        if (v !== null && !Number.isNaN(v) && v < 0) errs[k] = `${k} must be >= 0`
      })

      return errs
    }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      // focus first errored field if possible
      const first = Object.keys(errs)[0]
      try { const el = document.getElementsByName(first)[0]; if (el && el.focus) el.focus(); } catch (e) {}
      return
    }

    // clear previous errors
    setErrors({})

    // If parent provided an onSave handler, defer to it (keeps existing behavior)
    if (typeof onSave === 'function') {
      try {
        await onSave();
      } catch (err) {
        console.error('parent onSave error', err);
        alert(err?.message || 'Save failed');
      }
      return;
    }

    // Otherwise perform an upsert to the layer-farm API endpoint
    setInternalSaving(true)
    try {
      const payload = { ...data };

      // Convert any File objects into a simple JSON list of filenames so the backend
      // (which stores string URLs) can accept something sensible in the AnyRelatedEvidenceImage field.
      if (Array.isArray(payload.AnyRelatedEvidenceImage) && payload.AnyRelatedEvidenceImage.length > 0) {
        try {
          payload.AnyRelatedEvidenceImage = JSON.stringify(payload.AnyRelatedEvidenceImage.map(f => (f && f.name) ? f.name : String(f)));
        } catch (e) {
          payload.AnyRelatedEvidenceImage = null
        }
      }

      // Attach CreatedBy/UpdatedBy from authenticated user when possible
      const createdBy = user && (user.EmployeeID || user.employeeId || user.UserID || user.id || user.sub)
      if (createdBy && !payload.CreatedBy && !payload.UpdatedBy) payload.CreatedBy = createdBy

      // Use fetchWithAuth when available so refresh/401 logic is applied
      let res
      if (typeof fetchWithAuth === 'function') {
        // Use create endpoint for layer farm visits
        res = await fetchWithAuth({ url: '/layer-farm', method: 'post', data: payload })
      } else {
        // fallback to app axios instance
        const api = await import('../../utils/api').then(m => m.default).catch(() => null)
        if (!api) throw new Error('No HTTP client available')
        res = await api.post('/layer-farm', payload)
      }

      if (res && res.data && res.data.success) {
        // notify parent if they want the response
        if (typeof onSave === 'function') onSave(res.data)
        else alert('Layer farm visit saved successfully')
      } else {
        const msg = res && res.data && (res.data.message || (res.data.error && res.data.error.message))
        alert(msg || 'Failed to save layer farm visit')
      }
    } catch (err) {
      console.error('save layer farm visit failed', err)
      const friendly = err && err.response && err.response.data && err.response.data.message ? err.response.data.message : err.message || 'Save failed'
      alert(friendly)
    } finally {
      setInternalSaving(false)
    }
  }

  const handleFilesChange = (e) => {
    if (readOnly) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (typeof onChange === 'function') {
      onChange({ ...data, AnyRelatedEvidenceImage: files });
    }

    // revoke previous blob urls we created
    createdBlobUrlsRef.current.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch (err) { /* ignore */ }
    });

    const urls = files.map((f) => URL.createObjectURL(f));
    createdBlobUrlsRef.current = urls.slice();
    setImagePreviews(urls);
  };

  useEffect(() => {
    let mounted = true

    const loadBreeds = async () => {
      try {
        setBreedLoading(true)

        const tryRequest = async (opts) => {
          try {
            if (typeof fetchWithAuth === 'function') return await fetchWithAuth(opts)
            const api = await import('../../utils/api').then(m => m.default).catch(() => null)
            if (!api) throw new Error('No HTTP client available')
            return await api.request(opts)
          } catch (err) {
            // return the error so caller can continue to fallback
            return err
          }
        }

        const extractItems = (res) => {
          if (!res) return []
          // axios-style response
          const d = res.data !== undefined ? res.data : res
          // common wrapper: { success: true, data: [...] }
          if (d && Array.isArray(d.data)) return d.data
          // sometimes direct array is returned
          if (Array.isArray(d)) return d
          // mssql style recordset
          if (d && Array.isArray(d.recordset)) return d.recordset
          // direct object with items property
          if (d && Array.isArray(d.items)) return d.items
          return []
        }

        // Try the explicit ngrok API first (requested), then fallback to relative endpoints
        const endpoints = [
          //{ url: 'https://farmvisit.ngrok.app/api/lookups/by-type-name/Breed', method: 'GET' },
          { url: '/lookups/by-type-name/Breed', method: 'GET' },
          { url: '/lookups/by-type', method: 'GET', params: { typeName: 'Breed' } },
          { url: '/lookups/by-type', method: 'GET', params: { lookupTypeId: null, typeName: 'Breed' } },
        ]

        let items = []
        for (const ep of endpoints) {
          try {
            const resp = await tryRequest(ep)
            // if resp is an Error, skip
            if (resp instanceof Error) continue
            const got = extractItems(resp)
            if (got && got.length) { items = got; break }
          } catch (e) { /* ignore and try next */ }
        }

        if (mounted) setBreedOptions(items || [])
      } catch (e) {
        console.error('loadBreeds error', e)
        if (mounted) setBreedOptions([])
      } finally {
        if (mounted) setBreedLoading(false)
      }
    }

    loadBreeds()
    
    const loadFeeders = async () => {
      try {
        setFeederLoading(true)

        const tryRequestLocal = async (opts) => {
          try {
            if (typeof fetchWithAuth === 'function') return await fetchWithAuth(opts)
            const api = await import('../../utils/api').then(m => m.default).catch(() => null)
            if (!api) throw new Error('No HTTP client available')
            return await api.request(opts)
          } catch (err) {
            return err
          }
        }

        const extractItemsLocal = (res) => {
          if (!res) return []
          const d = res.data !== undefined ? res.data : res
          if (d && Array.isArray(d.data)) return d.data
          if (Array.isArray(d)) return d
          if (d && Array.isArray(d.recordset)) return d.recordset
          if (d && Array.isArray(d.items)) return d.items
          return []
        }

        const endpoints = [
          { url: 'https://farmvisit.ngrok.app/api/lookups/by-type-name/Feeder%20Type', method: 'GET' },
          { url: '/lookups/by-type-name', method: 'GET', params: { typeName: 'Feeder Type', includeInactive: 0 } },
          { url: '/lookups/by-type', method: 'GET', params: { typeName: 'Feeder Type' } },
        ]

        let items = []
        for (const ep of endpoints) {
          try {
            const resp = await tryRequestLocal(ep)
            if (resp instanceof Error) continue
            const got = extractItemsLocal(resp)
            if (got && got.length) { items = got; break }
          } catch (e) { /* ignore and try next */ }
        }

        if (mounted) setFeederOptions(items || [])
      } catch (e) {
        console.error('loadFeeders error', e)
        if (mounted) setFeederOptions([])
      } finally {
        if (mounted) setFeederLoading(false)
      }
    }

    loadFeeders()

    const loadDrinkers = async () => {
      try {
        setDrinkerLoading(true)

        const tryRequestLocal = async (opts) => {
          try {
            if (typeof fetchWithAuth === 'function') return await fetchWithAuth(opts)
            const api = await import('../../utils/api').then(m => m.default).catch(() => null)
            if (!api) throw new Error('No HTTP client available')
            return await api.request(opts)
          } catch (err) {
            return err
          }
        }

        const extractItemsLocal = (res) => {
          if (!res) return []
          const d = res.data !== undefined ? res.data : res
          if (d && Array.isArray(d.data)) return d.data
          if (Array.isArray(d)) return d
          if (d && Array.isArray(d.recordset)) return d.recordset
          if (d && Array.isArray(d.items)) return d.items
          return []
        }

        const endpoints = [
          { url: 'https://farmvisit.ngrok.app/api/lookups/by-type-name/Drinker%20Type', method: 'GET' },
          { url: '/lookups/by-type-name', method: 'GET', params: { typeName: 'Drinker Type', includeInactive: 0 } },
          { url: '/lookups/by-type', method: 'GET', params: { typeName: 'Drinker Type' } },
        ]

        let items = []
        for (const ep of endpoints) {
          try {
            const resp = await tryRequestLocal(ep)
            if (resp instanceof Error) continue
            const got = extractItemsLocal(resp)
            if (got && got.length) { items = got; break }
          } catch (e) { /* ignore and try next */ }
        }

        if (mounted) setDrinkerOptions(items || [])
      } catch (e) {
        console.error('loadDrinkers error', e)
        if (mounted) setDrinkerOptions([])
      } finally {
        if (mounted) setDrinkerLoading(false)
      }
    }

    loadDrinkers()

    const loadVentilation = async () => {
      try {
        setVentilationLoading(true)

        const tryRequestLocal = async (opts) => {
          try {
            if (typeof fetchWithAuth === 'function') return await fetchWithAuth(opts)
            const api = await import('../../utils/api').then(m => m.default).catch(() => null)
            if (!api) throw new Error('No HTTP client available')
            return await api.request(opts)
          } catch (err) {
            return err
          }
        }

        const extractItemsLocal = (res) => {
          if (!res) return []
          const d = res.data !== undefined ? res.data : res
          if (d && Array.isArray(d.data)) return d.data
          if (Array.isArray(d)) return d
          if (d && Array.isArray(d.recordset)) return d.recordset
          if (d && Array.isArray(d.items)) return d.items
          return []
        }

        const endpoints = [
          { url: 'https://farmvisit.ngrok.app/api/lookups/by-type-name/Ventilation', method: 'GET' },
          { url: '/lookups/by-type-name', method: 'GET', params: { typeName: 'Ventilation', includeInactive: 0 } },
          { url: '/lookups/by-type', method: 'GET', params: { typeName: 'Ventilation' } },
        ]

        let items = []
        for (const ep of endpoints) {
          try {
            const resp = await tryRequestLocal(ep)
            if (resp instanceof Error) continue
            const got = extractItemsLocal(resp)
            if (got && got.length) { items = got; break }
          } catch (e) { /* ignore and try next */ }
        }

        if (mounted) setVentilationOptions(items || [])
      } catch (e) {
        console.error('loadVentilation error', e)
        if (mounted) setVentilationOptions([])
      } finally {
        if (mounted) setVentilationLoading(false)
      }
    }

    loadVentilation()

    const loadLitter = async () => {
      try {
        setLitterLoading(true)

        const tryRequestLocal = async (opts) => {
          try {
            if (typeof fetchWithAuth === 'function') return await fetchWithAuth(opts)
            const api = await import('../../utils/api').then(m => m.default).catch(() => null)
            if (!api) throw new Error('No HTTP client available')
            return await api.request(opts)
          } catch (err) {
            return err
          }
        }

        const extractItemsLocal = (res) => {
          if (!res) return []
          const d = res.data !== undefined ? res.data : res
          if (d && Array.isArray(d.data)) return d.data
          if (Array.isArray(d)) return d
          if (d && Array.isArray(d.recordset)) return d.recordset
          if (d && Array.isArray(d.items)) return d.items
          return []
        }

        const endpoints = [
          { url: 'https://farmvisit.ngrok.app/api/lookups/by-type-name/Litter%20condition', method: 'GET' },
          { url: '/lookups/by-type-name', method: 'GET', params: { typeName: 'Litter condition', includeInactive: 0 } },
          { url: '/lookups/by-type', method: 'GET', params: { typeName: 'Litter condition' } },
        ]

        let items = []
        for (const ep of endpoints) {
          try {
            const resp = await tryRequestLocal(ep)
            if (resp instanceof Error) continue
            const got = extractItemsLocal(resp)
            if (got && got.length) { items = got; break }
          } catch (e) { /* ignore and try next */ }
        }

        if (mounted) setLitterOptions(items || [])
      } catch (e) {
        console.error('loadLitter error', e)
        if (mounted) setLitterOptions([])
      } finally {
        if (mounted) setLitterLoading(false)
      }
    }

    loadLitter()

    const loadSources = async () => {
      try {
        setSourceLoading(true)

        const tryRequestLocal = async (opts) => {
          try {
            if (typeof fetchWithAuth === 'function') return await fetchWithAuth(opts)
            const api = await import('../../utils/api').then(m => m.default).catch(() => null)
            if (!api) throw new Error('No HTTP client available')
            return await api.request(opts)
          } catch (err) {
            return err
          }
        }

        const extractItemsLocal = (res) => {
          if (!res) return []
          const d = res.data !== undefined ? res.data : res
          if (d && Array.isArray(d.data)) return d.data
          if (Array.isArray(d)) return d
          if (d && Array.isArray(d.recordset)) return d.recordset
          if (d && Array.isArray(d.items)) return d.items
          return []
        }

        const endpoints = [
          { url: 'https://farmvisit.ngrok.app/api/lookups/by-type-name/Source%20of%20water', method: 'GET' },
          { url: '/lookups/by-type-name', method: 'GET', params: { typeName: 'Source of water', includeInactive: 0 } },
          { url: '/lookups/by-type', method: 'GET', params: { typeName: 'Source of water' } },
        ]

        let items = []
        for (const ep of endpoints) {
          try {
            const resp = await tryRequestLocal(ep)
            if (resp instanceof Error) continue
            const got = extractItemsLocal(resp)
            if (got && got.length) { items = got; break }
          } catch (e) { /* ignore and try next */ }
        }

        if (mounted) setSourceOptions(items || [])
      } catch (e) {
        console.error('loadSources error', e)
        if (mounted) setSourceOptions([])
      } finally {
        if (mounted) setSourceLoading(false)
      }
    }

    loadSources()

    // If initial/updated data contains string URLs, show them.
    if (Array.isArray(data.AnyRelatedEvidenceImage) && data.AnyRelatedEvidenceImage.length > 0) {
      const arr = data.AnyRelatedEvidenceImage.map((it) => (it instanceof File ? URL.createObjectURL(it) : String(it)));
      // revoke any previously created blob urls
      createdBlobUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
      createdBlobUrlsRef.current = arr.filter((u) => u.startsWith('blob:'));
      setImagePreviews(arr);
    } else {
      // clear previews when no images present
      createdBlobUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
      createdBlobUrlsRef.current = [];
      setImagePreviews([]);
    }

    // Initialize location field state when data changes
    if (readOnly) {
      setLocationReadOnly(true);
    } else if (data && (data.Location || data.location)) {
      setLocationReadOnly(true);
    } else {
      setLocationReadOnly(false);
    }

    return () => {
      mounted = false
      // cleanup created blob urls
      createdBlobUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
      createdBlobUrlsRef.current = [];
    };
  }, [data, readOnly, fetchWithAuth]);

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
            if (typeof onChange === 'function') onChange({ ...data, Location: coord });
          } catch (e) { /* ignore */ }
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

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Ensure ScheduleID is included in the payload (hidden input) */}
        <input type="hidden" name="ScheduleID" value={data.ScheduleID || data.scheduleId || ''} />
        <SectionCard title="Visit Details" icon={<FileText className="text-indigo-600" />}>
          <div>
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">Location (lat, long)</label>
            <div className="flex items-center gap-2">
              <input
                name="Location"
                value={data.Location || data.location || ''}
                onChange={handleChange}
                placeholder="e.g. 9.030000, 38.740000"
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
          <InputField disabled={readOnly} label="Farm ID (GUID)" name="FarmID" value={data.FarmID || data.farmId} onChange={handleChange} placeholder="Optional Farm GUID" error={errors && errors.FarmID} />
          <div>
            <label htmlFor="Breed" className="block text-sm font-medium text-gray-700 text-left mb-1">Breed</label>
            <div className="relative">
              <select
                id="Breed"
                name="Breed"
                value={data.Breed || ''}
                onChange={handleChange}
                disabled={readOnly}
                className={`mt-1 block w-full rounded-md ${errors && errors.Breed ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                {breedLoading ? (
                  <option value="" disabled>Loading breeds…</option>
                ) : (breedOptions && breedOptions.length ? (
                  <>
                    <option value="">Select Breed</option>
                    {breedOptions.map(b => {
                      const lookupValue = (b.LookupValue || b.lookupValue || '').toString();
                      const lookupCode = (b.LookupCode || b.lookupcode || b.LookupCode || b.Code || '').toString();
                      const lookupId = (b.LookupID || b.lookupId || b.lookupID || b.Id || '').toString();
                      const val = lookupValue || lookupId || lookupCode || ''
                      const labelBase = lookupValue || lookupCode || lookupId || ''
                      const label = lookupCode ? `${labelBase} (${lookupCode})` : `${labelBase}`
                      const key = lookupId || lookupValue || lookupCode || Math.random().toString(36).slice(2,8)
                      return <option key={key} value={val}>{label}</option>
                    })}
                  </>
                ) : (
                  <option value="" disabled>No breeds available</option>
                ))}
              </select>
            </div>
            {errors && errors.Breed && <div className="text-sm text-red-600 mt-1">{errors.Breed}</div>}
          </div>
          <InputField disabled={readOnly} label="Size of House (m²)" name="SizeOfTheHouseinM2" type="number" step="0.01" value={data.SizeOfTheHouseinM2} onChange={handleChange} />
          <InputField disabled={readOnly} label="Flock Size" name="FlockSize" type="number" min="0" value={data.FlockSize} onChange={handleChange} error={errors && errors.FlockSize} />
          <InputField disabled={readOnly} label="Feed Distribution Frequency (per day)" name="FreqFeedDistPerDay" type="number" value={data.FreqFeedDistPerDay} onChange={handleChange} />
          <InputField disabled={readOnly} label="Time of Feed Dist & How Much" name="TimeofFeedDistandHowMuch" type="text" value={data.TimeofFeedDistandHowMuch} onChange={handleChange} />
          <InputField disabled={readOnly} label="Feed Left Over (g/bird)" name="HowMuchFeedLOvergmPerChicken" type="number" step="0.01" value={data.HowMuchFeedLOvergmPerChicken} onChange={handleChange} />
          <div>
            <label htmlFor="SourceOfWater" className="block text-sm font-medium text-gray-700 text-left mb-1">Source Of Water</label>
            <div className="relative">
              <select
                id="SourceOfWater"
                name="SourceOfWater"
                value={data.SourceOfWater || ''}
                onChange={handleChange}
                disabled={readOnly}
                className={`mt-1 block w-full rounded-md ${errors && errors.SourceOfWater ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                {sourceLoading ? (
                  <option value="" disabled>Loading source options…</option>
                ) : (sourceOptions && sourceOptions.length ? (
                  <>
                    <option value="">Select Source Of Water</option>
                    {sourceOptions.map(s => {
                      const lookupValue = (s.LookupValue || s.lookupValue || '').toString();
                      const lookupCode = (s.LookupCode || s.lookupcode || s.Code || '').toString();
                      const lookupId = (s.LookupID || s.lookupId || s.Id || '').toString();
                      const val = lookupValue || lookupId || lookupCode || ''
                      const labelBase = lookupValue || lookupCode || lookupId || ''
                      const label = lookupCode ? `${labelBase} (${lookupCode})` : `${labelBase}`
                      const key = lookupId || lookupValue || lookupCode || Math.random().toString(36).slice(2,8)
                      return <option key={key} value={val}>{label}</option>
                    })}
                  </>
                ) : (
                  <option value="" disabled>No sources available</option>
                ))}
              </select>
            </div>
            {errors && errors.SourceOfWater && <div className="text-sm text-red-600 mt-1">{errors.SourceOfWater}</div>}
          </div>
          <InputField disabled={readOnly} label="Age (weeks)" name="AgeInWeeks" type="number" min="0" max="200" value={data.AgeInWeeks} onChange={handleChange} unit="weeks" error={errors && errors.AgeInWeeks} />
          <InputField disabled={readOnly} label="Feed Intake per Chicken (g)" name="FeedIntakePerChickenGm" type="number" step="0.01" value={data.FeedIntakePerChickenGm} onChange={handleChange} error={errors && errors.FeedIntakePerChickenGm} />
          <InputField disabled={readOnly} label="Water Intake per Chicken per Day (ml)" name="WaterInTakePerChickenPerDay" type="number" step="0.01" value={data.WaterInTakePerChickenPerDay} onChange={handleChange} error={errors && errors.WaterInTakePerChickenPerDay} />
        </SectionCard>

        <SectionCard title="Health & Environment" icon={<Thermometer className="text-green-600" />}>
          {/* Flock density is represented by FlockDenPChickenm2 in the schema (birds/m²) */}
          <InputField disabled={readOnly} label="Flock Density (birds/m²)" name="FlockDenPChickenm2" type="number" step="0.01" value={data.FlockDenPChickenm2} onChange={handleChange} />
          <InputField disabled={readOnly} label="Average Body Weight (kg)" name="AverageBodyWeightKG" type="number" min="0" step="0.01" value={data.AverageBodyWeightKG} onChange={handleChange} error={errors && errors.AverageBodyWeightKG} />
          <InputField disabled={readOnly} label="House Temperature (°C)" name="HouseTemperature" type="number" min="10" max="35" step="0.01" value={data.HouseTemperature} onChange={handleChange} error={errors && errors.HouseTemperature} />
          <InputField disabled={readOnly} label="Humidity (%)" name="Humidity" type="number" min="30" max="85" step="0.01" value={data.Humidity} onChange={handleChange} error={errors && errors.Humidity} />
              {/* Litter Condition as lookup-driven dropdown */}
            <div>
              <label htmlFor="LitterCondition" className="block text-sm font-medium text-gray-700 text-left mb-1">Litter Condition</label>
              <div className="relative">
                <select
                  id="LitterCondition"
                  name="LitterCondition"
                  value={data.LitterCondition || ''}
                  onChange={handleChange}
                  disabled={readOnly}
                  className={`mt-1 block w-full rounded-md ${errors && errors.LitterCondition ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  {litterLoading ? (
                    <option value="" disabled>Loading litter conditions…</option>
                  ) : (litterOptions && litterOptions.length ? (
                    <>
                      <option value="">Select Litter Condition</option>
                      {litterOptions.map(l => {
                        const lookupValue = (l.LookupValue || l.lookupValue || '').toString();
                        const lookupCode = (l.LookupCode || l.lookupcode || l.Code || '').toString();
                        const lookupId = (l.LookupID || l.lookupId || l.Id || '').toString();
                        const val = lookupValue || lookupId || lookupCode || ''
                        const labelBase = lookupValue || lookupCode || lookupId || ''
                        const label = lookupCode ? `${labelBase} (${lookupCode})` : `${labelBase}`
                        const key = lookupId || lookupValue || lookupCode || Math.random().toString(36).slice(2,8)
                        return <option key={key} value={val}>{label}</option>
                      })}
                    </>
                  ) : (
                    <option value="" disabled>No litter conditions available</option>
                  ))}
                </select>
              </div>
              {errors && errors.LitterCondition && <div className="text-sm text-red-600 mt-1">{errors.LitterCondition}</div>}
            </div>
            <InputField disabled={readOnly} label="Uniformity of Flock (%)" name="UnifermityofTheFlock" type="number" min="0" max="100" value={data.UnifermityofTheFlock} onChange={handleChange} />
          <div>
            <label htmlFor="VentilationStatus" className="block text-sm font-medium text-gray-700 text-left mb-1">Ventilation Status</label>
            <div className="relative">
              <select
                id="VentilationStatus"
                name="VentilationStatus"
                value={data.VentilationStatus || ''}
                onChange={handleChange}
                disabled={readOnly}
                className={`mt-1 block w-full rounded-md ${errors && errors.VentilationStatus ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                {ventilationLoading ? (
                  <option value="" disabled>Loading ventilation types…</option>
                ) : (ventilationOptions && ventilationOptions.length ? (
                  <>
                    <option value="">Select Ventilation</option>
                    {ventilationOptions.map(v => {
                      const lookupValue = (v.LookupValue || v.lookupValue || '').toString();
                      const lookupCode = (v.LookupCode || v.lookupcode || v.Code || '').toString();
                      const lookupId = (v.LookupID || v.lookupId || v.Id || '').toString();
                      const val = lookupValue || lookupId || lookupCode || ''
                      const labelBase = lookupValue || lookupCode || lookupId || ''
                      const label = lookupCode ? `${labelBase} (${lookupCode})` : `${labelBase}`
                      const key = lookupId || lookupValue || lookupCode || Math.random().toString(36).slice(2,8)
                      return <option key={key} value={val}>{label}</option>
                    })}
                  </>
                ) : (
                  <option value="" disabled>No ventilation types available</option>
                ))}
              </select>
            </div>
            {errors && errors.VentilationStatus && <div className="text-sm text-red-600 mt-1">{errors.VentilationStatus}</div>}
          </div>
          <div>
            <label htmlFor="DrinkerType" className="block text-sm font-medium text-gray-700 text-left mb-1">Drinker Type</label>
            <div className="relative">
              <select
                id="DrinkerType"
                name="DrinkerType"
                value={data.DrinkerType || ''}
                onChange={handleChange}
                disabled={readOnly}
                className={`mt-1 block w-full rounded-md ${errors && errors.DrinkerType ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                {drinkerLoading ? (
                  <option value="" disabled>Loading drinker types…</option>
                ) : (drinkerOptions && drinkerOptions.length ? (
                  <>
                    <option value="">Select Drinker Type</option>
                    {drinkerOptions.map(d => {
                      const lookupValue = (d.LookupValue || d.lookupValue || '').toString();
                      const lookupCode = (d.LookupCode || d.lookupcode || d.Code || '').toString();
                      const lookupId = (d.LookupID || d.lookupId || d.Id || '').toString();
                      const val = lookupValue || lookupId || lookupCode || ''
                      const labelBase = lookupValue || lookupCode || lookupId || ''
                      const label = lookupCode ? `${labelBase} (${lookupCode})` : `${labelBase}`
                      const key = lookupId || lookupValue || lookupCode || Math.random().toString(36).slice(2,8)
                      return <option key={key} value={val}>{label}</option>
                    })}
                  </>
                ) : (
                  <option value="" disabled>No drinker types available</option>
                ))}
              </select>
            </div>
            {errors && errors.DrinkerType && <div className="text-sm text-red-600 mt-1">{errors.DrinkerType}</div>}
          </div>
          <InputField disabled={readOnly} label="Number of Drinkers" name="NumberofDrinker" type="number" min="0" value={data.NumberofDrinker} onChange={handleChange} />
          <div>
            <label htmlFor="FeederType" className="block text-sm font-medium text-gray-700 text-left mb-1">Feeder Type</label>
            <div className="relative">
              <select
                id="FeederType"
                name="FeederType"
                value={data.FeederType || ''}
                onChange={handleChange}
                disabled={readOnly}
                className={`mt-1 block w-full rounded-md ${errors && errors.FeederType ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base py-2 px-3 h-11 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                {feederLoading ? (
                  <option value="" disabled>Loading feeder types…</option>
                ) : (feederOptions && feederOptions.length ? (
                  <>
                    <option value="">Select Feeder Type</option>
                    {feederOptions.map(f => {
                      const lookupValue = (f.LookupValue || f.lookupValue || '').toString();
                      const lookupCode = (f.LookupCode || f.lookupcode || f.Code || '').toString();
                      const lookupId = (f.LookupID || f.lookupId || f.Id || '').toString();
                      const val = lookupValue || lookupId || lookupCode || ''
                      const labelBase = lookupValue || lookupCode || lookupId || ''
                      const label = lookupCode ? `${labelBase} (${lookupCode})` : `${labelBase}`
                      const key = lookupId || lookupValue || lookupCode || Math.random().toString(36).slice(2,8)
                      return <option key={key} value={val}>{label}</option>
                    })}
                  </>
                ) : (
                  <option value="" disabled>No feeder types available</option>
                ))}
              </select>
            </div>
            {errors && errors.FeederType && <div className="text-sm text-red-600 mt-1">{errors.FeederType}</div>}
          </div>
          <InputField disabled={readOnly} label="Number of Feeders" name="NumberofFeeder" type="number" min="0" value={data.NumberofFeeder} onChange={handleChange} />
        </SectionCard>

        <SectionCard title="Vaccination" icon={<Syringe className="text-blue-600" />}>
          <div className="col-span-1 md:col-span-2 flex items-center space-x-4">
            <CheckboxField disabled={readOnly} label="Vaccinations Given (last 4 weeks)" name="VaccinationsGivenLast4Weeks" checked={data.VaccinationsGivenLast4Weeks == null ? data.VaccinationsGiven : data.VaccinationsGivenLast4Weeks} onChange={handleChange} />
            <div className="flex-grow">
              <InputField disabled={readOnly} label="Which Type & Date of Vaccine" name="WhichTypeandDataofVaccin" value={data.WhichTypeandDataofVaccin || data.VaccinationNote} onChange={handleChange} />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 flex items-center space-x-4">
            <CheckboxField disabled={readOnly} label="Any Medication Given" name="AnyMedicationGiven" checked={data.AnyMedicationGiven == null ? data.AnyMedication || false : data.AnyMedicationGiven} onChange={handleChange} />
            <div className="flex-grow">
              <InputField disabled={readOnly} label="Which Type and Why" name="WhichTypeandWhy" value={data.WhichTypeandWhy} onChange={handleChange} />
            </div>
          </div>
          <TextAreaField disabled={readOnly} label="Biosecurity Comment" name="BiosecurityComment" value={data.BiosecurityComment} onChange={handleChange} placeholder="Biosecurity measures or observations..." />
          <TextAreaField disabled={readOnly} label="Farm Hygiene Comment" name="FarmHygieneComment" value={data.FarmHygieneComment} onChange={handleChange} placeholder="Comments on farm hygiene..." />
        </SectionCard>

        <SectionCard title="Production & Mortality" icon={<AlertTriangle className="text-red-600" />}>
          <InputField disabled={readOnly} label="Egg Production (%)" name="CurrEggProdinPercent" type="number" min="0" max="100" step="0.01" value={data.CurrEggProdinPercent ?? data.EggProductionPercent} onChange={handleChange} error={errors && errors.CurrEggProdinPercent} />
          <InputField disabled={readOnly} label="Egg Size Avg Weight (g)" name="EggSizeAvgWeightGm" type="number" min="0" max="200" step="0.01" value={data.EggSizeAvgWeightGm} onChange={handleChange} />
          <TextAreaField disabled={readOnly} label="Egg Abnormality" name="EggAbnormality" value={data.EggAbnormality} onChange={handleChange} placeholder="Describe any egg abnormalities..." />
          <InputField disabled={readOnly} label="Yolk Color (1-18)" name="YolkColor" type="number" min="1" max="15" value={data.YolkColor} onChange={handleChange} />
          <InputField disabled={readOnly} label="Eggshell Color (1-18)" name="EggShellColor" type="number" min="1" max="10" value={data.EggShellColor} onChange={handleChange} />
          <TextAreaField disabled={readOnly} label="Egg Production Decline (prev 1-3 weeks)" name="RecentEggProdDeclinePrev1to3Weeks" value={data.RecentEggProdDeclinePrev1to3Weeks || data.EggProductionDeclinePrev1Week} onChange={handleChange} placeholder="Notes on production decline over the past 1-3 weeks..." />
          <InputField disabled={readOnly} label="Total Mortality" name="MortalityTotal" type="number" min="0" value={data.MortalityTotal} onChange={handleChange} error={errors && errors.MortalityTotal} />
          <InputField disabled={readOnly} label="Recent Mortality (1-3 weeks)" name="RecentMortalityPrev1to3Weeks" type="number" min="0" value={data.RecentMortalityPrev1to3Weeks ?? data.MortalityRecent2Weeks} onChange={handleChange} error={errors && errors.RecentMortalityPrev1to3Weeks} />
        </SectionCard>

        <SectionCard title="Diagnostics & Recommendations" icon={<Pill className="text-purple-600" />}>
          <TextAreaField disabled={readOnly} label="Disease History" name="ExplainAnyDiseaseHistory" value={data.ExplainAnyDiseaseHistory || data.DiseaseHistory} onChange={handleChange} placeholder="Enter past diseases..." />
          <TextAreaField disabled={readOnly} label="Abnormal Disease Signs" name="AbnormalSigns" value={data.AbnormalSigns} onChange={handleChange} placeholder="Describe any abnormal signs or findings..." />
          <TextAreaField disabled={readOnly} label="Postmortem Findings" name="ExplainPostmortemFindings" value={data.ExplainPostmortemFindings || data.PostmortemFindings} onChange={handleChange} placeholder="Postmortem findings..." />
          
        </SectionCard>

        
          
          <TextAreaField disabled={readOnly} label="Customer Feedback on AKF" name="FeedBackOnAKF" value={data.FeedBackOnAKF || data.CustomerFeedbackOnAKF} onChange={handleChange} placeholder="Customer feedback..." />
          {!readOnly && (
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 text-left mb-1">Any Picture Related to Visit</label>
            <div
              className="mt-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-md bg-white hover:border-indigo-500 cursor-pointer"
              onClick={() => inputRef.current && inputRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFilesChange({ target: { files: e.dataTransfer.files } }); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { inputRef.current && inputRef.current.click(); } }}
            >
              <div className="text-center">
                <UploadCloud className="mx-auto text-indigo-600" size={36} />
                <p className="mt-2 text-sm text-gray-500">Drag & drop images here, or click to browse</p>
                <p className="mt-1 text-xs text-gray-400">PNG, JPG — up to 10MB</p>
              </div>
                <input ref={inputRef} type="file" name="AnyRelatedEvidenceImage" accept="image/*" multiple onChange={handleFilesChange} className="hidden" />
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
           </div>
           )}
           <SectionCard title="Sampling" icon={<Microscope className="text-teal-600" />}>
           <div className="col-span-1 md:col-span-2 flex items-center space-x-4">
            <CheckboxField disabled={readOnly} label="Sample Taken" name="SampleTaken" checked={data.SampleTaken} onChange={handleChange} />
            <div className="flex-grow">
              <InputField disabled={readOnly} label="Sample Type" name="SampleType" value={data.SampleType} onChange={handleChange} placeholder="e.g., blood, tissue, feed" />
            </div>
          </div>
          <InputField disabled={readOnly} label="Batch Number/Production Date" name="BatchNumber" value={data.BatchNumber} onChange={handleChange} placeholder="Batch number if applicable" />
          <TextAreaField disabled={readOnly} label="Analysis Request" name="AnalyzeRequested" value={data.AnalyzeRequested || data.AnalysisRequest} onChange={handleChange} placeholder="Specify analysis required..." />
           <TextAreaField disabled={readOnly} label="Recommendations for Customer" name="RecommendationAdvice" value={data.RecommendationAdvice || data.RecommendationGiven} onChange={handleChange} placeholder="Enter recommendations..." />
        </SectionCard>
      </div>

      <div className="sticky bottom-0 bg-white border-t p-4 mt-8">
        <div className="max-w-4xl mx-auto flex justify-end items-center space-x-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <>
              <button onClick={handleSave} disabled={loading || internalSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
                {(loading || internalSaving) ? 'Saving...' : 'Save Visit'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayerFarmVisitForm;