@echo off
chcp 65001 >nul
title Ayra Design
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Lutfen https://nodejs.org adresinden Node.js LTS surumunu kurun.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Ilk calistirma: gerekli paketler kuruluyor, lutfen bekleyin...
  call npm install
)
echo Ayra Design baslatiliyor...
call npm start
