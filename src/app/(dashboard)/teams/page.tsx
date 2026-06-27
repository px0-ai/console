'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, UserX } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { Team, TeamMember } from '@/lib/types'

const ROLES: TeamMember['role'][] = ['admin', 'editor', 'viewer']

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TeamRow({ team, currentUserId, isAdmin }: { team: Team; currentUserId?: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  async function loadMembers() {
    if (members.length) { setOpen(o => !o); return }
    setOpen(true)
    setLoadingMembers(true)
    try {
      const r = await api.teams.listMembers(team.id)
      setMembers(r.members)
    } catch {}
    setLoadingMembers(false)
  }

  async function handleRoleChange(userID: string, role: TeamMember['role']) {
    setUpdatingRole(userID)
    try {
      await api.teams.updateMemberRole(team.id, userID, role)
      setMembers(ms => ms.map(m => m.user_id === userID ? { ...m, role } : m))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setUpdatingRole(null)
    }
  }

  async function handleRemove(userID: string, email: string) {
    if (!confirm(`Remove ${email} from ${team.name}?`)) return
    try {
      await api.teams.removeMember(team.id, userID)
      setMembers(ms => ms.filter(m => m.user_id !== userID))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={loadMembers}>
        <td style={{ fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {open ? <ChevronDown size={13} style={{ color: 'var(--muted)' }} /> : <ChevronRight size={13} style={{ color: 'var(--muted)' }} />}
            {team.name}
          </span>
        </td>
        <td className="td-mono">{team.id.slice(0, 8)}...</td>
        <td className="td-mono">{team.org_id.slice(0, 8)}...</td>
        <td className="td-mono">{fmtDate(team.created_at)}</td>
      </tr>

      {open && (
        <tr>
          <td colSpan={4} style={{ padding: 0, background: 'var(--bg)' }}>
            <div style={{ padding: '12px 24px 16px 36px' }}>
              {loadingMembers ? (
                <p className="td-mono">Loading members...</p>
              ) : members.length === 0 ? (
                <p className="td-mono" style={{ color: 'var(--dim)' }}>No members found.</p>
              ) : (
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ background: 'transparent', paddingLeft: 0 }}>Email</th>
                      <th style={{ background: 'transparent' }}>Role</th>
                      <th style={{ background: 'transparent' }}>Joined</th>
                      {isAdmin && <th style={{ background: 'transparent', width: 48 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.user_id} style={{ borderBottom: 'none' }}>
                        <td style={{ paddingLeft: 0, background: 'transparent' }}>{m.email}</td>
                        <td style={{ background: 'transparent' }}>
                          {isAdmin && m.user_id !== currentUserId ? (
                            <select
                              className="select"
                              style={{ height: 28, fontSize: '12px' }}
                              value={m.role}
                              onChange={e => handleRoleChange(m.user_id, e.target.value as TeamMember['role'])}
                              disabled={updatingRole === m.user_id}
                            >
                              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          ) : (
                            <span className="badge-tag">{m.role}</span>
                          )}
                        </td>
                        <td className="td-mono" style={{ background: 'transparent' }}>{fmtDate(m.created_at)}</td>
                        {isAdmin && (
                          <td style={{ background: 'transparent' }}>
                            {m.user_id !== currentUserId && (
                              <button
                                className="btn-icon danger"
                                onClick={() => handleRemove(m.user_id, m.email)}
                                title="Remove member"
                              >
                                <UserX size={13} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.teams.listMine()
      .then(r => setTeams(r.teams ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Teams</h1>
        <p className="page-desc">{teams.length} team{teams.length !== 1 ? 's' : ''} · click a team to see members</p>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <span className="table-title">Your Teams</span>
        </div>

        {loading ? (
          <div className="table-empty">Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Team ID</th>
                <th>Org ID</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr><td colSpan={4} className="table-empty">No teams found.</td></tr>
              ) : (
                teams.map(t => (
                  <TeamRow
                    key={t.id}
                    team={t}
                    currentUserId={user?.id}
                    isAdmin={user?.is_admin}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
