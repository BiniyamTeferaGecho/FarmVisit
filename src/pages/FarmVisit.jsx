import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Plus } from 'lucide-react'

export default function FarmVisit() {
	const { user, fetchWithAuth } = useAuth()
	const location = useLocation()
	const userId = user && (user.UserID || user.userId || user.UserId || user.id || user.ID)

		const [employees, setEmployees] = useState([])
		const [farmers, setFarmers] = useState([])

		const [form, setForm] = useState({
			// visit-level
			FarmTypeCode: 'LAYER', // LAYER or DAIRY
			FarmID: '',
			FarmerID: '',
			AdvisorID: '',
			VisitDate: new Date().toISOString().slice(0,16), // datetime-local input
			VisitPurpose: '',
			VisitStatusID: '',
			ScheduledStartTime: '',
			ScheduledEndTime: '',
			ActualStartTime: '',
			ActualEndTime: '',
			DurationMinutes: '',
			VisitOutcome: '',
			Location: '',
			AssignedTo: userId || '',
			Findings: '',
			Recommendations: '',
			NextVisitDate: '',
			VisitPriority: 'Normal',

			// layer-specific
			LayerFarmType: '', Breed: '', FlockSize: '', AgeInWeeks: '', FeedingManagement: '', FeedIntakePerChickenGm: '', WaterInTakePerChicken: '', FeedLeftOver: '', FLOHowMuchPDay: '', WaterIntakePerDay: '', FlockDensity: '', AvgBodyWeightKg: '', Ventilation: '', HouseTemperature: '', Humidity: '', DrinkerType: '', NumberofDrinker: '', FeederType: '', NumberofFeeder: '', VaccinationsGiven: false, VaccinationNote: '', BiosecurityComment: '', EggProductionPercent: '', FarmHygieneComment: '', EggSizeAvgWeightGm: '', EggAbnormality: '', YolkColor: '', EggShellColor: '', EggProductionDeclinePrev1Week: '', MortalityTotal: '', MortalityRecent2Weeks: '', DiseaseHistory: '', AbnormalSigns: '', PostmortemFindings: '', CustomerFeedbackOnAKF: '', RecommendationGiven: '', SampleTaken: false, SampleType: '', AnalysisRequest: '', AnyPictureRelatedtoVisit: '',

			// dairy-specific
			LactationCows: '', DryCows: '', Heifers: '', Calves: '', Buls: '', BodyCondition: '', FeedingPerCow: '', HowTheyGiveForCos: '', UsesConcentrate: false, WhichCompany: '', IsLocalMix: false, ListofIngridiant: '', SampleCollection: '', HasForage: false, TypeOfForage: '', ForageAmount: '', ConcentrateFeedSample: false, AmountofWaterProvided: '', ManureScore1: '', ManureScore2: '', ManureScore3: '', ManureScore4: '', DairyVentilation: '', LightIntensity: '', BeddingType: '', SpaceAvailability: '', VaccinationHistory: '', BreedingHistory: '', BreedingMethod: '', AreTheyUsingNaturalorAI: '', InseminationFrequency: '', CalvingInterval: '', AgeAtFirstCalving: '', LitterCondition: '', AvgMilkProductionPerDay: '', MaxMilkProductionPerCow: '', TotalMilkPerDay: '', MilkSupplyTo: '', MilkPricePerLitter: '', Medication: false, WhatTypeofMedication: '', IssuesComplaints: '', AnalyzeRequested: '', RecommendationAdvice: '', FeedBackOnAKF: '', AnyRelatedEvidenceImage: '',
		})
	const [saving, setSaving] = useState(false)
	const [message, setMessage] = useState(null)
		const [loadingLists, setLoadingLists] = useState(true)
		const [activeTab, setActiveTab] = useState('visit') // 'visit' | 'layer' | 'dairy'
		const [errors, setErrors] = useState({})

	const handleSubmit = async (e) => {
		e.preventDefault()
		setMessage(null)
			if (!userId) return setMessage({ type: 'error', text: 'You must be signed in' })

			// client-side validation
			const validation = validateForm(form, userId)
			if (validation && Object.keys(validation).length > 0) {
				setErrors(validation)
				// jump to first error tab
				if (validation._tab) setActiveTab(validation._tab)
				return setMessage({ type: 'error', text: 'Please fix the highlighted errors' })
			}
			setErrors({})
			// sanitize: convert empty strings to null, preserve booleans and numbers where applicable
			const payload = {}
			for (const k of Object.keys(form)) {
				const v = form[k]
				if (typeof v === 'string') payload[k] = v.trim() === '' ? null : v
				else payload[k] = v
			}
			payload.AssignedTo = payload.AssignedTo || userId
			payload.CreatedBy = userId
			payload.VisitDate = form.VisitDate ? new Date(form.VisitDate).toISOString() : new Date().toISOString()

		setSaving(true)
		try {
			const res = await fetchWithAuth({ url: '/farm-visit/create-with-details', method: 'post', data: payload })
			if (res?.data?.success) {
				setMessage({ type: 'success', text: 'Farm visit created' })
				// Optionally clear form (preserve farm type)
				setForm(f => ({ ...f, VisitPurpose: '', Location: '', Breed: '', FlockSize: '', AgeInWeeks: '', LactationCows: '', AvgMilkProductionPerDay: '', TotalMilkPerDay: '' }))
			} else {
				setMessage({ type: 'error', text: res?.data?.message || 'Unexpected response' })
			}
		} catch (err) {
			console.error('create farm visit error', err)
			setMessage({ type: 'error', text: err?.response?.data?.message || err.message || 'Failed to create' })
		} finally {
			setSaving(false)
		}
	}

		// Load dropdown lists (employees and farmers)
		useEffect(() => {
			let mounted = true
			// Prefill visitId/farmType and other schedule fields when navigated from schedule
			try {
				const qs = new URLSearchParams(location.search || '')
				const qVisit = qs.get('visitId') || (location.state && location.state.visitId)
				const qFarmType = qs.get('farmType') || (location.state && location.state.farmType)
				const qAdvisor = qs.get('AdvisorID') || (location.state && location.state.AdvisorID) || qs.get('advisor')
				const qFarm = qs.get('FarmID') || (location.state && location.state.FarmID) || qs.get('farm')
				const qPurpose = qs.get('VisitPurpose') || (location.state && location.state.VisitPurpose) || qs.get('purpose')
				const qAssign = qs.get('AssignTo') || (location.state && location.state.AssignTo) || qs.get('assignTo')
				if (qVisit) setForm(f => ({ ...f, VisitId: qVisit }))
				if (qFarmType) setForm(f => ({ ...f, FarmTypeCode: (qFarmType||'').toUpperCase() }))
				if (qAdvisor) setForm(f => ({ ...f, AdvisorID: qAdvisor }))
				if (qFarm) setForm(f => ({ ...f, FarmID: qFarm }))
				if (qPurpose) setForm(f => ({ ...f, VisitPurpose: qPurpose }))
				if (qAssign) setForm(f => ({ ...f, AssignedTo: qAssign }))
			} catch (e) {}
			async function loadLists() {
				setLoadingLists(true)
				try {
					const empRes = await fetchWithAuth({ url: '/employees', method: 'get' })
					const empData = empRes?.data?.data || empRes?.data || []
					const farmersRes = await fetchWithAuth({ url: '/farmers', method: 'get' })
					const farmersData = farmersRes?.data?.data || farmersRes?.data || []
					if (!mounted) return
					setEmployees(Array.isArray(empData) ? empData : [])
					setFarmers(Array.isArray(farmersData) ? farmersData : [])
				} catch (err) {
					console.error('Failed to load employees/farmers', err)
					setEmployees([])
					setFarmers([])
				} finally {
					if (mounted) setLoadingLists(false)
				}
			}
			loadLists()
			return () => { mounted = false }
		}, [fetchWithAuth])

			// client-side validation rules
			function validateForm(values, currentUserId) {
				const e = {}
				// CreatedBy is set from current user on submit; ensure we have a signed-in user
				if (!currentUserId) e.CreatedBy = 'You must be signed in'

				if (!values.FarmTypeCode || (typeof values.FarmTypeCode === 'string' && values.FarmTypeCode.trim() === '')) {
					e.FarmTypeCode = 'Farm type is required'
					e._tab = 'visit'
				}

				// require either FarmID or FarmerID
				if ((!values.FarmID || values.FarmID === null) && (!values.FarmerID || values.FarmerID === null)) {
					e.FarmOrFarmer = 'Either Farm or Farmer must be selected'
					e._tab = e._tab || 'visit'
				}

				// VisitDate must be valid
				if (!values.VisitDate) {
					e.VisitDate = 'Visit date is required'
					e._tab = e._tab || 'visit'
				}

				// If layer, prefer at least some layer data (not strictly required by SP but helpful)
				if ((values.FarmTypeCode || '').toUpperCase() === 'LAYER') {
					if ((!values.Breed || values.Breed === null) && (!values.FlockSize && values.FlockSize !== 0)) {
						e.LayerHint = 'At least Breed or Flock Size is recommended for layer visits'
						e._tab = e._tab || 'layer'
					}
				}

				// If dairy, recommend at least one dairy metric
				if ((values.FarmTypeCode || '').toUpperCase() === 'DAIRY') {
					if ((!values.LactationCows && values.LactationCows !== 0) && (!values.TotalMilkPerDay && values.TotalMilkPerDay !== 0)) {
						e.DairyHint = 'Provide Lactation Cows or Total Milk per day for dairy visits'
						e._tab = e._tab || 'dairy'
					}
				}

				return e
			}

	return (
		<div className="space-y-6 h-full">
			<header className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-slate-500">Create Farm Visit</h2>
					<p className="text-sm text-slate-500">Create a visit (visit-level data plus farm-type specific details)</p>
				</div>
			</header>

			<div className="bg-white p-6 rounded-lg shadow-sm">
				<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Tabs */}
					<div className="md:col-span-2">
						<div className="flex gap-2 mb-4">
							<button type="button" onClick={() => setActiveTab('visit')} className={`px-3 py-1 rounded ${activeTab==='visit' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Visit</button>
							<button type="button" onClick={() => setActiveTab('layer')} className={`px-3 py-1 rounded ${activeTab==='layer' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Layer</button>
							<button type="button" onClick={() => setActiveTab('dairy')} className={`px-3 py-1 rounded ${activeTab==='dairy' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Dairy</button>
						</div>

						{/* Global validation banner */}
						{message && message.type === 'error' && (
							<div className="mb-3 text-sm text-red-700">{message.text}</div>
						)}
					</div>

					{activeTab === 'visit' && (
						<div>
							<label className="text-sm font-medium text-slate-700 block mb-1">Farm Type</label>
							<select value={form.FarmTypeCode} onChange={(e) => setForm(f => ({ ...f, FarmTypeCode: e.target.value }))} className="w-full px-3 py-2 border rounded">
								<option value="LAYER">Layer</option>
								<option value="DAIRY">Dairy</option>
							</select>
							{errors.FarmTypeCode && <div className="text-xs text-red-600 mt-1">{errors.FarmTypeCode}</div>}
						</div>
					)}

					{activeTab === 'visit' && (
						<div>
							<label className="text-sm font-medium text-slate-700 block mb-1">Visit Date</label>
							<input type="datetime-local" value={form.VisitDate} onChange={(e) => setForm(f => ({ ...f, VisitDate: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							{errors.VisitDate && <div className="text-xs text-red-600 mt-1">{errors.VisitDate}</div>}
						</div>
					)}

					{activeTab === 'visit' && (
						<>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Farm ID</label>
								<input value={form.FarmID || ''} onChange={(e) => setForm(f => ({ ...f, FarmID: e.target.value }))} className="w-full px-3 py-2 border rounded" placeholder="GUID" />
							</div>

							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Farmer</label>
								<select value={form.FarmerID || ''} onChange={(e) => setForm(f => ({ ...f, FarmerID: e.target.value }))} className="w-full px-3 py-2 border rounded">
									<option value="">-- select farmer --</option>
										{loadingLists && <option disabled>Loading farmers...</option>}
										{farmers.map(fr => {
										const id = fr.FarmerID || fr.FarmerId || fr.id || fr.FarmerID
										const name = `${fr.FirstName || fr.firstName || ''} ${fr.LastName || fr.lastName || ''}`.trim() || (fr.Name || fr.name) || id
										return <option key={id} value={id}>{name}</option>
									})}
								</select>
								{errors.FarmOrFarmer && <div className="text-xs text-red-600 mt-1">{errors.FarmOrFarmer}</div>}
							</div>
						</>
					)}

					<div className="md:col-span-2">
						<label className="text-sm font-medium text-slate-700 block mb-1">Visit purpose</label>
						<input value={form.VisitPurpose} onChange={(e) => setForm(f => ({ ...f, VisitPurpose: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					<div className="md:col-span-2">
						<label className="text-sm font-medium text-slate-700 block mb-1">Location</label>
						<input value={form.Location} onChange={(e) => setForm(f => ({ ...f, Location: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					{form.FarmTypeCode === 'LAYER' && (
						<>{activeTab === 'layer' && ( <>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Breed</label>
								<input value={form.Breed} onChange={(e) => setForm(f => ({ ...f, Breed: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Flock size</label>
								<input type="number" value={form.FlockSize} onChange={(e) => setForm(f => ({ ...f, FlockSize: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Age (weeks)</label>
								<input type="number" value={form.AgeInWeeks} onChange={(e) => setForm(f => ({ ...f, AgeInWeeks: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Egg production (%)</label>
								<input type="number" step="0.1" value={form.EggProductionPercent} onChange={(e) => setForm(f => ({ ...f, EggProductionPercent: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>

							{/* additional layer fields */}
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Feeding Management</label>
								<textarea value={form.FeedingManagement} onChange={(e) => setForm(f => ({ ...f, FeedingManagement: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>

							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Feed intake per chicken (g)</label>
								<input type="number" step="0.01" value={form.FeedIntakePerChickenGm} onChange={(e) => setForm(f => ({ ...f, FeedIntakePerChickenGm: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Water intake per chicken</label>
								<input type="number" step="0.01" value={form.WaterInTakePerChicken} onChange={(e) => setForm(f => ({ ...f, WaterInTakePerChicken: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Feed leftover</label>
								<input value={form.FeedLeftOver} onChange={(e) => setForm(f => ({ ...f, FeedLeftOver: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">FLO how much per day</label>
								<input value={form.FLOHowMuchPDay} onChange={(e) => setForm(f => ({ ...f, FLOHowMuchPDay: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Water intake per day</label>
								<input value={form.WaterIntakePerDay} onChange={(e) => setForm(f => ({ ...f, WaterIntakePerDay: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Flock density</label>
								<input value={form.FlockDensity} onChange={(e) => setForm(f => ({ ...f, FlockDensity: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Avg body weight (kg)</label>
								<input type="number" step="0.01" value={form.AvgBodyWeightKg} onChange={(e) => setForm(f => ({ ...f, AvgBodyWeightKg: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Ventilation</label>
								<input value={form.Ventilation} onChange={(e) => setForm(f => ({ ...f, Ventilation: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">House temperature (°C)</label>
								<input type="number" step="0.1" value={form.HouseTemperature} onChange={(e) => setForm(f => ({ ...f, HouseTemperature: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Humidity (%)</label>
								<input type="number" step="0.1" value={form.Humidity} onChange={(e) => setForm(f => ({ ...f, Humidity: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Drinker type</label>
								<input value={form.DrinkerType} onChange={(e) => setForm(f => ({ ...f, DrinkerType: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Number of drinker</label>
								<input type="number" value={form.NumberofDrinker} onChange={(e) => setForm(f => ({ ...f, NumberofDrinker: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Feeder type</label>
								<input value={form.FeederType} onChange={(e) => setForm(f => ({ ...f, FeederType: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Number of feeder</label>
								<input type="number" value={form.NumberofFeeder} onChange={(e) => setForm(f => ({ ...f, NumberofFeeder: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="flex items-center gap-3">
								<label className="inline-flex items-center gap-2">
									<input type="checkbox" checked={!!form.VaccinationsGiven} onChange={(e) => setForm(f => ({ ...f, VaccinationsGiven: e.target.checked }))} />
									<span className="text-sm">Vaccinations given</span>
								</label>
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Vaccination note</label>
								<textarea value={form.VaccinationNote} onChange={(e) => setForm(f => ({ ...f, VaccinationNote: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Biosecurity comment</label>
								<textarea value={form.BiosecurityComment} onChange={(e) => setForm(f => ({ ...f, BiosecurityComment: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Farm hygiene comment</label>
								<textarea value={form.FarmHygieneComment} onChange={(e) => setForm(f => ({ ...f, FarmHygieneComment: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Egg size avg weight (g)</label>
								<input type="number" step="0.1" value={form.EggSizeAvgWeightGm} onChange={(e) => setForm(f => ({ ...f, EggSizeAvgWeightGm: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Egg abnormality</label>
								<textarea value={form.EggAbnormality} onChange={(e) => setForm(f => ({ ...f, EggAbnormality: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Yolk color (score)</label>
								<input type="number" value={form.YolkColor} onChange={(e) => setForm(f => ({ ...f, YolkColor: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Egg shell color (score)</label>
								<input type="number" value={form.EggShellColor} onChange={(e) => setForm(f => ({ ...f, EggShellColor: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Egg production decline (prev 1 week)</label>
								<textarea value={form.EggProductionDeclinePrev1Week} onChange={(e) => setForm(f => ({ ...f, EggProductionDeclinePrev1Week: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Mortality total</label>
								<input type="number" value={form.MortalityTotal} onChange={(e) => setForm(f => ({ ...f, MortalityTotal: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Mortality recent 2 weeks</label>
								<input type="number" value={form.MortalityRecent2Weeks} onChange={(e) => setForm(f => ({ ...f, MortalityRecent2Weeks: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Disease history</label>
								<textarea value={form.DiseaseHistory} onChange={(e) => setForm(f => ({ ...f, DiseaseHistory: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Abnormal signs</label>
								<textarea value={form.AbnormalSigns} onChange={(e) => setForm(f => ({ ...f, AbnormalSigns: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Postmortem findings</label>
								<textarea value={form.PostmortemFindings} onChange={(e) => setForm(f => ({ ...f, PostmortemFindings: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Customer feedback on AKF</label>
								<textarea value={form.CustomerFeedbackOnAKF} onChange={(e) => setForm(f => ({ ...f, CustomerFeedbackOnAKF: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Recommendation given</label>
								<textarea value={form.RecommendationGiven} onChange={(e) => setForm(f => ({ ...f, RecommendationGiven: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="flex items-center gap-3">
								<label className="inline-flex items-center gap-2">
									<input type="checkbox" checked={!!form.SampleTaken} onChange={(e) => setForm(f => ({ ...f, SampleTaken: e.target.checked }))} />
									<span className="text-sm">Sample taken</span>
								</label>
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Sample type</label>
								<input value={form.SampleType} onChange={(e) => setForm(f => ({ ...f, SampleType: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Analysis request / notes</label>
								<textarea value={form.AnalysisRequest} onChange={(e) => setForm(f => ({ ...f, AnalysisRequest: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Any picture related to visit (URL)</label>
								<input value={form.AnyPictureRelatedtoVisit} onChange={(e) => setForm(f => ({ ...f, AnyPictureRelatedtoVisit: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
						</>)}
						{/* show a small hint if user is on other tab but farm type doesn't match */}
						{activeTab === 'layer' && form.FarmTypeCode !== 'LAYER' && (
							<div className="md:col-span-2 text-sm text-slate-600">Farm type is {form.FarmTypeCode}. Switch to Layer to edit layer-specific data or change Farm Type to LAYER.</div>
						)}
						{errors.LayerHint && activeTab === 'layer' && <div className="md:col-span-2 text-xs text-yellow-700">{errors.LayerHint}</div>}
						</>
					)}

					{/* Visit details */}
					<div className="md:col-span-2">
						<h3 className="text-sm font-semibold mb-2">Visit details</h3>
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Advisor</label>
						<select value={form.AdvisorID} onChange={(e) => setForm(f => ({ ...f, AdvisorID: e.target.value }))} className="w-full px-3 py-2 border rounded">
							<option value="">-- select advisor --</option>
							{loadingLists && <option disabled>Loading employees...</option>}
							{employees.map(emp => {
								const id = emp.EmployeeID || emp.EmployeeId || emp.id || emp.EmployeeID
								const name = `${emp.FirstName || emp.firstName || ''} ${emp.LastName || emp.lastName || ''}`.trim() || emp.Name || emp.name || id
								return <option key={id} value={id}>{name}</option>
							})}
						</select>
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Assigned to</label>
						<select value={form.AssignedTo} onChange={(e) => setForm(f => ({ ...f, AssignedTo: e.target.value }))} className="w-full px-3 py-2 border rounded">
							<option value="">-- select employee --</option>
							{loadingLists && <option disabled>Loading employees...</option>}
							{employees.map(emp => {
								const id = emp.EmployeeID || emp.EmployeeId || emp.id || emp.EmployeeID
								const name = `${emp.FirstName || emp.firstName || ''} ${emp.LastName || emp.lastName || ''}`.trim() || emp.Name || emp.name || id
								return <option key={id} value={id}>{name}</option>
							})}
						</select>
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Visit status ID</label>
						<input value={form.VisitStatusID || ''} onChange={(e) => setForm(f => ({ ...f, VisitStatusID: e.target.value }))} className="w-full px-3 py-2 border rounded" placeholder="GUID" />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Scheduled start time</label>
						<input type="time" value={form.ScheduledStartTime || ''} onChange={(e) => setForm(f => ({ ...f, ScheduledStartTime: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Scheduled end time</label>
						<input type="time" value={form.ScheduledEndTime || ''} onChange={(e) => setForm(f => ({ ...f, ScheduledEndTime: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Actual start time</label>
						<input type="datetime-local" value={form.ActualStartTime || ''} onChange={(e) => setForm(f => ({ ...f, ActualStartTime: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Actual end time</label>
						<input type="datetime-local" value={form.ActualEndTime || ''} onChange={(e) => setForm(f => ({ ...f, ActualEndTime: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Duration minutes</label>
						<input type="number" value={form.DurationMinutes || ''} onChange={(e) => setForm(f => ({ ...f, DurationMinutes: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Visit outcome</label>
						<input value={form.VisitOutcome || ''} onChange={(e) => setForm(f => ({ ...f, VisitOutcome: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					<div className="md:col-span-2">
						<label className="text-sm font-medium text-slate-700 block mb-1">Findings</label>
						<textarea value={form.Findings || ''} onChange={(e) => setForm(f => ({ ...f, Findings: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={3} />
					</div>

					<div className="md:col-span-2">
						<label className="text-sm font-medium text-slate-700 block mb-1">Recommendations</label>
						<textarea value={form.Recommendations || ''} onChange={(e) => setForm(f => ({ ...f, Recommendations: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={3} />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Next visit date</label>
						<input type="date" value={form.NextVisitDate || ''} onChange={(e) => setForm(f => ({ ...f, NextVisitDate: e.target.value }))} className="w-full px-3 py-2 border rounded" />
					</div>

					<div>
						<label className="text-sm font-medium text-slate-700 block mb-1">Visit priority</label>
						<select value={form.VisitPriority || 'Normal'} onChange={(e) => setForm(f => ({ ...f, VisitPriority: e.target.value }))} className="w-full px-3 py-2 border rounded">
							<option value="Low">Low</option>
							<option value="Normal">Normal</option>
							<option value="High">High</option>
						</select>
					</div>

					{form.FarmTypeCode === 'DAIRY' && (
						<>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Lactation cows</label>
								<input type="number" value={form.LactationCows} onChange={(e) => setForm(f => ({ ...f, LactationCows: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Avg milk per cow (L/day)</label>
								<input type="number" step="0.01" value={form.AvgMilkProductionPerDay} onChange={(e) => setForm(f => ({ ...f, AvgMilkProductionPerDay: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Total milk per day (L)</label>
								<input type="number" step="0.01" value={form.TotalMilkPerDay} onChange={(e) => setForm(f => ({ ...f, TotalMilkPerDay: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>

							{/* additional dairy fields */}
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Dry cows</label>
								<input type="number" value={form.DryCows} onChange={(e) => setForm(f => ({ ...f, DryCows: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Heifers</label>
								<input type="number" value={form.Heifers} onChange={(e) => setForm(f => ({ ...f, Heifers: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Calves</label>
								<input type="number" value={form.Calves} onChange={(e) => setForm(f => ({ ...f, Calves: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Buls</label>
								<input type="number" value={form.Buls} onChange={(e) => setForm(f => ({ ...f, Buls: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Body condition</label>
								<input type="number" step="0.1" value={form.BodyCondition} onChange={(e) => setForm(f => ({ ...f, BodyCondition: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Feeding per cow</label>
								<input value={form.FeedingPerCow} onChange={(e) => setForm(f => ({ ...f, FeedingPerCow: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">How they give for cows</label>
								<input value={form.HowTheyGiveForCos} onChange={(e) => setForm(f => ({ ...f, HowTheyGiveForCos: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="flex items-center gap-3">
								<label className="inline-flex items-center gap-2">
									<input type="checkbox" checked={!!form.UsesConcentrate} onChange={(e) => setForm(f => ({ ...f, UsesConcentrate: e.target.checked }))} />
									<span className="text-sm">Uses concentrate</span>
								</label>
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Which company</label>
								<input value={form.WhichCompany} onChange={(e) => setForm(f => ({ ...f, WhichCompany: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">List of ingredient / local mix</label>
								<textarea value={form.ListofIngridiant} onChange={(e) => setForm(f => ({ ...f, ListofIngridiant: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Has forage</label>
								<input type="checkbox" checked={!!form.HasForage} onChange={(e) => setForm(f => ({ ...f, HasForage: e.target.checked }))} />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Type of forage</label>
								<input value={form.TypeOfForage} onChange={(e) => setForm(f => ({ ...f, TypeOfForage: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Forage amount</label>
								<input type="number" value={form.ForageAmount} onChange={(e) => setForm(f => ({ ...f, ForageAmount: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Sample collection</label>
								<textarea value={form.SampleCollection} onChange={(e) => setForm(f => ({ ...f, SampleCollection: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Vaccination history</label>
								<textarea value={form.VaccinationHistory} onChange={(e) => setForm(f => ({ ...f, VaccinationHistory: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Breeding history / method</label>
								<textarea value={form.BreedingHistory} onChange={(e) => setForm(f => ({ ...f, BreedingHistory: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Breeding method</label>
								<input value={form.BreedingMethod} onChange={(e) => setForm(f => ({ ...f, BreedingMethod: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Are they using Natural or AI</label>
								<input value={form.AreTheyUsingNaturalorAI} onChange={(e) => setForm(f => ({ ...f, AreTheyUsingNaturalorAI: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Insemination frequency</label>
								<input value={form.InseminationFrequency} onChange={(e) => setForm(f => ({ ...f, InseminationFrequency: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Calving interval (days)</label>
								<input type="number" value={form.CalvingInterval} onChange={(e) => setForm(f => ({ ...f, CalvingInterval: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Age at first calving</label>
								<input type="number" value={form.AgeAtFirstCalving} onChange={(e) => setForm(f => ({ ...f, AgeAtFirstCalving: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Litter condition</label>
								<textarea value={form.LitterCondition} onChange={(e) => setForm(f => ({ ...f, LitterCondition: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Max milk production per cow</label>
								<input type="number" step="0.01" value={form.MaxMilkProductionPerCow} onChange={(e) => setForm(f => ({ ...f, MaxMilkProductionPerCow: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Milk supply to</label>
								<input value={form.MilkSupplyTo} onChange={(e) => setForm(f => ({ ...f, MilkSupplyTo: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div>
								<label className="text-sm font-medium text-slate-700 block mb-1">Milk price per liter</label>
								<input type="number" step="0.01" value={form.MilkPricePerLitter} onChange={(e) => setForm(f => ({ ...f, MilkPricePerLitter: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
							<div className="flex items-center gap-3">
								<label className="inline-flex items-center gap-2">
									<input type="checkbox" checked={!!form.Medication} onChange={(e) => setForm(f => ({ ...f, Medication: e.target.checked }))} />
									<span className="text-sm">Medication administered</span>
								</label>
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">What type of medication</label>
								<textarea value={form.WhatTypeofMedication} onChange={(e) => setForm(f => ({ ...f, WhatTypeofMedication: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Issues / complaints</label>
								<textarea value={form.IssuesComplaints} onChange={(e) => setForm(f => ({ ...f, IssuesComplaints: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Analyze requested / notes</label>
								<textarea value={form.AnalyzeRequested} onChange={(e) => setForm(f => ({ ...f, AnalyzeRequested: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Recommendation / advice</label>
								<textarea value={form.RecommendationAdvice} onChange={(e) => setForm(f => ({ ...f, RecommendationAdvice: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Feedback on AKF</label>
								<textarea value={form.FeedBackOnAKF} onChange={(e) => setForm(f => ({ ...f, FeedBackOnAKF: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={2} />
							</div>
							<div className="md:col-span-2">
								<label className="text-sm font-medium text-slate-700 block mb-1">Any related evidence image (URL)</label>
								<input value={form.AnyRelatedEvidenceImage} onChange={(e) => setForm(f => ({ ...f, AnyRelatedEvidenceImage: e.target.value }))} className="w-full px-3 py-2 border rounded" />
							</div>
						</>
					)}


					<div className="md:col-span-2 flex items-center justify-end gap-2 mt-2">
						<button type="reset" onClick={() => setForm(f => ({ ...f, VisitPurpose: '', Location: '', Breed: '', FlockSize: '', AgeInWeeks: '', EggProductionPercent: '', LactationCows: '', AvgMilkProductionPerDay: '', TotalMilkPerDay: '' }))} className="px-3 py-2 border rounded">Reset</button>
						<button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded"> <Plus className="h-4 w-4"/> {saving ? 'Saving...' : 'Create Visit'}</button>
					</div>

					{message && (
						<div className={`md:col-span-2 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>
					)}
				</form>
			</div>
		</div>
	)
}

