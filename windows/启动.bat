@echo off
chcp 65001 >nul 2>nul
title Audio to MP3
setlocal enabledelayedexpansion

rem ============================================================
rem  Set working directory to the repository root (parent of windows\)
rem  NOTE: keep this file CRLF-encoded; cmd.exe cannot parse LF-only files.
rem ============================================================
cd /d "%~dp0.."
if errorlevel 1 (
  echo.
  echo   [ERROR] Cannot enter directory: %~dp0..
  echo.
  pause
  exit /b 1
)

set "ROOT=%CD%"
set "NODECMD="
set "PYCMD="

rem ---- locate node ----
where node >nul 2>nul
if not errorlevel 1 set "NODECMD=node"

rem ---- locate python ----
if not defined NODECMD (
  where python >nul 2>nul
  if not errorlevel 1 set "PYCMD=python"
)
if not defined NODECMD if not defined PYCMD (
  where py >nul 2>nul
  if not errorlevel 1 set "PYCMD=py"
)

rem ---- report ----
echo.
echo   ================================================
echo    Audio -^> MP3  batch converter
echo   ================================================
echo.
echo   Root: "%ROOT%"
echo.

if defined NODECMD (
  echo   Engine: Node.js  ^(%NODECMD%^)
  echo.
  call %NODECMD% "%~dp0serve.js"
  set "RC=!errorlevel!"
  if not "!RC!"=="0" (
    echo.
    echo   [ERROR] server exited with code !RC!
    echo   See the messages above.
    echo.
    pause
  )
  exit /b !RC!
)

if defined PYCMD (
  echo   Engine: Python  ^(%PYCMD%^)
  echo.
  call %PYCMD% "%~dp0..\linux\serve.py"
  set "RC=!errorlevel!"
  if not "!RC!"=="0" (
    echo.
    echo   [ERROR] server exited with code !RC!
    echo   See the messages above.
    echo.
    pause
  )
  exit /b !RC!
)

rem ---- nothing found ----
echo   * Neither Node.js nor Python was found on this system.
echo.
echo   Why is a local server required?
echo     Browsers forbid file:// pages from creating Workers,
echo     and ffmpeg.wasm cannot run without a Worker.
echo     So opening index.html directly will always fail.
echo.
echo   Install ONE of the following, then run this file again:
echo.
echo     Node.js   https://nodejs.org/
echo     Python    https://www.python.org/downloads/
echo.
echo   Note: when installing Python, tick "Add Python to PATH".
echo.
pause
exit /b 1
