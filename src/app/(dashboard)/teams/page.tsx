'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import type { Team } from '@/lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TeamRow({
  team,
  isMember,
  canEdit,
  onRequestJoin,
}: {
  team: Team
  isMember: boolean
  canEdit: boolean
  onRequestJoin: (team: Team) => void
}) {
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>
        <Link
          href={`/teams/${team.id}`}
          style={{ color: 'var(--txt)', textDecoration: 'none' }}
          className="hover-underline"
        >
          {team.name}
        </Link>
      </td>
      <td>
        {isMember ? (
          <span className="status-badge" style={{ borderColor: '#22c55e', color: '#22c55e', background: 'transparent', padding: '1px 6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Check size={11} strokeWidth={3} />
            Member
          </span>
        ) : (
          <button
            className="btn btn-primary"
            style={{ padding: '2px 8px', height: 'auto', fontSize: '11px', borderRadius: '4px' }}
            onClick={() => onRequestJoin(team)}
          >
            Request to Join
          </button>
        )}
      </td>
      <td className="td-mono">{fmtDate(team.created_at)}</td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Link
            href={`/teams/${team.id}/members`}
            className="btn btn-ghost"
            style={{ padding: '4px 10px', height: 'auto', fontSize: '12px' }}
          >
            Show Members
          </Link>
          {canEdit && (
            <Link
              href={`/teams/${team.id}`}
              className="btn btn-ghost"
              style={{ padding: '4px 10px', height: 'auto', fontSize: '12px', border: '1px solid var(--bdr-hi)' }}
            >
              Edit
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function TeamsPage() {
  const { user, organizations: orgs, teams: myTeams, isOrgAdmin, refreshTeams } = useAuth()
  const [allOrgTeams, setAllOrgTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [teamRoles, setTeamRoles] = useState<Record<string, string>>({})

  // Pagination State
  const [page, setPage] = useState(1)
  const limit = 5

  // Modals state
  const [joinRequestTeam, setJoinRequestTeam] = useState<Team | null>(null)
  const [justification, setJustification] = useState('')
  const [submittingJoin, setSubmittingJoin] = useState(false)
  const [joinErr, setJoinErr] = useState('')

  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [createTeamErr, setCreateTeamErr] = useState('')

  const loadData = useCallback(async () => {
    if (!orgs || orgs.length === 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // Fetch teams for the first organization
      const orgTeamsRes = await api.teams.listOrgTeams(orgs[0].id)
      setAllOrgTeams(orgTeamsRes?.teams ?? [])
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }, [orgs])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Client-side pagination
  const totalTeams = allOrgTeams.length
  const totalPages = Math.ceil(totalTeams / limit)
  const startIndex = (page - 1) * limit
  const paginatedTeams = allOrgTeams.slice(startIndex, startIndex + limit)

  // Fetch and cache user roles for paginated teams
  useEffect(() => {
    if (!user || paginatedTeams.length === 0) return

    paginatedTeams.forEach(t => {
      if (teamRoles[t.id] !== undefined) return

      api.teams.listMembers(t.id)
        .then(res => {
          const me = res.members?.find(m => m.user_id === user.id)
          setTeamRoles(prev => ({
            ...prev,
            [t.id]: me ? me.role : 'none'
          }))
        })
        .catch(() => {
          setTeamRoles(prev => ({
            ...prev,
            [t.id]: 'none'
          }))
        })
    })
  }, [paginatedTeams, user, teamRoles])

  // Request to Join handler
  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!joinRequestTeam) return
    setSubmittingJoin(true)
    setJoinErr('')
    try {
      await api.teams.createJoinRequest(joinRequestTeam.id, { justification })
      alert(`Join request submitted successfully for team "${joinRequestTeam.name}"! Justification: "${justification}"`)
      setJoinRequestTeam(null)
      setJustification('')
    } catch (err) {
      setJoinErr(err instanceof Error ? err.message : 'Failed to submit join request')
    } finally {
      setSubmittingJoin(false)
    }
  }

  // Create Team handler
  async function handleCreateTeamSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgs || orgs.length === 0) return
    setCreatingTeam(true)
    setCreateTeamErr('')
    try {
      await api.teams.create(orgs[0].id, newTeamName)
      setNewTeamName('')
      setShowCreateTeam(false)
      // Refresh teams in context so other components (e.g. Sidebar) update
      await refreshTeams()
      // Reload organization teams list
      await loadData()
    } catch (err) {
      setCreateTeamErr(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setCreatingTeam(false)
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Teams</h1>
          <p className="page-desc">
            {allOrgTeams.length} total team{allOrgTeams.length !== 1 ? 's' : ''} in your organization
          </p>
        </div>
        {isOrgAdmin && orgs.length > 0 && (
          <button className="btn btn-primary" onClick={() => setShowCreateTeam(true)}>
            <Plus size={13} />
            Create Team
          </button>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <span className="table-title">All Teams</span>
        </div>

        {loading ? (
          <div className="table-empty">Loading...</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ width: 220, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTeams.length === 0 ? (
                  <tr><td colSpan={4} className="table-empty">No teams found.</td></tr>
                ) : (
                  paginatedTeams.map(t => {
                    const isMember = myTeams.some(mt => mt.id === t.id)
                    const role = teamRoles[t.id]
                    const canEdit = isOrgAdmin || role === 'admin' || role === 'editor'
                    return (
                      <TeamRow
                        key={t.id}
                        team={t}
                        isMember={isMember}
                        canEdit={canEdit}
                        onRequestJoin={(team) => {
                          setJoinRequestTeam(team)
                          setJustification('')
                          setJoinErr('')
                        }}
                      />
                    )
                  })
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'var(--surface)', borderTop: '1px solid var(--bdr)' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ fontSize: '12px', height: '32px' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--txt-muted)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ fontSize: '12px', height: '32px' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Join Request Modal */}
      {joinRequestTeam && (
        <Modal
          title={`Request to Join: ${joinRequestTeam.name}`}
          onClose={() => setJoinRequestTeam(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setJoinRequestTeam(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleJoinSubmit} disabled={submittingJoin || !justification.trim()}>
                {submittingJoin ? 'Submitting...' : 'Submit Request'}
              </button>
            </>
          }
        >
          <form onSubmit={handleJoinSubmit}>
            {joinErr && <div className="auth-error">{joinErr}</div>}
            <div className="form-field">
              <label className="form-label" htmlFor="j-just">Justification *</label>
              <textarea
                id="j-just"
                className="input"
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder="Explain why you want to join this team..."
                required
                autoFocus
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Create Team Modal */}
      {showCreateTeam && (
        <Modal
          title="Create New Team"
          onClose={() => { setShowCreateTeam(false); setCreateTeamErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowCreateTeam(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateTeamSubmit} disabled={creatingTeam || !newTeamName.trim()}>
                {creatingTeam ? 'Creating...' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateTeamSubmit}>
            {createTeamErr && <div className="auth-error">{createTeamErr}</div>}
            <div className="form-field">
              <label className="form-label" htmlFor="t-name">Team Name *</label>
              <input
                id="t-name"
                className="input"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="e.g. Frontend Engineering"
                required
                autoFocus
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
