import type { ClutchTask, Commitment, FollowThrough, GroundedSource } from './types'

export interface OverviewStats {
  followThroughRaw: number
  followThrough: string
  accepted: number
  partial: number
  rejected: number
  offTaskMinutes: number
  rescued: number
}

export interface FollowUpMemory {
  task: ClutchTask
  commitment: Commitment
  message: string
}

export function overviewStats(tasks: ClutchTask[], followThrough: FollowThrough): OverviewStats {
  const outcomes = tasks.flatMap((task) =>
    task.commitments
      .map((commitment) => ({ commitment, outcome: commitment.outcome }))
      .filter((item) => item.outcome),
  )
  const accepted = outcomes.filter((item) => item.outcome?.reviewVerdict === 'accepted' || item.outcome?.reviewSolid).length
  const partial = outcomes.filter((item) => item.outcome?.reviewVerdict === 'partial').length
  const rejected = outcomes.filter((item) => item.outcome?.reviewVerdict === 'rejected').length
  const offTaskMinutes = Math.ceil(outcomes.reduce((sum, item) => sum + (item.outcome?.offTaskSeconds ?? item.commitment.offTaskSeconds ?? 0), 0) / 60)
  const rescued = tasks.filter((task) => task.status === 'done' && task.deferralCount > 0).length
  const followThroughRaw = followThrough.committed > 0 ? Math.round((followThrough.completed / followThrough.committed) * 100) : 0

  return {
    followThroughRaw,
    followThrough: followThrough.committed > 0 ? `${followThroughRaw}%` : '--',
    accepted,
    partial,
    rejected,
    offTaskMinutes,
    rescued,
  }
}

export function followUpMemory(tasks: ClutchTask[], now = Date.now()): FollowUpMemory | null {
  const unfinished = tasks
    .filter((task) => task.status !== 'done' && task.commitments.length > 0)
    .map((task) => {
      const latest = [...task.commitments].sort((a, b) => b.committedAt - a.committedAt)[0]
      return { task, latest }
    })
    .filter((item) => now - item.latest.committedAt > 30 * 60_000)
    .sort((a, b) => b.latest.committedAt - a.latest.committedAt)[0]

  if (!unfinished) return null
  const hours = Math.max(1, Math.round((now - unfinished.latest.committedAt) / 3_600_000))
  const review = unfinished.latest.outcome?.reviewVerdict
  const suffix = review === 'partial'
    ? 'It was marked partial. Want to close the gap now?'
    : review === 'rejected'
      ? 'The proof was rejected. Want to show stronger evidence now?'
      : 'Want to finish it before it slips again?'
  return {
    task: unfinished.task,
    commitment: unfinished.latest,
    message: `${hours}h ago you committed to "${unfinished.latest.action}" for "${unfinished.task.title}". ${suffix}`,
  }
}

export function latestFocusBlock(tasks: ClutchTask[]): { task: ClutchTask; commitment: Commitment } | null {
  return tasks
    .flatMap((task) => task.commitments.map((commitment) => ({ task, commitment })))
    .filter((item) => Boolean(item.commitment.focusBlockUrl))
    .sort((a, b) => b.commitment.committedAt - a.commitment.committedAt)[0] ?? null
}

export function latestGroundedSources(tasks: ClutchTask[]): { task: ClutchTask; sources: GroundedSource[] } | null {
  return tasks
    .filter((task) => (task.groundedSources ?? []).length > 0)
    .sort((a, b) => b.lastTouched - a.lastTouched)
    .map((task) => ({ task, sources: (task.groundedSources ?? []).slice(0, 3) }))[0] ?? null
}

export function computeStreak(tasks: ClutchTask[]): number {
  const doneTasks = tasks.filter((t) => t.status === 'done' && t.lastTouched)
  if (doneTasks.length === 0) return 0

  // Collect unique calendar days (YYYY-MM-DD) where tasks were completed
  const daySet = new Set(
    doneTasks.map((t) => {
      const d = new Date(t.lastTouched)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
  )

  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (daySet.has(key)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

