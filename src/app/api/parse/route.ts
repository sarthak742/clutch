import { parseBrainDump } from '@/lib/gemini'
import { guardRequest, readJsonBody } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked

  // Malformed/empty body is the caller's fault → 400, not a 500.
  const body = await readJsonBody<{ dump?: unknown; todayISO?: unknown }>(req)
  if (!body || typeof body.dump !== 'string' || !body.dump.trim()) {
    return NextResponse.json({ error: 'Provide a non-empty "dump" string.' }, { status: 400 })
  }
  const todayISO = typeof body.todayISO === 'string' && body.todayISO ? body.todayISO : new Date().toISOString()

  try {
    const tasks = await parseBrainDump(body.dump, todayISO)
    return NextResponse.json({ tasks })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/parse] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
