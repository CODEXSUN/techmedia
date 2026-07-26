#!/usr/bin/env sh
set -eu

# TMApp Platform API runtime.
exec node dist/platform/api/server.js
