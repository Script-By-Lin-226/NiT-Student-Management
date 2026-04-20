
$root = "c:\Users\Script-Kid\Desktop\NiT-Student-Management"
$excludePatterns = @('node_modules', '\.next', 'venv', '__pycache__', '\.git', 'dist', 'build', '.vscode')

Write-Host "Analyzing codebase at $root..."

$files = Get-ChildItem -Path $root -Recurse -File -Include *.ts, *.tsx, *.py, *.css, *.html, *.js, *.jsx | Where-Object {
    $fullName = $_.FullName
    $exclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($fullName -match $pattern) {
            $exclude = $true
            break
        }
    }
    -not $exclude
}

$stats = @{}
$totalLines = 0

foreach ($file in $files) {
    try {
        $ext = $file.Extension.ToLower()
        $lines = (Get-Content $file.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
        if ($null -eq $lines) { $lines = 0 }
        
        if (-not $stats.ContainsKey($ext)) {
            $stats[$ext] = @{ Count = 0; Lines = 0 }
        }
        
        $stats[$ext].Count++
        $stats[$ext].Lines += $lines
        $totalLines += $lines
    } catch {
        # Skip
    }
}

Write-Host "`nCodebase Statistics:"
Write-Host "-------------------"
foreach ($ext in $stats.Keys) {
    $info = $stats[$ext]
    Write-Host ("{0,-10} : {1,5} files, {2,8} lines" -f $ext, $info.Count, $info.Lines)
}
Write-Host "-------------------"
Write-Host "Total Files: $($files.Count)"
Write-Host "Total Lines: $totalLines"
