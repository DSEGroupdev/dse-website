#!/usr/bin/env bash
# DSE Group daily blog runner (Hostinger cron).
# The site goes live the moment the post is generated, because this runs
# inside the live web root. The GitHub push afterward is best-effort sync:
# if it fails (network, token), the post is still published and we log it.
set -uo pipefail
cd "$(dirname "$0")/.."

git pull -q origin main || echo "$(date -Is) WARN: git pull failed, continuing with local copy"

if python3 automation/generate_post.py; then
  git add -A
  git commit -q -m "Daily insight: $(date +%F)" || true
  git push -q origin main || echo "$(date -Is) WARN: push failed, post is live locally; will sync on next successful push"
  echo "$(date -Is) published OK"
else
  echo "$(date -Is) ERROR: generation failed, nothing published"
  exit 1
fi
