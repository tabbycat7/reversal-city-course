@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 22.13 或更新版本，再双击本文件。
  pause
  exit /b 1
)
echo 课程启动后，请在浏览器打开下方显示的本机地址。
echo 保持本窗口开启；按 Ctrl+C 停止课程。
node scripts\serve-local.mjs
pause
