'use client'

import { useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import type { ParsedTask } from '@/lib/types'

interface Props {
  hasExisting: boolean
  onParsed: (tasks: ParsedTask[]) => void
  onCancel?: () => void
}

const PLACEHOLDER = 'essay due friday, call the dentist, taxes this month, reply to the landlord…'

export function Capture({ hasExisting, onParsed, onCancel }: Props) {
  const [dump, setDump] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!dump.trim() || loading) return
    setLoading(true)
    try {
      const todayISO = new Date().toISOString().slice(0, 10)
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dump, todayISO }),
      })
      const payload = (await res.json()) as { tasks: ParsedTask[] } | { error: string }
      if (!res.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : `Request failed (${res.status})`)
      }
      onParsed(payload.tasks)
    } catch (e) {
      alert(`Could not read your brain dump.\n\n${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 clamp(20px,4vw,56px)' }}>
      <div style={{ animation: 'riseIn .7s cubic-bezier(.22,.61,.36,1) both', display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '30px 0 40px' }}>
        {/* Brand */}
        <div className="flex items-center gap-3" style={{ paddingTop: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid rgba(90,99,230,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 14px 2px rgba(90,99,230,.6)' }} />
          </div>
          <span className="mono" style={{ fontWeight: 600, letterSpacing: '.14em', fontSize: 13, textTransform: 'uppercase', color: 'rgba(243,245,244,.82)' }}>Clutch</span>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26, padding: '40px 0' }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 18px 4px rgba(90,99,230,.7)', animation: 'breathe 1.6s ease-in-out infinite' }} />
              <span style={{ fontSize: 16, color: 'var(--dim)' }}>Reading your mind…</span>
            </div>
            <div className="flex flex-col" style={{ gap: 13 }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <div key={i} className="shimmer" style={{ height: 62, borderRadius: 18, animationDelay: `${d}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 'clamp(36px,5vw,80px)', alignItems: 'center', padding: '48px 0' }}
          >
            <div className="flex flex-col">
              <h1 className="serif" style={{ fontWeight: 400, fontSize: 'clamp(44px,5.4vw,72px)', lineHeight: 1.02, letterSpacing: '-.015em', marginBottom: 22 }}>
                {hasExisting ? 'What else is on your mind?' : 'What’s weighing on you?'}
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--dim)', maxWidth: '32ch' }}>
                Dump it all out in plain words. Clutch sorts the chaos and decides what&apos;s about to blow up.
              </p>
            </div>

            <div className="flex flex-col" style={{ gap: 18 }}>
              <div className="glass" style={{ borderRadius: 24 }}>
                <textarea
                  value={dump}
                  onChange={(e) => setDump(e.target.value)}
                  placeholder={PLACEHOLDER}
                  autoFocus
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
                  style={{ width: '100%', minHeight: 232, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 17, lineHeight: 1.65, padding: 24 }}
                />
              </div>

              <button
                onClick={submit}
                disabled={!dump.trim()}
                className="btn-primary flex items-center justify-center gap-2.5"
                style={{ padding: 17, borderRadius: 16, fontSize: 16, opacity: dump.trim() ? 1 : 0.45, cursor: dump.trim() ? 'pointer' : 'not-allowed' }}
              >
                <span>{hasExisting ? 'Add to my list' : 'Sort this out'}</span>
                <ArrowRight size={18} weight="bold" />
              </button>

              <div className="flex items-center justify-between">
                <span className="mono" style={{ fontSize: 11, color: 'var(--faint)' }}>⌘ / Ctrl + Enter</span>
                {hasExisting && onCancel && (
                  <button onClick={onCancel} className="mono" style={{ fontSize: 12, color: 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer' }}>cancel</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
