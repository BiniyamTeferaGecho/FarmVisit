import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../auth/AuthProvider'
import logo from '../../../assets/images/AKF-Logo.png'

export default function DairyVisitPrintForm({ visitCode, onLoaded }) {
  const { fetchWithAuth } = useAuth()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const formatValue = (v) => {
    if (v === null || v === undefined) return ''
    // If already a Date
    if (v instanceof Date) {
      const dd = String(v.getDate()).padStart(2, '0')
      const mm = String(v.getMonth() + 1).padStart(2, '0')
      const yyyy = v.getFullYear()
      return `${dd}-${mm}-${yyyy}`
    }
    // If ISO-ish string, try parse
    if (typeof v === 'string') {
      // quick ISO date detection
      const iso = /^\d{4}-\d{2}-\d{2}T/.test(v)
      if (iso) {
        const d = new Date(v)
        if (!isNaN(d)) return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
      }
      return v
    }
    return String(v)
  }

  const humanizeKey = (k) => {
    if (!k) return ''
    // replace underscores and camelCase with spaces, then title-case
    const spaced = k
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
    return spaced.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
  }

  useEffect(() => {
    if (!visitCode) return
    let mounted = true
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetchWithAuth({ url: `/print/dairy/${encodeURIComponent(visitCode)}`, method: 'get' })
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
    <div className="p-4 bg-white rounded shadow-sm print:shadow-none print:p-6">
      <div className="flex items-center justify-between mb-4">
        <img src={logo} alt="AKF" className="h-12" />
        <div className="text-right">
          <div className="text-sm text-gray-600">Dairy Visit Printout</div>
          <div className="text-xs text-gray-500">Generated: {formatValue(new Date())}</div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-2">Dairy Visit — {data.VisitCode || visitCode}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {Object.keys(data).map(k => (
          <div key={k} className="flex gap-2">
            <div className="text-gray-600 w-44">{humanizeKey(k)}</div>
            <div className="text-gray-800 wrap-break-word">{formatValue(data[k] ?? '')}</div>
          </div>
        ))}
      </div>

      <footer className="mt-6 pt-4 border-t text-xs text-gray-600 flex flex-col md:flex-row md:justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs text-gray-500">Prepared By</div>
          <div className="w-52 h-7 border-b mt-3" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500">Approved By</div>
          <div className="w-52 h-7 border-b mt-3" />
        </div>
        <div className="flex-1 text-right">
          <div className="text-xs text-gray-500">Generated On</div>
          <div className="mt-2">{formatValue(new Date())}</div>
        </div>
      </footer>
    </div>
  )
}
