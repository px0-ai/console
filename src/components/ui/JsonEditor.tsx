'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

interface JsonEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

function highlightJson(jsonStr: string): string {
  if (!jsonStr) return ''

  // Escape HTML tags to prevent security issues and layout breakage
  const html = jsonStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Tokenize JSON parts:
  // - Key names (e.g. "key":)
  // - Value strings (e.g. "value")
  // - Numbers, booleans, null
  // - Braces, square brackets, colons, commas
  const jsonRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\]:,])/g

  return html.replace(jsonRegex, (match) => {
    let cls = 'json-value'

    if (match.startsWith('"')) {
      if (match.endsWith(':')) {
        cls = 'json-key'
        const keyVal = match.slice(0, -1)
        return `<span class="${cls}">${keyVal}</span><span class="json-operator">:</span>`
      } else {
        cls = 'json-string'
      }
    } else if (match === 'true' || match === 'false') {
      cls = 'json-boolean'
    } else if (match === 'null') {
      cls = 'json-null'
    } else if (/^-?\d/.test(match)) {
      cls = 'json-number'
    } else if ('{}[]'.includes(match)) {
      cls = 'json-brace'
    } else if (match === ':' || match === ',') {
      cls = 'json-operator'
    }

    return `<span class="${cls}">${match}</span>`
  })
}

export function JsonEditor({ value, onChange, placeholder }: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [highlightedHtml, setHighlightedHtml] = useState('')

  // Keep highlighted overlay in sync with the value
  useEffect(() => {
    setHighlightedHtml(highlightJson(value))
  }, [value])

  // Scroll synchronization
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop
      preRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // Handle Tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const val = textarea.value

      const newValue = val.substring(0, start) + '  ' + val.substring(end)
      onChange(newValue)

      // Reset selection position after React updates the DOM
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
        }
      }, 0)
    }
  }

  // Format JSON automatically
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value)
      const formatted = JSON.stringify(parsed, null, 2)
      onChange(formatted)
    } catch {
      // If invalid, do nothing or let the user handle it
    }
  }

  // Try to parse to see if "Format" is currently clickable
  let isValidJson = false
  try {
    JSON.parse(value)
    isValidJson = true
  } catch {
    isValidJson = false
  }

  return (
    <div className={`json-editor-container ${isFocused ? 'focused' : ''}`}>
      <div className="json-editor-header">
        <span className="json-editor-header-title">JSON Editor</span>
        <button
          type="button"
          className="json-editor-btn"
          onClick={handleFormat}
          disabled={!isValidJson}
          style={{ opacity: isValidJson ? 1 : 0.5, cursor: isValidJson ? 'pointer' : 'not-allowed' }}
          title={isValidJson ? 'Format JSON' : 'Enter valid JSON to enable formatting'}
        >
          <Sparkles size={11} />
          Format
        </button>
      </div>

      <div className="json-editor-body">
        <textarea
          ref={textareaRef}
          className="json-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          spellCheck={false}
          placeholder={placeholder || '{\n  "key": "value"\n}'}
        />
        <pre ref={preRef} className="json-editor-pre">
          <code dangerouslySetInnerHTML={{ __html: highlightedHtml || placeholder || '{\n  "key": "value"\n}' }} />
        </pre>
      </div>
    </div>
  )
}
