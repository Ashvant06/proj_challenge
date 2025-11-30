#!/usr/bin/env bash
set -o errexit

echo "📦 Installing Node dependencies..."
npm install

echo "🖥️ Installing system Chromium..."
apt-get update
apt-get install -y chromium

echo "✅ Build finished."
