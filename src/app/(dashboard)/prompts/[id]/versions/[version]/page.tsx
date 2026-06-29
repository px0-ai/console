'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Play, Save, Upload, FolderOpen, Trash2, Edit2, Check, X, ChevronDown, Plus, Copy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { JsonEditor } from '@/components/ui/JsonEditor'
import type { Prompt, PromptVersion } from '@/lib/types'

interface SavedPayload {
  id: string
  name: string
  variables: string
  updatedAt: number
}

export default function VersionEditorPage() {
  const { id, version } = useParams<{ id: string; version: string }>()
  const vNum = parseInt(version, 10)
  const router = useRouter()
  const { isOrgAdmin, teamRole } = useAuth()

  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [ver, setVer] = useState<PromptVersion | null>(null)
  const [template, setTemplate] = useState('')
  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const [renderVars, setRenderVars] = useState('{}')
  const [renderOutput, setRenderOutput] = useState('')
  const [renderErr, setRenderErr] = useState('')
  const [rendering, setRendering] = useState(false)

  const isDraft = ver?.status === 'draft'
  const isStable = ver?.status === 'stable'
  const isLive = ver?.status === 'live'
  const isArchived = ver?.status === 'archived'
  const canEdit = isOrgAdmin || teamRole === 'admin' || teamRole === 'editor'

  const [savedPayloads, setSavedPayloads] = useState<SavedPayload[]>([])
  const [isPayloadsOpen, setIsPayloadsOpen] = useState(false)
  const [isSavingCurrent, setIsSavingCurrent] = useState(false)
  const [newPayloadName, setNewPayloadName] = useState('')
  const [editingPayloadId, setEditingPayloadId] = useState<string | null>(null)
  const [editingPayloadName, setEditingPayloadName] = useState('')
  const [newTagInput, setNewTagInput] = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPayloadsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('duplicated') === 'true') {
        setActionMsg('New version created.')
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
      }
    }
  }, [])

  useEffect(() => {
    if (prompt && ver) {
      document.title = `v${ver.version} - ${prompt.name} | px0 Console`
    } else {
      document.title = `v${version} | px0 Console`
    }
  }, [prompt, ver, version])

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTagInput.trim()
    if (!trimmed || !ver) return

    api.versions.setTag(id, ver.version, trimmed)
      .then((res) => {
        setVer(res.version)
        setNewTagInput('')
      })
      .catch((err) => {
        alert(err instanceof Error ? err.message : 'Failed to add tag')
      })
  }

  const handleRemoveTag = (tag: string) => {
    if (!confirm(`Are you sure you want to remove the tag "${tag}"?`)) return
    api.versions.removeTag(id, tag)
      .then(() => {
        setVer((prev) => {
          if (!prev) return null
          return {
            ...prev,
            tags: (prev.tags || []).filter((t) => t !== tag)
          }
        })
      })
      .catch((err) => {
        alert(err instanceof Error ? err.message : 'Failed to remove tag')
      })
  }

  const handleSavePayload = () => {
    let parsedVars = {}
    try {
      parsedVars = JSON.parse(renderVars)
    } catch {
      alert('Cannot save invalid JSON as a payload.')
      return
    }

    api.payloads.create(id, parsedVars)
      .then((res) => {
        const payload = res.payload
        if (newPayloadName.trim()) {
          return api.payloads.update(id, payload.id, newPayloadName.trim(), parsedVars)
        }
        return { payload }
      })
      .then((res) => {
        const item = res.payload
        const mapped: SavedPayload = {
          id: item.id,
          name: item.name || 'Unnamed Payload',
          variables: JSON.stringify(item.variables, null, 2),
          updatedAt: new Date(item.updated_at).getTime()
        }
        setSavedPayloads(prev => [...prev, mapped])
        setNewPayloadName('')
        setIsSavingCurrent(false)
      })
      .catch((err) => {
        alert(err instanceof Error ? err.message : 'Failed to save payload')
      })
  }

  const handleLoadPayload = (payload: SavedPayload) => {
    setRenderVars(payload.variables)
    setIsPayloadsOpen(false)
  }

  const handleStartRename = (payload: SavedPayload, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPayloadId(payload.id)
    setEditingPayloadName(payload.name)
  }

  const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (!editingPayloadName.trim() || !editingPayloadId) return

    const target = savedPayloads.find(p => p.id === editingPayloadId)
    if (!target) return

    api.payloads.update(id, editingPayloadId, editingPayloadName.trim(), JSON.parse(target.variables))
      .then((res) => {
        const item = res.payload
        setSavedPayloads(prev => prev.map(p => {
          if (p.id === editingPayloadId) {
            return {
              ...p,
              name: item.name || 'Unnamed Payload',
              updatedAt: new Date(item.updated_at).getTime()
            }
          }
          return p
        }))
        setEditingPayloadId(null)
        setEditingPayloadName('')
      })
      .catch((err) => {
        alert(err instanceof Error ? err.message : 'Rename failed')
      })
  }

  const handleCancelRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    setEditingPayloadId(null)
    setEditingPayloadName('')
  }

  const handleDeletePayload = (payloadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this saved payload?')) return
    api.payloads.delete(id, payloadId)
      .then(() => {
        setSavedPayloads(prev => prev.filter(p => p.id !== payloadId))
      })
      .catch((err) => {
        alert(err instanceof Error ? err.message : 'Delete failed')
      })
  }

  useEffect(() => {
    Promise.all([
      api.prompts.get(id),
      api.versions.get(id, vNum),
      api.payloads.list(id),
    ])
      .then(([p, v, pay]) => {
        setPrompt(p.prompt)
        setVer(v.version)
        setTemplate(v.version.template)
        const mapped = (pay.payloads || []).map(item => ({
          id: item.id,
          name: item.name || 'Unnamed Payload',
          variables: JSON.stringify(item.variables, null, 2),
          updatedAt: new Date(item.updated_at).getTime()
        }))
        setSavedPayloads(mapped)
      })
      .catch(() => router.replace(`/prompts/${id}`))
      .finally(() => setLoading(false))
  }, [id, vNum]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    setSaveMsg('')
    try {
      const r = await api.versions.update(id, vNum, template)
      setVer(r.version)
      setSaveMsg('Saved.')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handlePromote() {
    if (!canEdit || !ver) return
    const confirmMsg = isDraft
      ? 'Promote this version to Stable? It will become read-only.'
      : 'Promote this version to Live? The current live version will be demoted to stable.'
    if (!confirm(confirmMsg)) return

    setActionLoading(true)
    setActionMsg('')
    try {
      const r = await api.versions.promote(id, vNum)
      setVer(r.version)
      setActionMsg(isDraft ? 'Promoted to Stable.' : 'Promoted to Live.')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Promotion failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDemote() {
    if (!canEdit || !ver) return
    if (!confirm('Demote this live version to Stable?')) return

    setActionLoading(true)
    setActionMsg('')
    try {
      const r = await api.versions.demote(id, vNum)
      setVer(r.version)
      setActionMsg('Demoted to Stable.')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Demotion failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDuplicate() {
    if (!canEdit || !ver) return
    if (!confirm('Duplicate this version?')) return

    setActionLoading(true)
    setActionMsg('')
    try {
      const r = await api.versions.duplicate(id, vNum)
      router.push(`/prompts/${id}/versions/${r.version.version}?duplicated=true`)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Duplication failed')
      setActionLoading(false)
    }
  }

  async function handleArchiveVersion() {
    if (!canEdit || !ver) return
    if (!confirm('Archive this version?')) return

    setActionLoading(true)
    setActionMsg('')
    try {
      const r = await api.versions.archive(id, vNum)
      setVer(r.version)
      setActionMsg('Archived.')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Archiving failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRender() {
    setRenderErr('')
    setRenderOutput('')
    setRendering(true)
    try {
      let vars: Record<string, unknown> = {}
      try { vars = JSON.parse(renderVars) } catch { setRenderErr('Variables must be valid JSON'); setRendering(false); return }
      const r = await api.versions.render(id, vNum, vars)
      setRenderOutput(r.rendered)
    } catch (err) {
      setRenderErr(err instanceof Error ? err.message : 'Render failed')
    } finally {
      setRendering(false)
    }
  }

  if (loading) return <div className="table-empty">Loading...</div>
  if (!prompt || !ver) return null

  return (
    <>
      <div className="breadcrumb">
        <Link href="/prompts">Prompts</Link>
        <ChevronRight size={12} className="breadcrumb-sep" />
        <Link href={`/prompts/${id}`}>{prompt.name}</Link>
        <ChevronRight size={12} className="breadcrumb-sep" />
        <span style={{ color: 'var(--txt)' }}>v{ver.version}</span>
      </div>

      <div className="version-header">
        <span className="version-title">v{ver.version}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <StatusBadge status={ver.status} />

          {/* Tags list */}
          {ver.tags && ver.tags.map(tag => (
            <span
              key={tag}
              className="badge-tag"
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(234, 179, 8, 0.05)',
                border: '1px solid var(--bdr)',
                color: 'var(--txt-muted)',
              }}
            >
              {tag}
              {canEdit && (
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: 'var(--dim)',
                  }}
                  onClick={() => handleRemoveTag(tag)}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
                  title={`Remove tag ${tag}`}
                >
                  <X size={10} />
                </button>
              )}
            </span>
          ))}

          {/* Add Tag form */}
          {canEdit && (
            <form
              onSubmit={handleAddTag}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <input
                type="text"
                placeholder="+ tag"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                style={{
                  width: '64px',
                  height: '22px',
                  padding: '0 6px',
                  fontSize: '11px',
                  background: 'var(--bg)',
                  border: '1px dashed var(--bdr)',
                  borderRadius: '4px',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                }}
                title="Only lowercase alphanumeric, dots, dashes, underscores"
              />
            </form>
          )}
        </div>
        {saveMsg && <span className="inline-error" style={{ color: saveMsg === 'Saved.' ? '#4ade80' : undefined }}>{saveMsg}</span>}
        {actionMsg && <span className="inline-error" style={{ color: actionMsg.endsWith('.') ? '#4ade80' : undefined }}>{actionMsg}</span>}
        <div className="version-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canEdit && (
            <>
              <button className="btn btn-ghost" onClick={handleDuplicate} disabled={saving || actionLoading} title="Duplicate this version to create a new draft">
                <Copy size={13} />
                {actionLoading ? 'Duplicating...' : 'Duplicate'}
              </button>
              {!isArchived && (
                <>
                  {isDraft && (
                    <>
                      <span style={{ fontSize: '11px', color: 'var(--txt-muted)', marginRight: '4px' }}>
                        Promoting a version makes it read-only
                      </span>
                      <button className="btn btn-ghost" onClick={handleSave} disabled={saving || actionLoading} title="Save this prompt">
                        <Save size={13} />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button className="btn btn-primary" onClick={handlePromote} disabled={saving || actionLoading}>
                        <Upload size={13} />
                        {actionLoading ? 'Promoting...' : 'Promote to Stable'}
                      </button>
                    </>
                  )}
                  {isStable && (
                    <>
                      <button className="btn btn-primary" onClick={handlePromote} disabled={actionLoading}>
                        <Upload size={13} />
                        {actionLoading ? 'Promoting...' : 'Promote to Live'}
                      </button>
                    </>
                  )}
                  {isLive && (
                    <>
                      <button className="btn btn-ghost" onClick={handleDemote} disabled={actionLoading}>
                        Demote to Stable
                      </button>
                    </>
                  )}
                  <button className="btn btn-danger" onClick={handleArchiveVersion} disabled={saving || actionLoading} style={{ height: 38 }}>
                    Archive
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="editor-grid">
        {/* Template panel */}
        <div className="editor-panel">
          <div className="editor-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="editor-panel-title">Template</span>
              <span style={{ color: 'var(--txt-muted)', fontSize: '11px' }}>•</span>
              <a
                href="https://docs.px0.ai/template-syntax"
                target="_blank"
                rel="noopener noreferrer"
                className="hover-underline"
                style={{
                  fontSize: '11px',
                  color: 'var(--violet)',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                Template Syntax Guide
              </a>
            </div>
            {(!isDraft || !canEdit) && (
              <span className="td-mono" style={{ fontSize: '11px' }}>read-only</span>
            )}
          </div>
          <textarea
            className="editor-textarea"
            value={template}
            onChange={e => setTemplate(e.target.value)}
            readOnly={!isDraft || !canEdit}
            spellCheck={false}
          />
        </div>

        {/* Render panel */}
        <div className="editor-panel">
          <div className="editor-panel-header">
            <span className="editor-panel-title">Test Render</span>
            <button
              className="btn btn-success"
              style={{ height: 28, padding: '0 10px', fontSize: '12px' }}
              onClick={handleRender}
              disabled={rendering}
            >
              <Play size={11} />
              {rendering ? 'Rendering...' : 'Render'}
            </button>
          </div>

          <div className="render-pane">
            <div className="render-vars-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <p className="render-vars-label">Variables (JSON)</p>
                <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                  <button
                    type="button"
                    className="payloads-select-btn"
                    onClick={() => setIsPayloadsOpen(!isPayloadsOpen)}
                  >
                    <FolderOpen size={11} />
                    Payloads ({savedPayloads.length})
                    <ChevronDown size={10} />
                  </button>
                  <button
                    type="button"
                    className="payloads-select-btn"
                    title="Save current variables as payload"
                    onClick={() => {
                      try {
                        JSON.parse(renderVars)
                        setIsSavingCurrent(true)
                        setIsPayloadsOpen(true)
                      } catch {
                        alert('Please enter valid JSON in the editor before saving.')
                      }
                    }}
                    style={{ padding: '6px' }}
                  >
                    <Save size={11} />
                  </button>

                  {isPayloadsOpen && (
                    <div className="payloads-dropdown">
                      <div className="payloads-dropdown-header" style={{ padding: '4px 8px', borderBottom: '1px solid var(--bdr)', fontSize: '10px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>SAVED PAYLOADS</span>
                        <button
                          type="button"
                          className="payload-action-btn"
                          title="Save current"
                          onClick={() => {
                            try {
                              JSON.parse(renderVars)
                              setIsSavingCurrent(true)
                            } catch {
                              alert('Please enter valid JSON in the editor before saving.')
                            }
                          }}
                          style={{ color: 'var(--yellow)' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {isSavingCurrent && (
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input
                            type="text"
                            placeholder="Payload name..."
                            value={newPayloadName}
                            onChange={e => setNewPayloadName(e.target.value)}
                            style={{
                              background: 'var(--bg)',
                              border: '1px solid var(--bdr)',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              fontSize: '11px',
                              color: 'var(--txt)',
                              width: '100%',
                              outline: 'none',
                              fontFamily: 'var(--font-mono)'
                            }}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSavePayload()
                              if (e.key === 'Escape') setIsSavingCurrent(false)
                            }}
                          />
                          <div style={{ display: 'flex', gap: '4px', alignSelf: 'flex-end' }}>
                            <button
                              type="button"
                              className="json-editor-btn"
                              onClick={handleSavePayload}
                              style={{ fontSize: '9px', padding: '2px 6px' }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="json-editor-btn"
                              onClick={() => setIsSavingCurrent(false)}
                              style={{ fontSize: '9px', padding: '2px 6px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
                        {savedPayloads.length === 0 ? (
                          <div style={{ padding: '12px 8px', fontSize: '10px', color: 'var(--muted)', textAlign: 'center' }}>
                            No saved payloads
                          </div>
                        ) : (
                          savedPayloads.map(payload => (
                            <div
                              key={payload.id}
                              className="payloads-dropdown-item"
                              onClick={() => handleLoadPayload(payload)}
                            >
                              {editingPayloadId === payload.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }} onClick={e => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editingPayloadName}
                                    onChange={e => setEditingPayloadName(e.target.value)}
                                    style={{
                                      background: 'var(--bg)',
                                      border: '1px solid var(--bdr)',
                                      borderRadius: '4px',
                                      padding: '2px 4px',
                                      fontSize: '11px',
                                      color: 'var(--txt)',
                                      width: '100%',
                                      outline: 'none',
                                      fontFamily: 'var(--font-mono)'
                                    }}
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveRename(e)
                                      if (e.key === 'Escape') handleCancelRename(e)
                                    }}
                                  />
                                  <button type="button" className="payload-action-btn" onClick={handleSaveRename}>
                                    <Check size={11} />
                                  </button>
                                  <button type="button" className="payload-action-btn" onClick={handleCancelRename}>
                                    <X size={11} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={payload.name}>
                                    {payload.name}
                                  </span>
                                  <div className="payloads-dropdown-actions">
                                    <button
                                      type="button"
                                      className="payload-action-btn"
                                      title="Rename"
                                      onClick={e => handleStartRename(payload, e)}
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    <button
                                      type="button"
                                      className="payload-action-btn delete"
                                      title="Delete"
                                      onClick={e => handleDeletePayload(payload.id, e)}
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <JsonEditor
                value={renderVars}
                onChange={setRenderVars}
                placeholder={'{\n  "name": "Alice"\n}'}
              />
            </div>

            <div className="render-output-section">
              {renderErr ? (
                <p className="render-error">{renderErr}</p>
              ) : renderOutput ? (
                <p className="render-output">{renderOutput}</p>
              ) : (
                <p className="render-placeholder">Output will appear here after rendering.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
