'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Eye, Lightbulb, Compass, Sparkle, BookOpen, CaretDown } from '@phosphor-icons/react'
import type { Stage, StageState } from '@/lib/types'

interface StageConfig {
  label: string
  Icon: React.ElementType
  color: string
  rgb: string
}

const STAGE_CONFIG: Record<Stage, StageConfig> = {
  observing:  { label: 'Observing',   Icon: Eye,       color: 'var(--observing)',  rgb: 'var(--observing-rgb)'  },
  hypothesis: { label: 'Hypothesis',  Icon: Lightbulb, color: 'var(--hypothesis)', rgb: 'var(--hypothesis-rgb)' },
  strategy:   { label: 'Strategy',    Icon: Compass,   color: 'var(--strategy)',   rgb: 'var(--strategy-rgb)'   },
  hint:       { label: 'Hint',        Icon: Sparkle,   color: 'var(--hint)',       rgb: 'var(--hint-rgb)'       },
  fullAnswer: { label: 'Full Answer', Icon: BookOpen,  color: 'var(--hint)',       rgb: 'var(--hint-rgb)'       },
}

const VISIBLE_STAGES: Stage[] = ['observing', 'hypothesis', 'strategy', 'hint']
// framer-motion §Slow In and Slow Out: strong ease-out for UI enter transitions
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

interface Props {
  stages: Record<Stage, StageState>
  showFullAnswer: boolean
  onShowFullAnswer: () => void
}

