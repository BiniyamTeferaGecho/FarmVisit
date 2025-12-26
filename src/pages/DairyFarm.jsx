import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Modal from '../components/Modal'
import DairyFarmVisitForm from '../components/schedule/DairyFarmVisitForm'
import VisitPrintPreview from '../components/print/VisitPrintPreview'
import ConfirmModal from '../components/ConfirmModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { Plus, RefreshCw, Edit, Trash2, Check, Eye, Printer } from 'lucide-react'

const initialForm = {
  DairyFarmVisitId: '',
  ScheduleID: '',
  Location: '',
  LocationCoordinate: '',
  LactationCows: '',
  DryCows: '',
  Heifers: '',
  Calves: '',
  Buls: '',
  BodyConditionLactetingCow: '',
  BodyConditionDryCow: '',

  FeedingSystem: '',
  CompoundFeedSource: '',
  WhichCompany: '',
  ListOfHomeMixingIngridient: '',
  ListofIngridiant: '',
  QuantityOfCommercialFeed: '',
  QuantityOfHomeMix: '',
  HowManyTimes: '',
  FeedingMechanism: '',
  SampleCollection: false,

  HasForage: false,
  TypeOfForage: '',
  ForageAmount: '',
  WateringSystem: '',
  AmountofWaterProvided: '',
  IfLimitedHowMuch: '',

  ManureScore1: '',
  ManureScore2: '',
  ManureScore3: '',
  ManureScore4: '',

  Ventilation: '',
  LightIntensity: '',
  BeddingType: '',
  SpaceAvailability: '',

  BreedingHistory: '',
  BreedingMethod: '',
  InseminationFrequency: '',
  CalvingInterval: '',
  AgeAtFirstCalving: '',

  AvgMilkProductionPerDayPerCow: '',
  MaxMilkProductionPerDayPerCow: '',
  TotalMilkPerDay: '',
  MilkSupplyTo: '',
  MilkPricePerLitter: '',

  VaccinationType: '',
  VaccinationTime: '',
  RecentMedicationType: '',
  RecentMedicationTime: '',

  CustomerFeedbackorCompliants: '',
  ComplainSampleTaken: false,
  BatchNumberorProductionDate: '',

  AnalyzeRequested: '',
  IssuesComplaints: '',
  AnyRelatedEvidenceImage: '',
  FarmAdvisorConclusion: '',
  RecommendationorAdvice: '',

  IsVisitCompleted: false,
}

