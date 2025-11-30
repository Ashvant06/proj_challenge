#!/usr/bin/env bash
set -o errexit

echo "💿 Setting Puppeteer cache dir..."
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p "$PUPPETEER_CACHE_DIR"
echo "PUPPETEER_CACHE_DIR is $PUPPETEER_CACHE_DIR"

echo "📦 Installing NPM deps..."
# Use npm ci if package-lock.json exists, otherwise npm install
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "🌐 Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome

echo "✅ Build finished."
