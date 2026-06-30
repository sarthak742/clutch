import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

// TEMPORARY diagnostic endpoint — surfaces the real errors from the embedding
// and TTS model calls so we can see why they fail in production. Remove after.
export async function GET() {
  const key = process.env.FOCUS_AGENT_GEMINI_KEY || process.env.GOOGLE_API_KEY || ''
  const result: Record<string, unknown> = { hasKey: Boolean(key) }
  const ai = new GoogleGenAI({ apiKey: key })

  try {
    const r = await ai.models.embedContent(
      { model: 'gemini-embedding-001', contents: 'hello world' } as unknown as Parameters<typeof ai.models.embedContent>[0],
    )
    const rr = r as { embeddings?: Array<{ values?: number[] }>; embedding?: { values?: number[] } }
    result.embed = { ok: true, len: rr.embeddings?.[0]?.values?.length ?? rr.embedding?.values?.length ?? null }
  } catch (e) {
    result.embed = { ok: false, err: (e instanceof Error ? e.message : String(e)).slice(0, 400) }
  }

  try {
    const r = await ai.models.generateContent(
      {
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: 'hi' }] }],
        config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
      } as unknown as Parameters<typeof ai.models.generateContent>[0],
    )
    const rr = r as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }> }
    result.tts = { ok: true, hasAudio: Boolean(rr.candidates?.[0]?.content?.parts?.some((p) => p.inlineData?.data)) }
  } catch (e) {
    result.tts = { ok: false, err: (e instanceof Error ? e.message : String(e)).slice(0, 400) }
  }

  return NextResponse.json(result)
}
