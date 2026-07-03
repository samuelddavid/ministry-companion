#!/bin/bash
echo "🚀 Ministry Companion — Deploying to Firebase..."
npm install
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting
echo ""
echo "✅ Live at: https://ministry-companion-7f836.web.app"
