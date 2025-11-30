#!/usr/bin/env bash
set -o errexit

echo "📦 Installing Node dependencies..."
npm install

# Put Puppeteer's cache (Chrome) INSIDE the project so it's available at runtime
export PUPPETEER_CACHE_DIR="$(pwd)/.puppeteer-cache"
echo "💿 Using PUPPETEER_CACHE_DIR: $PUPPETEER_CACHE_DIR"
mkdir -p "$PUPPETEER_CACHE_DIR"

echo "🌐 Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome

echo "✅ Build finished."
