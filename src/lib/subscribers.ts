// Server-only. Persists alert subscribers in Cloud Firestore via its REST API,
// authenticating with the Cloud Run service account token from the metadata
// server. No Firestore SDK and no API keys — pure service auth.
//
// Everything fails soft: off-GCP (local dev) the metadata server is unreachable,
// so every function becomes a no-op and the app keeps working on its existing
// client-side alerts.

const PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.FIRESTORE_PROJECT_ID ||
  ''
const COLLECTION = 'clutch_subscribers'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

export function subscribersEnabled(): boolean {
  return Boolean(PROJECT)
}

// Access token from the Cloud Run metadata server (Application Default Creds).
async function accessToken(): Promise<string | null> {
  try {
    const res = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } },
    )
    if (!res.ok) return null
    const json = (await res.json()) as { access_token?: string }
    return json.access_token ?? null
  } catch {
    return null
  }
}

export interface Subscriber {
  clientId: string
  email: string
  tasks: unknown[]
  notified: Record<string, number>
}

// Upsert a subscriber's email + task snapshot. updateMask leaves notifiedJson intact.
export async function saveSubscriber(clientId: string, email: string, tasks: unknown[]): Promise<boolean> {
  if (!subscribersEnabled() || !clientId || !email) return false
  const token = await accessToken()
  if (!token) return false
  try {
    const url =
      `${BASE}/${COLLECTION}/${encodeURIComponent(clientId)}` +
      `?updateMask.fieldPaths=email&updateMask.fieldPaths=tasksJson&updateMask.fieldPaths=updatedAt`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          email: { stringValue: email },
          tasksJson: { stringValue: JSON.stringify(tasks).slice(0, 900_000) },
          updatedAt: { integerValue: String(Date.now()) },
        },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Read every subscriber. Returns [] on any failure.
export async function listSubscribers(): Promise<Subscriber[]> {
  if (!subscribersEnabled()) return []
  const token = await accessToken()
  if (!token) return []
  const out: Subscriber[] = []
  let pageToken = ''
  try {
    do {
      const url = `${BASE}/${COLLECTION}?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) break
      const json = (await res.json()) as {
        documents?: Array<{ name: string; fields?: Record<string, { stringValue?: string }> }>
        nextPageToken?: string
      }
      for (const doc of json.documents ?? []) {
        const fields = doc.fields ?? {}
        const clientId = doc.name.split('/').pop() || ''
        const email = fields.email?.stringValue || ''
        if (!email) continue
        let tasks: unknown[] = []
        let notified: Record<string, number> = {}
        try { tasks = JSON.parse(fields.tasksJson?.stringValue || '[]') } catch { tasks = [] }
        try { notified = JSON.parse(fields.notifiedJson?.stringValue || '{}') } catch { notified = {} }
        out.push({ clientId, email, tasks, notified })
      }
      pageToken = json.nextPageToken || ''
    } while (pageToken)
  } catch {
    return out
  }
  return out
}

// Persist the per-subscriber "already notified" map so the cron never double-sends.
export async function saveNotified(clientId: string, notified: Record<string, number>): Promise<void> {
  if (!subscribersEnabled() || !clientId) return
  const token = await accessToken()
  if (!token) return
  try {
    const url = `${BASE}/${COLLECTION}/${encodeURIComponent(clientId)}?updateMask.fieldPaths=notifiedJson`
    await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { notifiedJson: { stringValue: JSON.stringify(notified) } } }),
    })
  } catch {
    // fail soft
  }
}
