import { redecomposeStep } from '@/lib/gemini'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { step, task } = await req.json()
  try {
    const result = await redecomposeStep(step, task)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/redecompose] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
