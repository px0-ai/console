'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
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

  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newTemplate, setNewTemplate] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

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
          <p className="prompt-meta-name">{prompt.name}</p>
          {prompt.description && (
            <p className="prompt-meta-desc">{prompt.description}</p>
          )}
          <p className="prompt-meta-desc" style={{ marginTop: 6, color: 'var(--dim)', fontSize: '12px' }}>
            {prompt.id} · updated {fmtDate(prompt.updated_at)}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewVersion(true)}>
          <Plus size={13} />
          New Version
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <span className="table-title">Versions</span>
          <span className="td-mono">{versions.length} total</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Status</th>
              <th>Created</th>
              <th>Published</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {versions.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">No versions yet. Create the first one.</td></tr>
            ) : (
              [...versions].reverse().map(v => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>v{v.version}</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td className="td-mono">{fmtDate(v.created_at)}</td>
                  <td className="td-mono">
                    {v.published_at ? fmtDate(v.published_at) : <span style={{ color: 'var(--dim)' }}>—</span>}
                  </td>
                  <td>
                    <Link
                      href={`/prompts/${id}/versions/${v.version}`}
                      className="btn btn-ghost"
                      style={{ height: 28, padding: '0 10px', fontSize: '12px' }}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNewVersion && (
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