export default function DairyFarm() {
  const { user, fetchWithAuth } = useAuth()
  const actorId = user && (user.EmployeeID || user.employeeId || user.UserID || user.userId || user.userId || user.id || user.ID)

  const [list, setList] = useState([])
  // scheduleMap: cache schedule rows (by ScheduleID) so we can show VisitCode, Farm and Advisor names
  const [scheduleMap, setScheduleMap] = useState({});
  const [savedLocationMap, setSavedLocationMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dairy.savedLocationMap') || '{}') } catch (e) { return {} }
  });
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [viewMode, setViewMode] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [printData, setPrintData] = useState(null)

  const buildEntriesFromForm = (f) => {
    if (!f) return []
    const keys = ['LactationCows','AvgMilkProductionPerDayPerCow','TotalMilkPerDay','FeedingSystem','RecommendationorAdvice']
    return keys.map(k => ({ [k]: f[k] ?? f[k.toLowerCase()] ?? '' }))
  }

  const handlePrint = (data) => {
    const payload = data || form || {}
    setPrintData({ ...payload })
    setShowPrintPreview(true)
  }

  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [completeTarget, setCompleteTarget] = useState(null)
  

  useEffect(() => { fetchList() }, [])

  // If the page was opened with a visitId in the querystring (from schedules Fill action),
  // fetch the authoritative form-data and open the modal so user can fill or edit the visit.
  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const visitId = params.get('visitId') || (location.state && location.state.visitId)
    const farmType = (params.get('farmType') || (location.state && location.state.farmType) || '').toString().toUpperCase()
    console.debug('DairyFarm prefill check', { visitId, farmType, search: location.search, state: location.state })
    if (!visitId) return
    // Only handle dairy or unspecified farmType here 
    if (farmType && farmType !== 'DAIRY') return

    let mounted = true
    ;(async () => {
      setMessage(null)
      try {
        const farmTypeQuery = farmType ? `?farmType=${encodeURIComponent(farmType)}` : ''
        const res = await fetchWithAuth({ url: `/farm-visit-schedule/form-data/${encodeURIComponent(visitId)}${farmTypeQuery}`, method: 'get' })
        const d = res.data?.data || res.data || null
        if (!mounted) return
        if (d) {
          setForm({
            ScheduleID: d.ScheduleID || '',
            Location: d.Location || d.FarmLocation || '',
            LocationCoordinate: d.LocationCoordinate || d.Location || '',
            LactationCows: d.LactationCows ?? d.LactationCows ?? '',
            DryCows: d.DryCows ?? '',
            Heifers: d.Heifers ?? '',
            Calves: d.Calves ?? '',
            Buls: d.Buls ?? '',
            BodyConditionLactetingCow: d.BodyConditionLactetingCow ?? d.BodyCondition ?? '',
            BodyConditionDryCow: d.BodyConditionDryCow ?? '',
            FeedingPerCow: d.FeedingPerCow || '',
            HowTheyGiveForCows: d.HowTheyGiveForCows || d.HowTheyGiveForCos || '',
            UsesConcentrate: !!d.UsesConcentrate,
            WhichCompany: d.WhichCompany || '',
            IsLocalMix: !!d.IsLocalMix,
            ListofIngridiant: d.ListofIngridiant || d.ListOfHomeMixingIngridient || '',
            ListOfHomeMixingIngridient: d.ListOfHomeMixingIngridient || d.ListofIngridiant || '',
            SampleCollection: !!d.SampleCollection,
            HasForage: !!d.HasForage,
            TypeOfForage: d.TypeOfForage || '',
            ForageAmount: d.ForageAmount ?? '',
            ConcentrateFeedSample: !!d.ConcentrateFeedSample,
            AmountofWaterProvided: d.AmountofWaterProvided || '',
            FeedingSystem: d.FeedingSystem || '',
            CompoundFeedSource: d.CompoundFeedSource || '',
            QuantityOfCommercialFeed: d.QuantityOfCommercialFeed ?? '',
            QuantityOfHomeMix: d.QuantityOfHomeMix ?? '',
            FeedingMechanism: d.FeedingMechanism || '',
            ManureScore1: d.ManureScore1 ?? '',
            ManureScore2: d.ManureScore2 ?? '',
            ManureScore3: d.ManureScore3 ?? '',
            ManureScore4: d.ManureScore4 ?? '',
            Ventilation: d.Ventilation || '',
            LightIntensity: d.LightIntensity || '',
            BeddingType: d.BeddingType || '',
            SpaceAvailability: d.SpaceAvailability || '',
            VaccinationHistory: d.VaccinationHistory || '',
            VaccinationType: d.VaccinationType || '',
            VaccinationTime: d.VaccinationTime || '',
            BreedingHistory: d.BreedingHistory || '',
            BreedingMethod: d.BreedingMethod || '',
            AreTheyUsingNaturalorAI: d.AreTheyUsingNaturalorAI || '',
            InseminationFrequency: d.InseminationFrequency || '',
            CalvingInterval: d.CalvingInterval ?? '',
            AgeAtFirstCalving: d.AgeAtFirstCalving ?? '',
            HowManyTimes: d.HowManyTimes || '',
            TypeofFeedwithComplain: d.TypeofFeedwithComplain || '',
            SampleTaken: !!d.SampleTaken,
            BatchNumber: d.BatchNumber || '',
                        BatchNumberorProductionDate: d.BatchNumberorProductionDate || d.BatchNumber || '',
            AvgMilkProductionPerDayPerCow: d.AvgMilkProductionPerDayPerCow ?? d.AvgMilkProductionPerDay ?? '',
            MaxMilkProductionPerDayPerCow: d.MaxMilkProductionPerDayPerCow ?? d.MaxMilkProductionPerCow ?? '',
            TotalMilkPerDay: d.TotalMilkPerDay ?? '',
            MilkSupplyTo: d.MilkSupplyTo || '',
            MilkPricePerLitter: d.MilkPricePerLitter ?? '',
            Medication: !!d.Medication,
            WhatTypeofMedication: d.WhatTypeofMedication || '',
            IssuesComplaints: d.IssuesComplaints || '',
            AnalyzeRequested: d.AnalyzeRequested || '',
            RecommendationAdvice: d.RecommendationAdvice || '',
            FarmAdvisorConclusion: d.FarmAdvisorConclusion || '',
            CustomerFeedbackorCompliants: d.CustomerFeedbackorCompliants || d.FeedBackOnAKF || '',
            ComplainSampleTaken: !!d.ComplainSampleTaken || !!d.SampleTaken,
            BatchNumberorProductionDate: d.BatchNumberorProductionDate || d.BatchNumber || '',
            AnyRelatedEvidenceImage: d.AnyRelatedEvidenceImage || '',
            IsVisitCompleted: !!d.IsVisitCompleted,
          })
          // prefer explicit id from returned data when available
          const eid = d.DairyFarmVisitId || d.DairyFarmVisitID || d.id || null
          setEditingId(eid)
        } else {
          // no existing data for this visit, open create with VisitId prefilled
          setForm(f => ({ ...initialForm, VisitId: visitId }))
          setEditingId(null)
        }
        setShowForm(true)
      } catch (err) {
        console.error('prefill dairy from visitId failed', err)
        // if fetch fails, still open create modal with VisitId
        setForm(f => ({ ...initialForm, VisitId: visitId }))
        setEditingId(null)
        setShowForm(true)
      }
    })()
    return () => { mounted = false }
  }, [location.search, location.state])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const doValidate = async () => {
    // Local validation (mirror server rules where possible)
    try {
      const messages = []
      const lact = form.LactationCows ? Number(form.LactationCows) : 0
      const avg = form.AvgMilkProductionPerDayPerCow ? Number(form.AvgMilkProductionPerDayPerCow) : (form.AvgMilkProductionPerDay ? Number(form.AvgMilkProductionPerDay) : 0)
      const total = form.TotalMilkPerDay ? Number(form.TotalMilkPerDay) : 0
      // prefer lactating body condition, then fallback to legacy BodyCondition
      const bodyCond = form.BodyConditionLactetingCow != null && form.BodyConditionLactetingCow !== '' ? Number(form.BodyConditionLactetingCow) : (form.BodyCondition ? Number(form.BodyCondition) : null)

      if (!lact) messages.push('LactationCows should be provided and > 0')
      if (bodyCond == null) messages.push('Body condition (lactating) is recommended')
      // Business rule from DB: TotalMilkPerDay should not exceed lactation * avg * 1.5
      if (lact > 0 && avg > 0 && total > 0 && total > (lact * avg * 1.5)) {
        messages.push('Total milk exceeds reasonable maximum based on lactation cows and average production')
      }

      if (messages.length > 0) return { valid: false, messages }
      return { valid: true }
    } catch (err) {
      console.debug('local validation failed', err)
      return { valid: true }
    }
  }

  const handleSubmit = async (e) => {
    e && e.preventDefault()
    setMessage(null)
    try {
      const v = await doValidate()
      if (!v.valid) return setMessage({ type: 'error', text: v.messages.join('; ') })

      const payload = {
        ScheduleID: form.ScheduleID || null,
        Location: form.Location || null,
        LactationCows: form.LactationCows ? Number(form.LactationCows) : null,
        DryCows: form.DryCows ? Number(form.DryCows) : null,
        Heifers: form.Heifers ? Number(form.Heifers) : null,
        Calves: form.Calves ? Number(form.Calves) : null,
        Buls: form.Buls ? Number(form.Buls) : null,

        BodyConditionLactetingCow: form.BodyConditionLactetingCow ? Number(form.BodyConditionLactetingCow) : null,
        BodyConditionDryCow: form.BodyConditionDryCow ? Number(form.BodyConditionDryCow) : null,

        FeedingSystem: form.FeedingSystem || null,
        CompoundFeedSource: form.CompoundFeedSource || null,
        WhichCompany: form.WhichCompany || null,
        ListOfHomeMixingIngridient: form.ListOfHomeMixingIngridient || form.ListofIngridiant || null,
        QuantityOfCommercialFeed: form.QuantityOfCommercialFeed ? Number(form.QuantityOfCommercialFeed) : null,
        QuantityOfHomeMix: form.QuantityOfHomeMix ? Number(form.QuantityOfHomeMix) : null,
        HowManyTimes: form.HowManyTimes || null,
        FeedingMechanism: form.FeedingMechanism || null,
        SampleCollection: form.SampleCollection ? 1 : 0,
        HasForage: form.HasForage ? 1 : 0,
        TypeOfForage: form.TypeOfForage || null,
        ForageAmount: form.ForageAmount ? Number(form.ForageAmount) : null,

        WateringSystem: form.WateringSystem || null,
        AmountofWaterProvided: form.AmountofWaterProvided || null,
        IfLimitedHowMuch: form.IfLimitedHowMuch || null,

        ManureScore1: form.ManureScore1 ? Number(form.ManureScore1) : null,
        ManureScore2: form.ManureScore2 ? Number(form.ManureScore2) : null,
        ManureScore3: form.ManureScore3 ? Number(form.ManureScore3) : null,
        ManureScore4: form.ManureScore4 ? Number(form.ManureScore4) : null,

        Ventilation: form.Ventilation || null,
        LightIntensity: form.LightIntensity || null,
        BeddingType: form.BeddingType || null,
        SpaceAvailability: form.SpaceAvailability || null,

        BreedingHistory: form.BreedingHistory || null,
        BreedingMethod: form.BreedingMethod || null,
        InseminationFrequency: form.InseminationFrequency || null,
        CalvingInterval: form.CalvingInterval ? Number(form.CalvingInterval) : null,
        AgeAtFirstCalving: form.AgeAtFirstCalving ? Number(form.AgeAtFirstCalving) : null,

        AvgMilkProductionPerDayPerCow: form.AvgMilkProductionPerDayPerCow ? Number(form.AvgMilkProductionPerDayPerCow) : null,
        MaxMilkProductionPerDayPerCow: form.MaxMilkProductionPerDayPerCow ? Number(form.MaxMilkProductionPerDayPerCow) : null,
        TotalMilkPerDay: form.TotalMilkPerDay ? Number(form.TotalMilkPerDay) : null,
        MilkSupplyTo: form.MilkSupplyTo || null,
        MilkPricePerLitter: form.MilkPricePerLitter ? Number(form.MilkPricePerLitter) : null,

        VaccinationType: form.VaccinationType || null,
        VaccinationTime: form.VaccinationTime || null,
        RecentMedicationType: form.RecentMedicationType || null,
        RecentMedicationTime: form.RecentMedicationTime || null,

        CustomerFeedbackorCompliants: form.CustomerFeedbackorCompliants || form.FeedBackOnAKF || null,
        ComplainSampleTaken: form.ComplainSampleTaken ? 1 : 0,
        BatchNumberorProductionDate: form.BatchNumberorProductionDate || form.BatchNumber || null,

        AnalyzeRequested: form.AnalyzeRequested || null,
        IssuesComplaints: form.IssuesComplaints || null,
        AnyRelatedEvidenceImage: form.AnyRelatedEvidenceImage || null,

        FarmAdvisorConclusion: form.FarmAdvisorConclusion || null,
        RecommendationorAdvice: form.RecommendationorAdvice || form.RecommendationAdvice || null,

        IsVisitCompleted: form.IsVisitCompleted ? 1 : 0,
        LocationCoordinate: form.LocationCoordinate || form.Location || null,
        // prefer actorId (EmployeeID) when available for CreatedBy/UpdatedBy; backend accepts NULL
        CreatedBy: actorId || user?.UserID || user?.id || null,
        UpdatedBy: actorId || user?.UserID || user?.id || null,
      }

      let saveRes
      if (editingId) {
        // update or mark complete
        if (payload.IsVisitCompleted) {
          // Use the complete endpoint to ensure DB workflow runs server-side
          await fetchWithAuth({ url: `/dairy-farm/${editingId}/complete`, method: 'put', data: { IsVisitCompleted: true, UpdatedBy: actorId } })
          setMessage({ type: 'success', text: 'Dairy visit marked as completed' })
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
                  await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/complete`, method: 'post', data: { CompletedBy: actorId, VisitSummary: 'Completed from Dairy Visits UI' } })
                  try { window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'Completed' } } })); } catch (e) { /* ignore */ }
                  // Update local scheduleMap so UI reflects Completed status immediately
                  try { setScheduleMap(prev => ({ ...(prev || {}), [String(scheduleId)]: { ...(prev && prev[String(scheduleId)] ? prev[String(scheduleId)] : {}), VisitStatus: 'Completed' } })); } catch (e) { /* ignore */ }
                  setMessage({ type: 'success', text: 'Dairy visit and schedule marked as completed' })
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
          saveRes = await fetchWithAuth({ url: `/dairy-farm/${editingId}`, method: 'put', data: payload })
          setMessage({ type: 'success', text: 'Dairy visit updated' })
          // persist any coordinate the user provided locally
          try {
            const coord = form.LocationCoordinate || form.Location || ''
            setSavedLocationMap(m => {
              const nm = { ...(m || {}), [String(editingId)]: coord }
              try { localStorage.setItem('dairy.savedLocationMap', JSON.stringify(nm)) } catch (e) { }
              return nm
            })
          } catch (e) { /* ignore */ }
        }
      } else {
        const created = saveRes?.data?.data || saveRes?.data || null
        if (created) {
          const newId = created.DairyFarmVisitId || created.DairyFarmVisitID || created.id || null
          if (newId) setEditingId(newId)
          // remember the coordinate the user entered so UI can prefer it over region name
            if (newId && form) {
              const coord = form.LocationCoordinate || form.Location || ''
              setSavedLocationMap(m => {
                const nm = { ...(m || {}), [String(newId)]: coord }
                try { localStorage.setItem('dairy.savedLocationMap', JSON.stringify(nm)) } catch (e) { /* ignore */ }
                return nm
              })
            }
            // If the created visit was already marked completed in the form, call the complete endpoint
            try {
              const createdId = created.DairyFarmVisitId || created.DairyFarmVisitID || created.id || null
              if (createdId && (form.IsVisitCompleted || payload.IsVisitCompleted)) {
                await fetchWithAuth({ url: `/dairy-farm/${createdId}/complete`, method: 'put', data: { IsVisitCompleted: true, UpdatedBy: actorId } })
                // attempt to complete schedule as LayerFarm does
                try {
                  const scheduleId = payload.ScheduleID || created.ScheduleID || created.ScheduleId || null
                  if (scheduleId) {
                    const sdRes = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}`, method: 'get' })
                    const sd = sdRes.data?.data || sdRes.data || null
                    const visitRaw = sd?.VisitStatus ?? sd?.Status ?? sd?.visitStatus ?? sd?.VisitStatusName ?? sd?.status ?? null
                    const visitStatus = visitRaw ? String(visitRaw).trim().toUpperCase() : ''
                    if (visitStatus === 'INPROGRESS' || visitStatus === 'IN_PROGRESS' || visitStatus === 'IN PROGRESS') {
                      try {
                        await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/complete`, method: 'post', data: { CompletedBy: actorId, VisitSummary: 'Completed from Dairy Visits UI' } })
                        try { window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'Completed' } } })); } catch (e) { /* ignore */ }
                        try { setScheduleMap(prev => ({ ...(prev || {}), [String(scheduleId)]: { ...(prev && prev[String(scheduleId)] ? prev[String(scheduleId)] : {}), VisitStatus: 'Completed' } })); } catch (e) { /* ignore */ }
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
        setMessage({ type: 'success', text: 'Dairy visit created' })
      }
      // After saving the visit, attempt to mark the related schedule as InProgress by calling
      // the Start endpoint. This will only succeed if the schedule exists and is Approved+Scheduled;
      // failures are non-fatal and will be surfaced to the user as an info message.
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
              try {
                await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/start`, method: 'post', data: {} })
                try { const now = new Date().toISOString(); window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'InProgress', ActualVisitDate: now } } })); } catch (e) { /* ignore */ }
                setMessage({ type: 'success', text: (editingId ? 'Dairy visit updated' : 'Dairy visit created') + ' — schedule started' })
              } catch (startErr) {
                const msg = startErr?.response?.data?.message || startErr?.message || 'Schedule start failed'
                setMessage({ type: 'info', text: `Saved visit but could not start schedule: ${msg}` })
              }
            } else {
              setMessage({ type: 'info', text: (editingId ? 'Dairy visit updated' : 'Dairy visit created') })
            }
          } catch (getErr) {
            console.warn('failed to fetch schedule before start', getErr)
            const errMsg = getErr?.response?.data?.message || getErr?.message || 'Failed to fetch schedule';
            setMessage({ type: 'info', text: `Saved visit but could not verify schedule: ${errMsg}` })
          }
        }
      } catch (err) {
        // non-blocking: log and show an informational message if start failed
        console.warn('start schedule request failed', err)
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to start schedule';
        setMessage({ type: 'info', text: `Saved visit but could not start schedule: ${errMsg}` })
      }

      // removed schedule auto-complete behavior: do not attempt to change schedule state here

      setShowForm(false); setEditingId(null); setForm(initialForm); fetchList()
    } catch (err) {
      console.error('submit dairy error', err)
      // If DB raised validation mapped to 400, show that message
      if (err && err.response && err.response.status === 400) {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Validation failed' })
      } else {
        setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Save failed' })
      }
    }
  }

  const handleView = async (id) => {
    if (!id) return
    setLoading(true); setMessage(null)
    try {
      const res = await fetchWithAuth({ url: `/dairy-farm/${id}`, method: 'get' })
      const d = res?.data?.data || res?.data || null
      if (d) {
        setForm(d)
        setEditingId(id)
        setViewMode(true)
        setShowForm(true)
      } else {
        setMessage({ type: 'error', text: 'Could not load visit for viewing' })
      }
    } catch (err) {
      console.error('openView error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to load visit' })
    } finally { setLoading(false) }
  }

  const confirmDelete = (it) => { setDeleteTarget(it); setShowDelete(true) }
  const doDelete = async () => {
    if (!deleteTarget) return
    try {
      const id = deleteTarget.DairyFarmVisitId || deleteTarget.DairyFarmVisitID || deleteTarget.DairyFarmVisitId || deleteTarget.id
      if (!id) return setMessage({ type: 'error', text: 'Missing id for delete' })
      // Backend implements DELETE /dairy-farm/:id
      await fetchWithAuth({ url: `/dairy-farm/${id}`, method: 'delete' })
      setShowDelete(false); setDeleteTarget(null); fetchList(); setMessage({ type: 'success', text: 'Deleted' })
    } catch (err) { console.error('delete dairy error', err); setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Delete failed' }) }
  }

  const handleComplete = async (id) => {
    if (!id) return
    try {
      setCompletingId(id)
      setMessage(null)
      let completedScheduleId = null
      // Call backend PUT /dairy-farm/:id/complete with actor info
      await fetchWithAuth({ url: `/dairy-farm/${encodeURIComponent(id)}/complete`, method: 'put', data: { IsVisitCompleted: true, UpdatedBy: actorId } })
      // optimistic update in list
      setList(prev => prev.map(it => {
        const rowId = it.DairyFarmVisitId || it.DairyFarmVisitID || it.id
        if (!rowId) return it
        if (String(rowId) === String(id)) return { ...it, IsVisitCompleted: true }
        return it
      }))
      try { window.dispatchEvent(new CustomEvent('dairyvisit:updated', { detail: { action: 'complete', id } })) } catch (e) { /* ignore */ }
      setMessage({ type: 'success', text: 'Visit marked completed' })
      // attempt to complete parent schedule if present (best-effort, but check status first)
      try {
        const row = list.find(it => String((it.DairyFarmVisitId || it.DairyFarmVisitID || it.id)) === String(id))
        const scheduleId = row && (row.ScheduleID || row.scheduleId || null)
        completedScheduleId = scheduleId
        if (scheduleId) {
          const sdRes = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}`, method: 'get' })
          const sd = sdRes.data?.data || sdRes.data || null
          const visitRaw = sd?.VisitStatus ?? sd?.Status ?? sd?.visitStatus ?? sd?.VisitStatusName ?? sd?.status ?? null
          const visitStatus = visitRaw ? String(visitRaw).trim().toUpperCase() : ''
          if (visitStatus === 'INPROGRESS' || visitStatus === 'IN_PROGRESS' || visitStatus === 'IN PROGRESS') {
            try {
              await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(scheduleId)}/complete`, method: 'post', data: { CompletedBy: actorId, VisitSummary: 'Completed from Dairy Visits UI' } })
              try { window.dispatchEvent(new CustomEvent('farmvisit:updated', { detail: { action: 'update', id: scheduleId, data: { VisitStatus: 'Completed' } } })) } catch (e) { /* ignore */ }
              try { setScheduleMap(prev => ({ ...(prev || {}), [String(scheduleId)]: { ...(prev && prev[String(scheduleId)] ? prev[String(scheduleId)] : {}), VisitStatus: 'Completed' } })); } catch (e) { /* ignore */ }
              setMessage({ type: 'success', text: 'Visit and schedule marked as completed' })
            } catch (schErr) {
              const msg = schErr?.response?.data?.message || schErr?.message || 'Schedule complete failed'
              setMessage({ type: 'info', text: `Visit marked completed but could not complete schedule: ${msg}` })
            }
          }
        }
      } catch (e) {
        // non-fatal
      }
      // refresh list to load authoritative state and then fetch the schedule detail
      // so the UI can show the updated VisitStatus
      // (await so we update scheduleMap after the list refresh)
      await fetchList()
      try {
        if (completedScheduleId) {
          try {
            const r = await fetchWithAuth({ url: `/farm-visit-schedule/${encodeURIComponent(completedScheduleId)}`, method: 'get' })
            const sd = r?.data?.data || r?.data || null
            if (sd) setScheduleMap(prev => ({ ...(prev || {}), [String(completedScheduleId)]: sd }))
          } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('complete dairy error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to complete visit' })
    } finally {
      setCompletingId(null)
    }
  }

  const doExport = async () => {
    setMessage(null)
    try {
      const res = await fetchWithAuth({ url: '/dairy-farm/export', method: 'post', data: { Format: 'JSON', IncludeImages: false } })
      const data = res.data?.data || res.data || res
      // show JSON in new window
      const w = window.open()
      if (w) w.document.body.innerText = JSON.stringify(data, null, 2)
      setMessage({ type: 'success', text: 'Export ready (JSON opened in new window)' })
    } catch (err) {
      console.error('export failed', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Export failed' })
    }
  }

  const doCleanup = async () => {
    setMessage(null)
    const ok = window.confirm('This will permanently delete incomplete visits older than 30 days. Continue?')
    if (!ok) return
    try {
      const res = await fetchWithAuth({ url: '/dairy-farm/cleanup', method: 'post', data: { OlderThanDays: 30, DryRun: false } })
      const data = res.data?.data || res.data || res
      setMessage({ type: 'success', text: `Cleanup result: ${JSON.stringify(data)}` })
      fetchList()
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
      const ids = list.map(i => i.DairyFarmVisitId || i.DairyFarmVisitID || i.id).filter(Boolean)
      if (ids.length === 0) return setMessage({ type: 'error', text: 'No visits to update' })
      const res = await fetchWithAuth({ url: '/dairy-farm/bulk-complete', method: 'post', data: { DairyFarmVisitIds: ids, IsVisitCompleted: true, UpdatedBy: actorId } })
      setMessage({ type: 'success', text: 'Visits updated' })
      fetchList()
    } catch (err) {
      console.error('bulk complete failed', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Bulk update failed' })
    }
  }

  const SmallSpinner = () => (
    <svg className="animate-spin h-4 w-4 text-teal-500 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>
  )

  const triggerCompleteConfirm = (id) => {
    setCompleteTarget(id)
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

  // Fetch list of dairy visits and build a small schedule map for display fallbacks
  async function fetchList() {
    setLoading(true); setMessage(null)
    try {
      const res = await fetchWithAuth({ url: '/dairy-farm', method: 'get' })
      const data = res.data?.data || res.data || []
      const rows = Array.isArray(data) ? data : (data.rows || [])
      setList(rows)
      // build scheduleMap minimal: map by ScheduleID to name/code if present
      const map = {}
      rows.forEach(r => {
        const sid = r.ScheduleID || r.scheduleId || null
        if (sid && !map[String(sid)]) {
          map[String(sid)] = { VisitCode: r.VisitCode || r.VisitCodeName || null, FarmName: r.FarmName || r.FarmCode || null, AdvisorName: r.AdvisorName || null }
        }
      })
      setScheduleMap(map)
    } catch (err) {
      console.error('fetchList dairy error', err)
      setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to load visits' })
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(initialForm); setEditingId(null); setShowForm(true)
  }

  async function openEdit(id) {
    if (!id) return
    setLoading(true); setMessage(null)
    try {
      const res = await fetchWithAuth({ url: `/dairy-farm/${encodeURIComponent(id)}`, method: 'get' })
      const d = res.data?.data || res.data || null
      if (d) {
        setForm({
          ScheduleID: d.ScheduleID || d.scheduleId || d.ScheduleId || '',
          Location: d.Location || d.FarmLocation || '',
          LocationCoordinate: d.LocationCoordinate || d.Location || '',
          LactationCows: d.LactationCows ?? '',
          DryCows: d.DryCows ?? '',
          Heifers: d.Heifers ?? '',
          Calves: d.Calves ?? '',
          Buls: d.Buls ?? '',
          BodyConditionLactetingCow: d.BodyConditionLactetingCow ?? d.BodyCondition ?? '',
          BodyConditionDryCow: d.BodyConditionDryCow ?? '',
          FeedingPerCow: d.FeedingPerCow || '',
          HowTheyGiveForCows: d.HowTheyGiveForCows || '',
          UsesConcentrate: !!d.UsesConcentrate,
          WhichCompany: d.WhichCompany || '',
          IsLocalMix: !!d.IsLocalMix,
          ListofIngridiant: d.ListofIngridiant || '',
          SampleCollection: !!d.SampleCollection,
          HasForage: !!d.HasForage,
          TypeOfForage: d.TypeOfForage || '',
          ForageAmount: d.ForageAmount ?? '',
          ConcentrateFeedSample: !!d.ConcentrateFeedSample,
          AmountofWaterProvided: d.AmountofWaterProvided || '',
          FeedingSystem: d.FeedingSystem || '',
          CompoundFeedSource: d.CompoundFeedSource || '',
          QuantityOfCommercialFeed: d.QuantityOfCommercialFeed ?? '',
          QuantityOfHomeMix: d.QuantityOfHomeMix ?? '',
          FeedingMechanism: d.FeedingMechanism || '',
          ManureScore1: d.ManureScore1 ?? '',
          ManureScore2: d.ManureScore2 ?? '',
          ManureScore3: d.ManureScore3 ?? '',
          ManureScore4: d.ManureScore4 ?? '',
          Ventilation: d.Ventilation || '',
          LightIntensity: d.LightIntensity || '',
          BeddingType: d.BeddingType || '',
          SpaceAvailability: d.SpaceAvailability || '',
          VaccinationHistory: d.VaccinationHistory || '',
          VaccinationType: d.VaccinationType || '',
          VaccinationTime: d.VaccinationTime || '',
          BreedingHistory: d.BreedingHistory || '',
          BreedingMethod: d.BreedingMethod || '',
          AreTheyUsingNaturalorAI: d.AreTheyUsingNaturalorAI || '',
          InseminationFrequency: d.InseminationFrequency || '',
          CalvingInterval: d.CalvingInterval ?? '',
          AgeAtFirstCalving: d.AgeAtFirstCalving ?? '',
          HowManyTimes: d.HowManyTimes || '',
          TypeofFeedwithComplain: d.TypeofFeedwithComplain || '',
          SampleTaken: !!d.SampleTaken,
          BatchNumber: d.BatchNumber || '',
          AvgMilkProductionPerDayPerCow: d.AvgMilkProductionPerDayPerCow ?? d.AvgMilkProductionPerDay ?? '',
          MaxMilkProductionPerDayPerCow: d.MaxMilkProductionPerDayPerCow ?? d.MaxMilkProductionPerCow ?? '',
          TotalMilkPerDay: d.TotalMilkPerDay ?? '',
          MilkSupplyTo: d.MilkSupplyTo || '',
          MilkPricePerLitter: d.MilkPricePerLitter ?? '',
          Medication: !!d.Medication,
          WhatTypeofMedication: d.WhatTypeofMedication || '',
          IssuesComplaints: d.IssuesComplaints || '',
          AnalyzeRequested: d.AnalyzeRequested || '',
          RecommendationAdvice: d.RecommendationAdvice || '',
          FarmAdvisorConclusion: d.FarmAdvisorConclusion || '',
          CustomerFeedbackorCompliants: d.CustomerFeedbackorCompliants || d.FeedBackOnAKF || '',
          ComplainSampleTaken: !!d.ComplainSampleTaken || !!d.SampleTaken,
          BatchNumberorProductionDate: d.BatchNumberorProductionDate || d.BatchNumber || '',
          AnyRelatedEvidenceImage: d.AnyRelatedEvidenceImage || '',
          IsVisitCompleted: !!d.IsVisitCompleted,
        })
        setEditingId(id);
        // prefer locally saved coordinate if server didn't provide one
        setForm(f => ({ ...f, LocationCoordinate: f.LocationCoordinate || savedLocationMap[String(id)] || f.Location || '' }))
        setShowForm(true)
      }
    } catch (err) { console.error('openEdit error', err); setMessage({ type: 'error', text: 'Failed to load dairy visit' }) } finally { setLoading(false) }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dairy Farm Visits</h2>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded">
            <Plus size={16} /> New Visit
          </button>
          <button onClick={fetchList} className="flex items-center gap-2 px-3 py-2 bg-white border rounded">
            <RefreshCw size={14} /> Refresh
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

      <div className="bg-white rounded-lg shadow overflow-auto">
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Visit Code</th>
              <th className="px-4 py-3">Farm</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Advisor</th>
              <th className="px-4 py-3">Avg Milk (L/day)</th>
              <th className="px-4 py-3">Total Milk (L/day)</th>
              <th className="px-4 py-3">Visit Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-6 text-center"><LoadingSpinner /></td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-gray-500">No dairy visits found.</td></tr>
            ) : list.map((it, idx) => (
              <tr key={it.DairyFarmVisitId || idx} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{idx+1}</td>
                <td className="px-4 py-3">{(() => {
                  const scheduleId = it.ScheduleID || it.scheduleId || null
                  const sched = scheduleId ? scheduleMap[String(scheduleId)] || null : null
                  const code = sched?.VisitCode || sched?.VisitCodeName || sched?.Code || it.VisitCode || null
                  return code || it.DairyFarmVisitId || ''
                })()}</td>
                <td className="px-4 py-3">{(() => {
                  const scheduleId = it.ScheduleID || it.scheduleId || null
                  const sched = scheduleId ? scheduleMap[String(scheduleId)] || null : null
                  return sched?.FarmName || sched?.FarmCode || it.FarmName || it.FarmCode || (it.Farm && (it.Farm.FarmCode || it.Farm.FarmName || it.Farm.Name)) || ''
                })()}</td>
                <td className="px-4 py-3">{(() => {
                  // Prefer explicit city or zone fields when available, then fall back to saved coordinate or location
                  return it.CityTown || it.City || it.Zone || it.Wereda || savedLocationMap[String(it.DairyFarmVisitId || it.DairyFarmVisitID || it.id)] || it.Location || it.FarmLocation || ''
                })()}</td>
                <td className="px-4 py-3">{(() => {
                  const scheduleId = it.ScheduleID || it.scheduleId || null
                  const sched = scheduleId ? scheduleMap[String(scheduleId)] || null : null
                  return sched?.AdvisorName || it.AdvisorName || (sched && sched.Advisor && (sched.Advisor.Name || sched.AdvisorName)) || (it.Advisor && (it.Advisor.Name || it.AdvisorName)) || it.AdvisorID || it.AdvisorId || it.AssignTo || it.AssignedTo || it.DoctorName || it.Doctor || ''
                })()}</td>
                <td className="px-4 py-3">{it.AvgMilkProductionPerDayPerCow ?? it.AvgMilkProductionPerDay ?? ''}</td>
                <td className="px-4 py-3">{it.TotalMilkPerDay ?? ''}</td>
                <td className="px-4 py-3">{(() => {
                  const scheduleId = it.ScheduleID || it.scheduleId || null
                  const sched = scheduleId ? scheduleMap[String(scheduleId)] || null : null
                  const raw = sched?.VisitStatus || sched?.VisitStatusName || it.VisitStatus || it.VisitStatusName || (it.IsVisitCompleted ? 'COMPLETED' : null)
                  if (!raw) return ''
                  const v = String(raw).trim().toUpperCase()
                  let label = ''
                  let cls = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium '
                  if (v === 'INPROGRESS' || v === 'IN_PROGRESS' || v === 'IN PROGRESS') {
                    label = 'In Progress'
                    cls += 'bg-amber-100 text-amber-800'
                  } else if (v === 'SCHEDULED') {
                    label = 'Scheduled'
                    cls += 'bg-blue-100 text-blue-800'
                  } else if (v === 'COMPLETED' || v === 'COMPLETE') {
                    label = 'Completed'
                    cls += 'bg-green-100 text-green-800'
                  } else {
                    // fallback: title-case the raw string
                    label = raw.toString().split(/_|\s+/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ')
                    cls += 'bg-gray-100 text-gray-700'
                  }
                  return <span className={cls}>{label}</span>
                })()}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {(() => {
                      // Treat several representations of a completed flag as truthy
                      const isCompleted = Boolean(
                        it.IsVisitCompleted === true || it.IsVisitCompleted === 1 || String(it.IsVisitCompleted) === '1' || String(it.IsVisitCompleted).toLowerCase() === 'true'
                      );
                      const deleteClass = `p-2 text-red-600 rounded-full ${isCompleted ? 'opacity-60 cursor-not-allowed' : 'hover:text-white hover:bg-red-600'}`;
                      // Make edit action clearly visible
                      const editClass = `p-2 text-indigo-600 rounded-full ${isCompleted ? 'opacity-60 cursor-not-allowed' : 'hover:text-white hover:bg-indigo-600'}`;
                      return (
                        <> 
                          <button onClick={() => !isCompleted && triggerCompleteConfirm(it.DairyFarmVisitId || it.DairyFarmVisitID || it.id)} disabled={isCompleted || completingId === (it.DairyFarmVisitId || it.DairyFarmVisitID || it.id)} className={`p-2 text-green-600 rounded-full ${isCompleted ? 'opacity-60 cursor-not-allowed' : 'hover:text-white hover:bg-green-600'}`} aria-disabled={isCompleted} title="Complete Visit">
                            {completingId === (it.DairyFarmVisitId || it.DairyFarmVisitID || it.id) ? <SmallSpinner /> : <Check size={16} />}
                          </button>
                          <button onClick={() => handlePrint(it)} className="p-2 text-indigo-600 rounded-full hover:text-white hover:bg-indigo-600" title="Print Visit" aria-label="Print Visit"><Printer size={16} /></button>
                          <button onClick={() => !isCompleted && openEdit(it.DairyFarmVisitId || it.DairyFarmVisitID || it.id)} disabled={isCompleted} className={editClass} aria-disabled={isCompleted}><Edit size={16} /></button>
                          <button onClick={() => !isCompleted && confirmDelete(it)} disabled={isCompleted} className={deleteClass} aria-disabled={isCompleted}><Trash2 size={16} /></button>
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

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingId(null); setViewMode(false); setForm(initialForm); }} title={viewMode ? 'View Dairy Visit' : (editingId ? 'Edit Dairy Visit' : 'New Dairy Visit')}>
        <div className="flex justify-end mb-3 gap-2 print:hidden">
          <button onClick={() => handlePrint(form)} className="px-3 py-1 bg-indigo-600 text-white rounded-md">Print</button>
        </div>
        <DairyFarmVisitForm
          form={form}
          onChange={(newData) => setForm(newData)}
          onSave={() => { handleSubmit(); }}
          onCancel={() => { setShowForm(false); setEditingId(null); setViewMode(false); setForm(initialForm); }}
          loading={loading}
          readOnly={viewMode}
        />
      </Modal>

      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg max-h-[95vh] overflow-auto">
            <VisitPrintPreview
              visit={printData}
              entries={buildEntriesFromForm(printData)}
              type="Dairy"
              onClose={() => setShowPrintPreview(false)}
            />
          </div>
        </div>
      )}

      <ConfirmModal open={showDelete} title="Confirm Deletion" onCancel={() => setShowDelete(false)} onConfirm={doDelete}>
        <p className="text-gray-600">Are you sure you want to delete this dairy visit?</p>
      </ConfirmModal>
      <ConfirmModal open={showCompleteConfirm} title="Confirm Complete Visit" onCancel={() => { setShowCompleteConfirm(false); setCompleteTarget(null) }} onConfirm={doComplete}>
        <p className="text-gray-600">Mark this visit as completed? This action will set the visit status to completed.</p>
      </ConfirmModal>
      
    </div>
  )
}
