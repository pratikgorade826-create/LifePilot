@echo off
title LifePilot AI Git Sync
cd /d "%~dp0"

echo ========================================================
echo       Syncing LifePilot AI to GitHub
echo ========================================================
echo.

git add .
git commit -m "feat: complete LifePilot AI assistant with zero-config local engine and launcher"
git branch -M main
git push -u origin main

echo.
echo ========================================================
echo  Sync completed!
echo ========================================================
pause

