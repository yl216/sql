@echo off
setlocal enabledelayedexpansion
title SQL Practice - stop
cd /d "%~dp0"

set "PORT=3001"
set "FOUND="
set "TIMEOUT=%SystemRoot%\System32\timeout.exe"

REM Kills whatever is listening on the port. That is normally this
REM project's server, but if another program grabbed the port it gets
REM killed too, so check before using this.
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo Stopping PID %%P on port %PORT% ...
  taskkill /PID %%P /F >nul 2>&1
)

if not defined FOUND (
  echo Nothing is listening on port %PORT%.
  "%TIMEOUT%" /t 2 /nobreak >nul
  exit /b 0
)

"%TIMEOUT%" /t 1 /nobreak >nul
echo Done.
exit /b 0
