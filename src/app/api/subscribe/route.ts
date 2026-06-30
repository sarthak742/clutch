import { saveSubscriber, getSubscriberSnapshot } from '@/lib/subscribers'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

// The client pushes its email + current task snapshot here so the server-side
// cron has data to act on even when no tab is open. Fails soft off-GCP.
export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  try {
    const { clientId, email, tasks } = await req.json()
    const ok = await saveSubscriber(
      String(clientId || ''),
      String(email || ''),
      Array.isArray(tasks) ? tasks : [],
    )
    return NextResponse.json({ ok })
  } catch (e) {
    console.error('[api/subscribe] failed:', e)
    return NextResponse.json({ ok: false })
  }
}

// Rehydrate a previously-synced task snapshot by clientId. Lets CLUTCH restore
// real tasks after localStorage is cleared instead of losing them — turning the
// Firestore snapshot from alert-only data into durable cross-session storage.
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId') || ''
  if (!clientId) {
    return NextResponse.json({ error: 'Provide a clientId.' }, { status: 400 })
  }
  const snapshot = await getSubscriberSnapshot(clientId)
  return NextResponse.json({ tasks: snapshot?.tasks ?? [] })
}
