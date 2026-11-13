param([Parameter(Mandatory=$true)][string]$TestDatabaseUrl)
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot 'back-end')
try {
    $env:TEST_DATABASE_URL = $TestDatabaseUrl
    if (-not $env:DATABASE_URL) { $env:DATABASE_URL = $TestDatabaseUrl }
    if (-not $env:SECRET_KEY) { $env:SECRET_KEY = python -c "import secrets; print(secrets.token_urlsafe(48))" }
    python -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes.' }
} finally {
    Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
    Pop-Location
}
