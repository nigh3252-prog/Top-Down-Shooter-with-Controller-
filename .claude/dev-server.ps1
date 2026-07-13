param([int]$Port = 8137)

# Minimal static file server for local preview (ES modules need HTTP, not file://).
$root = Split-Path -Parent $PSScriptRoot
$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'
  '.mjs'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'
  '.json'='application/json'; '.png'='image/png'; '.jpg'='image/jpeg'
  '.svg'='image/svg+xml'; '.md'='text/plain; charset=utf-8'; '.ico'='image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Serving $root at http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    # POST /__save/<name> writes the raw request body to .claude/captures/<name>
    # (local dev affordance so automated tests can export canvas frames).
    if ($ctx.Request.HttpMethod -eq 'POST' -and $ctx.Request.Url.AbsolutePath.StartsWith('/__save/')) {
      $name = [System.IO.Path]::GetFileName($ctx.Request.Url.AbsolutePath.Substring(8))
      $dir = Join-Path $PSScriptRoot 'captures'
      if (-not (Test-Path $dir)) { New-Item -ItemType Directory $dir | Out-Null }
      $ms = New-Object System.IO.MemoryStream
      $ctx.Request.InputStream.CopyTo($ms)
      [System.IO.File]::WriteAllBytes((Join-Path $dir $name), $ms.ToArray())
      $ok = [System.Text.Encoding]::UTF8.GetBytes('saved')
      $res.ContentLength64 = $ok.Length
      $res.OutputStream.Write($ok, 0, $ok.Length)
      $res.Close()
      continue
    }
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = Join-Path $root ($rel -replace '/', '\')
    $full = [System.IO.Path]::GetFullPath($path)
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
      $res.StatusCode = 404
      $body = [System.Text.Encoding]::UTF8.GetBytes('404')
    } else {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $res.Headers.Add('Cache-Control','no-store')
      $body = [System.IO.File]::ReadAllBytes($full)
    }
    $res.ContentLength64 = $body.Length
    $res.OutputStream.Write($body, 0, $body.Length)
  } catch {} finally { try { $res.Close() } catch {} }
}
