'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

export default function SettingsPage() {
  const { token, user, team, login } = useAuth()
  const [teamName, setTeamName] = useState(team?.name ?? '')
  const [savingTeam, setSavingTeam] = useState(false)
  const [teamMsg, setTeamMsg] = useState('')

  const [orgName, setOrgName] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)
  const [orgMsg, setOrgMsg] = useState('')

  // Verification state
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState('')
  const [verifyMsgType, setVerifyMsgType] = useState<'success' | 'error' | ''>('')

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setVerifying(true)
    setVerifyMsg('')
    setVerifyMsgType('')
    try {
      await api.auth.verifyEmail(user.email, verificationCode)
      setVerifyMsg('Email verified successfully!')
      setVerifyMsgType('success')
      // Refresh user profile
      const meRes = await api.auth.me()
      if (token) {
        login(token, meRes.user)
      }
    } catch (err) {
      setVerifyMsg(err instanceof Error ? err.message : 'Verification failed')
      setVerifyMsgType('error')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResendCode() {
    if (!user) return
    setResending(true)
    setVerifyMsg('')
    setVerifyMsgType('')
    try {
      await api.auth.triggerVerification(user.email)
      setVerifyMsg('Verification code sent to your email.')
      setVerifyMsgType('success')
    } catch (err) {
      setVerifyMsg(err instanceof Error ? err.message : 'Failed to send code')
      setVerifyMsgType('error')
    } finally {
      setResending(false)
    }
  }

  async function handleUpdateTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!team) return
    setSavingTeam(true)
    setTeamMsg('')
    try {
      await api.teams.update(team.id, teamName)
      setTeamMsg('Team name updated.')
    } catch (err) {
      setTeamMsg(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingTeam(false)
    }
  }

  async function handleUpdateOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!team) return
    setSavingOrg(true)
    setOrgMsg('')
    try {
      await api.orgs.update(team.org_id, orgName)
      setOrgMsg('Organization name updated.')
    } catch (err) {
      setOrgMsg(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingOrg(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-desc">Account and workspace configuration</p>
      </div>

      {/* Account */}
      <div className="card" style={{ maxWidth: '520px', marginBottom: 16 }}>
        <p className="card-label">Account</p>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: !user?.is_verified ? 16 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span className="td-mono" style={{ color: 'var(--muted)' }}>Email</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{user?.email ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span className="td-mono" style={{ color: 'var(--muted)' }}>Role</span>
            <span className="badge-tag">{user?.is_admin ? 'admin' : 'user'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span className="td-mono" style={{ color: 'var(--muted)' }}>Verified</span>
            <span className="badge-tag" style={{ backgroundColor: user?.is_verified ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: user?.is_verified ? '#4ade80' : '#ef4444' }}>
              {user?.is_verified ? 'yes' : 'no'}
            </span>
          </div>
        </div>

        {!user?.is_verified && user?.email && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
            <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--txt-muted)' }}>
              Your email is unverified. Please enter the verification code sent to your inbox.
            </p>
            <form onSubmit={handleVerifyEmail} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" htmlFor="verify-code">Verification Code</label>
                <input
                  id="verify-code"
                  className="input"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" type="submit" disabled={verifying || !verificationCode.trim()}>
                  {verifying ? 'Verifying...' : 'Verify'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={handleResendCode} disabled={resending}>
                  {resending ? 'Sending...' : 'Resend'}
                </button>
              </div>
            </form>

            {verifyMsg && (
              <p className="inline-error" style={{ marginTop: 8, color: verifyMsgType === 'success' ? '#4ade80' : '#ef4444' }}>
                {verifyMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Team */}
      {team && (
        <div className="card" style={{ maxWidth: '520px', marginBottom: 16 }}>
          <p className="card-label">Team</p>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span className="td-mono" style={{ color: 'var(--muted)' }}>ID</span>
              <span className="td-mono">{team.id}</span>
            </div>
          </div>

          {user?.is_admin && (
            <form onSubmit={handleUpdateTeam} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: 1 }}>
                <label className="form-label">Name</label>
                <input
                  className="input"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="Team name"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={savingTeam || !teamName.trim()}>
                {savingTeam ? 'Saving...' : 'Save'}
              </button>
            </form>
          )}

          {teamMsg && (
            <p className="inline-error" style={{ marginTop: 8, color: teamMsg.includes('updated') ? '#4ade80' : undefined }}>
              {teamMsg}
            </p>
          )}
        </div>
      )}

      {/* Organization (admin only) */}
      {user?.is_admin && team && (
        <div className="card" style={{ maxWidth: '520px' }}>
          <p className="card-label">Organization</p>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span className="td-mono" style={{ color: 'var(--muted)' }}>ID</span>
              <span className="td-mono">{team.org_id}</span>
            </div>
          </div>

          <form onSubmit={handleUpdateOrg} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">Name</label>
              <input
                className="input"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Organization name"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingOrg || !orgName.trim()}>
              {savingOrg ? 'Saving...' : 'Save'}
            </button>
          </form>

          {orgMsg && (
            <p className="inline-error" style={{ marginTop: 8, color: orgMsg.includes('updated') ? '#4ade80' : undefined }}>
              {orgMsg}
            </p>
          )}
        </div>
      )}
    </>
  )
}
