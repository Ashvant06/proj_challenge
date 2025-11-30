#!/usr/bin/env bash
set -o errexit

# Where Puppeteer should cache Chrome
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p "$PUPPETEER_CACHE_DIR"

# Install dependencies
npm install

# Download Chrome that Puppeteer expects
npx puppeteer browsers install chrome
