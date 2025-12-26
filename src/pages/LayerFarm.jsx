import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import LayerFarmVisitForm from '../components/schedule/LayerFarmVisitForm'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { Plus, RefreshCw, Edit, Trash2, Check, Eye } from 'lucide-react'


export default function LayerFarm() {
  const { user, fetchWithAuth } = useAuth()
  // Prefer EmployeeID when present because DB FK relations reference core.Employees.EmployeeID
  const actorId = user && (user.EmployeeID || user.employeeId || user.UserID || user.userId || user.UserId || user.id || user.ID)
  const location = useLocation()
  const initialForm = {
    ScheduleID: '', Location: '', FarmID: '', Breed: '', FarmType: '',
    SizeOfTheHouseinM2: '', FlockSize: '', FlockDenPChickenm2: '', AgeInWeeks: '', FeedingManagement: '',
    FreqFeedDistPerDay: '', TimeofFeedDistandHowMuch: '', HowMuchFeedLOvergmPerChicken: '', FeedIntakePerChickenGm: '', FeedLeftOver: '', FLOHowMuchPDay: '', WaterIntakePerDay: '',
    SourceOfWater: '', WaterInTakePerChickenPerDay: '', FlockDensity: '',
    AverageBodyWeightKG: '', UnifermityofTheFlock: '', VentilationStatus: '', HouseTemperature: '', Humidity: '', LitterCondition: '', DrinkerType: '', NumberofDrinker: '',
    FeederType: '', NumberofFeeder: '', VaccinationsGivenLast4Weeks: false, WhichTypeandDataofVaccin: '', AnyMedicationGiven: false, WhichTypeandWhy: '', BiosecurityComment: '',
    CurrEggProdinPercent: '', FarmHygieneComment: '', EggSizeAvgWeightGm: '', EggAbnormality: '', YolkColor: '', EggShellColor: '',
    RecentEggProdDeclinePrev1to3Weeks: '', MortalityTotal: '', RecentMortalityPrev1to3Weeks: '', ExplainAnyDiseaseHistory: '', AbnormalSigns: '',
    ExplainPostmortemFindings: '', IssuesComplaints: '', AnalyzeRequested: '', TypeofFeedwithComplain: '', SampleTaken: false, SampleType: '', BatchNumber: '', AnyRelatedEvidenceImage: '',
    FeedBackOnAKF: '', RecommendationAdvice: '', IsVisitCompleted: false, VisitSequence: '', VisitYear: '', VisitQuarter: '', VisitMonth: ''
  }
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [visits, setVisits] = useState([])
  const [scheduleMap, setScheduleMap] = useState({});
  const [farmMap, setFarmMap] = useState({});
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [completeTarget, setCompleteTarget] = useState(null)
  const navigate = useNavigate()

  const SmallSpinner = () => (
    <svg className="animate-spin h-4 w-4 text-teal-500 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>
  )

  const resetForm = () => setForm(initialForm)

  const handleSubmit = async (e) => {
    e && e.preventDefault()
    const userId = user && (user.EmployeeID || user.employeeId || user.UserID || user.userId || user.UserId || user.id || user.ID)
    // prefer actorId when available (EmployeeID) for CreatedBy/UpdatedBy
    const actor = actorId || userId
    // clear previous inline field errors and global messages
    setFieldErrors({})
    setMessage(null)

    if (!userId) { setMessage({ type: 'error', text: 'You must be signed in to create a layer farm visit.' }); return }
    const errs = {}
    if (!form.ScheduleID || String(form.ScheduleID).trim() === '') { errs.ScheduleID = 'ScheduleID is required.' }
    if (!form.Location || String(form.Location).trim() === '') { errs.Location = 'Location is required.' }
    if (Object.keys(errs).length) {
      // show modal and surface inline errors on the form
      setFieldErrors(errs)
      setShowModal(true)
      return
    }

    if (form.MortalityTotal !== '' && form.MortalityRecent2Weeks !== '') {
      const mt = Number(form.MortalityTotal)
      const mr = Number(form.MortalityRecent2Weeks)
      if (!Number.isNaN(mt) && !Number.isNaN(mr) && mr > mt) {
        setFieldErrors({ MortalityTotal: 'Total mortality must be >= recent mortality', RecentMortalityPrev1to3Weeks: 'Recent mortality cannot exceed total mortality' })
        setShowModal(true)
        return
      }
    }
    if (form.AgeInWeeks !== '' && form.EggProductionPercent !== '') {
      const age = Number(form.AgeInWeeks)
      const prod = Number(form.EggProductionPercent)
      if (!Number.isNaN(age) && age < 18 && !Number.isNaN(prod) && prod > 10) {
        setFieldErrors({ AgeInWeeks: 'Age < 18 weeks requires egg production <= 10%', CurrEggProdinPercent: 'Egg production must be <= 10% for age < 18' })
        setShowModal(true)
        return
      }
    }
 
    setSaving(true); setMessage(null)
    const wasEditing = Boolean(editingId)
    try {
      const payload = {
        ScheduleID: form.ScheduleID || null,
        Location: form.Location || null,
        FarmID: form.FarmID || null,
        Breed: form.Breed || null,
        FarmType: form.FarmType || null,
        SizeOfTheHouseinM2: form.SizeOfTheHouseinM2 ? Number(form.SizeOfTheHouseinM2) : null,
        FlockSize: form.FlockSize ? Number(form.FlockSize) : null,
        FlockDenPChickenm2: form.FlockDenPChickenm2 ? Number(form.FlockDenPChickenm2) : null,
        AgeInWeeks: form.AgeInWeeks ? Number(form.AgeInWeeks) : null,
        FeedingManagement: form.FeedingManagement || null,
        FeedIntakePerChickenGm: form.FeedIntakePerChickenGm ? Number(form.FeedIntakePerChickenGm) : null,
        FreqFeedDistPerDay: form.FreqFeedDistPerDay ? Number(form.FreqFeedDistPerDay) : null,
        TimeofFeedDistandHowMuch: form.TimeofFeedDistandHowMuch || null,
        HowMuchFeedLOvergmPerChicken: form.HowMuchFeedLOvergmPerChicken ? Number(form.HowMuchFeedLOvergmPerChicken) : null,
        SourceOfWater: form.SourceOfWater || null,
        WaterInTakePerChickenPerDay: form.WaterInTakePerChickenPerDay ? Number(form.WaterInTakePerChickenPerDay) : (form.WaterInTakePerChicken ? Number(form.WaterInTakePerChicken) : null),
        FlockDensity: form.FlockDensity || null,
        AverageBodyWeightKG: form.AverageBodyWeightKG ? Number(form.AverageBodyWeightKG) : (form.AvgBodyWeightKg ? Number(form.AvgBodyWeightKg) : null),
        UnifermityofTheFlock: form.UnifermityofTheFlock ? Number(form.UnifermityofTheFlock) : null,
        VentilationStatus: form.VentilationStatus || form.Ventilation || null,
        HouseTemperature: form.HouseTemperature ? Number(form.HouseTemperature) : null,
        Humidity: form.Humidity ? Number(form.Humidity) : null,
        LitterCondition: form.LitterCondition || null,
        DrinkerType: form.DrinkerType || null,
        NumberofDrinker: form.NumberofDrinker ? Number(form.NumberofDrinker) : null,
        FeederType: form.FeederType || null,
        NumberofFeeder: form.NumberofFeeder ? Number(form.NumberofFeeder) : null,
        VaccinationsGivenLast4Weeks: (form.VaccinationsGivenLast4Weeks == null) ? !!form.VaccinationsGiven : !!form.VaccinationsGivenLast4Weeks,
        WhichTypeandDataofVaccin: form.WhichTypeandDataofVaccin || form.VaccinationNote || null,
        AnyMedicationGiven: (form.AnyMedicationGiven == null) ? !!form.AnyMedication : !!form.AnyMedicationGiven,
        WhichTypeandWhy: form.WhichTypeandWhy || null,
        BiosecurityComment: form.BiosecurityComment || null,
        FarmHygieneComment: form.FarmHygieneComment || null,
        CurrEggProdinPercent: form.CurrEggProdinPercent ? Number(form.CurrEggProdinPercent) : (form.EggProductionPercent ? Number(form.EggProductionPercent) : null),
        EggSizeAvgWeightGm: form.EggSizeAvgWeightGm ? Number(form.EggSizeAvgWeightGm) : null,
        EggAbnormality: form.EggAbnormality || null,
        YolkColor: form.YolkColor ? Number(form.YolkColor) : null,
        EggShellColor: form.EggShellColor ? Number(form.EggShellColor) : null,
        RecentEggProdDeclinePrev1to3Weeks: form.RecentEggProdDeclinePrev1to3Weeks || form.EggProductionDeclinePrev1Week || null,
        MortalityTotal: form.MortalityTotal ? Number(form.MortalityTotal) : null,
        RecentMortalityPrev1to3Weeks: form.RecentMortalityPrev1to3Weeks ? Number(form.RecentMortalityPrev1to3Weeks) : (form.MortalityRecent2Weeks ? Number(form.MortalityRecent2Weeks) : null),
        ExplainAnyDiseaseHistory: form.ExplainAnyDiseaseHistory || form.DiseaseHistory || null,
        AbnormalSigns: form.AbnormalSigns || null,
        ExplainPostmortemFindings: form.ExplainPostmortemFindings || form.PostmortemFindings || null,
        IssuesComplaints: form.IssuesComplaints || null,
        AnalyzeRequested: form.AnalyzeRequested || form.AnalysisRequest || null,
        TypeofFeedwithComplain: form.TypeofFeedwithComplain || null,
        SampleTaken: !!form.SampleTaken,
        BatchNumber: form.BatchNumber || null,
        FeedBackOnAKF: form.FeedBackOnAKF || form.CustomerFeedbackOnAKF || null,
        AnyRelatedEvidenceImage: form.AnyRelatedEvidenceImage || form.AnyPictureRelatedtoVisit || null,
        RecommendationAdvice: form.RecommendationAdvice || form.RecommendationGiven || null,
        IsVisitCompleted: !!form.IsVisitCompleted,
        VisitSequence: form.VisitSequence ? Number(form.VisitSequence) : null,
        VisitYear: form.VisitYear ? Number(form.VisitYear) : null,
        VisitQuarter: form.VisitQuarter ? Number(form.VisitQuarter) : null,
        VisitMonth: form.VisitMonth ? Number(form.VisitMonth) : null,
        CreatedBy: actor,
        UpdatedBy: actor,
      }

        if (editingId) {
        // update or mark complete
          if (payload.IsVisitCompleted) {
            // Use the complete endpoint to ensure DB workflow runs server-side
            await fetchWithAuth({ url: `/layer-farm/${editingId}/complete`, method: 'put', data: { IsVisitCompleted: true, UpdatedBy: actor } })
          setMessage({ type: 'success', text: 'Layer visit marked as completed' })
          // Try to complete the parent schedule if it's in-progress
          try {
            const scheduleId = payload.ScheduleID || form.ScheduleID || null
            if (scheduleId) {
              const sdRes = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}`, method: 'get' })
              const sd = sdRes.data?.data || sdRes.data || null
              const visitRaw = sd?.VisitStatus ?? sd?.Status ?? sd?.visitStatus ?? sd?.VisitStatusName ?? sd?.status ?? null
              const visitStatus = visitRaw ? String(visitRaw).trim().toUpperCase() : ''
              if (visitStatus === 'INPROGRESS' || visitStatus === 'IN_PROGRESS' || visitStatus === 'IN PROGRESS') {
                try {
                  await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/complete`, method: 'post', data: { CompletedBy: userId, VisitSummary: 'Completed from Layer Visits UI' } })
                  try { window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'Completed' } } })); } catch (e) { /* ignore */ }
                  setMessage({ type: 'success', text: 'Layer visit and schedule marked as completed' })
                } catch (schErr) {
                  const msg = schErr?.response?.data?.message || schErr?.message || 'Schedule complete failed'
                  setMessage({ type: 'info', text: `Visit marked completed but could not complete schedule: ${msg}` })
                }
              }
            }
          } catch (e) {
            console.warn('could not fetch schedule after visit complete', e)
          }
        } else {
          await fetchWithAuth({ url: `/layer-farm/${editingId}`, method: 'put', data: { ...payload, UpdatedBy: actor } })
          // Show a simple informational message after updating — do not navigate away
          setMessage({ type: 'info', text: 'Layer visit updated!' })
        }
      } else {
        const createRes = await fetchWithAuth({ url: '/layer-farm', method: 'post', data: payload })
        const createdRaw = createRes?.data?.data || createRes?.data || createRes
        let createdRow = createdRaw
        if (Array.isArray(createdRow) && createdRow.length > 0) createdRow = createdRow[0]
        const createdId = createdRow && (createdRow.LayerVisitID || createdRow.LayerVisitId || createdRow.id)
        const idText = createdId ? String(createdId) : null
        setMessage({ type: 'success', text: idText ? `Layer visit created (${idText})` : 'Layer visit created' })
        // If server returned the created row and id, open it for editing so user can continue
        if (createdRow && createdId) {
          setForm(createdRow)
          setEditingId(createdId)
          setShowModal(true)
          // If the user created the visit and already marked it completed in the form,
          // call the complete endpoint so server-side completion logic runs.
          try {
            if (payload.IsVisitCompleted) {
              await fetchWithAuth({ url: `/layer-farm/${createdId}/complete`, method: 'put', data: { IsVisitCompleted: true, UpdatedBy: actor } })
              setMessage({ type: 'success', text: idText ? `Layer visit created and marked completed (${idText})` : 'Layer visit created and marked completed' })
              // attempt to complete schedule as well
              try {
                const scheduleId = payload.ScheduleID || createdRow?.ScheduleID || null
                if (scheduleId) {
                  const sdRes = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}`, method: 'get' })
                  const sd = sdRes.data?.data || sdRes.data || null
                  const visitRaw = sd?.VisitStatus ?? sd?.Status ?? sd?.visitStatus ?? sd?.VisitStatusName ?? sd?.status ?? null
                  const visitStatus = visitRaw ? String(visitRaw).trim().toUpperCase() : ''
                  if (visitStatus === 'INPROGRESS' || visitStatus === 'IN_PROGRESS' || visitStatus === 'IN PROGRESS') {
                    try {
                      await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/complete`, method: 'post', data: { CompletedBy: userId, VisitSummary: 'Completed from Layer Visits UI' } })
                      try { window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'Completed' } } })); } catch (e) { /* ignore */ }
                      setMessage({ type: 'success', text: idText ? `Layer visit created and schedule marked completed (${idText})` : 'Layer visit created and schedule marked completed' })
                    } catch (schErr) {
                      const msg = schErr?.response?.data?.message || schErr?.message || 'Schedule complete failed'
                      setMessage({ type: 'info', text: `Visit created but could not complete schedule: ${msg}` })
                    }
                  }
                }
              } catch (e) { console.warn('post-create schedule complete attempt failed', e) }
            }
          } catch (completeErr) {
            console.warn('post-create complete failed', completeErr)
            setMessage({ type: 'info', text: 'Visit created but marking complete failed' })
          }
        }
      }

      // After saving the visit, attempt to mark the related schedule as InProgress by calling Start endpoint (non-fatal)
      try {
        const scheduleId = payload.ScheduleID || form.ScheduleID || null
        if (scheduleId) {
          try {
            const res = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}`, method: 'get' })
            const sd = res.data?.data || res.data || null
            const approvalRaw = sd?.ApprovalStatus ?? sd?.Approval ?? sd?.approvalStatus ?? sd?.approvalStatusName ?? sd?.ApprovalStatusName ?? null
            const visitRaw = sd?.VisitStatus ?? sd?.Status ?? sd?.visitStatus ?? sd?.VisitStatusName ?? sd?.status ?? null
            const approval = approvalRaw ? String(approvalRaw).trim().toUpperCase() : ''
            const visitStatus = visitRaw ? String(visitRaw).trim().toUpperCase() : ''

            if (approval === 'APPROVED' && visitStatus === 'SCHEDULED') {
              await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/start`, method: 'post', data: {} })
              try {
                const now = new Date().toISOString();
                window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'InProgress', ActualVisitDate: now } } }));
              } catch (e) { /* ignore */ }
              setMessage({ type: 'success', text: (editingId ? 'Layer visit updated' : 'Layer visit created') + ' — schedule started' })
            } else {
              setMessage({ type: 'info', text: (editingId ? 'Layer visit updated!' : 'Layer visit created')  })
            }
          } catch (getErr) {
            console.warn('failed to fetch schedule before start', getErr)
            const errMsg = getErr?.response?.data?.message || getErr?.message || 'Failed to fetch schedule'
            setMessage({ type: 'info', text: `Saved visit but could not verify schedule: ${errMsg}` })
          }
        }
      } catch (err) {
        console.warn('start schedule request failed', err)
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to start schedule'
        setMessage({ type: 'info', text: `Saved visit but could not start schedule: ${errMsg}` })
      }

      // reset UI only when we were editing an existing visit. For newly created visits,
      // we opened the created visit in edit mode above (so keep modal open).
      if (wasEditing) {
        setEditingId(null)
        setShowModal(false)
        resetForm()
      }
      await fetchVisits()

      // Do not navigate away after saving a Layer visit — stay on Layer visits UI
      // (Previously navigated to schedule details here; removed per UX request)
    } catch (err) {
      console.error('create layer farm error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create' })
    } finally {
      setSaving(false)
    }
  }

  const fetchVisits = async () => {
    setLoadingVisits(true)
    try {
      const res = await fetchWithAuth({ url: '/layer-farm', method: 'get' })
      const data = res?.data?.data || res?.data || []
      if (Array.isArray(data)) setVisits(data)
      else setVisits([])
      // populate schedule map for VisitCode display
      try {
        const ids = (Array.isArray(data) ? data : []).map(d => d.ScheduleID || d.scheduleId || null).filter(Boolean);
        const uniq = Array.from(new Set(ids.map(String)));
          if (uniq.length > 0) {
            const map = {};
            await Promise.all(uniq.map(async (id) => {
              try {
                const r = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(id)}`, method: 'get' });
                const sd = r?.data?.data || r?.data || null;
                if (sd) {
                  // store the full schedule object for richer display (VisitCode, Farm, Advisor)
                  map[String(id)] = sd;
                }
              } catch (e) { /* ignore per-row failures */ }
            }))
            setScheduleMap(prev => ({ ...prev, ...map }));
          // populate farm map so the Farm columns can show FarmName and FarmCode instead of raw IDs
          try {
            const farmIds = (Array.isArray(data) ? data : []).map(d => d.FarmID || d.farmId || d.Farm || null).filter(Boolean)
            const uniqFarms = Array.from(new Set(farmIds.map(String)))
            if (uniqFarms.length > 0) {
              const fmap = {}
              // Try bulk fetch first
              try {
                const fr = await fetchWithAuth({ url: '/farms', method: 'get' })
                const farmsData = fr?.data?.data || fr?.data || []
                if (Array.isArray(farmsData) && farmsData.length > 0) {
                  farmsData.forEach(f => {
                    const id = String(f.FarmID || f.farmId || f.id || f.FarmId || f.Id || f.ID)
                    // store full farm object so we can render both name and code
                    fmap[id] = f
                  })
                } else {
                  // fallback to per-id fetch
                  await Promise.all(uniqFarms.map(async (id) => {
                    try {
                      const r = await fetchWithAuth({ url: `/farms/${encodeURIComponent(id)}`, method: 'get' })
                      const ff = r?.data?.data || r?.data || null
                      if (ff) fmap[id] = ff
                    } catch (e) { /* ignore per-farm failures */ }
                  }))
                }
              } catch (e) {
                // If bulk fetch failed, try per-id fetch
                await Promise.all(uniqFarms.map(async (id) => {
                  try {
                    const r = await fetchWithAuth({ url: `/farms/${encodeURIComponent(id)}`, method: 'get' })
                    const ff = r?.data?.data || r?.data || null
                    if (ff) fmap[id] = ff
                  } catch (err) { /* ignore */ }
                }))
              }

              if (Object.keys(fmap).length > 0) setFarmMap(prev => ({ ...prev, ...fmap }))
            }
          } catch (e) { /* ignore farm-map populate errors */ }
        }
      } catch (e) { /* ignore schedule-map populate errors */ }
    } catch (err) {
      console.error('fetch visits error', err)
      setVisits([])
    } finally { setLoadingVisits(false) }
  }

  useEffect(() => { fetchVisits() }, [])

  // Prefill ScheduleID from query string or navigation state when present
  useEffect(() => {
    let fetchTimer = null
    let receivedFromParent = { value: false }
    try {
      const qs = new URLSearchParams(location.search || '')
      const qVisit = qs.get('scheduleId') || qs.get('visitId') || (location.state && (location.state.scheduleId || location.state.visitId))
      const qFarmType = qs.get('farmType') || (location.state && location.state.farmType)
      const qAdvisor = qs.get('AdvisorID') || (location.state && location.state.AdvisorID) || qs.get('advisor')
      const qFarm = qs.get('FarmID') || (location.state && location.state.FarmID) || qs.get('farm')
      const qPurpose = qs.get('VisitPurpose') || (location.state && location.state.VisitPurpose) || qs.get('purpose')
      const qAssign = qs.get('AssignTo') || (location.state && location.state.AssignTo) || qs.get('assignTo')

      if (qVisit) {
        setForm(f => ({ ...f, ScheduleID: qVisit }))

        // Listen for a postMessage from parent iframe holder with authoritative data.
        const onMessage = (e) => {
          try {
            if (e.origin !== window.location.origin) return
            const msg = e.data
            // debug received message for dev troubleshooting
            // console.debug('layerfarm received postMessage', msg, 'from', e.origin)
            if (!msg || msg.type !== 'layerVisitData') return
            if ((msg.scheduleId || msg.visitId) && (msg.scheduleId || msg.visitId) !== qVisit) return
            const data = msg.data || null
            if (data) {
              receivedFromParent.value = true
              setForm(f => ({ ...f,
                ScheduleID: data.ScheduleID || data.VisitID || data.VisitId || f.ScheduleID || '',
                Location: data.Location || data.location || f.Location || '',
                FarmID: data.FarmID || data.farmId || f.FarmID || '',
                Breed: data.Breed || f.Breed || '',
                FarmType: data.FarmType || f.FarmType || '',
                SizeOfTheHouseinM2: (data.SizeOfTheHouseinM2 ?? f.SizeOfTheHouseinM2) || '',
                FlockSize: (data.FlockSize ?? f.FlockSize) || '',
                FlockDenPChickenm2: (data.FlockDenPChickenm2 ?? f.FlockDenPChickenm2) || '',
                AgeInWeeks: (data.AgeInWeeks ?? f.AgeInWeeks) || '',
                FeedingManagement: data.FeedingManagement || f.FeedingManagement || '',
                FeedIntakePerChickenGm: (data.FeedIntakePerChickenGm ?? f.FeedIntakePerChickenGm) || '',
                FreqFeedDistPerDay: (data.FreqFeedDistPerDay ?? f.FreqFeedDistPerDay) || '',
                TimeofFeedDistandHowMuch: data.TimeofFeedDistandHowMuch || f.TimeofFeedDistandHowMuch || '',
                HowMuchFeedLOvergmPerChicken: (data.HowMuchFeedLOvergmPerChicken ?? f.HowMuchFeedLOvergmPerChicken) || '',
                FeedLeftOver: data.FeedLeftOver || data.FeedLeftover || f.FeedLeftOver || '',
                SourceOfWater: data.SourceOfWater || f.SourceOfWater || '',
                WaterInTakePerChickenPerDay: (data.WaterInTakePerChickenPerDay ?? data.WaterInTakePerChicken ?? f.WaterInTakePerChickenPerDay) || '',
                WaterIntakePerDay: data.WaterIntakePerDay || f.WaterIntakePerDay || '',
                AverageBodyWeightKG: (data.AverageBodyWeightKG ?? data.AvgBodyWeightKg ?? f.AverageBodyWeightKG) || '',
                UnifermityofTheFlock: (data.UnifermityofTheFlock ?? f.UnifermityofTheFlock) || '',
                VentilationStatus: data.VentilationStatus || data.Ventilation || f.VentilationStatus || '',
                HouseTemperature: (data.HouseTemperature ?? f.HouseTemperature) || '',
                Humidity: (data.Humidity ?? f.Humidity) || '',
                LitterCondition: data.LitterCondition || f.LitterCondition || '',
                VaccinationNote: data.WhichTypeandDataofVaccin || data.VaccinationNote || f.WhichTypeandDataofVaccin || f.VaccinationNote || '',
                WhichTypeandDataofVaccin: data.WhichTypeandDataofVaccin || data.VaccinationNote || f.WhichTypeandDataofVaccin || f.VaccinationNote || '',
                BiosecurityComment: data.BiosecurityComment || f.BiosecurityComment || '',
                CurrEggProdinPercent: (data.CurrEggProdinPercent ?? data.EggProductionPercent ?? f.CurrEggProdinPercent) || '',
                MortalityTotal: (data.MortalityTotal ?? f.MortalityTotal) || '',
                RecentMortalityPrev1to3Weeks: (data.RecentMortalityPrev1to3Weeks ?? data.MortalityRecent2Weeks ?? f.RecentMortalityPrev1to3Weeks) || '',
                ExplainPostmortemFindings: data.ExplainPostmortemFindings || data.PostmortemFindings || f.ExplainPostmortemFindings || f.PostmortemFindings || '',
                AnyRelatedEvidenceImage: data.AnyRelatedEvidenceImage || data.AnyPictureRelatedtoVisit || f.AnyRelatedEvidenceImage || f.AnyPictureRelatedtoVisit || '',
                IsVisitCompleted: (data.IsVisitCompleted ?? data.isVisitCompleted) || f.IsVisitCompleted || false,
                VisitSequence: (data.VisitSequence ?? f.VisitSequence) || '',
                VisitYear: (data.VisitYear ?? f.VisitYear) || '',
                VisitQuarter: (data.VisitQuarter ?? f.VisitQuarter) || '',
                VisitMonth: (data.VisitMonth ?? f.VisitMonth) || ''
              }))
            }
          } catch (err) { console.debug('layerfarm postMessage handler error', err) }
        }

        window.addEventListener('message', onMessage)

        // Open the modal so user can fill/edit the visit
        setShowModal(true)

        // Fallback: if parent does not send data within 250ms, fetch directly
        fetchTimer = setTimeout(async () => {
          try {
            if (receivedFromParent.value) return

            // Try fetching authoritative prefill data via schedule/form-data (same as DairyFarm)
            let data = null
            try {
              const res = await fetchWithAuth({ url: `/farm-visit-schedule/form-data/${encodeURIComponent(qVisit)}?farmType=LAYER`, method: 'get' })
              data = res.data?.data || res.data || null
            } catch (errPrefill) {
              // fallback to direct layer-farm endpoints if schedule prefill not available
            }

            if (!data) {
              // Try fetching by LayerVisitID first; if not found, try by ScheduleID (returns array)
              try {
                const resById = await fetchWithAuth({ url: `/layer-farm/${encodeURIComponent(qVisit)}`, method: 'get' })
                data = resById?.data?.data || resById?.data || null
              } catch (errById) {
                // ignore and try by-schedule
              }

              if (!data) {
                try {
                  const resBySchedule = await fetchWithAuth({ url: `/layer-farm/by-schedule/${encodeURIComponent(qVisit)}`, method: 'get' })
                  const arr = resBySchedule?.data?.data || resBySchedule?.data || []
                  if (Array.isArray(arr) && arr.length > 0) data = arr[0]
                  else data = null
                } catch (errSched) { data = null }
              }
            }

            if (data) {
              setForm(f => ({ ...f,
                ScheduleID: data.ScheduleID || data.VisitID || data.VisitId || f.ScheduleID || '',
                Location: data.Location || data.FarmLocation || data.location || f.Location || '',
                FarmID: data.FarmID || data.farmId || f.FarmID || '',
                Breed: data.Breed || f.Breed || '',
                FarmType: data.FarmType || f.FarmType || '',
                SizeOfTheHouseinM2: (data.SizeOfTheHouseinM2 ?? f.SizeOfTheHouseinM2) || '',
                FlockSize: (data.FlockSize ?? f.FlockSize) || '',
                FlockDenPChickenm2: (data.FlockDenPChickenm2 ?? f.FlockDenPChickenm2) || '',
                AgeInWeeks: (data.AgeInWeeks ?? f.AgeInWeeks) || '',
                FeedingManagement: data.FeedingManagement || f.FeedingManagement || '',
                FeedIntakePerChickenGm: (data.FeedIntakePerChickenGm ?? f.FeedIntakePerChickenGm) || '',
                FreqFeedDistPerDay: (data.FreqFeedDistPerDay ?? f.FreqFeedDistPerDay) || '',
                TimeofFeedDistandHowMuch: data.TimeofFeedDistandHowMuch || f.TimeofFeedDistandHowMuch || '',
                HowMuchFeedLOvergmPerChicken: (data.HowMuchFeedLOvergmPerChicken ?? f.HowMuchFeedLOvergmPerChicken) || '',
                FeedLeftOver: data.FeedLeftOver || data.FeedLeftover || f.FeedLeftOver || '',
                SourceOfWater: data.SourceOfWater || f.SourceOfWater || '',
                WaterInTakePerChickenPerDay: (data.WaterInTakePerChickenPerDay ?? data.WaterInTakePerChicken ?? f.WaterInTakePerChickenPerDay) || '',
                WaterIntakePerDay: data.WaterIntakePerDay || f.WaterIntakePerDay || '',
                AverageBodyWeightKG: (data.AverageBodyWeightKG ?? data.AvgBodyWeightKg ?? f.AverageBodyWeightKG) || '',
                UnifermityofTheFlock: (data.UnifermityofTheFlock ?? f.UnifermityofTheFlock) || '',
                VentilationStatus: data.VentilationStatus || data.Ventilation || f.VentilationStatus || '',
                HouseTemperature: (data.HouseTemperature ?? f.HouseTemperature) || '',
                Humidity: (data.Humidity ?? f.Humidity) || '',
                LitterCondition: data.LitterCondition || f.LitterCondition || '',
                VaccinationNote: data.WhichTypeandDataofVaccin || data.VaccinationNote || f.WhichTypeandDataofVaccin || f.VaccinationNote || '',
                WhichTypeandDataofVaccin: data.WhichTypeandDataofVaccin || data.VaccinationNote || f.WhichTypeandDataofVaccin || f.VaccinationNote || '',
                BiosecurityComment: data.BiosecurityComment || f.BiosecurityComment || '',
                CurrEggProdinPercent: (data.CurrEggProdinPercent ?? data.EggProductionPercent ?? f.CurrEggProdinPercent) || '',
                MortalityTotal: (data.MortalityTotal ?? f.MortalityTotal) || '',
                RecentMortalityPrev1to3Weeks: (data.RecentMortalityPrev1to3Weeks ?? data.MortalityRecent2Weeks ?? f.RecentMortalityPrev1to3Weeks) || '',
                ExplainPostmortemFindings: data.ExplainPostmortemFindings || data.PostmortemFindings || f.ExplainPostmortemFindings || f.PostmortemFindings || '',
                AnyRelatedEvidenceImage: data.AnyRelatedEvidenceImage || data.AnyPictureRelatedtoVisit || f.AnyRelatedEvidenceImage || f.AnyPictureRelatedtoVisit || '',
                IsVisitCompleted: (data.IsVisitCompleted ?? data.isVisitCompleted) || f.IsVisitCompleted || false,
                VisitSequence: (data.VisitSequence ?? f.VisitSequence) || '',
                VisitYear: (data.VisitYear ?? f.VisitYear) || '',
                VisitQuarter: (data.VisitQuarter ?? f.VisitQuarter) || '',
                VisitMonth: (data.VisitMonth ?? f.VisitMonth) || ''
              }))
            }
          } catch (e) {
            console.debug('Could not fetch layer visit by VisitID or ScheduleID', e)
          }
        }, 250)

        // cleanup listener/timer on unmount or when location changes
        return () => {
          window.removeEventListener('message', onMessage)
          if (fetchTimer) clearTimeout(fetchTimer)
        }
      }

      if (qFarmType) setForm(f => ({ ...f, FarmType: qFarmType }))
      if (qAdvisor) setForm(f => ({ ...f, AdvisorID: qAdvisor }))
      if (qFarm) setForm(f => ({ ...f, FarmID: qFarm }))
      if (qPurpose) setForm(f => ({ ...f, VisitPurpose: qPurpose }))
      if (qAssign) setForm(f => ({ ...f, AssignTo: qAssign }))
    } catch (e) {
      // ignore
    }
  }, [location, fetchWithAuth])

  const handleEdit = async (layerVisitId) => {
    setLoadingVisits(true); setMessage(null)
    try {
      const res = await fetchWithAuth({ url: `/layer-farm/${layerVisitId}`, method: 'get' })
      const d = res.data?.data || res.data || null
      if (d) {
        setForm(d)
        setEditingId(layerVisitId)
        setViewMode(false)
        setShowModal(true)
      } else {
        setMessage({ type: 'error', text: 'Could not load visit for editing' })
      }
    } catch (err) {
      console.error('load visit error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to load visit' })
    } finally { setLoadingVisits(false) }
  }

  const handleView = async (layerVisitId) => {
    setLoadingVisits(true); setMessage(null)
    try {
      const res = await fetchWithAuth({ url: `/layer-farm/${layerVisitId}`, method: 'get' })
      const d = res.data?.data || res.data || null
      if (d) {
        setForm(d)
        setEditingId(layerVisitId)
        setViewMode(true)
        setShowModal(true)
      } else {
        setMessage({ type: 'error', text: 'Could not load visit for viewing' })
      }
    } catch (err) {
      console.error('load visit for view error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to load visit' })
    } finally { setLoadingVisits(false) }
  }

  const handleDelete = async (layerVisitId) => {
    setDeleteTarget(layerVisitId)
    setShowDelete(true)
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetchWithAuth({ url: `/layer-farm/${deleteTarget}`, method: 'delete' })
      setShowDelete(false); setDeleteTarget(null); setMessage({ type: 'success', text: 'Layer visit deleted' })
      await fetchVisits()
    } catch (err) {
      console.error('delete error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to delete' })
    }
  }

  const doExport = async () => {
    setMessage(null)
    try {
      const res = await fetchWithAuth({ url: '/layer-farm/export', method: 'post', data: { Format: 'JSON', IncludeImages: false } })
      const data = res.data?.data || res.data || res
      const w = window.open()
      if (w) w.document.body.innerText = JSON.stringify(data, null, 2)
      setMessage({ type: 'success', text: 'Export ready (JSON opened in new window)' })
    } catch (err) {
      console.error('export failed', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Export failed' })
    }
  }

  const handleComplete = async (layerVisitId) => {
    if (!layerVisitId) return
    setMessage(null)
    setCompletingId(layerVisitId)
    // find schedule id from current list if available
    const current = visits.find(v => (v.LayerVisitID || v.LayerVisitId || v.id) === layerVisitId) || null
    const scheduleId = current?.ScheduleID || current?.scheduleId || null
    try {
      // If we have a parent schedule and it's not already InProgress/Completed, try to start it
      if (scheduleId) {
        try {
          const res = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}`, method: 'get' })
          const sd = res.data?.data || res.data || null
          const visitRaw = sd?.VisitStatus ?? sd?.Status ?? sd?.visitStatus ?? sd?.VisitStatusName ?? sd?.status ?? null
          const visitStatus = visitRaw ? String(visitRaw).trim().toUpperCase() : ''
          const approvalRaw = sd?.ApprovalStatus ?? sd?.Approval ?? sd?.approvalStatus ?? sd?.approvalStatusName ?? sd?.ApprovalStatusName ?? null
          const approval = approvalRaw ? String(approvalRaw).trim().toUpperCase() : ''

          if (visitStatus !== 'INPROGRESS' && visitStatus !== 'IN_PROGRESS' && visitStatus !== 'IN PROGRESS' && visitStatus !== 'COMPLETED' && visitStatus !== 'DONE') {
            // Only attempt to start when approval allows it (Approved) OR attempt anyway and let server validate
            try {
              await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/start`, method: 'post', data: { StartedBy: actorId } })
              try { window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'InProgress' } } })); } catch (e) { /* ignore */ }
              setMessage({ type: 'info', text: 'Parent schedule started (InProgress)' })
            } catch (startErr) {
              // If start fails, warn but continue — the layer visit complete may depend on schedule state
              console.warn('Failed to start parent schedule before completing visit', startErr)
              const startMsg = startErr?.response?.data?.message || startErr?.message || ''
              if (startMsg) setMessage({ type: 'info', text: `Could not start parent schedule: ${startMsg}` })
            }
          }
        } catch (getErr) {
          console.warn('failed to fetch schedule before start', getErr)
        }
      }

      // Now mark the layer visit as completed
      await fetchWithAuth({ url: `/layer-farm/${encodeURIComponent(layerVisitId)}/complete`, method: 'put', data: { IsVisitCompleted: true, UpdatedBy: actorId } })
      setMessage({ type: 'success', text: 'Visit marked as completed' })
      await fetchVisits()
      // After marking the visit completed, attempt to complete the parent schedule if it's in-progress
      try {
        if (scheduleId) {
          const res2 = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}`, method: 'get' })
          const sd2 = res2.data?.data || res2.data || null
          const visitRaw2 = sd2?.VisitStatus ?? sd2?.Status ?? sd2?.visitStatus ?? sd2?.VisitStatusName ?? sd2?.status ?? null
          const visitStatus2 = visitRaw2 ? String(visitRaw2).trim().toUpperCase() : ''
          if (visitStatus2 === 'INPROGRESS' || visitStatus2 === 'IN_PROGRESS' || visitStatus2 === 'IN PROGRESS') {
            try {
              await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/complete`, method: 'post', data: { CompletedBy: actorId, VisitSummary: 'Completed from Layer Visits UI' } })
              try { window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'Completed' } } })); } catch (e) { /* ignore */ }
              setMessage({ type: 'success', text: 'Visit and schedule marked as completed' })
            } catch (completeErr) {
              console.warn('schedule complete attempt failed', completeErr)
              const msg = completeErr?.response?.data?.message || completeErr?.message || 'Schedule complete failed'
              setMessage({ type: 'info', text: `Visit marked completed but could not complete schedule: ${msg}` })
            }
          }
        }
      } catch (schErr) {
        console.warn('could not fetch schedule after visit complete', schErr)
      }
    } catch (err) {
      console.error('complete visit failed', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to complete visit' })
    } finally {
      setCompletingId(null)
    }
  }

  const triggerCompleteConfirm = (layerVisitId) => {
    setCompleteTarget(layerVisitId)
    setShowCompleteConfirm(true)
  }

  const doComplete = async () => {
    try {
      if (!completeTarget) return
      setShowCompleteConfirm(false)
      await handleComplete(completeTarget)
    } finally {
      setCompleteTarget(null)
    }
  }

  const doCleanup = async () => {
    setMessage(null)
    const ok = window.confirm('This will permanently delete incomplete visits older than 30 days. Continue?')
    if (!ok) return
    try {
      const res = await fetchWithAuth({ url: '/layer-farm/cleanup', method: 'post', data: { OlderThanDays: 30, DryRun: false } })
      const data = res.data?.data || res.data || res
      setMessage({ type: 'success', text: `Cleanup result: ${JSON.stringify(data)}` })
      fetchVisits()
    } catch (err) {
      console.error('cleanup failed', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Cleanup failed' })
    }
  }

  const doBulkComplete = async () => {
    setMessage(null)
    const ok = window.confirm('Mark all visible visits as completed?')
    if (!ok) return
    try {
      const ids = visits.map(i => i.LayerVisitID || i.LayerVisitId || i.id).filter(Boolean)
      if (ids.length === 0) return setMessage({ type: 'error', text: 'No visits to update' })
      await fetchWithAuth({ url: '/layer-farm/bulk-update-completion', method: 'post', data: { VisitIDs: ids.join(','), IsVisitCompleted: true, UpdatedBy: actorId } })
      setMessage({ type: 'success', text: 'Visits updated' })
      fetchVisits()
    } catch (err) {
      console.error('bulk complete failed', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Bulk update failed' })
    }
  }

  // Layout helper: supports left-aligned labels (default) and top-aligned labels (`top`)
  const Field = ({ label, full = false, top = false, children, className = '' }) => {
    const outer = full ? 'md:col-span-2' : ''
    if (top) {
      return (
        <div className={outer}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
          <div className={className}>
            {children}
          </div>
        </div>
      )
    }
    return (
      <div className={outer}>
        <div className="flex items-start gap-3">
          <label className="w-40 pt-2 text-sm font-medium text-slate-700 text-left">{label}</label>
          <div className={`flex-1 ${className}`}>
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Layer Farm Visits</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); setMessage(null) }} disabled={saving} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-60">
            {saving ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : <Plus size={16} />} 
            <span>{saving ? 'Saving...' : 'New Visit'}</span>
          </button>
          <button onClick={() => fetchVisits()} className="flex items-center gap-2 px-3 py-2 bg-white border rounded">
            {loadingVisits ? (
              <svg className="animate-spin h-4 w-4 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : <RefreshCw size={14} />} <span>Refresh</span>
          </button>
          <button onClick={doBulkComplete} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded">
            Bulk Complete
          </button>
          <button onClick={doExport} className="flex items-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded">
            Export
          </button>
          <button onClick={doCleanup} className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded">
            Cleanup
          </button>
        </div>
      </div>
      {message && <div className={`mb-4 p-3 rounded ${message.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message.text}</div>}

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="bg-white rounded-lg shadow overflow-auto">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Visit Code</th>
                <th className="px-4 py-3">Farm Name</th>
                <th className="px-4 py-3">Farm Code</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Breed</th>
                <th className="px-4 py-3">Flock</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingVisits ? (
                    <tr><td colSpan={9} className="p-6 text-center"><LoadingSpinner /></td></tr>
              ) : visits.length === 0 ? (
                    <tr><td colSpan={9} className="p-6 text-center text-gray-500">No visits found.</td></tr>
              ) : visits.map((v, idx) => (
                <tr key={v.LayerVisitID || idx} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3">{(() => {
                    const scheduleId = v.ScheduleID || v.scheduleId || null;
                    const sched = scheduleId ? (scheduleMap[String(scheduleId)] || null) : null;
                    const code = sched ? (sched.VisitCode || sched.VisitCodeName || sched.Code || sched.VisitID || sched.VisitId) : null;
                    return code || v.VisitCode || v.LayerVisitID || v.VisitId || '';
                  })()}</td>
                  
                  {(() => {
                    const fid = v.FarmID || v.farmId || v.Farm || null
                    const fm = fid ? farmMap[String(fid)] : null
                    const name = fm ? (fm.FarmName || fm.Name || fm.farmName || fm.FarmCode || '') : (v.FarmName || '')
                    const code = fm ? (fm.FarmCode || fm.Code || fm.code || '') : (v.FarmCode || '')
                    return (
                      <>
                        <td className="px-4 py-3">{name}</td>
                        <td className="px-4 py-3">{code}</td>
                      </>
                    )
                  })()}
                  <td className="px-4 py-3">{v.Location || v.FarmLocation || ''}</td>
                  <td className="px-4 py-3">{v.Breed || ''}</td>
                  <td className="px-4 py-3">{v.FlockSize ?? ''}</td>
                  <td className="px-4 py-3">{v.CreatedAt ? new Date(v.CreatedAt).toLocaleString() : (v.CreatedDate ? new Date(v.CreatedDate).toLocaleString() : '')}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {(() => {
                        const isCompleted = Boolean(
                          v.IsVisitCompleted === true || v.IsVisitCompleted === 1 || String(v.IsVisitCompleted) === '1' || String(v.IsVisitCompleted).toLowerCase() === 'true'
                        )
                        const editClass = `p-2 text-gray-500 rounded-full ${isCompleted ? 'opacity-60 cursor-not-allowed' : 'hover:text-indigo-600 hover:bg-gray-200'}`
                        const deleteClass = `p-2 text-gray-500 rounded-full ${isCompleted ? 'opacity-60 cursor-not-allowed' : 'hover:text-red-600 hover:bg-gray-200'}`
                        return (
                          <>
                            <button onClick={() => !isCompleted && triggerCompleteConfirm(v.LayerVisitID || v.LayerVisitId || v.id)} disabled={isCompleted || completingId === (v.LayerVisitID || v.LayerVisitId || v.id)} className={`p-2 text-green-600 rounded-full ${isCompleted ? 'opacity-60 cursor-not-allowed' : 'hover:text-white hover:bg-green-600'}`} aria-disabled={isCompleted || completingId === (v.LayerVisitID || v.LayerVisitId || v.id)} title="Complete Visit">
                              {completingId === (v.LayerVisitID || v.LayerVisitId || v.id) ? <SmallSpinner /> : <Check size={16} />}
                            </button>
                            <button onClick={() => handleView(v.LayerVisitID || v.LayerVisitId || v.id)} className="p-2 text-gray-500 rounded-full hover:text-sky-600 hover:bg-gray-200" title="View Visit"><Eye size={16} /></button>
                            <button onClick={() => !isCompleted && handleEdit(v.LayerVisitID || v.LayerVisitId || v.id)} disabled={isCompleted} className={editClass} aria-disabled={isCompleted}><Edit size={16} /></button>
                            <button onClick={() => !isCompleted && handleDelete(v.LayerVisitID || v.LayerVisitId || v.id)} disabled={isCompleted} className={deleteClass} aria-disabled={isCompleted}><Trash2 size={16} /></button>
                          </>
                        )
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inline form moved to modal - new visit is created via popup */}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingId(null); setViewMode(false); resetForm() }} title={viewMode ? 'View Layer Farm Visit' : (editingId ? 'Edit Layer Farm Visit' : 'New Layer Farm Visit')}>
        <LayerFarmVisitForm
          form={form}
          onChange={(newData) => setForm(newData)}
          onSave={() => handleSubmit()}
          onCancel={() => { setShowModal(false); setEditingId(null); setViewMode(false); resetForm() }}
          loading={saving}
          readOnly={viewMode}
        />
      </Modal>

      <ConfirmModal open={showDelete} title="Confirm Deletion" onCancel={() => setShowDelete(false)} onConfirm={doDelete}>
        <p className="text-gray-600">Are you sure you want to delete this layer farm visit?</p>
      </ConfirmModal>
      <ConfirmModal open={showCompleteConfirm} title="Confirm Complete Visit" onCancel={() => { setShowCompleteConfirm(false); setCompleteTarget(null) }} onConfirm={doComplete}>
        <p className="text-gray-600">Mark this visit as completed? This action will set the visit status to completed.</p>
      </ConfirmModal>
    </div>
  )
}
