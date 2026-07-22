@echo off
setlocal enabledelayedexpansion
cd /d %~dp0..
if exist .env.local ren .env.local .env.local.bak >nul 2>&1

for /f %%i in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')"') do set SECRET=%%i

call npx vercel env rm ENRICH_DEMO_SECRET production --yes >nul 2>&1
echo !SECRET!| call npx vercel env add ENRICH_DEMO_SECRET production >nul 2>&1

cd /d D:\hp2\Downloads\Sweet-Tooth
call npx vercel deploy --prod --yes --project cohort-1-squad-indus-api-server-z3ba >nul 2>&1
timeout /t 30 /nobreak >nul

curl.exe -s -w "\nHTTP:%%{http_code}" -X POST "https://cohort-1-squad-indus-api-server-z3b.vercel.app/api/admin/enrich-demo" -H "Authorization: Bearer !SECRET!"

if exist .env.local.bak ren .env.local.bak .env.local >nul 2>&1
endlocal
