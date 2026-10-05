$envFile = ".env"
$lines = Get-Content -LiteralPath $envFile

$dbLine = $lines | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
if (-not $dbLine) { throw "DATABASE_URL not found in .env" }

$dbUrl = ($dbLine -split '=', 2)[1].Trim().Trim('"').Trim("'")

if ($dbUrl -notmatch '/tutoring_platform_db(?=[?/#]|$)') {
    throw "DATABASE_URL does not point to tutoring_platform_db. Refusing to derive test URL."
}

$testUrl = $dbUrl -replace '/tutoring_platform_db(?=[?/#]|$)', '/tutoring_platform_test'

if ($lines -match '^\s*TEST_DATABASE_URL\s*=') {
    $lines = $lines | ForEach-Object {
        if ($_ -match '^\s*TEST_DATABASE_URL\s*=') {
            'TEST_DATABASE_URL="' + $testUrl + '"'
        } else {
            $_
        }
    }
} else {
    $lines += 'TEST_DATABASE_URL="' + $testUrl + '"'
}

Set-Content -LiteralPath $envFile -Value $lines
Write-Host "TEST_DATABASE_URL added without printing its value."