'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowCounterClockwise, Brain } from '@phosphor-icons/react'
import type { ReflectionData, Session } from '@/lib/types'

interface Props {
  session: Session
  elapsedSeconds: number
  onReset: () => void
}

export function Reflection({ session, elapsedSeconds, onReset }: Props) {
  const [data, setData] = useState<ReflectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const reduce = useReducedMotion()
  const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

  useEffect(() => {
    fetch('/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: session.task,
        steps: session.steps,
        totalMinutes: session.totalMinutes,
        stuckCount: session.stuckCount,
        elapsedSeconds,
      }),
    })
      .then(async (r) => {
        const d = (await r.json()) as ReflectionData | { error: string }
        if (!r.ok || 'error' in d) {
          const reason = 'error' in d ? d.error : `Request failed (${r.status})`
          throw new Error(reason)
        }
        setData(d)
      })
      .catch((e: unknown) => {
        const reason = e instanceof Error ? e.message : String(e)
        setData({
          summary: 'Session complete, but the reflection could not be generated.',
          focusScore: 50,
          observation: reason,
        })
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const completed = session.steps.filter((s) => s.done).length
  const total = session.steps.length
  const score = data?.focusScore ?? null

  const scoreColor = score === null
    ? 'var(--border)'
    : score >= 75 ? 'var(--hint)'
    : score >= 50 ? 'var(--hypothesis)'
    : 'var(--stuck)'

  const scoreLabel = score === null
    ? ''
    : score >= 80 ? 'Sharp'
    : score >= 65 ? 'Solid'
    : score >= 50 ? 'Fair'
    : 'Rough'

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-12"
      style={{ background: 'var(--bg)' }}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: EASE }}
        className="w-full max-w-[440px]"
      >
        {/* Wordmark */}
        <div className="flex items-center gap-2.5 mb-12">
          <div
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(var(--observing-rgb), 0.1)',
              border: '1px solid rgba(var(--observing-rgb), 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Brain size={13} style={{ color: 'var(--observing)' }} aria-hidden="true" />
          </div>
          <span className="mono text-xs font-medium" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
            Session Reflection
          </span>
        </div>

        {/* ── Score ─────────────────────────────────────────────── */}
        <motion.div
          className="mb-10"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-end gap-4 mb-2">
            <div
              className="mono font-bold leading-none"
              style={{
                fontSize: 'clamp(5rem, 18vw, 7.5rem)',
                color: loading ? 'var(--border)' : scoreColor,
                transition: 'color 500ms ease',
                letterSpacing: '-0.03em',
                lineHeight: 0.9,
              }}
              aria-label={`Focus score: ${loading ? 'loading' : score} out of 100`}
            >
              {loading ? '--' : score}
            </div>
            {!loading && scoreLabel && (
              <motion.div
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="mb-2"
              >
                <div
                  className="mono text-xs font-semibold px-2 py-1"
                  style={{
                    color: scoreColor,
                    background: `rgba(${score! >= 75 ? 'var(--hint-rgb)' : score! >= 50 ? 'var(--hypothesis-rgb)' : 'var(--stuck-rgb)'}, 0.1)`,
                    border: `1px solid ${scoreColor}`,
                    borderRadius: 4,
                    opacity: 0.9,
                  }}
                >
                  {scoreLabel}
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              Focus Score
            </span>
            <span style={{ width: 1, height: 10, background: 'var(--border)' }} aria-hidden="true" />
            <span className="mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              {completed}/{total} steps
            </span>
            <span style={{ width: 1, height: 10, background: 'var(--border)' }} aria-hidden="true" />
            <span className="mono text-xs" style={{ color: 'var(--text-secondary)' }}>
              {session.stuckCount} stuck {session.stuckCount === 1 ? 'moment' : 'moments'}
            </span>
          </div>
        </motion.div>

        {/* ── Text blocks ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-10">
          {/* Summary */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="mono text-[10px] font-semibold uppercase" style={{ color: 'var(--text-secondary)', letterSpacing: '0.14em' }}>
                What happened
              </span>
            </div>
            <div className="px-4 py-3.5">
              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.div
                    key="summary-skeleton"
                    className="flex flex-col gap-2"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div className="shimmer rounded h-3 w-full" />
                    <div className="shimmer rounded h-3 w-4/5" />
                    <div className="shimmer rounded h-3 w-2/3" />
                  </motion.div>
                ) : (
                  <motion.p
                    key="summary-text"
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text)', maxWidth: '55ch' }}
                    initial={reduce ? false : { opacity: 0, y: 5, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.22, ease: EASE }}
                  >
                    {data?.summary}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Observation — no side border, colored header row instead */}
          <div
            style={{
              background: 'rgba(var(--observing-rgb), 0.04)',
              border: '1px solid rgba(var(--observing-rgb), 0.2)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: '1px solid rgba(var(--observing-rgb), 0.15)' }}
            >
              <span className="mono text-[10px] font-semibold uppercase" style={{ color: 'var(--observing)', letterSpacing: '0.14em' }}>
                Next time
              </span>
            </div>
            <div className="px-4 py-3.5">
              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.div
                    key="obs-skeleton"
                    className="flex flex-col gap-2"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div className="shimmer rounded h-3 w-full" />
                    <div className="shimmer rounded h-3 w-3/5" />
                  </motion.div>
                ) : (
                  <motion.p
                    key="obs-text"
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text)', maxWidth: '55ch' }}
                    initial={reduce ? false : { opacity: 0, y: 5, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.22, ease: EASE }}
                  >
                    {data?.observation}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Reset ─────────────────────────────────────────────── */}
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm"
          style={{
            color: 'var(--text-secondary)',
            transition: 'color 150ms ease, transform 120ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <ArrowCounterClockwise size={14} aria-hidden="true" />
          <span>Start a new session</span>
        </button>
      </motion.div>
    </div>
  )
}
