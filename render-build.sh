#!/usr/bin/env bash
set -o errexit

# Where Puppeteer should cache Chrome (Render-friendly path)
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p "$PUPPETEER_CACHE_DIR"

echo "Installing npm dependencies..."
npm install

echo "Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome

echo "Build finished."
