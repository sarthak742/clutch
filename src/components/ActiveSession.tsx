'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Timer } from './Timer'
import { StepList } from './StepList'
import { ThoughtTrace } from './ThoughtTrace'
import { createParser } from '@/lib/parser'
import { saveSession } from '@/lib/store'
import type { Session, Step, Stage, StageState } from '@/lib/types'
import { Camera, X, CheckFat, Brain } from '@phosphor-icons/react'

const INIT_STAGES = (): Record<Stage, StageState> => ({
  observing:  { text: '', status: 'pending' },
  hypothesis: { text: '', status: 'pending' },
  strategy:   { text: '', status: 'pending' },
  hint:       { text: '', status: 'pending' },
  fullAnswer: { text: '', status: 'pending' },
})

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

interface Props {
  session: Session
  onComplete: (final: Session) => void
}

export function ActiveSession({ session, onComplete }: Props) {
  const [steps, setSteps] = useState<Step[]>(session.steps)
  const [stuckCount, setStuckCount] = useState(session.stuckCount)
  const [traceVisible, setTraceVisible] = useState(false)
  const [tracing, setTracing] = useState(false)
  const [stages, setStages] = useState<Record<Stage, StageState>>(INIT_STAGES())
  const [showFullAnswer, setShowFullAnswer] = useState(false)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [redecomposing, setRedecomposing] = useState(false)
  const [stuckHover, setStuckHover] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const traceRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const activeStep = steps.find((s) => !s.done) ?? null
  const allDone = steps.every((s) => s.done)
  const doneCount = steps.filter((s) => s.done).length

  useEffect(() => {
    saveSession({ ...session, steps, stuckCount })
  }, [steps, stuckCount]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (traceVisible && traceRef.current) {
      setTimeout(() => traceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120)
    }
  }, [traceVisible])

  const toggleStep = useCallback((id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)))
  }, [])

  const skipStep = useCallback((id: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, done: true } : s)))
  }, [])

  const handleRedecompose = async (id: string) => {
    const step = steps.find((s) => s.id === id)
    if (!step || redecomposing) return
    setRedecomposing(true)
    try {
      const res = await fetch('/api/redecompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: step.text, task: session.task }),
      })
      const payload = (await res.json()) as
        | { steps: { text: string; minutes: number }[] }
        | { error: string }
      if (!res.ok || 'error' in payload) {
        const reason = 'error' in payload ? payload.error : `Request failed (${res.status})`
        throw new Error(reason)
      }
      const { steps: sub } = payload
      const newSteps: Step[] = sub.map((s) => ({
        id: crypto.randomUUID(),
        text: s.text,
        minutes: s.minutes,
        done: false,
      }))
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.id === id)
        return [...prev.slice(0, idx), ...newSteps, ...prev.slice(idx + 1)]
      })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      alert(`Could not break down that step.\n\n${reason}`)
    } finally {
      setRedecomposing(false)
    }
  }

  const handleStuck = async () => {
    if (!activeStep || tracing) return
    setStuckCount((c) => c + 1)
    setTraceVisible(true)
    setTracing(true)
    setStages(INIT_STAGES())
    setShowFullAnswer(false)

    const parser = createParser((field, text, done) => {
      setStages((prev) => ({
        ...prev,
        [field]: { text, status: done ? 'done' : 'streaming' },
      }))
    })

    try {
      const res = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: activeStep.text,
          task: session.task,
          screenshot: screenshot ?? undefined,
        }),
      })
      // Early failures (e.g. missing key) come back as a JSON error, not a stream.
      if (!res.ok) {
        let reason = `Request failed (${res.status})`
        try {
          const { error } = (await res.json()) as { error?: string }
          if (error) reason = error
        } catch { /* non-JSON body — keep the status message */ }
        throw new Error(reason)
      }
      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        parser.feed(decoder.decode(value, { stream: true }))
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      alert(`The agent could not respond.\n\n${reason}`)
    } finally {
      setTracing(false)
    }
  }

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1280
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      setScreenshot(canvas.toDataURL('image/jpeg', 0.8).split(',')[1])
      URL.revokeObjectURL(url)
    }
    img.src = url
    e.target.value = ''
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ maxWidth: 520, margin: '0 auto', padding: '0 1.25rem' }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <header
        className="flex items-start justify-between gap-4 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'rgba(var(--observing-rgb), 0.1)',
              border: '1px solid rgba(var(--observing-rgb), 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <Brain size={13} style={{ color: 'var(--observing)' }} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-medium leading-snug"
              style={{
                color: 'var(--text)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {session.task}
            </p>
            <p className="mono text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {doneCount}/{steps.length} steps
            </p>
          </div>
        </div>
        <Timer startedAt={session.startedAt} totalMinutes={session.totalMinutes} />
      </header>

      {/* ── Step list ────────────────────────────────────────────── */}
      <div
        className="my-4"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          background: 'var(--surface)',
        }}
      >
        <StepList
          steps={steps}
          onToggle={toggleStep}
          onSkip={skipStep}
          onRedecompose={handleRedecompose}
          activeStepId={activeStep?.id ?? null}
        />
        <AnimatePresence>
          {redecomposing && (
            <motion.div
              initial={reduce ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="mono text-xs px-4 py-2.5"
              style={{
                color: 'var(--strategy)',
                borderTop: '1px solid var(--border)',
                background: 'rgba(var(--strategy-rgb), 0.04)',
              }}
            >
              Breaking into smaller steps<span className="caret" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Thought trace ────────────────────────────────────────── */}
      <AnimatePresence>
        {traceVisible && (
          <motion.div
            key="trace"
            ref={traceRef}
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              // framer-motion §Spring Animations: stiffness 260, damping 24 per spec
              type: 'spring',
              stiffness: 260,
              damping: 24,
              opacity: { duration: 0.2, ease: EASE },
            }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="mono text-[10px] font-semibold uppercase"
                style={{ color: 'var(--text-secondary)', letterSpacing: '0.12em' }}
              >
                Agent Reasoning
              </span>
              <button
                onClick={() => setTraceVisible(false)}
                style={{ color: 'var(--text-secondary)', opacity: 0.5, transition: 'opacity 120ms ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                aria-label="Close reasoning panel"
              >
                <X size={13} />
              </button>
            </div>
            <ThoughtTrace
              stages={stages}
              showFullAnswer={showFullAnswer}
              onShowFullAnswer={() => setShowFullAnswer(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {/* ── Bottom controls ──────────────────────────────────────── */}
      <div className="py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <AnimatePresence mode="wait">
          {allDone ? (
            <motion.button
              key="done"
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: EASE }}
              onClick={() => onComplete({ ...session, steps, stuckCount })}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 text-sm font-semibold"
              whileTap={{ scale: 0.97 }}
              style={{
                background: 'rgba(var(--hint-rgb), 0.12)',
                border: '1px solid rgba(var(--hint-rgb), 0.3)',
                borderRadius: 'var(--radius)',
                color: 'var(--hint)',
                cursor: 'pointer',
              }}
            >
              <CheckFat size={14} weight="bold" aria-hidden="true" />
              <span>All done — reflect</span>
            </motion.button>
          ) : (
            <motion.div
              key="working"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-3"
            >
              {/* Screenshot row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs"
                  style={{
                    color: screenshot ? 'var(--strategy)' : 'var(--text-secondary)',
                    transition: 'color 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  aria-label={screenshot ? 'Change screenshot' : 'Attach screenshot for more context'}
                >
                  <Camera size={12} aria-hidden="true" />
                  <span className="mono">{screenshot ? 'screenshot attached' : 'attach screenshot'}</span>
                </button>
                {/* §O8: animate in/out with width + opacity so the control
                    feels integrated with the attachment state rather than
                    snapping. Resting opacity stays dimmed at 0.5. */}
                <AnimatePresence initial={false}>
                  {screenshot && (
                    <motion.button
                      key="remove-screenshot"
                      onClick={() => setScreenshot(null)}
                      initial={reduce ? false : { width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 0.5 }}
                      exit={reduce ? { opacity: 0 } : { width: 0, opacity: 0 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      style={{
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                      aria-label="Remove screenshot"
                    >
                      <X size={10} />
                    </motion.button>
                  )}
                </AnimatePresence>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleScreenshot}
                  aria-hidden="true"
                />
                {/* Early end — pointer-events none + opacity 0.3 while tracing
                    prevents race condition where session ends mid-stream        */}
                <button
                  onClick={() => onComplete({ ...session, steps, stuckCount })}
                  className="mono text-xs ml-auto"
                  style={{
                    color: 'var(--border)',
                    pointerEvents: tracing ? 'none' : 'auto',
                    opacity: tracing ? 0.3 : 1,
                    cursor: 'pointer',
                    transition: 'color 150ms ease, opacity 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--border)')}
                  aria-label="End session early"
                  aria-disabled={tracing}
                  tabIndex={tracing ? -1 : 0}
                >
                  end early
                </button>
              </div>

              {/* THE STUCK BUTTON
                  framer-motion §Appeal: whileTap scale 0.97, spring 400/20
                  framer-motion §Secondary Action: hover box-shadow via CSS
                  transition 200ms (not motion) — state tracked via stuckHover */}
              <motion.button
                onClick={handleStuck}
                disabled={tracing || !activeStep}
                whileTap={tracing || !activeStep ? {} : {
                  scale: 0.97,
                  transition: { type: 'spring', stiffness: 400, damping: 20 },
                }}
                onMouseEnter={() => { if (!tracing && activeStep) setStuckHover(true) }}
                onMouseLeave={() => setStuckHover(false)}
                className="relative w-full py-4 text-base font-bold overflow-hidden"
                style={{
                  background: tracing ? 'var(--surface)' : 'var(--stuck)',
                  border: tracing ? '1px solid var(--border)' : '1px solid transparent',
                  borderRadius: 'var(--radius)',
                  color: tracing ? 'var(--text-secondary)' : 'var(--bg)',
                  opacity: !activeStep && !tracing ? 0.35 : 1,
                  cursor: tracing || !activeStep ? 'not-allowed' : 'pointer',
                  // CSS transition on box-shadow per spec (not motion)
                  transition: 'background 200ms ease, color 200ms ease, opacity 200ms ease, box-shadow 200ms ease',
                  boxShadow: tracing
                    ? 'none'
                    : stuckHover
                    ? '0 0 28px rgba(var(--stuck-rgb), 0.38), 0 1px 0 rgba(255,255,255,0.08) inset'
                    : '0 0 28px rgba(var(--stuck-rgb), 0.22), 0 1px 0 rgba(255,255,255,0.08) inset',
                  letterSpacing: '-0.01em',
                }}
                aria-label="I'm stuck — ask the agent for help"
              >
                {/* framer-motion §icon-swap: crossfade the label on state change
                    with opacity + blur so the most important interaction in the
                    product reads as intentional, not a glitch. Reduced-motion
                    users get a plain instant swap. */}
                <AnimatePresence mode="wait" initial={false}>
                  {tracing ? (
                    <motion.span
                      key="thinking"
                      className="mono text-sm font-normal"
                      initial={reduce ? false : { opacity: 0, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, filter: 'blur(5px)' }}
                      transition={{ duration: 0.18 }}
                      style={{ display: 'inline-block' }}
                    >
                      Thinking<span className="caret" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="stuck"
                      initial={reduce ? false : { opacity: 0, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, filter: 'blur(5px)' }}
                      transition={{ duration: 0.18 }}
                      style={{ display: 'inline-block' }}
                    >
                      I&apos;m Stuck
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
