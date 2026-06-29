import { listSubscribers, saveNotified } from '@/lib/subscribers'
import { sendOverdueAlert } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

// Triggered by Cloud Scheduler once a day. Secured by a shared secret that the
// scheduler sends as `Authorization: Bearer <CRON_SECRET>`. This is what makes
// CLUTCH's proactivity real and server-side: it runs whether or not any user
// has the tab open.

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
  commitments?: CronCommitment[]
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

      // Overdue deadline
      if (task.status !== 'done' && task.status !== 'dropped' && typeof task.deadline === 'number' && task.deadline < now) {
        const key = `${task.id}-deadline`
        if (!notified[key]) {
          const ok = await sendOverdueAlert(sub.email, task.title || 'a task', 'deadline has passed')
          if (ok) { notified[key] = now; changed = true; sent += 1 }
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
