#!/usr/bin/env bash
set -o errexit

# Install Node dependencies
npm install

# Create cache folder for Puppeteer
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR

# Install the Chromium browser Puppeteer needs
npx puppeteer browsers install chrome
