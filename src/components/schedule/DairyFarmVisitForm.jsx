import React, { useState, useEffect, useRef } from 'react';
import { FileText, UploadCloud, ClipboardList, Thermometer, Droplet, AlertTriangle, Pill, Microscope } from 'lucide-react';

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
          <InputField label="Feeding Per Cow" name="FeedingPerCow" value={data.FeedingPerCow} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="How They Give For Cows" name="HowTheyGiveForCows" value={data.HowTheyGiveForCows || data.HowTheyGiveForCos} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />


        </SectionCard>

        <SectionCard title="Feeding & Forage" icon={<ClipboardList className="text-green-600" />}>
          <CheckboxField label="Uses Concentrate" name="UsesConcentrate" checked={data.UsesConcentrate} onChange={handleChange} disabled={readOnly} />
          <div
            className="transition-all duration-200 ease-out overflow-hidden"
            style={{
              maxHeight: data && data.UsesConcentrate ? '400px' : '0px',
              opacity: data && data.UsesConcentrate ? 1 : 0,
              paddingTop: data && data.UsesConcentrate ? '0.5rem' : '0px'
            }}
            aria-hidden={!(data && data.UsesConcentrate)}
          >
            <InputField label="Which Company" name="WhichCompany" value={data.WhichCompany} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
            <InputField label="Feeding System" name="FeedingSystem" value={data.FeedingSystem} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
            <InputField label="Compound Feed Source" name="CompoundFeedSource" value={data.CompoundFeedSource} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
            <InputField label="Quantity of Commercial Feed" name="QuantityOfCommercialFeed" type="number" value={data.QuantityOfCommercialFeed} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
            <InputField label="Quantity of Home Mix" name="QuantityOfHomeMix" type="number" value={data.QuantityOfHomeMix} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
            <InputField label="Feeding Mechanism" name="FeedingMechanism" value={data.FeedingMechanism} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          </div>
          <CheckboxField label="Is Local Mix" name="IsLocalMix" checked={data.IsLocalMix} onChange={handleChange} disabled={readOnly} />
          <div
            className="col-span-1 md:col-span-2 transition-all duration-200 ease-out overflow-hidden"
            style={{
              maxHeight: data && data.IsLocalMix ? '600px' : '0px',
              opacity: data && data.IsLocalMix ? 1 : 0,
              paddingTop: data && data.IsLocalMix ? '0.5rem' : '0px'
            }}
            aria-hidden={!(data && data.IsLocalMix)}
          >
            <TextAreaField label="List of Ingredients" name="ListofIngridiant" value={data.ListofIngridiant} onChange={handleChange} placeholder="List ingredients..." readOnly={readOnly} disabled={readOnly} />
          </div>
          <div className="col-span-1 md:col-span-2">
            <CheckboxField label="Sample Collected" name="SampleCollection" checked={data.SampleCollection} onChange={handleChange} disabled={readOnly} />
          </div>
          <CheckboxField label="Has Forage" name="HasForage" checked={data.HasForage} onChange={handleChange} disabled={readOnly} />
          <InputField label="Type of Forage" name="TypeOfForage" value={data.TypeOfForage} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Forage Amount" name="ForageAmount" type="number" value={data.ForageAmount} onChange={handleChange} readOnly={readOnly} disabled={readOnly} error={errors && errors.ForageAmount} />
          <CheckboxField label="Concentrate Feed Sample" name="ConcentrateFeedSample" checked={data.ConcentrateFeedSample} onChange={handleChange} disabled={readOnly} />
          <InputField label="How Many Times (feeding)" name="HowManyTimes" value={data.HowManyTimes} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Type of Feed (with complaint)" name="TypeofFeedwithComplain" value={data.TypeofFeedwithComplain} onChange={handleChange} placeholder="Describe feed with complaint..." readOnly={readOnly} disabled={readOnly} />
        </SectionCard>

        <SectionCard title="Production & Water" icon={<Thermometer className="text-red-600" />}>
          <InputField label="Amount of Water Provided" name="AmountofWaterProvided" value={data.AmountofWaterProvided} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Watering System" name="WateringSystem" value={data.WateringSystem} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="If limited, how much" name="IfLimitedHowMuch" value={data.IfLimitedHowMuch} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Avg Milk Production/Day (per cow)" name="AvgMilkProductionPerDayPerCow" type="number" step="0.01" value={data.AvgMilkProductionPerDayPerCow} onChange={handleChange} unit="L/day" readOnly={readOnly} disabled={readOnly} error={errors && errors.AvgMilkProductionPerDayPerCow} />
          <InputField label="Max Milk Production/Day (per cow)" name="MaxMilkProductionPerDayPerCow" type="number" step="0.01" value={data.MaxMilkProductionPerDayPerCow} onChange={handleChange} unit="L" readOnly={readOnly} disabled={readOnly} error={errors && errors.MaxMilkProductionPerDayPerCow} />
          <InputField label="Total Milk/Day" name="TotalMilkPerDay" type="number" step="0.01" value={data.TotalMilkPerDay} onChange={handleChange} unit="L" readOnly={readOnly} disabled={readOnly} error={errors && errors.TotalMilkPerDay} />
          <InputField label="Milk Supply To" name="MilkSupplyTo" value={data.MilkSupplyTo} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
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
          <InputField label="Ventilation" name="Ventilation" value={data.Ventilation} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Light Intensity" name="LightIntensity" value={data.LightIntensity} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Bedding Type" name="BeddingType" value={data.BeddingType} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Space Availability" name="SpaceAvailability" value={data.SpaceAvailability} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
        </SectionCard>
        <SectionCard title="Health, Medication & Advice" icon={<Pill className="text-purple-600" />}>
          <CheckboxField label="Medication" name="Medication" checked={data.Medication} onChange={handleChange} disabled={readOnly} />
          <TextAreaField label="Vaccination History" name="VaccinationHistory" value={data.VaccinationHistory} onChange={handleChange} placeholder="Vaccination history..." readOnly={readOnly} disabled={readOnly} />
          <InputField label="Vaccination Type" name="VaccinationType" value={data.VaccinationType} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Vaccination Time" name="VaccinationTime" value={data.VaccinationTime} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="What Type of Medication" name="WhatTypeofMedication" value={data.WhatTypeofMedication} onChange={handleChange} placeholder="Describe medications..." readOnly={readOnly} disabled={readOnly} />
          <InputField label="Recent Medication Type" name="RecentMedicationType" value={data.RecentMedicationType} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <InputField label="Recent Medication Time" name="RecentMedicationTime" value={data.RecentMedicationTime} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Issues / Complaints" name="IssuesComplaints" value={data.IssuesComplaints} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Analysis Requested" name="AnalyzeRequested" value={data.AnalyzeRequested} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Recommendation / Advice" name="RecommendationAdvice" value={data.RecommendationAdvice} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Farm Advisor Conclusion" name="FarmAdvisorConclusion" value={data.FarmAdvisorConclusion} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Feedback on AKF / Customer Feedback" name="FeedBackOnAKF" value={data.FeedBackOnAKF} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
          <TextAreaField label="Customer Feedback or Complaints" name="CustomerFeedbackorCompliants" value={data.CustomerFeedbackorCompliants} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
        </SectionCard>



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
                <InputField label="Batch Number" name="BatchNumber" value={data.BatchNumber} onChange={handleChange} readOnly={readOnly} disabled={readOnly} />
              </div>
            </div>
          </div>
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