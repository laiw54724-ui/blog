#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_VERSION="$(tr -d '[:space:]' < "${ROOT_DIR}/.nvmrc")"

if [[ $# -eq 0 ]]; then
  echo "Usage: ./tools/with-node.sh <command> [args...]" >&2
  exit 1
fi

if ! command -v fnm >/dev/null 2>&1; then
  echo "fnm is required to run this command. Install fnm or use Node ${NODE_VERSION} manually." >&2
  exit 1
fi

cd "${ROOT_DIR}"
exec fnm exec --using "${NODE_VERSION}" "$@"
