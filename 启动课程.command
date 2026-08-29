#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  print "请先安装 Node.js 22.13 或更新版本，再双击本文件。"
  read "?按回车关闭"
  exit 1
fi
print "课程启动后，请在浏览器打开下方显示的本机地址。"
print "请保持本终端窗口开启；按 Ctrl+C 停止课程。"
node scripts/serve-local.mjs
read "?按回车关闭"
