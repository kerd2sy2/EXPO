Add-Type -AssemblyName System.Drawing

function Resize-IconWithPadding {
    param (
        [string]$sourcePath,
        [string]$destPath,
        [int]$canvasWidth = 1024,
        [int]$canvasHeight = 1024,
        [float]$scale = 0.64,
        [System.Drawing.Color]$bgColor = [System.Drawing.Color]::Transparent,
        [bool]$makeWhite = $false
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

    if ($makeWhite) {
        $ia = New-Object System.Drawing.Imaging.ImageAttributes
        $cm = New-Object System.Drawing.Imaging.ColorMatrix
        $cm.Matrix00 = 0; $cm.Matrix11 = 0; $cm.Matrix22 = 0
        $cm.Matrix33 = 1
        $cm.Matrix40 = 1; $cm.Matrix41 = 1; $cm.Matrix42 = 1
        $ia.SetColorMatrix($cm)
        $graphics.DrawImage($srcImg, $destRect, 0, 0, $srcImg.Width, $srcImg.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)
        $ia.Dispose()
    } else {
        $graphics.DrawImage($srcImg, $destRect)
    }

    $srcImg.Dispose()
    $graphics.Dispose()

    $tempPath = $destPath + ".tmp.png"
    $bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()

    Move-Item -Force $tempPath $destPath
    Write-Host "Processed: $destPath ($canvasWidth x $canvasHeight with scale $scale)"
}

$baseDir = (Resolve-Path "$PSScriptRoot\..\assets\images").Path
$logoPath = "$baseDir\logo.png"
if (-not (Test-Path $logoPath)) {
    $logoPath = "$baseDir\icon.png"
}

$appColor = [System.Drawing.ColorTranslator]::FromHtml("#00fa91")

# 1. Main Icon (1024x1024, app color background, white logo scale 0.64)
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\icon.png" -canvasWidth 1024 -canvasHeight 1024 -scale 0.64 -bgColor $appColor -makeWhite $true

# 2. Android Foreground Icon (1024x1024, transparent background, white logo scale 0.56)
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\android-icon-foreground.png" -canvasWidth 1024 -canvasHeight 1024 -scale 0.56 -makeWhite $true

# 3. Android Monochrome Icon
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\android-icon-monochrome.png" -canvasWidth 1024 -canvasHeight 1024 -scale 0.56 -makeWhite $true

# 4. Splash Icon
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\splash-icon.png" -canvasWidth 1024 -canvasHeight 1024 -scale 0.50

# 5. Favicon
Resize-IconWithPadding -sourcePath $logoPath -destPath "$baseDir\favicon.png" -canvasWidth 192 -canvasHeight 192 -scale 0.64 -bgColor $appColor -makeWhite $true

Write-Host "All icons resized successfully with app color background and white logo!"
