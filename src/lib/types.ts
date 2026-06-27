export type Stage = 'observing' | 'hypothesis' | 'strategy' | 'hint' | 'fullAnswer'
export type StageStatus = 'pending' | 'streaming' | 'done'

export interface StageState {
  text: string
  status: StageStatus
}

export interface Step {
  id: string
  text: string
  minutes: number
  done: boolean
}

export interface Session {
  id: string
  task: string
  totalMinutes: number
  steps: Step[]
  startedAt: number
  stuckCount: number
}

export interface ReflectionData {
  summary: string
  focusScore: number
  observation: string
}

// ── Clutch: accountability companion ──────────────────────────────

export type TaskCategory = 'work' | 'study' | 'admin' | 'personal' | 'errand' | 'other'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'dropped'
/** quick: <15m · medium: ~1h · deep: multi-hour */
export type Effort = 'quick' | 'medium' | 'deep'

/** Why the user is avoiding a task — drives which artifact Clutch produces. */
export type BlockerKind = 'vague' | 'intimidating' | 'dont_know_how' | 'boring' | 'unknown'

export interface CommitmentOutcome {
  status: 'done' | 'partial' | 'skipped'
  /** Pasted text / note the user showed as proof. */
  proof?: string
  /** Base64 screenshot shown as proof. */
  proofImage?: string
  offTaskSeconds?: number
  leftTabCount?: number
  reviewVerdict?: 'accepted' | 'partial' | 'rejected'
  reviewSolid?: boolean
  reviewReaction?: string
  at: number
}

export interface Commitment {
  id: string
  action: string
  durationMin: number
  committedAt: number
  offTaskSeconds?: number
  leftTabCount?: number
  outcome?: CommitmentOutcome
}

export interface ClutchTask {
  id: string
  title: string
  /** epoch ms; null = no hard deadline */
  deadline: number | null
  effort: Effort
  category: TaskCategory
  status: TaskStatus
  // ── behavioral signals (real, logged — not inferred) ──
  createdAt: number
  lastTouched: number
  deferralCount: number
  openedThenBailed: number
  progressNotes: string[]
  // ── agentic output ──
  blocker?: BlockerKind
  /** The produced plan / draft / first step. */
  artifact?: string
  agentTrace?: AgentTraceItem[]
  commitments: Commitment[]
}

export interface AgentTraceItem {
  label: string
  detail: string
}

/** Raw shape returned by the brain-dump parser before we hydrate to ClutchTask. */
export interface ParsedTask {
  title: string
  /** ISO date (YYYY-MM-DD) or null if no deadline mentioned. */
  deadlineISO: string | null
  effort: Effort
  category: TaskCategory
}

export interface FollowThrough {
  committed: number
  completed: number
}
