'use client'

import { CheckCircle, Circle, ArrowsOut, SkipForward, CaretRight } from '@phosphor-icons/react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import type { Step } from '@/lib/types'

interface Props {
  steps: Step[]
  onToggle: (id: string) => void
  onSkip: (id: string) => void
  onRedecompose: (id: string) => void
  activeStepId: string | null
}

export function StepList({ steps, onToggle, onSkip, onRedecompose, activeStepId }: Props) {
  const reduce = useReducedMotion()
  const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

  return (
    <div role="list" aria-label="Session steps">
      <AnimatePresence initial={false}>
        {steps.map((step, i) => {
          const isActive = step.id === activeStepId
          const isDone = step.done

          return (
            <motion.div
              key={step.id}
              role="listitem"
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.035, ease: EASE }}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                background: isActive ? 'rgba(var(--observing-rgb), 0.05)' : 'transparent',
                borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 200ms ease',
              }}
            >
              {/* Active indicator — dot, not a border */}
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isActive && !isDone ? 'var(--observing)' : 'transparent',
                  boxShadow: isActive && !isDone ? '0 0 6px var(--observing)' : 'none',
                  transition: 'background 200ms ease, box-shadow 200ms ease',
                }}
                aria-hidden="true"
              />

              {/* Check button */}
              <button
                onClick={() => onToggle(step.id)}
                style={{
                  color: isDone ? 'var(--hint)' : 'var(--text-secondary)',
                  flexShrink: 0,
                  transition: 'color 150ms ease, transform 120ms ease',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.85)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                aria-label={isDone ? `Mark step ${i + 1} incomplete` : `Complete step ${i + 1}`}
              >
                {isDone
                  ? <CheckCircle size={14} weight="fill" />
                  : <Circle size={14} />
                }
              </button>

              {/* Step text */}
              <span
                className="flex-1 text-sm leading-snug min-w-0"
                style={{
                  color: isDone ? 'var(--text-secondary)' : isActive ? 'var(--text)' : 'var(--text-secondary)',
                  textDecoration: isDone ? 'line-through' : 'none',
                  textDecorationColor: 'var(--border)',
                  transition: 'color 200ms ease',
                }}
              >
                {step.text}
              </span>

              {/* Right side */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="mono text-xs"
                  style={{ color: isActive ? 'var(--text-secondary)' : 'var(--border)' }}
                >
                  {step.minutes}m
                </span>

                <AnimatePresence>
                  {isActive && !isDone && (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1 overflow-hidden"
                    >
                      <button
                        onClick={() => onRedecompose(step.id)}
                        title="Break into smaller steps"
                        style={{
                          color: 'var(--strategy)',
                          opacity: 0.45,
                          transition: 'opacity 120ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.45')}
                        aria-label="Break into smaller steps"
                      >
                        <ArrowsOut size={11} />
                      </button>
                      <button
                        onClick={() => onSkip(step.id)}
                        title="Skip step"
                        style={{
                          color: 'var(--text-secondary)',
                          opacity: 0.45,
                          transition: 'opacity 120ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.45')}
                        aria-label="Skip step"
                      >
                        <SkipForward size={11} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
