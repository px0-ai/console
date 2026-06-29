'use client'

import { useEffect, useState } from 'react'
import { Inbox, Check, X, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import type { InboxItem } from '@/lib/types'

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const r = await api.inbox.get()
      setItems(r.inbox || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Inbox | px0 Console'
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResolve(id: string, decision: 'approved' | 'rejected') {
    if (!confirm(`Are you sure you want to ${decision} this join request?`)) return
    setProcessingId(id)
    setError('')
    try {
      await api.inbox.resolve(id, decision)
      // Update item in local list
      setItems(prev =>
        prev.map(item => (item.id === id ? { ...item, status: decision, updated_at: new Date().toISOString() } : item))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${decision} request`)
    } finally {
      setProcessingId(null)
    }
  }

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true
    return item.status === filter
  })

  return (
    <>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Inbox size={22} />
          Inbox & Team Join Requests
        </h1>
        <p className="page-desc">
          Manage pending team join requests submitted by users across the organization.
        </p>
      </div>

      {error && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--red)', background: 'rgba(239, 68, 68, 0.05)', marginBottom: '20px' }}>
          <AlertCircle size={16} color="var(--red)" />
          <span style={{ fontSize: '13px', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{error}</span>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <span className="table-title">Incoming Requests ({filteredItems.length})</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  textTransform: 'capitalize',
                  fontFamily: 'var(--font-mono)'
                }}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="table-empty">Loading Inbox...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Target Team</th>
                <th>Requester</th>
                <th>Requested At</th>
                <th>Status</th>
                <th style={{ width: 180, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No join requests found.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.team_name}</td>
                    <td className="td-mono">{item.user_email}</td>
                    <td className="td-mono">{fmtDate(item.created_at)}</td>
                    <td>
                      <span
                        className="badge-tag"
                        style={{
                          textTransform: 'uppercase',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor:
                            item.status === 'approved'
                              ? 'rgba(16, 185, 129, 0.1)'
                              : item.status === 'rejected'
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(234, 179, 8, 0.1)',
                          color:
                            item.status === 'approved'
                              ? '#10b981'
                              : item.status === 'rejected'
                              ? '#ef4444'
                              : '#eab308',
                          borderColor:
                            item.status === 'approved'
                              ? '#10b981'
                              : item.status === 'rejected'
                              ? '#ef4444'
                              : '#eab308'
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              borderColor: 'var(--green)',
                              color: 'var(--green)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            disabled={processingId !== null}
                            onClick={() => handleResolve(item.id, 'approved')}
                          >
                            <Check size={12} />
                            Approve
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              borderColor: 'var(--red)',
                              color: 'var(--red)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            disabled={processingId !== null}
                            onClick={() => handleResolve(item.id, 'rejected')}
                          >
                            <X size={12} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)' }}>
                          Resolved {fmtDate(item.updated_at)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
