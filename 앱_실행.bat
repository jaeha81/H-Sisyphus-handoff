@echo off
chcp 65001 >nul
title JH 시지프스 관제 대시보드

echo [JH Sisyphus] 시작 중...

:: ─── ELECTRON_RUN_AS_NODE 해제 ───────────────────────────────
:: Claude Code 환경에서 설정되는 경우 Electron이 노드 스크립트로
:: 실행되는 것을 방지하기 위해 반드시 해제합니다.
set ELECTRON_RUN_AS_NODE=
set NODE_ENV=production

:: ─── 현재 디렉토리로 이동 ────────────────────────────────────
cd /d "%~dp0"

:: ─── Electron 설치 여부 확인 ─────────────────────────────────
if not exist "node_modules\.bin\electron.cmd" (
    echo.
    echo [오류] Electron이 설치되지 않았습니다.
    echo.
    echo 다음 명령을 실행하세요:
    echo   npm install --include=dev
    echo.
    pause
    exit /b 1
)

:: ─── Python 의존성 안내 (선택) ───────────────────────────────
python -c "import fastapi, uvicorn" 2>nul
if errorlevel 1 (
    echo.
    echo [경고] Python 의존성이 없습니다. 서버가 실행되지 않을 수 있습니다.
    echo   pip install fastapi uvicorn 을 실행하세요.
    echo.
    timeout /t 3 >nul
)

:: ─── Electron 앱 실행 ────────────────────────────────────────
echo [OK] Electron 앱 실행 (포트 8765)...
node_modules\.bin\electron.cmd .

exit /b 0
