<#
.SYNOPSIS
    Starts the project's Android emulator (creating the LM2_Phone AVD on first use) and waits until
    it has fully booted. Prints the emulator's adb serial (e.g. emulator-5554) as its only output.
    See documentation/Architektúra/Fejlesztői környezet.md.

.PARAMETER Avd
    AVD name. Defaults to LM2_Phone, which the script creates itself if missing (Galaxy A55-like
    1080x2340 screen at 480 dpi = 360 dp wide, from the newest installed x86_64 system image).
    Any other name must already exist (Android Studio > Device Manager).

.PARAMETER Headless
    Run without an emulator window (-no-window) - e.g. for agent sessions that only need
    `adb exec-out screencap -p` screenshots.

.PARAMETER ColdBoot
    Ignore the quick-boot snapshot and boot from scratch (-no-snapshot-load).

.PARAMETER NoWait
    Start the emulator (if it isn't already running) and return immediately, without waiting for
    the boot. Used by install-android.ps1 to boot in parallel with the build.

.PARAMETER TimeoutSec
    Max. seconds to wait for boot_completed. Default 300.
#>
param(
    [string]$Avd = "LM2_Phone",
    [switch]$Headless,
    [switch]$ColdBoot,
    [switch]$NoWait,
    [int]$TimeoutSec = 300
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "android-sdk.ps1")
$sdkDir = Resolve-AndroidSdk -RepoRoot $repoRoot

$emulatorExe = Join-Path $sdkDir "emulator\emulator.exe"
if (-not (Test-Path $emulatorExe)) {
    throw "Nincs telepitve az Android Emulator ($emulatorExe). Android Studio > SDK Manager > SDK Tools > Android Emulator."
}

$avdHome = if ($env:ANDROID_AVD_HOME) {
    $env:ANDROID_AVD_HOME
} elseif ($env:ANDROID_USER_HOME) {
    Join-Path $env:ANDROID_USER_HOME "avd"
} else {
    Join-Path $env:USERPROFILE ".android\avd"
}

# A nativ adb stderr-je PS 5.1-ben a script-szintu "Stop" alatt terminalo NativeCommandError lenne
# (pl. 'emu avd name' egy meg offline emulatoron) - itt csak a kimenet kell, a hibat a hivo kezeli.
function Invoke-Adb {
    $saved = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $out = & adb @args 2>$null
        return @($out | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
    } finally {
        $ErrorActionPreference = $saved
    }
}

# A futo emulatorok kozul (barmilyen allapotban: offline / device) az, amelyik a kert AVD-t futtatja.
function Find-RunningEmulator {
    param([string]$Name)
    $serials = Invoke-Adb devices | Where-Object { $_ -match "^emulator-\d+\s" } | ForEach-Object { ($_ -split "\s+")[0] }
    foreach ($serial in $serials) {
        $avdName = Invoke-Adb -s $serial emu avd name | Select-Object -First 1
        if ($avdName -eq $Name) { return $serial }
    }
    return $null
}

# LM2_Phone letrehozasa avdmanager nelkul (a cmdline-tools nem resze az alap Android Studio
# telepitesnek): egy AVD = '<nev>.ini' + '<nev>.avd/config.ini', a tobbit az emulator elso inditaskor
# generalja. A system image a legujabb telepitett x86_64 image; Google Play-es tag elonyben.
function New-Lm2Avd {
    param([string]$Name)
    $imagesRoot = Join-Path $sdkDir "system-images"
    $candidates = @()
    if (Test-Path $imagesRoot) {
        $candidates = @(Get-ChildItem $imagesRoot -Directory | ForEach-Object {
            $platform = $_
            Get-ChildItem $platform.FullName -Directory | ForEach-Object {
                $abiDir = Join-Path $_.FullName "x86_64"
                if ((Test-Path $abiDir) -and ($platform.Name -match "^android-(\d+)$")) {
                    [pscustomobject]@{
                        Platform = $platform.Name
                        Api      = [int]$Matches[1]
                        Tag      = $_.Name
                        PlayRank = if ($_.Name -eq "google_apis_playstore") { 0 } elseif ($_.Name -eq "google_apis") { 1 } else { 2 }
                    }
                }
            }
        })
    }
    if ($candidates.Count -eq 0) {
        throw "Nincs telepitett x86_64 system image. Android Studio > SDK Manager > SDK Platforms > (pl. Android 15) > 'Google Play Intel x86_64 Atom System Image'."
    }
    $image = $candidates | Sort-Object @{ Expression = "Api"; Descending = $true }, PlayRank | Select-Object -First 1
    $playStore = $image.Tag -eq "google_apis_playstore"
    $tagDisplay = switch ($image.Tag) { "google_apis_playstore" { "Google Play" } "google_apis" { "Google APIs" } default { "Default Android System Image" } }

    $avdDir = Join-Path $avdHome "$Name.avd"
    New-Item -ItemType Directory -Force -Path $avdDir | Out-Null
    @(
        "avd.ini.encoding=UTF-8"
        "path=$avdDir"
        "path.rel=avd\$Name.avd"
        "target=$($image.Platform)"
    ) | Set-Content -Path (Join-Path $avdHome "$Name.ini") -Encoding ascii
    @(
        "AvdId = $Name"
        "avd.ini.displayname = LM2 Phone (API $($image.Api))"
        "avd.ini.encoding = UTF-8"
        "PlayStore.enabled = $($playStore.ToString().ToLower())"
        "abi.type = x86_64"
        "hw.cpu.arch = x86_64"
        "hw.cpu.ncore = 2"
        "hw.ramSize = 3072"
        "vm.heapSize = 336"
        "disk.dataPartition.size = 6442450944"
        "hw.lcd.width = 1080"
        "hw.lcd.height = 2340"
        "hw.lcd.density = 480"
        "hw.initialOrientation = portrait"
        "hw.keyboard = yes"
        "hw.mainKeys = no"
        "hw.dPad = no"
        "hw.trackBall = no"
        "hw.gps = yes"
        "hw.battery = yes"
        "hw.accelerometer = yes"
        "hw.sensors.orientation = yes"
        "hw.sensors.proximity = yes"
        "hw.audioInput = yes"
        "hw.camera.back = virtualscene"
        "hw.camera.front = emulated"
        "hw.gpu.enabled = yes"
        "hw.gpu.mode = auto"
        "hw.sdCard = yes"
        "sdcard.size = 512M"
        "showDeviceFrame = no"
        "skin.dynamic = yes"
        "skin.name = 1080x2340"
        "skin.path = _no_skin"
        "fastboot.forceColdBoot = no"
        "fastboot.forceFastBoot = yes"
        "image.sysdir.1 = system-images\$($image.Platform)\$($image.Tag)\x86_64\"
        "tag.id = $($image.Tag)"
        "tag.ids = $($image.Tag)"
        "tag.display = $tagDisplay"
        "tag.displaynames = $tagDisplay"
    ) | Set-Content -Path (Join-Path $avdDir "config.ini") -Encoding ascii
    Write-Host "AVD letrehozva: $Name ($($image.Platform) / $($image.Tag) / x86_64, 1080x2340 @ 480 dpi)"
}

$savedEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $existingAvds = @(& $emulatorExe -list-avds 2>$null | ForEach-Object { "$_".Trim() } | Where-Object { $_ -and $_ -notmatch "^(INFO|WARNING|ERROR)\b" })
} finally {
    $ErrorActionPreference = $savedEap
}
if ($existingAvds -notcontains $Avd) {
    if ($Avd -ne "LM2_Phone") {
        throw "Nincs '$Avd' nevu AVD. Letezo AVD-k: $($existingAvds -join ', ')"
    }
    New-Lm2Avd -Name $Avd
}

