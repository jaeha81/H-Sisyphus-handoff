# JH 시지프스 — 바탕화면 바로가기 생성 스크립트
# 실행: powershell -ExecutionPolicy Bypass -File create_shortcut.ps1

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$batPath    = Join-Path $projectDir "앱_실행.bat"
$iconPath   = Join-Path $projectDir "assets\icon.ico"
$desktop    = [Environment]::GetFolderPath("Desktop")
$lnkPath    = Join-Path $desktop "JH 시지프스 관제.lnk"

$ws  = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($lnkPath)

$lnk.TargetPath      = $batPath
$lnk.WorkingDirectory = $projectDir
$lnk.Description     = "JH 시지프스 멀티에이전트 관제 대시보드"
$lnk.WindowStyle     = 1   # 1 = 일반 창

if (Test-Path $iconPath) {
    $lnk.IconLocation = $iconPath
} else {
    # 기본 시스템 아이콘 (모니터 모양)
    $lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,167"
}

$lnk.Save()

Write-Host ""
Write-Host "[OK] 바탕화면 바로가기 생성 완료: $lnkPath" -ForegroundColor Green
Write-Host "     더블클릭하면 JH 시지프스 관제 앱이 실행됩니다." -ForegroundColor Cyan
Write-Host ""
