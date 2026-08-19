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

# 0. Android SDK feloldása (adb ehhez kell) — ne kelljen kézzel ANDROID_HOME-ot beállítani előtte.
# local.properties (amit gradlew is használ) a legmegbízhatóbb forrás, utána env var, utána az
# Android Studio alapértelmezett telepítési helye.
$localPropsPath = Join-Path $androidDir "local.properties"
$sdkDir = $null
if (Test-Path $localPropsPath) {
    $sdkLine = Get-Content $localPropsPath | Where-Object { $_ -match "^sdk\.dir=" } | Select-Object -First 1
    if ($sdkLine) {
        $sdkDir = ($sdkLine -split "=", 2)[1].Trim() -replace "\\:", ":" -replace "/", "\"
    }
}
if (-not $sdkDir -and $env:ANDROID_HOME) {
    $sdkDir = $env:ANDROID_HOME
}
if (-not $sdkDir) {
    $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $defaultSdk) {
        $sdkDir = $defaultSdk
    }
}
if ($sdkDir -and (Test-Path $sdkDir)) {
    $env:ANDROID_HOME = $sdkDir
    $platformTools = Join-Path $sdkDir "platform-tools"
    if ($env:Path -notlike "*$platformTools*") {
        $env:Path = "$platformTools;$env:Path"
    }
} else {
    throw "Nem talalhato Android SDK (nezd meg: frontend/android/local.properties 'sdk.dir', vagy allitsd be az ANDROID_HOME-ot)."
}

# npm/node feloldasa, ha a PATH-on nincs (pl. nvs-szel telepitve, de nincs `nvs link`-elve az
# aktualis shellben) — a legujabb nvs-sel telepitett verziot hasznaljuk fallbackkent.
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $nvsNodeDir = Join-Path $env:LOCALAPPDATA "nvs\node"
    $latest = if (Test-Path $nvsNodeDir) {
        Get-ChildItem $nvsNodeDir -Directory -ErrorAction SilentlyContinue |
            Sort-Object { [version]$_.Name } -Descending |
            Select-Object -First 1
    } else { $null }
    if ($latest) {
        $nodeBin = Join-Path $latest.FullName "x64"
        if (-not (Test-Path $nodeBin)) { $nodeBin = $latest.FullName }
        $env:Path = "$nodeBin;$env:Path"
    }
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm nem talalhato a PATH-on (nvs-sel sem sikerult feloldani). Telepits Node.js-t vagy allitsd be a PATH-ot."
}

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
    # Debug installs point at a plain-http backend; androidScheme must be http too or the WebView
    # blocks the API calls as Mixed Content (see capacitor.config.ts).
    $env:LM2_CAP_HTTP_SCHEME = "1"
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

$deviceLines = adb devices | Select-String -Pattern "\tdevice$"
if (-not $deviceLines) {
    throw "Nincs csatlakoztatott/eszkozon engedelyezett Android eszkoz (ellenorizd: adb devices)."
}
$serials = @($deviceLines | ForEach-Object { ($_.Line -split "\s+")[0] })
# A vezetek nelkuli hibakereses mDNS-sel gyakran letrehoz egy plusz, "..._adb-tls-connect._tcp"
# vegu bejegyzest ugyanahhoz a fizikai eszkozhoz az explicit ip:port mellett — ezt kiszurjuk,
# kulonben "more than one device/emulator" hibaval elszall az adb install.
# @(...): egyetlen talalat eseten PowerShell scalar stringge csomagolna ki a listat, es a kesobbi
# [0] indexeles akkor a string ELSO KARAKTERET adna vissza, nem a teljes szerialt.
$targetSerials = @($serials | Where-Object { $_ -notmatch "\._tcp$" })
if ($targetSerials.Count -eq 0) { $targetSerials = $serials }
if ($targetSerials.Count -gt 1) {
    throw "Tobb csatlakoztatott eszkoz van ($($targetSerials -join ', ')). Csatlakoztass csak egyet."
}
$targetSerial = $targetSerials[0]
Write-Host "Cel eszkoz: $targetSerial"

if ($Usb) {
    Write-Host "adb reverse tcp:$backendPort tcp:$backendPort ..."
    adb -s $targetSerial reverse tcp:$backendPort tcp:$backendPort
}

Write-Host "adb install -r $apkPath ..."
adb -s $targetSerial install -r $apkPath
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
