import React, { useState, useEffect } from 'react'
import { FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaLanguage, FaIdCard, FaUserGraduate } from 'react-icons/fa'
import { useAuth } from '../auth/AuthProvider'

const InputField = React.memo(({ icon, label, name, value, onChange, error, ...props }) => (
  <div>
    <label className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <div className="relative mt-1">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">{icon}</div>
      <input name={name} value={value} onChange={onChange}
        className="text-left block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
        {...props} />
    </div>
    {error && <p className="text-left mt-1 text-xs text-red-500">{error}</p>}
  </div>
))

const SelectField = React.memo(({ icon, label, name, value, onChange, error, children, readOnly = false, loading = false, ...props }) => (
  <div>
    <label className="text-left text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <div className="relative mt-1">
      <div className="text-left absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">{icon}</div>
      <select name={name} value={value} onChange={onChange} disabled={readOnly} aria-busy={loading}
        className="text-left block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        {...props}>
        {children}
      </select>
      {loading && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 pointer-events-none">
          <svg className="animate-spin h-4 w-4 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
      )}
    </div>
    {error && <p className="text-left mt-1 text-xs text-red-500">{error}</p>}
  </div>
))

function FarmersForm({ form, setForm, onFieldChange, fieldErrors, loading, onCancel, onSubmit, editingId, readOnly = false, leading = false }) {
  const handleChange = (e) => {
    if (readOnly) return; // prevent changes in read-only mode
    if (typeof onFieldChange === 'function') return onFieldChange(e)
    const { name, value, type, checked } = e.target
    setForm(s => ({ ...s, [name]: type === 'checkbox' ? checked : value }))
  }

  const { fetchWithAuth } = useAuth()
  const [regionOptions, setRegionOptions] = useState([])
  const [regionLoading, setRegionLoading] = useState(false)
  const [selectedRegionId, setSelectedRegionId] = useState(null)
  const [zoneOptions, setZoneOptions] = useState([])
  const [zoneLoading, setZoneLoading] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [weredaOptions, setWeredaOptions] = useState([])
  const [weredaLoading, setWeredaLoading] = useState(false)
  const [selectedWeredaId, setSelectedWeredaId] = useState(null)
  const [cityOptions, setCityOptions] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [educationOptions, setEducationOptions] = useState([])
  const [educationLoading, setEducationLoading] = useState(false)
  const [primaryOptions, setPrimaryOptions] = useState([])
  const [primaryLoading, setPrimaryLoading] = useState(false)
  const [maritalOptions, setMaritalOptions] = useState([])
  const [maritalLoading, setMaritalLoading] = useState(false)

  // Prefetch region hierarchy only when `leading` is true to avoid background requests
  useEffect(() => {
    if (!leading) return
    let cancelled = false
    ;(async () => {
      try {
        setRegionLoading(true)
        // Try to get richer region rows (including IDs) from the location-hierarchy endpoint first
        let res = await fetchWithAuth({ url: `/lookups/location-hierarchy`, method: 'get' })
        let payload = res?.data?.data || res?.data || res
        let rows = []
        if (Array.isArray(payload)) rows = payload
        else if (Array.isArray(payload.items)) rows = payload.items
        else if (Array.isArray(payload.recordset)) rows = payload.recordset
        else if (Array.isArray(payload.data)) rows = payload.data

        // If the hierarchy endpoint didn't return rows, fall back to by-type-name/Region
        if (!rows || rows.length === 0) {
          res = await fetchWithAuth({ url: '/lookups/by-type-name/Region', method: 'get' })
          payload = res?.data?.data || res?.data || res
          if (Array.isArray(payload)) rows = payload
          else if (Array.isArray(payload.items)) rows = payload.items
          else if (Array.isArray(payload.recordset)) rows = payload.recordset
          else if (Array.isArray(payload.data)) rows = payload.data
          else rows = []
        }

        const opts = (rows || []).map(r => {
          const id = r?.LookupID || r?.LookupId || r?.id || null
          const value = r?.LookupValue ?? r?.Value ?? r?.lookupValue ?? r?.value ?? null
          const label = r?.LookupLabel ?? r?.Label ?? r?.Name ?? value ?? ''
          return value ? { id: id ? String(id) : null, value: String(value), label: String(label) } : null
        }).filter(Boolean)
        if (!cancelled) setRegionOptions(opts)
      } catch (e) {
        if (!cancelled) setRegionOptions([])
      } finally { if (!cancelled) setRegionLoading(false) }
    })()
    return () => { cancelled = true }
  }, [fetchWithAuth, leading])

  // Expose lazy-load functions so selects can fetch on first focus (mobile friendly)
  const fetchRegionOptions = async () => {
    if (regionLoading || (regionOptions && regionOptions.length > 0)) return
    setRegionLoading(true)
    try {
      let res = await fetchWithAuth({ url: `/lookups/location-hierarchy`, method: 'get' })
      let payload = res?.data?.data || res?.data || res
      let rows = []
      if (Array.isArray(payload)) rows = payload
      else if (Array.isArray(payload.items)) rows = payload.items
      else if (Array.isArray(payload.recordset)) rows = payload.recordset
      else if (Array.isArray(payload.data)) rows = payload.data

      if (!rows || rows.length === 0) {
        res = await fetchWithAuth({ url: 'http://localhost:80/api/lookups/by-type-name/Region', method: 'get' })
        payload = res?.data?.data || res?.data || res
        if (Array.isArray(payload)) rows = payload
        else if (Array.isArray(payload.items)) rows = payload.items
        else if (Array.isArray(payload.recordset)) rows = payload.recordset
        else if (Array.isArray(payload.data)) rows = payload.data
        else rows = []
      }

      const opts = (rows || []).map(r => {
        const id = r?.LookupID || r?.LookupId || r?.id || null
        const value = r?.LookupValue ?? r?.Value ?? r?.lookupValue ?? r?.value ?? null
        const label = r?.LookupLabel ?? r?.Label ?? r?.Name ?? value ?? ''
        return value ? { id: id ? String(id) : null, value: String(value), label: String(label) } : null
      }).filter(Boolean)
      setRegionOptions(opts)
    } catch (e) {
      setRegionOptions([])
    } finally {
      setRegionLoading(false)
    }
  }

  // When region changes, load zones for that region
  useEffect(() => {
    let cancelled = false
    const regionId = selectedRegionId
    if (!regionId) {
      setZoneOptions([])
      setSelectedZoneId(null)
      setWeredaOptions([])
      setSelectedWeredaId(null)
      setCityOptions([])
      return
    }
    ;(async () => {
      try {
        setZoneLoading(true)
        const res = await fetchWithAuth({ url: `/lookups/location-hierarchy?RegionID=${encodeURIComponent(regionId)}`, method: 'get' })
        const rows = res?.data?.data || res?.data || []
        const opts = (rows || []).map(r => ({ id: r.LookupID || r.LookupId || r.id || null, value: r.LookupValue || r.LookupLabel || r.Value || r.value || '', label: r.LookupValue || r.LookupLabel || r.Value || r.value || '' }))
        if (!cancelled) {
          setZoneOptions(opts)
          setSelectedZoneId(null)
          setWeredaOptions([])
          setSelectedWeredaId(null)
          setCityOptions([])
        }
      } catch (e) {
        if (!cancelled) setZoneOptions([])
      } finally { if (!cancelled) setZoneLoading(false) }
    })()
    return () => { cancelled = true }
  }, [selectedRegionId, fetchWithAuth])

  // When zone changes, load weredas for that zone
  useEffect(() => {
    let cancelled = false
    const regionId = selectedRegionId
    const zoneId = selectedZoneId
    if (!zoneId) {
      setWeredaOptions([])
      setSelectedWeredaId(null)
      setCityOptions([])
      return
    }
    ;(async () => {
      try {
        setWeredaLoading(true)
        const qs = `RegionID=${encodeURIComponent(regionId || '')}&ZoneID=${encodeURIComponent(zoneId)}`
        const res = await fetchWithAuth({ url: `/lookups/location-hierarchy?${qs}`, method: 'get' })
        const rows = res?.data?.data || res?.data || []
        const opts = (rows || []).map(r => ({ id: r.LookupID || r.LookupId || r.id || null, value: r.LookupValue || r.LookupLabel || r.Value || r.value || '', label: r.LookupValue || r.LookupLabel || r.Value || r.value || '' }))
        if (!cancelled) {
          setWeredaOptions(opts)
          setSelectedWeredaId(null)
          setCityOptions([])
        }
      } catch (e) {
        if (!cancelled) setWeredaOptions([])
      } finally { if (!cancelled) setWeredaLoading(false) }
    })()
    return () => { cancelled = true }
  }, [selectedZoneId, selectedRegionId, fetchWithAuth])

  // When wereda changes, load cities for that wereda
  useEffect(() => {
    let cancelled = false
    const regionId = selectedRegionId
    const zoneId = selectedZoneId
    const weredaId = selectedWeredaId
    if (!weredaId) {
      setCityOptions([])
      return
    }
    ;(async () => {
      try {
        setCityLoading(true)
        const qs = `RegionID=${encodeURIComponent(regionId || '')}&ZoneID=${encodeURIComponent(zoneId || '')}&WeredaID=${encodeURIComponent(weredaId)}`
        const res = await fetchWithAuth({ url: `/lookups/location-hierarchy?${qs}`, method: 'get' })
        const rows = res?.data?.data || res?.data || []
        const opts = (rows || []).map(r => ({ id: r.LookupID || r.LookupId || r.id || null, value: r.LookupValue || r.LookupLabel || r.Value || r.value || '', label: r.LookupValue || r.LookupLabel || r.Value || r.value || '' }))
        if (!cancelled) setCityOptions(opts)
      } catch (e) {
        if (!cancelled) setCityOptions([])
      } finally { if (!cancelled) setCityLoading(false) }
    })()
    return () => { cancelled = true }
  }, [selectedWeredaId, selectedZoneId, selectedRegionId, fetchWithAuth])

  // Keep selected ids in sync when editing/loading existing form values
  useEffect(() => {
    if (form && form.Region) {
      const sel = (regionOptions || []).find(o => o.value === form.Region || o.label === form.Region)
      setSelectedRegionId(sel && sel.id ? sel.id : null)
    }
  }, [form.Region, regionOptions])

  useEffect(() => {
    if (form && form.Zone) {
      const sel = (zoneOptions || []).find(o => o.value === form.Zone || o.label === form.Zone)
      setSelectedZoneId(sel && sel.id ? sel.id : null)
    }
  }, [form.Zone, zoneOptions])

  useEffect(() => {
    if (form && form.Woreda) {
      const sel = (weredaOptions || []).find(o => o.value === form.Woreda || o.label === form.Woreda)
      setSelectedWeredaId(sel && sel.id ? sel.id : null)
    }
  }, [form.Woreda, weredaOptions])

  // Fetch Primary Language lookup options (LookupValue -> sent to backend)
  // Fetch Primary Language lookup options only when `leading` is true
  const fetchPrimaryOptions = async () => {
    if (primaryLoading || (primaryOptions && primaryOptions.length > 0)) return
    setPrimaryLoading(true)
    try {
      const res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent('Primary Language')}`, method: 'get' })
      const payload = res?.data?.data || res?.data || res
      let rows = []
      if (Array.isArray(payload)) rows = payload
      else if (Array.isArray(payload.items)) rows = payload.items
      else if (Array.isArray(payload.recordset)) rows = payload.recordset
      else if (Array.isArray(payload.data)) rows = payload.data
      const opts = (rows || []).map(r => {
        const value = r?.LookupValue ?? r?.Value ?? r?.lookupValue ?? r?.value ?? null
        const label = r?.LookupLabel ?? r?.Label ?? r?.Name ?? value ?? ''
        return value ? { value: String(value), label: String(label) } : null
      }).filter(Boolean)
      setPrimaryOptions(opts)
    } catch (e) {
      setPrimaryOptions([])
    } finally { setPrimaryLoading(false) }
  }

  // Fetch Marital Status lookup options (LookupValue -> sent to backend)
  // Fetch Marital Status only when `leading` is true
  const fetchMaritalOptions = async () => {
    if (maritalLoading || (maritalOptions && maritalOptions.length > 0)) return
    setMaritalLoading(true)
    try {
      const res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent('Marital Status')}`, method: 'get' })
      const payload = res?.data?.data || res?.data || res
      let rows = []
      if (Array.isArray(payload)) rows = payload
      else if (Array.isArray(payload.items)) rows = payload.items
      else if (Array.isArray(payload.recordset)) rows = payload.recordset
      else if (Array.isArray(payload.data)) rows = payload.data
      const opts = (rows || []).map(r => {
        const value = r?.LookupValue ?? r?.Value ?? r?.lookupValue ?? r?.value ?? null
        const label = r?.LookupLabel ?? r?.Label ?? r?.Name ?? value ?? ''
        return value ? { value: String(value), label: String(label) } : null
      }).filter(Boolean)
      setMaritalOptions(opts)
    } catch (e) {
      setMaritalOptions([])
    } finally { setMaritalLoading(false) }
  }

  // Fetch Education Level lookup options (LookupValue -> sent to backend)
  // Fetch Education Level only when `leading` is true
  const fetchEducationOptions = async () => {
    if (educationLoading || (educationOptions && educationOptions.length > 0)) return
    setEducationLoading(true)
    try {
      const res = await fetchWithAuth({ url: `/lookups/by-type-name/${encodeURIComponent('Education Level')}`, method: 'get' })
      const payload = res?.data?.data || res?.data || res
      let rows = []
      if (Array.isArray(payload)) rows = payload
      else if (Array.isArray(payload.items)) rows = payload.items
      else if (Array.isArray(payload.recordset)) rows = payload.recordset
      else if (Array.isArray(payload.data)) rows = payload.data
      const opts = (rows || []).map(r => {
        const value = r?.LookupValue ?? r?.Value ?? r?.lookupValue ?? r?.value ?? null
        const label = r?.LookupLabel ?? r?.Label ?? r?.Name ?? value ?? ''
        return value ? { value: String(value), label: String(label) } : null
      }).filter(Boolean)
      setEducationOptions(opts)
    } catch (e) {
      setEducationOptions([])
    } finally { setEducationLoading(false) }
  }

  // If running on a touch-capable device, prefetch these lookups on mount
  // (helps mobile native pickers have options available when opened)
  const isTouchDevice = (typeof window !== 'undefined') && (('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0))
  useEffect(() => {
    if (leading) return
    if (!isTouchDevice) return
    // Prefetch if not already loaded
    if (!primaryLoading && (!primaryOptions || primaryOptions.length === 0)) fetchPrimaryOptions()
    if (!educationLoading && (!educationOptions || educationOptions.length === 0)) fetchEducationOptions()
    if (!maritalLoading && (!maritalOptions || maritalOptions.length === 0)) fetchMaritalOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField icon={<FaUser />} label="First Name" name="FirstName" value={form.FirstName} onChange={handleChange} error={fieldErrors?.FirstName} placeholder="First name" readOnly={readOnly} />
        <InputField icon={<FaUser />} label="Last Name" name="LastName" value={form.LastName} onChange={handleChange} error={fieldErrors?.LastName} placeholder="Last name" readOnly={readOnly} />
        <InputField icon={<FaUser />} label="Father's Name" name="FatherName" value={form.FatherName} onChange={handleChange} placeholder="Father's name" readOnly={readOnly} />
        <SelectField icon={<FaUser />} label="Gender" name="Gender" value={form.Gender} onChange={handleChange} error={fieldErrors?.Gender} readOnly={readOnly}>
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </SelectField>
        <InputField icon={<FaIdCard />} label="National ID" name="NationalID" value={form.NationalID} onChange={handleChange} placeholder="National ID" readOnly={readOnly} />
        <InputField icon={<FaPhone />} label="Phone Number" name="PhoneNumber" value={form.PhoneNumber} onChange={handleChange} error={fieldErrors?.PhoneNumber} placeholder="0912345678" readOnly={readOnly} />
        <InputField icon={<FaPhone />} label="Alternate Phone" name="AlternatePhoneNumber" value={form.AlternatePhoneNumber} onChange={handleChange} placeholder="Alternate phone" readOnly={readOnly} />
        <InputField icon={<FaEnvelope />} label="Email" name="Email" value={form.Email} onChange={handleChange} placeholder="email@example.com" readOnly={readOnly} />
        <InputField icon={<FaMapMarkerAlt />} label="Geo Location" name="GeoLocation" value={form.GeoLocation} onChange={handleChange} placeholder="lat,lon" readOnly={readOnly} />

        <SelectField icon={<FaMapMarkerAlt />} label="Region" name="Region" value={form.Region} onChange={(e) => {
          const val = e.target.value
          const sel = (regionOptions || []).find(o => o.value === val)
          setSelectedRegionId(sel && sel.id ? sel.id : null)
          // set the form region to the lookup value (string)
          handleChange({ target: { name: 'Region', value: val } })
        }} onFocus={() => { if (!leading) fetchRegionOptions() }} onClick={() => { if (!leading) fetchRegionOptions() }} onTouchStart={() => { if (!leading) fetchRegionOptions() }} loading={regionLoading} error={fieldErrors?.Region} readOnly={readOnly}>
          <option value="">Select region</option>
          {(regionOptions || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </SelectField>

        <SelectField icon={<FaMapMarkerAlt />} label="Zone/Sub-City" name="Zone" value={form.Zone} onChange={(e) => {
          const val = e.target.value
          const sel = (zoneOptions || []).find(o => o.value === val || o.id === val)
          // zone select options use value=LookupValue; but we allow matching by id if needed
          setSelectedZoneId(sel && sel.id ? sel.id : null)
          handleChange({ target: { name: 'Zone', value: val } })
        }} loading={zoneLoading} error={fieldErrors?.Zone} readOnly={readOnly}>
          <option value="">Select Zone/Sub-City</option>
          {(zoneOptions || []).map(opt => (
            <option key={opt.id || opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </SelectField>

        <SelectField icon={<FaMapMarkerAlt />} label="Woreda" name="Woreda" value={form.Woreda} onChange={(e) => {
          const val = e.target.value
          const sel = (weredaOptions || []).find(o => o.value === val || o.id === val)
          setSelectedWeredaId(sel && sel.id ? sel.id : null)
          handleChange({ target: { name: 'Woreda', value: val } })
        }} loading={weredaLoading} error={fieldErrors?.Woreda} readOnly={readOnly}>
          <option value="">Select woreda</option>
          {(weredaOptions || []).map(opt => (
            <option key={opt.id || opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </SelectField>

        <SelectField icon={<FaMapMarkerAlt />} label="Village / City" name="Village" value={form.Village} onChange={(e) => {
          const val = e.target.value
          handleChange({ target: { name: 'Village', value: val } })
        }} loading={cityLoading} error={fieldErrors?.Village} readOnly={readOnly}>
          <option value="">Select village / city</option>
          {(cityOptions || []).map(opt => (
            <option key={opt.id || opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </SelectField>
        <InputField icon={<FaMapMarkerAlt />} label="House Number" name="HouseNumber" value={form.HouseNumber} onChange={handleChange} placeholder="House number" readOnly={readOnly} />
        <SelectField icon={<FaLanguage />} label="Primary Language" name="PrimaryLanguage" value={form.PrimaryLanguage} onChange={handleChange} onFocus={() => { if (!leading) fetchPrimaryOptions() }} onClick={() => { if (!leading) fetchPrimaryOptions() }} onTouchStart={() => { if (!leading) fetchPrimaryOptions() }} loading={primaryLoading} error={fieldErrors?.PrimaryLanguage} readOnly={readOnly}>
          <option value="">Select primary language</option>
          {(primaryOptions || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </SelectField>
        <SelectField icon={<FaUserGraduate />} label="Education Level" name="EducationLevel" value={form.EducationLevel} onChange={handleChange} onFocus={() => { if (!leading) fetchEducationOptions() }} onClick={() => { if (!leading) fetchEducationOptions() }} onTouchStart={() => { if (!leading) fetchEducationOptions() }} loading={educationLoading} error={fieldErrors?.EducationLevel} readOnly={readOnly}>
          <option value="">Select education level</option>
          {(educationOptions || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </SelectField>
        <SelectField icon={<FaUser />} label="Marital Status" name="MaritalStatus" value={form.MaritalStatus} onChange={handleChange} onFocus={() => { if (!leading) fetchMaritalOptions() }} onClick={() => { if (!leading) fetchMaritalOptions() }} onTouchStart={() => { if (!leading) fetchMaritalOptions() }} loading={maritalLoading} error={fieldErrors?.MaritalStatus} readOnly={readOnly}>
          <option value="">Select marital status</option>
          {(maritalOptions || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </SelectField>
        <InputField icon={<FaUser />} label="Family Size" name="FamilySize" value={form.FamilySize} onChange={handleChange} type="number" readOnly={readOnly} />
        <InputField icon={<FaUser />} label="Dependents" name="Dependents" value={form.Dependents} onChange={handleChange} type="number" readOnly={readOnly} />
        <InputField icon={<FaUser />} label="Household Income" name="HouseholdIncome" value={form.HouseholdIncome} onChange={handleChange} type="number" readOnly={readOnly} />

      </div>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{readOnly ? 'Close' : 'Cancel'}</button>
        {!readOnly && (
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" disabled={loading}>
            {loading ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Farmer')}
          </button>
        )}
      </div>
    </form>
  )
}

export { InputField, SelectField }
export default React.memo(FarmersForm)
