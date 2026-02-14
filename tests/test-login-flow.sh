#!/bin/bash

echo "=== Testing Phase 6: Client Login Flow ==="
echo ""

echo "1. Testing initial login (username/password)..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tomlandau","password":"qKBcWK3G@*iQbU"}' \
  -c /tmp/cookies.txt)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  # Extract tempToken from response
  TEMP_TOKEN=$(echo "$BODY" | grep -o '"tempToken":"[^"]*' | cut -d'"' -f4)
  
  if [ ! -z "$TEMP_TOKEN" ]; then
    echo "✓ Login successful, received tempToken"
    echo ""
    
    # Check if requireTotp is true
    REQUIRE_TOTP=$(echo "$BODY" | grep -o '"requireTotp":true')
    if [ ! -z "$REQUIRE_TOTP" ]; then
      echo "✓ 2FA required (as expected)"
      echo ""
      
      echo "2. Testing TOTP login..."
      echo "Please enter a TOTP code from your authenticator app:"
      read -p "6-digit code: " TOTP_CODE
      
      TOTP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/auth/login-totp \
        -H "Content-Type: application/json" \
        -d "{\"tempToken\":\"$TEMP_TOKEN\",\"totpCode\":\"$TOTP_CODE\"}" \
        -b /tmp/cookies.txt \
        -c /tmp/cookies.txt)
      
      TOTP_HTTP_CODE=$(echo "$TOTP_RESPONSE" | tail -1)
      TOTP_BODY=$(echo "$TOTP_RESPONSE" | head -n -1)
      
      echo "Status: $TOTP_HTTP_CODE"
      echo "Response: $TOTP_BODY"
      echo ""
      
      if [ "$TOTP_HTTP_CODE" = "200" ]; then
        echo "✓ TOTP verification successful!"
        echo ""
        
        echo "3. Testing authenticated API call..."
        CATEGORIES_RESPONSE=$(curl -s -w "\n%{http_code}" \
          http://localhost:3001/api/categories?type=income \
          -b /tmp/cookies.txt)
        
        CAT_HTTP_CODE=$(echo "$CATEGORIES_RESPONSE" | tail -1)
        CAT_BODY=$(echo "$CATEGORIES_RESPONSE" | head -n -1)
        
        echo "Status: $CAT_HTTP_CODE"
        if [ "$CAT_HTTP_CODE" = "200" ]; then
          echo "✓ Authenticated API call successful!"
          echo ""
          echo "=== All tests passed! ==="
        else
          echo "✗ Authenticated API call failed"
          echo "Response: $CAT_BODY"
        fi
      else
        echo "✗ TOTP verification failed"
      fi
    else
      echo "Setup required (user needs to scan QR code)"
    fi
  fi
else
  echo "✗ Login failed"
fi

rm -f /tmp/cookies.txt
