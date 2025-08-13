#!/bin/bash

set -euo pipefail

LOG_FILE="./startup.log"
APP_NAME="klim-bot"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check for required commands
for cmd in git npm pm2; do
  if ! command -v $cmd &> /dev/null; then
    log "❌ Error: '$cmd' is not installed or not in PATH."
    exit 1
  fi
done

# Check for package.json
if [ ! -f package.json ]; then
  log "❌ Error: package.json not found in current directory ($(pwd))"
  exit 1
fi

log "🔄 Pulling latest code from Git..."
git pull | tee -a "$LOG_FILE"

log "📦 Installing dependencies..."
npm install | tee -a "$LOG_FILE"

log "⚙️ Running npm setup..."
npm run setup | tee -a "$LOG_FILE"

# Check if app is already running
if pm2 list | grep -q "$APP_NAME"; then
  log "🛑 Stopping existing PM2 process: $APP_NAME"
  pm2 delete "$APP_NAME" | tee -a "$LOG_FILE"
fi

log "🚀 Starting app with PM2 as '$APP_NAME'..."
pm2 start npm --name "$APP_NAME" -- run start:pm2 | tee -a "$LOG_FILE"

log "✅ App '$APP_NAME' started successfully."
