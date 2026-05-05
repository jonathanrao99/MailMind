#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/desktop"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to run desktop app." >&2
  exit 1
fi

cd "$DESKTOP_DIR"
if [[ ! -d node_modules ]]; then
  npm install
fi
npm run build:mail
npm run dev
