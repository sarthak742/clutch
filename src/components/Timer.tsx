'use client'

import { useEffect, useState } from 'react'

interface Props {
  startedAt: number
  totalMinutes: number
}

function fmt(totalSecs: number): string {
  const abs = Math.abs(totalSecs)
  const m = Math.floor(abs / 60).toString().padStart(2, '0')
  const s = (abs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function Timer({ startedAt, totalMinutes }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const budget = totalMinutes * 60
  const remaining = budget - elapsed
  const isOver = remaining < 0

  // Progress 0→1 as time runs out, continues past 1 if over
  const progress = Math.min(1, elapsed / budget)

  return (
    <div
      className="flex flex-col items-end shrink-0"
      aria-label={`${isOver ? 'Over budget by' : 'Time remaining'}: ${fmt(remaining)}`}
    >
      <div
        className="mono font-semibold tabular-nums leading-none"
        style={{
          fontSize: '1.35rem',
          letterSpacing: '-0.03em',
          color: isOver
            ? 'var(--hypothesis)'
            : progress > 0.8
            ? 'var(--stuck)'
            : 'var(--text)',
          transition: 'color 600ms ease',
        }}
        aria-hidden="true"
      >
        {isOver ? '+' : ''}{fmt(remaining)}
      </div>

      {/* Mini progress bar */}
      <div
        style={{
          marginTop: 5,
          width: 48,
          height: 2,
          borderRadius: 1,
          background: 'var(--border)',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            borderRadius: 1,
            background: isOver
              ? 'var(--hypothesis)'
              : progress > 0.8
              ? 'var(--stuck)'
              : 'var(--observing)',
            transformOrigin: 'left center',
            transform: `scaleX(${Math.min(1, progress)})`,
            transition: 'transform 1s linear, background 600ms ease',
          }}
        />
      </div>
    </div>
  )
}
