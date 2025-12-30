import React, { useEffect, useState } from 'react'
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
      <span className={`${colorClass} w-3 h-3 rounded-full .flex-shrink-0`} />
      <div className="flex-1">
        <div className="text-sm text-slate-500 dark:text-slate-400">{title}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</div>
      </div>
    </div>
  </button>
)

// Line chart removed — monthly farms chart was removed from UI

export default function FarmsStatsWidget({ externalData = null, externalLoading = false, wide = false }) {
  const { fetchWithAuth } = useAuth()
  const [loading, setLoading] = useState(true)
  const [overall, setOverall] = useState(null)
  const [recordsets, setRecordsets] = useState([])
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
        setRecordsets([])
      } else {
        setOverall(data.overall || null)
        setRecordsets(data.recordsets || [])
        // recording recordsets only; monthly and distribution removed from UI
        // keep recordsets for potential downstream use
        if (data.recordsets) {
          // recordsets provided; distribution UI removed
        }
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
          // distribution data removed from UI
        }
      }
      // monthly trend fetching removed (no UI target)
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
          } else {
            // unknown shape
            setOverall(null)
            setRecordsets([])
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

  // responsive chart logic removed (monthly chart removed)

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

      
    </div>
  )
}
