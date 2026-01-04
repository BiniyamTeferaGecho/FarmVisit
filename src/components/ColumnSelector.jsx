import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../auth/AuthProvider';

export default function ColumnSelector({
  columns = [], // [{ key, label }]
  visibilityMap = {}, // { key: boolean }
  onChange = () => {},
  localStorageKey = null,
  serverSaveUrl = null, // optional server endpoint to persist user preference
  serverSaveMethod = 'post',
  buttonLabel = 'Columns',
  // optional trigger node (icon). If provided, it will be rendered inside the trigger button
  trigger = null,
}) {
  const [open, setOpen] = useState(false)
  const [animState, setAnimState] = useState('exited') // 'entering'|'entered'|'exited'
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const { fetchWithAuth } = useAuth();

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  // animation: when open toggles, set entering -> entered
  useEffect(() => {
    let raf = null;
    if (open) {
      setAnimState('entering');
      raf = requestAnimationFrame(() => setAnimState('entered'));
    } else {
      setAnimState('exited');
    }
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [open]);

  const visibleCount = Object.values(visibilityMap || {}).filter(Boolean).length

  const persistLocal = useCallback((key, next) => {
    try {
      if (key) window.localStorage.setItem(key, JSON.stringify(next))
    } catch (e) { /* ignore */ }
  }, [])

  const persistServer = useCallback(async (next) => {
    if (!serverSaveUrl || !fetchWithAuth) return;
    try {
      await fetchWithAuth({ url: serverSaveUrl, method: serverSaveMethod, data: { columns: next } });
    } catch (e) {
      // swallow server errors for now (optional: expose via callback)
      console.debug('ColumnSelector: server save failed', e?.message || e);
    }
  }, [serverSaveUrl, serverSaveMethod, fetchWithAuth]);

  const toggleKey = useCallback((key) => {
    const isVisible = !!visibilityMap[key]
    if (isVisible && visibleCount <= 1) {
      // prevent hiding last column
      return
    }
    const next = { ...(visibilityMap || {}), [key]: !isVisible }
    try {
      if (localStorageKey) persistLocal(localStorageKey, next)
    } catch (e) { }
    onChange(next)
    // persist to server if configured
    persistServer(next)
  }, [visibilityMap, visibleCount, localStorageKey, onChange, persistLocal, persistServer])

  // keyboard navigation and focus handling
  useEffect(() => {
    if (!open) return;
    // focus first enabled checkbox
    const container = listRef.current;
    if (!container) return;
    const first = container.querySelector('input[type=checkbox]:not(:disabled)');
    if (first && first.focus) first.focus();

    const onKey = (e) => {
      const focusable = Array.from(container.querySelectorAll('input[type=checkbox]'));
      if (!focusable || focusable.length === 0) return;
      const idx = focusable.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = focusable[(idx + 1) % focusable.length]; if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = focusable[(idx - 1 + focusable.length) % focusable.length]; if (prev) prev.focus();
      } else if (e.key === 'Home') { e.preventDefault(); focusable[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (e.key === ' ' || e.key === 'Enter') {
        // toggle current
        if (document.activeElement && document.activeElement.type === 'checkbox') {
          e.preventDefault(); document.activeElement.click();
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    container.addEventListener('keydown', onKey);
    return () => container.removeEventListener('keydown', onKey);
  }, [open]);

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
        <div className={`absolute right-0 mt-2 w-64 bg-white border rounded shadow p-3 z-50 transform transition-all duration-150 ${animState === 'entering' ? 'opacity-0 scale-95' : ''} ${animState === 'entered' ? 'opacity-100 scale-100' : ''}`} style={{ transformOrigin: 'top right' }}>
          <div className="text-sm font-medium text-gray-700 mb-2">Show Columns</div>
          <div className="space-y-2 max-h-60 overflow-auto" ref={listRef} tabIndex={-1}>
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
                      tabIndex={0}
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
