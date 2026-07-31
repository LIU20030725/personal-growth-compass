@echo off
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  pause
  exit /b 1
)

rem Open the current server when it is already running.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:4173/' ^| Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto open_page

rem Otherwise start the latest source in this folder.
start "Dice Life Server" /min cmd /c "npm.cmd run dev -- --port 4173"

for /L %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:4173/' ^| Out-Null; exit 0 } catch { exit 1 }"
  if not errorlevel 1 goto open_page
  timeout /t 1 /nobreak >nul
)

echo Dice Life could not start. Check the Node.js installation.
pause
exit /b 1

:open_page
start "" "http://127.0.0.1:4173/"
exit /b 0
