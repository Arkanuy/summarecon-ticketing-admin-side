#!/usr/bin/env bash
# Bukti bug: publish/unpublish tidak konsisten dengan publishedAt.
set -u
CK="/c/Users/Arkan/AppData/Local/hermes/cache/scratch/ck.txt"
BASE="http://127.0.0.1:3001"
ID="EVT-SWG-001"

say() { printf '\n--- %s ---\n' "$1"; }

say "0. login"
curl -s -m 20 -c "$CK" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.demo@example.test","password":"Summarecon2026!"}' \
  -o /dev/null -w "login http=%{http_code}\n"
# curl -b butuh file cookie berformat Netscape; -c hanya menulis, jadi set header manual.
TOK=$(grep summa_admin_session "$CK" | awk '{print $7}')
AUTH="Cookie: summa_admin_session=$TOK"

say "1. keadaan awal"
node scripts/probe-events.mjs 2>/dev/null | grep "${ID#EVT-}"

say "2. PATCH {published:true} pada event CANCELLED"
curl -s -m 20 -H "$AUTH" -X PATCH "$BASE/api/events/$ID" \
  -H "Content-Type: application/json" -d '{"published":true}'
printf '\n'
node scripts/probe-events.mjs 2>/dev/null | grep "${ID#EVT-}"

say "3. PATCH {published:false}"
curl -s -m 20 -H "$AUTH" -X PATCH "$BASE/api/events/$ID" \
  -H "Content-Type: application/json" -d '{"published":false}'
printf '\n'
node scripts/probe-events.mjs 2>/dev/null | grep "${ID#EVT-}"

say "4. PATCH {event_status:SALES_OPEN}"
curl -s -m 20 -H "$AUTH" -X PATCH "$BASE/api/events/$ID" \
  -H "Content-Type: application/json" -d '{"event_status":"SALES_OPEN"}'
printf '\n'
node scripts/probe-events.mjs 2>/dev/null | grep "${ID#EVT-}"
