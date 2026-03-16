@echo off
echo ==========================================
echo   AI Interviewer - Unified Starter
echo ==========================================

start cmd /k "echo Starting Backend... && cd /d %~dp0backend && uv run python api.py"
start cmd /k "echo Starting Frontend... && cd /d %~dp0frontend && npm run dev"

echo Project is starting in separate windows.
echo Backend: http://127.0.0.1:5000
echo Frontend: http://127.0.0.1:3000
echo ==========================================
pause
