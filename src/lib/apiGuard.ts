import { NextRequest, NextResponse } from 'next/server'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 24
const MAX_BODY_BYTES = 900_000

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')
  return forwarded || realIp || 'local'
}

export function guardRequest(req: NextRequest): NextResponse | null {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const size = Number(req.headers.get('content-length') ?? 0)
  if (size > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }

  const now = Date.now()
  const key = clientKey(req)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }
  if (bucket.count >= MAX_REQUESTS) {
    return NextResponse.json({ error: 'Slow down and try again in a minute.' }, { status: 429 })
  }
  bucket.count += 1
  return null
}
