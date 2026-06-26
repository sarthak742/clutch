import { scopeQuestions } from '@/lib/gemini'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  const { task } = await req.json()
  try {
    const questions = await scopeQuestions(task)
    return NextResponse.json({ questions })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/scope] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
