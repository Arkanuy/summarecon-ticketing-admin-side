#!/usr/bin/env bash
# Uji filter daftar event: status + rentang tanggal.
set -u
CK="/c/Users/Arkan/AppData/Local/hermes/cache/scratch/ck.txt"
BASE="http://127.0.0.1:3001"
curl -s -m 20 -c "$CK" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.demo@example.test","password":"Summarecon2026!"}' -o /dev/null
TOK=$(grep summa_admin_session "$CK" | awk '{print $7}')
H="Cookie: summa_admin_session=$TOK"

show() {
  printf '\n--- %s ---\n' "$1"
  curl -s -m 25 -H "$H" "$BASE/events?$2" \
    | grep -oE '(EVT-2026-[A-Z]{3}-001)|Tidak ada event yang cocok[^<]*' | sort -u
}

show "tanpa filter" ""
show "status=SALES_OPEN" "status=SALES_OPEN"
show "status=CANCELLED" "status=CANCELLED"
show "status=DRAFT" "status=DRAFT"
show "tanggal 2026-09-01..2026-09-30" "from=2026-09-01&to=2026-09-30"
show "tanggal 2026-12-01..2026-12-31" "from=2026-12-01&to=2026-12-31"
show "tanggal 2020 (kosong)" "from=2020-01-01&to=2020-12-31"
