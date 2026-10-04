param(
  [string]$ApiUrl = "",
  [string]$Device = "",
  [int]$ApiPort = 4000,
  [int]$WebPort = 3000,
  [switch]$NoUsbReverse
)

$ErrorActionPreference = "Stop"
$mobileDirectory = Join-Path $PSScriptRoot "..\apps\mobile"

function Resolve-Adb {
  $command = Get-Command adb -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $sdkAdb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
  if (Test-Path $sdkAdb) { return $sdkAdb }

  throw "Android Debug Bridge (adb) was not found. Install Android SDK Platform Tools or add adb to PATH."
}

function Resolve-Flutter {
  $command = Get-Command flutter -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $commonFlutter = "C:\dev\flutter\bin\flutter.bat"
  if (Test-Path $commonFlutter) { return $commonFlutter }

  throw "Flutter was not found. Install Flutter or add its bin directory to PATH."
}

function Get-ConnectedAndroidDevices([string]$Adb) {
  $deviceLines = & $Adb devices | Select-Object -Skip 1
  return @(
    $deviceLines |
      ForEach-Object {
        if ($_ -match '^(\S+)\s+device$') { $Matches[1] }
      } |
      Where-Object { $_ }
  )
}

$adb = Resolve-Adb
$flutter = Resolve-Flutter
$connectedDevices = Get-ConnectedAndroidDevices $adb

# Keep the framework and cached engine aligned, including after an interrupted
# Flutter SDK update on Windows.
$flutterRoot = Split-Path (Split-Path $flutter -Parent) -Parent
$engineVersionFile = Join-Path $flutterRoot "bin\internal\engine.version"
$previousEngineVersion = $env:FLUTTER_PREBUILT_ENGINE_VERSION
if (Test-Path $engineVersionFile) {
  $env:FLUTTER_PREBUILT_ENGINE_VERSION = (Get-Content $engineVersionFile -Raw).Trim()
}

if (-not $Device) {
  if ($connectedDevices.Count -eq 0) {
    throw "No authorized Android device was found. Connect the phone, enable USB debugging, and accept the authorization prompt."
  }
  if ($connectedDevices.Count -gt 1) {
    throw "More than one Android device is connected. Re-run with -Device <device-id>. Connected: $($connectedDevices -join ', ')"
  }
  $Device = $connectedDevices[0]
}

if ($connectedDevices -notcontains $Device) {
  throw "Android device '$Device' is not connected or authorized. Run 'adb devices' to check it."
}

if (-not $NoUsbReverse) {
  & $adb -s $Device reverse "tcp:$ApiPort" "tcp:$ApiPort"
  if ($LASTEXITCODE -ne 0) { throw "Could not forward API port $ApiPort to the Android device." }

  # Web links opened by the app can use the same localhost address on the phone.
  & $adb -s $Device reverse "tcp:$WebPort" "tcp:$WebPort"
  if ($LASTEXITCODE -ne 0) { throw "Could not forward web port $WebPort to the Android device." }

  if (-not $ApiUrl) { $ApiUrl = "http://127.0.0.1:$ApiPort/api/v1" }
}

if (-not $ApiUrl) { $ApiUrl = "http://10.0.2.2:$ApiPort/api/v1" }

Write-Host "Rivera device: $Device" -ForegroundColor Cyan
Write-Host "Rivera API:    $ApiUrl" -ForegroundColor Cyan
Write-Host "Hot reload: press r; hot restart: press R; quit: press q." -ForegroundColor DarkGray
Write-Host "Flutter and application logs will remain visible in this terminal." -ForegroundColor DarkGray

Push-Location $mobileDirectory
try {
  & $flutter pub get
  if ($LASTEXITCODE -ne 0) { throw "flutter pub get failed." }

  & $flutter run -d $Device --dart-define="API_URL=$ApiUrl"
  if ($LASTEXITCODE -ne 0) { throw "flutter run failed." }
} finally {
  $env:FLUTTER_PREBUILT_ENGINE_VERSION = $previousEngineVersion
  Pop-Location
}
