'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import type { Prompt } from '@/lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PromptsPage() {
  const { team, isOrgAdmin, teamRole } = useAuth()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const canEdit = isOrgAdmin || teamRole === 'admin' || teamRole === 'editor'

  async function load() {
    if (!team) return
    setLoading(true)
    try {
      const r = await api.prompts.list(team.id)
      setPrompts(r.prompts)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [team]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!team || !canEdit) return
    setCreateErr('')
    setCreating(true)
    try {
      const r = await api.prompts.create(team.id, newName, newDesc || undefined)
      setPrompts(p => [r.prompt, ...p])
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!canEdit) {
      alert('You do not have permission to delete prompts.')
      return
    }
    if (!confirm('Delete this prompt and all its versions? This cannot be undone.')) return
    try {
      await api.prompts.delete(id)
      setPrompts(p => p.filter(x => x.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Prompts</h1>
        <p className="page-desc">
          {team ? `${team.name} · ${prompts.length} prompt${prompts.length !== 1 ? 's' : ''}` : 'Select a team to view prompts'}
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
            <span className="table-title">All Prompts</span>
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={13} />
                New Prompt
              </button>
            )}
          </div>

          {loading ? (
            <div className="table-empty">Loading...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Updated</th>
                  <th>Created</th>
                  {canEdit && <th style={{ width: 48 }}></th>}
                </tr>
              </thead>
              <tbody>
                {prompts.length === 0 ? (
                  <tr><td colSpan={canEdit ? 5 : 4} className="table-empty">No prompts yet. Create your first one.</td></tr>
                ) : (
                  prompts.map(p => (
                    <tr key={p.id}>
                      <td>
                        <a
                          href={`/prompts/${p.id}`}
                          style={{ color: 'var(--txt)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                        >
                          {p.name}
                        </a>
                      </td>
                      <td className="td-mono">{p.description || <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                      <td className="td-mono">{fmtDate(p.updated_at)}</td>
                      <td className="td-mono">{fmtDate(p.created_at)}</td>
                      {canEdit && (
                        <td>
                          <button
                            className="btn-icon danger"
                            onClick={() => handleDelete(p.id)}
                            title="Delete prompt"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showCreate && canEdit && (
        <Modal
          title="New Prompt"
          onClose={() => { setShowCreate(false); setCreateErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            {createErr && <div className="auth-error">{createErr}</div>}
            <div className="form-field">
              <label className="form-label" htmlFor="p-name">Name *</label>
              <input
                id="p-name"
                className="input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. system-prompt"
                required
                autoFocus
              />
            </div>
            <div className="form-field" style={{ marginTop: 16 }}>
              <label className="form-label" htmlFor="p-desc">Description</label>
              <input
                id="p-desc"
                className="input"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Brief description of what this prompt does"
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
