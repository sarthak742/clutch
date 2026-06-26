'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Brain } from '@phosphor-icons/react'
import { SilkCanvas } from '@/components/ui/silk-background-animation'

interface Props {
  onStart: (task: string, minutes: number) => void
  loading: boolean
}

const PRESETS = [25, 45, 60, 90]

const STAGE_PILLS = [
  { id: 'observing',  label: 'OBSERVING',  color: 'var(--observing)',  rgb: 'var(--observing-rgb)'  },
  { id: 'hypothesis', label: 'HYPOTHESIS', color: 'var(--hypothesis)', rgb: 'var(--hypothesis-rgb)' },
  { id: 'strategy',   label: 'STRATEGY',   color: 'var(--strategy)',   rgb: 'var(--strategy-rgb)'   },
  { id: 'hint',       label: 'HINT',       color: 'var(--hint)',       rgb: 'var(--hint-rgb)'       },
] as const

const HEADLINE_WORDS = ['What', 'are', 'you', 'working', 'on?']

export function NewSession({ onStart, loading }: Props) {
  const [task, setTask]       = useState('')
  const [minutes, setMinutes] = useState(45)
  const reduce = useReducedMotion()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (task.trim() && minutes > 0 && !loading) onStart(task.trim(), minutes)
  }

  const canSubmit = task.trim().length > 0 && !loading

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-6 py-10"
      style={{ position: 'relative', background: 'var(--bg)', overflow: 'hidden' }}
    >
      {/* Silk background canvas — full bleed behind all content */}
      <SilkCanvas />

      {/* Dark scrim so form text stays readable over the silk texture */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'linear-gradient(135deg, rgba(10,11,15,0.82) 0%, rgba(10,11,15,0.65) 100%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 540 }}>

        {/* ── Wordmark ───────────────────────────────────────────
            framer-motion §Timing: simple opacity fade, 0.25s tween
            No spring needed — wordmark is brand, not interactive  */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0 }}
          className="flex items-center gap-2.5"
          style={{ marginBottom: '2.25rem' }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(var(--observing-rgb), 0.1)',
              border: '1px solid rgba(var(--observing-rgb), 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Brain size={14} style={{ color: 'var(--observing)' }} aria-hidden="true" />
          </div>
          <span
            className="mono font-medium uppercase"
            style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.18em' }}
          >
            Focus Agent
          </span>
        </motion.div>

        {/* ── Headline (word split) ───────────────────────────────
            framer-motion §Follow Through and Overlapping Action:
            each word staggers 0.045s, spring stiffness 300 damping 28
            §Stagger Animations: inline-block spans, 30-80ms between items */}
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 2.6rem)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            color: 'var(--text)',
            marginBottom: '0.75rem',
            textWrap: 'balance',
          }}
          aria-label={HEADLINE_WORDS.join(' ')}
        >
          {HEADLINE_WORDS.map((word, i) => (
            <motion.span
              key={word + i}
              style={{ display: 'inline-block', marginRight: '0.28em' }}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 28,
                delay: i * 0.045,
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* ── Subtitle ───────────────────────────────────────────
            framer-motion §Timing: 0.3s tween, delay 0.22s          */}
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.22 }}
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            maxWidth: '44ch',
            marginBottom: '2rem',
          }}
        >
          I'll break it into steps and stay silent. The moment you're stuck, pull me in — I'll think out loud before I help.
        </motion.p>

        <form onSubmit={handleSubmit}>

          {/* ── Task label + textarea ──────────────────────────────
              framer-motion §Staging: form elements enter after headline
              spring stiffness 280 damping 26, delay 0.28s            */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.28 }}
            style={{ marginBottom: '1rem' }}
          >
            <label
              htmlFor="task-input"
              className="mono block"
              style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}
            >
              Task
            </label>
            <textarea
              id="task-input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe your task — be specific"
              rows={4}
              disabled={loading}
              className="mono w-full resize-none"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontSize: '0.875rem',
                padding: '12px 14px',
                outline: 'none',
                lineHeight: 1.65,
                display: 'block',
                width: '100%',
                // §Secondary Action: CSS transition only on focus (not motion)
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(var(--observing-rgb), 0.5)'
                e.target.style.boxShadow = '0 0 0 3px rgba(var(--observing-rgb), 0.08)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)'
                e.target.style.boxShadow = 'none'
              }}
            />
            {/* Character count — fades in after 10+ chars */}
            {task.length >= 10 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="mono"
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-secondary)',
                  marginTop: 5,
                  textAlign: 'right',
                }}
              >
                {task.length} chars
              </motion.p>
            )}
          </motion.div>

          {/* ── Time budget label ──────────────────────────────── */}
          <motion.label
            htmlFor="custom-minutes"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.32 }}
            className="mono block"
            style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}
          >
            Time budget
          </motion.label>

          {/* ── Pills row ──────────────────────────────────────────
              §Jhey: stagger is most powerful when selective. The headline
              word stagger is the singular delight moment, so the preset row
              enters as one shared fade rather than a competing stagger.
              §Appeal: whileTap scale 0.94, spring stiffness 400 damping 20 */}
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.34 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}
          >
            {PRESETS.map((p) => (
              <motion.button
                key={p}
                type="button"
                onClick={() => setMinutes(p)}
                whileTap={{ scale: 0.94, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                className="mono text-xs"
                style={{
                  padding: '5px 12px',
                  borderRadius: 4,
                  border: '1px solid',
                  // CSS transition for color/bg — not motion (spec: 150ms ease-out)
                  borderColor: minutes === p ? 'rgba(var(--observing-rgb), 0.5)' : 'var(--border)',
                  background: minutes === p ? 'rgba(var(--observing-rgb), 0.1)' : 'transparent',
                  color: minutes === p ? 'var(--observing)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease-out, background 150ms ease-out, color 150ms ease-out',
                }}
              >
                {p}m
              </motion.button>
            ))}

            <input
              id="custom-minutes"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(5, Math.min(240, Number(e.target.value))))}
              min={5}
              max={240}
              disabled={loading}
              className="mono text-xs text-center"
              style={{
                width: 54,
                padding: '5px 8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                outline: 'none',
                transition: 'border-color 150ms ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(var(--observing-rgb), 0.5)')}
              onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
              aria-label="Custom minutes"
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>min</span>
          </motion.div>

          {/* ── Start button ───────────────────────────────────────
              framer-motion §Appeal: whileTap scale 0.97, spring 400/20
              Arrow: CSS translateX 3px via .start-btn:hover .btn-arrow
              in globals.css — not motion (spec: CSS transition only)
              Entry: spring stiffness 280 damping 26, delay 0.44         */}
          <motion.button
            type="submit"
            disabled={!canSubmit}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.44 }}
            whileTap={canSubmit
              ? { scale: 0.97, transition: { type: 'spring', stiffness: 400, damping: 20 } }
              : {}
            }
            className="start-btn flex items-center justify-center gap-2.5 w-full text-sm font-semibold"
            style={{
              padding: '14px 20px',
              background: canSubmit ? 'var(--text)' : 'var(--surface)',
              color: canSubmit ? 'var(--bg)' : 'var(--text-secondary)',
              border: `1px solid ${canSubmit ? 'transparent' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.35,
              transition: 'background 200ms ease, color 200ms ease, opacity 200ms ease',
            }}
          >
            {loading ? (
              <span className="mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                Breaking down task<span className="caret" />
              </span>
            ) : (
              <>
                <span>Start Session</span>
                <span className="btn-arrow" aria-hidden="true">
                  <ArrowRight size={14} weight="bold" />
                </span>
              </>
            )}
          </motion.button>
        </form>

        {/* ── Divider ────────────────────────────────────────────
            framer-motion §Timing: 0.3s tween, delay 0.5s          */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          style={{ height: 1, background: 'var(--border)', margin: '1.5rem 0 1.25rem' }}
          aria-hidden="true"
        />

        {/* ── Stage pills label ──────────────────────────────── */}
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.52 }}
          className="mono uppercase"
          style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.2em', marginBottom: '0.75rem' }}
        >
          Agent Reasoning Stages
        </motion.p>

        {/* ── Stage pills ────────────────────────────────────────
            §Jhey: collapsed from a per-pill x-slide stagger to a single
            shared fade so it doesn't compete with the headline stagger.   */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.54 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
        >
          {STAGE_PILLS.map((stage) => (
            <div
              key={stage.id}
              className="mono flex items-center gap-1.5 uppercase"
              style={{
                padding: '4px 10px',
                borderRadius: 3,
                border: `1px solid ${stage.color}`,
                background: `rgba(${stage.rgb}, 0.06)`,
                fontSize: 10,
                color: stage.color,
                letterSpacing: '0.06em',
              }}
            >
              <span
                style={{ width: 5, height: 5, borderRadius: '50%', background: stage.color, flexShrink: 0 }}
                aria-hidden="true"
              />
              {stage.label}
            </div>
          ))}
        </motion.div>

      </div>
    </div>
  )
}
