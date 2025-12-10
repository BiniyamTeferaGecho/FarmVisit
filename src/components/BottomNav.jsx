import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, Clock, BarChart2, Settings } from 'lucide-react'

const items = [
  { key: 'dashboard', label: 'Home', icon: Home },
  // Wire mobile "Visits" button to the Visit Schedules tab
  { key: 'farmvisitschedule', label: 'Visits', icon: Calendar },
  { key: 'createschedule', label: 'Create', icon: Clock },
  { key: 'schedules', label: 'List', icon: BarChart2 },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  function activeKeyFromLocation() {
    try {
      const p = new URLSearchParams(location.search)
      return p.get('tab') || 'dashboard'
    } catch (e) {
      return 'dashboard'
    }
  }

  const active = activeKeyFromLocation()

  function go(key) {
    if (key === 'dashboard') navigate('/dashboard')
    else navigate(`/dashboard?tab=${encodeURIComponent(key)}`)
  }

  return (
    <nav className="block lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="max-w-screen-lg mx-auto px-2">
        <div className="flex justify-between items-center h-14">
          {items.map((it) => {
            const Icon = it.icon
            const isActive = active === it.key
            return (
              <button
                key={it.key}
                onClick={() => go(it.key)}
                aria-label={it.label}
                className={`flex-1 flex flex-col items-center justify-center gap-0 py-1 px-2 text-xs transition-colors ${isActive ? 'text-teal-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] leading-none mt-1">{it.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
