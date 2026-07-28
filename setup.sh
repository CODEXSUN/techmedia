#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and configure it first." >&2
  exit 1
fi

npm install
npm run build
npm run db:migrate
npm run db:seed

echo "TechMedia setup completed."
