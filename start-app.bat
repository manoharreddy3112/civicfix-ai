@echo off
setlocal
title CivicFix AI - Launcher
cd /d "%~dp0"

echo ==========================================================
echo    CivicFix AI  -  Local launcher
echo ==========================================================
echo.

REM --- 1. Check Node.js ---------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo         Download it from https://nodejs.org  then run this again.
  echo.
  pause
  exit /b 1
)

REM --- 2. Create .env files if they are missing ---------------------------
if not exist "backend\.env"  copy "backend\.env.example"  "backend\.env"  >nul
if not exist "frontend\.env" copy "frontend\.env.example" "frontend\.env" >nul

REM --- 3. Install dependencies the first time ----------------------------
if not exist "node_modules" (
  echo Installing root dependencies...
  call npm install
)
if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  call npm install --prefix backend
)
if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  call npm install --prefix frontend
)

REM --- 4. Start backend + frontend in two windows ------------------------
echo.
echo Starting the API and the web app in two new windows...
start "CivicFix API" /D "%~dp0backend"  cmd /k "npm run dev:mem"
start "CivicFix Web" /D "%~dp0frontend" cmd /k "npm run dev"

echo.
echo ==========================================================
echo   Open this link in your browser:  http://localhost:5173
echo.
echo   To STOP the app: close the two new windows.
echo ==========================================================
echo.
timeout /t 10 >nul
endlocal
