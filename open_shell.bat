@echo off
echo ===========================================
echo   AI Interviewer - Shell with .venv Active
echo ===========================================
start powershell -NoExit -ExecutionPolicy Bypass -Command "& '%~dp0.venv\Scripts\Activate.ps1'; cd '%~dp0backend'; Clear-Host; Write-Host '🚀 Virtual Environment Activated!' -ForegroundColor Green"
