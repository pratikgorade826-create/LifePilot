@echo off
title LifePilot AI Launcher
cd /d "%~dp0"

echo ========================================================
echo               Launching LifePilot AI
echo ========================================================
echo.

if not exist "%~dp0server\node_modules" (
    echo [1/3] Installing server dependencies...
    cd /d "%~dp0server" && call npm install
    cd /d "%~dp0"
)

if not exist "%~dp0client\node_modules" (
    echo [2/3] Installing client dependencies...
    cd /d "%~dp0client" && call npm install
    cd /d "%~dp0"
)

echo [*] Attempting local MongoDB service startup if present...
net start MongoDB >nul 2>&1

echo [*] Freeing ports 5000 and 5173 if in use...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo [*] Starting Backend Server (Port 5000)...
start "LifePilot Backend" cmd /k "cd /d "%~dp0server" && npm run dev"

echo [*] Starting Frontend Client (Port 5173)...
start "LifePilot Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo [*] Waiting for services to initialize...
timeout /t 3 >nul

echo [*] Opening application in browser...
start http://localhost:5173

echo.
echo ========================================================
echo  LifePilot AI is running!
echo  - Frontend : http://localhost:5173
echo  - Backend  : http://localhost:5000
echo ========================================================
echo.

