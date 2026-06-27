'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { Team } from '@/lib/types'

export default function EditTeamPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [team, setTeam] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Load team details
  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.teams.listMine()
      .then(res => {
        const found = res.teams?.find(t => t.id === id)
        if (found) {
          setTeam(found)
          setName(found.name)
        } else {
          // If not found in joined teams, fetch from org teams
          api.orgs.listMine().then(orgsRes => {
            if (orgsRes.organizations && orgsRes.organizations.length > 0) {
              api.teams.listOrgTeams(orgsRes.organizations[0].id).then(orgTeamsRes => {
                const foundOrgTeam = orgTeamsRes.teams?.find(t => t.id === id)
                if (foundOrgTeam) {
                  setTeam(foundOrgTeam)
                  setName(foundOrgTeam.name)
                } else {
                  alert('Team not found.')
                  router.push('/teams')
                }
              }).catch(() => router.push('/teams'))
            } else {
              router.push('/teams')
            }
          }).catch(() => router.push('/teams'))
        }
      })
      .catch(() => router.push('/teams'))
      .finally(() => setLoading(false))
  }, [id])

  // Load admin role status
  useEffect(() => {
    api.orgs.listMine()
      .then(r => {
        const hasAdmin = r.organizations?.some(o => o.role === 'admin') || user?.is_admin
        setIsAdmin(!!hasAdmin)
      })
      .catch(() => {})
  }, [user])

  // Save changes handler
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.teams.update(id, name)
      alert(`Team name updated successfully to "${name}"!`)
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
              disabled={!isAdmin || saving || deleting}
              required
              autoFocus
            />
          </div>

          {isAdmin ? (
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
              * Only organization administrators can modify or delete teams.
            </p>
          )}
        </form>

        {isAdmin && (
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
