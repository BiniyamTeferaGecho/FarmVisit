import React, { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function AdminSessions() {
  const { fetchWithAuth, user } = useAuth()
  const [userId, setUserId] = useState('')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchSessions = async () => {
    if (!userId) { setMessage({ type: 'error', text: 'User ID is required' }); return }
    setLoading(true); setMessage(null)
    try {
      const res = await fetchWithAuth({ url: `/admin/users/${encodeURIComponent(userId)}/sessions`, method: 'get' })
      const data = res && res.sessions ? res.sessions : (res && res.sessions) || []
      setSessions(Array.isArray(data) ? data : [])
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Failed to fetch sessions' })
    } finally { setLoading(false) }
  }

  const invalidate = async () => {
    if (!userId) { setMessage({ type: 'error', text: 'User ID is required' }); return }
    if (!confirm(`Invalidate all sessions for user ${userId}?`)) return
    setLoading(true); setMessage(null)
    try {
      await fetchWithAuth({ url: `/admin/users/${encodeURIComponent(userId)}/sessions/invalidate`, method: 'post', data: {} })
      setMessage({ type: 'success', text: 'Sessions invalidated' })
      setSessions([])
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Failed to invalidate sessions' })
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6 bg-white rounded shadow-sm">
      <h3 className="text-lg font-medium mb-4">Admin: User Sessions</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm">User ID</label>
          <input className="w-full px-3 py-2 border rounded" value={userId} onChange={(e)=>setUserId(e.target.value)} placeholder="Enter UserID (GUID) or numeric id" />
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSessions} disabled={loading} className="px-3 py-2 bg-indigo-600 text-white rounded">{loading ? 'Loading...' : 'Fetch Sessions'}</button>
          <button onClick={invalidate} disabled={loading} className="px-3 py-2 bg-red-600 text-white rounded">Invalidate All</button>
        </div>
        {message && <div className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message.text}</div>}
        <div>
          <h4 className="text-sm font-medium">Sessions</h4>
          {sessions && sessions.length > 0 ? (
            <ul className="list-disc pl-5">
              {sessions.map(s => <li key={s}>{s}</li>)}
            </ul>
          ) : (<div className="text-xs text-slate-500">No sessions found.</div>)}
        </div>
      </div>
    </div>
  )
}
