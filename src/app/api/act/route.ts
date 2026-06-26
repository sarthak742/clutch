import { generateAction } from '@/lib/gemini'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { task, qa, note } = await req.json()
  try {
    const plan = await generateAction(task, qa ?? [], note)
    return NextResponse.json(plan)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/act] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
