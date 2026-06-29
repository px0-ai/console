'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Copy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import type { APIKey, APIKeyCreated } from '@/lib/types'

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ApiKeysPage() {
  const { team } = useAuth()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOp, setNewOp] = useState<'read_render' | 'all'>('read_render')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const [revealedKey, setRevealedKey] = useState<APIKeyCreated | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    if (!team) return
    setLoading(true)
    try {
      const r = await api.apiKeys.list(team.org_id)
      setKeys(r.api_keys)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    document.title = 'API Keys | px0 Console'
  }, [])

  useEffect(() => { load() }, [team]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!team) return
    setCreateErr('')
    setCreating(true)
    try {
      const r = await api.apiKeys.create(newName, team.org_id, newOp)
      setRevealedKey(r)
      setShowCreate(false)
      setNewName('')
      setNewOp('read_render')
      await load()
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Revoke and delete this API key? This cannot be undone.')) return
    try {
      await api.apiKeys.delete(id)
      setKeys(k => k.filter(x => x.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  function copyKey() {
    if (!revealedKey) return
    navigator.clipboard.writeText(revealedKey.key).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">API Keys</h1>
        <p className="page-desc">
          {team ? `org ${team.org_id.slice(0, 8)}... · ${keys.length} key${keys.length !== 1 ? 's' : ''}` : 'Select a team to manage API keys'}
        </p>
      </div>

      {!team ? (
        <div className="card" style={{ maxWidth: '400px' }}>
          <p className="card-label">No team selected</p>
          <p style={{ fontSize: '13px', color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
            Select a team from the sidebar.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-title">API Keys</span>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={13} />
              Create Key
            </button>
          </div>

          {loading ? (
            <div className="table-empty">Loading...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Scope</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr><td colSpan={6} className="table-empty">No API keys yet.</td></tr>
                ) : (
                  keys.map(k => (
                    <tr key={k.id}>
                      <td style={{ fontWeight: 600 }}>{k.name}</td>
                      <td className="td-mono">{k.key_prefix}</td>
                      <td>
                        <span className="badge-tag">
                          {k.operation === 'all' ? 'all' : 'read/render'}
                        </span>
                      </td>
                      <td className="td-mono">{fmtDate(k.created_at)}</td>
                      <td className="td-mono">{fmtDate(k.last_used_at)}</td>
                      <td>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDelete(k.id)}
                          title="Delete key"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showCreate && (
        <Modal
          title="Create API Key"
          onClose={() => { setShowCreate(false); setCreateErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create Key'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            {createErr && <div className="auth-error">{createErr}</div>}
            <div className="form-field">
              <label className="form-label" htmlFor="k-name">Name *</label>
              <input
                id="k-name"
                className="input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. ci-pipeline"
                required
                autoFocus
              />
            </div>
            <div className="form-field" style={{ marginTop: 16 }}>
              <label className="form-label" htmlFor="k-op">Scope</label>
              <select
                id="k-op"
                className="select"
                value={newOp}
                onChange={e => setNewOp(e.target.value as 'read_render' | 'all')}
              >
                <option value="read_render">read / render (recommended)</option>
                <option value="all">all operations</option>
              </select>
              <span className="form-hint">
                read/render allows rendering prompts. all allows full CRUD.
              </span>
            </div>
          </form>
        </Modal>
      )}

      {revealedKey && (
        <Modal
          title="API Key Created"
          onClose={() => setRevealedKey(null)}
          footer={
            <button className="btn btn-primary" onClick={() => setRevealedKey(null)}>
              Done
            </button>
          }
        >
          <div className="key-warning">
            Copy this key now. It will not be shown again.
          </div>
          <div style={{ position: 'relative' }}>
            <div className="key-reveal">{revealedKey.key}</div>
            <button
              className="btn btn-ghost"
              style={{ position: 'absolute', top: 8, right: 8, height: 28, padding: '0 10px', fontSize: '12px' }}
              onClick={copyKey}
            >
              <Copy size={11} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="form-field">
            <span className="form-label">Name</span>
            <span className="td-mono" style={{ paddingTop: 2 }}>{revealedKey.name}</span>
          </div>
          <div className="form-field">
            <span className="form-label">Scope</span>
            <span className="td-mono" style={{ paddingTop: 2 }}>{revealedKey.operation}</span>
          </div>
        </Modal>
      )}
    </>
  )
}
