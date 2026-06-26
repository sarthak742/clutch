import type { ClutchTask, Effort } from './types'

// Deterministic risk model for the briefing. The AI elaborates on the top
// item during "engage"; this gives a fast, explainable ranking and a fallback.

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Rough hours of work each effort tier represents. */
const EFFORT_HOURS: Record<Effort, number> = { quick: 0.25, medium: 1, deep: 4 }

export interface RankedTask {
  task: ClutchTask
  score: number
  reason: string
}

/**
 * Risk = deadline urgency (accounting for how long the task takes) + an
 * effort nudge (big tasks can't be done last-minute) + avoidance signals.
 */
export function riskScore(task: ClutchTask, now: number): number {
  let urgency = 10
  if (task.deadline != null) {
    const hoursLeft = (task.deadline - now) / HOUR
    const slack = hoursLeft - EFFORT_HOURS[task.effort] // breathing room beyond the work itself
    if (hoursLeft <= 0) urgency = 100
    else if (slack <= 0) urgency = 95
    else if (slack < 24) urgency = 80
    else if (slack < 72) urgency = 55
    else if (slack < 24 * 7) urgency = 30
    else urgency = 15
  }

  const effortBoost = task.effort === 'deep' ? 15 : task.effort === 'medium' ? 6 : 0

  // Avoidance from real logged signals; staleness only counts with zero progress.
  const stale = task.progressNotes.length === 0 ? Math.min((now - task.createdAt) / DAY, 7) : 0
  const avoidance = task.deferralCount * 8 + task.openedThenBailed * 5 + stale * 3

  return Math.round(urgency + effortBoost + avoidance)
}

/** Short human explanation of the dominant risk factor. */
export function riskReason(task: ClutchTask, now: number): string {
  if (task.deadline != null) {
    const hoursLeft = (task.deadline - now) / HOUR
    if (hoursLeft <= 0) return 'Overdue'
    const slack = hoursLeft - EFFORT_HOURS[task.effort]
    if (slack <= 0) return `Barely enough time left to finish it`
    if (hoursLeft < 24) return `Due in ${Math.round(hoursLeft)}h`
    const days = Math.round(hoursLeft / 24)
    if (task.effort === 'deep' && days <= 3) return `Big task, only ${days}d left`
    if (task.deferralCount >= 2) return `Due in ${days}d, and avoided ${task.deferralCount}×`
    return `Due in ${days}d`
  }
  if (task.deferralCount >= 2) return `No deadline, but avoided ${task.deferralCount}×`
  if (task.progressNotes.length === 0) {
    const days = Math.floor((now - task.createdAt) / DAY)
    if (days >= 2) return `Sitting ${days}d with no progress`
  }
  return 'No hard deadline'
}

export function rankTasks(tasks: ClutchTask[], now: number): RankedTask[] {
  return tasks
    .filter((t) => t.status !== 'done' && t.status !== 'dropped')
    .map((t) => ({ task: t, score: riskScore(t, now), reason: riskReason(t, now) }))
    .sort((a, b) => b.score - a.score)
}
