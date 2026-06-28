import { chooseIntervention } from '@/lib/gemini'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  const { task } = await req.json()
  try {
    const intervention = await chooseIntervention(task)
    return NextResponse.json(intervention)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/intervene] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
