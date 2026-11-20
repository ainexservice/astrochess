@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "AstroMul Chess Local Server" /min cmd /c "py -3 -m http.server 8000"
) else (
  start "AstroMul Chess Local Server" /min cmd /c "python -m http.server 8000"
)
timeout /t 2 >nul
start "" http://localhost:8000
 echo AstroMul Chess is running at http://localhost:8000
 echo Close the local server window to stop it.
endlocal
