$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "Starting isolated Supabase Local..."
pnpm exec supabase start
if ($LASTEXITCODE -ne 0) { throw "Supabase Local failed to start." }

$statusLines = pnpm exec supabase status -o env
if ($LASTEXITCODE -ne 0) { throw "Could not read Supabase Local credentials." }
$status = @{}
foreach ($line in $statusLines) {
  if ($line -match '^([A-Z0-9_]+)="?(.*?)"?$') {
    $status[$Matches[1]] = $Matches[2].Trim('"')
  }
}
if (-not $status.PUBLISHABLE_KEY -or -not $status.SERVICE_ROLE_KEY) {
  throw "Supabase CLI did not return local API keys."
}

$envContent = @"
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_URL=http://localhost:3000/admin
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$($status.PUBLISHABLE_KEY)
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_SERVICE_ROLE_KEY=$($status.SERVICE_ROLE_KEY)
ADMIN_EMAIL=halo@qonsulin.id
ADMIN_PASSWORD=adminqonsulin123
ADMIN_SESSION_SECRET=qonsulin-local-docker-secret-key-32chars
NEXT_PUBLIC_QONSULIN_ADMIN_EMAIL=halo@qonsulin.id
"@
Set-Content -LiteralPath ".env.docker.local" -Value $envContent -Encoding utf8

Write-Host "Starting Qonsulin web container..."
docker compose up --build -d web
if ($LASTEXITCODE -ne 0) { throw "Qonsulin web container failed to start." }
Write-Host "Web: http://localhost:3000"
Write-Host "Supabase Studio: http://localhost:54323"
Write-Host "Mailpit: http://localhost:54324"
