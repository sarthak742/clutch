import { listSubscribers, saveNotified } from '@/lib/subscribers'
import { sendOverdueAlert } from '@/lib/email'
import { alertWindowStart } from '@/lib/task'
import type { Effort } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// Triggered by Cloud Scheduler (hourly). Secured by a shared secret that the
// scheduler sends as `Authorization: Bearer <CRON_SECRET>`. This is what makes
// CLUTCH's proactivity real and server-side: it runs whether or not any user
// has the tab open, and it warns BEFORE the deadline using a per-task lead time
// that Gemini chose from the task's complexity.

interface CronCommitment {
  id?: string
  action?: string
  committedAt?: number
  durationMin?: number
  outcome?: unknown
}
interface CronTask {
  id?: string
  title?: string
  status?: string
  deadline?: number | null
  effort?: Effort
  alertLeadHours?: number
  commitments?: CronCommitment[]
}

function dueReason(deadline: number, now: number): { reason: string; upcoming: boolean } {
  if (deadline <= now) return { reason: 'the deadline has passed', upcoming: false }
  const hours = Math.round((deadline - now) / 3_600_000)
  if (hours < 1) return { reason: 'due in under an hour', upcoming: true }
  if (hours < 48) return { reason: `due in ${hours} hour${hours === 1 ? '' : 's'}`, upcoming: true }
  return { reason: `due in ${Math.round(hours / 24)} days`, upcoming: true }
}

async function runCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const subscribers = await listSubscribers()
  let sent = 0

  for (const sub of subscribers) {
    const notified = sub.notified || {}
    let changed = false

    for (const task of sub.tasks as CronTask[]) {
      if (!task || typeof task !== 'object') continue

      // Proactive deadline warning: fire once we enter the Gemini-decided lead
      // window before the deadline (this also covers the already-overdue case).
      if (task.status !== 'done' && task.status !== 'dropped' && typeof task.deadline === 'number') {
        const windowStart = alertWindowStart({ deadline: task.deadline, effort: task.effort ?? 'medium', alertLeadHours: task.alertLeadHours })
        if (windowStart !== null && now >= windowStart) {
          const key = `${task.id}-deadline`
          if (!notified[key]) {
            const { reason, upcoming } = dueReason(task.deadline, now)
            const ok = await sendOverdueAlert(sub.email, task.title || 'a task', reason, upcoming)
            if (ok) { notified[key] = now; changed = true; sent += 1 }
          }
        }
      }

      // Expired commitment without proof
      for (const c of Array.isArray(task.commitments) ? task.commitments : []) {
        if (!c?.outcome && typeof c?.committedAt === 'number' && now > c.committedAt + (c.durationMin || 0) * 60_000) {
          const key = `${c.id}-commitment`
          if (!notified[key]) {
            const ok = await sendOverdueAlert(sub.email, `${task.title || 'a task'} (commitment: ${c.action || ''})`, 'timer expired without proof')
            if (ok) { notified[key] = now; changed = true; sent += 1 }
          }
        }
      }
    }

    if (changed) await saveNotified(sub.clientId, notified)
  }

  return NextResponse.json({ processed: subscribers.length, sent })
}

// Cloud Scheduler can be configured for either POST or GET; support both.
export async function POST(req: NextRequest) {
  return runCron(req)
}
export async function GET(req: NextRequest) {
  return runCron(req)
}
