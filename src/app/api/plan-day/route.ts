import { planDayWithFunctionCalling } from '@/lib/gemini'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  const { tasks } = await req.json()
  try {
    const plan = await planDayWithFunctionCalling(Array.isArray(tasks) ? tasks : [])
    return NextResponse.json(plan)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/plan-day] Gemini function call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
