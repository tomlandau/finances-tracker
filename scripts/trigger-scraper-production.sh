#!/bin/bash

# Trigger scraper on Railway production
# Usage: ./scripts/trigger-scraper-production.sh

RAILWAY_URL="https://finances-tracker-production.up.railway.app"  # Update this with your Railway URL

echo "🔐 Logging in to Railway..."

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tomlandau",
    "password": "your_password_here"
  }' \
  -c /tmp/railway-cookies.txt)

echo "$LOGIN_RESPONSE" | jq '.'

# Check if login was successful
if echo "$LOGIN_RESPONSE" | jq -e '.requiresTOTP' > /dev/null 2>&1; then
  echo ""
  echo "🔑 TOTP required. Enter your 2FA code:"
  read -r TOTP_CODE

  # Login with TOTP
  LOGIN_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/api/auth/login-totp" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"tomlandau\",
      \"password\": \"your_password_here\",
      \"totpCode\": \"$TOTP_CODE\"
    }" \
    -c /tmp/railway-cookies.txt)

  echo "$LOGIN_RESPONSE" | jq '.'
fi

# Check if login succeeded
if ! echo "$LOGIN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "❌ Login failed!"
  exit 1
fi

echo ""
echo "✅ Logged in successfully!"
echo ""
echo "🔄 Triggering scraper..."

# Trigger scraper
SCRAPER_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/api/scraper/trigger" \
  -b /tmp/railway-cookies.txt)

echo "$SCRAPER_RESPONSE" | jq '.'

# Cleanup
rm -f /tmp/railway-cookies.txt

echo ""
if echo "$SCRAPER_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "✅ Scraper completed successfully!"
  echo "$SCRAPER_RESPONSE" | jq '.summary'
else
  echo "❌ Scraper failed!"
fi
