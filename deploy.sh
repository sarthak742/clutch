#!/usr/bin/env bash
# CLUTCH — Cloud Run deploy helper.
#
# Fixes the cold-start latency that hurts first impressions during judging by
# keeping one warm instance (--min-instances=1) and giving startup a CPU boost.
#
# Usage:
#   ./deploy.sh            # full build + deploy from source
#   ./deploy.sh --warm     # ONLY fix cold start on the already-deployed service
#
# Requires: gcloud CLI authenticated to the project that owns the service.
set -euo pipefail

SERVICE="clutch"
REGION="us-central1"
# Caps the in-memory rate limiter's drift: with a low max-instances the
# per-instance budget stays close to the intended global one (see apiGuard.ts).
MIN_INSTANCES=1
MAX_INSTANCES=4
CONCURRENCY=80

if [[ "${1:-}" == "--warm" ]]; then
  echo "Keeping one warm instance on the live service (no rebuild)…"
  gcloud run services update "$SERVICE" \
    --region "$REGION" \
    --min-instances="$MIN_INSTANCES" \
    --cpu-boost
  echo "Done. Cold starts should be gone."
  exit 0
fi

echo "Building and deploying $SERVICE to $REGION…"
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances="$MIN_INSTANCES" \
  --max-instances="$MAX_INSTANCES" \
  --concurrency="$CONCURRENCY" \
  --cpu-boost

echo "Deployed. https://$SERVICE-<project-number>.$REGION.run.app/"
