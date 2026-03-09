#!/bin/bash

# Quick check of scraper status on Railway
# Usage: ./scripts/check-scraper-status.sh

RAILWAY_URL="${RAILWAY_URL:-https://finances-tracker-production.up.railway.app}"

echo "📊 Checking scraper status on Railway..."
echo "URL: $RAILWAY_URL"
echo ""

# Simple health check
echo "1️⃣ Health check:"
curl -s "$RAILWAY_URL/health" | jq '.'

echo ""
echo "2️⃣ For detailed status, run:"
echo "   npx tsx scripts/trigger-scraper.ts"
echo "   (requires login)"
