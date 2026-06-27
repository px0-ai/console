'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { api } from '@/lib/api'
import { LogOut } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, isLoaded, login, logout } = useAuth()
  const router = useRouter()

  // Verification state
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState('')
  const [verifyMsgType, setVerifyMsgType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    if (isLoaded && !token) router.replace('/login')
  }, [isLoaded, token, router])

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setVerifying(true)
    setVerifyMsg('')
    setVerifyMsgType('')
    try {
      await api.auth.verifyEmail(user.email, verificationCode)
      setVerifyMsg('Email verified successfully! Loading console...')
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

  async function handleSendCode() {
    if (!user) return
    setSendingCode(true)
    setVerifyMsg('')
    setVerifyMsgType('')
    try {
      await api.auth.triggerVerification(user.email)
      setVerifyMsg('Verification code sent to your email.')
      setVerifyMsgType('success')
      setCodeSent(true)
    } catch (err) {
      setVerifyMsg(err instanceof Error ? err.message : 'Failed to send code')
      setVerifyMsgType('error')
    } finally {
      setSendingCode(false)
    }
  }

  function handleLogout() {
    api.auth.logout().catch(() => {})
    logout()
    router.replace('/login')
  }

  if (!isLoaded) {
    return (
      <div className="loading-shell">
        <span className="sidebar-subtitle">loading...</span>
      </div>
    )
  }

  if (!token) return null

  // Block the UI and only show the verification flow if user is not verified
  if (user && !user.is_verified) {
    return (
      <div className="app-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '32px', border: '1px solid var(--bdr-hi)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Verify Your Email</h2>
            <button
              className="btn btn-ghost"
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              onClick={handleLogout}
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--txt-muted)', marginBottom: '24px', fontFamily: 'var(--font-sans)', lineHeight: '1.5' }}>
            Hi <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{user.email}</span>, you must verify your email address before accessing the px[0] console.
          </p>

          {!codeSent ? (
            <div>
              <p style={{ fontSize: '13px', marginBottom: 16, color: 'var(--txt-muted)' }}>
                Click the button below to generate and send a verification code to your email inbox.
              </p>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
              >
                {sendingCode ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            <div>
              <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="verify-code">Verification Code</label>
                  <input
                    id="verify-code"
                    className="input"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    required
                    autoFocus
                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '16px', fontWeight: 'bold' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} type="submit" disabled={verifying || !verificationCode.trim()}>
                    {verifying ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={handleSendCode} disabled={sendingCode}>
                    {sendingCode ? 'Resending...' : 'Resend'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {verifyMsg && (
            <p className="inline-error" style={{ marginTop: 16, textAlign: 'center', color: verifyMsgType === 'success' ? '#4ade80' : '#ef4444' }}>
              {verifyMsg}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}
