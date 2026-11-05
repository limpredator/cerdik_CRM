@echo off
setlocal

rem Double-click this to pull the latest code, install/build/migrate, and
rem start the server — single click, single process, same window shows the
rem server's live log (close the window to stop it).
rem
rem Requirements already set up once on this machine: Docker Desktop
rem running, and a real .env in this folder (copy .env.example and fill in
rem the real PBX broker details — .env is never pulled from git).

cd /d "%~dp0"

if not exist ".env" (
  echo.
  echo No .env found in %cd%
  echo Copy .env.example to .env and fill in JWT_SECRET, DATABASE_URL, and
  echo the real MQTT_BROKER_URL / MQTT_DEVICE_SERIAL for this PBX, then
  echo run this again.
  echo.
  pause
  exit /b 1
)

echo === Cerdik CRM: updating and starting ===

echo.
echo [1/6] git pull...
git pull
if errorlevel 1 (
  echo.
  echo git pull failed — resolve it ^(conflicts, network^) and try again.
  pause
  exit /b 1
)

echo.
echo [2/6] npm install...
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed.
  pause
  exit /b 1
)

echo.
echo [3/6] starting Postgres ^(docker compose^)...
docker compose up -d
if errorlevel 1 (
  echo.
  echo docker compose failed — is Docker Desktop running?
  pause
  exit /b 1
)

echo.
echo [4/6] running database migrations...
call npm run migrate
if errorlevel 1 (
  echo.
  echo Migration failed.
  pause
  exit /b 1
)

echo.
echo [5/6] building the web app...
call npm run build -w web
if errorlevel 1 (
  echo.
  echo Web build failed.
  pause
  exit /b 1
)

echo.
echo [6/6] starting the server on http://localhost:4100 ...
start "" http://localhost:4100
call npm run start -w server

echo.
echo Server stopped.
pause
