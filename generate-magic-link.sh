#!/bin/bash
# Genereer een magic link voor testen (zonder email te versturen)
# Gebruik: ./generate-magic-link.sh [email]

EMAIL="${1:-test@rentetool.nl}"
SUPABASE_URL="https://mgdpvjnvchgqhsrddnoi.supabase.co"
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY backend/.env | cut -d= -f2)
ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY frontend/.env.local | cut -d= -f2)

RESULT=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/generate_link" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"magiclink\", \"email\": \"$EMAIL\"}")

LINK=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('action_link','FOUT: kon link niet genereren'))")

echo ""
echo "Magic link voor: $EMAIL"
echo ""
echo "$LINK"
echo ""
