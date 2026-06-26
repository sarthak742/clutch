import { streamTrace } from '@/lib/gemini'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { step, task, screenshot } = await req.json()

  // Pull the first chunk up front so failures that happen before any output
  // (e.g. a missing API key) return a clean JSON 500 the client can read,
  // instead of a half-open stream that just looks like a network drop.
  const iterator = streamTrace(step, task, screenshot)[Symbol.asyncIterator]()
  let first: IteratorResult<string>
  try {
    first = await iterator.next()
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/trace] Gemini call failed:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value))
        while (true) {
          const { value, done } = await iterator.next()
          if (done) break
          controller.enqueue(encoder.encode(value))
        }
      } catch (e) {
        // Error mid-stream: log it and close gracefully so the client keeps
        // whatever reasoning streamed so far rather than throwing.
        console.error('[api/trace] stream interrupted:', e)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
