#!/bin/bash

# Usage: ./registrateWebhook.sh <BOT_TOKEN> <WEBHOOK_URL>
# Example: ./registrateWebhook.sh 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11 https://yourdomain.com/webhook

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <BOT_TOKEN> <WEBHOOK_URL>"
  exit 1
fi

BOT_TOKEN="$1"
WEBHOOK_URL="$2"

curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}"