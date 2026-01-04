import React, { useEffect, useRef, useState } from 'react'

// ColumnHeaderFilter
// Props:
// - title: header title
// - columnKey: identifier for this column (string)
// - type: 'text' | 'select' | 'date' | 'daterange' | 'number' | 'status'
// - options: for select -> [{ value, label }]
// - value: current value (optional)
// - onApply: (value) => void
// - onClear: () => void
export default function ColumnHeaderFilter({ title, columnKey, type = 'text', options = [], value: initialValue = '', onApply, onClear }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initialValue || '')
  const [valueTo, setValueTo] = useState('') // for range end
  const ref = useRef(null)

  useEffect(() => setValue(initialValue || ''), [initialValue])

  const isValueActive = (val) => {
    if (val === null || val === undefined) return false
    if (typeof val === 'string') return val.trim() !== ''
    if (typeof val === 'object') {
      if (Array.isArray(val)) return val.length > 0
      if ('from' in val || 'to' in val) return !!(val.from || val.to)
      return Object.keys(val).length > 0
    }
    return true
  }

  const active = isValueActive(initialValue)

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function handleApply() {
    if (type === 'daterange') {
      onApply && onApply({ from: value || null, to: valueTo || null })
    } else if (type === 'status') {
      onApply && onApply(value === '' ? null : (value === 'Active' ? 1 : 0))
    } else {
      onApply && onApply(value === '' ? null : value)
    }
    setOpen(false)
  }

  function handleClear() {
    setValue(''); setValueTo('')
    onClear && onClear()
    setOpen(false)
  }

  return (
    <div className="relative flex items-center space-x-2" ref={ref}>
      <span className="whitespace-nowrap">{title}</span>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${active ? 'bg-indigo-50' : ''} text-gray-600`}
        title="Filter"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 01.8 1.6L12 11.666V16a1 1 0 01-1.447.894L7 15.118V11.666L3.2 5.6A1 1 0 013 4z" />
        </svg>
        {active && <span className="absolute -top-1 -right-1 inline-block w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-gray-800" />}
      </button>

      {open && (
        <div className="absolute mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 p-3">
          <div className="space-y-2">
            {type === 'text' && (
              <div>
                <input value={value} onChange={e => setValue(e.target.value)} placeholder={`Filter ${title}`} className="w-full px-2 py-1 border rounded text-sm" />
              </div>
            )}

            {type === 'number' && (
              <div>
                <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder={`Filter ${title}`} className="w-full px-2 py-1 border rounded text-sm" />
              </div>
            )}

            {type === 'select' && (
              <div>
                <select value={value} onChange={e => setValue(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                  <option value="">All</option>
                  {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {type === 'status' && (
              <div>
                <select value={value} onChange={e => setValue(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                  <option value="">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}

            {type === 'daterange' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={value} onChange={e => setValue(e.target.value)} className="px-2 py-1 border rounded text-sm" />
                <input type="date" value={valueTo} onChange={e => setValueTo(e.target.value)} className="px-2 py-1 border rounded text-sm" />
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <button onClick={handleClear} className="text-sm text-gray-600 hover:underline">Clear</button>
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(false)} className="px-2 py-1 text-sm bg-gray-100 rounded">Cancel</button>
                <button onClick={handleApply} className="px-2 py-1 text-sm bg-indigo-600 text-white rounded">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
