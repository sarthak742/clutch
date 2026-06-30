import { NextRequest, NextResponse } from 'next/server'
import { guardRequest } from '@/lib/apiGuard'
import { sendOverdueAlert } from '@/lib/email'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  try {
    const { email, taskTitle, reason, upcoming } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const ok = await sendOverdueAlert(email, taskTitle || 'a task', reason || 'deadline has passed', Boolean(upcoming))
    return NextResponse.json({ success: ok })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[resend] Failed to send email:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
