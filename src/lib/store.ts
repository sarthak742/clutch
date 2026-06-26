import type { Session, ClutchTask, FollowThrough } from './types'

const KEY = 'fa-session'

export function saveSession(s: Session | null) {
  if (typeof window === 'undefined') return
  if (!s) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, JSON.stringify(s))
}

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

// ── Clutch persistence ────────────────────────────────────────────

const TASKS_KEY = 'clutch-tasks'
const FT_KEY = 'clutch-followthrough'

export function loadTasks(): ClutchTask[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    return raw ? (JSON.parse(raw) as ClutchTask[]) : []
  } catch {
    return []
  }
}

export function saveTasks(tasks: ClutchTask[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function loadFollowThrough(): FollowThrough {
  if (typeof window === 'undefined') return { committed: 0, completed: 0 }
  try {
    const raw = localStorage.getItem(FT_KEY)
    return raw ? (JSON.parse(raw) as FollowThrough) : { committed: 0, completed: 0 }
  } catch {
    return { committed: 0, completed: 0 }
  }
}

export function saveFollowThrough(ft: FollowThrough) {
  if (typeof window === 'undefined') return
  localStorage.setItem(FT_KEY, JSON.stringify(ft))
}
