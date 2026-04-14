#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${ROOT_DIR}/apps/api"
DB_NAME="personal-blog"

run_d1_file() {
  local file="$1"
  echo ""
  echo "==> Applying ${file}"
  (cd "${API_DIR}" && npx wrangler d1 execute "${DB_NAME}" --local --file "../../${file}")
}

run_d1_file "db/schema.sql"
run_d1_file "db/migrate-v2.sql"
run_d1_file "db/migrate-reading.sql"
run_d1_file "db/migrate-profile.sql"
run_d1_file "db/indices.sql"
run_d1_file "db/seeds.sql"

echo ""
echo "Local D1 initialization complete."
