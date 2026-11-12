#!/usr/bin/env bash
# Uji pencarian halaman Booking lewat HTML nyata (server component, bukan API).
set -u
CK="/c/Users/Arkan/AppData/Local/hermes/cache/scratch/ck.txt"
BASE="http://127.0.0.1:3001"
curl -s -m 20 -c "$CK" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.demo@example.test","password":"Summarecon2026!"}' -o /dev/null
TOK=$(grep summa_admin_session "$CK" | awk '{print $7}')
H="Cookie: summa_admin_session=$TOK"

check() {
  printf '\n--- q="%s" ---\n' "$1"
  curl -s -m 25 -H "$H" "$BASE/bookings?q=$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$1")" \
    | grep -oE '(ATR-2026-0001|ORD-ATR-001|DWT-2026-0001|SWG-2026-000[12])|Tidak ada order yang cocok[^<]*' \
    | sort -u
}

check "ORD-ATR-001"
check "ATR-2026-0001"
check "ORD-SWG"
check "C05"
check "ATR-TKT-0002"
check "zzz-tidak-ada"
