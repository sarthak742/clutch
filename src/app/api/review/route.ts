import { reviewProof } from '@/lib/gemini'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  const { task, action, status, proofText, proofImage } = await req.json()
  try {
    const review = await reviewProof(task, action, status, proofText, proofImage)
    return NextResponse.json(review)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/review] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
