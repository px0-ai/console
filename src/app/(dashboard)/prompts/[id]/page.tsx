'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Prompt, PromptVersion, PromptTag } from '@/lib/types'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isOrgAdmin, teamRole } = useAuth()

  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [availableTags, setAvailableTags] = useState<PromptTag[]>([])
  const [promptLoading, setPromptLoading] = useState(true)
  const [versionsLoading, setVersionsLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newTemplate, setNewTemplate] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const [showEditPrompt, setShowEditPrompt] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [updatingPrompt, setUpdatingPrompt] = useState(false)
  const [updatePromptErr, setUpdatePromptErr] = useState('')

  const canEdit = isOrgAdmin || teamRole === 'admin' || teamRole === 'editor'

  useEffect(() => {
    Promise.all([
      api.prompts.get(id),
      api.prompts.listTags(id).catch(() => ({ tags: [] })),
    ])
      .then(([p, t]) => {
        setPrompt(p.prompt)
        setAvailableTags(t.tags)
      })
      .catch(() => router.replace('/prompts'))
      .finally(() => setPromptLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (prompt) {
      document.title = `${prompt.name} | px0 Console`
    } else {
      document.title = 'Prompt Detail | px0 Console'
    }
  }, [prompt])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status') || ''
    const tag = params.get('tag') || ''
    setStatusFilter(status)
    setTagFilter(tag)
    setFiltersInitialized(true)
  }, [])

  useEffect(() => {
    if (!filtersInitialized) return

    const params = new URLSearchParams(window.location.search)
    if (statusFilter) {
      params.set('status', statusFilter)
    } else {
      params.delete('status')
    }
    if (tagFilter) {
      params.set('tag', tagFilter)
    } else {
      params.delete('tag')
    }
    const newSearch = params.toString()
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`
    window.history.replaceState(null, '', newUrl)
  }, [statusFilter, tagFilter, filtersInitialized])

  useEffect(() => {
    if (!filtersInitialized) return

    setVersionsLoading(true)
    api.versions.list(id, {
      status: statusFilter || undefined,
      tags: tagFilter || undefined,
    })
      .then(v => {
        setVersions(v.versions)
      })
      .catch(err => {
        console.error('Failed to load versions', err)
      })
      .finally(() => setVersionsLoading(false))
  }, [id, statusFilter, tagFilter, filtersInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleOpenEdit() {
    if (!prompt) return
    setEditDesc(prompt.description || '')
    setUpdatePromptErr('')
    setShowEditPrompt(true)
  }

  async function handleUpdatePrompt(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt || !canEdit) return
    setUpdatePromptErr('')
    setUpdatingPrompt(true)
    try {
      const r = await api.prompts.update(id, prompt.name, editDesc, prompt.slug)
      setPrompt(r.prompt)
      setShowEditPrompt(false)
    } catch (err) {
      setUpdatePromptErr(err instanceof Error ? err.message : 'Failed to update prompt')
    } finally {
      setUpdatingPrompt(false)
    }
  }

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
      const [t, v] = await Promise.all([
        api.prompts.listTags(id).catch(() => ({ tags: [] })),
        api.versions.list(id, {
          status: statusFilter || undefined,
          tags: tagFilter || undefined,
        })
      ])
      setAvailableTags(t.tags)
      setVersions(v.versions)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete version')
    }
  }

  if (promptLoading) return <div className="table-empty">Loading...</div>
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={handleOpenEdit} style={{ border: '1px solid var(--bdr)' }}>
              Edit
            </button>
            <button className="btn btn-primary" onClick={() => setShowNewVersion(true)}>
              <Plus size={13} />
              New Version
            </button>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <div className="table-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="table-title">Versions</span>
          </div>
          <span className="td-mono">
            {(statusFilter || tagFilter) ? `${versions.length} matching` : `${versions.length} total`}
          </span>
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', gap: '16px', padding: '12px 20px', borderBottom: '1px solid var(--bdr)', alignItems: 'center', background: 'rgba(0,0,0,0.12)', flexWrap: 'wrap' }}>
          {/* Filter by Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.05em' }}>STATUS</span>
            <select
              className="select"
              style={{ height: '28px', padding: '2px 8px', fontSize: '12px', background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', color: 'var(--txt)', outline: 'none' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="stable">Stable</option>
              <option value="live">Live</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Filter by Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.05em' }}>TAG</span>
            <select
              className="select"
              style={{ height: '28px', padding: '2px 8px', fontSize: '12px', background: 'var(--bg)', border: '1px solid var(--bdr)', borderRadius: 'var(--r)', color: 'var(--txt)', outline: 'none', minWidth: '120px' }}
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
            >
              <option value="">All Tags</option>
              {availableTags.map(t => (
                <option key={t.tag} value={t.tag}>
                  {t.tag} (v{t.version})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(statusFilter || tagFilter) && (
            <button
              className="btn btn-ghost"
              style={{ height: '28px', padding: '0 10px', fontSize: '12px', marginLeft: 'auto', border: '1px solid var(--bdr)' }}
              onClick={() => {
                setStatusFilter('')
                setTagFilter('')
              }}
            >
              Reset
            </button>
          )}
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
            {versionsLoading ? (
              <tr><td colSpan={5} className="table-empty">Loading versions...</td></tr>
            ) : versions.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-empty">
                  {statusFilter || tagFilter ? 'No versions matching filters.' : 'No versions yet. Create the first one.'}
                </td>
              </tr>
            ) : (
              [...versions].reverse().map(v => (
                <tr key={v.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        href={`/prompts/${id}/versions/${v.version}`}
                        style={{ color: 'var(--txt)', textDecoration: 'none' }}
                        className="hover-underline"
                      >
                        v{v.version}
                      </Link>
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

      {showEditPrompt && canEdit && (
        <Modal
          title="Edit Prompt"
          onClose={() => { setShowEditPrompt(false); setUpdatePromptErr('') }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowEditPrompt(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleUpdatePrompt}
                disabled={updatingPrompt}
              >
                {updatingPrompt ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          {updatePromptErr && <div className="auth-error">{updatePromptErr}</div>}
          <div className="form-field">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="input"
              value={prompt.name}
              readOnly
              disabled
              style={{ background: 'var(--code-bg)', color: 'var(--txt-muted)', cursor: 'not-allowed' }}
            />
            <span className="form-hint">Prompt name cannot be modified.</span>
          </div>

          <div className="form-field" style={{ marginTop: '16px' }}>
            <label className="form-label">Slug</label>
            <input
              type="text"
              className="input td-mono"
              value={prompt.slug || ''}
              readOnly
              disabled
              style={{ background: 'var(--code-bg)', color: 'var(--txt-muted)', cursor: 'not-allowed' }}
            />
            <span className="form-hint">Prompt slug cannot be modified.</span>
          </div>

          <div className="form-field" style={{ marginTop: '16px' }}>
            <label className="form-label">Description</label>
            <textarea
              className="input"
              style={{ minHeight: 100, lineHeight: 1.5 }}
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Enter a description for this prompt..."
              autoFocus
            />
            <span className="form-hint">Brief summary explaining the prompt&apos;s purpose.</span>
          </div>
        </Modal>
      )}
    </>
  )
}
