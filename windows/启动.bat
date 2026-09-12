@echo off
chcp 65001 >nul
title 音频转 MP3
rem 本文件位于 windows\ 子目录，网站根目录是其上一级
cd /d "%~dp0.."

where node >nul 2>nul
if not errorlevel 1 (
  node "%~dp0serve.js"
  goto :eof
)

set PY=
where python >nul 2>nul && set PY=python
if "%PY%"=="" ( where py >nul 2>nul && set PY=py )

if not "%PY%"=="" (
  rem 用 linux\serve.py：它会自动下载引擎并设置正确的 MIME 类型
  %PY% "%~dp0..\linux\serve.py"
  goto :eof
)

echo.
echo   [!] 没有找到 Node.js 或 Python
echo.
echo   为什么必须用本地服务？
echo     浏览器禁止 file:// 页面创建 Worker，而 ffmpeg.wasm 必须要 Worker。
echo     所以直接双击 index.html 一定会失败。
echo.
echo   请任选其一安装后重新双击本文件：
echo     Node.js  https://nodejs.org/
echo     Python   https://www.python.org/downloads/
echo.
pause
