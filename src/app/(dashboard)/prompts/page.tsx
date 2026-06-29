'use client'

import { useEffect, useState } from 'react'
import { Plus, Archive } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Prompt, Team } from '@/lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PromptsPage() {
  const { user, team, teams: authTeams, isOrgAdmin, teamRole, setTeam, organizations } = useAuth()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const [editableTeams, setEditableTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState('')

  const canEdit = isOrgAdmin || teamRole === 'admin' || teamRole === 'editor'

  useEffect(() => {
    if (!user) return
    const userID = user.id

    async function loadEditableTeams() {
      setLoadingTeams(true)
      try {
        let allTeams: Team[] = []
        if (isOrgAdmin && organizations.length > 0) {
          const res = await api.teams.listOrgTeams(organizations[0].id)
          allTeams = res?.teams ?? []
        } else {
          allTeams = authTeams || []
        }

        if (isOrgAdmin) {
          setEditableTeams(allTeams)
        } else {
          const filtered: Team[] = []
          await Promise.all(
            allTeams.map(async (t) => {
              try {
                const membersRes = await api.teams.listMembers(t.id)
                const me = membersRes.members?.find((m) => m.user_id === userID)
                if (me && (me.role === 'admin' || me.role === 'editor')) {
                  filtered.push(t)
                }
              } catch (err) {
                console.error(`Failed to load members for team ${t.id}:`, err)
              }
            })
          )
          setEditableTeams(filtered)
        }
      } catch (err) {
        console.error('Failed to load editable teams:', err)
      } finally {
        setLoadingTeams(false)
      }
    }

    loadEditableTeams()
  }, [user, authTeams, isOrgAdmin, organizations]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showCreate && editableTeams.length > 0) {
      const currentIsEditable = editableTeams.some(t => t.id === team?.id)
      setSelectedTeamId(currentIsEditable ? (team?.id || '') : editableTeams[0].id)
    }
  }, [showCreate, editableTeams, team])

  const [filterTeamId, setFilterTeamId] = useState('')
  const [filterStatus, setFilterStatus] = useState('active') // active, archived, all
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const teamIdParam = params.get('team_id')
    const statusParam = params.get('status')

    if (teamIdParam) {
      setFilterTeamId(teamIdParam)
    } else if (team) {
      setFilterTeamId(team.id)
    }

    if (statusParam) {
      setFilterStatus(statusParam)
    }

    setFiltersInitialized(true)
  }, [team]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!filtersInitialized) return

    const params = new URLSearchParams(window.location.search)
    if (filterTeamId) {
      params.set('team_id', filterTeamId)
    } else {
      params.delete('team_id')
    }
    if (filterStatus) {
      params.set('status', filterStatus)
    } else {
      params.delete('status')
    }
    const newSearch = params.toString()
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`
    window.history.replaceState(null, '', newUrl)
  }, [filterTeamId, filterStatus, filtersInitialized])

  async function load() {
    if (!filterTeamId) return
    setLoading(true)
    const params: { team_id?: string; archive?: boolean | string; status?: 'active' | 'archived'; all?: boolean } = {}
    
    if (filterStatus === 'archived') {
      params.status = 'archived'
    } else if (filterStatus === 'active') {
      params.status = 'active'
    } else if (filterStatus === 'all') {
      params.all = true
    }

    try {
      const r = await api.prompts.list(filterTeamId, params)
      setPrompts(r.prompts)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (!filtersInitialized) return
    load()
  }, [filterTeamId, filterStatus, filtersInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleResetFilters() {
    setFilterStatus('active')
    if (team) {
      setFilterTeamId(team.id)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeamId) return
    setCreateErr('')
    setCreating(true)
    try {
      const r = await api.prompts.create(selectedTeamId, newName, newDesc || undefined)
      if (selectedTeamId === team?.id) {
        setPrompts(p => [r.prompt, ...p])
      } else {
        const targetTeam = editableTeams.find(t => t.id === selectedTeamId)
        if (targetTeam) {
          setTeam(targetTeam)
        }
      }
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  async function handleArchive(id: string) {
    if (!canEdit) {
      alert('You do not have permission to archive prompts.')
      return
    }
    if (!confirm('Archive this prompt? This action cannot be undone.')) return
    try {
      await api.prompts.archive(id)
      if (filterStatus === 'active') {
        setPrompts(p => p.filter(x => x.id !== id))
      } else {
        setPrompts(p => p.map(x => x.id === id ? { ...x, status: 'archived' } : x))
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Archive failed')
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
            {(canEdit || editableTeams.length > 0) && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={13} />
                New Prompt
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', padding: '12px 16px', borderBottom: '1px solid var(--bdr)', alignItems: 'center', background: 'rgba(0,0,0,0.12)', flexWrap: 'wrap' }}>
            {/* Filter by Team */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.05em' }}>TEAM</span>
              <select
                className="select"
                style={{ height: '28px', padding: '2px 8px', fontSize: '12px', minWidth: '130px', background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', color: 'var(--txt)', outline: 'none' }}
                value={filterTeamId}
                onChange={e => setFilterTeamId(e.target.value)}
              >
                {authTeams?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>



            {/* Filter by Archive Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.05em' }}>STATUS</span>
              <select
                className="select"
                style={{ height: '28px', padding: '2px 8px', fontSize: '12px', background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', color: 'var(--txt)', outline: 'none' }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="active">Active Only</option>
                <option value="archived">Archived Only</option>
                <option value="all">All (Incl. Archived)</option>
              </select>
            </div>

            {/* Reset Filters / Reload button */}
            <button
              className="btn btn-ghost"
              style={{ height: '28px', padding: '0 10px', fontSize: '12px', marginLeft: 'auto', border: '1px solid var(--bdr)' }}
              onClick={handleResetFilters}
            >
              Reset
            </button>
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
                  <tr><td colSpan={canEdit ? 5 : 4} className="table-empty">No prompts.</td></tr>
                ) : (
                  prompts.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <a
                            href={`/prompts/${p.id}`}
                            style={{ color: 'var(--txt)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                          >
                            {p.name}
                          </a>
                          {p.status === 'archived' && <StatusBadge status="archived" />}
                        </div>
                      </td>
                      <td className="td-mono">{p.description || <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                      <td className="td-mono">{fmtDate(p.updated_at)}</td>
                      <td className="td-mono">{fmtDate(p.created_at)}</td>
                      {canEdit && (
                        <td>
                          {p.status !== 'archived' && (
                            <button
                              className="btn-icon danger"
                              onClick={() => handleArchive(p.id)}
                              title="Archive prompt"
                            >
                              <Archive size={13} />
                            </button>
                          )}
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

      {showCreate && (canEdit || editableTeams.length > 0) && (
        <Modal
          title="New Prompt"
          onClose={() => { setShowCreate(false); setCreateErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !newName.trim() || !selectedTeamId || loadingTeams}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreate}>
            {createErr && <div className="auth-error">{createErr}</div>}
            <div className="form-field">
              <label className="form-label" htmlFor="p-team">Team *</label>
              <select
                id="p-team"
                className="select"
                style={{ width: '100%' }}
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
                required
              >
                {loadingTeams ? (
                  <option value="" disabled>Loading teams...</option>
                ) : editableTeams.length === 0 ? (
                  <option value="" disabled>No teams with edit access</option>
                ) : (
                  editableTeams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="form-field" style={{ marginTop: 16 }}>
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
              <span className="form-hint" style={{ marginTop: 4, display: 'block', color: 'var(--txt-muted)' }}>
                The prompt name cannot be edited after creation. This is used as the unique identifier/slug to invoke and render the prompt via the API.
              </span>
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
