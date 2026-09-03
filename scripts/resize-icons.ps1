Add-Type -AssemblyName System.Drawing

function Resize-IconWithPadding {
    param (
        [string]$sourcePath,
        [string]$destPath,
        [int]$canvasWidth = 1024,
        [int]$canvasHeight = 1024,
        [float]$scale = 0.62, # Scale of logo inside canvas (62% so it has 19% padding on each side)
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::Transparent
    )

    $srcImg = [System.Drawing.Image]::FromFile($sourcePath)

    # Calculate target dimensions
    $srcRatio = $srcImg.Width / $srcImg.Height
    $targetWidth = [int]($canvasWidth * $scale)
    $targetHeight = [int]($targetWidth / $srcRatio)

    if ($targetHeight -gt ($canvasHeight * $scale)) {
        $targetHeight = [int]($canvasHeight * $scale)
        $targetWidth = [int]($targetHeight * $srcRatio)
    }

    $destX = [int](($canvasWidth - $targetWidth) / 2)
    $destY = [int](($canvasHeight - $targetHeight) / 2)

    # Create new high quality bitmap
    $bitmap = New-Object System.Drawing.Bitmap $canvasWidth, $canvasHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($bgColor -ne [System.Drawing.Color]::Transparent) {
        $brush = New-Object System.Drawing.SolidBrush $bgColor
        $graphics.FillRectangle($brush, 0, 0, $canvasWidth, $canvasHeight)
        $brush.Dispose()
    } else {
        $graphics.Clear([System.Drawing.Color]::Transparent)
    }

    $destRect = New-Object System.Drawing.Rectangle $destX, $destY, $targetWidth, $targetHeight
    $graphics.DrawImage($srcImg, $destRect)

    $srcImg.Dispose()
    $graphics.Dispose()

    # Save to temp then overwrite
    $tempPath = $destPath + ".tmp.png"
    $bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()

    Move-Item -Force $tempPath $destPath
    Write-Host "Processed: $destPath ($canvasWidth x $canvasHeight with scale $scale)"
}

$baseDir = "C:\Users\Dell\Downloads\New folder\front-end\assets\images"
$logoPath = "$baseDir\logo.png"
if (-not (Test-Path $logoPath)) {
    $logoPath = "$baseDir\icon.png"
}

# 1. Main Icon (1024x1024, white background or transparent, scale 0.62)
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\icon.png" -canvasWidth 1024 -canvasHeight 1024 -scale 0.60 -bgColor ([System.Drawing.Color]::White)

# 2. Android Foreground Icon (1024x1024, transparent background, scale 0.55 for safe circular cutouts)
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\android-icon-foreground.png" -canvasWidth 1024 -canvasHeight 1024 -scale 0.55

# 3. Android Monochrome Icon
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\android-icon-monochrome.png" -canvasWidth 1024 -canvasHeight 1024 -scale 0.55

# 4. Splash Icon
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\splash-icon.png" -canvasWidth 1024 -canvasHeight 1024 -scale 0.50

# 5. Favicon
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\favicon.png" -canvasWidth 192 -canvasHeight 192 -scale 0.60 -bgColor ([System.Drawing.Color]::White)

Write-Host "All icons resized successfully with elegant padding!"
