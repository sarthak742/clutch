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
