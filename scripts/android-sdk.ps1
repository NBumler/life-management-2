# Kozos Android SDK feloldas - dot-source-olja az install-android.ps1 es az android-emulator.ps1.
# Sorrend: frontend/android/local.properties 'sdk.dir' (amit a gradlew is hasznal) -> ANDROID_HOME
# -> az Android Studio alapertelmezett telepitesi helye. Siker eseten beallitja az ANDROID_HOME-ot es
# a platform-tools-t (adb) a PATH elejere teszi; a feloldott utat adja vissza.
function Resolve-AndroidSdk {
    param([Parameter(Mandatory)][string]$RepoRoot)

    $localPropsPath = Join-Path $RepoRoot "frontend/android/local.properties"
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
    if (-not $sdkDir -or -not (Test-Path $sdkDir)) {
        throw "Nem talalhato Android SDK (nezd meg: frontend/android/local.properties 'sdk.dir', vagy allitsd be az ANDROID_HOME-ot)."
    }

    $env:ANDROID_HOME = $sdkDir
    $platformTools = Join-Path $sdkDir "platform-tools"
    if ($env:Path -notlike "*$platformTools*") {
        $env:Path = "$platformTools;$env:Path"
    }
    return $sdkDir
}
