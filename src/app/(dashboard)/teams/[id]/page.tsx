'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { Team, TeamMember } from '@/lib/types'

export default function EditTeamPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, organizations, teams, isOrgAdmin, refreshTeams } = useAuth()

  const [team, setTeam] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<TeamMember['role'] | null>(null)

  const canEdit = isOrgAdmin || userRole === 'admin' || userRole === 'editor'
  const canDelete = isOrgAdmin || userRole === 'admin'

  // Load team details and current user role
  useEffect(() => {
    if (deleting) return
    if (!id || !organizations || organizations.length === 0 || !user) return
    
    let isMounted = true
    setLoading(true)
    const currentUserID = user.id

    async function loadData() {
      try {
        // 1. Fetch team details
        let foundTeam: Team | undefined = teams?.find(t => t.id === id)
        if (!foundTeam) {
          const orgTeamsRes = await api.teams.listOrgTeams(organizations[0].id)
          foundTeam = orgTeamsRes.teams?.find(t => t.id === id)
        }

        if (!foundTeam) {
          if (isMounted) {
            alert('Team not found.')
            router.push('/teams')
          }
          return
        }

        if (isMounted) {
          setTeam(foundTeam)
          setName(foundTeam.name)
        }

        // 2. Fetch team members to determine current user's role in this team
        try {
          const membersRes = await api.teams.listMembers(id)
          const me = membersRes.members?.find(m => m.user_id === currentUserID)
          if (me && isMounted) {
            setUserRole(me.role)
          }
        } catch (err) {
          console.error('Failed to load team members for role check:', err)
        }

      } catch (err) {
        console.error('Failed to load team details:', err)
        if (isMounted) {
          router.push('/teams')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [id, organizations, teams, user, router, deleting])

  // Save changes handler
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.teams.update(id, name)
      alert(`Team name updated successfully to "${name}"!`)
      await refreshTeams()
      router.push('/teams')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team name')
    } finally {
      setSaving(false)
    }
  }

  // Delete team handler
  async function handleDelete() {
    if (!id || !team) return
    if (!confirm(`Are you sure you want to permanently delete team "${team.name}"? This action cannot be undone.`)) return
    setDeleting(true)
    setError('')
    try {
      await api.teams.delete(id)
      alert(`Team "${team.name}" has been successfully deleted.`)
      await refreshTeams()
      router.push('/teams')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="table-empty">Loading team details...</div>
  }

  return (
    <>
      <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Link href="/teams" style={{ color: 'var(--txt-muted)', textDecoration: 'none', fontSize: '13px', fontFamily: 'var(--font-mono)' }} className="hover-underline">
          Teams
        </Link>
        <ChevronRight size={12} style={{ color: 'var(--dim)' }} />
        <span style={{ color: 'var(--txt)', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
          {team?.name}
        </span>
        <ChevronRight size={12} style={{ color: 'var(--dim)' }} />
        <span style={{ color: 'var(--txt-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
          Edit
        </span>
      </div>

      <div className="page-header">
        <h1 className="page-title">Edit Team</h1>
        <p className="page-desc">
          Update settings and details for team <span style={{ fontWeight: 600 }}>{team?.name}</span>
        </p>
      </div>

      <div className="table-wrap" style={{ padding: '24px' }}>
        <form onSubmit={handleSave} style={{ maxWidth: '480px' }}>
          {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}
          
          <div className="form-field">
            <label className="form-label" htmlFor="edit-name">Team Name *</label>
            <input
              id="edit-name"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!canEdit || saving || deleting}
              required
              autoFocus
            />
          </div>

          {canEdit ? (
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || deleting || !name.trim() || name === team?.name}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href="/teams" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', height: '38px' }}>
                Cancel
              </Link>
            </div>
          ) : (
            <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
              * Only team editors or administrators can modify this team.
            </p>
          )}
        </form>

        {canDelete && (
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--bdr)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444', marginBottom: '8px' }}>Danger Zone</h3>
            <p style={{ fontSize: '13px', color: 'var(--txt-muted)', marginBottom: '16px' }}>
              Permanently delete this team and remove all associated members. This action is irreversible.
            </p>
            <button
              className="btn"
              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', fontSize: '13px', fontWeight: 500, borderRadius: 'var(--r)' }}
              onClick={handleDelete}
              disabled={saving || deleting}
            >
              {deleting ? 'Deleting Team...' : 'Delete Team'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
