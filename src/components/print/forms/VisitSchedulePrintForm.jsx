import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../auth/AuthProvider'

export default function VisitSchedulePrintForm({ visitCode, onLoaded }) {
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
        const res = await fetchWithAuth({ url: `/print/visit-schedule/${encodeURIComponent(visitCode)}`, method: 'get' })
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

  if (!visitCode) return <div className="p-4 text-sm text-gray-500">No visit code provided</div>
  if (loading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!data) return <div className="p-4 text-gray-500">No data available</div>

  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-2">Visit Schedule — {data.VisitCode || visitCode}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {Object.keys(data).map(k => (
          <div key={k} className="flex gap-2">
            <div className="text-gray-600 w-40">{k}</div>
            <div className="text-gray-800 wrap-break-word">{String(data[k] ?? '')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
