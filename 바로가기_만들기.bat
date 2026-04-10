@echo off
chcp 65001 >nul
title JH 시지프스 — 바탕화면 바로가기 만들기

cd /d "%~dp0"

echo [JH Sisyphus] 바탕화면 바로가기 생성 중...

:: PowerShell로 .lnk 바로가기 생성
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$lnk = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'JH 시지프스 관제.lnk'));" ^
  "$lnk.TargetPath = '%~dp0앱_실행.bat';" ^
  "$lnk.WorkingDirectory = '%~dp0';" ^
  "$lnk.Description = 'JH 시지프스 멀티에이전트 관제 대시보드';" ^
  "$icon = '%~dp0assets\icon.ico';" ^
  "if (Test-Path $icon) { $lnk.IconLocation = $icon } else { $lnk.IconLocation = '%SystemRoot%\System32\shell32.dll,167' };" ^
  "$lnk.WindowStyle = 1;" ^
  "$lnk.Save();" ^
  "Write-Host '[OK] 바탕화면에 바로가기가 생성되었습니다.'"

if errorlevel 1 (
    echo [오류] 바로가기 생성 실패. PowerShell 권한을 확인하세요.
    pause
    exit /b 1
)

echo.
echo 바탕화면의 "JH 시지프스 관제" 아이콘을 더블클릭하면 앱이 실행됩니다.
echo.
pause
