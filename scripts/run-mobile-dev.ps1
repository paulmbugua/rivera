param(
  [string]$ApiUrl = "http://10.0.2.2:4000/api/v1",
  [string]$Device = ""
)

$ErrorActionPreference = "Stop"
$mobileDirectory = Join-Path $PSScriptRoot "..\apps\mobile"

Push-Location $mobileDirectory
try {
  flutter pub get
  $flutterArguments = @("run", "--dart-define=API_URL=$ApiUrl")
  if ($Device) {
    $flutterArguments += @("-d", $Device)
  }
  & flutter @flutterArguments
} finally {
  Pop-Location
}
