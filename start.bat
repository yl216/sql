@echo off
setlocal
title SQL Practice Launcher
cd /d "%~dp0"

set "PORT=3001"
set "URL=http://127.0.0.1:%PORT%/"
set "SRV_TITLE=SQL Practice - close this window to stop"
set "TIMEOUT=%SystemRoot%\System32\timeout.exe"

REM ---------------------------------------------------------------
REM 1. is something already listening on the port?
REM ---------------------------------------------------------------
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 goto NOT_RUNNING

REM Port is busy. Confirm it is our server and not another program.
REM  -f        : treat HTTP 4xx/5xx as failure, so a proxy error page
REM              cannot be mistaken for a healthy server
REM  --noproxy : keep 127.0.0.1 off the system proxy
curl -sf -m 2 --noproxy "*" -o nul "%URL%api/health" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Port %PORT% is already used by another program.
  echo         Stop it, or change PORT in server\.env, then try again.
  goto FAIL
)
echo Server is already running on port %PORT%.
goto OPEN

:NOT_RUNNING
REM ---------------------------------------------------------------
REM 2. prerequisites
REM ---------------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  echo         Install Node.js 20+ from https://nodejs.org and try again.
  goto FAIL
)

if not exist "server\node_modules\" (
  echo Installing server dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto FAIL
)

if not exist "web\node_modules\" (
  echo Installing web dependencies...
  call npm --prefix web install --no-audit --no-fund
  if errorlevel 1 goto FAIL
)

if not exist "web\dist\index.html" (
  echo Building frontend...
  call npm run build:web
  if errorlevel 1 goto FAIL
)

REM ---------------------------------------------------------------
REM 3. start the server in its own minimized window
REM    Closing that window stops the server.
REM ---------------------------------------------------------------
echo Starting server on port %PORT% ...
start "%SRV_TITLE%" /min cmd /k "node server\src\index.mjs"

REM ---------------------------------------------------------------
REM 4. wait until it answers, then open the browser
REM ---------------------------------------------------------------
set "HAS_CURL=0"
where curl >nul 2>&1 && set "HAS_CURL=1"

if "%HAS_CURL%"=="0" (
  "%TIMEOUT%" /t 4 /nobreak >nul
  goto OPEN
)

set /a tries=0
:WAIT
"%TIMEOUT%" /t 1 /nobreak >nul
curl -sf -m 2 --noproxy "*" -o nul "%URL%api/health" >nul 2>&1
if not errorlevel 1 goto OPEN
set /a tries+=1
if %tries% lss 40 goto WAIT

echo.
echo [ERROR] Server did not respond within 40 seconds.
echo         Open the minimized window titled "%SRV_TITLE%"
echo         to see the error message.
goto FAIL

:OPEN
start "" "%URL%"
exit /b 0

:FAIL
echo.
echo Startup failed. Press any key to close this window.
pause >nul
exit /b 1