$serial = Find-RunningEmulator -Name $Avd
$process = $null
if ($serial) {
    Write-Host "Az emulator mar fut: $Avd ($serial)"
} else {
    $emulatorArgs = @("-avd", $Avd, "-netdelay", "none", "-netspeed", "full")
    if ($Headless) { $emulatorArgs += "-no-window" }
    if ($ColdBoot) { $emulatorArgs += "-no-snapshot-load" }
    $logPath = Join-Path $env:TEMP "lm2-emulator-$Avd.log"
    Write-Host "Emulator inditasa: $Avd $(if ($Headless) { '(headless) ' })- log: $logPath"
    # Kulon, levalasztott folyamat: a szkript (es a hivo shell) vege utan is tovabb fut.
    $process = Start-Process -FilePath $emulatorExe -ArgumentList $emulatorArgs -WindowStyle Hidden `
        -RedirectStandardOutput $logPath -RedirectStandardError "$logPath.err" -PassThru
}

if ($NoWait) { return }

$deadline = (Get-Date).AddSeconds($TimeoutSec)
Write-Host "Varakozas a boot vegere (max. $TimeoutSec s)..."
while ($true) {
    if ($process -and $process.HasExited) {
        $tail = if (Test-Path "$logPath.err") { (Get-Content "$logPath.err" -Tail 15) -join "`n" } else { "" }
        throw "Az emulator leallt boot kozben (exit $($process.ExitCode)). Log: $logPath`n$tail"
    }
    if (-not $serial) { $serial = Find-RunningEmulator -Name $Avd }
    if ($serial) {
        $booted = Invoke-Adb -s $serial shell getprop sys.boot_completed | Select-Object -First 1
        if ($booted -eq "1") { break }
    }
    if ((Get-Date) -gt $deadline) {
        throw "Az emulator $TimeoutSec s alatt nem bootolt be ($Avd$(if ($serial) { ", $serial" })). Probald: -ColdBoot, vagy nezd meg a logot."
    }
    Start-Sleep -Seconds 3
}

# Kepernyo ebresztese + a (jelszo nelkuli) zarkepernyo elengedese, hogy az app azonnal lathato legyen.
Invoke-Adb -s $serial shell input keyevent KEYCODE_WAKEUP | Out-Null
Invoke-Adb -s $serial shell wm dismiss-keyguard | Out-Null

Write-Host "Az emulator kesz: $Avd ($serial)"
Write-Output $serial
