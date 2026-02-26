$files = Get-ChildItem -Path "app" -Include *.tsx,*.ts -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'http://localhost:5000') {
        $content = $content -replace 'http://localhost:5000/api', '${API_URL}'
        $content = $content -replace "^('use client')", "`$1`r`n`r`nimport { API_URL } from '@/lib/config'"
        Set-Content $file.FullName $content
        Write-Host "Fixed: $($file.Name)"
    }
}
