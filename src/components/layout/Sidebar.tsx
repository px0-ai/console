'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Key,
  Users,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { api } from '@/lib/api'
import type { Team, OrganizationWithRole } from '@/lib/types'

const NAV = [
  { label: 'Dashboard', href: '/',         icon: LayoutDashboard },
  { label: 'Prompts',   href: '/prompts',   icon: FileText },
  { label: 'API Keys',  href: '/api-keys',  icon: Key },
  { label: 'Teams',     href: '/teams',     icon: Users },
  { label: 'Settings',  href: '/settings',  icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { teams, organizations, team, setTeam, logout } = useAuth()
  const org = organizations.length > 0 ? organizations[0] : null

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
            <span>{org.name}</span>
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
