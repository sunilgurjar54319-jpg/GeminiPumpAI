#!/data/data/com.termux/files/usr/bin/bash


echo "🚀 Starting GeminiPumpAI Backend..."

cd ~/GeminiPumpAI

node server.js &

sleep 3


echo "🎨 Starting Frontend..."

cd ~/GeminiPumpAI/frontend

npm run dev -- --host &


echo ""
echo "================================"
echo "✅ GeminiPumpAI Started"
echo ""
echo "Backend:"
echo "http://127.0.0.1:5001"
echo ""
echo "Frontend:"
echo "http://127.0.0.1:5173"
echo "================================"
