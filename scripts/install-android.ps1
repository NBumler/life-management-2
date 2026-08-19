<#
.SYNOPSIS
    Builds the frontend, points it at this machine's backend, and installs the debug APK
    on a phone on the same home network (or over USB). See documentation/Architektúra/Fejlesztői környezet.md.

.PARAMETER ApiHost
    Overrides the auto-detected backend host (IP or hostname). Ignored when -Usb is set.

.PARAMETER Usb
    Use `adb reverse` instead of a LAN IP; apiBaseUrl becomes http://localhost:8080/api.
#>
param(
    [string]$ApiHost,
    [switch]$Usb
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"
$configPath = Join-Path $frontendDir "src/assets/config/app-config.json"
$androidDir = Join-Path $frontendDir "android"
$backendPort = 8080

# 1. Cél hoszt meghatározása
if ($Usb) {
    $resolvedHost = "localhost"
} elseif ($ApiHost) {
    $resolvedHost = $ApiHost
} else {
    $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
        Sort-Object -Property RouteMetric |
        Select-Object -First 1
    if (-not $route) {
        throw "Nem található alapértelmezett gateway-jel rendelkező interfész. Add meg kézzel: -ApiHost <ip|hostname>"
    }
    $resolvedHost = (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object { $_.IPAddress -notlike "169.254.*" } |
        Select-Object -First 1 -ExpandProperty IPAddress)
    if (-not $resolvedHost) {
        throw "Nem sikerult IPv4 cimet talalni a default gateway-es interfeszen. Add meg kezzel: -ApiHost <ip|hostname>"
    }
}

$apiBaseUrl = "http://${resolvedHost}:${backendPort}/api"

Write-Host "apiBaseUrl -> $apiBaseUrl"

# 2. Config írása
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $configPath) | Out-Null
@{ apiBaseUrl = $apiBaseUrl } | ConvertTo-Json | Set-Content -Path $configPath -Encoding utf8
Write-Host "Config irva: $configPath"

if (-not (Test-Path $androidDir)) {
    throw "Nincs android platform a frontendben. Futtasd egyszer: cd frontend; npx cap add android"
}

# 3. Build
Push-Location $frontendDir
try {
    Write-Host "npm run build..."
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build sikertelen (exit code $LASTEXITCODE)" }

    Write-Host "npx cap sync android..."
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "npx cap sync android sikertelen (exit code $LASTEXITCODE)" }
} finally {
    Pop-Location
}

# 4. APK
Push-Location $androidDir
try {
    Write-Host "gradlew assembleDebug..."
    if ($IsWindows -or $env:OS -eq "Windows_NT") {
        & ./gradlew.bat assembleDebug
    } else {
        & ./gradlew assembleDebug
    }
    if ($LASTEXITCODE -ne 0) { throw "gradlew assembleDebug sikertelen (exit code $LASTEXITCODE)" }
} finally {
    Pop-Location
}

# 5. Telepítés
$apkPath = Join-Path $androidDir "app/build/outputs/apk/debug/app-debug.apk"
if (-not (Test-Path $apkPath)) {
    throw "Nem talalhato APK: $apkPath"
}

$devices = adb devices | Select-String -Pattern "\tdevice$"
if (-not $devices) {
    throw "Nincs csatlakoztatott/eszkozon engedelyezett Android eszkoz (ellenorizd: adb devices)."
}

if ($Usb) {
    Write-Host "adb reverse tcp:$backendPort tcp:$backendPort ..."
    adb reverse tcp:$backendPort tcp:$backendPort
}

Write-Host "adb install -r $apkPath ..."
adb install -r $apkPath
if ($LASTEXITCODE -ne 0) { throw "adb install sikertelen (exit code $LASTEXITCODE)" }

# 6. Visszajelzés
Write-Host ""
Write-Host "Telepitve. apiBaseUrl: $apiBaseUrl"
try {
    $health = Invoke-WebRequest -Uri "http://${resolvedHost}:${backendPort}/api/health" -TimeoutSec 3 -UseBasicParsing
    Write-Host "GET /api/health -> $($health.StatusCode)"
} catch {
    Write-Warning "GET /api/health nem valaszolt errol a gepről ($apiBaseUrl). Ellenorizd, hogy fut-e a backend, es (Wi-Fi mod eseten) a tuzfalszabalyt: New-NetFirewallRule -DisplayName 'lm2-backend' -Direction Inbound -Protocol TCP -LocalPort $backendPort -Profile Private -Action Allow"
}
