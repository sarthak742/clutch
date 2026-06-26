import { generateReflection } from '@/lib/gemini'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { task, steps, totalMinutes, stuckCount, elapsedSeconds } = await req.json()
  try {
    const result = await generateReflection(task, steps, totalMinutes, stuckCount, elapsedSeconds)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/reflect] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
