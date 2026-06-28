import { morningBriefing } from '@/lib/gemini'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  const { tasks, followThrough } = await req.json()
  try {
    const briefing = await morningBriefing(tasks, followThrough)
    return NextResponse.json(briefing)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/briefing] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
