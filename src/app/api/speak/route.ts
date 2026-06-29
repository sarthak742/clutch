import { synthesizeSpeech } from '@/lib/gemini'
import { guardRequest } from '@/lib/apiGuard'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req)
  if (blocked) return blocked
  const { text } = await req.json()
  try {
    const result = await synthesizeSpeech(typeof text === 'string' ? text : '')
    // result is null when Gemini TTS is unavailable — the client then falls back
    // to the browser's SpeechSynthesis so the feature still works in the demo.
    return NextResponse.json({ audio: result?.audioBase64 ?? null })
  } catch (e) {
    console.error('[api/speak] TTS failed:', e)
    return NextResponse.json({ audio: null })
  }
}
