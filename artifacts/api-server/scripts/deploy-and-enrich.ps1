$ErrorActionPreference = "Continue"
$apiRoot = Join-Path $PSScriptRoot ".."
$repoRoot = Resolve-Path (Join-Path $apiRoot "..\..")

$envLocal = Join-Path $apiRoot ".env.local"
$envBackup = "$envLocal.bak"
if (Test-Path $envLocal) { Move-Item -Force $envLocal $envBackup }

try {
  $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
  Push-Location $apiRoot
  npx vercel env rm ENRICH_DEMO_SECRET production --yes 2>$null | Out-Null
  $secret | npx vercel env add ENRICH_DEMO_SECRET production 2>&1 | Out-Null
  Pop-Location

  Push-Location $repoRoot
  npx vercel deploy --prod --yes --project cohort-1-squad-indus-api-server-z3ba 2>&1 | Out-Null
  Pop-Location

  Start-Sleep -Seconds 35

  $resp = curl.exe -s -w "`nHTTP:%{http_code}" -X POST `
    "https://cohort-1-squad-indus-api-server-z3b.vercel.app/api/admin/enrich-demo" `
    -H "Authorization: Bearer $secret"
  Write-Output $resp
}
finally {
  if (Test-Path $envBackup) { Move-Item -Force $envBackup $envLocal }
}
