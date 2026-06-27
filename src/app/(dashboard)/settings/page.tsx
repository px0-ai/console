'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

export default function SettingsPage() {
  const { token, user, login } = useAuth()

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

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-desc">Account and workspace configuration</p>
      </div>

      {/* Account */}
      <div className="card" style={{ maxWidth: '520px' }}>
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
    </>
  )
}
