#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
LANDING_DIR="$ROOT_DIR/apps/landing"
VENV_DIR="$BACKEND_DIR/.venv"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not installed." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to build landing assets." >&2
  exit 1
fi

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating backend virtualenv..."
  python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

echo "Installing/updating backend dependencies..."
pip install -r "$BACKEND_DIR/requirements.txt"

echo "Installing/updating landing dependencies..."
cd "$LANDING_DIR"
npm install

echo "Building landing assets..."
npm run build

echo "Starting MailMind backend on http://127.0.0.1:8000"
cd "$BACKEND_DIR"
exec uvicorn main:app --reload --host 0.0.0.0 --port 8000
