@echo off
title LifePilot AI Launcher
cd /d "%~dp0"

echo ========================================================
echo               Launching LifePilot AI
echo ========================================================
echo.

:: 1. Ensure Node.js & npm are reachable in PATH
where node >nul 2>&1
if errorlevel 1 (
    if exist "C:\Users\Pratik\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64" (
        set "PATH=C:\Users\Pratik\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64;%PATH%"
    )
)

:: 2. Auto-initialize environment variables if missing
if not exist "%~dp0server\.env" (
    copy "%~dp0server\.env.example" "%~dp0server\.env" >nul 2>&1
)
if not exist "%~dp0client\.env" (
    copy "%~dp0client\.env.example" "%~dp0client\.env" >nul 2>&1
)

:: 3. Ensure required runtime directories exist
if not exist "%~dp0server\uploads" mkdir "%~dp0server\uploads" >nul 2>&1
if not exist "%~dp0server\data" mkdir "%~dp0server\data" >nul 2>&1

:: 4. Verify/download server dependencies if not present
if not exist "%~dp0server\node_modules" (
    echo [*] Installing backend dependencies...
    cd /d "%~dp0server" && call npm install
    cd /d "%~dp0"
)

:: 5. Verify/download client dependencies if not present
if not exist "%~dp0client\node_modules" (
    echo [*] Installing frontend dependencies...
    cd /d "%~dp0client" && call npm install
    cd /d "%~dp0"
)

:: 6. Optional local MongoDB service start
net start MongoDB >nul 2>&1

:: 7. Free ports 5000 and 5173 to avoid EADDRINUSE conflicts
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: 8. Launch backend server in the background (minimized)
echo [*] Starting Backend Server...
start /min "LifePilot Backend" cmd /c "cd /d "%~dp0server" && npm run dev"

:: 9. Launch frontend client in the background (minimized, no terminal popup)
echo [*] Starting Frontend Server...
start /min "LifePilot Frontend" cmd /c "cd /d "%~dp0client" && npm run dev"

:: 10. Wait for Vite server to become active and pop open the browser automatically
echo [*] Waiting for app to be ready...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready = $false; for ($i=0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 400 }; Start-Process 'http://localhost:5173'"

echo.
echo ========================================================
echo  🚀 LifePilot AI is open in your browser!
echo  - URL: http://localhost:5173
echo  - Demo login: demo@lifepilot.ai / demopass123
echo ========================================================
echo.
