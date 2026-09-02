<#
.SYNOPSIS
    Builds the frontend, points it at this machine's backend, and either installs the debug APK
    on a phone on the same home network (or over USB), or - with -Deliver - uploads it to a
    GitHub Release for download from anywhere (remote-controlled session, no device on the LAN).
    See documentation/Architektúra/Fejlesztői környezet.md.

.PARAMETER ApiHost
    Overrides the auto-detected backend host (IP or hostname). Ignored when -Usb is set.

.PARAMETER Usb
    Use `adb reverse` instead of a LAN IP; apiBaseUrl becomes http://localhost:8080/api.

.PARAMETER Deliver
    Skip the adb install; instead upload app-debug.apk to the 'dev-apk' GitHub prerelease
    (created on first use, asset overwritten on every run) and print its download URL.
    For testing from a phone that isn't on the dev LAN - offline-first features only, the
    backend won't be reachable. Requires the GitHub CLI (`gh`) authenticated once via `gh auth login`.
    Mutually exclusive with -Usb.
#>
param(
    [string]$ApiHost,
    [switch]$Usb,
    [switch]$Deliver
)

$ErrorActionPreference = "Stop"

if ($Deliver -and $Usb) {
    throw "-Deliver es -Usb egyutt nem ertelmezheto: a -Deliver nem telepit csatlakoztatott eszkozre, csak feltolti az APK-t GitHub Release-re."
}

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

# 5. Kézbesítés
$apkPath = Join-Path $androidDir "app/build/outputs/apk/debug/app-debug.apk"
if (-not (Test-Path $apkPath)) {
    throw "Nem talalhato APK: $apkPath"
}

if ($Deliver) {
    # Egy allando 'dev-apk' GitHub prerelease-re toltjuk fel; minden futas feluliria az asset-et
    # (--clobber), igy nem szaporodnak a release-ek. A repo publikus -> a letolto URL bejelentkezes
    # nelkul el. Cel: LAN-on kivuli (pl. telefonrol vezerelt) session-bol is teszthelheto legyen az
    # app - offline-first funkciok; a backend ilyenkor nem elerheto.
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw "A -Deliver a GitHub CLI-t igenyli, ami nincs a PATH-on. Telepites: winget install --id GitHub.cli ; majd egyszer: gh auth login"
    }

    $originUrl = (git -C $repoRoot remote get-url origin).Trim()
    $repoSlug = $originUrl -replace '^git@github\.com:', '' -replace '^https://github\.com/', '' -replace '\.git$', ''
    if (-not $repoSlug -or $repoSlug -eq $originUrl) {
        throw "Nem sikerult a repo slug-ot kiolvasni az origin remote-bol: $originUrl"
    }

    $tag = "dev-apk"
    $null = & gh release view $tag --repo $repoSlug 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "'$tag' prerelease letrehozasa ($repoSlug)..."
        $notes = "Legfrissebb debug APK telefonos teszteleshez. Minden 'install-android.ps1 -Deliver' futas feluliria."
        & gh release create $tag --repo $repoSlug --prerelease --title "Dev APK builds" --notes $notes
        if ($LASTEXITCODE -ne 0) { throw "gh release create sikertelen (exit $LASTEXITCODE)" }
    }

    Write-Host "APK feltoltese: $tag <- $apkPath"
    & gh release upload $tag $apkPath --repo $repoSlug --clobber
    if ($LASTEXITCODE -ne 0) { throw "gh release upload sikertelen (exit $LASTEXITCODE)" }

    $downloadUrl = "https://github.com/$repoSlug/releases/download/$tag/app-debug.apk"
    Write-Host ""
    Write-Host "Kesz. Toltsd le a telefonon (bejelentkezes nelkul is mukodik):"
    Write-Host "  $downloadUrl"
    if (-not $ApiHost -and -not $Usb) {
        Write-Host ""
        Write-Host "Megj.: apiBaseUrl = $apiBaseUrl (a gep aktualis LAN IP-je). Tavolrol a backend ezen"
        Write-Host "       nem erheto el ezen - az offline-first funkciok mennek, a szinkron nem."
    }
    return
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
