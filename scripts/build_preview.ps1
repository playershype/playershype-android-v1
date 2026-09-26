param([string]$OutputDirectory = 'artifacts')
$ErrorActionPreference = 'Stop'
if (-not $env:JAVA_HOME -or -not $env:ANDROID_HOME) { throw 'Set JAVA_HOME and ANDROID_HOME before building.' }
$keyDirectory = Join-Path ([IO.Path]::GetTempPath()) ('playershype-preview-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $keyDirectory | Out-Null
function New-PreviewPassword {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
try {
    $env:PREVIEW_KEYSTORE = Join-Path $keyDirectory 'preview.jks'
    $env:PREVIEW_STORE_PASSWORD = New-PreviewPassword
    $env:PREVIEW_KEY_PASSWORD = New-PreviewPassword
    & "$env:JAVA_HOME/bin/keytool.exe" -genkeypair -noprompt -storetype JKS -keystore $env:PREVIEW_KEYSTORE -alias preview -keyalg RSA -keysize 3072 -validity 365 -dname 'CN=PlayersHype Preview QA' -storepass:env PREVIEW_STORE_PASSWORD -keypass:env PREVIEW_KEY_PASSWORD
    if ($LASTEXITCODE -ne 0) { throw 'Preview key generation failed' }
    & ./gradlew.bat assemblePreview --no-daemon
    if ($LASTEXITCODE -ne 0) { throw 'Preview build failed' }
    New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
    $apk = Join-Path $OutputDirectory 'PlayersHype-App-V1-PREVIEW.apk'
    Copy-Item -LiteralPath 'app/build/outputs/apk/preview/app-preview.apk' -Destination $apk
    & "$env:ANDROID_HOME/build-tools/36.0.0/apksigner.bat" verify --verbose --print-certs $apk | Tee-Object -FilePath (Join-Path $OutputDirectory 'signature-verification.txt')
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
    $metadata = & "$env:ANDROID_HOME/build-tools/36.0.0/aapt.exe" dump badging $apk
    if ($LASTEXITCODE -ne 0) { throw 'APK metadata inspection failed' }
    $metadata | Set-Content (Join-Path $OutputDirectory 'apk-metadata.txt')
    if ($metadata -match 'application-debuggable') { throw 'Preview must not be debuggable' }
    $hash = (Get-FileHash $apk -Algorithm SHA256).Hash.ToLower()
    "$hash  PlayersHype-App-V1-PREVIEW.apk" | Set-Content (Join-Path $OutputDirectory 'PlayersHype-App-V1-PREVIEW.apk.sha256')
    git rev-parse HEAD | Set-Content (Join-Path $OutputDirectory 'BUILD_COMMIT.txt')
    Write-Output "APK: $((Resolve-Path $apk).Path)"
    Write-Output "SHA-256: $hash"
} finally {
    if (Test-Path -LiteralPath $env:PREVIEW_KEYSTORE) { Remove-Item -LiteralPath $env:PREVIEW_KEYSTORE -Force }
    Remove-Item Env:PREVIEW_KEYSTORE,Env:PREVIEW_STORE_PASSWORD,Env:PREVIEW_KEY_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $keyDirectory -Force
}
