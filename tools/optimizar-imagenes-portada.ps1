<#
    tools/optimizar-imagenes-portada.ps1

    Las capturas de la portada (public/img/indexIMG/*) son fotografía de
    pantalla guardada como PNG: 510x327 y 137 KB la más pesada, y dos de
    1000x700. Para miniaturas de tarjeta eso es tirar bytes.

    El script:
      1. aplana el canal alfa sobre blanco (no se ve: la tarjeta es blanca),
      2. reduce a 760 px de ancho (2x del ancho real de la tarjeta en
         escritorio, así que en móvil y en pantallas retina no se ve borroso),
      3. guarda en JPEG y, si el JPEG no es más ligero que el PNG original,
         lo borra para no dejar dos versiones de la misma captura.

    Uso (desde la raíz del repo):
        powershell -ExecutionPolicy Bypass -File tools/optimizar-imagenes-portada.ps1
#>
[CmdletBinding()]
param(
    [int]$Calidad = 82,
    [int]$AnchoMaximo = 760
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$origen = Join-Path $raiz 'public\img\indexIMG'

$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }

$totalAntes = 0
$totalDespues = 0

Get-ChildItem -Path $origen -Filter *.png | ForEach-Object {
    $bytesAntes = $_.Length
    $totalAntes += $bytesAntes

    $img = [System.Drawing.Image]::FromFile($_.FullName)

    $ancho = [Math]::Min($AnchoMaximo, $img.Width)
    $alto = [int][Math]::Round($img.Height * $ancho / $img.Width)

    # 24 bpp: aplana el alfa contra blanco
    $bmp = New-Object System.Drawing.Bitmap(
        $ancho, $alto, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $ancho, $alto)
    $g.Dispose()
    $img.Dispose()

    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality, $Calidad)

    $destino = Join-Path $origen ($_.BaseName + '.jpg')
    $bmp.Save($destino, $enc, $params)
    $bmp.Dispose()

    $bytesJpg = (Get-Item $destino).Length
    if ($bytesJpg -lt $bytesAntes) {
        $totalDespues += $bytesJpg
        Remove-Item $_.FullName -Force
        $queda = 'jpg'
    }
    else {
        # el PNG original ya era más ligero: el JPEG no aporta nada
        Remove-Item $destino -Force
        $totalDespues += $bytesAntes
        $queda = 'png'
    }

    '{0,-12} {1,4}x{2,-4} {3,6:N0} KB -> {4,6:N0} KB ({5,4:N0}%)  queda {6}' -f `
        $_.Name, $ancho, $alto, ($bytesAntes / 1KB), ($bytesJpg / 1KB),
        (100 * $bytesJpg / $bytesAntes), $queda
}

''
'total portada: {0:N0} KB -> {1:N0} KB  (-{2:N0}%)' -f ($totalAntes / 1KB),
    ($totalDespues / 1KB), (100 * (1 - $totalDespues / $totalAntes))
