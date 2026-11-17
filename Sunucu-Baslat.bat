@echo off
chcp 65001 >nul
title Ayra Design Sunucusu
cd /d "%~dp0"
if not exist node_modules call npm install
echo Ekip sunucusu baslatiliyor. Bu pencereyi kapatmayin.
echo Tarayicidan http://localhost:4321 adresini acin.
call npm run server
pause
