#!/bin/bash
# Script to sync environment variables from .env.local to Vercel
# Usage: bash scripts/sync-env-to-vercel.sh

echo "🔄 Syncing environment variables to Vercel..."
echo ""
echo "⚠️  Make sure you have Vercel CLI installed: npm i -g vercel"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local file not found"
  exit 1
fi

# Pull current Vercel environment
echo "📥 Pulling current Vercel configuration..."
vercel env pull .env.vercel

echo ""
echo "📋 Add these variables manually in Vercel Dashboard:"
echo "   https://vercel.com/dashboard -> Your Project -> Settings -> Environment Variables"
echo ""

# Extract all non-comment, non-empty lines from .env.local
grep -v "^#" .env.local | grep -v "^$" | while IFS='=' read -r key value; do
  if [ ! -z "$key" ]; then
    echo "  ✓ $key"
  fi
done

echo ""
echo "💡 TIP: You can also use this command for each variable:"
echo "   vercel env add VARIABLE_NAME production"
echo ""
echo "📝 Important variables for authentication:"
echo "   - AUTH_USER_TOM_PASSWORD_HASH"
echo "   - AUTH_USER_YAEL_PASSWORD_HASH"
echo "   - JWT_SECRET"
echo "   - JWT_REFRESH_SECRET"
echo "   - AIRTABLE_API_KEY"
echo "   - AIRTABLE_BASE_ID"
