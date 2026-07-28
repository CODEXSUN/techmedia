#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Missing .env. Configure it before updating." >&2
  exit 1
fi

npm install
npm run check
npm run build
npm run db:migrate

echo "TechMedia update completed."
