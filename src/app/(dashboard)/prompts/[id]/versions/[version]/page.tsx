'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Play, Save, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { Prompt, PromptVersion } from '@/lib/types'

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
  const [publishing, setPublishing] = useState(false)
  const [publishMsg, setPublishMsg] = useState('')

  const [renderVars, setRenderVars] = useState('{}')
  const [renderOutput, setRenderOutput] = useState('')
  const [renderErr, setRenderErr] = useState('')
  const [rendering, setRendering] = useState(false)

  const isDraft = ver?.status === 'draft'
  const canEdit = isOrgAdmin || teamRole === 'admin' || teamRole === 'editor'

  useEffect(() => {
    Promise.all([
      api.prompts.get(id),
      api.versions.get(id, vNum),
    ])
      .then(([p, v]) => {
        setPrompt(p.prompt)
        setVer(v.version)
        setTemplate(v.version.template)
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

  async function handlePublish() {
    if (!canEdit) return
    if (!confirm('Publish this version? The current live version will be archived.')) return
    setPublishing(true)
    setPublishMsg('')
    try {
      const r = await api.versions.publish(id, vNum)
      setVer(r.version)
      setPublishMsg('Published.')
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
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
        <StatusBadge status={ver.status} />
        {saveMsg && <span className="inline-error" style={{ color: saveMsg === 'Saved.' ? '#4ade80' : undefined }}>{saveMsg}</span>}
        {publishMsg && <span className="inline-error" style={{ color: publishMsg === 'Published.' ? '#4ade80' : undefined }}>{publishMsg}</span>}
        <div className="version-actions">
          {isDraft && canEdit && (
            <>
              <button className="btn btn-ghost" onClick={handleSave} disabled={saving}>
                <Save size={13} />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-primary" onClick={handlePublish} disabled={publishing}>
                <Upload size={13} />
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="editor-grid">
        {/* Template panel */}
        <div className="editor-panel">
          <div className="editor-panel-header">
            <span className="editor-panel-title">Template</span>
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
              className="btn btn-ghost"
              style={{ height: 28, padding: '0 10px', fontSize: '12px' }}
              onClick={handleRender}
              disabled={rendering}
            >
              <Play size={11} />
              {rendering ? 'Running...' : 'Run'}
            </button>
          </div>

          <div className="render-pane">
            <div className="render-vars-section">
              <p className="render-vars-label">Variables (JSON)</p>
              <textarea
                className="render-vars-input"
                value={renderVars}
                onChange={e => setRenderVars(e.target.value)}
                spellCheck={false}
                placeholder={'{\n  "name": "Alice"\n}'}
              />
            </div>

            <div className="render-output-section">
              {renderErr ? (
                <p className="render-error">{renderErr}</p>
              ) : renderOutput ? (
                <p className="render-output">{renderOutput}</p>
              ) : (
                <p className="render-placeholder">Output will appear here after running.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
