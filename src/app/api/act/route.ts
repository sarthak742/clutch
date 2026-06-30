import { generateAction } from '@/lib/gemini'
import { guardRequest, readJsonBody } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked

  const body = await readJsonBody<{ task?: unknown; qa?: unknown; note?: unknown }>(req)
  if (!body || !body.task || typeof body.task !== 'object') {
    return NextResponse.json({ error: 'Provide a "task" object.' }, { status: 400 })
  }
  const qa = Array.isArray(body.qa) ? body.qa : []
  const note = typeof body.note === 'string' ? body.note : undefined

  try {
    const plan = await generateAction(body.task as Parameters<typeof generateAction>[0], qa, note)
    return NextResponse.json(plan)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/act] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
