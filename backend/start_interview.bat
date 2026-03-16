@echo off
setlocal
echo ===================================================
echo AI INTERVIEWER - STARTUP SCRIPT
echo ===================================================

echo [1/3] Checking Backend Dependencies...
where uv >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Detected uv... syncing
    uv sync
) else (
    echo Using pip...
    pip install -r requirements.txt
)

echo [2/3] Starting Backend API...
start "AI Interviewer - Backend" cmd /k "uv run python api.py"

echo [3/3] Starting Frontend...
cd frontend
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

start "AI Interviewer - Frontend" cmd /k "npm run dev"

echo ===================================================
echo DONE! Servers are starting in new windows.
echo ===================================================
pause
