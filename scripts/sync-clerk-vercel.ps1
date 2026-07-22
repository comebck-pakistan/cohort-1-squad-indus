# Sync Clerk keys from .clerk-keys.local to Vercel and redeploy.
# Usage: .\scripts\sync-clerk-vercel.ps1
# Requires: vercel CLI logged in, .clerk-keys.local at repo root

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$KeysFile = Join-Path $RepoRoot ".clerk-keys.local"

if (-not (Test-Path $KeysFile)) {
  Write-Host "Missing $KeysFile"
  Write-Host "Copy .clerk-keys.local.example -> .clerk-keys.local and add your Clerk keys."
  exit 1
}

function Read-EnvFile([string]$Path) {
  $vars = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    $vars[$key] = $val
  }
  return $vars
}

$env = Read-EnvFile $KeysFile
$pk = $env["CLERK_PUBLISHABLE_KEY"]
$sk = $env["CLERK_SECRET_KEY"]
$frontendUrl = if ($env["FRONTEND_URL"]) { $env["FRONTEND_URL"] } else { "https://cohort-1-squad-indus-sweet-tooth.vercel.app" }
$authMode = if ($env["AUTH_MODE"]) { $env["AUTH_MODE"] } else { "clerk" }

if (-not $pk -or $pk -match "REPLACE_ME") {
  Write-Host "Set CLERK_PUBLISHABLE_KEY in .clerk-keys.local"
  exit 1
}
if (-not $sk -or $sk -match "REPLACE_ME") {
  Write-Host "Set CLERK_SECRET_KEY in .clerk-keys.local"
  exit 1
}

$FrontendCwd = Join-Path $RepoRoot "artifacts\sweet-tooth"
$ApiCwd = Join-Path $RepoRoot "artifacts\api-server"

function Set-VercelEnv([string]$Cwd, [string]$Name, [string]$Value) {
  Write-Host "  $Name on $(Split-Path $Cwd -Leaf)"
  $Value | vercel env add $Name production --cwd $Cwd --force 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "vercel env add failed for $Name"
  }
}

Write-Host "Setting frontend env (cohort-1-squad-indus-sweet-tooth)..."
Set-VercelEnv $FrontendCwd "VITE_CLERK_PUBLISHABLE_KEY" $pk

Write-Host "Setting API env (cohort-1-squad-indus-api-server)..."
Set-VercelEnv $ApiCwd "CLERK_PUBLISHABLE_KEY" $pk
Set-VercelEnv $ApiCwd "CLERK_SECRET_KEY" $sk
Set-VercelEnv $ApiCwd "AUTH_MODE" $authMode
Set-VercelEnv $ApiCwd "FRONTEND_URL" $frontendUrl

Write-Host "Redeploying frontend..."
vercel deploy --prod --yes --cwd $FrontendCwd
if ($LASTEXITCODE -ne 0) { throw "Frontend deploy failed" }

Write-Host "Redeploying API..."
vercel deploy --prod --yes --cwd $ApiCwd
if ($LASTEXITCODE -ne 0) { throw "API deploy failed" }

Write-Host ""
Write-Host "Done. Test Google sign-in at $frontendUrl/dashboard/login"
