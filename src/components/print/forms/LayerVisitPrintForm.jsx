import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../auth/AuthProvider'
import logoSrc from '../../../assets/images/AKF-Logo.png'

export default function LayerVisitPrintForm({ visitCode, onLoaded }) {
  const { fetchWithAuth } = useAuth()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visitCode) return
    let mounted = true
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetchWithAuth({ url: `/print/layer/${encodeURIComponent(visitCode)}`, method: 'get' })
        const d = res?.data?.data || res?.data || null
        if (!mounted) return
        setData(d)
        if (typeof onLoaded === 'function') onLoaded(d)
      } catch (err) {
        if (!mounted) return
        setError(err?.response?.data?.message || err.message || 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [visitCode])

  const get = (keys, fallback = '') => {
    if (!data) return fallback
    if (!Array.isArray(keys)) keys = [keys]
    for (const k of keys) {
      if (k == null) continue
      const v = data[k] ?? data[k.toLowerCase()] ?? data[k.replace(/\s+/g, '')] ?? null
      if (v !== undefined && v !== null && String(v).trim() !== '') return v
    }
    return fallback
  }

  if (!visitCode) return <div className="p-4 text-sm text-gray-500">No visit code provided</div>
  if (loading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!data) return <div className="p-4 text-gray-500">No data available</div>

  // Logical groups and preferred field names (aliases)
  const groups = [
    { title: 'Identification', keys: [ ['VisitCode','VisitCodeName'], ['ScheduleID','ScheduleId'], ['LayerVisitID','LayerVisitId'] ] },
    { title: 'Farm Details', keys: [ ['FarmName','Farm'], ['FarmCode','FarmCode'], ['Location','FarmLocation','CityTown'] ] },
    { title: 'Flock & Production', keys: [ ['Breed'], ['FlockSize'], ['AgeInWeeks'], ['AverageBodyWeightKG','AvgBodyWeightKg'], ['CurrEggProdinPercent','EggProductionPercent'], ['MortalityTotal'] ] },
    { title: 'Feeding & Water', keys: [ ['FeedingManagement'], ['FeedIntakePerChickenGm'], ['FreqFeedDistPerDay'], ['HowMuchFeedLOvergmPerChicken','FeedLeftOver'] , ['SourceOfWater','WaterInTakePerChickenPerDay'] ] },
    { title: 'Health & Biosecurity', keys: [ ['VaccinationsGivenLast4Weeks'], ['WhichTypeandDataofVaccin','VaccinationNote'], ['AnyMedicationGiven','WhichTypeandWhy'], ['BiosecurityComment'], ['SampleTaken'] ] },
    { title: 'Observations & Recommendations', keys: [ ['AbnormalSigns'], ['ExplainPostmortemFindings'], ['IssuesComplaints'], ['RecommendationAdvice','RecommendationGiven'] ] },
    { title: 'Attachments', keys: [ ['AnyRelatedEvidenceImage'] ] }
  ]

  const approvedBy = get(['ApprovedByName','ApprovedBy','ApprovedByID','Approver'])
  const createdBy = get(['CreatedByName','CreatedBy','CreatedByID','CreatedByUser'])
  const approvedDate = get(['ApprovedDate','ApprovedOn','ApprovedAt'])
  const createdDate = get(['CreatedAt','CreatedDate','CreatedOn'])

  return (
    <div className="p-4 bg-white rounded shadow-sm print:p-0">
      <article className="mx-auto w-[210mm] max-w-full border border-gray-100 shadow-sm print:shadow-none bg-white">
        <header className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <img src={logoSrc} alt="Company" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">Layer Farm Visit Report</h1>
              <div className="text-sm text-gray-600">Detailed visit record and observations</div>
            </div>
          </div>
          <div className="text-sm text-right text-gray-600">
            <div><span className="font-medium">Visit:</span> {String(get(['VisitCode','VisitCodeName','LayerVisitID']) || visitCode)}</div>
            <div><span className="font-medium">Date:</span> {String(get(['VisitDate','CreatedAt','CreatedDate']) || new Date().toLocaleDateString())}</div>
          </div>
        </header>

        <section className="p-6 space-y-4">
          {groups.map(g => (
            <div key={g.title} className="bg-gray-50 p-4 rounded">
              <h2 className="font-semibold text-gray-700 mb-3">{g.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {g.keys.map((ks, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-40 text-gray-600">{Array.isArray(ks) ? (ks[0]) : ks}</div>
                    <div className="text-gray-800 wrap-break-word">{String(get(ks) ?? '')}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="p-4 border rounded bg-white">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notes & Observations</h3>
              <div className="text-sm text-gray-800 wrap-break-word">{String(get(['Notes','Observation','Observations','Results']) || get(['AbnormalSigns','IssuesComplaints']) || '')}</div>
            </div>
            <div className="p-4 border rounded bg-white">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h3>
              <div className="text-sm text-gray-800 wrap-break-word">{String(get(['RecommendationAdvice','RecommendationGiven','Recommendation']) || '')}</div>
            </div>
          </div>
        </section>

        <footer className="p-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="flex flex-col items-start">
              <div className="text-sm text-gray-600">Approved by</div>
              <div className="mt-6 w-64 border-b border-gray-300"></div>
              <div className="text-sm text-gray-800 mt-2">{approvedBy || '____________________'}</div>
              <div className="text-xs text-gray-500">{approvedDate ? String(approvedDate) : ''}</div>
            </div>

            <div className="flex flex-col items-start">
              <div className="text-sm text-gray-600">Created by</div>
              <div className="mt-6 w-64 border-b border-gray-300"></div>
              <div className="text-sm text-gray-800 mt-2">{createdBy || '____________________'}</div>
              <div className="text-xs text-gray-500">{createdDate ? String(createdDate) : ''}</div>
            </div>
          </div>
        </footer>
      </article>
    </div>
  )
}
