#!/usr/bin/env bash
# DSE Group daily blog: pull, generate, publish.
# Requires: ANTHROPIC_API_KEY exported (or set in the cron line),
# and a git remote that can push (existing repo token works).
set -euo pipefail
cd "$(dirname "$0")/.."

git pull -q origin main
python3 automation/generate_post.py
git add -A
git commit -q -m "Daily insight: $(date +%F)"
git push -q origin main
echo "$(date -Is) published OK"
