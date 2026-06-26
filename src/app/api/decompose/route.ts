import { decomposeTask } from '@/lib/gemini'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  const { task, minutes } = await req.json()
  try {
    const result = await decomposeTask(task, minutes)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/decompose] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
