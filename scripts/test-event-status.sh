#!/usr/bin/env bash
# Uji transisi status event lewat API nyata. Fokus: published_at konsisten.
set -u
CK="/c/Users/Arkan/AppData/Local/hermes/cache/scratch/ck.txt"
BASE="http://127.0.0.1:3001"
ID="EVT-SWG-001"

curl -s -m 20 -c "$CK" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.demo@example.test","password":"Summarecon2026!"}' -o /dev/null
TOK=$(grep summa_admin_session "$CK" | awk '{print $7}')
H="Cookie: summa_admin_session=$TOK"

act() {
  printf '\n--- action: %s ---\n' "$1"
  curl -s -m 20 -H "$H" -X PATCH "$BASE/api/events/$ID" \
    -H "Content-Type: application/json" -d "{\"action\":\"$1\"}"
  printf '\n   db: '
  node scripts/probe-events.mjs 2>/dev/null | grep SWG | sed 's/ | sales=.*//'
}

act "reactivate"
act "open_sales"
act "close_sales"
act "unpublish"
act "publish"
act "cancel"

printf '\n--- action tak sah untuk status CANCELLED: open_sales ---\n'
curl -s -m 20 -H "$H" -X PATCH "$BASE/api/events/$ID" \
  -H "Content-Type: application/json" -d '{"action":"open_sales"}'
printf '\n\n--- action ngawur ---\n'
curl -s -m 20 -H "$H" -X PATCH "$BASE/api/events/$ID" \
  -H "Content-Type: application/json" -d '{"action":"delete_everything"}'
printf '\n\n--- body lama (published) harus DITOLAK ---\n'
curl -s -m 20 -H "$H" -X PATCH "$BASE/api/events/$ID" \
  -H "Content-Type: application/json" -d '{"published":true}'
printf '\n'
