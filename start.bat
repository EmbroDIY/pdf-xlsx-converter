@echo off
title PDF to XLSX Converter

echo Starting PDF to XLSX Converter...
echo.

:: Check if uv is available
where uv >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: uv is not installed.
    echo Install it by running: pip install uv
    echo.
    pause
    exit /b 1
)

:: Check if Ollama is available
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Ollama is not installed.
    echo Download it from: https://ollama.com
    echo.
    pause
    exit /b 1
)

:: Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>nul
if %errorlevel% neq 0 (
    echo Starting Ollama...
    start "" ollama serve
    timeout /t 3 /nobreak >nul
)

:: Install/sync dependencies
uv sync
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

:: Open browser after a short delay
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"

:: Start the server
echo.
echo App is running at http://localhost:8000
echo Close this window to stop the server.
echo.
uv run python main.py
pause
