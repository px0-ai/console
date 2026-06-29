'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function OrgSettingsPage() {
  const { id } = useParams() as { id: string }
  const { user, organizations, isOrgAdmin: authIsOrgAdmin, refreshOrgs } = useAuth()

  const [activeTab, setActiveTab] = useState<'settings' | 'people'>('settings')
  const [orgName, setOrgName] = useState('Loading...')
  const [newName, setNewName] = useState('')
  
  // Settings Tab State
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // People Tab State
  const [people, setPeople] = useState<User[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Find organization from context to ensure the user actually belongs to it
  const org = organizations?.find(o => o.id?.toLowerCase() === id?.toLowerCase())
  const isOrgAdmin = authIsOrgAdmin || org?.role?.toLowerCase() === 'admin' || user?.is_admin || organizations?.some(o => o.id?.toLowerCase() === id?.toLowerCase() && o.role?.toLowerCase() === 'admin')

  // Initialize org details
  useEffect(() => {
    if (!id || !organizations || organizations.length === 0) return
    const found = organizations.find(o => o.id === id)
    if (found) {
      setOrgName(found.name)
      setNewName(found.name)
    } else {
      setOrgName('Organization')
    }
  }, [id, organizations])

  useEffect(() => {
    if (orgName && orgName !== 'Loading...') {
      document.title = `${orgName} | px0 Console`
    } else {
      document.title = 'Organization Details | px0 Console'
    }
  }, [orgName])

  // Save changes handler (PUT /v1/orgs/{id})
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !newName.trim()) return
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      await api.orgs.update(id, newName)
      setSuccessMsg(`Organization name successfully updated to "${newName}"!`)
      setOrgName(newName)
      await refreshOrgs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization name')
    } finally {
      setSaving(false)
    }
  }

  // Remove member handler (DELETE /v1/orgs/{orgID}/members/{userID})
  async function handleRemoveMember(userID: string, email: string) {
    if (!id) return
    if (!confirm(`Are you sure you want to permanently remove ${email} from the organization? This will remove them from all teams.`)) return
    try {
      await api.orgs.removeMember(id, userID)
      alert(`Successfully removed ${email} from the organization.`)
      loadPeople()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  // Fetch People list
  const loadPeople = useCallback(() => {
    if (!id || activeTab !== 'people') return
    setLoadingPeople(true)
    api.orgs.listPeople(id, page)
      .then(r => {
        setPeople(r.people ?? [])
        setTotalPages(Math.ceil((r.total ?? 0) / (r.limit ?? 10)) || 1)
      })
      .catch((err) => {
        console.error('Failed to load organization people', err)
        alert('You do not have access to view people in this organization.')
        setActiveTab('settings')
      })
      .finally(() => setLoadingPeople(false))
  }, [id, activeTab, page])

  useEffect(() => {
    loadPeople()
  }, [loadPeople])

  if (!org && organizations.length > 0) {
    return (
      <div className="table-empty" style={{ padding: '40px' }}>
        You do not belong to this organization or it does not exist.
      </div>
    )
  }

  return (
    <>
      <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <span style={{ color: 'var(--txt-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
          Organization
        </span>
        <ChevronRight size={12} style={{ color: 'var(--dim)' }} />
        <span style={{ color: 'var(--txt)', fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
          {orgName}
        </span>
        <ChevronRight size={12} style={{ color: 'var(--dim)' }} />
        <span style={{ color: 'var(--txt-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
          {activeTab === 'settings' ? 'Settings' : 'People'}
        </span>
      </div>

      <div className="page-header">
        <h1 className="page-title">{orgName}</h1>
        <p className="page-desc">
          Manage your organization name and view the people who belong to your organization.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '24px',
        borderBottom: '1px solid var(--bdr)',
        marginBottom: '24px',
        paddingBottom: '2px',
      }}>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'settings' ? '2px solid var(--yellow)' : '2px solid transparent',
            color: activeTab === 'settings' ? 'var(--txt)' : 'var(--txt-muted)',
            padding: '8px 4px',
            fontSize: '14px',
            fontWeight: activeTab === 'settings' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('people')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'people' ? '2px solid var(--yellow)' : '2px solid transparent',
            color: activeTab === 'people' ? 'var(--txt)' : 'var(--txt-muted)',
            padding: '8px 4px',
            fontSize: '14px',
            fontWeight: activeTab === 'people' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          People
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="table-wrap" style={{ padding: '24px' }}>
          <form onSubmit={handleSave} style={{ maxWidth: '480px' }}>
            {error && (
              <div className="auth-error" style={{ marginBottom: '20px' }}>
                {error}
              </div>
            )}
            {successMsg && (
              <div className="auth-success" style={{
                color: '#4ade80',
                backgroundColor: 'rgba(74, 222, 128, 0.08)',
                border: '1px solid rgba(74, 222, 128, 0.2)',
                padding: '10px 12px',
                borderRadius: 'var(--r)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono), monospace',
                marginBottom: '20px'
              }}>
                {successMsg}
              </div>
            )}

            <div className="form-field">
              <label className="form-label" htmlFor="org-name">Organization Name</label>
              <input
                id="org-name"
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={!isOrgAdmin || saving}
                placeholder="Organization Name"
                required
              />
            </div>

            {isOrgAdmin ? (
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !newName.trim() || newName === orgName}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {newName !== orgName && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setNewName(orgName)
                      setError('')
                      setSuccessMsg('')
                    }}
                    style={{ height: '34px', fontSize: '13px' }}
                  >
                    Reset
                  </button>
                )}
              </div>
            ) : (
              <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--txt-muted)', fontFamily: 'var(--font-sans)' }}>
                * You must be an Organization Admin to update organization settings.
              </p>
            )}
          </form>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-title">People in {orgName}</span>
          </div>

          {loadingPeople ? (
            <div className="table-empty">Loading...</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Global Role</th>
                    <th>Joined</th>
                    {isOrgAdmin && <th style={{ width: 100, textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {people.length === 0 ? (
                    <tr>
                      <td colSpan={isOrgAdmin ? 5 : 4} className="table-empty">
                        No members found.
                      </td>
                    </tr>
                  ) : (
                    people.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.email}</td>
                        <td>
                          {p.is_verified ? (
                            <span className="status-badge" style={{ borderColor: '#22c55e', color: '#22c55e', background: 'transparent', padding: '1px 6px', fontSize: '11px' }}>
                              Verified
                            </span>
                          ) : (
                            <span className="status-badge" style={{ borderColor: 'var(--txt-muted)', color: 'var(--txt-muted)', background: 'transparent', padding: '1px 6px', fontSize: '11px' }}>
                              Unverified
                            </span>
                          )}
                        </td>
                        <td>
                          {p.is_admin ? (
                            <span className="status-badge" style={{ borderColor: 'var(--violet)', color: 'var(--violet)', background: 'transparent', padding: '1px 6px', fontSize: '11px' }}>
                              Super Admin
                            </span>
                          ) : (
                            <span style={{ fontSize: '13px', color: 'var(--txt-muted)' }}>
                              User
                            </span>
                          )}
                        </td>
                        <td className="td-mono">{fmtDate(p.created_at)}</td>
                        {isOrgAdmin && (
                          <td style={{ textAlign: 'right' }}>
                            {p.email?.toLowerCase() !== user?.email?.toLowerCase() && (
                              <button
                                className="btn"
                                style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '4px 10px', fontSize: '11px', height: '26px', borderRadius: 'var(--r)' }}
                                onClick={() => handleRemoveMember(p.id, p.email)}
                                title="Remove member from organization"
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--bdr)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--txt-muted)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 12px', height: 'auto', fontSize: '12px' }}
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 12px', height: 'auto', fontSize: '12px' }}
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
