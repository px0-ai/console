'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { api, ApiError } from '@/lib/api'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    document.title = 'Sign In | px0 Console'
  }, [])

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('Account created! Please sign in to verify your email.')
    }
    const paramEmail = searchParams.get('email')
    if (paramEmail) {
      setEmail(paramEmail)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await api.auth.login(email, password)
      login(res.token, res.user)
      router.replace('/')
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Email not verified. Check your inbox or resend below.')
      } else {
        setError(err instanceof Error ? err.message : 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <span className="logo">px<span className="accent">0</span></span>
      </div>
      <h1 className="auth-title">Sign in</h1>

      <form onSubmit={handleSubmit} className="auth-form">
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

        <div className="form-field">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/register" className="auth-link">Create account</Link>
        <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
