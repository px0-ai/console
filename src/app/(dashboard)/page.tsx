'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Key, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { Prompt, Team } from '@/lib/types'

export default function DashboardPage() {
  const { user, team } = useAuth()
  const [promptCount, setPromptCount] = useState<number | null>(null)
  const [teams, setTeams] = useState<Team[]>([])

  useEffect(() => {
    api.teams.listMine()
      .then(r => setTeams(r.teams ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!team) return
    api.prompts.list(team.id)
      .then(r => setPromptCount(r.prompts.length))
      .catch(() => setPromptCount(0))
  }, [team])

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-desc">
          {user?.email}
          {team ? ` · ${team.name}` : ''}
        </p>
      </div>

      {!team ? (
        <div className="card" style={{ maxWidth: '400px' }}>
          <p className="card-label">Getting started</p>
          <p style={{ fontSize: '13px', color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
            Select a team from the sidebar to get started.
          </p>
        </div>
      ) : (
        <div className="stat-grid">
          <Link href="/prompts" className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <FileText size={15} style={{ color: 'var(--violet)', flexShrink: 0 }} />
              <p className="card-label" style={{ marginBottom: 0 }}>Prompts</p>
            </div>
            <p className="card-value">{promptCount ?? '--'}</p>
            <p className="card-sub">in {team.name}</p>
          </Link>

          <Link href="/api-keys" className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Key size={15} style={{ color: 'var(--violet)', flexShrink: 0 }} />
              <p className="card-label" style={{ marginBottom: 0 }}>API Keys</p>
            </div>
            <p className="card-value">--</p>
            <p className="card-sub">org {team.org_id.slice(0, 8)}...</p>
          </Link>

          <Link href="/teams" className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Users size={15} style={{ color: 'var(--violet)', flexShrink: 0 }} />
              <p className="card-label" style={{ marginBottom: 0 }}>Teams</p>
            </div>
            <p className="card-value">{teams.length || '--'}</p>
            <p className="card-sub">your teams</p>
          </Link>
        </div>
      )}
    </>
  )
}
