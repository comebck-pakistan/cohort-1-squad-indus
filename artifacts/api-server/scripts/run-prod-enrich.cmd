@echo off
cd /d %~dp0..
if exist .env ren .env .env.runbak >nul 2>&1
if exist .env.local ren .env.local .env.local.runbak >nul 2>&1
call npx vercel env run -e production -- npx tsx ./src/seed-enrich.ts
set ERR=%ERRORLEVEL%
if exist .env.runbak ren .env.runbak .env >nul 2>&1
if exist .env.local.runbak ren .env.local.runbak .env.local >nul 2>&1
exit /b %ERR%
