import type { Session, ClutchTask, FollowThrough } from './types'

const KEY = 'fa-session'
const STORAGE_VERSION = 2

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
const BUNDLE_KEY = 'clutch-state'

type StoredBundle = {
  version: number
  tasks: ClutchTask[]
  followThrough: FollowThrough
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function migrateTask(raw: unknown): ClutchTask | null {
  if (!raw || typeof raw !== 'object') return null
  const task = raw as Partial<ClutchTask>
  const now = Date.now()
  if (typeof task.title !== 'string' || !task.title.trim()) return null
  const status = task.status === 'done' || task.status === 'dropped' || task.status === 'in_progress' ? task.status : 'todo'
  const effort = task.effort === 'quick' || task.effort === 'medium' || task.effort === 'deep' ? task.effort : 'medium'
  const category = task.category === 'work' || task.category === 'study' || task.category === 'admin' || task.category === 'personal' || task.category === 'errand' || task.category === 'other' ? task.category : 'other'
  const deadline = typeof task.deadline === 'number' && Number.isFinite(task.deadline) ? task.deadline : null

  return {
    id: typeof task.id === 'string' && task.id ? task.id : crypto.randomUUID(),
    title: task.title,
    deadline,
    effort,
    category,
    alertLeadHours: typeof task.alertLeadHours === 'number' && task.alertLeadHours > 0 ? task.alertLeadHours : undefined,
    status,
    createdAt: asNumber(task.createdAt, now),
    lastTouched: asNumber(task.lastTouched, now),
    deferralCount: asNumber(task.deferralCount, 0),
    openedThenBailed: asNumber(task.openedThenBailed, 0),
    progressNotes: Array.isArray(task.progressNotes) ? task.progressNotes.filter((n): n is string => typeof n === 'string') : [],
    blocker: task.blocker,
    artifact: typeof task.artifact === 'string' ? task.artifact : undefined,
    groundedSources: Array.isArray(task.groundedSources) ? task.groundedSources.filter((s) => s && typeof s.title === 'string' && typeof s.uri === 'string') : [],
    agentTrace: Array.isArray(task.agentTrace) ? task.agentTrace.filter((i) => i && typeof i.label === 'string' && typeof i.detail === 'string') : [],
    commitments: Array.isArray(task.commitments) ? task.commitments : [],
  }
}

function migrateTasks(raw: unknown): ClutchTask[] {
  if (!Array.isArray(raw)) return []
  return raw.map(migrateTask).filter((t): t is ClutchTask => Boolean(t))
}

function migrateFollowThrough(raw: unknown): FollowThrough {
  if (!raw || typeof raw !== 'object') return { committed: 0, completed: 0 }
  const ft = raw as Partial<FollowThrough>
  return {
    committed: asNumber(ft.committed, 0),
    completed: asNumber(ft.completed, 0),
  }
}

export function loadClutchState(): StoredBundle {
  if (typeof window === 'undefined') return { version: STORAGE_VERSION, tasks: [], followThrough: { committed: 0, completed: 0 } }
  try {
    const bundleRaw = localStorage.getItem(BUNDLE_KEY)
    if (bundleRaw) {
      const parsed = JSON.parse(bundleRaw) as Partial<StoredBundle>
      const state = {
        version: STORAGE_VERSION,
        tasks: migrateTasks(parsed.tasks),
        followThrough: migrateFollowThrough(parsed.followThrough),
      }
      saveClutchState(state.tasks, state.followThrough)
      return state
    }

    const tasks = migrateTasks(JSON.parse(localStorage.getItem(TASKS_KEY) ?? '[]'))
    const followThrough = migrateFollowThrough(JSON.parse(localStorage.getItem(FT_KEY) ?? '{}'))
    saveClutchState(tasks, followThrough)
    return { version: STORAGE_VERSION, tasks, followThrough }
  } catch {
    return { version: STORAGE_VERSION, tasks: [], followThrough: { committed: 0, completed: 0 } }
  }
}

export function saveClutchState(tasks: ClutchTask[], followThrough: FollowThrough) {
  if (typeof window === 'undefined') return
  const state: StoredBundle = { version: STORAGE_VERSION, tasks, followThrough }
  localStorage.setItem(BUNDLE_KEY, JSON.stringify(state))
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  localStorage.setItem(FT_KEY, JSON.stringify(followThrough))
}

export function loadTasks(): ClutchTask[] {
  return loadClutchState().tasks
}

export function saveTasks(tasks: ClutchTask[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function loadFollowThrough(): FollowThrough {
  return loadClutchState().followThrough
}

export function saveFollowThrough(ft: FollowThrough) {
  if (typeof window === 'undefined') return
  localStorage.setItem(FT_KEY, JSON.stringify(ft))
}
