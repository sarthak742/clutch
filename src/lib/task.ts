import type { ParsedTask, ClutchTask } from './types'
import { parseDeadlineISO } from './date'

/** Hydrate a parsed task into a full ClutchTask with behavioral fields zeroed. */
export function fromParsed(p: ParsedTask): ClutchTask {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: p.title,
    // end-of-day on the parsed date; null when no deadline
    deadline: parseDeadlineISO(p.deadlineISO),
    effort: p.effort,
    category: p.category,
    alertLeadHours: typeof p.alertLeadHours === 'number' && p.alertLeadHours > 0 ? p.alertLeadHours : effortLeadHours(p.effort),
    status: 'todo',
    createdAt: now,
    lastTouched: now,
    deferralCount: 0,
    openedThenBailed: 0,
    progressNotes: [],
    commitments: [],
  }
}

const TODAY_MS = 24 * 3_600_000

/** Short, human deadline label for cards. */
export function deadlineLabel(deadline: number | null, now: number = Date.now()): string {
  if (deadline == null) return 'no deadline'
  const diff = deadline - now
  if (diff < 0) return 'overdue'
  const days = Math.floor(diff / TODAY_MS)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.round(days / 7)}w`
  return `${Math.round(days / 30)}mo`
}

export const EFFORT_LABEL: Record<ClutchTask['effort'], string> = {
  quick: '< 15 min',
  medium: '~1 hr',
  deep: 'multi-hour',
}

/** Deterministic fallback lead time (hours) when Gemini didn't set one. */
export function effortLeadHours(effort: ClutchTask['effort']): number {
  return effort === 'quick' ? 3 : effort === 'deep' ? 36 : 12
}

/**
 * Epoch ms at which a proactive alert should first fire for a task: its deadline
 * minus the Gemini-decided lead window (falling back to an effort-based default).
 * Returns null when the task has no deadline.
 */
export function alertWindowStart(
  task: Pick<ClutchTask, 'deadline' | 'effort' | 'alertLeadHours'>,
): number | null {
  if (task.deadline == null) return null
  const leadHours = typeof task.alertLeadHours === 'number' && task.alertLeadHours > 0
    ? task.alertLeadHours
    : effortLeadHours(task.effort)
  return task.deadline - leadHours * 3_600_000
}

export function calendarFocusBlockUrl(taskTitle: string, action: string, startMs: number, durationMin: number): string {
  const start = new Date(startMs)
  const end = new Date(startMs + durationMin * 60_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Focus block: ${taskTitle}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `CLUTCH commitment: ${action}\n\nBring back proof before marking this done.`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

