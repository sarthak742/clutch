import { parseBrainDump } from '@/lib/gemini'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { dump, todayISO } = await req.json()
  try {
    const tasks = await parseBrainDump(dump, todayISO)
    return NextResponse.json({ tasks })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/parse] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
