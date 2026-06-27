'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, UserX } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { TeamMember } from '@/lib/types'

const ROLES: TeamMember['role'][] = ['admin', 'editor', 'viewer']

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TeamMembersPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, organizations, teams, isOrgAdmin } = useAuth()

  const [teamName, setTeamName] = useState('Loading...')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = isOrgAdmin

  // Pagination State
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Actions state
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  // Load team name and verify access
  useEffect(() => {
    if (!id || !organizations || organizations.length === 0) return
    const found = teams?.find(t => t.id === id)
    if (found) {
      setTeamName(found.name)
    } else {
      // If not found in user's joined teams, check if it exists in organization
      api.teams.listOrgTeams(organizations[0].id).then(orgTeamsRes => {
        const foundOrgTeam = orgTeamsRes.teams?.find(t => t.id === id)
        if (foundOrgTeam) {
          setTeamName(foundOrgTeam.name)
        } else {
          setTeamName('Team')
        }
      }).catch(() => setTeamName('Team'))
    }
  }, [id, organizations, teams])

  // Fetch team members list
  function loadMembers() {
    if (!id) return
    setLoading(true)
    api.teams.listMembers(id, page)
      .then(r => {
        setMembers(r.members ?? [])
        setTotalPages(Math.ceil((r.total ?? 0) / (r.limit ?? 10)) || 1)
      })
      .catch((err) => {
        console.error('Failed to load team members', err)
        alert('You do not have access to view members for this team.')
        router.push('/teams')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMembers()
  }, [id, page])

  // Handle changing user role inside team
  async function handleRoleChange(userID: string, role: TeamMember['role']) {
    setUpdatingRole(userID)
    try {
      await api.teams.updateMemberRole(id, userID, role)
      setMembers(ms => ms.map(m => m.user_id === userID ? { ...m, role } : m))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setUpdatingRole(null)
    }
  }

  // Handle removing a member from team
  async function handleRemove(userID: string, email: string) {
    if (!confirm(`Remove ${email} from ${teamName}?`)) return
    try {
      await api.teams.removeMember(id, userID)
      setMembers(ms => ms.filter(m => m.user_id !== userID))
      // Reload members list in case count changes
      loadMembers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  return (
    <>
      <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Link href="/teams" style={{ color: 'var(--txt-muted)', textDecoration: 'none', fontSize: '13px', fontFamily: 'var(--font-mono)' }} className="hover-underline">
          Teams
        </Link>
        <ChevronRight size={12} style={{ color: 'var(--dim)' }} />
        <span style={{ color: 'var(--txt)', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
          {teamName}
        </span>
        <ChevronRight size={12} style={{ color: 'var(--dim)' }} />
        <span style={{ color: 'var(--txt-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
          Members
        </span>
      </div>

      <div className="page-header">
        <h1 className="page-title">Team Members</h1>
        <p className="page-desc">
          Managing members for team <span style={{ fontWeight: 600 }}>{teamName}</span>
        </p>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <span className="table-title">Members of {teamName}</span>
        </div>

        {loading ? (
          <div className="table-empty">Loading...</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  {isAdmin && <th style={{ width: 100, textAlign: 'right' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 4 : 3} className="table-empty">
                      No members found.
                    </td>
                  </tr>
                ) : (
                  members.map(m => (
                    <tr key={m.user_id}>
                      <td>{m.email}</td>
                      <td>
                        {isAdmin && m.user_id !== user?.id ? (
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
                      <td className="td-mono">{fmtDate(m.created_at)}</td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          {m.user_id !== user?.id && (
                            <button
                              className="btn"
                              style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '4px 10px', fontSize: '11px', height: '26px', borderRadius: 'var(--r)' }}
                              onClick={() => handleRemove(m.user_id, m.email)}
                              title="Remove member from team"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
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
    </>
  )
}
