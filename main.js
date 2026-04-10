/**
 * JH Sisyphus — Electron Main Process
 * server.py (FastAPI, port 8765)를 자식 프로세스로 자동 실행
 */

const { app, BrowserWindow, Menu, Tray, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// ─── 경로 설정 ────────────────────────────────────────────────
const rootDir = __dirname;
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const SERVER_SCRIPT = path.join(rootDir, 'server.py');
const SERVER_PORT = 8765;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`;

// ─── 상태 ─────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let pythonServer = null;
let serverReady = false;

// ─── 포트 점유 프로세스 종료 (Windows) ───────────────────────
function killPortWin(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(
      `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /PID %a /F`,
      { shell: 'cmd.exe' },
      () => resolve()
    );
  });
}

// ─── Python 서버 시작 ────────────────────────────────────────
async function startPythonServer() {
  if (pythonServer) return;

  // 포트 충돌 시 기존 프로세스 먼저 종료
  if (process.platform === 'win32') {
    await killPortWin(SERVER_PORT);
    await new Promise(r => setTimeout(r, 800));
  }

  // ELECTRON_RUN_AS_NODE를 서버 자식 프로세스에 전파하지 않음
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  env.PYTHONUNBUFFERED = '1';

  console.log('[main] Python 서버 시작:', SERVER_SCRIPT);

  pythonServer = spawn(PYTHON, [SERVER_SCRIPT], {
    cwd: rootDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pythonServer.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    console.log('[server]', msg);
    if (
      msg.includes(String(SERVER_PORT)) ||
      msg.includes('Uvicorn running') ||
      msg.includes('Application startup complete')
    ) {
      serverReady = true;
    }
  });

  pythonServer.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    // uvicorn은 INFO를 stderr로 출력함
    if (msg.includes('Application startup complete') || msg.includes('Uvicorn running')) {
      serverReady = true;
    }
    console.log('[server:err]', msg);
  });

  pythonServer.on('close', (code) => {
    console.log('[main] 서버 종료 코드:', code);
    pythonServer = null;
    serverReady = false;
  });

  pythonServer.on('error', (err) => {
    console.error('[main] 서버 실행 오류:', err.message);
    dialog.showErrorBox(
      'Python 서버 오류',
      `server.py 실행 실패:\n${err.message}\n\nPython 및 의존성(pip install fastapi uvicorn)이 설치되어 있는지 확인하세요.`
    );
  });
}

// ─── Python 서버 종료 ────────────────────────────────────────
function stopPythonServer() {
  if (!pythonServer) return;
  console.log('[main] 서버 종료 중...');
  pythonServer.kill('SIGTERM');
  setTimeout(() => {
    if (pythonServer) {
      pythonServer.kill('SIGKILL');
      pythonServer = null;
    }
  }, 3000);
}

// ─── 서버 준비 대기 후 URL 로드 ──────────────────────────────
function waitAndLoad(win, maxMs = 8000, intervalMs = 300) {
  let elapsed = 0;
  const check = setInterval(async () => {
    elapsed += intervalMs;
    let ok = serverReady;

    if (!ok) {
      try {
        const http = require('http');
        await new Promise((resolve, reject) => {
          http.get(`${SERVER_URL}/api/health`, res => {
            ok = res.statusCode === 200;
            res.resume();
            resolve();
          }).on('error', reject);
        });
      } catch (_) {}
    }

    if (ok || elapsed >= maxMs) {
      clearInterval(check);
      serverReady = true;
      win.loadURL(SERVER_URL);
    }
  }, intervalMs);
}

// ─── 메인 창 생성 ────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 620,
    title: 'JH 시지프스 관제',
    backgroundColor: '#0a0c10',
    webPreferences: {
      preload: path.join(rootDir, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  // 서버 준비 대기 후 로드
  waitAndLoad(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 개발 환경에서만 DevTools 자동 열기
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // 창 닫기 → 트레이로 최소화 (완전 종료 아님)
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  setAppMenu();
}

// ─── 앱 메뉴 ─────────────────────────────────────────────────
function setAppMenu() {
  const tpl = [
    {
      label: '보기',
      submenu: [
        { label: '새로고침', accelerator: 'F5', click: () => mainWindow?.reload() },
        { label: '개발자 도구', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: '확대', role: 'zoomIn' },
        { label: '축소', role: 'zoomOut' },
        { label: '기본 크기', role: 'resetZoom' },
        { type: 'separator' },
        { label: '전체화면', role: 'togglefullscreen' },
      ],
    },
    {
      label: '서버',
      submenu: [
        {
          label: '서버 재시작',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            stopPythonServer();
            serverReady = false;
            setTimeout(() => {
              startPythonServer();
              if (mainWindow) waitAndLoad(mainWindow);
            }, 1200);
          },
        },
        {
          label: `서버 URL 열기 (포트 ${SERVER_PORT})`,
          click: () => shell.openExternal(SERVER_URL),
        },
        { type: 'separator' },
        {
          label: '로그 파일 열기',
          click: () => {
            const logPath = path.join(rootDir, 'server.log');
            if (fs.existsSync(logPath)) shell.openPath(logPath);
            else dialog.showMessageBox({ message: 'server.log 파일이 없습니다.', title: '알림' });
          },
        },
      ],
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '버전 정보',
          click: () => dialog.showMessageBox({
            title: 'JH 시지프스',
            message: `JH Sisyphus Dashboard v${app.getVersion()}\nPort: ${SERVER_PORT}`,
          }),
        },
        {
          label: '프로젝트 폴더 열기',
          click: () => shell.openPath(rootDir),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

// ─── 시스템 트레이 ───────────────────────────────────────────
function createTray() {
  const iconPath = path.join(rootDir, 'assets', 'icon.ico');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('JH 시지프스 관제');

  const menu = Menu.buildFromTemplate([
    { label: '대시보드 열기', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    {
      label: '서버 재시작',
      click: () => {
        stopPythonServer();
        serverReady = false;
        setTimeout(() => {
          startPythonServer();
          if (mainWindow) waitAndLoad(mainWindow);
        }, 1200);
      },
    },
    { type: 'separator' },
    { label: '종료', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── 앱 이벤트 ───────────────────────────────────────────────
app.whenReady().then(() => {
  startPythonServer();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  // 트레이에서 계속 실행 (macOS 포함)
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopPythonServer();
});

app.on('will-quit', () => {
  stopPythonServer();
});
