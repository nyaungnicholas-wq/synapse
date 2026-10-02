@echo off
rem Stop gate: runs before a Claude turn ends in this project. Fails the turn if anything is red.
cd /d "%~dp0.."
call npx tsc --noEmit
if errorlevel 1 exit /b 1
call npx eslint .
if errorlevel 1 exit /b 1
node scripts\audit-pages.mjs
if errorlevel 1 exit /b 1
echo STOPCHECK OK
