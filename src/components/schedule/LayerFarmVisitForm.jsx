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

    // FlockSize must be > 0 (table constraint)
    const flock = toNum(data.FlockSize)
    if (flock === null) {
      // not required but SP/db expects positive when provided; encourage user to enter
    } else if (Number.isNaN(flock) || flock <= 0) {
      errs.FlockSize = 'Flock size must be a number > 0'
    }

    // AgeInWeeks 18-100 (CK constraint)
    const age = toNum(data.AgeInWeeks)
    if (age !== null && !Number.isNaN(age)) {
      if (age < 18 || age > 100) errs.AgeInWeeks = 'Age in weeks must be between 18 and 100'
    }

    // CurrEggProdinPercent 0-100 (CK)
    const eggProd = toNum(data.CurrEggProdinPercent || data.EggProductionPercent)
    if (eggProd !== null && !Number.isNaN(eggProd)) {
      if (eggProd < 0 || eggProd > 100) errs.CurrEggProdinPercent = 'Egg production percent must be between 0 and 100'
    }

    // HouseTemperature 10-40 (CK)
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

    // Other numeric sanity checks (non-negative)
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
      // cleanup created blob urls
      createdBlobUrlsRef.current.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
      createdBlobUrlsRef.current = [];
    };
  }, [data, readOnly]);

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
          <InputField disabled={readOnly} label="Breed" name="Breed" value={data.Breed} onChange={handleChange} error={errors && errors.Breed} />
          <InputField disabled={readOnly} label="Size of House (m²)" name="SizeOfTheHouseinM2" type="number" step="0.01" value={data.SizeOfTheHouseinM2} onChange={handleChange} />
          <InputField disabled={readOnly} label="Flock Density (birds/m²)" name="FlockDenPChickenm2" type="number" step="0.01" value={data.FlockDenPChickenm2} onChange={handleChange} />
          <InputField disabled={readOnly} label="Flock Size" name="FlockSize" type="number" min="0" value={data.FlockSize} onChange={handleChange} error={errors && errors.FlockSize} />
          <InputField disabled={readOnly} label="Feed Distribution Frequency (per day)" name="FreqFeedDistPerDay" type="number" value={data.FreqFeedDistPerDay} onChange={handleChange} />
          <InputField disabled={readOnly} label="Time of Feed Dist & How Much" name="TimeofFeedDistandHowMuch" type="text" value={data.TimeofFeedDistandHowMuch} onChange={handleChange} />
          <InputField disabled={readOnly} label="Feed Left Over (g/bird)" name="HowMuchFeedLOvergmPerChicken" type="number" step="0.01" value={data.HowMuchFeedLOvergmPerChicken} onChange={handleChange} />
          <InputField disabled={readOnly} label="Source Of Water" name="SourceOfWater" value={data.SourceOfWater} onChange={handleChange} />
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
            <InputField disabled={readOnly} label="Litter Condition" name="LitterCondition" value={data.LitterCondition} onChange={handleChange} />
            <InputField disabled={readOnly} label="Uniformity of Flock (%)" name="UnifermityofTheFlock" type="number" min="0" max="100" value={data.UnifermityofTheFlock} onChange={handleChange} />
          <InputField disabled={readOnly} label="Ventilation Status" name="VentilationStatus" value={data.VentilationStatus || data.Ventilation} onChange={handleChange} />
          <InputField disabled={readOnly} label="Drinker Type" name="DrinkerType" value={data.DrinkerType} onChange={handleChange} />
          <InputField disabled={readOnly} label="Number of Drinkers" name="NumberofDrinker" type="number" min="0" value={data.NumberofDrinker} onChange={handleChange} />
          <InputField disabled={readOnly} label="Feeder Type" name="FeederType" value={data.FeederType} onChange={handleChange} />
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
          <InputField disabled={readOnly} label="Yolk Color (1-15)" name="YolkColor" type="number" min="1" max="15" value={data.YolkColor} onChange={handleChange} />
          <InputField disabled={readOnly} label="Eggshell Color (1-10)" name="EggShellColor" type="number" min="1" max="10" value={data.EggShellColor} onChange={handleChange} />
          <TextAreaField disabled={readOnly} label="Egg Production Decline (prev 1-3 weeks)" name="RecentEggProdDeclinePrev1to3Weeks" value={data.RecentEggProdDeclinePrev1to3Weeks || data.EggProductionDeclinePrev1Week} onChange={handleChange} placeholder="Notes on production decline over the past 1-3 weeks..." />
          <InputField disabled={readOnly} label="Total Mortality" name="MortalityTotal" type="number" min="0" value={data.MortalityTotal} onChange={handleChange} error={errors && errors.MortalityTotal} />
          <InputField disabled={readOnly} label="Recent Mortality (1-3 weeks)" name="RecentMortalityPrev1to3Weeks" type="number" min="0" value={data.RecentMortalityPrev1to3Weeks ?? data.MortalityRecent2Weeks} onChange={handleChange} error={errors && errors.RecentMortalityPrev1to3Weeks} />
        </SectionCard>

        <SectionCard title="Diagnostics & Recommendations" icon={<Pill className="text-purple-600" />}>
          <TextAreaField disabled={readOnly} label="Disease History" name="ExplainAnyDiseaseHistory" value={data.ExplainAnyDiseaseHistory || data.DiseaseHistory} onChange={handleChange} placeholder="Enter past diseases..." />
          <TextAreaField disabled={readOnly} label="Abnormal Signs / Postmortem" name="AbnormalSigns" value={data.AbnormalSigns} onChange={handleChange} placeholder="Describe any abnormal signs or findings..." />
          <TextAreaField disabled={readOnly} label="Postmortem Findings" name="ExplainPostmortemFindings" value={data.ExplainPostmortemFindings || data.PostmortemFindings} onChange={handleChange} placeholder="Postmortem findings..." />
          <TextAreaField disabled={readOnly} label="Recommendations" name="RecommendationAdvice" value={data.RecommendationAdvice || data.RecommendationGiven} onChange={handleChange} placeholder="Enter recommendations..." />
        </SectionCard>

        <SectionCard title="Sampling" icon={<Microscope className="text-teal-600" />}>
          <div className="col-span-1 md:col-span-2 flex items-center space-x-4">
            <CheckboxField disabled={readOnly} label="Sample Taken" name="SampleTaken" checked={data.SampleTaken} onChange={handleChange} />
            <div className="flex-grow">
              <InputField disabled={readOnly} label="Sample Type" name="SampleType" value={data.SampleType} onChange={handleChange} placeholder="e.g., blood, tissue" />
            </div>
          </div>
          <InputField disabled={readOnly} label="Batch Number" name="BatchNumber" value={data.BatchNumber} onChange={handleChange} placeholder="Batch number if applicable" />
          <TextAreaField disabled={readOnly} label="Analysis Request" name="AnalyzeRequested" value={data.AnalyzeRequested || data.AnalysisRequest} onChange={handleChange} placeholder="Specify analysis required..." />
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