'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Prompt, PromptVersion } from '@/lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isOrgAdmin, teamRole } = useAuth()

  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newTemplate, setNewTemplate] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const canEdit = isOrgAdmin || teamRole === 'admin' || teamRole === 'editor'

  useEffect(() => {
    Promise.all([
      api.prompts.get(id),
      api.versions.list(id),
    ])
      .then(([p, v]) => {
        setPrompt(p.prompt)
        setVersions(v.versions)
      })
      .catch(() => router.replace('/prompts'))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateVersion(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setCreateErr('')
    setCreating(true)
    try {
      const r = await api.versions.create(id, newTemplate)
      router.push(`/prompts/${id}/versions/${r.version.version}`)
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Failed to create version')
      setCreating(false)
    }
  }

  async function handleDeleteVersion(versionNum: number) {
    if (!confirm(`Are you sure you want to delete draft version v${versionNum}?`)) return
    try {
      await api.versions.delete(id, versionNum)
      const v = await api.versions.list(id)
      setVersions(v.versions)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete version')
    }
  }

  if (loading) return <div className="table-empty">Loading...</div>
  if (!prompt) return null

  return (
    <>
      <div className="breadcrumb">
        <Link href="/prompts">Prompts</Link>
        <ChevronRight size={12} className="breadcrumb-sep" />
        <span style={{ color: 'var(--txt)' }}>{prompt.name}</span>
      </div>

      <div className="prompt-meta-card">
        <div className="prompt-meta-info">
          <p className="prompt-meta-name" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {prompt.name}
            {prompt.slug && (
              <span className="td-mono" style={{ fontSize: '11px', color: 'var(--txt-muted)', background: 'var(--code-bg)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'normal', border: '1px solid var(--bdr)', letterSpacing: '0.02em' }}>
                {prompt.slug}
              </span>
            )}
          </p>
          {prompt.description && (
            <p className="prompt-meta-desc">{prompt.description}</p>
          )}
          <p className="prompt-meta-desc" style={{ marginTop: 6, color: 'var(--dim)', fontSize: '12px' }}>
            {prompt.id} · updated {fmtDate(prompt.updated_at)}
          </p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowNewVersion(true)}>
            <Plus size={13} />
            New Version
          </button>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="table-title">Versions</span>
            <span style={{ fontSize: '11px', color: 'var(--txt-muted)', background: 'var(--code-bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--bdr)' }}>
              Publishing a version makes it read-only
            </span>
          </div>
          <span className="td-mono">{versions.length} total</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Status</th>
              <th>Created</th>
              <th>Published</th>
              <th style={{ width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {versions.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No versions yet. Create the first one.</td></tr>
            ) : (
              [...versions].reverse().map(v => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      v{v.version}
                      {v.tags && v.tags.map(tag => (
                        <span key={tag} className="tag-badge" style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'var(--code-bg)', color: 'var(--txt-muted)', border: '1px solid var(--bdr)', fontWeight: 'normal' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td><StatusBadge status={v.status} /></td>
                  <td className="td-mono">{fmtDate(v.created_at)}</td>
                  <td className="td-mono">
                    {v.published_at ? fmtDate(v.published_at) : <span style={{ color: 'var(--dim)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Link
                        href={`/prompts/${id}/versions/${v.version}`}
                        className="btn btn-ghost"
                        style={{ height: 28, padding: '0 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center' }}
                      >
                        Open
                      </Link>
                      {v.status === 'draft' && canEdit && (
                        <button
                          onClick={() => handleDeleteVersion(v.version)}
                          className="btn btn-ghost"
                          style={{ height: 28, padding: '0 10px', fontSize: '12px', color: '#f87171', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNewVersion && canEdit && (
        <Modal
          title="New Version"
          onClose={() => { setShowNewVersion(false); setCreateErr('') }}
          wide
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowNewVersion(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreateVersion}
                disabled={creating || !newTemplate.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </>
          }
        >
          {createErr && <div className="auth-error">{createErr}</div>}
          <div className="form-field">
            <label className="form-label">Template</label>
            <textarea
              className="input"
              style={{ minHeight: 180, fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.7 }}
              value={newTemplate}
              onChange={e => setNewTemplate(e.target.value)}
              placeholder={'Hello, {{.name}}!\n\nYour task is to...'}
              autoFocus
            />
            <span className="form-hint">Go template syntax. Use {'{{.variable}}'} for variables.</span>
          </div>
        </Modal>
      )}
    </>
  )
}
