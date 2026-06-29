# Server-side proactive alerts — Cloud Scheduler → Cloud Run

This makes CLUTCH's proactivity **real**: a Cloud Scheduler job hits a secured
Cloud Run endpoint once a day, reads every subscriber's task snapshot from
Firestore, and emails overdue/expired alerts via Resend — whether or not anyone
has the app open.

**Google Cloud products used:** Cloud Run (host) · Cloud Scheduler (trigger) ·
Firestore (subscriber store) · plus Resend for delivery.

No service-account keys are needed — the Cloud Run service authenticates to
Firestore with its built-in metadata-server token (Application Default
Credentials). Everything fails soft: off-GCP or unconfigured, the app simply
keeps using its existing in-tab client-side alerts.

---

## How it works

1. The client pushes `{ clientId, email, tasks }` to `POST /api/subscribe`
   whenever the user has alerts enabled. The server stores it in the Firestore
   collection `clutch_subscribers`.
2. Cloud Scheduler calls `POST /api/cron` daily with an
   `Authorization: Bearer <CRON_SECRET>` header.
3. `/api/cron` reads all subscribers, finds overdue deadlines and expired
   commitments, sends each via Resend, and records what it sent (in
   `notifiedJson`) so it never double-emails.

---

## One-time setup

Set your values:

```bash
export PROJECT_ID="<your-gcp-project-id>"
export REGION="us-central1"
export SERVICE="clutch"                       # your Cloud Run service name
export RUN_URL="https://clutch-529610052804.us-central1.run.app"
export CRON_SECRET="$(openssl rand -hex 24)"  # keep this — Scheduler reuses it
```

### 1. Enable Firestore (Native mode) — one collection, no schema

```bash
gcloud services enable firestore.googleapis.com --project "$PROJECT_ID"
gcloud firestore databases create --location="$REGION" --project "$PROJECT_ID"
```

### 2. Let the Cloud Run service account read/write Firestore

```bash
# Find the runtime service account your service uses (often the default compute SA)
SA=$(gcloud run services describe "$SERVICE" --region "$REGION" \
  --format='value(spec.template.spec.serviceAccountName)' --project "$PROJECT_ID")
SA=${SA:-"$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"}

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA}" --role="roles/datastore.user"
```

### 3. Set the runtime env vars on Cloud Run

`GOOGLE_CLOUD_PROJECT` is injected automatically by Cloud Run, so you only need:

```bash
gcloud run services update "$SERVICE" --region "$REGION" --project "$PROJECT_ID" \
  --update-env-vars "CRON_SECRET=${CRON_SECRET},RESEND_API_KEY=<your-resend-key>"
```

### 4. Create the daily Scheduler job

```bash
gcloud services enable cloudscheduler.googleapis.com --project "$PROJECT_ID"

gcloud scheduler jobs create http clutch-daily-alerts \
  --project "$PROJECT_ID" --location "$REGION" \
  --schedule "0 7 * * *" --time-zone "Asia/Kolkata" \
  --uri "${RUN_URL}/api/cron" --http-method POST \
  --headers "Authorization=Bearer ${CRON_SECRET}"
```

---

## Verify / demo it

Trigger it on demand (same call Scheduler makes) and watch the email land:

```bash
curl -i -X POST "${RUN_URL}/api/cron" \
  -H "Authorization: Bearer ${CRON_SECRET}"
# -> 200 {"processed":N,"sent":M}
# A wrong/absent secret returns 401, proving the endpoint is locked down.
```

Or run the Scheduler job immediately:

```bash
gcloud scheduler jobs run clutch-daily-alerts --location "$REGION" --project "$PROJECT_ID"
```

To produce data first: open the deployed app, enable alerts with your email, and
add a task with a deadline in the past — then trigger the cron and the alert
arrives by email.

---

## Notes

- Resend's `onboarding@resend.dev` sender only delivers to the Resend account
  owner's address in test mode. Verify a domain in Resend to email anyone.
- The endpoint is safe to call repeatedly: the `notifiedJson` dedupe map means a
  given overdue task emails once, not every run.
