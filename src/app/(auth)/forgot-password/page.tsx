'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  async function handleTriggerReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await api.auth.triggerPasswordReset(email)
      setSuccess('Reset code sent! Please check your inbox.')
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger password reset')
    } finally {
      setLoading(false)
    }
  }

  async function handleCompleteReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await api.auth.resetPassword(code, newPassword)
      setSuccess('Password reset successfully! Redirecting to login...')
      setTimeout(() => {
        router.push(`/login?email=${encodeURIComponent(email)}`)
      }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <span className="logo">px<span className="accent">0</span></span>
      </div>
      <h1 className="auth-title">Reset password</h1>

      {step === 1 ? (
        <form onSubmit={handleTriggerReset} className="auth-form">
          <p style={{ fontSize: '13px', color: 'var(--txt-muted)', marginBottom: '16px' }}>
            Enter your email address and we will send you a code to reset your password.
          </p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success" style={{ color: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>{success}</div>}

          <div className="form-field">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !email.trim()}>
            {loading ? 'Sending code...' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCompleteReset} className="auth-form">
          <p style={{ fontSize: '13px', color: 'var(--txt-muted)', marginBottom: '16px' }}>
            A 6-digit verification code was sent to <strong>{email}</strong>. Enter the code and your new password.
          </p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success" style={{ color: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>{success}</div>}

          <div className="form-field">
            <label className="form-label" htmlFor="code">Reset code</label>
            <input
              id="code"
              type="text"
              className="input"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="123456"
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, mixed case + digit + symbol"
              required
              minLength={8}
            />
            <span className="form-hint">
              Must contain uppercase, lowercase, digit, and special character.
            </span>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !code.trim() || !newPassword.trim()}>
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-full"
            style={{ marginTop: '8px' }}
            onClick={() => setStep(1)}
            disabled={loading}
          >
            Back to email entry
          </button>
        </form>
      )}

      <div className="auth-links">
        <Link href="/login" className="auth-link">Back to sign in</Link>
      </div>
    </div>
  )
}
