import React, { useEffect, useRef, useState } from 'react'

export default function ColumnSelector({
  columns = [], // [{ key, label }]
  visibilityMap = {}, // { key: boolean }
  onChange = () => {},
  localStorageKey = null,
  buttonLabel = 'Columns',
  // optional trigger node (icon). If provided, it will be rendered inside the trigger button
  trigger = null,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const visibleCount = Object.values(visibilityMap || {}).filter(Boolean).length

  const toggleKey = (key) => {
    const isVisible = !!visibilityMap[key]
    if (isVisible && visibleCount <= 1) {
      // prevent hiding last column
      return
    }
    const next = { ...(visibilityMap || {}), [key]: !isVisible }
    try {
      if (localStorageKey) window.localStorage.setItem(localStorageKey, JSON.stringify(next))
    } catch (e) {
      // ignore storage failures
    }
    onChange(next)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className={`px-3 py-1 bg-gray-100 rounded border mr-2 ${trigger ? 'p-2' : ''}`}
        title={buttonLabel}
        aria-label={buttonLabel}
      >
        {trigger ? trigger : buttonLabel}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border rounded shadow p-3 z-50">
          <div className="text-sm font-medium text-gray-700 mb-2">Show Columns</div>
          <div className="space-y-2 max-h-60 overflow-auto">
            {columns.map((c) => {
              const checked = !!visibilityMap[c.key]
              const disabled = checked && visibleCount <= 1
              return (
                <label key={c.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleKey(c.key)}
                      className="form-checkbox h-4 w-4 text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{c.label}</span>
                  </div>
                  <div>
                    {disabled && <span className="text-xs text-gray-400">(required)</span>}
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
