import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import apiClient from '../../utils/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { RefreshCw } from 'lucide-react'

function formatNumber(v) {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'number') return v.toLocaleString()
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString() : v
}

const Card = ({ title, value, onClick, active, colorClass = 'bg-slate-200' }) => (
  <button onClick={onClick} className={`text-left p-4 rounded-lg shadow-sm transition-colors bg-white dark:bg-slate-800 hover:shadow-md ${active ? 'ring-2 ring-indigo-400' : ''}`}>
    <div className="flex items-center gap-3">
      <span className={`${colorClass} w-3 h-3 rounded-full flex-shrink-0`} />
      <div className="flex-1">
        <div className="text-sm text-slate-500 dark:text-slate-400">{title}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</div>
      </div>
    </div>
  </button>
)

// Minimal sparkline/line chart using SVG
function LineChart({ data = [], width = 600, height = 140 }) {
  const [hoverIndex, setHoverIndex] = React.useState(null)

  const { pointsStr, coords, labels, values } = useMemo(() => {
    if (!data || !data.length) return { pointsStr: '', coords: [], labels: [], values: [] }
    const sample = data[0] || {}
    const keys = Object.keys(sample)
    const valueKey = keys.find(k => /farmcount|count|farm_count|countof/i.test(k)) || keys.find(k => /count|value|total/i.test(k)) || keys[0]
    const labelKey = keys.find(k => /yearmonth|monthname|month|label|period/i.test(k)) || keys[0]
    const vals = data.map(d => { const n = Number(d[valueKey]); return Number.isFinite(n) ? n : 0 })
    const labs = data.map(d => (d[labelKey] || d.YearMonth || d.MonthName || (d.Month ? String(d.Month) : '')))
    const max = Math.max(...vals, 1)
    const min = Math.min(...vals)
    const padX = Math.max(8, Math.round(width * 0.03))
    const innerW = Math.max(1, width - padX * 2)
    const stepX = innerW / Math.max(vals.length - 1, 1)
    const coordsArr = vals.map((v, i) => {
      const x = Math.round(padX + i * stepX)
      const y = Math.round(height - ((v - min) / (max - min || 1)) * (height - 6) - 3)
      return { x, y }
    })
    const pStr = coordsArr.map(c => `${c.x},${c.y}`).join(' ')
    return { pointsStr: pStr, coords: coordsArr, labels: labs, values: vals }
  }, [data, width, height])

  if (!data || !data.length) return (
    <div className="w-full h-full flex items-center justify-center text-sm text-slate-500">No trend data</div>
  )

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
        {pointsStr && pointsStr.length > 0 && (
          <polyline fill="none" stroke="#6366F1" strokeWidth="2" points={pointsStr} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* ticks and points */}
        {coords.map((c, i) => (
          <g key={i}>
            {/* tick */}
            <line x1={c.x} x2={c.x} y1={height - 6} y2={height - 2} stroke="#94A3B8" strokeWidth={1} />
            {/* point */}
            <circle cx={c.x} cy={c.y} r={3} fill={i === hoverIndex ? '#4F46E5' : '#6366F1'} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIndex !== null && coords[hoverIndex] && (
        <div style={{ left: coords[hoverIndex].x, top: coords[hoverIndex].y - 36 }} className="pointer-events-none absolute transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded">
          {values[hoverIndex]}
        </div>
      )}

      {/* X-axis labels */}
      <div className="mt-2 w-full overflow-x-auto">
        <div className="flex gap-2 items-center text-xs text-slate-500 dark:text-slate-400">
          {labels.map((lab, i) => (
            <div key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} className="px-1 py-0.5 min-w-[48px] text-center truncate">
              {lab}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FarmsStatsWidget({ externalData = null, externalLoading = false, wide = false }) {
  const { fetchWithAuth } = useAuth()
  const [loading, setLoading] = useState(true)
  const [overall, setOverall] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [recordsets, setRecordsets] = useState([])
  const [distribution, setDistribution] = useState([])
  const chartRef = useRef(null)
  const [chartWidth, setChartWidth] = useState(600)
  const [selectedFilter, setSelectedFilter] = useState(null)

  const fetchStats = async (filters = {}) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filters.region) qs.set('region', filters.region)
      if (filters.farmTypeID) qs.set('farmTypeID', filters.farmTypeID)
      if (filters.isActive !== undefined) qs.set('isActive', filters.isActive ? '1' : '0')
      if (filters.year) qs.set('year', String(filters.year))
      const url = '/farms/statistics' + (qs.toString() ? `?${qs.toString()}` : '')
      const res = await fetchWithAuth({ url, method: 'get', redirectOnFail: false })
      const data = res.data && res.data.data ? res.data.data : null
      if (!data) {
        setOverall(null)
        setMonthly([])
        setRecordsets([])
        setDistribution([])
      } else {
        setOverall(data.overall || null)
        setRecordsets(data.recordsets || [])
        // attempt to find monthly trend data in recordsets (third recordset expected)
        let monthlyRows = []
        if (data.recordsets && data.recordsets.length >= 3) monthlyRows = data.recordsets[2]
        else if (data.recordsets) {
          // try to find a recordset that has YearMonth or MonthName
          const found = data.recordsets.find(rs => rs && rs.length && (rs[0].YearMonth || rs[0].MonthName || rs[0].Month))
          if (found) monthlyRows = found
        }
        // attempt to find a distribution recordset (SizeCategory or FarmTypeID or Region)
        let dist = []
        if (data.recordsets) {
          const foundDist = data.recordsets.find(rs => rs && rs.length && (rs[0].SizeCategory || rs[0].FarmTypeID || rs[0].Region || rs[0].FarmCount || rs[0].FarmCount))
          if (foundDist) dist = foundDist
        }
        setDistribution(dist || [])
        setMonthly(monthlyRows || [])
      }
    } catch (err) {
      console.error('Failed loading farm stats', err)
    } finally {
      setLoading(false)
    }
  }

  // Refresh that calls quick and trend endpoints and updates overall/monthly/distribution
  const handleRefresh = async () => {
    setLoading(true)
    try {
      // quick stats (flat or wrapped)
      const quickRes = await apiClient.get('/farms/statistics/quick')
      const quick = quickRes.data && quickRes.data.data ? quickRes.data.data : quickRes.data

      if (quick) {
        if (quick.TotalFarms !== undefined || quick.ActiveFarms !== undefined) {
          setOverall({
            TotalFarms: quick.TotalFarms,
            ActiveFarms: quick.ActiveFarms,
            TotalFarmArea: quick.TotalFarmArea,
            AverageFarmSize: quick.AverageFarmSize,
            FarmsWithGPS: quick.FarmsWithGPS,
            FarmsCreatedThisMonth: quick.FarmsCreatedThisMonth
          })
        } else if (quick.overall) {
          setOverall(quick.overall)
        }

        if (quick.recordsets) {
          setRecordsets(quick.recordsets)
          // try to extract distribution if present
          const foundDist = quick.recordsets.find(rs => rs && rs.length && (rs[0].SizeCategory || rs[0].FarmTypeID || rs[0].Region || rs[0].FarmCount))
          setDistribution(foundDist || [])
        }
      }

      // trend endpoint for monthly data
      const trendRes = await apiClient.get('/farms/statistics/trend')
      const trend = trendRes.data && trendRes.data.data ? trendRes.data.data : trendRes.data

      // trend might return an array or an object with recordsets
      if (Array.isArray(trend)) {
        setMonthly(trend)
      } else if (trend && trend.recordsets && trend.recordsets.length) {
        // pick first recordset that looks like monthly
        const found = trend.recordsets.find(rs => rs && rs.length && (rs[0].YearMonth || rs[0].MonthName || rs[0].Month))
        setMonthly(found || trend.recordsets[0] || [])
      } else if (trend && trend.monthly) {
        setMonthly(trend.monthly)
      }
    } catch (err) {
      console.error('Failed refreshing farm quick/trend stats', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // If parent provided external data, use it and skip internal fetch
    if (externalData !== null || externalLoading) {
      setLoading(Boolean(externalLoading))
      if (externalData) {
        try {
          const data = externalData && externalData.data ? externalData.data : externalData

          // Support two shapes:
          // 1) { overall: { ... }, recordsets: [...] }
          // 2) quick-stats flat object: { TotalFarms: 5, ActiveFarms: 5, ... }
          if (data && (data.overall || data.recordsets)) {
            setOverall(data.overall || null)
            setRecordsets(data.recordsets || [])

            let monthlyRows = []
            if (data.recordsets && data.recordsets.length >= 3) monthlyRows = data.recordsets[2]
            else if (data.recordsets) {
              const found = data.recordsets.find(rs => rs && rs.length && (rs[0].YearMonth || rs[0].MonthName || rs[0].Month))
              if (found) monthlyRows = found
            }

            let dist = []
            if (data.recordsets) {
              const foundDist = data.recordsets.find(rs => rs && rs.length && (rs[0].SizeCategory || rs[0].FarmTypeID || rs[0].Region || rs[0].FarmCount))
              if (foundDist) dist = foundDist
            }

            setDistribution(dist || [])
            setMonthly(monthlyRows || [])

          } else if (data && (data.TotalFarms !== undefined || data.ActiveFarms !== undefined)) {
            // Quick-stats flat shape: use it directly as overall metrics
            setOverall({
              TotalFarms: data.TotalFarms,
              ActiveFarms: data.ActiveFarms,
              TotalFarmArea: data.TotalFarmArea,
              AverageFarmSize: data.AverageFarmSize,
              FarmsWithGPS: data.FarmsWithGPS,
              FarmsCreatedThisMonth: data.FarmsCreatedThisMonth
            })
            setRecordsets([])
            setDistribution([])
            setMonthly([])
          } else {
            // unknown shape
            setOverall(null)
            setRecordsets([])
            setDistribution([])
            setMonthly([])
          }
        } catch (err) {
          console.error('Failed to process external farm stats', err)
        } finally {
          if (!externalLoading) setLoading(false)
        }
      }
      return
    }

    fetchStats({})
  }, [externalData, externalLoading])

  // responsive chart width
  useLayoutEffect(() => {
    const el = chartRef.current
    if (!el) return
    const setW = () => setChartWidth(Math.max(300, Math.floor(el.clientWidth || 600)))
    setW()
    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => setW())
      ro.observe(el)
    }
    const onWin = () => setW()
    window.addEventListener('resize', onWin)
    return () => {
      window.removeEventListener('resize', onWin)
      if (ro && ro.disconnect) ro.disconnect()
    }
  }, [chartRef])

  if (loading) return <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm"><LoadingSpinner /></div>

  const overallMetrics = overall || {}
  const cards = [
    { key: 'TotalFarms', label: 'Total Farms', value: formatNumber(overallMetrics.TotalFarms), colorClass: 'bg-indigo-500' },
    { key: 'ActiveFarms', label: 'Active Farms', value: formatNumber(overallMetrics.ActiveFarms), colorClass: 'bg-emerald-500' },
    { key: 'InactiveFarms', label: 'Inactive Farms', value: formatNumber(overallMetrics.InactiveFarms), colorClass: 'bg-gray-400' },
    { key: 'FarmsWithGPS', label: 'Farms with GPS', value: formatNumber(overallMetrics.FarmsWithGPS), colorClass: 'bg-cyan-500' },
    { key: 'FarmsWithPhone', label: 'Farms with Phone', value: formatNumber(overallMetrics.FarmsWithPhone), colorClass: 'bg-yellow-500' },
    { key: 'FarmsCreatedThisYear', label: 'Created This Year', value: formatNumber(overallMetrics.FarmsCreatedThisYear), colorClass: 'bg-violet-500' },
  ]

  const handleCardClick = (card) => {
    // simple interactivity: clicking Active/Inactive toggles a filter and refetches
    if (card.key === 'ActiveFarms') {
      const next = selectedFilter === 'active' ? null : 'active'
      setSelectedFilter(next)
      fetchStats({ isActive: next === 'active' })
      return
    }
    if (card.key === 'InactiveFarms') {
      const next = selectedFilter === 'inactive' ? null : 'inactive'
      setSelectedFilter(next)
      fetchStats({ isActive: next === 'inactive' ? 0 : undefined })
      return
    }
    // otherwise just highlight
    setSelectedFilter(card.key === selectedFilter ? null : card.key)
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Overall counts and recent monthly trend</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${wide ? 'lg:grid-cols-6' : 'lg:grid-cols-3'}`}>
        {cards.map(c => (
          <Card key={c.key} title={c.label} value={c.value} onClick={() => handleCardClick(c)} active={selectedFilter === (c.key === 'ActiveFarms' ? 'active' : c.key === 'InactiveFarms' ? 'inactive' : c.key)} colorClass={c.colorClass} />
        ))}
      </div>

      <div className="mt-2">
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
          <h4 className="text-sm text-slate-600 dark:text-slate-300 mb-2">Monthly Farms Created (last 12 months)</h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2" ref={chartRef}>
              <LineChart data={monthly} width={chartWidth} />
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {monthly && monthly.length ? `${monthly.length} months shown` : 'No monthly data available.'}
              </div>
            </div>
            <div className="lg:col-span-1">
              <h5 className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">Distribution</h5>
              {distribution && distribution.length ? (
                <div className="space-y-3">
                  {/* Legend for categories */}
                  <div className="flex flex-col gap-2">
                    {distribution.slice(0,6).map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-sm`} style={{ background: ['#60A5FA','#A78BFA','#F472B6','#FBBF24','#34D399','#F87171'][i % 6] }} />
                          <div className="text-sm text-slate-700 dark:text-slate-200">{r.SizeCategory || r.Region || (r.FarmTypeID ? `Type ${r.FarmTypeID}` : 'Category')}</div>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{formatNumber(r.FarmCount || r.FarmCount || r.Count || r.Count || '')}</div>
                      </div>
                    ))}
                  </div>

                  {/* Table view (compact) */}
                  <div className="overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500 dark:text-slate-400">
                          <th className="pb-1">Category</th>
                          <th className="pb-1 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {distribution.map((r, i) => (
                          <tr key={i} className="border-t border-gray-100 dark:border-slate-800">
                            <td className="py-1 text-slate-700 dark:text-slate-200">{r.SizeCategory || r.Region || (r.FarmTypeID ? `Type ${r.FarmTypeID}` : `Row ${i+1}`)}</td>
                            <td className="py-1 text-right text-slate-600 dark:text-slate-400">{formatNumber(r.FarmCount || r.Count || r.TotalArea || r.Percentage)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No distribution data available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
