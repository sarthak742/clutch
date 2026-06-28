import type { ClutchTask, Commitment } from './types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export interface TimeMemory {
  added: string
  lastTouched: string
  deadline: string
  staleCommitment: string | null
  avoidance: string | null
  accountabilityLine: string
  aiSignals: string[]
}

function units(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? '' : 's'}`
}

export function elapsedLabel(ms: number): string {
  const safe = Math.max(0, ms)
  if (safe < 2 * MINUTE) return 'just now'
  if (safe < HOUR) return `${Math.round(safe / MINUTE)}m ago`
  if (safe < DAY) return `${Math.round(safe / HOUR)}h ago`
  if (safe < 30 * DAY) return `${Math.floor(safe / DAY)}d ago`
  return `${Math.round(safe / (30 * DAY))}mo ago`
}

function distanceLabel(ms: number): string {
  const safe = Math.max(0, Math.abs(ms))
  if (safe < HOUR) return units(Math.max(1, Math.round(safe / MINUTE)), 'minute')
  if (safe < DAY) return units(Math.round(safe / HOUR), 'hour')
  if (safe < 30 * DAY) return units(Math.round(safe / DAY), 'day')
  return units(Math.round(safe / (30 * DAY)), 'month')
}

function deadlineDistance(deadline: number | null | undefined, now: number): string {
  if (!deadline) return 'no deadline set'
  const diff = deadline - now
  if (diff < 0) return `overdue by ${distanceLabel(diff)}`
  if (diff < 2 * MINUTE) return 'due now'
  return `due in ${distanceLabel(diff)}`
}

function latestCommitment(task: Pick<ClutchTask, 'commitments'>): Commitment | null {
  return [...task.commitments].sort((a, b) => b.committedAt - a.committedAt)[0] ?? null
}

export function timeMemory(task: ClutchTask, now = Date.now()): TimeMemory {
  const added = `added ${elapsedLabel(now - task.createdAt)}`
  const lastTouched = `last touched ${elapsedLabel(now - task.lastTouched)}`
  const deadline = deadlineDistance(task.deadline, now)
  const latest = latestCommitment(task)
  const hasAcceptedProof = latest?.outcome?.reviewVerdict === 'accepted' || latest?.outcome?.reviewSolid
  const staleCommitment = latest && !hasAcceptedProof && now - latest.committedAt > 30 * MINUTE
    ? `committed ${elapsedLabel(now - latest.committedAt)} with no accepted proof`
    : null
  const avoidance = task.deferralCount > 0 || task.openedThenBailed > 0
    ? `${task.deferralCount} deferral${task.deferralCount === 1 ? '' : 's'}, ${task.openedThenBailed} bailout${task.openedThenBailed === 1 ? '' : 's'}`
    : null

  const pressure = [deadline, staleCommitment, avoidance].filter(Boolean).join('; ')
  const accountabilityLine = `${added}; ${lastTouched}; ${pressure || 'no avoidance logged yet'}.`

  return {
    added,
    lastTouched,
    deadline,
    staleCommitment,
    avoidance,
    accountabilityLine,
    aiSignals: [added, lastTouched, deadline, staleCommitment, avoidance].filter((item): item is string => Boolean(item)),
  }
}

export function timeMemorySignals(task: Partial<Pick<ClutchTask, 'createdAt' | 'lastTouched' | 'deadline' | 'deferralCount' | 'openedThenBailed' | 'commitments'>>, now = Date.now()): string[] {
  const signals: string[] = []
  if (typeof task.createdAt === 'number') signals.push(`added ${elapsedLabel(now - task.createdAt)}`)
  if (typeof task.lastTouched === 'number') signals.push(`last touched ${elapsedLabel(now - task.lastTouched)}`)
  signals.push(deadlineDistance(task.deadline, now))
  const commitments = task.commitments ?? []
  const latest = [...commitments].sort((a, b) => b.committedAt - a.committedAt)[0]
  const hasAcceptedProof = latest?.outcome?.reviewVerdict === 'accepted' || latest?.outcome?.reviewSolid
  if (latest && !hasAcceptedProof) signals.push(`latest commitment ${elapsedLabel(now - latest.committedAt)} without accepted proof`)
  if ((task.deferralCount ?? 0) > 0 || (task.openedThenBailed ?? 0) > 0) signals.push(`${task.deferralCount ?? 0} deferral(s), ${task.openedThenBailed ?? 0} bailout(s)`)
  return signals
}
