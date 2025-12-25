import React from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, Clock, List, Settings } from 'lucide-react'

const items = [
  { key: 'dashboard', label: 'Home', icon: Home },
  // Use dashboard tab ids so mobile nav maps to actual dashboard tabs
  { key: 'farmvisitschedule', label: 'Visits', icon: Calendar },
    { key: 'create', label: 'Create', icon: Clock },
      { key: 'list', label: 'My Visits', icon: List },
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

  const auth = useAuth()
  const active = activeKeyFromLocation()

  function go(key) {
    if (key === 'dashboard') {
      navigate(`/dashboard?tab=${encodeURIComponent('dashboard')}`)
      return
    }

      // Special mappings for quick actions
      if (key === 'create') {
        // Open Visit Schedules tab and request the create modal
        navigate(`/dashboard?tab=${encodeURIComponent('farmvisitschedule')}&open=create`)
        return
      }
      if (key === 'list') {
        // Open My Visits (advisor visits) tab
        navigate(`/dashboard?tab=${encodeURIComponent('advisorvisits')}`)
        return
      }

      // default: treat key as dashboard tab id
      navigate(`/dashboard?tab=${encodeURIComponent(key)}`)
  }

  return (
    <nav className="block lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="max-w-5xl mx-auto px-2">
        <div className="flex justify-between items-center h-14">
          {items.map((it) => {
            // check form-level permission if available (map keys where necessary)
            try {
              const fk = (it.formKey || it.key || '').toString().toLowerCase();
              if (fk && auth && typeof auth.hasFormPermission === 'function') {
                if (!auth.hasFormPermission(fk) && !(auth.user && (auth.user.roles || []).includes('ROLE_ADMIN'))) {
                  // skip rendering this nav item if the user lacks permission
                  return null
                }
              }
            } catch (e) { /* ignore permission checks on error */ }
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
