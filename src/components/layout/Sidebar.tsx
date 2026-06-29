'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Key,
  Users,
  Settings,
  LogOut,
  Inbox,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { api } from '@/lib/api'

const NAV = [
  { label: 'Dashboard', href: '/',         icon: LayoutDashboard },
  { label: 'Prompts',   href: '/prompts',   icon: FileText },
  { label: 'API Keys',  href: '/api-keys',  icon: Key },
  { label: 'Teams',     href: '/teams',     icon: Users },
  { label: 'Inbox',     href: '/inbox',     icon: Inbox },
  { label: 'Settings',  href: '/settings',  icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { organizations, logout } = useAuth()
  const org = organizations.length > 0 ? organizations[0] : null
  const [health, setHealth] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    let active = true
    function check() {
      api.system.health()
        .then((res) => {
          if (active) {
            setHealth(res.status === 'OK' ? 'ok' : 'error')
          }
        })
        .catch(() => {
          if (active) {
            setHealth('error')
          }
        })
    }
    check()
    const timer = setInterval(check, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  function handleLogout() {
    api.auth.logout().catch(() => {})
    logout()
    window.location.href = '/login'
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="sidebar">
      <div className="sidebar-logo-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', cursor: 'pointer' }}>
            <span className="logo">px<span className="accent">[0]</span></span>
            <span className="sidebar-subtitle">console</span>
          </div>
        </Link>
        {org && (
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--txt-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link
              href={`/orgs/${org.id}`}
              style={{
                color: 'var(--txt-muted)',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--txt)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--txt-muted)')}
            >
              {org.name}
            </Link>
            <span style={{ color: 'var(--dim)' }}>·</span>
            <span style={{ textTransform: 'capitalize' }}>{org.role}</span>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <p className="sidebar-section-label">Navigation</p>
        <nav className="sidebar-nav">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-link${isActive(href) ? ' active' : ''}`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div
        style={{
          padding: '8px 20px',
          borderTop: '1px solid var(--bdr)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--txt-muted)',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background:
              health === 'ok'
                ? '#10b981'
                : health === 'error'
                ? '#ef4444'
                : '#eab308',
            boxShadow:
              health === 'ok'
                ? '0 0 8px #10b981'
                : health === 'error'
                ? '0 0 8px #ef4444'
                : '0 0 8px #eab308',
            display: 'inline-block',
          }}
        ></span>
        <span>
          {health === 'ok' ? 'API: Online' : health === 'error' ? 'API: Offline' : 'API: Checking...'}
        </span>
      </div>

      <div className="sidebar-footer">
        <ThemeToggle />
        <button className="btn-icon" onClick={handleLogout} aria-label="Logout" title="Logout">
          <LogOut size={14} />
        </button>
        <span className="sidebar-version">v0.1.0</span>
      </div>
    </aside>
  )
}
