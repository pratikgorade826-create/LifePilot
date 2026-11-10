@echo off
title LifePilot AI Launcher
cd /d "%~dp0"

if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"

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

:: 8. Launch backend & frontend completely hidden in background (NEVER open CMD windows)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$b = New-Object System.Diagnostics.ProcessStartInfo; $b.FileName = 'cmd.exe'; $b.Arguments = '/c npm run dev'; $b.WorkingDirectory = (Join-Path '%~dp0' 'server'); $b.CreateNoWindow = $true; $b.UseShellExecute = $false; [System.Diagnostics.Process]::Start($b) | Out-Null; " ^
  "$f = New-Object System.Diagnostics.ProcessStartInfo; $f.FileName = 'cmd.exe'; $f.Arguments = '/c npm run dev'; $f.WorkingDirectory = (Join-Path '%~dp0' 'client'); $f.CreateNoWindow = $true; $f.UseShellExecute = $false; [System.Diagnostics.Process]::Start($f) | Out-Null"

:: 9. Directly open the browser (never command prompt)
start "" "http://localhost:5173"

echo.
echo ========================================================
echo  🚀 LifePilot AI is open in your browser!
echo  - URL: http://localhost:5173
echo  - Demo login: demo@lifepilot.ai / demopass123
echo ========================================================
echo.
