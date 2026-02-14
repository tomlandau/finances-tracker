#!/bin/bash

echo "=== Testing Phase 6: Login Flow ==="
echo ""

echo "1. Testing login..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tomlandau","password":"qKBcWK3G@*iQbU"}' \
  -c /tmp/cookies.txt | jq '.'

echo ""
echo "Login response saved to cookies"
