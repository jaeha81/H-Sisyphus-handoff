/**
 * JH Sisyphus — Electron Preload Script
 * contextIsolation: true 환경에서 renderer에게 필요한 API만 안전하게 노출
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 앱 버전
  getVersion: () => ipcRenderer.invoke('get-version'),
  // 플랫폼
  platform: process.platform,
  // 서버 포트
  serverPort: 8765,
});
