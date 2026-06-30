import { NextRequest, NextResponse } from 'next/server'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 24
const MAX_BODY_BYTES = 900_000

type Bucket = { count: number; resetAt: number }

// NOTE ON SCOPE: this limiter is per-instance (in-memory). On Cloud Run it is
// approximately global only when the service runs a small, bounded number of
// instances. Deploy with a low `--max-instances` and a sane `--concurrency`
// (see deploy.sh) so the per-instance budget stays close to the intended global
// one. For strict global limiting you'd move these buckets to shared state
// (e.g. Firestore / Memorystore); that's deliberately out of scope for the demo.
const buckets = new Map<string, Bucket>()
let lastSweep = 0

// Previously this Map grew without bound (one entry per client IP, never
// removed) — a slow memory leak on a long-lived instance. Sweep expired buckets
// at most once per window so memory stays flat.
function sweep(now: number) {
  if (now - lastSweep < WINDOW_MS) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

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
  sweep(now)
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

/**
 * Safely read a JSON body. Returns the parsed object, or null when the body is
 * missing or malformed — so routes can answer 400 instead of throwing a 500.
 */
export async function readJsonBody<T = Record<string, unknown>>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}