export function ThoughtTrace({ stages, showFullAnswer, onShowFullAnswer }: Props) {
  const reduce = useReducedMotion()

  const activeStages = VISIBLE_STAGES.filter((s) => stages[s].status !== 'pending')
  const hintDone     = stages.hint.status === 'done'
  const fullAns      = stages.fullAnswer

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Agent reasoning"
      style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}
    >
      {/* ── Stage cards ────────────────────────────────────────────────────
          framer-motion §Follow Through and Overlapping Action:
          0.08s stagger per card index; each card enters independently
          §Spring Animations: spring stiffness 280, damping 26 for natural settle
          §Staging: cards enter sequentially as streaming progresses            */}
      <AnimatePresence>
        {activeStages.map((stage, idx) => {
          const cfg       = STAGE_CONFIG[stage]
          const st        = stages[stage]
          const streaming = st.status === 'streaming'
          const isLast    = idx === activeStages.length - 1

          return (
            <motion.div
              key={stage}
              // §Jakub blur recipe: blur(6px)→0 so the card "materializes"
              // into focus rather than just sliding/fading in.
              initial={reduce ? false : { opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                // framer-motion §Spring Animations: stiffness 280, damping 26
                type: 'spring',
                stiffness: 280,
                damping: 26,
                delay: idx * 0.08,
                opacity: { duration: 0.18 },
                filter: { duration: 0.28, ease: EASE },
              }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'relative',
                  background: streaming ? `rgba(${cfg.rgb}, 0.06)` : 'var(--surface)',
                  borderBottom: isLast && !hintDone ? 'none' : `1px solid var(--border)`,
                  // Inset shadow on streaming card communicates active state
                  boxShadow: streaming ? `inset 0 0 0 1px rgba(${cfg.rgb}, 0.15)` : 'none',
                  transition: 'background 300ms ease, box-shadow 300ms ease',
                }}
              >
                {/* Left border indicator — separate element so pulse-ring keyframe
                    can animate its opacity independently of the card content.
                    Uses existing globals.css pulse-ring, no new keyframes added. */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: 2,
                    background: cfg.color,
                    // pulse-ring: 0%,100% opacity 0.6 → 50% opacity 1
                    // Reduced-motion: solid indicator, no pulse
                    animation: streaming && !reduce ? 'pulse-ring 1.4s ease-in-out infinite' : 'none',
                  }}
                />

                {/* Stage header */}
                <div
                  className="flex items-center gap-2 px-4 pt-3 pb-2"
                  style={{ borderBottom: `1px solid var(--border-subtle)` }}
                >
                  <cfg.Icon
                    size={13}
                    weight={streaming ? 'fill' : 'regular'}
                    aria-hidden="true"
                    style={{ color: cfg.color, flexShrink: 0 }}
                  />
                  <span
                    className="mono font-semibold uppercase"
                    style={{ fontSize: 10, color: cfg.color, letterSpacing: '0.14em' }}
                  >
                    {cfg.label}
                  </span>
                  {/* Streaming dot badge — pulse-ring keyframe for the ongoing
                      state, plus a spring pop-in so it feels like the AI is
                      "waking up" on this stage. framer-motion §Appeal. */}
                  <AnimatePresence>
                    {streaming && (
                      <motion.span
                        key="dot"
                        className="mono ml-auto"
                        initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 0.9, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                        style={{
                          fontSize: 9,
                          color: cfg.color,
                          marginLeft: 'auto',
                          animation: reduce ? 'none' : 'pulse-ring 1.4s ease-in-out infinite',
                        }}
                        aria-label="streaming"
                      >
                        ●
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Stage content */}
                <p
                  className={`mono text-sm leading-relaxed px-4 py-3${streaming ? ' caret' : ''}`}
                  style={{
                    color: streaming ? 'var(--text)' : 'var(--text-secondary)',
                    minHeight: '2.5rem',
                    transition: 'color 400ms ease',
                  }}
                >
                  {st.text}
                </p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* ── "Show full answer" gate ────────────────────────────────────────
          framer-motion §Timing: opacity 0→1 after hint done, delay 0.1s
          AnimatePresence handles mount/unmount cleanly                    */}
      <AnimatePresence>
        {hintDone && !showFullAnswer && (
          <motion.button
            key="gate"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, delay: 0.1 }}
            onClick={onShowFullAnswer}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 w-full py-3 mono"
            style={{
              fontSize: '0.75rem',
              background: 'var(--bg)',
              border: 'none',
              borderTop: `1px dashed rgba(var(--hint-rgb), 0.3)`,
              // hint color per spec — not muted/grey
              color: 'var(--hint)',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `rgba(var(--hint-rgb), 0.05)` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
            aria-label="Reveal full answer"
          >
            <CaretDown size={10} aria-hidden="true" />
            <span>show full answer</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Full answer reveal ─────────────────────────────────────────────
          framer-motion §Spring Animations: height 0→auto + opacity,
          spring stiffness 260, damping 24 per spec                        */}
      <AnimatePresence>
        {showFullAnswer && (
          <motion.div
            key="full-answer"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 24,
              opacity: { duration: 0.2, ease: EASE },
              height: { type: 'spring', stiffness: 260, damping: 24 },
            }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                position: 'relative',
                background: `rgba(var(--hint-rgb), 0.06)`,
                boxShadow: fullAns.status === 'streaming'
                  ? `inset 0 0 0 1px rgba(var(--hint-rgb), 0.15)`
                  : 'none',
                borderTop: '1px solid var(--border)',
              }}
            >
              {/* Pulsing left border — same pattern as stage cards */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0, top: 0, bottom: 0,
                  width: 2,
                  background: 'var(--hint)',
                  animation: fullAns.status === 'streaming' && !reduce
                    ? 'pulse-ring 1.4s ease-in-out infinite'
                    : 'none',
                }}
              />

              <div
                className="flex items-center gap-2 px-4 pt-3 pb-2"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <BookOpen
                  size={13}
                  weight={fullAns.status === 'streaming' ? 'fill' : 'regular'}
                  aria-hidden="true"
                  style={{ color: 'var(--hint)' }}
                />
                <span
                  className="mono font-semibold uppercase"
                  style={{ fontSize: 10, color: 'var(--hint)', letterSpacing: '0.14em' }}
                >
                  Full Answer
                </span>
                <AnimatePresence>
                  {fullAns.status === 'streaming' && (
                    <motion.span
                      key="dot"
                      className="mono ml-auto"
                      initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 0.9, scale: 1 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                      style={{
                        fontSize: 9,
                        color: 'var(--hint)',
                        marginLeft: 'auto',
                        animation: reduce ? 'none' : 'pulse-ring 1.4s ease-in-out infinite',
                      }}
                      aria-label="streaming"
                    >
                      ●
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p
                className={`mono text-sm leading-relaxed px-4 py-3${fullAns.status === 'streaming' ? ' caret' : ''}`}
                style={{ color: 'var(--text)', minHeight: '2.5rem' }}
              >
                {fullAns.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
