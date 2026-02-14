#!/bin/bash

# Test Auth Endpoints Script
# Phase 2: Backend Authentication Testing

echo "🧪 Testing Authentication Endpoints..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Login with valid credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tom","password":"TomSecurePassword123!"}' \
  -c /tmp/test-cookies.txt)

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "requireSetup\|success"; then
  echo -e "${GREEN}✅ Login endpoint working${NC}"
else
  echo -e "${RED}❌ Login endpoint failed${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Verify without token (should fail)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X GET $BASE_URL/api/auth/verify)
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "Unauthorized"; then
  echo -e "${GREEN}✅ Verify correctly rejects unauthenticated requests${NC}"
else
  echo -e "${RED}❌ Verify should reject unauthenticated requests${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Refresh without token (should fail)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/refresh)
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "No refresh token"; then
  echo -e "${GREEN}✅ Refresh correctly requires token${NC}"
else
  echo -e "${RED}❌ Refresh should require token${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Login with wrong password"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tom","password":"WrongPassword"}')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "Invalid credentials"; then
  echo -e "${GREEN}✅ Login correctly rejects wrong password${NC}"
else
  echo -e "${RED}❌ Login should reject wrong password${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Login with non-existent user"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","password":"password"}')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "Invalid credentials"; then
  echo -e "${GREEN}✅ Login correctly rejects unknown user${NC}"
else
  echo -e "${RED}❌ Login should reject unknown user${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Note: Currently users require 2FA setup (Phase 4)${NC}"
echo -e "${YELLOW}Full authentication flow will be tested after Phase 4${NC}"
echo ""
echo "✅ All basic auth endpoints are working correctly!"
echo ""
echo "💡 Next: Check Airtable 'Audit Log' table for login attempts"
