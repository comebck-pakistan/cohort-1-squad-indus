@echo off
cd /d D:\hp2\Downloads\Sweet-Tooth\artifacts\api-server
if exist .env.local ren .env.local .env.local.bak
if exist .env ren .env .env.bak
cd /d D:\hp2\Downloads\Sweet-Tooth
if exist .env.local ren .env.local .env.local.bak
call npx vercel env run -e production --cwd artifacts\api-server -- npx pnpm --filter @workspace/api-server run seed:enrich
set ERR=%ERRORLEVEL%
if exist .env.local.bak ren .env.local.bak .env.local
cd /d D:\hp2\Downloads\Sweet-Tooth\artifacts\api-server
if exist .env.local.bak ren .env.local.bak .env.local
if exist .env.bak ren .env.bak .env
exit /b %ERR%
