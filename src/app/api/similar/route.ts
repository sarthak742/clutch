import { findSimilarTasks } from '@/lib/gemini'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  const { newTitles, existingTitles } = await req.json()
  try {
    const matches = await findSimilarTasks(
      Array.isArray(newTitles) ? newTitles : [],
      Array.isArray(existingTitles) ? existingTitles : [],
    )
    return NextResponse.json({ matches })
  } catch (e) {
    console.error('[api/similar] embeddings failed:', e)
    return NextResponse.json({ matches: {} })
  }
}
