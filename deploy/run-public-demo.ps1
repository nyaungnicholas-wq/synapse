# Puts the SYNAPSE demo online from this PC: the Docker image + a free Cloudflare quick tunnel.
# Usage (PowerShell 5.1+):  powershell -NoProfile -File deploy\run-public-demo.ps1 [-Build]
# Prints "DEMO LIVE <url>" when the public URL answers. The URL changes each time this runs.
param([switch]$Build)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'deploy\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$tunnelLog = Join-Path $logDir 'tunnel.log'
$port = 7862

if ($Build) { docker build -t synapse-demo $root; if ($LASTEXITCODE -ne 0) { throw 'docker build failed' } }

# Stop a previous SYNAPSE tunnel only (never other projects' tunnels).
Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" |
  Where-Object { $_.CommandLine -like "*127.0.0.1:$port*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }

$cloudflared = (Get-Command cloudflared).Source
Start-Process -FilePath $cloudflared -WindowStyle Hidden -ArgumentList @(
  'tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$port", '--logfile', ('"' + $tunnelLog + '"'))  # 5.1 does not quote paths with spaces

$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  if (Test-Path $tunnelLog) {
    $m = Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) { throw "tunnel did not report a URL (see $tunnelLog)" }

cmd /c "docker rm -f synapse-demo >nul 2>&1"  # fine if it does not exist yet
docker run -d --name synapse-demo --restart unless-stopped -p "127.0.0.1:${port}:7860" -e "APP_URL=$url" synapse-demo | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'docker run failed' }

for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest -Uri "$url/" -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200 -and $r.Content -match 'Closer, one conversation at a time') {
      Set-Content -Path (Join-Path $logDir 'current-url.txt') -Value $url
      Write-Output "DEMO LIVE $url"
      Write-Output "One-click demo: $url/demo"
      exit 0
    }
  } catch { }
}
throw "public URL never answered: $url"
