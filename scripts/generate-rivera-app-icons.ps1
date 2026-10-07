param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing

function New-RiveraIcon([int]$Size, [string]$Path) {
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $bitmap.SetResolution(144, 144)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0D211B'))

  $margin = [single]($Size * 0.12)
  $diameter = [single]($Size - (2 * $margin))
  $lime = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#D9EF82'))
  $graphics.FillEllipse($lime, $margin, $margin, $diameter, $diameter)

  $ring = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#B9D85E'), [single]($Size * 0.012))
  $graphics.DrawEllipse($ring, $margin, $margin, $diameter, $diameter)

  $font = [System.Drawing.Font]::new('Georgia', [single]($Size * 0.34), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#17372F'))
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textBox = [System.Drawing.RectangleF]::new(0, [single](-$Size * 0.025), $Size, $Size)
  $graphics.DrawString('R.', $font, $textBrush, $textBox, $format)

  $directory = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $format.Dispose()
  $textBrush.Dispose()
  $font.Dispose()
  $ring.Dispose()
  $lime.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$master = Join-Path $ProjectRoot 'apps/mobile/assets/branding/rivera-app-icon-1024.png'
$play = Join-Path $ProjectRoot 'outputs/rivera-google-play-icon-512.png'
New-RiveraIcon 1024 $master
New-RiveraIcon 512 $play

$androidSizes = @{
  'mipmap-mdpi' = 48
  'mipmap-hdpi' = 72
  'mipmap-xhdpi' = 96
  'mipmap-xxhdpi' = 144
  'mipmap-xxxhdpi' = 192
}
foreach ($entry in $androidSizes.GetEnumerator()) {
  $path = Join-Path $ProjectRoot "apps/mobile/android/app/src/main/res/$($entry.Key)/ic_launcher.png"
  New-RiveraIcon $entry.Value $path
}

$iosDirectory = Join-Path $ProjectRoot 'apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset'
$iosFiles = @{
  'Icon-App-20x20@1x.png' = 20
  'Icon-App-20x20@2x.png' = 40
  'Icon-App-20x20@3x.png' = 60
  'Icon-App-29x29@1x.png' = 29
  'Icon-App-29x29@2x.png' = 58
  'Icon-App-29x29@3x.png' = 87
  'Icon-App-40x40@1x.png' = 40
  'Icon-App-40x40@2x.png' = 80
  'Icon-App-40x40@3x.png' = 120
  'Icon-App-60x60@2x.png' = 120
  'Icon-App-60x60@3x.png' = 180
  'Icon-App-76x76@1x.png' = 76
  'Icon-App-76x76@2x.png' = 152
  'Icon-App-83.5x83.5@2x.png' = 167
  'Icon-App-1024x1024@1x.png' = 1024
}
foreach ($entry in $iosFiles.GetEnumerator()) {
  New-RiveraIcon $entry.Value (Join-Path $iosDirectory $entry.Key)
}

Write-Output $play
