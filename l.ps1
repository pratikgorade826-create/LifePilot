Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "              Launching LifePilot AI" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$env:PATH = "C:\Program Files\nodejs;$env:PATH"

$root = $PSScriptRoot

Get-NetTCPConnection -LocalPort 5000, 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "[*] Starting LifePilot AI services..." -ForegroundColor Green
node "$root\start.js"
