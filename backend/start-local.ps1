# Starts the two mock databases, the unified database, and the web app.
# Admin passwords are read from unified-sqlite/.local-admins and are not in source.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Ensure-Venv([string]$dir, [string]$requirements) {
  $python = Join-Path $dir ".venv\Scripts\python.exe"
  if (-not (Test-Path $python)) {
    Write-Host "Creating virtualenv in $dir"
    & python -m venv (Join-Path $dir ".venv")
  }
  & $python -m pip install -q -r (Join-Path $dir $requirements)
  if (-not (Test-Path $python)) {
    throw "Python was not created at $python"
  }
  return $python
}

function Load-Admins {
  $file = Join-Path $root "unified-sqlite\.local-admins"
  if (-not (Test-Path $file)) {
    throw "Missing $file. Create ADMIN_1_* and ADMIN_2_* lines there, then run this again."
  }
  Get-Content $file | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Length -eq 2) {
      Set-Item -Path "Env:$($parts[0])" -Value $parts[1]
    }
  }
}

Load-Admins

$sqlitePython = Ensure-Venv (Join-Path $root "db-sqlite") "requirements.txt"
$postgresPython = Ensure-Venv (Join-Path $root "db-postgres") "requirements.txt"
$unifiedPython = Ensure-Venv (Join-Path $root "unified-sqlite") "requirements.txt"

Write-Host "Starting Postgres..."
Push-Location (Join-Path $root "db-postgres")
docker compose up -d
if ($LASTEXITCODE -ne 0) {
  Write-Host "Postgres container did not start. Billing calls fail until Docker is running."
}
Pop-Location

$logs = Join-Path $root ".local-logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

function Start-Api([string]$title, [string]$dir, [string]$python, [string]$app, [int]$port) {
  $existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "$title already listening on $port"
    return
  }
  Write-Host "Starting $title on $port"
  $safe = $title.Replace(" ", "-")
  Start-Process -FilePath $python -WorkingDirectory $dir -ArgumentList @(
    "-m", "uvicorn", $app, "--host", "127.0.0.1", "--port", "$port"
  ) -RedirectStandardOutput (Join-Path $logs "$safe.log") -RedirectStandardError (Join-Path $logs "$safe.err")
}

Start-Api "Complaints API" (Join-Path $root "db-sqlite") $sqlitePython "main:app" 8001
Start-Api "Billing API" (Join-Path $root "db-postgres") $postgresPython "main:app" 8002
Start-Api "Unified API" (Join-Path $root "unified-sqlite") $unifiedPython "app:app" 8003

$web = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($web) {
  Write-Host "Web app already listening on 3000"
} else {
  Write-Host "Starting web app on 3000"
  Start-Process -FilePath "npm.cmd" -WorkingDirectory (Join-Path $root "..\web") -ArgumentList @("run", "dev") -RedirectStandardOutput (Join-Path $logs "web.log") -RedirectStandardError (Join-Path $logs "web.err")
}

Write-Host ""
Write-Host "Complaints  http://127.0.0.1:8001/docs"
Write-Host "Billing     http://127.0.0.1:8002/docs"
Write-Host "Unified     http://127.0.0.1:8003/docs"
Write-Host "Web         http://127.0.0.1:3000"
